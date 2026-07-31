import { MATCH } from './state.js';
import { GEO_ASCENT, MAPGEO, mapGeo } from '../data/geo/maps.js';
import { p } from '../data/leagues.js';
import ASCENT_NAV from '../data/geo/ascent-navgrid.json' with { type: 'json' };
import BIND_NAV from '../data/geo/bind-navgrid.json' with { type: 'json' };
import HAVEN_NAV from '../data/geo/haven-navgrid.json' with { type: 'json' };
import SPLIT_NAV from '../data/geo/split-navgrid.json' with { type: 'json' };
import LOTUS_NAV from '../data/geo/lotus-navgrid.json' with { type: 'json' };
import SUNSET_NAV from '../data/geo/sunset-navgrid.json' with { type: 'json' };
import ICEBOX_NAV from '../data/geo/icebox-navgrid.json' with { type: 'json' };
import { random } from './rng.js';
import { currentRoundPhase, phaseTacticalEdge, summarizeRoundPhases } from './phases/round-phases.js';
import { createTradeWindow, duelSupportContext, supportModifier } from './trades/trade-system.js';
import { applyDamage, createVitalState, rollWeaponHit } from './combat-model.js';
import { abilityObjectActive, createAbilityObject } from './ability-objects.js';
import { createAgentMind, decideAgentIntents, perceiveAgents } from './agents/agent-loop.js';

const NAVGRIDS={Ascent:ASCENT_NAV,Bind:BIND_NAV,Haven:HAVEN_NAV,Split:SPLIT_NAV,Lotus:LOTUS_NAV,Sunset:SUNSET_NAV,Icebox:ICEBOX_NAV};
let activeMapName=null;
function currentMapName(){return activeMapName||(MATCH&&MATCH.mapPool&&MATCH.mapPool[MATCH.curMap])||'Ascent';}
function curNav(){return NAVGRIDS[currentMapName()]||ASCENT_NAV;}
export function curGeo(){return MAPGEO[currentMapName()]||GEO_ASCENT;}
/* ===== NAV GRID (walkable mask from the real map): pathfinding + line-of-sight ===== */

export function navOpenCell(cx,cy){const grid=curNav();if(cx<0||cy<0||cx>=grid.w||cy>=grid.h)return false;return grid.cells[cy*grid.w+cx]==='1';}

export function navToCell(x,y){const grid=curNav();return[Math.max(0,Math.min(grid.w-1,Math.floor(x/100*grid.w))),Math.max(0,Math.min(grid.h-1,Math.floor(y/100*grid.h)))];}

export function navCellPct(cx,cy){const grid=curNav();return{x:(cx+0.5)/grid.w*100,y:(cy+0.5)/grid.h*100};}

export function navOpenNear(cx,cy){const grid=curNav();if(navOpenCell(cx,cy))return[cx,cy]; const seen=new Set([cx+','+cy]); let q=[[cx,cy]];
  const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]];
  while(q.length){ const [x,y]=q.shift(); for(const [dx,dy] of dirs){ const nx=x+dx,ny=y+dy,k=nx+','+ny;
    if(nx<0||ny<0||nx>=grid.w||ny>=grid.h||seen.has(k))continue; if(navOpenCell(nx,ny))return[nx,ny]; seen.add(k); q.push([nx,ny]); } }
  return [cx,cy]; }

export function navLOS(a,b){ // true if sightline a->b is clear; tolerates thin (1-cell) props, blocked by real walls
  let ca=navOpenNear(...navToCell(a.x,a.y)), cb=navOpenNear(...navToCell(b.x,b.y));
  let x0=ca[0],y0=ca[1],x1=cb[0],y1=cb[1];
  let dx=Math.abs(x1-x0), dy=Math.abs(y1-y0), sx=x0<x1?1:-1, sy=y0<y1?1:-1, err=dx-dy, guard=0, blocked=0;
  while(guard++<600){ if(!(x0===ca[0]&&y0===ca[1]) && !(x0===x1&&y0===y1)){ if(!navOpenCell(x0,y0)){ blocked++; if(blocked>1)return false; } }
    if(x0===x1&&y0===y1)return true;
    const e2=2*err; if(e2>-dy){err-=dy;x0+=sx;} if(e2<dx){err+=dx;y0+=sy;} }
  return true; }

export const _navCache={};

export function navPath(ax,ay,bx,by){ // A* on the grid, returns list of {x,y} in % (cached)
  const key=currentMapName()+':'+ax.toFixed(1)+','+ay.toFixed(1)+'>'+bx.toFixed(1)+','+by.toFixed(1);
  if(_navCache[key])return _navCache[key];
  const a=navOpenNear(...navToCell(ax,ay)), b=navOpenNear(...navToCell(bx,by));
  const ok=(x,y)=>navOpenCell(x,y);
  const hn=(x,y)=>Math.abs(x-b[0])+Math.abs(y-b[1]);
  const g={}, came={}, sk=a[0]+','+a[1]; g[sk]=0;
  const pq=[[hn(a[0],a[1]),a[0],a[1]]];
  const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]];
  let found=false, guard=0;
  while(pq.length && guard++<45000){ pq.sort((m,n)=>m[0]-n[0]); const [,cx,cy]=pq.shift();
    if(cx===b[0]&&cy===b[1]){found=true;break;}
    const ck=cx+','+cy;
    for(const [dx,dy] of dirs){ const nx=cx+dx,ny=cy+dy; if(!ok(nx,ny))continue;
      if(dx&&dy&&!(ok(cx+dx,cy)&&ok(cx,cy+dy)))continue; // no corner cutting
      const ng=g[ck]+((dx&&dy)?1.4:1), nk=nx+','+ny;
      if(!(nk in g)||ng<g[nk]){ g[nk]=ng; came[nk]=ck; pq.push([ng+hn(nx,ny),nx,ny]); } } }
  const pts=[]; let cur=b[0]+','+b[1];
  if(found){ while(cur){ const [cx,cy]=cur.split(',').map(Number); pts.unshift(navCellPct(cx,cy)); cur=came[cur]; } }
  else { pts.push(navCellPct(a[0],a[1]),navCellPct(b[0],b[1])); }
  // simplify: keep every 2nd point to reduce jitter, always keep ends
  const simp=pts.filter((p,i)=>i===0||i===pts.length-1||i%2===0);
  _navCache[key]=simp; return simp; }

export function navRouteThrough(nodes){ let out=[]; for(let i=0;i<nodes.length-1;i++){ const seg=navPath(nodes[i].x,nodes[i].y,nodes[i+1].x,nodes[i+1].y);
    out=out.concat(i===0?seg:seg.slice(1)); } return out; }
/* ===== TICK-BASED SPATIAL ROUND ENGINE (single source of truth for a round) ===== */

export function sdist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }

export const SP_TUNE={ holdBonus:3.0, execBonus:1.2, peekPenalty:1.0, gapMul:1.0, scale:26, utilSuppress:0.85, utilWindow:4.0, reconBase:0.18, reconGain:0.5 };

export const SP_SETUPS=[{A:2,mid:1,B:2,w:6},{A:2,mid:0,B:3,w:2},{A:3,mid:0,B:2,w:2},{A:1,mid:1,B:3,w:1},{A:3,mid:1,B:1,w:1},{A:2,mid:2,B:1,w:1},{A:1,mid:2,B:2,w:1}];

export function spPickSetup(siteNames=['A','B']){
  if(siteNames.length===2){const tot=SP_SETUPS.reduce((s,x)=>s+x.w,0);let r=random()*tot;for(const s of SP_SETUPS){if((r-=s.w)<=0)return s;}return SP_SETUPS[0];}
  const setup=Object.fromEntries(siteNames.map(s=>[s,1]));setup.mid=1;
  setup[siteNames[Math.floor(random()*siteNames.length)]]+=1;
  return setup;
}
// home/away rosters; opts:{atkTeamKey,defTeamKey,teamGap,ratingOf,reconStrength,utilStrength,isPistol}

export function spatialRound(home,away,opts){
  activeMapName=opts.mapName||currentMapName();
  const G=mapGeo(activeMapName);
  const {atkTeamKey,defTeamKey,teamGap,ratingOf,reconStrength=0.5,utilStrength=0.5,teamplay={home:60,away:60},objective={home:{},away:{}},isPistol=false,tacticalPlan=null,abilityPlan={uses:[],modifiers:{home:{},away:{}}}}=opts;
  const atkTeam=atkTeamKey==='home'?home:away, defTeam=defTeamKey==='home'?home:away;
  const TICK=0.1,ROUND_TIME=100,MAXT=145,SPEED=tacticalPlan?4.6+tacticalPlan.attack.pace*1.7:5.5,SIGHT=16;
  const setup=opts.setup||tacticalPlan?.defense?.setup||spPickSetup(G.siteNames);const perSite={...setup};
  const siteStrength=Object.fromEntries(G.siteNames.map(s=>[s,(perSite[s]||0)+(perSite.mid||0)/G.siteNames.length]));
  const minStrength=Math.min(...Object.values(siteStrength));
  const weakSites=G.siteNames.filter(s=>siteStrength[s]===minStrength);
  const weaker=weakSites[Math.floor(random()*weakSites.length)];
  const atkAbility=abilityPlan.modifiers?.[atkTeamKey]||{},defAbility=abilityPlan.modifiers?.[defTeamKey]||{};
  const infoP=SP_TUNE.reconBase+SP_TUNE.reconGain*reconStrength+(atkAbility.information||0)*.12-(defAbility.information||0)*.04;
  const hasInfo=random()<infoP;
  const site=opts.forceSite||tacticalPlan?.attack?.targetSite||(hasInfo?weaker:G.siteNames[Math.floor(random()*G.siteNames.length)]);
  const mk=(team,key,idx)=>{
    const player=team.roster[idx],loadout=opts.loadouts?.[key]?.[idx]||{weapon:'Classic',shield:'none'};
    const uses=abilityPlan.uses.filter(use=>use.player===player.name),bladeStorm=uses.some(use=>use.mechanic==='blade_storm');
    return {name:player.name,side:key,idx,alive:true,...createVitalState(loadout.shield,loadout.shieldValue),weapon:bladeStorm?'BladeStorm':loadout.weapon,abilityUses:uses,headshotRate:player.combatProfile?.headshotRate??.24,firepower:player.attributes?.firepower??player.aim??60,mind:createAgentMind(player.attributes),nextDuelT:0,x:0,y:0,path:null,seg:0,r:ratingOf(player,key),startDelay:0,zone:null,track:[],deathT:null,role:null,carrier:false,face:0,hold:null,joined:false};
  };
  const atk=atkTeam.roster.map((_,i)=>mk(atkTeam,atkTeamKey,i));
  const def=defTeam.roster.map((_,i)=>mk(defTeam,defTeamKey,i));
  const snap=p=>{const c=navOpenNear(...navToCell(p.x,p.y));return navCellPct(c[0],c[1]);};
  // defenders spawn at defender spawn and DEPLOY out to (slightly randomized) holds
  const dsp=snap(G.pts.defSpawn);
  const jit=p=>snap({x:p.x+(random()*6-3),y:p.y+(random()*6-3)});
  const holdBySite=Object.fromEntries(G.siteNames.map(s=>[s,G.siteHolds(s).map(jit)]));const mH=G.midHolds().map(jit);let di=0;
  const deploy=(u,hold,zone)=>{ const s2=snap({x:dsp.x+(random()*8-4),y:dsp.y+(random()*4-2)});u.prepFrom=s2;u.prepTo=hold;u.prepPath=navPath(s2.x,s2.y,hold.x,hold.y);u.x=hold.x;u.y=hold.y;u.zone=zone;u.hold=hold;u.path=null;u.seg=0;u.startDelay=0;u.face=Math.atan2(G.choke(zone==='mid'?G.siteNames[0]:zone).y-u.y,G.choke(zone==='mid'?G.siteNames[0]:zone).x-u.x)*180/Math.PI; };
  for(const s of G.siteNames){for(let k=0;k<(perSite[s]||0)&&di<def.length;k++){const holds=holdBySite[s];deploy(def[di++],holds[k%holds.length],s);}}
  for(let k=0;k<(perSite.mid||0)&&di<def.length;k++){deploy(def[di++],mH[k%mH.length],'mid');}
  while(di<def.length){const s=G.siteNames[di%G.siteNames.length],holds=holdBySite[s];deploy(def[di++],holds[0],s);}
  const spawnC=snap(G.atkSpawn[1]);
  const alternatives=G.siteNames.filter(s=>s!==site);
  const other=tacticalPlan?.attack?.fakeSite||alternatives[Math.floor(random()*alternatives.length)];
  // attacker formation: main+mid commit to the target, a lurk works the other side (cut backups / take empty)
  const FORMS=[{lurk:1,mid:1,main:3,w:4},{lurk:1,mid:0,main:4,w:2},{lurk:0,mid:2,main:3,w:2},{lurk:1,mid:2,main:2,w:2},{lurk:2,mid:1,main:2,w:1}];
  const form=tacticalPlan?.attack?.formation||(()=>{const tot=FORMS.reduce((s,x)=>s+x.w,0);let r=random()*tot;for(const f of FORMS){if((r-=f.w)<=0)return f;}return FORMS[0];})();
  const mainPath=navRouteThrough([spawnC].concat(G.routeMain(site)));
  const midPath =navRouteThrough([spawnC].concat(G.routeMid(site)));
  const lurkPath=navRouteThrough([spawnC].concat(G.routeMain(other)));
  let ai=0;
  for(let k=0;k<form.main&&ai<5;k++){const u=atk[ai++];u.role='main';u.path=mainPath.slice();}
  for(let k=0;k<form.mid&&ai<5;k++){const u=atk[ai++];u.role='mid';u.path=midPath.slice();}
  for(let k=0;k<form.lurk&&ai<5;k++){const u=atk[ai++];u.role='lurk';u.path=lurkPath.slice();}
  while(ai<5){const u=atk[ai++];u.role='main';u.path=mainPath.slice();}
  atk.forEach((u,i)=>{const spawn=snap(G.atkSpawn[i]),original=u.path||[],lane=u.role==='mid'?'mid':u.role==='lurk'?other:site,barrier=G.barrier(lane),ready=snap(barrier.center);let nearest=0,best=Infinity;original.forEach((point,index)=>{const distance=sdist(point,ready);if(distance<best){best=distance;nearest=index;}});const join=original[nearest]||ready;u.prepFrom=spawn;u.prepTo=ready;u.prepPath=navPath(spawn.x,spawn.y,ready.x,ready.y);u.barrierId=barrier.id;u.x=ready.x;u.y=ready.y;u.path=navPath(ready.x,ready.y,join.x,join.y).concat(original.slice(nearest+1));u.seg=0;u.startDelay=i*.12+(u.role==='lurk'?.35:0);});
  const mains=atk.filter(u=>u.role==='main');
  let spikeCarrier=([...mains].sort((a,b)=>(objective[atkTeamKey]?.[b.name]||50)-(objective[atkTeamKey]?.[a.name]||50))[0]||atk[0]); spikeCarrier.carrier=true;
  const pzc=G.plantZone(site); const plantAtSite=snap({x:pzc.x,y:pzc.y});
  const events=tacticalPlan?[{t:0,type:'tactic',attack:tacticalPlan.attack.type,defense:tacticalPlan.defense.type,site}]:[]; let planted=false,plantT=-1,defused=false,contact=false,utilAt=-1;
  const abilityObjects=[],allUnits=atk.concat(def),unitByName=new Map(allUnits.map(unit=>[unit.name,unit]));
  const pendingAbilities=abilityPlan.uses.map((use,index)=>({use,index,used:false,earliest:3+index*1.35}));
  const lastAbilityAt={home:-99,away:-99};
  const isPreplaced=use=>use.side===defTeamKey&&['turret_anchor','vulnerable_trap'].includes(use.mechanic);
  function activateAbility(entry,t){
    const {use,index}=entry,owner=unitByName.get(use.player);if(entry.used||!owner?.alive)return false;entry.used=true;lastAbilityAt[use.side]=t;
    events.push({...use,t:+t.toFixed(2),type:'ability',abilityType:use.type,x:owner.x,y:owner.y,site});
    const object=createAbilityObject(use,index,{sitePoint:plantAtSite,chokePoint:G.choke(site),attackSide:atkTeamKey,ownerPoint:{x:owner.x,y:owner.y},placedAt:t});
    if(object){abilityObjects.push(object);events.push({t,type:'abilityObjectPlace',objectId:object.id,player:object.owner,side:object.side,ability:object.ability,mechanic:object.mechanic,kind:object.kind,hp:object.hp,activeAt:object.activeAt,expiresAt:object.expiresAt,x:object.x,y:object.y});events.push({t:object.expiresAt,type:'abilityObjectExpire',objectId:object.id,player:object.owner,side:object.side,ability:object.ability,mechanic:object.mechanic,x:object.x,y:object.y});}
    if(use.damage>0){const enemies=(use.side===atkTeamKey?aliveDef():aliveAtk()).filter(enemy=>sdist(owner,enemy)<SIGHT*1.4&&navLOS(owner,enemy)).sort((a,b)=>sdist(owner,a)-sdist(owner,b)),target=enemies[0];if(target){const raw=Math.min(use.damage,Math.max(0,target.hp+target.shield-1)),impact=applyDamage(target,raw);events.push({t,type:'abilityDamage',source:use.player,victim:target.name,side:use.side,ability:use.name,mechanic:use.mechanic,amount:impact.absorbed+impact.hpDamage,rawDamage:raw,absorbed:impact.absorbed,remainingHP:target.hp,remainingShield:target.shield,lethal:false,x:target.x,y:target.y});}}
    return true;
  }
  const orbCaptures=[];
  const assignedOrbPlayers=new Set();
  // An orb attempt becomes a real route and seven-second channel. Defenders
  // can deny it by taking sight/contact before the channel completes.
  for(const orb of G.orbs||[]){
    const candidates=atk.filter(unit=>unit!==spikeCarrier&&!assignedOrbPlayers.has(unit.name)&&(unit.path||[]).some(point=>sdist(point,orb)<8));
    if(candidates.length&&random()<.28+(atkAbility.information||0)*.06){const collector=candidates[Math.floor(random()*candidates.length)];assignedOrbPlayers.add(collector.name);collector.orbTask={orb,startedAt:null,complete:false,cancelled:false,duration:7};collector.path=navRouteThrough([{x:collector.x,y:collector.y},orb,plantAtSite]);collector.seg=0;}
  }
  let spikeDropped=null, planting=-1, retriever=null; const PLANT_TIME=4, DEFUSE_TIME=7, SPIKE_TIME=45; let defusing=-1, defuserName=null;
  const aliveAtk=()=>atk.filter(u=>u.alive), aliveDef=()=>def.filter(u=>u.alive);
  if(hasInfo) events.push({t:1.0,type:'recon',x:plantAtSite.x,y:plantAtSite.y,site});
  pendingAbilities.filter(entry=>isPreplaced(entry.use)).forEach(entry=>activateAbility(entry,0));
  function moveUnit(u,t){ if(!u.alive)return; if(u.orbTask?.startedAt!=null&&!u.orbTask.complete&&!u.orbTask.cancelled)return; if(u.startDelay&&t<u.startDelay)return; if(!u.path||u.seg>=u.path.length)return;
    const w=u.path[u.seg],d=sdist(u,w),step=SPEED*TICK; if(d>0.001)u.face=Math.atan2(w.y-u.y,w.x-u.x)*180/Math.PI;
    if(d<=step){u.x=w.x;u.y=w.y;u.seg++;} else {u.x+=(w.x-u.x)/d*step;u.y+=(w.y-u.y)/d*step;} }
  function utilActive(t){ return utilAt>=0&&(t-utilAt)<SP_TUNE.utilWindow; }
  function visibleEnemies(unit,enemies){return enemies.filter(enemy=>enemy.alive&&sdist(unit,enemy)<SIGHT&&navLOS(unit,enemy));}
  function seekNearbyCover(unit,enemies,t){
    const currentExposure=visibleEnemies(unit,enemies).length;if(currentExposure<2||t<(unit.coverUntil||0))return false;
    const [cx,cy]=navOpenNear(...navToCell(unit.x,unit.y));let best=null,bestScore=currentExposure*100;
    for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const nx=cx+dx,ny=cy+dy;if(!navOpenCell(nx,ny))continue;const point=navCellPct(nx,ny),exposure=visibleEnemies(point,enemies).length,score=exposure*100+Math.hypot(dx,dy)*2;if(score<bestScore){bestScore=score;best=point;}}
    if(!best)return false;const from={x:unit.x,y:unit.y};unit.path=navPath(unit.x,unit.y,best.x,best.y);unit.seg=0;unit.coverUntil=t+1.2;unit.hold=best;
    events.push({t,type:'coverSeek',player:unit.name,side:unit.side,exposure:currentExposure,fromX:from.x,fromY:from.y,x:best.x,y:best.y});return true;
  }
  let fb=null, clutchWho=null, clutchVs=0;const tradeWindows=[];
  function finishKill(t,killer,victim,hit,intent,tickHits){
    if(!victim.alive)return;const units=atk.concat(def),victimEnemies=victim.side===atkTeamKey?aliveDef():aliveAtk();
    const support=duelSupportContext({attacker:killer.side===atkTeamKey?killer:victim,defender:killer.side===atkTeamKey?victim:killer,units,windows:tradeWindows,time:t,lineOfSight:navLOS});
    const killerSupport=killer.side===atkTeamKey?support.attacker:support.defender,tradeWindow=killerSupport.trade&&killerSupport.trade.target===victim.name?killerSupport.trade:null;if(tradeWindow)tradeWindow.consumed=true;
    const assistants=tickHits.filter(result=>result.target===victim&&result.actor!==killer).map(result=>result.actor);const assist=assistants[0]?.name||killerSupport.supporters?.[0]?.name||null;
    victim.alive=false;victim.path=null;victim.deathT=t;
    if(victim.orbTask?.startedAt!=null&&!victim.orbTask.complete&&!victim.orbTask.cancelled){victim.orbTask.cancelled=true;events.push({t,type:'orbCancel',player:victim.name,side:victim.side,orbId:victim.orbTask.orb.id,x:victim.x,y:victim.y,reason:'death'});}
    if(victim===spikeCarrier){spikeDropped={x:victim.x,y:victim.y};spikeCarrier=null;planting=-1;events.push({t,type:'spikeDrop',x:victim.x,y:victim.y});}
    if(!fb)fb={killer:killer.name,victim:victim.name,side:killer.side};
    const nextTrade=createTradeWindow({loser:victim,winner:killer,time:t,units,lineOfSight:navLOS,teamplay:teamplay[victim.side]||60});if(nextTrade)tradeWindows.push(nextTrade);
    const phase=currentRoundPhase({contact,firstBlood:!!fb,planted,retakeStarted:planted&&aliveDef().some(unit=>sdist(unit,plantAtSite)<20)});
    events.push({t,type:'kill',killer:killer.name,victim:victim.name,side:killer.side,x:victim.x,y:victim.y,fb:events.filter(event=>event.type==='kill').length===0,assist,damage:hit.applied,rawDamage:hit.damage,retaliationDamage:0,headshot:hit.headshot,weapon:hit.weapon,hitZone:hit.hitZone,distanceBand:hit.distanceBand,focusFire:assistants.length,victimExposure:intent.targetExposure,killerExposure:intent.exposure,phase,tradeAttempt:!!tradeWindow,traded:!!tradeWindow,tradeOf:tradeWindow?.victim||null,crossfire:assistants.length>0,isolated:intent.targetExposure>=2});
    if(!clutchWho){if(aliveAtk().length===1&&aliveDef().length>=2){clutchWho=aliveAtk()[0];clutchVs=aliveDef().length;}else if(aliveDef().length===1&&aliveAtk().length>=2){clutchWho=aliveDef()[0];clutchVs=aliveAtk().length;}}
  }
  function resolveAgentTick(t){
    const units=atk.concat(def),enemiesOf=unit=>unit.side===atkTeamKey?aliveDef():aliveAtk(),alliesOf=unit=>unit.side===atkTeamKey?aliveAtk():aliveDef();
    const perceptions=perceiveAgents({units,enemiesOf,lineOfSight:navLOS,distance:sdist,sight:SIGHT,time:t});
    for(const [observer,view] of perceptions)for(const seen of view.newContacts)events.push({t,type:'sighting',player:observer.name,side:observer.side,target:seen.unit.name,distance:+seen.distance.toFixed(2),x:seen.unit.x,y:seen.unit.y});
    const intents=decideAgentIntents({units,perceptions,alliesOf,lineOfSight:navLOS,distance:sdist,time:t,planted});
    for(const intent of intents.filter(item=>item.type==='cover'))seekNearbyCover(intent.actor,enemiesOf(intent.actor),t);
    const shotIntents=intents.filter(item=>item.type==='shoot');if(shotIntents.length)contact=true;
    const tickHits=[];
    for(const intent of shotIntents){const {actor,target,distance,moving}=intent,targetExposure=perceptions.get(target)?.visible.length||0;intent.targetExposure=targetExposure;
      const actorTeam=actor.side==='home'?home:away,targetTeam=target.side==='home'?home:away,actorRating=ratingOf(actorTeam.roster[actor.idx],actor.side,{opening:!fb,attacking:actor.side===atkTeamKey,clutch:alliesOf(actor).length===1}),targetRating=ratingOf(targetTeam.roster[target.idx],target.side,{opening:!fb,attacking:target.side===atkTeamKey,clutch:enemiesOf(actor).length===1});
      const hold=!actor.path||actor.seg>=actor.path.length,coordinatedAllies=alliesOf(actor).filter(ally=>ally!==actor&&navLOS(ally,target)&&sdist(ally,target)<SIGHT).length,coordination=(actor.mind.coordination-60)/250+coordinatedAllies*(.015+actor.mind.coordination/1000);
      const accuracy=Math.max(.18,Math.min(.88,.48+(actor.firepower-60)/180+(actorRating-targetRating)/300+(hold?.08:0)-(moving?.12:0)-Math.max(0,distance-8)*.012+coordination));
      const profile=rollWeaponHit({weapon:actor.weapon,distance,headshotRate:actor.headshotRate,firepower:actor.firepower,ratingEdge:actorRating-targetRating});actor.nextDuelT=t+Math.max(.28,profile.cooldown+.12);
      if(random()>accuracy){events.push({t,type:'shot',source:actor.name,victim:target.name,side:actor.side,weapon:profile.weapon,hit:false,x:target.x,y:target.y});continue;}
      tickHits.push({actor,target,intent,profile});
    }
    // All shots were selected before damage is applied, so a player killed in
    // this tick still completes the shot they had already committed to.
    for(const result of tickHits){const {actor,target,intent,profile}=result;if(!target.alive)continue;const impact=applyDamage(target,profile.damage),applied=impact.absorbed+impact.hpDamage;result.applied=applied;
      events.push({t,type:'damage',source:actor.name,victim:target.name,side:actor.side,amount:applied,rawDamage:profile.damage,absorbed:impact.absorbed,remainingHP:target.hp,remainingShield:target.shield,weapon:profile.weapon,hitZone:profile.hitZone,distanceBand:profile.distanceBand,headshot:profile.headshot,lethal:impact.lethal,simultaneous:true,x:target.x,y:target.y});
      if(impact.lethal)finishKill(t,actor,target,{...profile,applied},intent,tickHits);
    }
  }
  for(let step=0,t=0; step<MAXT/TICK; step++, t+=TICK){
    atk.forEach(u=>moveUnit(u,t)); def.forEach(u=>moveUnit(u,t));
    for(const entry of pendingAbilities){if(entry.used||isPreplaced(entry.use)||t<entry.earliest||t-lastAbilityAt[entry.use.side]<1.25)continue;const owner=unitByName.get(entry.use.player);if(!owner?.alive)continue;const attacking=entry.use.side===atkTeamKey,nearExecute=attacking&&sdist(owner,G.choke(site))<17,defendingContact=!attacking&&contact,lateFallback=t>18+entry.index*.7;if(nearExecute||defendingContact||contact||lateFallback)activateAbility(entry,t);}
    if(step%4===0){aliveAtk().forEach(unit=>seekNearbyCover(unit,aliveDef(),t));aliveDef().forEach(unit=>seekNearbyCover(unit,aliveAtk(),t));}
    if(step%5===0)for(const object of abilityObjects){if(!object.destructible||!abilityObjectActive(object,t))continue;const enemies=(object.side===atkTeamKey?aliveDef():aliveAtk()).filter(unit=>sdist(unit,object)<SIGHT&&navLOS(unit,object));if(!enemies.length)continue;
      const shooter=enemies.sort((a,b)=>sdist(a,object)-sdist(b,object))[0],destroyChance=Math.max(.08,Math.min(.5,(shooter.firepower-45)/90));if(random()<destroyChance){object.destroyedAt=t;object.destroyedBy=shooter.name;events.push({t,type:'abilityObjectDestroy',objectId:object.id,player:shooter.name,owner:object.owner,side:shooter.side,ability:object.ability,mechanic:object.mechanic,x:object.x,y:object.y});}}
    for(const u of atk){const task=u.orbTask;if(!u.alive||!task||task.complete||task.cancelled)continue;
      if(task.startedAt==null&&sdist(u,task.orb)<2.5){task.startedAt=t;events.push({t,type:'orbStart',player:u.name,side:u.side,orbId:task.orb.id,label:task.orb.label,x:task.orb.x,y:task.orb.y,duration:task.duration});}
      if(task.startedAt!=null){const threatened=aliveDef().some(enemy=>sdist(u,enemy)<SIGHT&&navLOS(u,enemy));
        if(threatened){task.cancelled=true;events.push({t,type:'orbCancel',player:u.name,side:u.side,orbId:task.orb.id,x:task.orb.x,y:task.orb.y,reason:'enemy_contact'});}
        else if(t-task.startedAt>=task.duration){task.complete=true;const capture={t,type:'orbCapture',player:u.name,side:u.side,orbId:task.orb.id,label:task.orb.label,x:task.orb.x,y:task.orb.y,duration:task.duration};orbCaptures.push(capture);events.push(capture);}
      }
    }
    // facing for stationary units: look at nearest visible enemy, else watch the threat direction
    const setWatch=(u,enemies)=>{ if(u.path&&u.seg<u.path.length)return; // moving handled in moveUnit
      let tgt=null,td=1e9; enemies.forEach(e=>{ if(e.alive&&navLOS(u,e)){const d=sdist(u,e); if(d<td&&d<SIGHT*1.4){td=d;tgt=e;}} });
      if(tgt){ u.face=Math.atan2(tgt.y-u.y,tgt.x-u.x)*180/Math.PI; }
      else { const aim = (u.side===atkTeamKey)? plantAtSite : (u.zone==='mid'?G.pts.botMid:G.choke(u.zone==='B'?'B':(u.zone==='A'?'A':site))); u.face=Math.atan2(aim.y-u.y,aim.x-u.x)*180/Math.PI; } };
    atk.forEach(u=>{ if(u.alive)setWatch(u,def); }); def.forEach(u=>{ if(u.alive)setWatch(u,atk); });
    // lurker joins the main push when the team is thinning out or outnumbered on site
    if(step%10===0){ const atkN=aliveAtk().length, defN=aliveDef().length, mainAlive=aliveAtk().filter(x=>x.role!=='lurk').length;
      aliveAtk().forEach(u=>{ if(u.role==='lurk'&&!u.joined&&(mainAlive<=1||atkN<defN)){ u.joined=true; u.role='main'; u.path=navRouteThrough([{x:u.x,y:u.y},plantAtSite]); u.seg=0; } }); }
    if(step%3===0){ const ck=spikeCarrier?(spikeCarrier.side+spikeCarrier.idx):null;
      for(const u of atk){ if(u.alive)u.track.push({t:+t.toFixed(2),x:+u.x.toFixed(2),y:+u.y.toFixed(2),f:Math.round(u.face),c:(u.side+u.idx)===ck?1:0}); }
      for(const u of def){ if(u.alive)u.track.push({t:+t.toFixed(2),x:+u.x.toFixed(2),y:+u.y.toFixed(2),f:Math.round(u.face)}); } }
    if(utilAt<0){ const ck=G.choke(site); if(aliveAtk().some(u=>sdist(u,ck)<14&&t>1.5)){ utilAt=t;
      events.push({t,type:'util',kind:'smoke',x:ck.x,y:ck.y,site}); events.push({t:t+0.2,type:'util',kind:'flash',x:plantAtSite.x,y:plantAtSite.y,site}); } }
    if(contact||utilAt>=0){ def.forEach(u=>{ if(u.alive&&u.zone!==site&&!u.path){ u.path=navRouteThrough([{x:u.x,y:u.y},G.pts.botMid,plantAtSite]); u.seg=0; u.zone=site; } }); }
    resolveAgentTick(t);
    // spike pickup: a dedicated retriever goes to the dropped spike (others keep clearing)
    if(!planted && !spikeCarrier && spikeDropped){
      if(!retriever || !retriever.alive) retriever=aliveAtk().slice().sort((a,b)=>sdist(a,spikeDropped)-sdist(b,spikeDropped))[0]||null;
      if(retriever){ if(sdist(retriever,spikeDropped)<4){ spikeCarrier=retriever; retriever.carrier=true; events.push({t,type:'spikePickup',by:retriever.name,x:retriever.x,y:retriever.y}); spikeDropped=null; retriever=null; }
        else if(!retriever.path||retriever.seg>=retriever.path.length){ retriever.path=navRouteThrough([{x:retriever.x,y:retriever.y},spikeDropped]); retriever.seg=0; } }
    }
    // seek/clear only pre-plant; the carrier and the spike retriever are excluded
    if(!planted && (contact||t>7) && step%10===0){
      aliveAtk().forEach(u=>{ if(u===spikeCarrier||u===retriever)return; if(!u.path || u.seg>=u.path.length){
        let tgt=null,td=1e9; aliveDef().forEach(D=>{const d=sdist(u,D); if(d<td){td=d;tgt=D;}});
        if(tgt && td>4){ u.path=navRouteThrough([{x:u.x,y:u.y},{x:tgt.x,y:tgt.y}]); u.seg=0; }
        else if(sdist(u,plantAtSite)>6){ u.path=navRouteThrough([{x:u.x,y:u.y},plantAtSite]); u.seg=0; }
      }});
    }
    if(!planted && spikeCarrier && spikeCarrier.alive){
      const c=spikeCarrier; const onSite=sdist(c,plantAtSite)<6;
      const defHold=aliveDef().some(u=> sdist(u,plantAtSite)<20 && navLOS(u,plantAtSite));
      if(!onSite){ if(!c.path||c.seg>=c.path.length){ c.path=navRouteThrough([{x:c.x,y:c.y},plantAtSite]); c.seg=0; } planting=-1; }
      else if(defHold){ planting=-1; }
      else { if(planting<0){ planting=t; events.push({t,type:'plantStart',planter:c.name,x:plantAtSite.x,y:plantAtSite.y}); }
        else if(t-planting>=PLANT_TIME){ planted=true; plantT=t; events.push({t,type:'plant',planter:c.name,x:plantAtSite.x,y:plantAtSite.y});
          c.carrier=false; spikeCarrier=null; // spike is planted on site — nobody carries it anymore
          aliveAtk().forEach(u=>{u.path=null;u.seg=0;});
          aliveDef().forEach(u=>{u.path=navRouteThrough([{x:u.x,y:u.y},plantAtSite]);u.seg=0;}); } }
    } else if(planted){
      // RETAKE: defenders push onto the spike; attackers hold angles on it (stationary = advantage)
      if(step%8===0){ aliveDef().forEach(u=>{ if(!u.path||u.seg>=u.path.length){ if(sdist(u,plantAtSite)>4){u.path=navRouteThrough([{x:u.x,y:u.y},plantAtSite]);u.seg=0;} } }); }
      // Attackers keep the space they earned instead of rotating to defender anchor points.
      // DEFUSE: a defender on the spike, with no attacker holding sight on it, defuses over time (interruptible)
      const onSpike=aliveDef().find(u=>sdist(u,plantAtSite)<5);
      const atkWatch=aliveAtk().some(u=> sdist(u,plantAtSite)<24 && navLOS(u,plantAtSite));
      if(onSpike && !atkWatch){ if(defusing<0){ defusing=t; defuserName=onSpike.name; events.push({t,type:'defuseStart',defuser:onSpike.name,x:plantAtSite.x,y:plantAtSite.y}); }
        else if(t-defusing>=DEFUSE_TIME){ defused=true; events.push({t,type:'defuse',defuser:defuserName,x:plantAtSite.x,y:plantAtSite.y}); events.push({t,type:'end',winner:defTeamKey}); return spFin(defTeamKey,t); } }
      else if(defusing>=0){ defusing=-1; events.push({t,type:'defuseStop',x:plantAtSite.x,y:plantAtSite.y}); }
    }
    if(aliveDef().length===0){ if(!planted){planted=true;plantT=t;events.push({t,type:'plant',planter:(spikeCarrier||aliveAtk()[0]||{name:'?'}).name,x:plantAtSite.x,y:plantAtSite.y});} if(spikeCarrier){spikeCarrier.carrier=false;spikeCarrier=null;}
      events.push({t,type:'end',winner:atkTeamKey}); return spFin(atkTeamKey,t); }
    if(aliveAtk().length===0 && !planted){ events.push({t,type:'end',winner:defTeamKey}); return spFin(defTeamKey,t); }
    if(planted && t-plantT>SPIKE_TIME){ events.push({t,type:'end',winner:atkTeamKey}); return spFin(atkTeamKey,t); }
    if(!planted&&t>=ROUND_TIME){events.push({t,type:'end',winner:defTeamKey,reason:'round_time'});return spFin(defTeamKey,t);}
  }
  events.push({t:MAXT,type:'end',winner:planted?atkTeamKey:defTeamKey});
  return spFin(planted?atkTeamKey:defTeamKey,MAXT);
  function spFin(winnerKey,t){
    atk.concat(def).forEach(u=>{ const tt=u.alive?t:(u.deathT!=null?u.deathT:t); const last=u.track[u.track.length-1];
      if(!last||last.t<tt) u.track.push({t:+tt.toFixed(2),x:+u.x.toFixed(2),y:+u.y.toFixed(2),f:Math.round(u.face)}); });
    const units=atk.concat(def).map(u=>({side:u.side,idx:u.idx,name:u.name,track:u.track,deathT:u.deathT,finalHP:u.hp,finalShield:u.shield,shieldType:u.shieldType,weapon:u.weapon,headshotRate:u.headshotRate,decisionProfile:{discipline:+u.mind.discipline.toFixed(1),awareness:+u.mind.awareness.toFixed(1),coordination:+u.mind.coordination.toFixed(1),aggression:+u.mind.aggression.toFixed(1),composure:+u.mind.composure.toFixed(1)},role:(u.side===atkTeamKey?'atk':'def')}));
    let clutch=null; if(clutchWho&&clutchWho.side===winnerKey)clutch={player:clutchWho.name,side:winnerKey,vs:clutchVs};
    const phaseSummary=summarizeRoundPhases({events,duration:t,winner:winnerKey,atkKey:atkTeamKey,defKey:defTeamKey,tacticalPlan,planted,defused});
    const preparation={phase:'PREPARATION',barrierReleasedAt:0,site,attackFormation:form,defenseSetup:perSite,barriers:Object.values(G.barriers||{}),players:atk.concat(def).map(unit=>({player:unit.name,side:unit.side,role:unit.side===atkTeamKey?'attack':'defense',barrierId:unit.barrierId||null,from:unit.prepFrom,to:unit.prepTo,path:unit.prepPath||[unit.prepFrom,unit.prepTo].filter(Boolean)})),preplacedObjects:abilityObjects.filter(object=>object.placedAt<=0).map(object=>object.id)};
    return { winner:winnerKey, site, setup:perSite, hadInfo:hasInfo, hitWeaker:(site===weaker),preparation,
      planted, defused, duration:t, events, units, fb, clutch,
      phaseSummary,tradeSummary:{windows:tradeWindows.length,attempts:events.filter(e=>e.type==='kill'&&e.tradeAttempt).length,completed:events.filter(e=>e.type==='kill'&&e.traded).length,crossfireKills:events.filter(e=>e.type==='kill'&&e.crossfire).length},
      kills:events.filter(e=>e.type==='kill'),
      plantEv:events.find(e=>e.type==='plant')||null, defuseEv:events.find(e=>e.type==='defuse')||null,
      reconEv:events.find(e=>e.type==='recon')||null, utilEvs:events.filter(e=>e.type==='util'),abilityEvs:events.filter(e=>e.type==='ability'),abilityObjects,orbCaptures,orbMarkers:G.orbs||[] }; }
}
