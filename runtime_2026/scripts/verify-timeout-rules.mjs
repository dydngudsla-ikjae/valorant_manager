import assert from 'node:assert/strict';
import { createTimeoutLedger, timeoutAvailability, timeoutWindow, useTacticalTimeout } from '../../src/core/timeouts.js';

const policy=n=>({preset:n,attackFocus:'AUTO',defenseFocus:'AUTO',risk:'NORMAL'});
const ledger=createTimeoutLedger();

assert.deepEqual(timeoutWindow(0),{phase:'regulation',segment:null,key:'regulation'});
assert.deepEqual(timeoutWindow(23),{phase:'regulation',segment:null,key:'regulation'});
assert.deepEqual(timeoutWindow(24),{phase:'overtime',segment:0,key:'overtime-0'});
assert.deepEqual(timeoutWindow(25),{phase:'overtime',segment:0,key:'overtime-0'});
assert.deepEqual(timeoutWindow(26),{phase:'overtime',segment:1,key:'overtime-1'});

assert.ok(useTacticalTimeout({ledger,side:'home',roundsPlayed:5,beforePolicy:policy('A'),afterPolicy:policy('B')}));
assert.ok(useTacticalTimeout({ledger,side:'home',roundsPlayed:13,beforePolicy:policy('B'),afterPolicy:policy('C')}));
assert.equal(timeoutAvailability(ledger,'home',13).remaining,0);
assert.equal(useTacticalTimeout({ledger,side:'home',roundsPlayed:20,beforePolicy:policy('C'),afterPolicy:policy('D')}),null);
assert.equal(timeoutAvailability(ledger,'away',20).remaining,2,'팀별 횟수는 독립적이어야 합니다.');

assert.ok(useTacticalTimeout({ledger,side:'home',roundsPlayed:24,beforePolicy:policy('C'),afterPolicy:policy('OT1')}));
assert.equal(timeoutAvailability(ledger,'home',25).remaining,0,'같은 연장 구간에서는 추가 사용하면 안 됩니다.');
assert.equal(useTacticalTimeout({ledger,side:'home',roundsPlayed:25,beforePolicy:policy('OT1'),afterPolicy:policy('X')}),null);
assert.equal(timeoutAvailability(ledger,'home',26).remaining,1,'다음 연장 구간에는 1회가 새로 주어져야 합니다.');
assert.ok(useTacticalTimeout({ledger,side:'home',roundsPlayed:26,beforePolicy:policy('OT1'),afterPolicy:policy('OT2')}));
assert.equal(timeoutAvailability(ledger,'home',28).remaining,1,'이전 구간의 사용 여부와 무관하게 새 구간은 1회입니다.');
assert.equal(ledger.log.length,4);

console.log('Timeout rules verified: regulation 2, overtime 1 per two-round segment');
