// Owns the two pieces of mutable app state (ST, MATCH) so the reassignment
// rule is centralized: only setMatch() may replace MATCH wholesale. Property
// mutation (MATCH.foo = x, ST.teams.push(x)) is fine from anywhere -- it's
// direct reassignment of the binding (MATCH = x) that only the defining
// module may do, so openMatch() calls setMatch() instead.
//
// subscribe/bump let React read state via useSyncExternalStore (see
// ui/useStore.js); every mutation site that a screen depends on must call
// bump() itself after mutating ST/MATCH in place.
const savedLanguage = typeof window !== 'undefined' ? window.localStorage.getItem('vlm-language') : null;
export const ST = { language:savedLanguage === 'en' ? 'en' : 'ko', seed:'vlm-2026', matchBestOf:3, league:null, myTeamIdx:null, teams:[], schedule:[], week:0, standings:{},matchArchive:[],competition:null,seasonOver:false, screen:'scSelect', previewLeague:null, previewTeamIdx:null, playerViewContext:null };
export let MATCH = null;

let version = 0;
const subs = new Set();
export function subscribe(fn){ subs.add(fn); return () => subs.delete(fn); }
export function getVersion(){ return version; }
export function bump(){ version++; subs.forEach(f => f()); }
export function setMatch(m){ MATCH = m; bump(); }

// Screen nav lives here (not ui/App.jsx) so screens can go() without importing
// React at all -- same reasoning as bump(): a plain state setter every module
// can call. The scroll-to-top side effect that used to live inside go() moved
// to App's useEffect([ST.screen]), since core/ stays DOM-free.
export function go(screen){ ST.screen = screen; bump(); }

// Toast is also plain state + bump(); Toast.jsx (ui/) owns the show/auto-hide
// timing. `id` lets Toast tell "new toast while one is showing" apart from
// "re-render, same toast" without comparing message strings.
let toastSeq = 0;
export let toastState = null;
export function toast(msg){ toastState = { msg, id: ++toastSeq }; bump(); }
