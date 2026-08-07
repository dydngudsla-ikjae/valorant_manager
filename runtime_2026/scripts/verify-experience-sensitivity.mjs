import { simulateMatch } from '../../src/core/match-engine.js';
import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { LEAGUES } from '../../src/data/leagues.js';
import { draftPair } from '../../src/core/draft.js';
import { experienceModifier } from '../../src/core/simulation-model.js';

applyRealStats();buildAgentPools();
const [sourceHome,sourceAway]=LEAGUES.AMER.teams,clone=structuredClone;
function variant(kind,high){
  const team=clone(sourceHome),value=high?95:35;
  for(const player of team.roster){
    if(kind==='role')for(const role of Object.keys(player.prof))player.prof[role]=high?20:3;
    if(kind==='agent')player.pool=player.pool.map(agent=>({...agent,mastery:high?20:5,reliability:1}));
    if(kind==='map')player.mapMastery={...(player.mapMastery||{}),ascent:{value,reliability:1}};
    if(kind==='tendency')player.tendencies={...(player.tendencies||{}),aggression:value,entryFrequency:value,entrySuccess:value,riskPreference:50,agentSpecialization:value,roleFlexibility:value};
  }
  return team;
}
const cases=[];
for(const kind of ['role','agent','map','tendency']){
  let low=0,high=0;const pairedDeltas=[];
  for(let sample=0;sample<8;sample++){
    const args={away:clone(sourceAway),seed:`experience-${kind}-${sample}`,bestOf:1,maps:['Ascent'],homeStartsAttack:sample%2===0};
    const lowResult=simulateMatch({...args,home:variant(kind,false)}).roundDifferential,highResult=simulateMatch({...args,home:variant(kind,true)}).roundDifferential;
    low+=lowResult;high+=highResult;pairedDeltas.push(highResult-lowResult);
  }
  const delta=(high-low)/8,variance=pairedDeltas.reduce((sum,value)=>sum+(value-delta)**2,0)/Math.max(1,pairedDeltas.length-1),standardError=Math.sqrt(variance/pairedDeltas.length),lowTeam=variant(kind,false),highTeam=variant(kind,true),lowDraft=draftPair(lowTeam,clone(sourceAway),'Ascent'),highDraft=draftPair(highTeam,clone(sourceAway),'Ascent');
  const modifierAverage=(team,draft)=>team.roster.reduce((sum,player)=>sum+experienceModifier(player,{agent:draft.home.agents.find(entry=>entry.name===player.name)?.agent,map:'Ascent',opening:true,attacking:true}),0)/team.roster.length;
  const modelDelta=(highDraft.home.delta-lowDraft.home.delta)+(modifierAverage(highTeam,highDraft)-modifierAverage(lowTeam,lowDraft)),modelConnected=modelDelta>0,statisticallyNonInferior=delta>=-1.96*standardError;
  cases.push({kind,lowAverage:+(low/8).toFixed(3),highAverage:+(high/8).toFixed(3),delta:+delta.toFixed(3),standardError:+standardError.toFixed(3),modelDelta:+modelDelta.toFixed(3),modelConnected,statisticallyNonInferior,passed:modelConnected&&statisticallyNonInferior});
}
console.log(JSON.stringify({cases},null,2));
if(cases.some(test=>!test.passed))process.exitCode=1;
