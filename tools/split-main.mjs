// Phase 3a (one-shot): split src/main.js's ~163 top-level declarations into
// data/*, core/*, ui/mapview.js, and legacy.js (everything else: screen
// rendering + UI orchestration, moved verbatim, not reorganized further).
//
// Classification rule actually used (not just the section banners): a
// symbol is CORE only if it and everything it calls, transitively, never
// touches the DOM and never calls a screen-render/navigation function.
// Verified by grep before writing this map -- e.g. the map-veto functions
// look independent on paper but call each other in a cycle that bottoms
// out in renderVeto()'s DOM writes, so the whole veto flow is legacy, not
// core, except mapSuitFor (genuinely pure, filed under core/draft.js).
//
// Run: node tools/split-main.mjs
// Then wire src/main.js down to imports + the boot sequence.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const mainPath = path.join(root, 'src', 'main.js');

let src = readFileSync(mainPath, 'utf8');

// ---- fix the one cross-module reassignment before slicing: MATCH is only
// ever reassigned here, inside openMatch(). Route it through setMatch()
// (defined by hand in core/state.js) so state.js stays the sole owner of
// the `let MATCH` binding. ----
{
  const before = `MATCH={fx,wi,home,away,hMaps:0,aMaps:0,mapResults:[],\n    mapPool:pickMaps(3), curMap:0, box:{}, running:false, comps:[],\n    mapsToWin:2, roundsPlayed:0,\n    playerSide: fx.home===myId?'home':'away'};`;
  const after = `setMatch({fx,wi,home,away,hMaps:0,aMaps:0,mapResults:[],\n    mapPool:pickMaps(3), curMap:0, box:{}, running:false, comps:[],\n    mapsToWin:2, roundsPlayed:0,\n    playerSide: fx.home===myId?'home':'away'});`;
  if (!src.includes(before)) throw new Error('openMatch MATCH= assignment text not found verbatim -- did the source change?');
  src = src.replace(before, after);
}

const lines = src.split('\n');
const declRe = /^(function|const|let) ([A-Za-z_$][A-Za-z0-9_$]*)/;
const decls = [];
lines.forEach((l, i) => { const m = declRe.exec(l); if (m) decls.push({ line: i + 1, name: m[2] }); });

// symbol -> output file key
const FILES = {
  'data/leagues.js':   ['ROLE','MAPS','p','primaryRole','isFlex','secondaryRole','displayRole','roleColor','roleFull','PROFBANDS','profBand','LEAGUES'],
  'data/agents.js':    ['AGENTS','AGENT_KITS','KIT_DEFAULT','ARCH','BEATS','MAPDATA','AGENT_ROLE','agImg','agIcon'],
  'data/weapons.js':   ['WEAP','WCOST','SCOST','ABFX','TYPESYM','TYPEKO','SKILL_R'],
  'data/geo/ascent.js':['MV','ASCENT_BG','GEO_ASCENT','MAPGEO'],
  'core/ratings.js':   ['playerOVR','teamOVR','teamAxis','kitOf','kitTotal','compKitScore','counterEdge','seededPool'],
  'core/roster.js':    ['visiblePool','applyRealStats','buildAgentPools'],
  'core/draft.js':     ['roleCounts','stanceSuit','mapFit','pickAgents','draftComp','buildCompForStance','buildCompChoice','draftPair','matchupRead','autoAgentFor','mapSuitFor'],
  'core/season.js':    ['makeSchedule','sortedStandings','nameById','firstUnplayedWeek','teamPower','rollForm','teamObj','simRestOfWeek','quickSim','pickMaps'],
  'core/economy.js':   ['BUYMOD','SIDEMOD','decideBuy','homeSideAt','buyFromCredits','initEcon','loadoutFor','buyLabel'],
  'core/round-engine.js': ['rand5','agentMap','pickByKit','fbSbYScore','applyKills','applyRoundStats','newStat','freshBox','finalizeRatings','simOneMap','topKillerOfRound','weightedPlayer','matchMVP'],
  'core/spatial.js':   ['sdist','SP_TUNE','SP_SETUPS','spPickSetup','spatialRound','curGeo','navOpenCell','navToCell','navCellPct','navOpenNear','navLOS','_navCache','navPath','navRouteThrough'],
  // ST/MATCH are declared here so the sanity check accounts for them, but
  // core/state.js is actually hand-written below (see stateJs) -- their
  // sliced blocks are never used.
  'core/state.js':     ['ST', 'MATCH'],
  'ui/mapview.js':      ['geoSVG','mvBuild','mvSet','mvPath','mvStartRAF','mvStopRAF','mvRenderAlive','mvRenderCards','mvKill','mvSpike','mvAbility','fmtClock','mvPlayRound','mvPlantConverge','abFxType','shieldPips','abbr'],
  'legacy.js': [
    'buildSelect','renderTeams','previewTeam','selectTeam','renderHub','renderStandings','renderSchedule',
    'renderSquad','openPlayer','renderPlayer','startNextMatch','DEV_ASCENT_BO1','openMatch',
    'startVeto','stepVeto','aiVetoAct','playerVeto','applyVeto','finalizeVeto','renderVeto','vetoSkip',
    'startMapDraft','renderDraftScreen','selectStance','selectAgent','confirmDraft',
    'renderMapChips','paintMap','renderDraft','buildPips',
    'simCurrentMap','finishMap','endMatch',
    'boxSide','showBox','renderBox','renderTimeline','renderMatchButtons','skipMatch','backToHub',
    'showChampCheck','go','toastTimer','toast','setBoxSide',
  ],
};

// symbols that come from a JSON asset, not another generated file
const JSON_SOURCES = {
  STATS_BY_NAME: { rel: 'data/player-stats.json', consumer: 'core/roster.js' },
  NAVGRID: { rel: 'data/geo/ascent-navgrid.json', consumer: 'core/spatial.js' },
};

// ---- sanity: every declared symbol assigned exactly once ----
const symbolFile = new Map();
for (const [file, names] of Object.entries(FILES)) {
  for (const n of names) {
    if (symbolFile.has(n)) throw new Error(`Symbol "${n}" assigned to two files: ${symbolFile.get(n)} and ${file}`);
    symbolFile.set(n, file);
  }
}
const declaredNames = new Set(decls.map(d => d.name));
const unassigned = [...declaredNames].filter(n => !symbolFile.has(n));
const assignedButMissing = [...symbolFile.keys()].filter(n => !declaredNames.has(n));
if (unassigned.length) throw new Error('Declared but not assigned to any file: ' + unassigned.join(', '));
if (assignedButMissing.length) throw new Error('Assigned but not found as a top-level declaration: ' + assignedButMissing.join(', '));
console.log(`All ${decls.length} declarations accounted for across ${Object.keys(FILES).length} files.`);

// ---- slice out each symbol's raw source block ----
const blockOf = new Map();
decls.forEach((d, i) => {
  const endLine = i + 1 < decls.length ? decls[i + 1].line - 1 : lines.length;
  blockOf.set(d.name, lines.slice(d.line - 1, endLine).join('\n'));
});

// ---- assemble each output file's body (blocks in original source order) ----
const fileBody = {};
for (const [file, names] of Object.entries(FILES)) {
  const nameSet = new Set(names);
  const orderedNames = decls.filter(d => nameSet.has(d.name)).map(d => d.name);
  fileBody[file] = orderedNames.map(n => {
    const block = blockOf.get(n);
    // export every top-level declaration uniformly
    return block.replace(declRe, (m, kind, name) => `export ${kind} ${name}`);
  }).join('\n\n').trim() + '\n';
}

// ---- auto-resolve cross-file imports by scanning for other files' identifiers ----
const tokenRe = /\b[A-Za-z_$][A-Za-z0-9_$]*\b/g;
function relImport(fromFile, toFile) {
  const fromDir = path.posix.dirname(fromFile);
  let rel = path.posix.relative(fromDir, toFile);
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

for (const [file, names] of Object.entries(FILES)) {
  const ownSet = new Set(names);
  const tokens = new Set(fileBody[file].match(tokenRe) || []);
  const neededFromFile = new Map(); // otherFile -> Set(names)
  const neededFromJson = new Map(); // relPath -> name (default import)
  for (const t of tokens) {
    if (ownSet.has(t)) continue;
    if (symbolFile.has(t)) {
      const otherFile = symbolFile.get(t);
      if (otherFile === file) continue;
      if (!neededFromFile.has(otherFile)) neededFromFile.set(otherFile, new Set());
      neededFromFile.get(otherFile).add(t);
    } else if (JSON_SOURCES[t] && JSON_SOURCES[t].consumer === file) {
      neededFromJson.set(JSON_SOURCES[t].rel, t);
    }
  }
  const importLines = [];
  // state.js gets imported explicitly below for files that need ST/MATCH/setMatch
  for (const [otherFile, names2] of [...neededFromFile.entries()].sort()) {
    importLines.push(`import { ${[...names2].sort().join(', ')} } from '${relImport(file, otherFile.replace(/\.js$/, ''))}.js';`);
  }
  for (const [rel, name] of neededFromJson) {
    importLines.push(`import ${name} from '${relImport(file, rel.replace(/\.json$/, ''))}.json';`);
  }
  // every file that touches ST/MATCH needs core/state.js -- covered by the
  // generic scan above since ST/MATCH are registered in symbolFile via state.js's
  // own entry (added just below), so nothing extra needed here.
  fileBody[file] = (importLines.length ? importLines.join('\n') + '\n\n' : '') + fileBody[file];
}

// ---- core/state.js is hand-written, not mechanically sliced ----
const stateJs = `// Owns the two pieces of mutable app state (ST, MATCH) so the reassignment
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
`;

// ST and MATCH were already registered under core/state.js before the main
// import-resolution pass ran, so files needing them got a correct
// `import { ST, MATCH } from './core/state.js'` already. setMatch() didn't
// exist as a real top-level declaration in the original source (it's new,
// written by hand here), so the scanner couldn't have found it -- add it to
// whichever file's existing core/state.js import line needs it (currently
// only legacy.js, for openMatch()).
fileBody['core/state.js'] = stateJs;

const stateImportRe = /^import \{ ([^}]+) \} from '(\.*\/*core\/state)\.js';$/m;
for (const file of Object.keys(FILES)) {
  if (file === 'core/state.js') continue;
  const tokens = new Set(fileBody[file].match(tokenRe) || []);
  if (!tokens.has('setMatch')) continue;
  const m = stateImportRe.exec(fileBody[file]);
  if (m) {
    const names = m[1].split(',').map(s => s.trim());
    if (!names.includes('setMatch')) names.push('setMatch');
    fileBody[file] = fileBody[file].replace(stateImportRe, `import { ${names.sort().join(', ')} } from '${m[2]}.js';`);
  } else {
    fileBody[file] = `import { setMatch } from '${relImport(file, 'core/state')}.js';\n` + fileBody[file];
  }
}

// ---- write everything out ----
for (const file of Object.keys(FILES)) {
  const outPath = path.join(root, 'src', file);
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, fileBody[file]);
}
console.log('Wrote:', Object.keys(FILES).map(f => 'src/' + f).join(', '));
