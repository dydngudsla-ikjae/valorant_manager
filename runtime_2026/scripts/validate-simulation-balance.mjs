import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulateMatch } from '../../src/core/match-engine.js';
import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { playerOVR } from '../../src/core/ratings.js';
import { deriveSeed, random, withSeed } from '../../src/core/rng.js';
import { LEAGUES } from '../../src/data/leagues.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const config=JSON.parse(fs.readFileSync(path.join(root,'runtime_2026/simulation-validation-config.json'),'utf8'));
const arg=(name,fallback)=>{const hit=process.argv.find(value=>value.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):fallback;};
const matches=Math.max(1,Number(arg('matches',config.defaultMatches))),bestOf=Number(arg('best-of',config.bestOf)),seed=arg('seed',config.seed);
applyRealStats();buildAgentPools();
const teams=Object.entries(LEAGUES).flatMap(([leagueId,league])=>league.teams.map(team=>({leagueId,team})));
const teamStats=new Map(teams.map(({leagueId,team})=>[`${leagueId}:${team.short}`,{leagueId,team:team.name,short:team.short,matches:0,wins:0,roundDiff:0,ovr:team.roster.reduce((sum,p)=>sum+playerOVR(p),0)/5}]));
const playerStats=new Map();let totalMaps=0,totalRounds=0,overtimeMaps=0,upsets=0,favoriteGames=0;
for(let index=0;index<matches;index++){
  const cycle=Math.floor(index/(teams.length/2)),slot=index%(teams.length/2);
  const order=withSeed(deriveSeed(seed,'cycle',cycle),()=>{const values=[...teams];for(let i=values.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}return values;});
  const pair=[order[slot],order[order.length-1-slot]];
  const [H,A]=pair,result=simulateMatch({home:H.team,away:A.team,seed:deriveSeed(seed,'match',index,H.leagueId,H.team.short,A.leagueId,A.team.short),bestOf});
  const hk=`${H.leagueId}:${H.team.short}`,ak=`${A.leagueId}:${A.team.short}`,hs=teamStats.get(hk),as=teamStats.get(ak),homeWon=result.winner==='home';
  hs.matches++;as.matches++;hs.wins+=homeWon?1:0;as.wins+=homeWon?0:1;hs.roundDiff+=result.roundDifferential;as.roundDiff-=result.roundDifferential;
  const gap=hs.ovr-as.ovr;if(Math.abs(gap)>=3){favoriteGames++;if((gap>0)!==homeWon)upsets++;}
  totalMaps+=result.mapResults.length;totalRounds+=result.totalRounds;overtimeMaps+=result.mapResults.filter(map=>map.homeRounds+map.awayRounds>24).length;
  for(const [name,box] of Object.entries(result.box)){const key=name,stat=playerStats.get(key)||{name,matches:0,kills:0,deaths:0,assists:0,ratingSum:0,minRating:Infinity,maxRating:-Infinity};stat.matches++;stat.kills+=box.k;stat.deaths+=box.d;stat.assists+=box.a;stat.ratingSum+=box.rating;stat.minRating=Math.min(stat.minRating,box.rating);stat.maxRating=Math.max(stat.maxRating,box.rating);playerStats.set(key,stat);}
}
const teamRows=[...teamStats.values()].filter(team=>team.matches).map(team=>({...team,winRate:team.wins/team.matches,roundDiffPerMatch:team.roundDiff/team.matches})).sort((a,b)=>b.winRate-a.winRate);
const playerRows=[...playerStats.values()].map(player=>({...player,averageRating:player.ratingSum/player.matches,kd:player.deaths?player.kills/player.deaths:player.kills})).sort((a,b)=>b.averageRating-a.averageRating);
const summary={matches,bestOf,seed,teamsSampled:teamRows.length,totalMaps,totalRounds,averageRoundsPerMap:totalRounds/totalMaps,overtimeRate:overtimeMaps/totalMaps,upsetRate:favoriteGames?upsets/favoriteGames:null,ratingRange:[Math.min(...playerRows.map(p=>p.minRating)),Math.max(...playerRows.map(p=>p.maxRating))]};
const T=config.thresholds,checks={averageRounds:summary.averageRoundsPerMap>=T.minimumAverageRounds&&summary.averageRoundsPerMap<=T.maximumAverageRounds,overtimeRate:summary.overtimeRate>=T.minimumOvertimeRate&&summary.overtimeRate<=T.maximumOvertimeRate,ratingRange:summary.ratingRange[0]>=T.minimumRating&&summary.ratingRange[1]<=T.maximumRating};
const B=config.balanceTargets,diagnostics={allTeamsSampled:summary.teamsSampled===teams.length,averageRoundsInTarget:summary.averageRoundsPerMap>=B.minimumAverageRounds&&summary.averageRoundsPerMap<=B.maximumAverageRounds,upsetRateInTarget:summary.upsetRate===null||(summary.upsetRate>=B.minimumUpsetRate&&summary.upsetRate<=B.maximumUpsetRate)};
const report={schemaVersion:1,generatedAt:new Date().toISOString(),config,summary,checks,diagnostics,teams:teamRows,players:playerRows};
fs.writeFileSync(path.join(root,'runtime_2026/data/simulation-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({summary,checks,diagnostics,topTeams:teamRows.slice(0,5),bottomTeams:teamRows.slice(-5)},null,2));
if(Object.values(checks).some(value=>!value))process.exitCode=1;
