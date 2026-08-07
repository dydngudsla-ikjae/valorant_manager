import { simulateMatch } from '../../src/core/match-engine.js';
import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { ATTRIBUTE_DEFS, playerOVR } from '../../src/core/ratings.js';
import { LEAGUES } from '../../src/data/leagues.js';

applyRealStats();
buildAgentPools();
const [sourceHome,sourceAway]=LEAGUES.AMER.teams;
const clone=value=>structuredClone(value);
function withAttribute(team,key,value){
  const copy=clone(team);
  copy.roster.forEach(player=>{player.attributes={...(player.attributes||{}),[key]:value};});
  return copy;
}
const cases=[];
for(const [key] of ATTRIBUTE_DEFS){
  let low=0,high=0;const pairedDeltas=[];
  for(let sample=0;sample<8;sample++){
    const seed=`attribute-${key}-${sample}`;
    const away=clone(sourceAway);
    const lowResult=simulateMatch({home:withAttribute(sourceHome,key,35),away:clone(away),seed,bestOf:1,maps:['Ascent'],homeStartsAttack:sample%2===0}).roundDifferential;
    const highResult=simulateMatch({home:withAttribute(sourceHome,key,95),away:clone(away),seed,bestOf:1,maps:['Ascent'],homeStartsAttack:sample%2===0}).roundDifferential;
    low+=lowResult;high+=highResult;pairedDeltas.push(highResult-lowResult);
  }
  const delta=(high-low)/8,variance=pairedDeltas.reduce((sum,value)=>sum+(value-delta)**2,0)/Math.max(1,pairedDeltas.length-1),standardError=Math.sqrt(variance/pairedDeltas.length);
  const lowTeam=withAttribute(sourceHome,key,35),highTeam=withAttribute(sourceHome,key,95),modelDelta=highTeam.roster.reduce((sum,player,index)=>sum+playerOVR(player)-playerOVR(lowTeam.roster[index]),0)/highTeam.roster.length;
  const modelConnected=modelDelta>0,statisticallyNonInferior=delta>=-1.96*standardError;
  cases.push({attribute:key,lowAverage:+(low/8).toFixed(3),highAverage:+(high/8).toFixed(3),delta:+delta.toFixed(3),standardError:+standardError.toFixed(3),modelDelta:+modelDelta.toFixed(3),modelConnected,statisticallyNonInferior,passed:modelConnected&&statisticallyNonInferior});
}
console.log(JSON.stringify({cases},null,2));
if(cases.some(test=>!test.passed))process.exitCode=1;
