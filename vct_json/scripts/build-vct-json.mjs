import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { once } from 'node:events';

const ROOT = resolve(import.meta.dirname, '..', '..');
const INPUT = join(ROOT, 'stats');
const OUTPUT = join(ROOT, 'vct_json');
const DATA = join(OUTPUT, 'data');
const QUARANTINE = join(OUTPUT, 'quarantine');

const DATASET_RULES = {
  players_stats: { player: ['Player'], team: ['Teams'] },
  overview: { player: ['Player'], team: ['Team'], match: true, game: true },
  kills_stats: { player: ['Player'], team: ['Team'], match: true, game: true },
  kills: { player: ['Player', 'Enemy'], team: ['Player Team', 'Enemy Team'], match: true, game: true },
  rounds_kills: { player: ['Eliminator', 'Eliminated'], team: ['Eliminator Team', 'Eliminated Team'], match: true, game: true },
  draft_phase: { team: ['Team'], match: true },
  eco_rounds: { team: ['Team'], match: true, game: true },
  eco_stats: { team: ['Team'], match: true, game: true },
  maps_scores: { team: ['Team A', 'Team B'], match: true, game: true },
  scores: { team: ['Team A', 'Team B'], match: true },
  teams_picked_agents: { team: ['Team'] },
  win_loss_methods_count: { team: ['Team'], match: true, game: true },
  win_loss_methods_round_number: { team: ['Team'], match: true, game: true },
  agents_pick_rates: {}, maps_stats: {}, maps_played: { match: true, game: true },
  players_ids: {}, teams_ids: {}, team_mapping: {},
  tournaments_stages_match_types_ids: {}, tournaments_stages_matches_games_ids: {},
  all_players_ids: {}, all_teams_ids: {}, all_teams_mapping: {},
  all_tournaments_stages_match_types_ids: {}, all_matches_games_ids: {}
};

const INTEGER_FIELDS = new Set([
  'Player ID','Team ID','Tournament ID','Stage ID','Match Type ID','Match ID','Game ID','Year',
  'Rounds Played','Kills','Deaths','Assists','First Kills','First Deaths','Maximum Kills in a Single Map',
  '2k','3k','4k','5k','1v1','1v2','1v3','1v4','1v5','Spike Plants','Spike Defuses',
  'Round Number','Player Kills','Enemy Kills','Difference','Initiated','Won','Total Maps Played',
  'Total Wins By Map','Total Loss By Map','Team A Score','Team A Attacker Score','Team A Defender Score',
  'Team A Overtime Score','Team B Score','Team B Attacker Score','Team B Defender Score','Team B Overtime Score',
  'Elimination','Detonated','Defused','Time Expiry (No Plant)','Defused Failed',
  'Detonation Denied','Time Expiry (Failed to Plant)','Team A Score','Team B Score'
]);
const NUMBER_FIELDS = new Set([
  'Rating','Average Combat Score','Kills:Deaths','Average Damage Per Round','Kills Per Round',
  'Assists Per Round','First Kills Per Round','First Deaths Per Round','Econ','Loadout Value','Remaining Credits',
  'Kills - Deaths (KD)','Kills - Deaths (FKD)'
]);
const PERCENT_FIELDS = new Set([
  'Pick Rate','Attacker Side Win Percentage','Defender Side Win Percentage',
  'Kill, Assist, Trade, Survive %','Headshot %','Clutch Success %'
]);

const counters = {
  inputFiles: 0, inputRows: 0, outputRows: 0, quarantinedRows: 0,
  byDataset: {}, quarantineReasons: {}, unresolvedRefs: {}, ambiguousRefs: {}
};
const quarantineStreams = new Map();
const outputStreams = new Map();

function norm(value) {
  return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}
function slug(value) {
  return norm(value).replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function hash(value) {
  let h = 2166136261;
  for (const ch of String(value)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
function syntheticId(type, ...scope) {
  const raw = scope.map(v => String(v ?? '')).join('\u001f');
  const label = slug(scope.at(-1)) || 'unnamed';
  return `synthetic:${type}:${hash(raw)}:${label}`;
}
function keyName(header) {
  return header.replace(/%/g, ' percent ').replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^./, c => c.toLowerCase());
}
function addIndex(map, label, id) {
  if (!label || id === null || id === undefined || id === '') return;
  const key = norm(label);
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(String(id));
}
function resolveIndex(map, label) {
  const ids = map.get(norm(label));
  if (!ids?.size) return { id: null, status: 'unresolved' };
  if (ids.size > 1) return { id: null, status: 'ambiguous', candidates: [...ids].sort() };
  return { id: [...ids][0], status: 'resolved' };
}
function composite(...values) { return values.map(norm).join('\u001f'); }
function parseYear(path, row) {
  if (row.Year) return String(row.Year);
  const match = path.match(/vct_(\d{4})/i);
  return match?.[1] ?? 'global';
}

async function *parseCsv(path) {
  const stream = createReadStream(path, { encoding: 'utf8' });
  let row = [], field = '', quoted = false, line = 1, recordLine = 1;
  let pendingQuote = false;
  for await (const chunk of stream) {
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];
      if (pendingQuote) {
        pendingQuote = false;
        if (ch === '"') { field += '"'; continue; }
        quoted = false;
      }
      if (quoted) {
        if (ch === '"') {
          if (i + 1 < chunk.length && chunk[i + 1] === '"') { field += '"'; i++; }
          else if (i + 1 === chunk.length) pendingQuote = true;
          else quoted = false;
        } else { field += ch; if (ch === '\n') line++; }
        continue;
      }
      if (ch === '"' && field.length === 0) quoted = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') {
        row.push(field.replace(/\r$/, '')); field = '';
        yield { values: row, line: recordLine };
        row = []; line++; recordLine = line;
      } else field += ch;
    }
  }
  if (pendingQuote) quoted = false;
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); yield { values: row, line: recordLine }; }
}

async function readCsv(path, onRow) {
  let headers = null;
  for await (const record of parseCsv(path)) {
    if (!headers) { headers = record.values.map((v, i) => i === 0 ? v.replace(/^\uFEFF/, '') : v); continue; }
    if (record.values.length === 1 && record.values[0] === '') continue;
    if (record.values.length !== headers.length) {
      await quarantine('column_count_mismatch', { source: relative(ROOT, path), line: record.line, expected: headers.length, actual: record.values.length, rawValues: record.values });
      continue;
    }
    const row = Object.fromEntries(headers.map((h, i) => [h, record.values[i]]));
    await onRow(row, record.line, headers);
  }
  return headers;
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
}
async function writeLine(streamMap, path, value) {
  let stream = streamMap.get(path);
  if (!stream) { await mkdir(dirname(path), { recursive: true }); stream = createWriteStream(path, { encoding: 'utf8' }); streamMap.set(path, stream); }
  if (!stream.write(JSON.stringify(value) + '\n')) await once(stream, 'drain');
}
async function quarantine(reason, value) {
  counters.quarantinedRows++;
  counters.quarantineReasons[reason] = (counters.quarantineReasons[reason] ?? 0) + 1;
  await writeLine(quarantineStreams, join(QUARANTINE, `${reason}.jsonl`), { reason, ...value });
}
async function quarantineRecord(value) {
  counters.quarantinedRows++;
  for (const issue of value.issues) counters.quarantineReasons[issue.type] = (counters.quarantineReasons[issue.type] ?? 0) + 1;
  await writeLine(quarantineStreams, join(QUARANTINE, 'records.jsonl'), value);
}
async function closeStreams(streamMap) {
  await Promise.all([...streamMap.values()].map(stream => new Promise((ok, fail) => { stream.on('error', fail); stream.end(ok); })));
}

function convertValue(header, value, issues) {
  if (value === '') return null;
  if (PERCENT_FIELDS.has(header)) {
    const cleaned = value.endsWith('%') ? value.slice(0, -1) : value;
    const n = Number(cleaned);
    if (!Number.isFinite(n)) { issues.push({ type: 'invalid_percent', field: header, value }); return value; }
    return value.endsWith('%') ? n / 100 : n;
  }
  if (INTEGER_FIELDS.has(header)) {
    const n = Number(value);
    if (!Number.isInteger(n)) { issues.push({ type: 'invalid_integer', field: header, value }); return value; }
    return n;
  }
  // `Eliminated` is a count in win/loss summaries but a player label in round kill logs.
  if (header === 'Eliminated' && /^-?\d+$/.test(value)) return Number(value);
  if (NUMBER_FIELDS.has(header)) {
    const cleaned = value.replace(/k$/i, '');
    const n = Number(cleaned);
    if (!Number.isFinite(n)) { issues.push({ type: 'invalid_number', field: header, value }); return value; }
    return /k$/i.test(value) ? n * 1000 : n;
  }
  return value;
}

async function listCsv(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await listCsv(path));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.csv')) found.push(path);
  }
  return found.sort();
}
function datasetName(path) { return path.slice(path.lastIndexOf(sep) + 1, -4); }

const players = new Map(), teams = new Map(), tournaments = new Map(), stages = new Map(), matchTypes = new Map(), matches = new Map(), games = new Map(), maps = new Map(), agents = new Map();
const playerByName = new Map(), teamByName = new Map(), playerByYearName = new Map(), teamByYearName = new Map(), tournamentByContext = new Map(), stageByContext = new Map(), matchTypeByContext = new Map(), matchByContext = new Map(), gameByContext = new Map();
const teamAliases = new Map();

const PLAYER_TEAM_FIELD = {
  kills: { Player: 'Player Team', Enemy: 'Enemy Team' },
  rounds_kills: { Eliminator: 'Eliminator Team', Eliminated: 'Eliminated Team' },
  overview: { Player: 'Team' }, kills_stats: { Player: 'Team' }, players_stats: { Player: 'Teams' }
};

function entity(map, id, label, extra = {}) {
  const key = String(id); const prev = map.get(key);
  if (!prev) map.set(key, { id: key, name: label, ...extra });
  else {
    prev.aliases ??= [];
    if (label && label !== prev.name && !prev.aliases.includes(label)) prev.aliases.push(label);
    Object.assign(prev, Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== null && v !== undefined)));
  }
}

async function loadIndexes(files) {
  for (const path of files.filter(p => /(?:^|[\\/])all_ids[\\/]|[\\/]ids[\\/]/.test(p))) {
    const name = datasetName(path);
    if (!['all_players_ids','players_ids','all_teams_ids','teams_ids','all_teams_mapping','team_mapping','all_tournaments_stages_match_types_ids','tournaments_stages_match_types_ids','all_matches_games_ids','tournaments_stages_matches_games_ids'].includes(name)) continue;
    await readCsv(path, async row => {
      const year = parseYear(path, row);
      if (row['Player ID']) { entity(players, row['Player ID'], row.Player); addIndex(playerByName, row.Player, row['Player ID']); if (year !== 'global') addIndex(playerByYearName, composite(year,row.Player), row['Player ID']); }
      if (row['Team ID']) { entity(teams, row['Team ID'], row.Team); addIndex(teamByName, row.Team, row['Team ID']); if (year !== 'global') addIndex(teamByYearName, composite(year,row.Team), row['Team ID']); }
      if (row.Abbreviated && row['Full Name']) teamAliases.set(norm(row.Abbreviated), row['Full Name']);
      if (row['Tournament ID']) {
        entity(tournaments, row['Tournament ID'], row.Tournament, { years: [] });
        const t = tournaments.get(String(row['Tournament ID'])); if (!t.years.includes(Number(year))) t.years.push(Number(year));
        tournamentByContext.set(composite(year, row.Tournament), String(row['Tournament ID']));
      }
      if (row['Stage ID']) {
        entity(stages, row['Stage ID'], row.Stage, { tournamentId: String(row['Tournament ID']) });
        stageByContext.set(composite(year, row.Tournament, row.Stage), String(row['Stage ID']));
      }
      if (row['Match Type ID']) {
        entity(matchTypes, row['Match Type ID'], row['Match Type'], { stageId: String(row['Stage ID']) });
        matchTypeByContext.set(composite(year, row.Tournament, row.Stage, row['Match Type']), String(row['Match Type ID']));
      }
      if (row['Match ID']) {
        entity(matches, row['Match ID'], row['Match Name'], { year: Number(year), tournamentId: String(row['Tournament ID']), stageId: String(row['Stage ID']), matchTypeId: matchTypeByContext.get(composite(year,row.Tournament,row.Stage,row['Match Type'])) ?? null });
        matchByContext.set(composite(year,row.Tournament,row.Stage,row['Match Type'],row['Match Name']), String(row['Match ID']));
      }
      if (row['Game ID']) {
        entity(games, row['Game ID'], row.Map, { matchId: String(row['Match ID']), mapId: slug(row.Map) });
        gameByContext.set(composite(year,row.Tournament,row.Stage,row['Match Type'],row['Match Name'],row.Map), String(row['Game ID']));
      }
    });
  }
  for (const [alias, full] of teamAliases) {
    const resolved = resolveIndex(teamByName, full);
    if (resolved.status === 'resolved') addIndex(teamByName, alias, resolved.id);
  }
}

function tournamentLabelVariants(label) {
  const values = [label];
  const vct = label?.replace(/^Champions Tour (\d{4}):/i, 'VCT $1:');
  if (vct && vct !== label) values.push(vct);
  return values;
}
function resolveContext(row, year, rules) {
  const resolution = {};
  const tournamentVariant = tournamentLabelVariants(row.Tournament).find(label => tournamentByContext.has(composite(year,label)));
  let tournamentId = tournamentVariant ? tournamentByContext.get(composite(year,tournamentVariant)) : null;
  if (tournamentVariant && tournamentVariant !== row.Tournament) resolution.tournamentId = { status: 'alias', source: row.Tournament, canonical: tournamentVariant };
  if (!tournamentId && row.Tournament) {
    tournamentId = syntheticId('tournament', year, row.Tournament);
    entity(tournaments, tournamentId, row.Tournament, { years: [Number(year)], resolutionStatus: 'synthetic' });
    resolution.tournamentId = { status: 'synthetic', source: row.Tournament };
  }
  const tournamentLabel = tournamentVariant ?? row.Tournament;

  let stageId = stageByContext.get(composite(year,tournamentLabel,row.Stage)) ?? null;
  if (!stageId && row.Stage) {
    if (norm(row.Stage) === 'all stages') stageId = 'aggregate:stage:all';
    else stageId = syntheticId('stage', year, tournamentId, row.Stage);
    entity(stages, stageId, row.Stage, { tournamentId, resolutionStatus: stageId.startsWith('aggregate:') ? 'aggregate' : 'synthetic' });
    resolution.stageId = { status: stageId.startsWith('aggregate:') ? 'aggregate' : 'synthetic', source: row.Stage };
  }

  let matchTypeId = matchTypeByContext.get(composite(year,tournamentLabel,row.Stage,row['Match Type'])) ?? null;
  if (!matchTypeId && row['Match Type']) {
    if (norm(row['Match Type']) === 'all match types') matchTypeId = 'aggregate:match-type:all';
    else matchTypeId = syntheticId('match-type', year, stageId, row['Match Type']);
    entity(matchTypes, matchTypeId, row['Match Type'], { stageId, resolutionStatus: matchTypeId.startsWith('aggregate:') ? 'aggregate' : 'synthetic' });
    resolution.matchTypeId = { status: matchTypeId.startsWith('aggregate:') ? 'aggregate' : 'synthetic', source: row['Match Type'] };
  }

  let matchId = matchByContext.get(composite(year,tournamentLabel,row.Stage,row['Match Type'],row['Match Name'])) ?? null;
  if (!matchId && row['Match Name']) {
    matchId = syntheticId('match', year, tournamentId, stageId, matchTypeId, row['Match Name']);
    entity(matches, matchId, row['Match Name'], { year: Number(year), tournamentId, stageId, matchTypeId, resolutionStatus: 'synthetic' });
    resolution.matchId = { status: 'synthetic', source: row['Match Name'] };
  }

  let mapId = null;
  if (row.Map) mapId = row.Map === 'All Maps' ? 'aggregate:map:all' : slug(row.Map);
  const wantsGame = Boolean(rules.game || row['Game ID']);
  let gameId = wantsGame ? gameByContext.get(composite(year,tournamentLabel,row.Stage,row['Match Type'],row['Match Name'],row.Map)) ?? null : null;
  if (wantsGame && !gameId && row['Match Name'] && row.Map && row.Map !== 'All Maps') {
    gameId = syntheticId('game', year, matchId, row.Map);
    entity(games, gameId, row.Map, { matchId, mapId, resolutionStatus: 'synthetic' });
    resolution.gameId = { status: 'synthetic', source: row.Map };
  }
  const refs = {
    tournamentId, stageId, matchTypeId, matchId, gameId, mapId,
    agentIds: row.Agents ? row.Agents.split(',').map(v => slug(v)).filter(Boolean) : row.Agent ? [slug(row.Agent)] : null
  };
  if (Object.keys(resolution).length) refs._resolution = resolution;
  return refs;
}

function collectTaxonomy(row) {
  if (row.Map && row.Map !== 'All Maps') entity(maps, slug(row.Map), row.Map);
  for (const field of ['Agent','Agents','Eliminator Agent','Eliminated Agent']) {
    if (!row[field]) continue;
    for (const label of row[field].split(',').map(v => v.trim()).filter(Boolean)) entity(agents, slug(label), label);
  }
}

function resolvePlayer(year, label) {
  const yearly = resolveIndex(playerByYearName, composite(year, label));
  return yearly.status === 'unresolved' ? resolveIndex(playerByName, label) : yearly;
}
function resolveTeam(year, label) {
  const yearly = resolveIndex(teamByYearName, composite(year, label));
  return yearly.status === 'unresolved' ? resolveIndex(teamByName, label) : yearly;
}
function scopedTeamId(year, tournamentId, label, resolved) {
  if (norm(label) === 'tbd') return 'placeholder:team:tbd';
  return syntheticId('team', year, tournamentId, label);
}
function scopedPlayerId(year, teamScope, label) {
  return syntheticId('player', year, teamScope, label);
}

async function transform(files) {
  for (const path of files) {
    const dataset = datasetName(path); const rules = DATASET_RULES[dataset] ?? {};
    const rel = relative(ROOT, path); const yearFromPath = parseYear(path, {});
    counters.inputFiles++;
    counters.byDataset[dataset] ??= { files: 0, inputRows: 0, outputRows: 0, quarantined: 0 };
    counters.byDataset[dataset].files++;
    await readCsv(path, async (row, line, headers) => {
      counters.inputRows++; counters.byDataset[dataset].inputRows++;
      const year = parseYear(path, row); const issues = [];
      collectTaxonomy(row);
      const values = Object.fromEntries(headers.map(h => [keyName(h), convertValue(h, row[h], issues)]));
      const refs = resolveContext(row, year, rules);
      refs.teamIds = {};
      for (const field of rules.team ?? []) {
        let label = row[field]; if (!label) continue;
        const labels = field === 'Teams' ? label.split(',').map(v => v.trim()).filter(Boolean) : [label];
        const resolvedIds = [];
        for (const originalLabel of labels) {
          const normalizedLabel = teamAliases.get(norm(originalLabel)) ?? originalLabel;
          const resolved = resolveTeam(year, normalizedLabel);
          let resolvedId = resolved.id;
          if (resolved.status !== 'resolved') {
            const reason = `${resolved.status}_team`;
            counters[resolved.status === 'ambiguous' ? 'ambiguousRefs' : 'unresolvedRefs'].team = (counters[resolved.status === 'ambiguous' ? 'ambiguousRefs' : 'unresolvedRefs'].team ?? 0) + 1;
            resolvedId = scopedTeamId(year, refs.tournamentId, normalizedLabel, resolved);
            entity(teams, resolvedId, originalLabel, { resolutionStatus: norm(originalLabel) === 'tbd' ? 'placeholder' : 'synthetic', year: Number(year), tournamentId: refs.tournamentId, canonicalCandidateIds: resolved.candidates ?? [] });
            issues.push({ type: reason, field, value: originalLabel, normalizedValue: normalizedLabel, candidates: resolved.candidates, assignedId: resolvedId });
          }
          resolvedIds.push(resolvedId);
        }
        refs.teamIds[keyName(field)] = field === 'Teams' ? resolvedIds : resolvedIds[0];
      }
      refs.playerIds = {};
      for (const field of rules.player ?? []) {
        const label = row[field]; if (!label) continue;
        const resolved = resolvePlayer(year, label);
        let resolvedId = resolved.id;
        if (resolved.status !== 'resolved') {
          const reason = `${resolved.status}_player`;
          counters[resolved.status === 'ambiguous' ? 'ambiguousRefs' : 'unresolvedRefs'].player = (counters[resolved.status === 'ambiguous' ? 'ambiguousRefs' : 'unresolvedRefs'].player ?? 0) + 1;
          const teamField = PLAYER_TEAM_FIELD[dataset]?.[field];
          const teamRef = teamField ? refs.teamIds[keyName(teamField)] : null;
          const teamScope = Array.isArray(teamRef) ? teamRef.join('+') : teamRef ?? refs.tournamentId;
          resolvedId = scopedPlayerId(year, teamScope, label);
          entity(players, resolvedId, label, { resolutionStatus: 'synthetic', year: Number(year), teamScope, canonicalCandidateIds: resolved.candidates ?? [] });
          issues.push({ type: reason, field, value: label, candidates: resolved.candidates, assignedId: resolvedId });
        }
        refs.playerIds[keyName(field)] = resolvedId;
      }

      const record = { _source: { file: rel, line }, year: year === 'global' ? null : Number(year), refs, values };
      const bucket = yearFromPath === 'global' ? 'global' : year;
      await writeLine(outputStreams, join(DATA, bucket, `${dataset}.jsonl`), record);
      counters.outputRows++; counters.byDataset[dataset].outputRows++;
      if (issues.length) {
        counters.byDataset[dataset].quarantined++;
        await quarantineRecord({ source: record._source, dataset, year: record.year, issues, values });
      }
    });
  }
}

async function main() {
  await rm(DATA, { recursive: true, force: true });
  await rm(QUARANTINE, { recursive: true, force: true });
  const files = await listCsv(INPUT);
  await loadIndexes(files);
  entity(maps, 'aggregate:map:all', 'All Maps', { resolutionStatus: 'aggregate' });
  await transform(files);
  await closeStreams(outputStreams); await closeStreams(quarantineStreams);

  const sortEntities = map => [...map.values()].map(v => ({ ...v, years: v.years?.sort((a,b)=>a-b), aliases: v.aliases?.sort() })).sort((a,b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
  await writeJson(join(DATA, 'entities', 'players.json'), { schemaVersion: 1, players: sortEntities(players) });
  await writeJson(join(DATA, 'entities', 'teams.json'), { schemaVersion: 1, teams: sortEntities(teams), aliases: Object.fromEntries([...teamAliases].sort()) });
  await writeJson(join(DATA, 'entities', 'competition.json'), { schemaVersion: 1, tournaments: sortEntities(tournaments), stages: sortEntities(stages), matchTypes: sortEntities(matchTypes), matches: sortEntities(matches), games: sortEntities(games) });
  await writeJson(join(DATA, 'entities', 'taxonomy.json'), { schemaVersion: 1, maps: sortEntities(maps), agents: sortEntities(agents) });

  const sizes = {};
  for (const path of await listOutput(DATA)) sizes[relative(OUTPUT,path).replaceAll('\\','/')] = (await stat(path)).size;
  const countStatus = map => ({ canonical: [...map.values()].filter(v => !v.resolutionStatus).length, synthetic: [...map.values()].filter(v => v.resolutionStatus === 'synthetic').length, aggregate: [...map.values()].filter(v => v.resolutionStatus === 'aggregate').length, placeholder: [...map.values()].filter(v => v.resolutionStatus === 'placeholder').length });
  const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), sourceRoot: relative(ROOT,INPUT), counters, entityCounts: { players: players.size, teams: teams.size, tournaments: tournaments.size, stages: stages.size, matchTypes: matchTypes.size, matches: matches.size, games: games.size, maps: maps.size, agents: agents.size }, entityResolution: { players: countStatus(players), teams: countStatus(teams), tournaments: countStatus(tournaments), stages: countStatus(stages), matchTypes: countStatus(matchTypes), matches: countStatus(matches), games: countStatus(games) }, outputBytes: Object.values(sizes).reduce((a,b)=>a+b,0), files: sizes };
  await writeJson(join(OUTPUT, 'validation-report.json'), report);
  await writeJson(join(OUTPUT, 'manifest.json'), { schemaVersion: 1, generatedAt: report.generatedAt, format: 'JSON Lines (one lossless normalized CSV row per line)', entityFiles: ['data/entities/players.json','data/entities/teams.json','data/entities/competition.json','data/entities/taxonomy.json'], years: ['2021','2022','2023','2024','2025','2026'], validationReport: 'validation-report.json', quarantineDirectory: 'quarantine' });
  process.stdout.write(JSON.stringify({ output: OUTPUT, ...report.counters, entityCounts: report.entityCounts, outputBytes: report.outputBytes }, null, 2) + '\n');
}
async function listOutput(dir) {
  const found=[]; for (const entry of await readdir(dir,{withFileTypes:true})) { const p=join(dir,entry.name); if(entry.isDirectory()) found.push(...await listOutput(p)); else found.push(p); } return found;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
