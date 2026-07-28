// Owns the two pieces of mutable app state (ST, MATCH) so the reassignment
// rule is centralized: only setMatch() may replace MATCH wholesale. Property
// mutation (MATCH.foo = x, ST.teams.push(x)) is fine from anywhere -- it's
// direct reassignment of the binding (MATCH = x) that only the defining
// module may do, so openMatch() calls setMatch() instead.
//
// subscribe/bump exist for Phase 4 (React reads state through them via
// useSyncExternalStore); nothing in Phase 3a calls bump() yet -- legacy.js
// mutates ST/MATCH the same way it always did.
export const ST = { league:null, myTeamIdx:null, teams:[], schedule:[], week:0, standings:{}, seasonOver:false };
export let MATCH = null;

let version = 0;
const subs = new Set();
export function subscribe(fn){ subs.add(fn); return () => subs.delete(fn); }
export function getVersion(){ return version; }
export function bump(){ version++; subs.forEach(f => f()); }
export function setMatch(m){ MATCH = m; bump(); }
