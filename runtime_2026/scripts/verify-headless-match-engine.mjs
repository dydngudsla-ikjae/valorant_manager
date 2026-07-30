import { simulateMatch } from '../../src/core/match-engine.js';
import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { LEAGUES } from '../../src/data/leagues.js';

applyRealStats();
buildAgentPools();
const [home,away]=LEAGUES.AMER.teams;
const cases=[];
for(const bestOf of [1,3,5]){
  const seed=`headless-bo${bestOf}`;
  const first=simulateMatch({home,away,seed,bestOf});
  const replay=simulateMatch({home,away,seed,bestOf});
  const identical=JSON.stringify(first)===JSON.stringify(replay);
  const validScore=first.homeMaps===first.mapsToWin||first.awayMaps===first.mapsToWin;
  const hasRoundSeeds=first.mapResults.every(map=>map.rounds.every(round=>Number.isInteger(round.roundSeed)));
  const hasRatings=Object.values(first.box).every(player=>Number.isFinite(player.rating));
  cases.push({bestOf,identical,validScore,hasRoundSeeds,hasRatings,score:`${first.homeMaps}-${first.awayMaps}`,maps:first.mapResults.length,rounds:first.totalRounds});
}
console.log(JSON.stringify({cases},null,2));
if(cases.some(test=>!test.identical||!test.validScore||!test.hasRoundSeeds||!test.hasRatings))process.exitCode=1;
