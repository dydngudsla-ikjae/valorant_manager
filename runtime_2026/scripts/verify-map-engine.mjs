import { simulateMatch } from '../../src/core/match-engine.js';
import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { LEAGUES, MAPS } from '../../src/data/leagues.js';
import { MAPGEO } from '../../src/data/geo/maps.js';

applyRealStats();
buildAgentPools();
const [home,away]=LEAGUES.PAC.teams;
const cases=[];

for(const map of MAPS){
  const result=simulateMatch({home,away,seed:`map-check-${map}`,bestOf:1,maps:[map]});
  const rounds=result.mapResults[0].rounds;
  const tracks=rounds.flatMap(round=>round.spatial?.units||[]).flatMap(unit=>unit.track||[]);
  const validCoordinates=tracks.length>0&&tracks.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100);
  const validSites=rounds.every(round=>MAPGEO[map].siteNames.includes(round.site));
  cases.push({map,sites:MAPGEO[map].siteNames,score:`${result.mapResults[0].homeRounds}-${result.mapResults[0].awayRounds}`,rounds:rounds.length,trackPoints:tracks.length,validCoordinates,validSites});
}

console.log(JSON.stringify({cases},null,2));
if(cases.some(test=>!test.validCoordinates||!test.validSites))process.exitCode=1;
