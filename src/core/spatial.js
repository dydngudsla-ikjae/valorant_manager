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
import { WEAPON_DAMAGE, applyDamage, createVitalState, rollWeaponBurst } from './combat-model.js';
import { abilityObjectActive, createAbilityObject } from './ability-objects.js';
import { createAgentMind, decideAgentIntents, perceiveAgents, recordAgentDecision } from './agents/agent-loop.js';
import { createTeamCommunication, issueIglTeamOrder, processTeamCommunication, proposePlayerAction, reportPlayerFact, snapshotTeamCommunication, updateIglFormation } from './agents/team-communication.js';
import { formationDefinition, formationIdFor, formationTransition } from './tactics/formation-system.js';
import { evaluateIglDecision } from './agents/igl-decision-engine.js';
import { createExecutePlan, executePlanSnapshot, executeSpacingDirective, updateExecutePlan } from './tactics/execute-coordinator.js';
import { semanticAreaAt } from '../data/geo/semantic-regions.js';
import { ROUND_TIMING } from './round-timing.js';
import { completeDefenseFallback, createDefenseDecisionState, defenseDecisionSnapshot, evaluateDefenseInformationAction } from './agents/defense-decision-engine.js';

const NAVGRIDS={Ascent:ASCENT_NAV,Bind:BIND_NAV,Haven:HAVEN_NAV,Split:SPLIT_NAV,Lotus:LOTUS_NAV,Sunset:SUNSET_NAV,Icebox:ICEBOX_NAV};
let activeMapName=null;
function currentMapName(){return activeMapName||(MATCH&&MATCH.mapPool&&MATCH.mapPool[MATCH.curMap])||'Ascent';}
function curNav(){return NAVGRIDS[currentMapName()]||ASCENT_NAV;}
function navFor(mapName){return NAVGRIDS[mapName]||ASCENT_NAV;}
function openCell(grid,cx,cy){if(cx<0||cy<0||cx>=grid.w||cy>=grid.h)return false;return grid.cells[cy*grid.w+cx]==='1';}
function toCell(grid,x,y){return[Math.max(0,Math.min(grid.w-1,Math.floor(x/100*grid.w))),Math.max(0,Math.min(grid.h-1,Math.floor(y/100*grid.h)))];}
function cellPct(grid,cx,cy){return{x:(cx+0.5)/grid.w*100,y:(cy+0.5)/grid.h*100};}
function pointSegmentDistance(point,from,to){const dx=to.x-from.x,dy=to.y-from.y,length2=dx*dx+dy*dy;if(!length2)return Math.hypot(point.x-from.x,point.y-from.y);const t=Math.max(0,Math.min(1,((point.x-from.x)*dx+(point.y-from.y)*dy)/length2));return Math.hypot(point.x-(from.x+t*dx),point.y-(from.y+t*dy));}
function extraBlocked(grid,cx,cy,blockers=[]){const point=cellPct(grid,cx,cy);return blockers.some(block=>block.from&&block.to?pointSegmentDistance(point,block.from,block.to)<=(block.width??.7)/2:point.x>=block.x1&&point.x<=block.x2&&point.y>=block.y1&&point.y<=block.y2);}
function diagnosticOpen(grid,cx,cy,blockers=[]){return openCell(grid,cx,cy)&&!extraBlocked(grid,cx,cy,blockers);}
function openNear(grid,cx,cy){if(openCell(grid,cx,cy))return[cx,cy];const seen=new Set([cx+','+cy]),queue=[[cx,cy]],dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]];
  while(queue.length){const [x,y]=queue.shift();for(const [dx,dy] of dirs){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(nx<0||ny<0||nx>=grid.w||ny>=grid.h||seen.has(key))continue;if(openCell(grid,nx,ny))return[nx,ny];seen.add(key);queue.push([nx,ny]);}}
  return[cx,cy];}
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

export function navLOS(a,b){ // true only when every sampled cell between both players is walkable
  return navLineTest(currentMapName(),a,b).clear;
}

export function navSnapForMap(mapName,point){const grid=navFor(mapName),cell=openNear(grid,...toCell(grid,point.x,point.y));return cellPct(grid,cell[0],cell[1]);}

export function navLineTest(mapName,a,b,blockers=[]){
  const grid=navFor(mapName),ca=openNear(grid,...toCell(grid,a.x,a.y)),cb=openNear(grid,...toCell(grid,b.x,b.y));
  let x0=ca[0],y0=ca[1],x1=cb[0],y1=cb[1];
  let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy,guard=0,blocked=0,firstBlocked=null;
  while(guard++<600){if(!(x0===ca[0]&&y0===ca[1])&&!(x0===x1&&y0===y1)&&!diagnosticOpen(grid,x0,y0,blockers)){blocked++;firstBlocked??=cellPct(grid,x0,y0);return{clear:false,blockedCells:blocked,firstBlocked,from:cellPct(grid,ca[0],ca[1]),to:cellPct(grid,cb[0],cb[1])};}
    if(x0===x1&&y0===y1)return{clear:true,blockedCells:blocked,firstBlocked,from:cellPct(grid,ca[0],ca[1]),to:cellPct(grid,cb[0],cb[1])};
    const e2=2*err; if(e2>-dy){err-=dy;x0+=sx;} if(e2<dx){err+=dx;y0+=sy;} }
  return{clear:true,blockedCells:blocked,firstBlocked,from:cellPct(grid,ca[0],ca[1]),to:cellPct(grid,cb[0],cb[1])};
}

export function navPathTest(mapName,a,b,blockers=[]){
  const grid=navFor(mapName),start=openNear(grid,...toCell(grid,a.x,a.y)),goal=openNear(grid,...toCell(grid,b.x,b.y)),key=(x,y)=>x+','+y,open=(x,y)=>diagnosticOpen(grid,x,y,blockers),heuristic=(x,y)=>Math.abs(x-goal[0])+Math.abs(y-goal[1]),cost=new Map([[key(...start),0]]),came=new Map(),queue=[[heuristic(...start),...start]],dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]];let found=false,guard=0;
  while(queue.length&&guard++<45000){queue.sort((m,n)=>m[0]-n[0]);const [,cx,cy]=queue.shift();if(cx===goal[0]&&cy===goal[1]){found=true;break;}const currentKey=key(cx,cy),currentCost=cost.get(currentKey);for(const [dx,dy] of dirs){const nx=cx+dx,ny=cy+dy;if(!open(nx,ny)||(dx&&dy&&(!open(cx+dx,cy)||!open(cx,cy+dy))))continue;const nextKey=key(nx,ny),nextCost=currentCost+(dx&&dy?1.4:1);if(!cost.has(nextKey)||nextCost<cost.get(nextKey)){cost.set(nextKey,nextCost);came.set(nextKey,currentKey);queue.push([nextCost+heuristic(nx,ny),nx,ny]);}}}
  const path=[];if(found){let current=key(...goal);while(current){const [cx,cy]=current.split(',').map(Number);path.unshift(cellPct(grid,cx,cy));current=came.get(current);}}
  const simplified=path.filter((_,index)=>index===0||index===path.length-1||index%2===0),distance=path.slice(1).reduce((sum,point,index)=>sum+Math.hypot(point.x-path[index].x,point.y-path[index].y),0);
  return{reachable:found,path:simplified,distance,from:cellPct(grid,...start),to:cellPct(grid,...goal)};
}

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
  const TICK=ROUND_TIMING.tickSeconds,ROUND_TIME=ROUND_TIMING.roundSeconds,MAXT=ROUND_TIME+ROUND_TIMING.spikeSeconds+ROUND_TIMING.plantSeconds,RUN_SPEED=5.4,WALK_SPEED=3.2,RUN_HEARING_RADIUS=50,SIGHT=16,SPIKE_BLAST_RADIUS=35;
  const setup=opts.setup||tacticalPlan?.defense?.setup||spPickSetup(G.siteNames);const perSite={...setup};
  const siteStrength=Object.fromEntries(G.siteNames.map(s=>[s,(perSite[s]||0)+(perSite.mid||0)/G.siteNames.length]));
  const minStrength=Math.min(...Object.values(siteStrength));
  const weakSites=G.siteNames.filter(s=>siteStrength[s]===minStrength);
  const weaker=weakSites[Math.floor(random()*weakSites.length)];
  const atkAbility=abilityPlan.modifiers?.[atkTeamKey]||{},defAbility=abilityPlan.modifiers?.[defTeamKey]||{};
  const infoP=SP_TUNE.reconBase+SP_TUNE.reconGain*reconStrength+(atkAbility.information||0)*.12-(defAbility.information||0)*.04;
  const hasInfo=random()<infoP;
  let site=opts.forceSite||tacticalPlan?.attack?.targetSite||(hasInfo?weaker:G.siteNames[Math.floor(random()*G.siteNames.length)]);
  const mk=(team,key,idx)=>{
    const player=team.roster[idx],loadout=opts.loadouts?.[key]?.[idx]||{weapon:'Classic',shield:'none'};
    const uses=abilityPlan.uses.filter(use=>use.player===player.name),bladeStorm=uses.some(use=>use.mechanic==='blade_storm');
    return {name:player.name,side:key,idx,alive:true,...createVitalState(loadout.shield,loadout.shieldValue),startingVital:100+(loadout.shieldValue??0),weapon:bladeStorm?'BladeStorm':loadout.weapon,abilityUses:uses,headshotRate:player.combatProfile?.headshotRate??.24,firepower:player.attributes?.firepower??player.aim??60,mind:createAgentMind(player.attributes),nextDuelT:0,x:0,y:0,path:null,seg:0,r:ratingOf(player,key),startDelay:0,zone:null,track:[],deathT:null,role:null,carrier:false,face:0,hold:null,joined:false,lastSoundPosition:null};
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
  let other=tacticalPlan?.attack?.fakeSite||alternatives[Math.floor(random()*alternatives.length)];
  // attacker formation: main+mid commit to the target, a lurk works the other side (cut backups / take empty)
  const FORMS=[{lurk:1,mid:1,main:3,w:4},{lurk:1,mid:0,main:4,w:2},{lurk:0,mid:2,main:3,w:2},{lurk:1,mid:2,main:2,w:2},{lurk:2,mid:1,main:2,w:1}];
  const form=tacticalPlan?.attack?.formation||(()=>{const tot=FORMS.reduce((s,x)=>s+x.w,0);let r=random()*tot;for(const f of FORMS){if((r-=f.w)<=0)return f;}return FORMS[0];})();
  const initialFormationId=formationIdFor(form,tacticalPlan?.attack?.type);
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
  const pzc=G.plantZone(site); let plantAtSite=snap({x:pzc.x,y:pzc.y});
  const events=tacticalPlan?[{t:0,type:'tactic',attack:tacticalPlan.attack.type,defense:tacticalPlan.defense.type,site}]:[]; let planted=false,plantT=-1,defused=false,contact=false,utilAt=-1,executePlan=null;
  const damageContributors=new Map(),utilityContributors=new Map(),recentTeamUtility={home:[],away:[]};
  const abilityObjects=[],allUnits=atk.concat(def),unitByName=new Map(allUnits.map(unit=>[unit.name,unit]));
  const teamIntel={home:{site:null,confidence:0,lastUpdate:-99,source:null,timeline:[]},away:{site:null,confidence:0,lastUpdate:-99,source:null,timeline:[]}};let teamComms=null;
  teamComms=createTeamCommunication(allUnits,{targetSite:site,formation:initialFormationId,attackSide:atkTeamKey});
  const defenseDecision=createDefenseDecisionState(tacticalPlan?.defense?.type||'STANDARD');
  const nearestSite=point=>G.siteNames.slice().sort((a,b)=>sdist(point,G.plantZone(a))-sdist(point,G.plantZone(b)))[0];
  function shareTeamIntel(side,point,t,source,target=null,forcedSite=null,reporter=null){
    if(!teamComms)return;const unit=reporter||allUnits.filter(candidate=>candidate.alive&&candidate.side===side).sort((a,b)=>sdist(a,point)-sdist(b,point))[0];if(!unit)return;
    const reportedSite=forcedSite||nearestSite(point),confidence=source==='spike_planted'?1:(source==='teammate_death'?0.9:0.63);
    reportPlayerFact(teamComms,unit,t,source,{site:reportedSite,point,target,confidence});
  }
  const pendingAbilities=abilityPlan.uses.map((use,index)=>({use,index,used:false,earliest:3+index*1.35,readyReported:false,cooldownUntil:null,reuses:0}));
  for(const entry of pendingAbilities){const owner=unitByName.get(entry.use.player);if(owner)reportPlayerFact(teamComms,owner,0,'utility_unavailable',{confidence:1,detail:{ability:entry.use.name,status:'preparing',readyAt:+entry.earliest.toFixed(2),recharge:entry.use.recharge||null}});}
  const utilityCaller=pendingAbilities.find(entry=>entry.use.side===atkTeamKey&&entry.earliest<=4);if(utilityCaller){const caller=unitByName.get(utilityCaller.use.player);if(caller)proposePlayerAction(teamComms,caller,0,'wait_for_utility',{site,reason:'key_utility_not_ready',requestedAction:'delay_execute',waitUntil:utilityCaller.earliest,confidence:.82,urgency:.55,evidence:[utilityCaller.use.name]});}
  const lastAbilityAt={home:-99,away:-99};
  const isPreplaced=use=>use.side===defTeamKey&&['turret_anchor','vulnerable_trap'].includes(use.mechanic);
  function activateAbility(entry,t){
    const {use,index}=entry,owner=unitByName.get(use.player);if(entry.used||!owner?.alive)return false;entry.used=true;lastAbilityAt[use.side]=t;
    reportPlayerFact(teamComms,owner,t,'utility_used',{point:owner,confidence:1,detail:{ability:use.name,status:'used'}});if(use.recharge?.type==='cooldown')entry.cooldownUntil=t+use.recharge.seconds;
    events.push({...use,t:+t.toFixed(2),type:'ability',abilityType:use.type,x:owner.x,y:owner.y,site,runtimeDecision:entry.runtimeDecision||null});
    if(['flash','recon','stun','trap','smoke','wall'].includes(use.type)){
      const affected=allUnits.filter(unit=>unit.alive&&unit.side!==use.side&&sdist(owner,unit)<SIGHT*1.25&&navLOS(owner,unit)).sort((a,b)=>sdist(owner,a)-sdist(owner,b)).slice(0,2);
      for(const target of affected)recordUtilityContribution(use.player,target.name,use.name,t);
    }
    const object=createAbilityObject(use,index,{sitePoint:plantAtSite,chokePoint:G.choke(site),attackSide:atkTeamKey,ownerPoint:{x:owner.x,y:owner.y},placedAt:t,instanceId:`${index+1}-${entry.reuses}`});
    if(object){abilityObjects.push(object);events.push({t,type:'abilityObjectPlace',objectId:object.id,player:object.owner,side:object.side,ability:object.ability,mechanic:object.mechanic,kind:object.kind,hp:object.hp,activeAt:object.activeAt,expiresAt:object.expiresAt,x:object.x,y:object.y});events.push({t:object.expiresAt,type:'abilityObjectExpire',objectId:object.id,player:object.owner,side:object.side,ability:object.ability,mechanic:object.mechanic,x:object.x,y:object.y});}
    if(['flash','recon','stun','trap','smoke','wall'].includes(use.type)){
      const defaultWindow=['smoke','wall','trap'].includes(use.type)?8:5;
      recentTeamUtility[use.side].push({player:use.player,ability:use.name,type:use.type,t,assistUntil:object?.expiresAt??t+Math.max(defaultWindow,use.duration||0),x:object?.x??owner.x,y:object?.y??owner.y});
    }
    if(use.damage>0&&!isPreplaced(use)){
      const area=['remote_area_damage','wall_piercing_damage'].includes(use.mechanic),targets=(use.side===atkTeamKey?aliveDef():aliveAtk()).filter(enemy=>sdist(owner,enemy)<SIGHT*(use.mechanic==='wall_piercing_damage'?2:1.4)&&(use.mechanic==='wall_piercing_damage'||navLOS(owner,enemy))).sort((a,b)=>sdist(owner,a)-sdist(owner,b)).slice(0,area?2:1);
      targets.forEach((target,index)=>{if(!target.alive)return;const raw=Math.max(1,Math.round(use.damage*(index===0?1:.65))),impact=applyDamage(target,raw),applied=impact.absorbed+impact.hpDamage;recordDamageContribution(use.player,target.name,applied,t);events.push({t,type:'abilityDamage',source:use.player,victim:target.name,side:use.side,ability:use.name,mechanic:use.mechanic,amount:applied,rawDamage:raw,absorbed:impact.absorbed,remainingHP:target.hp,remainingShield:target.shield,lethal:impact.lethal,x:target.x,y:target.y});if(impact.lethal)finishKill(t,owner,target,{weapon:use.name,ability:use.name,cause:'ability',damage:raw,applied,headshot:false,hitZone:'ability',distanceBand:'ability'},{targetExposure:1,exposure:1,crossfire:false,isolated:true},[]);});
    }
    return true;
  }
  function defenseProbePoint(unit,depth){const targetZone=G.siteNames.includes(unit.zone)?unit.zone:nearestSite(unit),peekPoints=G.infoPeekPoints(targetZone).map(snap),target=peekPoints[Math.min(peekPoints.length-1,depth>.5?0:1)]||snap(G.choke(targetZone)),route=navPath(unit.x,unit.y,target.x,target.y),index=Math.max(0,Math.min(route.length-1,Math.floor((route.length-1)*depth)));return route[index]||target;}
  function coordinateDefenseInformation(t){
    for(const assignment of Object.values(defenseDecision.assignments)){if(assignment.status!=='returning')continue;const unit=unitByName.get(assignment.player);if(!unit?.alive){completeDefenseFallback(defenseDecision,assignment.player,t);continue;}if(!unit.path||unit.seg>=unit.path.length||sdist(unit,unit.hold)<1.5){unit.path=null;unit.seg=0;recordAgentDecision(unit,t,'hold','probe_returned_to_anchor',{alliesAlive:aliveDef().length,enemiesAlive:aliveAtk().length});completeDefenseFallback(defenseDecision,assignment.player,t);}}
    const utilityPlayers=pendingAbilities.filter(entry=>entry.use.side===defTeamKey&&!entry.used&&entry.earliest<=t&&['recon','trap','smoke'].includes(entry.use.type)).map(entry=>entry.use.player),actions=evaluateDefenseInformationAction(defenseDecision,{t,units:def,siteNames:G.siteNames,contact,planted,knowledge:teamComms.sides[defTeamKey].knowledge,utilityPlayers});
    for(const action of actions){
      if(action.type==='start'){const ordered=[];for(const name of action.players){const unit=unitByName.get(name);if(!unit?.alive)continue;const destination=defenseProbePoint(unit,action.mode==='CONTROL_PUSH'?.62:.38);if(action.mode==='UTILITY_CHECK'){const ability=pendingAbilities.find(entry=>entry.use.player===name&&entry.use.side===defTeamKey&&!entry.used&&entry.earliest<=t&&['recon','trap','smoke'].includes(entry.use.type));if(ability)activateAbility(ability,t);}else{unit.path=navPath(unit.x,unit.y,destination.x,destination.y);unit.seg=0;}recordAgentDecision(unit,t,action.mode==='UTILITY_CHECK'?'hold':'move',action.reason,{destination,alliesAlive:aliveDef().length,enemiesAlive:aliveAtk().length});ordered.push(name);events.push({t,type:'defenseInformationAction',mode:action.mode,player:name,zone:unit.zone,reason:action.reason,x:unit.x,y:unit.y,targetX:destination.x,targetY:destination.y});}if(ordered.length)issueIglTeamOrder(teamComms,defTeamKey,t,action.mode.toLowerCase(),{site:null,reason:action.reason,confidence:.65,players:ordered});}
      if(action.type==='fallback'){const unit=unitByName.get(action.player);if(!unit?.alive){completeDefenseFallback(defenseDecision,action.player,t);continue;}unit.path=navPath(unit.x,unit.y,unit.hold.x,unit.hold.y);unit.seg=0;recordAgentDecision(unit,t,'rotate','defense_probe_fallback',{destination:unit.hold,alliesAlive:aliveDef().length,enemiesAlive:aliveAtk().length});issueIglTeamOrder(teamComms,defTeamKey,t,'fallback',{site:unit.zone,reason:action.reason,confidence:1,players:[unit.name]});events.push({t,type:'defenseInformationFallback',player:unit.name,zone:unit.zone,reason:action.reason,x:unit.x,y:unit.y,targetX:unit.hold.x,targetY:unit.hold.y});}
    }
  }
  const orbCaptures=[];
  const assignedOrbPlayers=new Set();
  // An orb attempt becomes a real route and seven-second channel. Defenders
  // can deny it by taking sight/contact before the channel completes.
  for(const orb of G.orbs||[]){
    const candidates=atk.filter(unit=>unit!==spikeCarrier&&!assignedOrbPlayers.has(unit.name)&&(unit.path||[]).some(point=>sdist(point,orb)<8));
    if(candidates.length&&random()<.28+(atkAbility.information||0)*.06){const collector=candidates[Math.floor(random()*candidates.length)];assignedOrbPlayers.add(collector.name);collector.orbTask={orb,startedAt:null,complete:false,cancelled:false,duration:7};collector.path=navRouteThrough([{x:collector.x,y:collector.y},orb,plantAtSite]);collector.seg=0;}
  }
  let spikeDropped=null, planting=-1, retriever=null; const PLANT_TIME=ROUND_TIMING.plantSeconds,DEFUSE_TIME=ROUND_TIMING.defuseSeconds,SPIKE_TIME=ROUND_TIMING.spikeSeconds; let defusing=-1,defuserName=null,defuseProgress=0,defuseCheckpoint=0,lastDefuseTick=null,retakeAssigned=false,retakeDefuser=null,retakeStartedAt=-1,retakeDefuserReleased=false,defendersSaving=false,postPlantAssigned=false;const spikeEscapeIssued=new Set();
  const aliveAtk=()=>atk.filter(u=>u.alive), aliveDef=()=>def.filter(u=>u.alive);
  function rotateDefendersFromSharedIntel(t){
    const intel=teamIntel[defTeamKey],requiredConfidence=intel.source==='enemy_footsteps'?0.84:0.72;if(!intel.site||t-intel.lastUpdate>7||intel.confidence<requiredConfidence)return;
    const destination=plantAtSiteFor(intel.site),reason=intel.source==='spike_planted'?'spike_planted_confirmed':intel.source==='teammate_death'?'rotate_after_teammate_death':'rotate_on_confirmed_contact',rotatedPlayers=[],alive=aliveDef(),zoneCounts=new Map();
    for(const unit of alive)zoneCounts.set(unit.zone,(zoneCounts.get(unit.zone)||0)+1);
    const fullRetake=intel.source==='spike_planted',supportLimit=fullRetake?alive.length:(intel.confidence>=.9||intel.source==='teammate_death'?2:1);
    const candidates=alive.filter(unit=>unit.zone!==intel.site&&unit.rotationIntelAt!==intel.lastUpdate).sort((a,b)=>(a.zone==='mid'?-1:0)-(b.zone==='mid'?-1:0)||sdist(a,destination)-sdist(b,destination));
    for(const unit of candidates){
      if(rotatedPlayers.length>=supportLimit)break;
      // Until the spike is confirmed, every untouched bombsite keeps at least
      // one anchor. Mid/flexible defenders are the first reinforcement.
      if(!fullRetake&&G.siteNames.includes(unit.zone)&&(zoneCounts.get(unit.zone)||0)<=1)continue;
      zoneCounts.set(unit.zone,(zoneCounts.get(unit.zone)||1)-1);
      unit.rotationIntelAt=intel.lastUpdate;unit.rotationTarget=intel.site;unit.path=navPath(unit.x,unit.y,destination.x,destination.y);unit.seg=0;unit.zone=intel.site;
      rotatedPlayers.push(unit.name);
      recordAgentDecision(unit,t,'rotate',reason,{destination,alliesAlive:aliveDef().length,enemiesAlive:aliveAtk().length,confidence:intel.confidence});
    }
    if(rotatedPlayers.length){const anchors=alive.filter(unit=>unit.alive&&!rotatedPlayers.includes(unit.name)&&unit.zone!==intel.site).map(unit=>unit.name);issueIglTeamOrder(teamComms,defTeamKey,t,'rotate',{site:intel.site,reason,confidence:intel.confidence,players:rotatedPlayers});events.push({t,type:'defenseRotation',site:intel.site,source:intel.source,confidence:intel.confidence,players:rotatedPlayers,anchors});}
  }
  function plantAtSiteFor(siteName){const zone=G.plantZone(siteName);return snap({x:zone.x,y:zone.y});}
  function applyAttackFormation(formationId,t,reason){
    const definition=formationDefinition(formationId),ranked=aliveAtk().slice().sort((a,b)=>b.mind.awareness-a.mind.awareness),assignments={};let lurks=definition.slots.filter(role=>role==='lurk').length,mids=definition.slots.filter(role=>role==='mid').length;
    for(const unit of ranked){const role=lurks-->0?'lurk':mids-->0?'mid':'main',route=role==='lurk'?G.routeMain(other):role==='mid'?G.routeMid(site):G.routeMain(site);unit.role=role;unit.joined=role==='main';unit.path=navRouteThrough([{x:unit.x,y:unit.y}].concat(route));unit.seg=0;assignments[unit.name]={type:role==='lurk'?'probe_opposite':role==='mid'?'take_mid_control':'join_main_group',role,targetSite:role==='lurk'?other:site,engagement:definition.engagement,joinCondition:definition.joinCondition};recordAgentDecision(unit,t,role==='main'?'move':'rotate',`igl_formation_${formationId.toLowerCase()}`,{destination:unit.path.at(-1),alliesAlive:aliveAtk().length,enemiesAlive:aliveDef().length});}
    updateIglFormation(teamComms,atkTeamKey,t,formationId,{reason,site,assignments});
  }
  function startExecuteCoordination(t,reason){
    if(executePlan?.site===site&&['assembling','countdown','executing'].includes(executePlan.status))return;
    if(executePlan?.status==='assembling'||executePlan?.status==='countdown'||executePlan?.status==='executing')executePlan.status='cancelled';
    const choke=snap(G.choke(site));executePlan=createExecutePlan({t,site,units:aliveAtk(),spikeCarrier,choke,reason});
    const stagingRoute=navRouteThrough(G.routeMain(site).slice(0,-1).concat([choke])),stagingPoints=[0,1,2,3,4].map(index=>stagingRoute[Math.max(0,stagingRoute.length-1-index*4)]||choke),entryPoints=G.entryPoints(site).map(snap);
    for(const assignment of executePlan.assignments){const unit=unitByName.get(assignment.player);if(!unit?.alive)continue;const staging=stagingPoints[assignment.index%stagingPoints.length]||choke;assignment.stagingPoint={x:+staging.x.toFixed(2),y:+staging.y.toFixed(2)};assignment.destination=assignment.task==='spike'?plantAtSite:assignment.task==='flank_watch'?staging:(entryPoints[assignment.index%Math.max(1,entryPoints.length)]||plantAtSite);unit.executeAssignment=assignment;unit.path=navPath(unit.x,unit.y,staging.x,staging.y);unit.seg=0;recordAgentDecision(unit,t,'move','assemble_for_execute',{destination:staging,alliesAlive:aliveAtk().length,enemiesAlive:aliveDef().length,task:assignment.task});}
    events.push({t,type:'executePlan',planId:executePlan.id,site,reason,assignments:executePlan.assignments.map(({player,task,index,stagingPoint,destination})=>({player,task,index,stagingPoint,destination}))});
  }
  function coordinateExecute(t){
    const actions=updateExecutePlan(executePlan,{t,unitsByName:unitByName,distance:sdist,teamFacts:teamComms.sides[atkTeamKey].facts,contact});
    for(const action of actions){
      if(action.type==='countdown')events.push({t,type:'executeCountdown',site,executeAt:action.executeAt,reason:action.reason});
      if(action.type==='release'){const unit=unitByName.get(action.assignment.player);if(!unit?.alive)continue;const destination=action.assignment.destination||plantAtSite;unit.path=navPath(unit.x,unit.y,destination.x,destination.y);unit.seg=0;unit.startDelay=Math.max(unit.startDelay||0,t);recordAgentDecision(unit,t,'move','execute_entry_release',{destination,alliesAlive:aliveAtk().length,enemiesAlive:aliveDef().length,task:action.assignment.task});events.push({t,type:'executeRelease',planId:executePlan.id,player:unit.name,task:action.assignment.task,index:action.assignment.index,site,releaseAt:action.assignment.releaseAt,targetX:destination.x,targetY:destination.y});}
      if(action.type==='promote'){const unit=unitByName.get(action.assignment.player);if(unit?.alive){recordAgentDecision(unit,t,'move','entry_role_inherited',{destination:plantAtSite,alliesAlive:aliveAtk().length,enemiesAlive:aliveDef().length});events.push({t,type:'executePromotion',player:unit.name,site});}}
    }
  }
  function applyIglStateDecision(sideKey,decision,t){
    const side=teamComms.sides[sideKey];side.decisions.push({type:'igl_state_decision',...decision,igl:side.igl});
    if(sideKey===atkTeamKey){
      if(decision.mode==='ROTATE_SITE'&&decision.targetSite!==site){const previousSite=site;site=decision.targetSite;other=previousSite;plantAtSite=plantAtSiteFor(site);applyAttackFormation('FIVE',t,decision.reason);startExecuteCoordination(t,decision.reason);}
      else if(decision.mode==='COMMIT_SITE'||decision.mode==='REGROUP'){applyAttackFormation('FIVE',t,decision.reason);startExecuteCoordination(t,decision.reason);}
      else if(decision.mode==='GATHER_INFO')applyAttackFormation('ONE_THREE_ONE',t,decision.reason);
      else if(decision.mode==='WAIT_UTILITY'){for(const unit of aliveAtk()){unit.startDelay=Math.max(unit.startDelay||0,t+1.1);recordAgentDecision(unit,t,'hold','igl_waiting_for_utility',{alliesAlive:aliveAtk().length,enemiesAlive:aliveDef().length,confidence:decision.score/100});}issueIglTeamOrder(teamComms,atkTeamKey,t,'wait_for_utility',{site,reason:decision.reason,confidence:decision.score/100,players:aliveAtk().map(unit=>unit.name)});}
    }else if(decision.mode==='RETAKE'&&defendersSaving){defendersSaving=false;retakeAssigned=false;spikeEscapeIssued.clear();events.push({t,type:'retakeResume',side:defTeamKey,site:decision.targetSite,reason:decision.reason});}
    else if(decision.mode==='SAVE'){
      const remaining=Math.max(0,SPIKE_TIME-(t-plantT)),numbersDown=aliveAtk().length-aliveDef().length,genuineSave=planted&&defuseProgress===0&&((numbersDown>=2&&remaining<30)||(numbersDown>=1&&remaining<12));
      if(!genuineSave||!aliveDef().length)return;
      defendersSaving=true;const saved=[];for(const [index,unit] of aliveDef().entries()){const offset=[[-5,0],[5,0],[0,-5],[0,5],[4,4]][index%5],destination=snap({x:G.pts.defSpawn.x+offset[0],y:G.pts.defSpawn.y+offset[1]});unit.path=navPath(unit.x,unit.y,destination.x,destination.y);unit.seg=0;recordAgentDecision(unit,t,'rotate','igl_called_save',{destination,alliesAlive:aliveDef().length,enemiesAlive:aliveAtk().length,confidence:decision.score/100});saved.push({player:unit.name,weapon:unit.weapon,value:(WEAPON_DAMAGE[unit.weapon]?.cost||0),destination});}issueIglTeamOrder(teamComms,defTeamKey,t,'save',{site:decision.targetSite,reason:decision.reason,confidence:decision.score/100,players:aliveDef().map(unit=>unit.name)});events.push({t,type:'equipmentSavePlan',side:defTeamKey,remaining:+remaining.toFixed(2),players:saved});}
  }
  function processCommsAndOrders(t){
    const issued=processTeamCommunication(teamComms,t,{unitsByName:unitByName,alliesAlive:aliveAtk().length,enemiesAlive:aliveDef().length,timeRemaining:Math.max(0,ROUND_TIME-t)});
    for(const {decision} of issued){const unit=unitByName.get(decision.from);if(!unit?.alive)continue;
      if(decision.order==='wait_for_utility'){for(const teammate of aliveAtk()){teammate.startDelay=Math.max(teammate.startDelay||0,decision.until||t);recordAgentDecision(teammate,t,'hold','igl_approved_utility_wait',{alliesAlive:aliveAtk().length,enemiesAlive:aliveDef().length,confidence:.8});}}
      if(decision.order==='follow_rotation_sound'){const destination=plantAtSiteFor(decision.site||other);unit.role='lurk';unit.path=navPath(unit.x,unit.y,destination.x,destination.y);unit.seg=0;recordAgentDecision(unit,t,'move','igl_approved_sound_probe',{destination,alliesAlive:aliveAtk().length,enemiesAlive:aliveDef().length,confidence:.7});}
      if(decision.order==='hold_for_team')recordAgentDecision(unit,t,'hold','igl_held_sound_probe',{alliesAlive:aliveAtk().length,enemiesAlive:aliveDef().length,confidence:.65});
      if(decision.order==='commit_site'){const iglState=teamComms.sides[atkTeamKey].iglState;iglState.mode='COMMIT_SITE';iglState.targetSite=site;iglState.committed=true;iglState.lastDecisionAt=t;startExecuteCoordination(t,`proposal_${decision.proposal}`);}
      const nextFormation=formationTransition(teamComms.sides[atkTeamKey].formation,decision.order);if(nextFormation!==teamComms.sides[atkTeamKey].formation||decision.order==='commit_site')applyAttackFormation(nextFormation,t,`proposal_${decision.proposal}_${decision.verdict}`);
    }
    for(const sideKey of ['home','away']){const known=teamComms.sides[sideKey].knowledge,intel=teamIntel[sideKey];if(known.lastUpdate!==intel.lastUpdate){intel.site=known.site;intel.confidence=known.confidence;intel.lastUpdate=known.lastUpdate;intel.source=known.source;intel.timeline.push({t:+t.toFixed(2),site:known.site,confidence:+known.confidence.toFixed(2),source:known.source});}}
    const remaining=planted?Math.max(0,SPIKE_TIME-(t-plantT)):Math.max(0,ROUND_TIME-t);
    const equipmentValue=sideKey=>{const units=sideKey===atkTeamKey?aliveAtk():aliveDef();return units.length?units.reduce((sum,unit)=>sum+(WEAPON_DAMAGE[unit.weapon]?.cost||0)+(unit.shield||0)*20,0)/units.length:0;};
    for(const sideKey of ['home','away']){const attack=sideKey===atkTeamKey,decision=evaluateIglDecision(teamComms.sides[sideKey],t,{attack,sites:G.siteNames,currentSite:site,timeRemaining:remaining,alliesAlive:(attack?aliveAtk():aliveDef()).length,enemiesAlive:(attack?aliveDef():aliveAtk()).length,planted,formation:teamComms.sides[sideKey].formation,equipmentValue:equipmentValue(sideKey)});if(decision)applyIglStateDecision(sideKey,decision,t);}
  }
  if(hasInfo) events.push({t:1.0,type:'recon',x:plantAtSite.x,y:plantAtSite.y,site});
  pendingAbilities.filter(entry=>isPreplaced(entry.use)).forEach(entry=>activateAbility(entry,0));
  function abilityUseWindow(entry,t){
    const use=entry.use,owner=unitByName.get(use.player);if(!owner?.alive)return null;const attacking=use.side===atkTeamKey,nearChoke=sdist(owner,G.choke(site))<18,nearEnemy=(attacking?aliveDef():aliveAtk()).some(enemy=>sdist(owner,enemy)<SIGHT*1.25),executeStatus=executePlan?.status;
    if(use.ult){if((planted||contact)&&(nearEnemy||aliveAtk().length<=3||aliveDef().length<=3))return{phase:planted?'POST_PLANT':'CONTACT',reason:'high_leverage_ultimate'};return null;}
    if(attacking){
      if(['recon','smoke','flash','stun','wall'].includes(use.type)&&nearChoke&&['countdown','executing'].includes(executeStatus))return{phase:'EXECUTE',reason:'coordinated_site_entry'};
      if(use.type==='move'&&contact&&nearEnemy)return{phase:'CONTACT',reason:'take_or_escape_duel'};
      if(['molly','trap'].includes(use.type)&&planted)return{phase:'POST_PLANT',reason:'delay_spike_retake'};
      if(use.type==='molly'&&contact&&nearEnemy)return{phase:'CONTACT',reason:'clear_contested_space'};
      if(use.type==='trap'&&t>=4&&owner.role==='lurk')return{phase:'INFORMATION',reason:'secure_lurk_flank'};
    }else{
      if(use.type==='heal'&&owner.hp<85)return{phase:'SUSTAIN',reason:'recover_after_damage'};
      if(['smoke','flash','stun','wall'].includes(use.type)&&contact&&nearEnemy)return{phase:'HOLD',reason:'delay_confirmed_pressure'};
      if(use.type==='recon'&&t>=6&&!contact&&defenseDecision.mode==='UTILITY_CHECK')return{phase:'INFORMATION',reason:'active_information_check'};
      if(['molly','trap'].includes(use.type)&&((contact&&nearEnemy)||planted))return{phase:planted?'RETAKE':'HOLD',reason:planted?'clear_post_plant_position':'deny_site_entry'};
      if(use.type==='move'&&contact&&nearEnemy)return{phase:'CONTACT',reason:'defensive_reposition'};
    }
    return null;
  }
  const MOVING_INTENTS=new Set(['move','cover','rotate','objective']);
  function movementModeFor(unit,t){if(!MOVING_INTENTS.has(unit.mind.intent))return'still';if(['cover','rotate','objective'].includes(unit.mind.intent))return'run';if(teamComms?.sides?.[atkTeamKey]?.formation==='FIVE'&&unit.side===atkTeamKey)return'run';if(unit.role==='lurk')return'walk';return t<3?'run':'walk';}
  function moveUnit(u,t){
    u.mind.movementMode=movementModeFor(u,t);
    if(!u.alive)return;
    if(u.orbTask?.startedAt!=null&&!u.orbTask.complete&&!u.orbTask.cancelled)return;
    if(u.startDelay&&t<u.startDelay)return;
    if(u.mind.resumeDestination&&t>=(u.coverUntil||0)&&(!u.path||u.seg>=u.path.length)){const destination=u.mind.resumeDestination;u.mind.resumeDestination=null;u.path=navPath(u.x,u.y,destination.x,destination.y);u.seg=0;u.mind.intent='move';recordAgentDecision(u,t,'move','repeek_after_cover_reset',{destination,alliesAlive:(u.side===atkTeamKey?aliveAtk():aliveDef()).length,enemiesAlive:(u.side===atkTeamKey?aliveDef():aliveAtk()).length});}
    // The decision loop owns locomotion. A remaining route no longer makes a
    // player slide forward while acquiring, shooting, recovering or holding.
    if(!MOVING_INTENTS.has(u.mind.intent))return;
    if(u.side===atkTeamKey){const spacing=executeSpacingDirective(executePlan,u,unitByName,sdist);if(spacing&&!spacing.move){u.mind.movementMode='still';return;}if(spacing?.catchUp)u.mind.movementMode='run';}
    if(!u.path||u.seg>=u.path.length)return;
    const w=u.path[u.seg],d=sdist(u,w),step=(u.mind.movementMode==='walk'?WALK_SPEED:RUN_SPEED)*TICK;if(d>0.001)u.face=Math.atan2(w.y-u.y,w.x-u.x)*180/Math.PI;
    if(d<=step){u.x=w.x;u.y=w.y;u.seg++;}else{u.x+=(w.x-u.x)/d*step;u.y+=(w.y-u.y)/d*step;}
    if(u.seg>=u.path.length&&u.mind.intent==='cover'){u.path=null;u.seg=0;u.mind.movementMode='still';}
  }
  function shareRunningFootsteps(t){
    for(const runner of allUnits.filter(unit=>unit.alive&&unit.mind.movementMode==='run')){
      const previous=runner.lastSoundPosition||{x:runner.x,y:runner.y};runner.lastSoundPosition={x:runner.x,y:runner.y};if(sdist(previous,runner)<.15)continue;
      for(const listener of allUnits.filter(unit=>unit.alive&&unit.side!==runner.side&&sdist(unit,runner)<=RUN_HEARING_RADIUS)){
        listener.mind.heardSteps??=new Map();listener.mind.footstepSiteReports??=new Map();const soundId=`${runner.side}:${runner.idx}`,prior=listener.mind.heardSteps.get(soundId),distance=sdist(listener,runner),reportedSite=nearestSite(runner),area=semanticAreaAt(activeMapName,runner.x,runner.y),areaId=area?.id||reportedSite;
        const recentPrior=prior&&t-prior.t<=2,receding=recentPrior?distance-prior.distance>.45:false,approaching=recentPrior?prior.distance-distance>.45:false,confidence=Math.max(.35,Math.min(.78,.78-distance/RUN_HEARING_RADIUS*.35)),motion=receding?'receding':approaching?'approaching':'lateral',fromArea=recentPrior?prior.areaId:null,direction=fromArea&&fromArea!==areaId?{from:fromArea,to:areaId}:null;listener.mind.heardSteps.set(soundId,{t,distance,motion,areaId});
        const lastReport=listener.mind.footstepSiteReports.get(reportedSite),shouldReport=!lastReport||(motion!==lastReport.motion&&t-lastReport.t>=1.5);if(!shouldReport)continue;listener.mind.footstepSiteReports.set(reportedSite,{t,motion});
        shareTeamIntel(listener.side,runner,t,'enemy_footsteps',`sound-${runner.side}-${runner.idx}`,null,listener);
        const fact=teamComms.playerKnowledge[listener.name].facts.at(-1);if(fact){fact.confidence=+confidence.toFixed(2);fact.detail={movement:'run',receding,approaching,direction,area:areaId,distanceBand:distance<RUN_HEARING_RADIUS*.4?'near':distance<RUN_HEARING_RADIUS*.75?'mid':'far'};}
        events.push({t,type:'sound',kind:'footstep',listener:listener.name,side:listener.side,sourceId:`sound-${runner.side}-${runner.idx}`,movement:'run',receding,approaching,direction,area:areaId,distance:+distance.toFixed(2),x:runner.x,y:runner.y});
        if(receding&&listener.side===atkTeamKey&&!listener.mind.rotationSoundProposed){listener.mind.rotationSoundProposed=true;proposePlayerAction(teamComms,listener,t,'follow_rotation_sound',{site:nearestSite(runner),reason:'enemy_running_away',requestedAction:'probe_vacated_space',confidence,urgency:.48,evidence:[`sound-${runner.side}-${runner.idx}`]});}
      }
    }
  }
  function utilActive(t){ return utilAt>=0&&(t-utilAt)<SP_TUNE.utilWindow; }
  function visibleEnemies(unit,enemies){return enemies.filter(enemy=>enemy.alive&&sdist(unit,enemy)<SIGHT&&navLOS(unit,enemy));}
  function seekNearbyCover(unit,enemies,t,force=false){
    const currentExposure=visibleEnemies(unit,enemies).length;if((currentExposure<(force?1:2))||t<(unit.coverUntil||0))return false;
    const [cx,cy]=navOpenNear(...navToCell(unit.x,unit.y));let best=null,bestScore=currentExposure*100;
    for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const nx=cx+dx,ny=cy+dy;if(!navOpenCell(nx,ny))continue;const point=navCellPct(nx,ny),exposure=visibleEnemies(point,enemies).length,score=exposure*100+Math.hypot(dx,dy)*2;if(score<bestScore){bestScore=score;best=point;}}
    if(!best){recordAgentDecision(unit,t,'hold','no_safer_cover',{exposure:currentExposure,visibleEnemies:currentExposure,alliesAlive:(unit.side===atkTeamKey?aliveAtk():aliveDef()).length,enemiesAlive:enemies.length});return false;}
    const from={x:unit.x,y:unit.y},resumeDestination=unit.path?.at(-1);if(resumeDestination)unit.mind.resumeDestination={x:resumeDestination.x,y:resumeDestination.y};
    const resetDelay=.55+(100-unit.mind.composure)/115;unit.path=navPath(unit.x,unit.y,best.x,best.y);unit.seg=0;unit.coverUntil=t+resetDelay;unit.hold=best;
    recordAgentDecision(unit,t,'cover','safer_position_found',{destination:best,exposure:currentExposure,visibleEnemies:currentExposure,alliesAlive:(unit.side===atkTeamKey?aliveAtk():aliveDef()).length,enemiesAlive:enemies.length});
    events.push({t,type:'coverSeek',player:unit.name,side:unit.side,exposure:currentExposure,resetAt:+unit.coverUntil.toFixed(2),fromX:from.x,fromY:from.y,x:best.x,y:best.y});return true;
  }
  let fb=null, clutchWho=null, clutchVs=0;const tradeWindows=[];
  function recordDamageContribution(source,victim,amount,t){
    if(!source||!victim||amount<=0)return;
    let ledger=damageContributors.get(victim);if(!ledger){ledger=new Map();damageContributors.set(victim,ledger);}
    const prior=ledger.get(source)||{damage:0,lastHitAt:t};ledger.set(source,{damage:prior.damage+amount,lastHitAt:t});
  }
  function recordUtilityContribution(source,victim,ability,t){
    let ledger=utilityContributors.get(victim);if(!ledger){ledger=new Map();utilityContributors.set(victim,ledger);}
    ledger.set(source,{ability,lastAt:t});
  }
  function finishKill(t,killer,victim,hit,intent,tickHits){
    if(!victim.alive)return;const units=atk.concat(def),victimEnemies=victim.side===atkTeamKey?aliveDef():aliveAtk();
    const support=duelSupportContext({attacker:killer.side===atkTeamKey?killer:victim,defender:killer.side===atkTeamKey?victim:killer,units,windows:tradeWindows,time:t,lineOfSight:navLOS});
    const killerSupport=killer.side===atkTeamKey?support.attacker:support.defender,tradeWindow=killerSupport.trade&&killerSupport.trade.target===victim.name?killerSupport.trade:null;if(tradeWindow)tradeWindow.consumed=true;
    const contributors=[...(damageContributors.get(victim.name)||new Map()).entries()].filter(([name,entry])=>name!==killer.name&&entry.damage>=50&&t-entry.lastHitAt<=10).sort((a,b)=>b[1].damage-a[1].damage),directUtility=[...(utilityContributors.get(victim.name)||new Map()).entries()].filter(([name,entry])=>name!==killer.name&&t-entry.lastAt<=5).sort((a,b)=>b[1].lastAt-a[1].lastAt),areaUtility=[...(recentTeamUtility[killer.side]||[])].filter(entry=>entry.player!==killer.name&&t<=entry.assistUntil+1.5&&sdist(entry,victim)<=SIGHT*1.8).sort((a,b)=>b.t-a.t),utilityEntries=[...directUtility,...areaUtility.map(entry=>[entry.player,{ability:entry.ability,lastAt:entry.t}])],assists=[...new Set([...contributors.map(([name])=>name),...utilityEntries.map(([name])=>name)])],assist=assists[0]||null;
    victim.alive=false;victim.path=null;victim.deathT=t;shareTeamIntel(victim.side,victim,t,'teammate_death',killer.name);
    if(victim.orbTask?.startedAt!=null&&!victim.orbTask.complete&&!victim.orbTask.cancelled){victim.orbTask.cancelled=true;events.push({t,type:'orbCancel',player:victim.name,side:victim.side,orbId:victim.orbTask.orb.id,x:victim.x,y:victim.y,reason:'death'});}
    if(victim===spikeCarrier){spikeDropped={x:victim.x,y:victim.y};spikeCarrier=null;planting=-1;events.push({t,type:'spikeDrop',x:victim.x,y:victim.y});}
    if(!fb)fb={killer:killer.name,victim:victim.name,side:killer.side};
    const nextTrade=createTradeWindow({loser:victim,winner:killer,time:t,units,lineOfSight:navLOS,teamplay:teamplay[victim.side]||60});if(nextTrade){tradeWindows.push(nextTrade);events.push({t,type:'tradeWindow',victim:victim.name,target:killer.name,side:victim.side,supporters:nextTrade.supporters,expires:nextTrade.expires});}
    const phase=currentRoundPhase({contact,firstBlood:!!fb,planted,retakeStarted:planted&&aliveDef().some(unit=>sdist(unit,plantAtSite)<20)});
    events.push({t,type:'kill',killer:killer.name,victim:victim.name,side:killer.side,x:victim.x,y:victim.y,fb:events.filter(event=>event.type==='kill').length===0,assist,assists,assistType:contributors[0]?'damage':utilityEntries[0]?'utility':null,assistDamage:contributors[0]?.[1].damage||0,assistAbility:utilityEntries[0]?.[1].ability||null,cause:hit.cause||'weapon',ability:hit.ability||null,damage:hit.applied,rawDamage:hit.damage,retaliationDamage:0,headshot:hit.headshot,weapon:hit.weapon,hitZone:hit.hitZone,distanceBand:hit.distanceBand,focusFire:Math.max(0,(intent.targetExposure||1)-1),victimExposure:intent.targetExposure,killerExposure:intent.exposure,phase,tradeAttempt:!!tradeWindow,traded:!!tradeWindow,tradeOf:tradeWindow?.victim||null,crossfire:!!intent.crossfire,isolated:intent.targetExposure>=2});
    if(!clutchWho){if(aliveAtk().length===1&&aliveDef().length>=2){clutchWho=aliveAtk()[0];clutchVs=aliveDef().length;}else if(aliveDef().length===1&&aliveAtk().length>=2){clutchWho=aliveDef()[0];clutchVs=aliveAtk().length;}}
  }
  function resolveAgentTick(t){
    const units=atk.concat(def),enemiesOf=unit=>unit.side===atkTeamKey?aliveDef():aliveAtk(),alliesOf=unit=>unit.side===atkTeamKey?aliveAtk():aliveDef();
    const perceptions=perceiveAgents({units,enemiesOf,lineOfSight:navLOS,distance:sdist,sight:SIGHT,time:t});
    for(const [observer,view] of perceptions)for(const seen of view.newContacts){shareTeamIntel(observer.side,seen.unit,t,'enemy_sighting',seen.unit.name,null,observer);events.push({t,type:'sighting',player:observer.name,side:observer.side,target:seen.unit.name,distance:+seen.distance.toFixed(2),x:seen.unit.x,y:seen.unit.y});}
    const phase=currentRoundPhase({contact,firstBlood:!!fb,planted,retakeStarted:planted&&aliveDef().some(unit=>sdist(unit,plantAtSite)<20)});
    const intents=decideAgentIntents({units,perceptions,alliesOf,lineOfSight:navLOS,distance:sdist,time:t,planted,phase});
    for(const intent of intents.filter(item=>item.type==='cover')){const moved=seekNearbyCover(intent.actor,enemiesOf(intent.actor),t,true);if(moved)events.push({t,type:'combatDisengage',player:intent.actor.name,side:intent.actor.side,reason:intent.reason||'danger_recognized',hp:intent.actor.hp,shield:intent.actor.shield,exposure:intent.exposure,x:intent.actor.x,y:intent.actor.y});}
    const shotIntents=intents.filter(item=>item.type==='shoot'),focusByTarget=new Map();for(const intent of shotIntents)focusByTarget.set(intent.target,(focusByTarget.get(intent.target)||0)+1);if(shotIntents.length)contact=true;
    const tickHits=[];
    for(const intent of shotIntents){const {actor,target,distance,moving}=intent,targetExposure=focusByTarget.get(target)||1;intent.targetExposure=targetExposure;
      const actorTeam=actor.side==='home'?home:away,targetTeam=target.side==='home'?home:away,actorRating=ratingOf(actorTeam.roster[actor.idx],actor.side,{opening:!fb,attacking:actor.side===atkTeamKey,clutch:alliesOf(actor).length===1}),targetRating=ratingOf(targetTeam.roster[target.idx],target.side,{opening:!fb,attacking:target.side===atkTeamKey,clutch:enemiesOf(actor).length===1});
      const hold=!actor.path||actor.seg>=actor.path.length,coordinatedAllies=alliesOf(actor).filter(ally=>ally!==actor&&navLOS(ally,target)&&sdist(ally,target)<SIGHT).length,coordination=(actor.mind.coordination-60)/250+coordinatedAllies*(.015+actor.mind.coordination/1000),support=duelSupportContext({attacker:actor,defender:target,units,windows:tradeWindows,time:t,lineOfSight:navLOS}).attacker,supportEdge=supportModifier(support)/100,focusEdge=Math.min(.055,Math.max(0,targetExposure-1)*.022);
      // Clearers swing together while the defuser trails them. The coordination
      // offsets the normal moving-shot penalty; it is not granted to the defuser.
      const retakeClearEdge=planted&&actor.side===defTeamKey&&actor.retakeRole==='clear'?.12:0;
      const accuracy=Math.max(.18,Math.min(.88,.48+(actor.firepower-60)/180+(actorRating-targetRating)/300+(hold?.08:0)-(moving?.12:0)-Math.max(0,distance-8)*.012+coordination+supportEdge+focusEdge+retakeClearEdge));intent.tradeWindow=!!support.trade;intent.crossfire=support.crossfire;intent.isolated=support.isolated;
      const burst=rollWeaponBurst({weapon:actor.weapon,distance,headshotRate:actor.headshotRate,firepower:actor.firepower,ratingEdge:actorRating-targetRating,accuracy,moving});actor.nextDuelT=t+Math.max(.32,burst.cooldown+.1);
      const landed=burst.bullets.filter(bullet=>bullet.hit);events.push({t,type:'shot',source:actor.name,victim:target.name,side:actor.side,weapon:burst.weapon,hit:landed.length>0,bulletsFired:burst.count,bulletsHit:landed.length,accuracy:+accuracy.toFixed(3),tradeAttempt:!!support.trade,crossfire:support.crossfire,isolated:support.isolated,focusFire:targetExposure-1,x:target.x,y:target.y});
      for(const profile of landed)tickHits.push({actor,target,intent,profile,burstSize:burst.count});
    }
    // All shots were selected before damage is applied, so a player killed in
    // this tick still completes the shot they had already committed to.
    for(const result of tickHits){const {actor,target,intent,profile}=result;if(!target.alive)continue;const impact=applyDamage(target,profile.damage),applied=impact.absorbed+impact.hpDamage;result.applied=applied;recordDamageContribution(actor.name,target.name,applied,t);
      events.push({t,type:'damage',source:actor.name,victim:target.name,side:actor.side,amount:applied,rawDamage:profile.damage,absorbed:impact.absorbed,remainingHP:target.hp,remainingShield:target.shield,weapon:profile.weapon,bulletIndex:profile.index,hitZone:profile.hitZone,distanceBand:profile.distanceBand,headshot:profile.headshot,lethal:impact.lethal,simultaneous:true,tradeAttempt:!!intent.tradeWindow,crossfire:!!intent.crossfire,isolated:!!intent.isolated,focusFire:Math.max(0,(intent.targetExposure||1)-1),x:target.x,y:target.y});
      if(impact.lethal)finishKill(t,actor,target,{...profile,applied},intent,tickHits);
    }
  }
  for(let step=0,t=0; step<MAXT/TICK; step++, t+=TICK){
    coordinateDefenseInformation(t);
    atk.forEach(u=>moveUnit(u,t)); def.forEach(u=>moveUnit(u,t));
    shareRunningFootsteps(t);
    for(const entry of pendingAbilities){
      const owner=unitByName.get(entry.use.player);if(entry.used&&entry.cooldownUntil!=null&&t>=entry.cooldownUntil&&entry.reuses<1){entry.used=false;entry.earliest=entry.cooldownUntil;entry.cooldownUntil=null;entry.readyReported=false;entry.reuses++;}
      if(!entry.used&&t>=entry.earliest&&!entry.readyReported&&owner?.alive){entry.readyReported=true;reportPlayerFact(teamComms,owner,t,'utility_ready',{point:owner,confidence:1,detail:{ability:entry.use.name,status:'ready',recharged:entry.reuses>0}});}
      if(entry.used||isPreplaced(entry.use)||t<entry.earliest||t-lastAbilityAt[entry.use.side]<1.25||!owner?.alive)continue;const decision=abilityUseWindow(entry,t);if(decision){entry.runtimeDecision=decision;activateAbility(entry,t);}
    }
    if(step%4===0){aliveAtk().forEach(unit=>seekNearbyCover(unit,aliveDef(),t));aliveDef().forEach(unit=>seekNearbyCover(unit,aliveAtk(),t));}
    if(step%5===0)for(const object of abilityObjects){if(!object.destructible||!abilityObjectActive(object,t))continue;const enemies=(object.side===atkTeamKey?aliveDef():aliveAtk()).filter(unit=>sdist(unit,object)<SIGHT&&navLOS(unit,object));if(!enemies.length)continue;
      const shooter=enemies.sort((a,b)=>sdist(a,object)-sdist(b,object))[0],destroyChance=Math.max(.08,Math.min(.5,(shooter.firepower-45)/90));if(random()<destroyChance){object.destroyedAt=t;object.destroyedBy=shooter.name;const source=pendingAbilities.find(entry=>entry.use.player===object.owner&&entry.use.name===object.ability),recharge=source?.use.recharge;if(source&&recharge?.type==='destroyed_cooldown'){source.cooldownUntil=t+recharge.seconds;source.readyReported=false;}events.push({t,type:'abilityObjectDestroy',objectId:object.id,player:shooter.name,owner:object.owner,side:shooter.side,ability:object.ability,mechanic:object.mechanic,rechargeAt:source?.cooldownUntil??null,x:object.x,y:object.y});}}
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
      aliveAtk().forEach(u=>{ if(u.role==='lurk'&&!u.joined&&(mainAlive<=1||atkN<defN)){ u.joined=true; u.role='main'; u.path=navRouteThrough([{x:u.x,y:u.y},plantAtSite]); u.seg=0;recordAgentDecision(u,t,'rotate','join_thinning_main_group',{destination:plantAtSite,alliesAlive:atkN,enemiesAlive:defN}); } }); }
    if(step%3===0){ const ck=spikeCarrier?(spikeCarrier.side+spikeCarrier.idx):null;
      for(const u of atk){ if(u.alive)u.track.push({t:+t.toFixed(2),x:+u.x.toFixed(2),y:+u.y.toFixed(2),f:Math.round(u.face),i:u.mind.intent,m:u.mind.movementMode||'still',c:(u.side+u.idx)===ck?1:0}); }
      for(const u of def){ if(u.alive)u.track.push({t:+t.toFixed(2),x:+u.x.toFixed(2),y:+u.y.toFixed(2),f:Math.round(u.face),i:u.mind.intent,m:u.mind.movementMode||'still'}); } }
    if(utilAt<0){ const ck=G.choke(site); if(aliveAtk().some(u=>sdist(u,ck)<14&&t>1.5)){ utilAt=t;
      events.push({t,type:'util',kind:'smoke',x:ck.x,y:ck.y,site}); events.push({t:t+0.2,type:'util',kind:'flash',x:plantAtSite.x,y:plantAtSite.y,site}); } }
    resolveAgentTick(t);
    for(const unit of aliveAtk().filter(candidate=>candidate.role==='lurk'&&!candidate.mind.probeProposed&&t>=4)){unit.mind.probeProposed=true;proposePlayerAction(teamComms,unit,t,'continue_probe',{site:other,reason:'opposite_side_information_incomplete',requestedAction:'probe_deeper',confidence:unit.mind.awareness/100,urgency:.35,evidence:[...unit.mind.contacts.keys()]});}
    const attackSideComms=teamComms.sides[atkTeamKey],attackKnowledge=attackSideComms.knowledge,commitCaller=aliveAtk().find(unit=>unit.role==='main');if(commitCaller&&!attackSideComms.commitProposed&&attackKnowledge.source==='enemy_sighting'&&attackKnowledge.confidence>=.8){attackSideComms.commitProposed=true;proposePlayerAction(teamComms,commitCaller,t,'commit_site',{site:attackKnowledge.site,reason:'multiple_defenders_confirmed',requestedAction:'commit_current_hit',confidence:attackKnowledge.confidence,urgency:commitCaller.mind.aggression/100,evidence:['shared_enemy_contacts']});}
    processCommsAndOrders(t);
    coordinateExecute(t);
    rotateDefendersFromSharedIntel(t);
    // spike pickup: a dedicated retriever goes to the dropped spike (others keep clearing)
    if(!planted && !spikeCarrier && spikeDropped){
      if(!retriever || !retriever.alive) retriever=aliveAtk().slice().sort((a,b)=>sdist(a,spikeDropped)-sdist(b,spikeDropped))[0]||null;
      if(retriever){ if(sdist(retriever,spikeDropped)<4){ spikeCarrier=retriever; retriever.carrier=true;recordAgentDecision(retriever,t,'objective','recover_spike',{destination:spikeDropped,alliesAlive:aliveAtk().length,enemiesAlive:aliveDef().length});events.push({t,type:'spikePickup',by:retriever.name,x:retriever.x,y:retriever.y}); spikeDropped=null; retriever=null; }
        else if(!retriever.path||retriever.seg>=retriever.path.length){ retriever.path=navRouteThrough([{x:retriever.x,y:retriever.y},spikeDropped]); retriever.seg=0;recordAgentDecision(retriever,t,'move','retrieve_dropped_spike',{destination:spikeDropped,alliesAlive:aliveAtk().length,enemiesAlive:aliveDef().length}); } }
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
      else { if(planting<0){ planting=t;recordAgentDecision(c,t,'objective','plant_spike',{destination:plantAtSite,alliesAlive:aliveAtk().length,enemiesAlive:aliveDef().length});events.push({t,type:'plantStart',planter:c.name,x:plantAtSite.x,y:plantAtSite.y}); }
        else if(t-planting>=PLANT_TIME){ planted=true; plantT=t;shareTeamIntel(defTeamKey,plantAtSite,t,'spike_planted',c.name,site);events.push({t,type:'plant',planter:c.name,x:plantAtSite.x,y:plantAtSite.y});
          c.carrier=false; spikeCarrier=null; // spike is planted on site — nobody carries it anymore
          if(!postPlantAssigned){postPlantAssigned=true;const positions=G.postPlantPositions(site).map(snap),assigned=[];aliveAtk().slice().sort((a,b)=>(a.executeAssignment?.index??9)-(b.executeAssignment?.index??9)).forEach((u,index)=>{const destination=positions[index%positions.length]||plantAtSite;u.path=navPath(u.x,u.y,destination.x,destination.y);u.seg=0;u.startDelay=Math.max(u.startDelay||0,t+index*.22);recordAgentDecision(u,t,index===0?'hold':'move',index===0?'postplant_spike_guard':'postplant_crossfire_assignment',{destination,alliesAlive:aliveAtk().length,enemiesAlive:aliveDef().length,task:u.executeAssignment?.task});assigned.push({player:u.name,task:index===0?'spike_guard':'crossfire',destination,startAt:+u.startDelay.toFixed(2)});});events.push({t,type:'postPlantPlan',site,assignments:assigned});} } }
    } else if(planted){
      // RETAKE: assign distinct lanes once. A plant must not overwrite every
      // defender with the same path in the same tick.
      if(!retakeAssigned){
        retakeAssigned=true;retakeStartedAt=t;retakeDefuserReleased=false;
        const holds=G.siteHolds(site).map(snap),assigned=[],candidates=aliveDef().slice(),defuserUnit=candidates.slice().sort((a,b)=>((objective[defTeamKey]?.[b.name]||50)+(b.hp+b.shield)*.18-sdist(b,plantAtSite)*1.25)-((objective[defTeamKey]?.[a.name]||50)+(a.hp+a.shield)*.18-sdist(a,plantAtSite)*1.25))[0];
        retakeDefuser=defuserUnit||null;
        const ordered=[defuserUnit,...candidates.filter(unit=>unit!==defuserUnit).sort((a,b)=>sdist(a,plantAtSite)-sdist(b,plantAtSite))].filter(Boolean);
        ordered.forEach((u,index)=>{
          const defuser=index===0,clearDestination=holds[(index-1)%Math.max(1,holds.length)]||plantAtSite;
          let destination=clearDestination;
          if(defuser&&ordered.length>1){
            const route=navRouteThrough([{x:u.x,y:u.y},plantAtSite]);
            destination=route[Math.max(0,Math.floor((route.length-1)*.68))]||plantAtSite;
          }else if(defuser)destination=plantAtSite;
          u.retakeRole=defuser?'defuser':'clear';u.path=navRouteThrough([{x:u.x,y:u.y},destination]);u.seg=0;
          const delay=defuser ? .35 : .1+Math.max(0,index-1)*.16;u.startDelay=Math.max(u.startDelay||0,t+delay);
          assigned.push({player:u.name,task:defuser?'defuser_stage':'retake_clear',destination,startAt:+u.startDelay.toFixed(2)});
          recordAgentDecision(u,t,defuser?'rotate':'move',defuser?'retake_defuser_stages_behind_clearers':'retake_lane_clear_first',{destination,alliesAlive:aliveDef().length,enemiesAlive:aliveAtk().length});
        });
        if(ordered.length<=1)retakeDefuserReleased=true;
        events.push({t,type:'retakePlan',site,sequence:'clear_stage_then_defuse',assignments:assigned});
      }
      const spikeRemaining=Math.max(0,SPIKE_TIME-(t-plantT)),escapeDestination=(unit,index)=>{const spawn=unit.side===atkTeamKey?(G.atkSpawn[index%G.atkSpawn.length]||G.atkSpawn[0]):G.pts.defSpawn,offset=[[-5,0],[5,0],[0,-5],[0,5],[4,4]][index%5];return snap({x:spawn.x+offset[0],y:spawn.y+offset[1]});};
      const orderEscape=(unit,index,reason)=>{if(spikeEscapeIssued.has(unit.name))return;const destination=escapeDestination(unit,index);spikeEscapeIssued.add(unit.name);unit.path=navPath(unit.x,unit.y,destination.x,destination.y);unit.seg=0;unit.startDelay=Math.max(unit.startDelay||0,t+index*.14);recordAgentDecision(unit,t,'move',reason,{destination,alliesAlive:(unit.side===atkTeamKey?aliveAtk():aliveDef()).length,enemiesAlive:(unit.side===atkTeamKey?aliveDef():aliveAtk()).length});events.push({t,type:'spikeEscape',player:unit.name,side:unit.side,remaining:+spikeRemaining.toFixed(2),reason,x:unit.x,y:unit.y,targetX:destination.x,targetY:destination.y});};
      if(spikeRemaining<=10&&defusing<0)aliveAtk().forEach((unit,index)=>orderEscape(unit,index,'escape_spike_blast'));
      const neededDefuse=Math.max(0,DEFUSE_TIME-defuseProgress);if(defusing<0&&spikeRemaining<neededDefuse+.45)aliveDef().forEach((unit,index)=>orderEscape(unit,index,'defuse_time_impossible_save'));
      // Attackers keep the space they earned instead of rotating to defender anchor points.
      // A defender may tap or commit under pressure. Requiring every attacker
      // sightline to disappear made almost all planted rounds end in explosion.
      if(!retakeDefuserReleased&&retakeDefuser?.alive){
        const clearers=aliveDef().filter(unit=>unit!==retakeDefuser&&unit.retakeRole==='clear'),clearerReached=clearers.some(unit=>sdist(unit,plantAtSite)<18),siteContact=events.some(event=>event.type==='damage'&&event.t>=retakeStartedAt&&event.t>=t-1.5&&sdist(event,plantAtSite)<24),forcedByClock=spikeRemaining<=Math.max(DEFUSE_TIME+4,13);
        if(clearerReached||siteContact||!clearers.length||forcedByClock){retakeDefuserReleased=true;retakeDefuser.path=navRouteThrough([{x:retakeDefuser.x,y:retakeDefuser.y},plantAtSite]);retakeDefuser.seg=0;retakeDefuser.startDelay=Math.min(retakeDefuser.startDelay||t,t);recordAgentDecision(retakeDefuser,t,'objective',forcedByClock?'retake_defuser_clock_commit':'retake_defuser_released_after_clear',{destination:plantAtSite,alliesAlive:aliveDef().length,enemiesAlive:aliveAtk().length});events.push({t,type:'retakeDefuserRelease',player:retakeDefuser.name,site,reason:forcedByClock?'clock':'clearer_progress',clearersAlive:clearers.length,spikeRemaining:+spikeRemaining.toFixed(2)});}
      }
      const activeDefuser=defuserName&&unitByName.get(defuserName),releasedCandidate=retakeDefuserReleased&&retakeDefuser?.alive?retakeDefuser:null,onSpike=activeDefuser?.alive&&sdist(activeDefuser,plantAtSite)<5?activeDefuser:releasedCandidate||aliveDef().filter(unit=>unit.retakeRole!=='defuser').slice().sort((a,b)=>sdist(a,plantAtSite)-sdist(b,plantAtSite))[0];
      const atkWatch=aliveAtk().some(u=> sdist(u,plantAtSite)<24 && navLOS(u,plantAtSite));
      const onSpikeRange=onSpike&&sdist(onSpike,plantAtSite)<5,supportCount=onSpike?aliveDef().filter(unit=>unit!==onSpike&&sdist(unit,onSpike)<18).length:0;
      const canCommit=onSpikeRange&&spikeRemaining>=Math.max(0,DEFUSE_TIME-defuseProgress)+.15;
      if(canCommit){
        if(defusing<0){defusing=t;defuserName=onSpike.name;onSpike.isDefusing=true;lastDefuseTick=t;events.push({t,type:'defuseStart',defuser:onSpike.name,progress:+defuseProgress.toFixed(2),checkpoint:defuseCheckpoint,underPressure:atkWatch,supportCount,x:plantAtSite.x,y:plantAtSite.y});}
        else if(defuserName!==onSpike.name){const prior=unitByName.get(defuserName);if(prior)prior.isDefusing=false;events.push({t,type:'defuseStop',defuser:defuserName,progress:+defuseProgress.toFixed(2),checkpoint:defuseCheckpoint,reason:'defuser_changed',x:plantAtSite.x,y:plantAtSite.y});defusing=-1;defuserName=null;lastDefuseTick=null;defuseProgress=defuseCheckpoint;}
        else {defuseProgress=Math.min(DEFUSE_TIME,defuseProgress+Math.max(0,t-lastDefuseTick));lastDefuseTick=t;if(!defuseCheckpoint&&defuseProgress>=ROUND_TIMING.defuseHalfSeconds){defuseCheckpoint=ROUND_TIMING.defuseHalfSeconds;defuseProgress=Math.max(defuseProgress,defuseCheckpoint);events.push({t,type:'defuseHalf',defuser:defuserName,progress:defuseProgress,x:plantAtSite.x,y:plantAtSite.y});}if(defuseProgress>=DEFUSE_TIME){defused=true;events.push({t,type:'defuse',defuser:defuserName,progress:DEFUSE_TIME,x:plantAtSite.x,y:plantAtSite.y});events.push({t,type:'end',winner:defTeamKey});return spFin(defTeamKey,t);}}
      }else if(defusing>=0){const prior=unitByName.get(defuserName);if(prior)prior.isDefusing=false;events.push({t,type:'defuseStop',defuser:defuserName,progress:+defuseProgress.toFixed(2),checkpoint:defuseCheckpoint,reason:onSpikeRange?'unsafe_to_continue':'left_spike',x:plantAtSite.x,y:plantAtSite.y});defusing=-1;defuserName=null;lastDefuseTick=null;defuseProgress=defuseCheckpoint;}
    }
    if(aliveDef().length===0){events.push({t,type:'end',winner:atkTeamKey,reason:'defenders_eliminated'});return spFin(atkTeamKey,t);}
    if(aliveAtk().length===0 && !planted){ events.push({t,type:'end',winner:defTeamKey}); return spFin(defTeamKey,t); }
    if(planted && t-plantT>=SPIKE_TIME){const victims=[];for(const unit of allUnits.filter(candidate=>candidate.alive&&sdist(candidate,plantAtSite)<=SPIKE_BLAST_RADIUS)){unit.alive=false;unit.path=null;unit.hp=0;unit.shield=0;unit.deathT=t;victims.push(unit.name);events.push({t,type:'spikeExplosionDeath',victim:unit.name,side:unit.side,x:unit.x,y:unit.y,distance:+sdist(unit,plantAtSite).toFixed(2)});}events.push({t,type:'spikeExplode',x:plantAtSite.x,y:plantAtSite.y,radius:SPIKE_BLAST_RADIUS,victims});events.push({t,type:'end',winner:atkTeamKey,reason:'spike_exploded'});return spFin(atkTeamKey,t);}
    if(!planted&&t>=ROUND_TIME){events.push({t,type:'end',winner:defTeamKey,reason:'round_time'});return spFin(defTeamKey,t);}
  }
  events.push({t:MAXT,type:'end',winner:planted?atkTeamKey:defTeamKey});
  return spFin(planted?atkTeamKey:defTeamKey,MAXT);
  function spFin(winnerKey,t){
    atk.concat(def).forEach(u=>{ const tt=u.alive?t:(u.deathT!=null?u.deathT:t); const last=u.track[u.track.length-1];
      if(!last||last.t<tt) u.track.push({t:+tt.toFixed(2),x:+u.x.toFixed(2),y:+u.y.toFixed(2),f:Math.round(u.face),i:u.mind.intent}); });
    const units=atk.concat(def).map(u=>({side:u.side,idx:u.idx,name:u.name,track:u.track,decisionTimeline:u.mind.decisionTimeline,deathT:u.deathT,finalHP:u.hp,finalShield:u.shield,shieldType:u.shieldType,weapon:u.weapon,headshotRate:u.headshotRate,decisionProfile:{discipline:+u.mind.discipline.toFixed(1),awareness:+u.mind.awareness.toFixed(1),coordination:+u.mind.coordination.toFixed(1),aggression:+u.mind.aggression.toFixed(1),composure:+u.mind.composure.toFixed(1)},role:(u.side===atkTeamKey?'atk':'def')}));
    let clutch=null; if(clutchWho&&clutchWho.side===winnerKey)clutch={player:clutchWho.name,side:winnerKey,vs:clutchVs};
    const phaseSummary=summarizeRoundPhases({events,duration:t,winner:winnerKey,atkKey:atkTeamKey,defKey:defTeamKey,tacticalPlan,planted,defused});
    const preparation={phase:'PREPARATION',barrierReleasedAt:0,site,attackFormation:{id:initialFormationId,label:formationDefinition(initialFormationId).label,counts:form,definition:formationDefinition(initialFormationId)},defenseSetup:perSite,barriers:Object.values(G.barriers||{}),players:atk.concat(def).map(unit=>({player:unit.name,side:unit.side,role:unit.side===atkTeamKey?'attack':'defense',barrierId:unit.barrierId||null,from:unit.prepFrom,to:unit.prepTo,path:unit.prepPath||[unit.prepFrom,unit.prepTo].filter(Boolean)})),preplacedObjects:abilityObjects.filter(object=>object.placedAt<=0).map(object=>object.id)};
    return { winner:winnerKey, site, setup:perSite, hadInfo:hasInfo, hitWeaker:(site===weaker),preparation,
      planted, defused, duration:t,events,units,timing:{tickSeconds:TICK,roundSeconds:ROUND_TIME,plantSeconds:PLANT_TIME,spikeSeconds:SPIKE_TIME,defuseSeconds:DEFUSE_TIME,defuseHalfSeconds:ROUND_TIMING.defuseHalfSeconds,plantAt:plantT>=0?+plantT.toFixed(2):null,postPlantElapsed:plantT>=0?+Math.max(0,t-plantT).toFixed(2):null,defuseProgress:+defuseProgress.toFixed(2),defuseCheckpoint},teamIntel:Object.fromEntries(Object.entries(teamIntel).map(([key,value])=>[key,{site:value.site,confidence:+value.confidence.toFixed(2),lastUpdate:+value.lastUpdate.toFixed(2),source:value.source,timeline:value.timeline}])),teamCommunication:snapshotTeamCommunication(teamComms),executeCoordination:executePlanSnapshot(executePlan),defenseDecision:defenseDecisionSnapshot(defenseDecision),fb, clutch,
      phaseSummary,tradeSummary:{windows:tradeWindows.length,attempts:events.filter(e=>e.type==='kill'&&e.tradeAttempt).length,completed:events.filter(e=>e.type==='kill'&&e.traded).length,crossfireKills:events.filter(e=>e.type==='kill'&&e.crossfire).length},
      kills:events.filter(e=>e.type==='kill'),
      plantEv:events.find(e=>e.type==='plant')||null, defuseEv:events.find(e=>e.type==='defuse')||null,
      reconEv:events.find(e=>e.type==='recon')||null, utilEvs:events.filter(e=>e.type==='util'),abilityEvs:events.filter(e=>e.type==='ability'),abilityObjects,orbCaptures,orbMarkers:G.orbs||[] }; }
}
