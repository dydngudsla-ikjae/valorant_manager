import { AGENTS, AGENT_KITS, BEATS, KIT_DEFAULT } from '../data/agents.js';
import { ROLE, p } from '../data/leagues.js';

export function playerOVR(pl){const w=ROLE[pl.role].w;
  return Math.round(pl.aim*w.aim+pl.sense*w.sense+pl.clutch*w.clutch+pl.util*w.util+pl.mental*w.mental);}

export function teamOVR(t){return Math.round(t.roster.reduce((s,p)=>s+playerOVR(p),0)/t.roster.length);}

export function teamAxis(t,axis){return t.roster.reduce((s,p)=>s+p[axis],0)/t.roster.length;}

/* ============================================================
   PHASE 1 — AGENTS · COMPS · COUNTERS · MAP CONTEXT
   Draft now swings the round math, and it's shown on screen.
   ============================================================ */

export function kitOf(agent,role){const k=AGENT_KITS[agent]; if(k)return k;
  const d=KIT_DEFAULT[role]||KIT_DEFAULT.DUE; return {...d,ab:[agent,'Ability','Ability','Ultimate']};}

export function kitTotal(k){return k.en+k.in+k.co+k.su+k.cl+k.le;}

export function compKitScore(agentList){ // agentList: [{agent,role}] avg per-agent kit total /6
  const avg=agentList.reduce((s,a)=>s+kitTotal(kitOf(a.agent,a.role)),0)/agentList.length/6;
  return avg;
}
// Tactical stances. Triangle: AGGRO > CONTROL > LOCKDOWN > AGGRO. BALANCED neutral.

export function counterEdge(a,b){ // + => stance a has the edge over b, in power points
  if(a===b) return 0;
  if(BEATS[a]===b) return 6;
  if(BEATS[b]===a) return -6;
  // committing to a real stance slightly beats hedging with Balanced
  if(a==='BALANCED' && b!=='BALANCED') return -2;
  if(b==='BALANCED' && a!=='BALANCED') return 2;
  return 0;
}
// Each map favors a stance and rewards certain agents (map-comfort).

export function seededPool(name, arr, n){
  let h=2166136261>>>0; for(const c of name){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}
  const idx=[...arr.keys()];
  for(let i=idx.length-1;i>0;i--){h=(Math.imul(h,1103515245)+12345)>>>0;const j=h%(i+1);[idx[i],idx[j]]=[idx[j],idx[i]];}
  return idx.slice(0,n).map(i=>arr[i]);
}
