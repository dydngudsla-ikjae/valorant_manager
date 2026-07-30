import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const years=[2025,2026];
const output={schemaVersion:1,years:{}};

for(const year of years){
  const source=JSON.parse(await readFile(path.join(root,'profile_json','data','players',`${year}.json`),'utf8'));
  output.years[year]={};
  for(const [playerId,player] of Object.entries(source.players||{})){
    const overall=player.overall;
    if(!overall?.rounds)continue;
    const rating=overall.metrics?.rating?.mean;
    const acs=overall.metrics?.acs?.mean;
    const kd=overall.rates?.kdRatio;
    if(!Number.isFinite(rating)||!Number.isFinite(acs)||!Number.isFinite(kd))continue;
    output.years[year][playerId]={rating:+rating.toFixed(2),acs:Math.round(acs),kd:+kd.toFixed(2),rounds:overall.rounds};
  }
}

const target=path.join(root,'src','data','player-season-summary.json');
await writeFile(target,`${JSON.stringify(output,null,2)}\n`,'utf8');
console.log(`Wrote ${target}`);
