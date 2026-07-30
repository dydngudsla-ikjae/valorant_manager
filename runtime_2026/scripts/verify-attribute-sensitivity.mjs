import { simulateMatch } from '../../src/core/match-engine.js';
import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { ATTRIBUTE_DEFS } from '../../src/core/ratings.js';
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
  let low=0,high=0;
  for(let sample=0;sample<8;sample++){
    const seed=`attribute-${key}-${sample}`;
    const away=clone(sourceAway);
    low+=simulateMatch({home:withAttribute(sourceHome,key,35),away:clone(away),seed,bestOf:1,maps:['Ascent'],homeStartsAttack:sample%2===0}).roundDifferential;
    high+=simulateMatch({home:withAttribute(sourceHome,key,95),away:clone(away),seed,bestOf:1,maps:['Ascent'],homeStartsAttack:sample%2===0}).roundDifferential;
  }
  cases.push({attribute:key,lowAverage:+(low/8).toFixed(3),highAverage:+(high/8).toFixed(3),delta:+((high-low)/8).toFixed(3),passed:high>low});
}
console.log(JSON.stringify({cases},null,2));
if(cases.some(test=>!test.passed))process.exitCode=1;
