import { MATCH } from './state.js';
import { GEO_ASCENT, MAPGEO } from '../data/geo/ascent.js';
import { p } from '../data/leagues.js';
import NAVGRID from '../data/geo/ascent-navgrid.json';

export function curGeo(){ return (MATCH&&MATCH.mapPool&&MAPGEO[MATCH.mapPool[MATCH.curMap]])||GEO_ASCENT; }
/* ===== NAV GRID (walkable mask from the real map): pathfinding + line-of-sight ===== */

export function navOpenCell(cx,cy){ if(cx<0||cy<0||cx>=NAVGRID.w||cy>=NAVGRID.h)return false; return NAVGRID.cells[cy*NAVGRID.w+cx]==='1'; }

export function navToCell(x,y){ return [Math.max(0,Math.min(NAVGRID.w-1,Math.floor(x/100*NAVGRID.w))), Math.max(0,Math.min(NAVGRID.h-1,Math.floor(y/100*NAVGRID.h)))]; }

export function navCellPct(cx,cy){ return {x:(cx+0.5)/NAVGRID.w*100, y:(cy+0.5)/NAVGRID.h*100}; }

export function navOpenNear(cx,cy){ if(navOpenCell(cx,cy))return[cx,cy]; const seen=new Set([cx+','+cy]); let q=[[cx,cy]];
  const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]];
  while(q.length){ const [x,y]=q.shift(); for(const [dx,dy] of dirs){ const nx=x+dx,ny=y+dy,k=nx+','+ny;
    if(nx<0||ny<0||nx>=NAVGRID.w||ny>=NAVGRID.h||seen.has(k))continue; if(navOpenCell(nx,ny))return[nx,ny]; seen.add(k); q.push([nx,ny]); } }
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
  const key=ax.toFixed(1)+','+ay.toFixed(1)+'>'+bx.toFixed(1)+','+by.toFixed(1);
  if(_navCache[key])return _navCache[key];
  const a=navOpenNear(...navToCell(ax,ay)), b=navOpenNear(...navToCell(bx,by));
  const W=NAVGRID.w,ok=(x,y)=>navOpenCell(x,y);
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

export function spPickSetup(){ const tot=SP_SETUPS.reduce((s,x)=>s+x.w,0); let r=Math.random()*tot; for(const s of SP_SETUPS){ if((r-=s.w)<=0)return s; } return SP_SETUPS[0]; }
// home/away rosters; opts:{atkTeamKey,defTeamKey,teamGap,ratingOf,reconStrength,utilStrength,isPistol}

export function spatialRound(home,away,opts){
  const G=GEO_ASCENT;
  const {atkTeamKey,defTeamKey,teamGap,ratingOf,reconStrength=0.5,utilStrength=0.5,isPistol=false}=opts;
  const atkTeam=atkTeamKey==='home'?home:away, defTeam=defTeamKey==='home'?home:away;
  const TICK=0.1,MAXT=100,SPEED=5.5,SIGHT=16;
  const setup=opts.setup||spPickSetup(); const perSite={A:setup.A,B:setup.B,mid:setup.mid};
  const effA=perSite.A+perSite.mid*0.5, effB=perSite.B+perSite.mid*0.5;
  const weaker=effA<effB?'A':(effB<effA?'B':(Math.random()<0.5?'A':'B'));
  const infoP=SP_TUNE.reconBase+SP_TUNE.reconGain*reconStrength;
  const hasInfo=Math.random()<infoP;
  const site=opts.forceSite||(hasInfo?weaker:(Math.random()<0.5?'A':'B'));
  const mk=(team,key,idx)=>({name:team.roster[idx].name,side:key,idx,alive:true,x:0,y:0,path:null,seg:0,r:ratingOf(team.roster[idx],key),startDelay:0,zone:null,track:[],deathT:null,role:null,carrier:false,face:0,hold:null,joined:false});
  const atk=atkTeam.roster.map((_,i)=>mk(atkTeam,atkTeamKey,i));
  const def=defTeam.roster.map((_,i)=>mk(defTeam,defTeamKey,i));
  const snap=p=>{const c=navOpenNear(...navToCell(p.x,p.y));return navCellPct(c[0],c[1]);};
  // defenders spawn at defender spawn and DEPLOY out to (slightly randomized) holds
  const dsp=snap(G.pts.defSpawn);
  const jit=p=>snap({x:p.x+(Math.random()*6-3),y:p.y+(Math.random()*6-3)});
  const aH=G.siteHolds('A').map(jit),bH=G.siteHolds('B').map(jit),mH=G.midHolds().map(jit); let di=0;
  const deploy=(u,hold,zone)=>{ const s2=snap({x:dsp.x+(Math.random()*8-4),y:dsp.y+(Math.random()*4-2)}); u.x=s2.x;u.y=s2.y; u.zone=zone; u.hold=hold; u.path=navRouteThrough([{x:u.x,y:u.y},hold]); u.seg=0; u.startDelay=Math.random()*0.3; u.face=Math.atan2(hold.y-u.y,hold.x-u.x)*180/Math.PI; };
  for(let k=0;k<perSite.A;k++){ deploy(def[di++],aH[k%aH.length],'A'); }
  for(let k=0;k<perSite.mid;k++){ deploy(def[di++],mH[k%mH.length],'mid'); }
  for(let k=0;k<perSite.B;k++){ deploy(def[di++],bH[k%bH.length],'B'); }
  const spawnC=snap(G.atkSpawn[1]);
  const other=site==='A'?'B':'A';
  // attacker formation: main+mid commit to the target, a lurk works the other side (cut backups / take empty)
  const FORMS=[{lurk:1,mid:1,main:3,w:4},{lurk:1,mid:0,main:4,w:2},{lurk:0,mid:2,main:3,w:2},{lurk:1,mid:2,main:2,w:2},{lurk:2,mid:1,main:2,w:1}];
  const form=(()=>{const tot=FORMS.reduce((s,x)=>s+x.w,0);let r=Math.random()*tot;for(const f of FORMS){if((r-=f.w)<=0)return f;}return FORMS[0];})();
  const mainPath=navRouteThrough([spawnC].concat(G.routeMain(site)));
  const midPath =navRouteThrough([spawnC].concat(G.routeMid(site)));
  const lurkPath=navRouteThrough([spawnC].concat(G.routeMain(other)));
  let ai=0;
  for(let k=0;k<form.main&&ai<5;k++){const u=atk[ai++];u.role='main';u.path=mainPath.slice();}
  for(let k=0;k<form.mid&&ai<5;k++){const u=atk[ai++];u.role='mid';u.path=midPath.slice();}
  for(let k=0;k<form.lurk&&ai<5;k++){const u=atk[ai++];u.role='lurk';u.path=lurkPath.slice();}
  while(ai<5){const u=atk[ai++];u.role='main';u.path=mainPath.slice();}
  atk.forEach((u,i)=>{const p=snap(G.atkSpawn[i]);u.x=p.x;u.y=p.y;u.seg=0;u.startDelay=i*0.4+(u.role==='lurk'?0.8:0);});
  const mains=atk.filter(u=>u.role==='main'); let spikeCarrier=(mains[mains.length-1]||atk[0]); spikeCarrier.carrier=true;
  const pzc=G.plantZone(site); const plantAtSite=snap({x:pzc.x,y:pzc.y});
  const events=[]; let planted=false,plantT=-1,defused=false,contact=false,utilAt=-1;
  let spikeDropped=null, planting=-1, retriever=null; const PLANT_TIME=4, DEFUSE_TIME=4, SPIKE_TIME=22; let defusing=-1, defuserName=null;
  const aliveAtk=()=>atk.filter(u=>u.alive), aliveDef=()=>def.filter(u=>u.alive);
  if(hasInfo) events.push({t:1.0,type:'recon',x:plantAtSite.x,y:plantAtSite.y,site});
  function moveUnit(u,t){ if(!u.alive)return; if(u.startDelay&&t<u.startDelay)return; if(!u.path||u.seg>=u.path.length)return;
    const w=u.path[u.seg],d=sdist(u,w),step=SPEED*TICK; if(d>0.001)u.face=Math.atan2(w.y-u.y,w.x-u.x)*180/Math.PI;
    if(d<=step){u.x=w.x;u.y=w.y;u.seg++;} else {u.x+=(w.x-u.x)/d*step;u.y+=(w.y-u.y)/d*step;} }
  function utilActive(t){ return utilAt>=0&&(t-utilAt)<SP_TUNE.utilWindow; }
  let fb=null, clutchWho=null, clutchVs=0;
  function tryDuel(t){
    let best=null,bd=SIGHT; aliveAtk().forEach(A=>aliveDef().forEach(D=>{ if(!navLOS(A,D))return; const d=sdist(A,D); if(d<bd){bd=d;best=[A,D];}}));
    if(!best)return; contact=true; const [A,D]=best;
    A.face=Math.atan2(D.y-A.y,D.x-A.x)*180/Math.PI; D.face=Math.atan2(A.y-D.y,A.x-D.x)*180/Math.PI;
    const aHold=(!A.path||A.seg>=A.path.length), dHold=(!D.path||D.seg>=D.path.length);
    let holdD=dHold?SP_TUNE.holdBonus:0; if(utilActive(t)&&!planted) holdD*=(1-SP_TUNE.utilSuppress*utilStrength);
    const holdA=aHold?SP_TUNE.holdBonus:0;
    const execTerm=planted?0:SP_TUNE.execBonus;
    const teamAdj=(atkTeamKey==='home'?teamGap:-teamGap)*SP_TUNE.gapMul;
    const scale=isPistol?(SP_TUNE.scale*1.7):SP_TUNE.scale;
    const exponent=((A.r-D.r)+teamAdj+execTerm+holdA-holdD)/scale;
    const atkWins=Math.random()<1/(1+Math.pow(10,-exponent));
    const winner=atkWins?A:D, loser=atkWins?D:A;
    loser.alive=false; loser.path=null; loser.deathT=t;
    if(loser===spikeCarrier){ spikeDropped={x:loser.x,y:loser.y}; spikeCarrier=null; planting=-1;
      events.push({t,type:'spikeDrop',x:loser.x,y:loser.y});
      aliveDef().forEach(u=>{u.path=navRouteThrough([{x:u.x,y:u.y},spikeDropped]);u.seg=0;}); }
    const assist=Math.random()<.32?(function(){const mates=(winner.side===atkTeamKey?aliveAtk():aliveDef()).filter(u=>u!==winner); return mates.length?mates[Math.floor(Math.random()*mates.length)].name:null;})():null;
    if(!fb)fb={killer:winner.name,victim:loser.name,side:winner.side};
    events.push({t,type:'kill',killer:winner.name,victim:loser.name,side:winner.side,x:loser.x,y:loser.y,fb:events.filter(e=>e.type==='kill').length===0,assist});
    if(!clutchWho){ if(aliveAtk().length===1&&aliveDef().length>=2){clutchWho=aliveAtk()[0];clutchVs=aliveDef().length;}
      else if(aliveDef().length===1&&aliveAtk().length>=2){clutchWho=aliveDef()[0];clutchVs=aliveAtk().length;} }
  }
  for(let step=0,t=0; step<MAXT/TICK; step++, t+=TICK){
    atk.forEach(u=>moveUnit(u,t)); def.forEach(u=>moveUnit(u,t));
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
    tryDuel(t);
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
          aliveDef().forEach(u=>{u.path=navRouteThrough([{x:u.x,y:u.y},plantAtSite]);u.seg=0;}); } }
    } else if(planted){
      // RETAKE: defenders push onto the spike; attackers hold angles on it (stationary = advantage)
      if(step%8===0){ aliveDef().forEach(u=>{ if(!u.path||u.seg>=u.path.length){ if(sdist(u,plantAtSite)>4){u.path=navRouteThrough([{x:u.x,y:u.y},plantAtSite]);u.seg=0;} } }); }
      if(step%12===0){ aliveAtk().forEach((u,ix)=>{ if(!u.path||u.seg>=u.path.length){ const hp=G.siteHolds(site)[ix%3]; if(hp&&sdist(u,hp)>3){u.path=navRouteThrough([{x:u.x,y:u.y},snap(hp)]);u.seg=0;} } }); }
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
  }
  events.push({t:MAXT,type:'end',winner:planted?atkTeamKey:defTeamKey});
  return spFin(planted?atkTeamKey:defTeamKey,MAXT);
  function spFin(winnerKey,t){
    atk.concat(def).forEach(u=>{ const tt=u.alive?t:(u.deathT!=null?u.deathT:t); const last=u.track[u.track.length-1];
      if(!last||last.t<tt) u.track.push({t:+tt.toFixed(2),x:+u.x.toFixed(2),y:+u.y.toFixed(2),f:Math.round(u.face)}); });
    const units=atk.concat(def).map(u=>({side:u.side,idx:u.idx,name:u.name,track:u.track,deathT:u.deathT,role:(u.side===atkTeamKey?'atk':'def')}));
    let clutch=null; if(clutchWho&&clutchWho.side===winnerKey)clutch={player:clutchWho.name,side:winnerKey,vs:clutchVs};
    return { winner:winnerKey, site, setup:perSite, hadInfo:hasInfo, hitWeaker:(site===weaker),
      planted, defused, duration:t, events, units, fb, clutch,
      kills:events.filter(e=>e.type==='kill'),
      plantEv:events.find(e=>e.type==='plant')||null, defuseEv:events.find(e=>e.type==='defuse')||null,
      reconEv:events.find(e=>e.type==='recon')||null, utilEvs:events.filter(e=>e.type==='util') }; }
}
