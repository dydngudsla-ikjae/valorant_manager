import { matchFormat, vetoOrder } from '../../src/core/match-format.js';
import { quickSim } from '../../src/core/season.js';
import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { LEAGUES } from '../../src/data/leagues.js';

applyRealStats();buildAgentPools();const [home,away]=LEAGUES.AMER.teams;
const cases=[];
for(const bestOf of [1,3,5]){
  const format=matchFormat(bestOf),order=vetoOrder(bestOf,'home'),bans=order.filter(([,action])=>action==='ban').length,picks=order.filter(([,action])=>action==='pick').length;
  const mapsAfterVeto=picks+1,result=quickSim(home,away,`format-bo${bestOf}`,bestOf);
  const scoreValid=result.h===format.mapsToWin||result.a===format.mapsToWin;
  const passed=order.length===6&&bans+picks===6&&mapsAfterVeto===bestOf&&scoreValid;
  cases.push({bestOf,label:format.label,mapsToWin:format.mapsToWin,bans,picks,mapsAfterVeto,score:`${result.h}-${result.a}`,passed});
}
console.log(JSON.stringify({cases},null,2));
if(cases.some(test=>!test.passed))process.exitCode=1;
