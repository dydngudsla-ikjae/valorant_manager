import { playerOVR, seededPool } from './ratings.js';
import { AGENTS, AGENT_ROLE } from '../data/agents.js';
import { LEAGUES, primaryRole, secondaryRole } from '../data/leagues.js';
import RUNTIME_2026 from '../data/player-runtime-2026.json' with { type: 'json' };

const norm=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const registeredPlayers=team=>team.registered||[...team.roster,...(team.bench||[])];

export function selectAutomaticLineup(team){
  const players=registeredPlayers(team);
  if(players.length<5)throw new Error(`${team.name}: fewer than five registered players`);
  let best=null,bestScore=-Infinity;
  const roles=['DUE','INI','SEN','CON'];
  for(let a=0;a<players.length-4;a++)for(let b=a+1;b<players.length-3;b++)for(let c=b+1;c<players.length-2;c++)for(let d=c+1;d<players.length-1;d++)for(let e=d+1;e<players.length;e++){
    const lineup=[players[a],players[b],players[c],players[d],players[e]];
    const covered=new Set(lineup.map(primaryRole));
    const coverage=roles.reduce((sum,role)=>sum+(covered.has(role)?7:0),0);
    const score=lineup.reduce((sum,player)=>sum+playerOVR(player),0)+coverage;
    if(score>bestScore){bestScore=score;best=lineup;}
  }
  team.roster=best;
  return best;
}

export function visiblePool(pl,n){ n=n||4; const pool=(pl.pool||[]).slice(); if(!pool.length)return [];
  const roleOf=x=>x.role||'?'; const prim=primaryRole(pl);
  const pick=pool.slice(0,n);
  // roles to guarantee representation for: any real secondary (prof>=15) plus the displayed secondary (prof>=13)
  const want=new Set(); ['DUE','INI','SEN','CON'].forEach(r=>{ if(r!==prim&&pl.prof[r]>=15)want.add(r); });
  const sec=secondaryRole(pl); if(sec)want.add(sec);
  want.forEach(r=>{ if(!pick.some(x=>roleOf(x)===r)){ const a=pool.find(x=>roleOf(x)===r); if(a){ pick.pop(); pick.push(a); } } });
  return pick; }
// 0-20 proficiency bands: [min, label, color]

export function applyRealStats(){
  Object.entries(LEAGUES).forEach(([leagueId,L])=>L.teams.forEach(t=>registeredPlayers(t).forEach(pl=>{
    const s=RUNTIME_2026.players[`${leagueId}:${t.short}:${norm(pl.name)}`]; if(!s)return;
    Object.assign(pl,s.legacy);
    pl.playerId=s.playerId; pl.teamId=s.teamId; pl.role=s.primaryRole||pl.role;
    pl.attributes=s.appliedAttributes; pl.baseAttributes=s.baseAttributes; pl.season2026Attributes=s.season2026Attributes;
    pl.attributeReliability=s.attributeReliability; pl.tendencies=s.tendencies; pl.mapMastery=s.mapMastery;
    pl.combatProfile=s.combatProfile;
    pl.form=s.form; pl.sample2026=s.sample2026; pl.runtimeModel=RUNTIME_2026.modelVersion;
    pl.prof=Object.assign({DUE:1,INI:1,SEN:1,CON:1},Object.fromEntries(Object.entries(s.roleMastery||{}).map(([r,v])=>[r,v.gameProficiency])));
    pl.pool=(s.agentMastery||[]).filter(x=>x.role).map(x=>({agent:x.agent,mastery:x.gameMastery,role:x.role,readiness:x.readiness,reliability:x.reliability,usage2026:x.usage2026,lastObservedYear:x.lastObservedYear}));
    if(pl.pool.length)pl._realpool=true;
    pl._real=true;
  })));
  Object.values(LEAGUES).forEach(league=>league.teams.forEach(selectAutomaticLineup));
}

export function buildAgentPools(){
  Object.values(LEAGUES).forEach(L=>L.teams.forEach(t=>registeredPlayers(t).forEach(pl=>{
    if(pl._realpool)return;
    const ags=seededPool(pl.name, AGENTS[pl.role], 3);
    const base=Math.round(playerOVR(pl)/5); // ~12-20 on a 0-20 scale
    pl.pool=ags.map((a,i)=>({agent:a, mastery:Math.max(11,Math.min(20, base + (i===0?1:-i))), role:AGENT_ROLE[a]||pl.role}));
  })));
}
