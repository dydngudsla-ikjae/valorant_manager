import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { join, resolve } from 'node:path';

const ROOT=resolve(import.meta.dirname,'..');
const YEARS=['2021','2022','2023','2024','2025','2026'];
const report=JSON.parse(await readFile(join(ROOT,'validation-report.json'),'utf8'));
const failures=[],results={};
const fail=(year,rule,actual,expected)=>failures.push({year:Number(year),rule,actual,expected});
async function countJsonl(path){let count=0,bad=0;const input=createInterface({input:createReadStream(path,{encoding:'utf8'}),crlfDelay:Infinity});for await(const line of input){if(!line)continue;count++;try{JSON.parse(line);}catch{bad++;}}return{count,bad};}

for(const year of YEARS){
  const players=JSON.parse(await readFile(join(ROOT,'data/players',`${year}.json`),'utf8')).players;
  const teams=JSON.parse(await readFile(join(ROOT,'data/teams',`${year}.json`),'utf8')).teams;
  const maps=JSON.parse(await readFile(join(ROOT,'data/maps',`${year}.json`),'utf8')).maps;
  const meta=JSON.parse(await readFile(join(ROOT,'data/meta',`${year}.json`),'utf8'));
  const mapObs=await countJsonl(join(ROOT,'data/observations/player-maps',`${year}.jsonl`));
  const competitionObs=await countJsonl(join(ROOT,'data/observations/player-competition',`${year}.jsonl`));
  const teamMapResults=Object.values(teams).reduce((s,t)=>s+t.record.mapsWon+t.record.mapsLost,0);
  const teamRoundsWon=Object.values(teams).reduce((s,t)=>s+t.record.roundsWon,0);
  const mapGames=Object.values(maps).reduce((s,m)=>s+m.games,0);
  const mapRounds=Object.values(maps).reduce((s,m)=>s+m.rounds,0);
  const playerMapCounts=Object.values(players).reduce((s,p)=>s+p.observationCounts.maps,0);
  const playerCompetitionCounts=Object.values(players).reduce((s,p)=>s+p.observationCounts.competitionSplits,0);
  if(teamMapResults!==meta.games*2)fail(year,'each game contributes two team map results',teamMapResults,meta.games*2);
  if(teamRoundsWon!==meta.rounds)fail(year,'team round wins sum to played rounds',teamRoundsWon,meta.rounds);
  if(mapGames!==meta.games)fail(year,'map games sum to meta games',mapGames,meta.games);
  if(mapRounds!==meta.rounds)fail(year,'map rounds sum to meta rounds',mapRounds,meta.rounds);
  if(meta.sides.attack.won+meta.sides.defense.won+meta.sides.overtime.won+meta.sides.unclassified.won!==meta.rounds)fail(year,'classified plus unclassified round wins equal rounds',meta.sides.attack.won+meta.sides.defense.won+meta.sides.overtime.won+meta.sides.unclassified.won,meta.rounds);
  if(mapObs.bad)fail(year,'player-map observations parse as JSON',mapObs.bad,0);
  if(competitionObs.bad)fail(year,'competition observations parse as JSON',competitionObs.bad,0);
  if(mapObs.count!==playerMapCounts)fail(year,'player map observation count matches profiles',mapObs.count,playerMapCounts);
  if(competitionObs.count!==playerCompetitionCounts)fail(year,'competition observation count matches profiles',competitionObs.count,playerCompetitionCounts);
  if(mapObs.count!==report.years[year].observations.playerMaps)fail(year,'player map observation count matches build report',mapObs.count,report.years[year].observations.playerMaps);
  if(competitionObs.count!==report.years[year].observations.playerCompetitionSplits)fail(year,'competition observation count matches build report',competitionObs.count,report.years[year].observations.playerCompetitionSplits);
  for(const p of Object.values(players)){for(const metric of Object.values(p.overall.metrics)){if(metric.variance!==null&&metric.variance<0)fail(year,'player metric variance is non-negative',metric.variance,'>=0');}}
  results[year]={players:Object.keys(players).length,teams:Object.keys(teams).length,maps:Object.keys(maps).length,games:meta.games,rounds:meta.rounds,playerMapObservations:mapObs.count,playerCompetitionObservations:competitionObs.count};
}
const result={verifiedAt:new Date().toISOString(),valid:failures.length===0,results,failures};
await writeFile(join(ROOT,'verification-result.json'),JSON.stringify(result,null,2)+'\n','utf8');
process.stdout.write(JSON.stringify(result,null,2)+'\n');
if(failures.length)process.exitCode=1;
