import assert from 'node:assert/strict';
import { ST } from '../../src/core/state.js';
import { createStandings, makeSchedule, recordFixtureResult, sortedStandings } from '../../src/core/season.js';

ST.teams=[0,1,2,3].map(id=>({id,name:`Team ${id}`}));
ST.schedule=makeSchedule(ST.teams.length);ST.standings=createStandings(ST.teams);ST.matchArchive=[];
assert.equal(ST.schedule.length,3);assert.equal(new Set(ST.schedule.flat().map(f=>f.id)).size,6,'경기 ID는 중복되면 안 됩니다.');

const [first,second]=ST.schedule.flat();
assert.ok(recordFixtureResult(first,{hMaps:2,aMaps:1,roundDifferential:5,seed:'one',box:{A:{rating:1.2}},mapResults:[{mapName:'Ascent',h:13,a:8,rounds:Array(21)}]}));
assert.equal(recordFixtureResult(first,{hMaps:2,aMaps:0}),false,'같은 경기를 두 번 반영하면 안 됩니다.');
assert.ok(recordFixtureResult(second,{hMaps:0,aMaps:2,roundDifferential:-8,seed:'two'}));
assert.equal(ST.matchArchive.length,2);
assert.equal(ST.matchArchive[0].mapResults[0].rounds,21);
assert.ok(!Array.isArray(ST.matchArchive[0].mapResults[0].rounds),'공간 라운드 로그 전체를 보관하면 안 됩니다.');
for(const team of ST.teams){const s=ST.standings[team.id];assert.equal(s.w+s.l,ST.schedule.flat().filter(f=>f.played&&(f.home===team.id||f.away===team.id)).length);}
const sorted=sortedStandings();assert.equal(sorted.length,4);
console.log(JSON.stringify({fixtures:ST.schedule.flat().length,archive:ST.matchArchive.length,leader:sorted[0].name,standings:ST.standings},null,2));
