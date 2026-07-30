import { simulateMatch } from '../../src/core/match-engine.js';
import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { LEAGUES } from '../../src/data/leagues.js';

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
  let low=0,high=0;
  for(let sample=0;sample<8;sample++){
    const args={away:clone(sourceAway),seed:`experience-${kind}-${sample}`,bestOf:1,maps:['Ascent'],homeStartsAttack:sample%2===0};
    low+=simulateMatch({...args,home:variant(kind,false)}).roundDifferential;
    high+=simulateMatch({...args,home:variant(kind,true)}).roundDifferential;
  }
  cases.push({kind,lowAverage:+(low/8).toFixed(3),highAverage:+(high/8).toFixed(3),delta:+((high-low)/8).toFixed(3),passed:high>low});
}
console.log(JSON.stringify({cases},null,2));
if(cases.some(test=>!test.passed))process.exitCode=1;
