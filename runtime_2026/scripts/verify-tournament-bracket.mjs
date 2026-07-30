import assert from 'node:assert/strict';
import { completeBracketMatch, createDoubleEliminationBracket, createStageCompetition, readyBracketMatches } from '../../src/core/tournament.js';

const competition=createStageCompetition({leagueId:'TEST',year:2026});
competition.seeds=[0,1,2,3,4,5,6,7];competition.bracket=createDoubleEliminationBracket(competition.seeds);competition.phase='playoffs';
let completed=0,waves=0;
while(competition.phase!=='complete'){
  const ready=readyBracketMatches(competition);assert.ok(ready.length>0,'완료 전에는 진행 가능한 대진이 있어야 합니다.');waves++;
  for(const match of ready){match.scheduled=true;assert.notEqual(match.home,match.away);assert.ok(completeBracketMatch(competition,match.id,{hMaps:match.bestOf===5?3:2,aMaps:0}));completed++;}
}
assert.equal(completed,14);assert.equal(competition.bracket.filter(match=>match.bracket==='final').length,1);assert.equal(competition.bracket.find(match=>match.id==='po-lb-final').bestOf,5);assert.equal(competition.bracket.find(match=>match.id==='po-grand-final').bestOf,5);assert.equal(competition.champion,0);
console.log(JSON.stringify({completed,waves,champion:competition.champion,upper:competition.bracket.filter(m=>m.bracket==='upper').length,lower:competition.bracket.filter(m=>m.bracket==='lower').length},null,2));
