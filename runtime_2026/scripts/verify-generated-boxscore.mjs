import assert from 'node:assert/strict';
import { simulateMatch } from '../../src/core/match-engine.js';
import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { LEAGUES } from '../../src/data/leagues.js';

applyRealStats();buildAgentPools();
const result=simulateMatch({home:structuredClone(LEAGUES.PAC.teams[0]),away:structuredClone(LEAGUES.PAC.teams[1]),seed:'boxscore-verification',bestOf:3,maps:['Ascent','Bind','Haven']});
const players=Object.values(result.box);
assert.equal(players.length,10);
for(const stat of players){
  assert.equal(stat.rounds,result.totalRounds,'모든 출전 선수의 라운드 수가 경기 전체 라운드와 같아야 합니다.');
  for(const key of ['rating','acsFinal','adr','kast','kpr','apr','kd','fkfd'])assert.ok(Number.isFinite(stat[key]),`${key}가 유효한 숫자여야 합니다.`);
  assert.ok(stat.damage>=stat.k,'킬이 기록된 선수의 총 피해가 유효해야 합니다.');
  assert.ok(stat.kast>=0&&stat.kast<=1,'KAST는 0~1 범위여야 합니다.');
  assert.equal(stat.kpr,+((stat.k/stat.rounds).toFixed(3)));
  assert.equal(stat.apr,+((stat.a/stat.rounds).toFixed(3)));
  assert.equal(stat.adr,+((stat.damage/stat.rounds).toFixed(1)));
}
for(const map of result.mapResults){
  for(const round of map.rounds){
    for(const kill of round.kills){
      assert.ok(kill.damage>0&&kill.damage<=150);
      assert.ok(kill.retaliationDamage>=0&&kill.retaliationDamage<=100);
    }
    for(const event of round.spatial.events.filter(event=>event.type==='damage')){
      assert.ok(event.amount>0&&event.amount<=150);
      assert.ok(event.remainingHP>=0&&event.remainingHP<=100);
    }
  }
}
const summary={score:`${result.homeMaps}-${result.awayMaps}`,rounds:result.totalRounds,players:players.map(p=>({r:p.rating,acs:p.acsFinal,adr:p.adr,kast:p.kast,kpr:p.kpr,apr:p.apr,kd:p.kd}))};
console.log(JSON.stringify(summary,null,2));
