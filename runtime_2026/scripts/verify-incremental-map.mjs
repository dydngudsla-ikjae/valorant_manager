import assert from 'node:assert/strict';
import { draftPair } from '../../src/core/draft.js';
import { createMapSimulation, mapSimulationDone, mapSimulationResult, simOneMap, simulateNextRound } from '../../src/core/round-engine.js';
import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { deriveSeed, random, withSeed } from '../../src/core/rng.js';
import { LEAGUES } from '../../src/data/leagues.js';

applyRealStats();
buildAgentPools();
const teams=Object.values(LEAGUES).flatMap(league=>league.teams);
assert.ok(teams.length>=2,'검증할 팀 데이터가 부족합니다.');

for(let test=0;test<8;test++){
  const home=teams[test%teams.length];
  const away=teams[(test+7)%teams.length];
  const mapName=['Ascent','Bind','Haven','Lotus'][test%4];
  const seed=deriveSeed('incremental-map-verification',test,home.id,away.id,mapName);
  const comp=withSeed(deriveSeed(seed,'draft'),()=>draftPair(home,away,mapName));
  const startAtk=test%2===0;
  const full=withSeed(seed,()=>simOneMap(home,away,comp,startAtk));
  const state=withSeed(seed,()=>createMapSimulation(home,away,comp,startAtk));

  let previousScore=0;
  while(!mapSimulationDone(state)){
    withSeed(deriveSeed(seed,'unrelated-ui-work',state.r),()=>random());
    const beforeRound=state.r;
    const round=simulateNextRound(state);
    assert.ok(round,'진행 중인 맵은 다음 라운드를 반환해야 합니다.');
    assert.equal(state.r,beforeRound+1,'한 호출은 정확히 한 라운드만 진행해야 합니다.');
    assert.equal(state.h+state.a,previousScore+1,'매 라운드마다 한 팀의 점수만 증가해야 합니다.');
    assert.ok(round.economy?.home&&round.economy?.away,'라운드 경제 상태가 누락되었습니다.');
    assert.equal(round.preparation?.players?.length,10,'준비 단계에 양 팀 10명의 초기 이동이 기록되어야 합니다.');
    assert.equal(round.preparation?.purchases?.home?.weapons?.length,5,'준비 단계에서 총기 구매가 확정되어야 합니다.');
    previousScore=state.h+state.a;
  }

  const incremental=mapSimulationResult(state);
  assert.ok(incremental.rounds.some(round=>round.abilities?.length),'스킬 사용 이벤트가 라운드 기록에 남아야 합니다.');
  assert.ok(incremental.rounds.every(round=>Array.isArray(round.spatial?.orbCaptures)),'오브 획득 기록이 공간 결과에 남아야 합니다.');
  assert.ok(incremental.rounds.every(round=>Array.isArray(round.spatial?.abilityObjects)),'설치형 스킬이 공간 오브젝트 기록을 제공해야 합니다.');
  assert.deepEqual(incremental,full,`일괄/라운드별 결과가 다릅니다: ${home.short} vs ${away.short} ${mapName}`);
  assert.equal(simulateNextRound(state),null,'종료된 맵은 추가 라운드를 만들면 안 됩니다.');
}

console.log('Incremental map simulation verified: 8/8');
