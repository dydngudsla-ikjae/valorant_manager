// Phase 1 (one-shot): pull the four large inline data blobs out of src/main.js
// into files, and rewrite main.js to reference them instead.
//
//   AGENT_IMG (base64 per-agent icons)  -> public/img/agents/<slug>.png  + agImg() rewritten
//   STATS_BY_NAME (player real stats)   -> src/data/player-stats.json    + import
//   ASCENT_BG (base64 map background)   -> public/img/maps/ascent.png   + const -> path string
//   NAVGRID (nav mask string)           -> src/data/geo/ascent-navgrid.json + import
//
// Run once: node tools/extract-inline.mjs
// Safe to re-run: it's idempotent as long as main.js still has the original
// inline const lines (re-running after main.js was already rewritten will
// simply find nothing to do for the finished parts and error clearly).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const mainPath = path.join(root, 'src', 'main.js');

const src = readFileSync(mainPath, 'utf8');
const lines = src.split('\n');

function findLine(prefix) {
  const idx = lines.findIndex(l => l !== null && l.startsWith(prefix));
  if (idx === -1) throw new Error(`Could not find a line starting with: ${prefix}`);
  return idx;
}

function sliceBetween(line, prefix, suffix) {
  if (!line.startsWith(prefix)) throw new Error(`Expected line to start with "${prefix}"`);
  if (!line.endsWith(suffix)) throw new Error(`Expected line to end with "${suffix}"`);
  return line.slice(prefix.length, line.length - suffix.length);
}

function slug(name) {
  return name.toLowerCase().replace(/\//g, '').replace(/[^a-z0-9]/g, '');
}

function decodeDataUri(dataUri) {
  const m = /^data:image\/png;base64,(.+)$/.exec(dataUri);
  if (!m) throw new Error('Expected a data:image/png;base64,... URI');
  return Buffer.from(m[1], 'base64');
}

const results = { agents: 0 };

// ---- 1. AGENT_IMG -> public/img/agents/<slug>.png ----
{
  const idx = findLine('const AGENT_IMG=');
  const json = sliceBetween(lines[idx], 'const AGENT_IMG=', '};') + '}';
  const AGENT_IMG = JSON.parse(json);
  const dir = path.join(root, 'public', 'img', 'agents');
  mkdirSync(dir, { recursive: true });
  for (const [key, dataUri] of Object.entries(AGENT_IMG)) {
    writeFileSync(path.join(dir, `${key}.png`), decodeDataUri(dataUri));
    results.agents++;
  }
  lines[idx] = null; // mark for removal
}

// ---- 2. STATS_BY_NAME -> src/data/player-stats.json ----
{
  const idx = findLine('const STATS_BY_NAME=');
  const json = sliceBetween(lines[idx], 'const STATS_BY_NAME=', '};') + '}';
  const STATS_BY_NAME = JSON.parse(json);
  const dataDir = path.join(root, 'src', 'data');
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(path.join(dataDir, 'player-stats.json'), JSON.stringify(STATS_BY_NAME, null, 2) + '\n');
  lines[idx] = null;
}

// ---- 3. ASCENT_BG -> public/img/maps/ascent.png ----
{
  const idx = findLine('const ASCENT_BG=');
  const dataUri = sliceBetween(lines[idx], 'const ASCENT_BG="', '";');
  const dir = path.join(root, 'public', 'img', 'maps');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'ascent.png'), decodeDataUri(dataUri));
  lines[idx] = 'const ASCENT_BG="/img/maps/ascent.png";';
}

// ---- 4. NAVGRID -> src/data/geo/ascent-navgrid.json ----
{
  const idx = findLine('const NAVGRID=');
  const body = sliceBetween(lines[idx], 'const NAVGRID=', '};') + '}';
  // body looks like: {w:160,h:119,cells:"000...000"}  (unquoted keys, one string value)
  const m = /^\{w:(\d+),h:(\d+),cells:"([01]+)"\}$/.exec(body);
  if (!m) throw new Error('NAVGRID did not match the expected {w:N,h:N,cells:"..."} shape');
  const navgrid = { w: Number(m[1]), h: Number(m[2]), cells: m[3] };
  const geoDir = path.join(root, 'src', 'data', 'geo');
  mkdirSync(geoDir, { recursive: true });
  writeFileSync(path.join(geoDir, 'ascent-navgrid.json'), JSON.stringify(navgrid) + '\n');
  lines[idx] = null;
}

// ---- rewrite agImg() to build a path from the slug instead of an object lookup ----
{
  const idx = findLine('function agImg(');
  const original = lines[idx];
  if (!original.includes('AGENT_IMG[')) {
    throw new Error(`agImg() did not look like expected, refusing to rewrite blindly:\n${original}`);
  }
  lines[idx] = 'function agImg(a){ if(!a)return ""; return `/img/agents/${a.toLowerCase().replace(/\\//g,"").replace(/[^a-z0-9]/g,"")}.png`; }';
}

// ---- drop the now-null (removed) lines, and splice in imports near the top ----
const out = lines.filter(l => l !== null);
const importIdx = out.findIndex(l => l.startsWith("import './styles/all.css';"));
if (importIdx === -1) throw new Error("Could not find the styles import to anchor new imports after.");
out.splice(importIdx + 1,
  0,
  "import STATS_BY_NAME from './data/player-stats.json';",
  "import NAVGRID from './data/geo/ascent-navgrid.json';",
);

writeFileSync(mainPath, out.join('\n'));

console.log(`Extracted ${results.agents} agent icons -> public/img/agents/`);
console.log('Extracted player-stats.json -> src/data/player-stats.json');
console.log('Extracted ascent.png -> public/img/maps/ascent.png');
console.log('Extracted ascent-navgrid.json -> src/data/geo/ascent-navgrid.json');
console.log('Rewrote agImg() and spliced in JSON imports.');
