import { compKitScore, counterEdge, kitOf } from './ratings.js';
import { AGENT_ROLE, ARCH, MAPDATA } from '../data/agents.js';
import { p } from '../data/leagues.js';
import { COMPOSITION_MODEL } from './simulation-model.js';
import { defaultPolicyForStance } from './tactics/tactical-policy.js';

export function roleCounts(team){const c={DUE:0,INI:0,SEN:0,CON:0,FLEX:0};team.roster.forEach(p=>c[p.role]++);return c;}

export function stanceSuit(team,stance){const c=roleCounts(team);
  if(stance==='AGGRO')   return c.DUE;
  if(stance==='LOCKDOWN') return c.SEN;
  if(stance==='CONTROL')  return c.CON + 0.5*c.INI;
  return 1.3; // balanced baseline (a hedge, not a default)
}

export function mapFit(stance,mapName){return (MAPDATA[mapName]&&MAPDATA[mapName].favor===stance)?6:0;}

const stanceDims={AGGRO:['en','le'],CONTROL:['in','co'],LOCKDOWN:['co','su','cl'],BALANCED:['en','in','co','su','cl','le']};
const agentEntry=(pl,entry,fav)=>({name:pl.name,role:entry.role||AGENT_ROLE[entry.agent]||pl.role,playerRole:pl.role,agent:entry.agent,mastery:entry.mastery,favored:fav.includes(entry.agent),roleFit:pl.prof?.[entry.role||AGENT_ROLE[entry.agent]||pl.role]??1});

export function evaluateComposition(team,mapName,stance,agents){
  const M=COMPOSITION_MODEL,counts={},seen=new Set(),violations=[];let duplicates=0;
  for(const agent of agents){counts[agent.role]=(counts[agent.role]||0)+1;if(seen.has(agent.agent))duplicates++;seen.add(agent.agent);}
  if(duplicates)violations.push({code:'duplicate_agent',count:duplicates,penalty:duplicates*M.penalties.duplicateAgent});
  for(const [role,label,penalty] of [['CON','missing_controller',M.penalties.missingController],['INI','missing_initiator',M.penalties.missingInitiator],['DUE','missing_duelist',M.penalties.missingDuelist],['SEN','missing_sentinel',M.penalties.missingSentinel]])if(!counts[role])violations.push({code:label,count:1,penalty});
  const avgMastery=agents.reduce((sum,a)=>sum+a.mastery,0)/agents.length;
  const favCount=agents.filter(a=>a.favored).length;
  const roleFit=agents.reduce((sum,a)=>sum+a.roleFit,0)/agents.length;
  const dims=stanceDims[stance]||stanceDims.BALANCED;
  const stanceKit=agents.reduce((sum,a)=>{const kit=kitOf(a.agent,a.role);return sum+dims.reduce((s,d)=>s+(kit[d]||0),0)/dims.length;},0)/agents.length;
  const penalty=violations.reduce((sum,item)=>sum+item.penalty,0);
  const score=(avgMastery-16)*M.weights.mastery+favCount*M.weights.mapFavored+(compKitScore(agents)-4.3)*M.weights.kitTotal+(roleFit-10)*M.weights.roleFit+(stanceKit-4.3)*M.weights.stanceKit-penalty;
  return {score,avgMastery:Math.round(avgMastery),favCount,roleFit:+roleFit.toFixed(2),stanceKit:+stanceKit.toFixed(2),penalty,violations,valid:duplicates===0};
}

function candidates(pl,mapName){
  const fav=MAPDATA[mapName]?.agents||[],limit=COMPOSITION_MODEL.candidateLimitPerPlayer;
  return [...pl.pool].sort((a,b)=>(b.mastery+(fav.includes(b.agent)?2:0))-(a.mastery+(fav.includes(a.agent)?2:0))).slice(0,limit).map(entry=>agentEntry(pl,entry,fav));
}

export function pickAgents(team,mapName,stance='BALANCED'){
  const pools=team.roster.map(pl=>candidates(pl,mapName));let best=null,bestScore=-Infinity;
  const walk=(index,chosen,used)=>{
    if(index===pools.length){const evaluation=evaluateComposition(team,mapName,stance,chosen);if(evaluation.score>bestScore){bestScore=evaluation.score;best=chosen.map(x=>({...x}));}return;}
    for(const candidate of pools[index]){if(used.has(candidate.agent))continue;used.add(candidate.agent);chosen.push(candidate);walk(index+1,chosen,used);chosen.pop();used.delete(candidate.agent);}
  };
  walk(0,[],new Set());
  if(best)return best;
  return team.roster.map((pl,index)=>candidates(pl,mapName)[index?0:0]);
}
// pure draft: choose a stance, assign agents, return the power delta it yields

export function draftComp(team,mapName,oppStance){
  let best=null,bestScore=-1e9;
  ['AGGRO','CONTROL','LOCKDOWN','BALANCED'].forEach(s=>{
    const suitBonus=(stanceSuit(team,s)-1.5)*3;
    const ce=(oppStance!=null)?counterEdge(s,oppStance)*1.2:0; // read the opponent when we can
    const agents=pickAgents(team,mapName,s),evaluation=evaluateComposition(team,mapName,s,agents);
    const score=suitBonus+mapFit(s,mapName)+ce+evaluation.score;
    if(score>bestScore){bestScore=score;best={stance:s,agents,evaluation};}
  });
  const delta=(stanceSuit(team,best.stance)-1.5)*3+mapFit(best.stance,mapName)+best.evaluation.score;
  return {stance:best.stance,agents:best.agents,...best.evaluation,delta:+delta.toFixed(2),tacticalPolicy:defaultPolicyForStance(best.stance)};
}
// build a comp for a SPECIFIC chosen stance with AUTO agents (used for previews)

export function buildCompForStance(team,mapName,stance){
  const agents=pickAgents(team,mapName,stance),evaluation=evaluateComposition(team,mapName,stance,agents);
  const delta=(stanceSuit(team,stance)-1.5)*3+mapFit(stance,mapName)+evaluation.score;
  return {stance,agents,...evaluation,delta:+delta.toFixed(2),tacticalPolicy:defaultPolicyForStance(stance)};
}
// build a comp from the player's EXPLICIT agent choices (per player name -> agent)

export function buildCompChoice(team,mapName,stance,choice){
  const fav=(MAPDATA[mapName]?MAPDATA[mapName].agents:[]);
  const agents=team.roster.map(pl=>{
    const wanted=choice&&choice[pl.name];
    const entry=pl.pool.find(x=>x.agent===wanted)||pl.pool[0];
    return agentEntry(pl,entry,fav);
  });
  const evaluation=evaluateComposition(team,mapName,stance,agents);
  const delta=(stanceSuit(team,stance)-1.5)*3+mapFit(stance,mapName)+evaluation.score;
  return {stance,agents,...evaluation,delta:+delta.toFixed(2),tacticalPolicy:defaultPolicyForStance(stance)};
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
