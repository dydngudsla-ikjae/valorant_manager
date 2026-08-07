import assert from 'node:assert/strict';
import { TRADE_MODEL, crossfirePlayers, duelSupportContext, supportingPlayers } from '../../src/core/trades/trade-system.js';

const actor={name:'actor',side:'home',x:10,y:0,alive:true};
const target={name:'target',side:'away',x:0,y:0,alive:true};
const stacked={name:'stacked',side:'home',x:8,y:1,alive:true};
const wide={name:'wide',side:'home',x:0,y:10,alive:true};
const farWide={name:'far-wide',side:'home',x:0,y:30,alive:true};
const enemyMate={name:'enemy-mate',side:'away',x:-4,y:0,alive:true};
const units=[actor,target,stacked,wide,farWide,enemyMate];
const clear=()=>true;

assert.deepEqual(crossfirePlayers(actor,target,units,clear).map(unit=>unit.name),['wide'],'only a nearby teammate on a distinct angle should form a crossfire');
assert.ok(supportingPlayers(actor,target,units,clear).some(unit=>unit.name==='stacked'),'stacked teammates must remain valid ordinary support');
const context=duelSupportContext({attacker:actor,defender:target,units,windows:[],time:0,lineOfSight:clear});
assert.equal(context.attacker.crossfire,true);
assert.deepEqual(context.attacker.crossfirePlayers.map(unit=>unit.name),['wide']);

console.log(JSON.stringify({version:TRADE_MODEL.version,minAngle:TRADE_MODEL.crossfireMinAngle,crossfirePlayers:context.attacker.crossfirePlayers.map(unit=>unit.name),supporters:context.attacker.supporters.map(unit=>unit.name)},null,2));
