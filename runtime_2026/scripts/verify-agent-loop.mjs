import assert from 'node:assert/strict';
import { draftPair } from '../../src/core/draft.js';
import { simOneMap } from '../../src/core/round-engine.js';
import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { deriveSeed, withSeed } from '../../src/core/rng.js';
import { LEAGUES } from '../../src/data/leagues.js';

applyRealStats();
buildAgentPools();
const teams=Object.values(LEAGUES).flatMap(league=>league.teams);
let sightings=0,shots=0,simultaneousTicks=0,coverSeeks=0;

for(let index=0;index<4;index++){
  const home=teams[index],away=teams[index+8],mapName=['Ascent','Bind','Haven','Lotus'][index];
  const seed=deriveSeed('agent-loop-verification',mapName);
  const comp=withSeed(deriveSeed(seed,'draft'),()=>draftPair(home,away,mapName));
  const result=withSeed(seed,()=>simOneMap(home,away,comp,index%2===0));
  for(const round of result.rounds){
    const events=round.spatial.events,dead=new Set();
    for(const event of events){
      if(event.type==='kill'){assert.ok(!dead.has(event.victim),`duplicate death: ${event.victim}`);dead.add(event.victim);}
      if(event.type==='sighting')sightings++;
      if(event.type==='shot'||event.type==='damage')shots++;
      if(event.type==='coverSeek')coverSeeks++;
    }
    const byTick=new Map();
    for(const event of events.filter(event=>event.type==='damage')){const key=event.t.toFixed(2);byTick.set(key,(byTick.get(key)||0)+1);}
    simultaneousTicks+=[...byTick.values()].filter(count=>count>1).length;
    assert.equal(round.spatial.units.length,10,'every round must retain ten agent records');
    assert.ok(round.spatial.units.every(unit=>unit.decisionProfile),'decision profiles must be inspectable');
  }
}

assert.ok(sightings>0,'agent perception produced no sightings');
assert.ok(shots>0,'agent decisions produced no shots');
assert.ok(simultaneousTicks>0,'combat never resolved multiple shots in one tick');
console.log(JSON.stringify({maps:4,sightings,shots,simultaneousTicks,coverSeeks},null,2));

