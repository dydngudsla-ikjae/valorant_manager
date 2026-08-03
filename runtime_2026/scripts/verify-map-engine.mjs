import { simulateMatch } from '../../src/core/match-engine.js';
import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { LEAGUES, MAPS } from '../../src/data/leagues.js';
import { MAPGEO } from '../../src/data/geo/maps.js';
import { semanticRegionRaster } from '../../src/data/geo/semantic-regions.js';
import { navLineTest, navPathTest } from '../../src/core/spatial.js';

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
  const raster=semanticRegionRaster(map),areaCounts=new Int32Array(raster.areas.length);let unassignedCells=0,walkableCells=0;
  for(let index=0;index<raster.owner.length;index++){
    if(raster.cells[index]!=='1')continue;
    walkableCells++;
    if(raster.owner[index]<0)unassignedCells++;
    else areaCounts[raster.owner[index]]++;
  }
  const emptyAreas=raster.areas.filter((_,index)=>areaCounts[index]===0).map(area=>area.id);
  const validMapObjects=MAPGEO[map].annotations.barriers.length>0&&MAPGEO[map].orbs.length===2;
  const validPlantZones=MAPGEO[map].siteNames.every(site=>{const zone=MAPGEO[map].plantZone(site);return Number.isFinite(zone.x)&&Number.isFinite(zone.y)&&zone.w>=5&&zone.h>=5&&navPathTest(map,MAPGEO[map].atkSpawn[2],zone).reachable;});
  const tacticalSets=MAPGEO[map].siteNames.map(site=>({site,staging:MAPGEO[map].stagingPoints(site),entry:MAPGEO[map].entryPoints(site),postPlant:MAPGEO[map].postPlantPositions(site),infoPeek:MAPGEO[map].infoPeekPoints(site)}));
  const validTacticalSchema=tacticalSets.every(set=>set.staging.length>=5&&set.entry.length>=4&&set.postPlant.length>=5&&set.infoPeek.length>=2&&Object.values(set).flatMap(value=>Array.isArray(value)?value:[]).every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.x>=0&&point.x<=100&&point.y>=0&&point.y<=100));
  const reachableTacticalPoints=tacticalSets.every(set=>[...set.staging,...set.entry,...set.postPlant,...set.infoPeek].every(point=>navPathTest(map,MAPGEO[map].atkSpawn[2],point).reachable));
  const anchors=[MAPGEO[map].atkSpawn[2],MAPGEO[map].pts.defSpawn,MAPGEO[map].pts.botMid,...MAPGEO[map].siteNames.map(site=>MAPGEO[map].site(site))];
  const reachableAnchors=anchors.slice(1).every(anchor=>navPathTest(map,anchors[0],anchor).reachable);
  const symmetricSight=anchors.every((from,index)=>anchors.slice(index+1).every(to=>navLineTest(map,from,to).clear===navLineTest(map,to,from).clear));
  cases.push({map,sites:MAPGEO[map].siteNames,score:`${result.mapResults[0].homeRounds}-${result.mapResults[0].awayRounds}`,rounds:rounds.length,trackPoints:tracks.length,validCoordinates,validSites,walkableCells,semanticAreas:raster.areas.length,unassignedCells,emptyAreas,validMapObjects,validPlantZones,validTacticalSchema,reachableTacticalPoints,reachableAnchors,symmetricSight});
}

const ascentWallCases=[
  {id:'mid-left-wall',expected:false,from:{x:49.06,y:45.31},to:{x:51.56,y:59.69}},
  {id:'mid-right-wall',expected:false,from:{x:55.31,y:58.44},to:{x:55.31,y:41.56}},
  {id:'mid-center-passage',expected:true,from:{x:53.13,y:53.44},to:{x:53.13,y:57.19}},
].map(test=>({...test,actual:navLineTest('Ascent',test.from,test.to).clear}));

console.log(JSON.stringify({cases,ascentWallCases},null,2));
if(cases.some(test=>!test.validCoordinates||!test.validSites||test.unassignedCells||test.emptyAreas.length||!test.validMapObjects||!test.validPlantZones||!test.validTacticalSchema||!test.reachableTacticalPoints||!test.reachableAnchors||!test.symmetricSight)||ascentWallCases.some(test=>test.actual!==test.expected))process.exitCode=1;
