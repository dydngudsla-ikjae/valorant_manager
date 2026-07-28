import { playerOVR, seededPool } from './ratings.js';
import { AGENTS, AGENT_ROLE } from '../data/agents.js';
import { LEAGUES, primaryRole, secondaryRole } from '../data/leagues.js';
import STATS_BY_NAME from '../data/player-stats.json';

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
  Object.values(LEAGUES).forEach(L=>L.teams.forEach(t=>[...t.roster,...(t.bench||[])].forEach(pl=>{
    const s=STATS_BY_NAME[pl.name.toLowerCase()]; if(!s)return;
    pl.aim=s.aim; pl.sense=s.sense; pl.clutch=s.clutch; pl.util=s.util; pl.mental=s.mental;
    if(s.role) pl.role=s.role;
    if(typeof s.flex==="boolean") pl._flex=s.flex;
    if(s.prof) pl.prof=Object.assign({DUE:8,INI:8,SEN:8,CON:8},s.prof);
    if(s.pool&&s.pool.length){ pl.pool=s.pool.map(x=>({agent:x.agent,mastery:x.mastery,role:x.role})); pl._realpool=true; }
    pl._real=true;
  })));
}

export function buildAgentPools(){
  Object.values(LEAGUES).forEach(L=>L.teams.forEach(t=>[...t.roster,...(t.bench||[])].forEach(pl=>{
    if(pl._realpool)return;
    const ags=seededPool(pl.name, AGENTS[pl.role], 3);
    const base=Math.round(playerOVR(pl)/5); // ~12-20 on a 0-20 scale
    pl.pool=ags.map((a,i)=>({agent:a, mastery:Math.max(11,Math.min(20, base + (i===0?1:-i))), role:AGENT_ROLE[a]||pl.role}));
  })));
}
