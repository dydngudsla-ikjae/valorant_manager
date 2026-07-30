import { simulateMatch } from '../../src/core/match-engine.js';
import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { LEAGUES, MAPS } from '../../src/data/leagues.js';
import { selectAttackTactic } from '../../src/core/tactics/tactic-selector.js';
import { withSeed } from '../../src/core/rng.js';
import { defaultTacticalPolicy } from '../../src/core/tactics/tactical-policy.js';

applyRealStats();buildAgentPools();
const [sourceHome,sourceAway]=LEAGUES.EMEA.teams;
const attackTypes=new Set(),defenseTypes=new Set(),failures=[];
let roundsChecked=0;
for(let sample=0;sample<4;sample++){
  const map=MAPS[sample%MAPS.length];
  const result=simulateMatch({home:structuredClone(sourceHome),away:structuredClone(sourceAway),seed:`tactics-${sample}`,bestOf:1,maps:[map],homeStartsAttack:sample%2===0});
  for(const round of result.mapResults[0].rounds){
    roundsChecked++;
    const plan=round.tactics;
    if(!plan){failures.push({round:round.n,reason:'missing_plan'});continue;}
    attackTypes.add(plan.attack.type);defenseTypes.add(plan.defense.type);
    const formationTotal=Object.values(plan.attack.formation).reduce((a,b)=>a+b,0);
    const setupTotal=Object.values(plan.defense.setup).reduce((a,b)=>a+b,0);
    if(formationTotal!==5)failures.push({round:round.n,reason:'formation_total',value:formationTotal});
    if(setupTotal!==5)failures.push({round:round.n,reason:'setup_total',value:setupTotal});
    if(!Number.isFinite(plan.edge)||!Number.isFinite(plan.attack.quality)||!Number.isFinite(plan.defense.quality))failures.push({round:round.n,reason:'invalid_quality'});
  }
}

function tacticalVariant(value){
  const team=structuredClone(sourceHome);
  team.roster.forEach(player=>{player.attributes={...player.attributes,tactical:value,teamplay:value,adaptability:value,positioning:value};});
  return team;
}
let lowQuality=0,highQuality=0;
for(let sample=0;sample<20;sample++){
  const args={buy:'full',isPistol:false,scoreDiff:0,adaptation:{changePressure:.5,failedStreak:1},stance:'CONTROL',utilityStrength:.7};
  lowQuality+=withSeed(`tactic-low-${sample}`,()=>selectAttackTactic({...args,team:tacticalVariant(35)}).quality);
  highQuality+=withSeed(`tactic-high-${sample}`,()=>selectAttackTactic({...args,team:tacticalVariant(90)}).quality);
}
lowQuality/=20;highQuality/=20;
const diversity=attackTypes.size>=4&&defenseTypes.size>=4;
const sensitivity=highQuality>lowQuality;
const policyArgs={team:structuredClone(sourceHome),buy:'full',isPistol:false,scoreDiff:0,adaptation:{changePressure:.3,failedStreak:0},stance:'BALANCED',utilityStrength:.5};
const auto=withSeed('policy-score',()=>selectAttackTactic({...policyArgs,policy:defaultTacticalPolicy()}));
const focusedPolicy={...defaultTacticalPolicy(),attackFocus:'RUSH'};
const focused=withSeed('policy-score',()=>selectAttackTactic({...policyArgs,policy:focusedPolicy}));
const focusBias=+(focused.scores.RUSH-auto.scores.RUSH).toFixed(2),policyPassed=focusBias>=8&&focused.policy.attackFocus==='RUSH';
console.log(JSON.stringify({roundsChecked,attackTypes:[...attackTypes],defenseTypes:[...defenseTypes],diversity,qualitySensitivity:{low:+lowQuality.toFixed(2),high:+highQuality.toFixed(2),passed:sensitivity},coachPolicy:{rushBias:focusBias,passed:policyPassed},failures},null,2));
if(failures.length||!diversity||!sensitivity||!policyPassed)process.exitCode=1;
