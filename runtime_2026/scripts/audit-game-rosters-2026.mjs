import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const data=JSON.parse(fs.readFileSync(path.join(root,'src/data/game-rosters-2026.json'),'utf8'));
const occurrences=new Map(),teams=[];
for(const [teamKey,team] of Object.entries(data.teams)){
  const registered=team.registered||[...(team.active||[]),...(team.bench||[])];
  const registeredIds=new Set(registered.map(x=>String(x.playerId)));
  const issues=[];
  if(registered.length<5)issues.push(`등록 선수 ${registered.length}명`);
  if(registeredIds.size!==registered.length)issues.push('팀 내부 선수 ID 중복');
  for(const player of registered){const id=String(player.playerId),list=occurrences.get(id)||[];list.push({teamKey,teamName:team.teamName,name:player.name});occurrences.set(id,list);}
  teams.push({teamKey,leagueId:teamKey.split(':')[0],teamId:team.teamId,teamName:team.teamName,rosterSource:team.rosterSource,verificationMode:team.verificationMode||'unverified_observation',verifiedAt:team.verifiedAt||null,sources:team.sources||[],registered,issues});
}
const duplicates=[...occurrences.entries()].filter(([,list])=>list.length>1).map(([playerId,list])=>({playerId,name:list[0].name,occurrences:list})).sort((a,b)=>a.name.localeCompare(b.name));
for(const duplicate of duplicates)for(const occurrence of duplicate.occurrences)teams.find(x=>x.teamKey===occurrence.teamKey).issues.push(`${duplicate.name}(${duplicate.playerId}) 다른 팀과 등록 중복`);
const summary={generatedAt:new Date().toISOString(),teams:teams.length,registeredPlayerSlots:teams.reduce((s,t)=>s+t.registered.length,0),uniquePlayers:occurrences.size,duplicateRegistrations:duplicates.length,teamsWithIssues:teams.filter(x=>x.issues.length).length,verifiedTeams:teams.filter(x=>x.verificationMode==='manual_verified').length,teamsNeedingReview:teams.filter(x=>x.verificationMode!=='manual_verified').length};
fs.writeFileSync(path.join(root,'runtime_2026/roster-audit-2026.json'),JSON.stringify({schemaVersion:2,year:2026,summary,duplicates,teams},null,2)+'\n');
const lines=['# 2026 등록 선수단 감사 보고서','',`생성 시각: ${summary.generatedAt}`,'','## 요약','',`- 팀: ${summary.teams}`,`- 등록 선수 슬롯: ${summary.registeredPlayerSlots}`,`- 고유 선수: ${summary.uniquePlayers}`,`- 중복 등록 ID: ${summary.duplicateRegistrations}`,`- 문제가 있는 팀: ${summary.teamsWithIssues}`,'','> 고정 주전·벤치·기본 라인업은 저장하지 않습니다. 매 경기 등록 선수단 중 5명을 선택합니다.'];
for(const leagueId of ['AMER','EMEA','PAC','CN']){lines.push('',`## ${leagueId}`,'');for(const team of teams.filter(x=>x.leagueId===leagueId))lines.push(`### ${team.teamName} (${team.teamKey})`,'',`- 등록 선수단: ${team.registered.map(p=>`${p.name} (${p.playerId})`).join(', ')}`,`- 문제: ${team.issues.length?team.issues.join('; '):'없음'}`,'');}
fs.writeFileSync(path.join(root,'runtime_2026/ROSTERS_2026.md'),lines.join('\n')+'\n');
console.log(JSON.stringify(summary,null,2));
if(process.argv.includes('--strict')&&summary.teamsWithIssues)process.exitCode=1;
