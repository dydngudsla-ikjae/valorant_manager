import { AGENTS, AGENT_KITS, BEATS, KIT_DEFAULT } from '../data/agents.js';
import { ROLE, p } from '../data/leagues.js';

export const ATTRIBUTE_DEFS = [
  ['firepower','Firepower'], ['combatEfficiency','Combat efficiency'], ['entry','Entry'],
  ['positioning','Positioning'], ['teamplay','Teamplay'], ['tactical','Tactical'],
  ['clutch','Clutch'], ['explosiveness','Explosiveness'], ['consistency','Consistency'],
  ['adaptability','Adaptability'], ['pressure','Pressure']
];
export const CORE_ATTRIBUTE_KEYS=['firepower','combatEfficiency','positioning','tactical','clutch'];
const OVR_WEIGHTS={
  DUE:{firepower:.22,combatEfficiency:.16,entry:.18,positioning:.07,teamplay:.04,tactical:.04,clutch:.08,explosiveness:.10,consistency:.04,adaptability:.03,pressure:.04},
  INI:{firepower:.10,combatEfficiency:.10,entry:.06,positioning:.11,teamplay:.15,tactical:.17,clutch:.05,explosiveness:.04,consistency:.08,adaptability:.08,pressure:.06},
  SEN:{firepower:.10,combatEfficiency:.12,entry:.04,positioning:.17,teamplay:.11,tactical:.14,clutch:.10,explosiveness:.03,consistency:.09,adaptability:.05,pressure:.05},
  CON:{firepower:.08,combatEfficiency:.10,entry:.03,positioning:.16,teamplay:.15,tactical:.18,clutch:.07,explosiveness:.03,consistency:.09,adaptability:.06,pressure:.05},
  FLEX:{firepower:.12,combatEfficiency:.12,entry:.08,positioning:.12,teamplay:.10,tactical:.12,clutch:.08,explosiveness:.06,consistency:.07,adaptability:.08,pressure:.05}
};
const LEGACY_FALLBACK={firepower:'aim',combatEfficiency:'aim',entry:'aim',positioning:'sense',teamplay:'util',tactical:'util',clutch:'clutch',explosiveness:'aim',consistency:'mental',adaptability:'sense',pressure:'mental'};
export function playerAttribute(pl,key){return pl.attributes?.[key] ?? pl[LEGACY_FALLBACK[key]] ?? 60;}
export const ROLE_FIT_PERCENT=[55,58,61,64,67,70,73,76,79,82,85,87,89,91,93,95,97,98,99,100];
export function roleFitPercent(pl,role){const proficiency=Math.max(1,Math.min(20,Math.round(pl.prof?.[role]??1)));return ROLE_FIT_PERCENT[proficiency-1];}
export function playerRoleAbilityOVR(pl,role){const w=OVR_WEIGHTS[role]||OVR_WEIGHTS.FLEX;
  return Math.round(Object.entries(w).reduce((sum,[key,weight])=>sum+playerAttribute(pl,key)*weight,0));}
export function playerRoleOVR(pl,role){return Math.round(playerRoleAbilityOVR(pl,role)*roleFitPercent(pl,role)/100);}
export function playerOVR(pl){return playerRoleOVR(pl,pl.role);}

export function teamOVR(t){return Math.round(t.roster.reduce((s,p)=>s+playerOVR(p),0)/t.roster.length);}

export function teamAxis(t,axis){return t.roster.reduce((s,p)=>s+playerAttribute(p,axis),0)/t.roster.length;}

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
