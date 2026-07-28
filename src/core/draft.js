import { compKitScore, counterEdge } from './ratings.js';
import { ARCH, MAPDATA } from '../data/agents.js';
import { p } from '../data/leagues.js';

export function roleCounts(team){const c={DUE:0,INI:0,SEN:0,CON:0,FLEX:0};team.roster.forEach(p=>c[p.role]++);return c;}

export function stanceSuit(team,stance){const c=roleCounts(team);
  if(stance==='AGGRO')   return c.DUE;
  if(stance==='LOCKDOWN') return c.SEN;
  if(stance==='CONTROL')  return c.CON + 0.5*c.INI;
  return 1.3; // balanced baseline (a hedge, not a default)
}

export function mapFit(stance,mapName){return (MAPDATA[mapName]&&MAPDATA[mapName].favor===stance)?6:0;}

export function pickAgents(team,mapName){
  const fav=(MAPDATA[mapName]?MAPDATA[mapName].agents:[]);
  return team.roster.map(pl=>{
    let best=pl.pool[0];
    const inFav=pl.pool.filter(x=>fav.includes(x.agent)).sort((a,b)=>b.mastery-a.mastery);
    if(inFav.length && inFav[0].mastery>=best.mastery-2) best=inFav[0]; // prefer a comfy map agent
    return {name:pl.name, role:pl.role, agent:best.agent, mastery:best.mastery, favored:fav.includes(best.agent)};
  });
}
// pure draft: choose a stance, assign agents, return the power delta it yields

export function draftComp(team,mapName,oppStance){
  let bestStance=null,bestScore=-1e9;
  ['AGGRO','CONTROL','LOCKDOWN','BALANCED'].forEach(s=>{
    const suitBonus=(stanceSuit(team,s)-1.5)*3;
    const ce=(oppStance!=null)?counterEdge(s,oppStance)*1.2:0; // read the opponent when we can
    const score=suitBonus+mapFit(s,mapName)+ce;
    if(score>bestScore){bestScore=score;bestStance=s;}
  });
  const agents=pickAgents(team,mapName);
  const avgM=agents.reduce((s,a)=>s+a.mastery,0)/agents.length;
  const favCount=agents.filter(a=>a.favored).length;
  const delta=(stanceSuit(team,bestStance)-1.5)*3 + mapFit(bestStance,mapName) + (avgM-16)*1.3 + favCount*0.6 + (compKitScore(agents)-4.3)*0.8;
  return {stance:bestStance, agents, avgMastery:Math.round(avgM), favCount, delta:+delta.toFixed(2)};
}
// build a comp for a SPECIFIC chosen stance with AUTO agents (used for previews)

export function buildCompForStance(team,mapName,stance){
  const agents=pickAgents(team,mapName);
  const avgM=agents.reduce((s,a)=>s+a.mastery,0)/agents.length;
  const favCount=agents.filter(a=>a.favored).length;
  const delta=(stanceSuit(team,stance)-1.5)*3 + mapFit(stance,mapName) + (avgM-16)*1.3 + favCount*0.6 + (compKitScore(agents)-4.3)*0.8;
  return {stance, agents, avgMastery:Math.round(avgM), favCount, delta:+delta.toFixed(2)};
}
// build a comp from the player's EXPLICIT agent choices (per player name -> agent)

export function buildCompChoice(team,mapName,stance,choice){
  const fav=(MAPDATA[mapName]?MAPDATA[mapName].agents:[]);
  const agents=team.roster.map(pl=>{
    const wanted=choice&&choice[pl.name];
    const entry=pl.pool.find(x=>x.agent===wanted)||pl.pool[0];
    return {name:pl.name, role:pl.role, agent:entry.agent, mastery:entry.mastery, favored:fav.includes(entry.agent)};
  });
  const avgM=agents.reduce((s,a)=>s+a.mastery,0)/agents.length;
  const favCount=agents.filter(a=>a.favored).length;
  const delta=(stanceSuit(team,stance)-1.5)*3 + mapFit(stance,mapName) + (avgM-16)*1.3 + favCount*0.6 + (compKitScore(agents)-4.3)*0.8;
  return {stance, agents, avgMastery:Math.round(avgM), favCount, delta:+delta.toFixed(2)};
}
// away drafts on map+roster; home gets last-pick info and drafts to counter

export function draftPair(home,away,mapName){
  const ad=draftComp(away,mapName,null);
  const hd=draftComp(home,mapName,ad.stance);
  return {home:hd, away:ad, edge:counterEdge(hd.stance,ad.stance), mapName};
}

export function matchupRead(cc,hShort,aShort){
  if(cc.edge>0) return `${hShort} ${ARCH[cc.home.stance].name} counters ${ARCH[cc.away.stance].name}`;
  if(cc.edge<0) return `${aShort} ${ARCH[cc.away.stance].name} counters ${ARCH[cc.home.stance].name}`;
  if(cc.home.stance===cc.away.stance) return `Mirror — ${ARCH[cc.home.stance].name} both sides`;
  return `${ARCH[cc.home.stance].name} vs ${ARCH[cc.away.stance].name} — even read`;
}

/* ---- global state ---- */

export function mapSuitFor(team,map){return stanceSuit(team, MAPDATA[map].favor);}

export function autoAgentFor(pl,map){
  const fav=(MAPDATA[map]?MAPDATA[map].agents:[]);
  let best=pl.pool[0];
  const inFav=pl.pool.filter(x=>fav.includes(x.agent)).sort((a,b)=>b.mastery-a.mastery);
  if(inFav.length && inFav[0].mastery>=best.mastery-8) best=inFav[0];
  return best.agent;
}
