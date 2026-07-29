import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEAGUES } from '../../src/data/leagues.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const source = read('profile_json/data/rosters/2026.json').rosters;
const teams = read('vct_json/data/entities/teams.json').teams;
const players = read('vct_json/data/entities/players.json').players;
const stats = read('stat_json/data/players/2026.json').players;
const model = read('stat_json/config/rating-model.json');
const runtimeConfig = read('runtime_2026/config.json');
const playerNames = new Map(players.map(p => [String(p.id), p.name]));
const norm = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

function resolveTeam(team) {
  const wanted = new Set([team.name, team.short].map(norm));
  const candidates = teams.filter(t => [t.name, ...(t.aliases || [])].some(n => wanted.has(norm(n))));
  const named = candidates.map(t => ({
    team: t,
    rounds: Object.values(source[String(t.id)]?.players || {}).reduce((sum, p) => sum + (p.rounds || 0), 0)
  })).sort((a, b) => b.rounds - a.rounds)[0];
  if (named?.rounds > 0) return named.team;
  const projectNames = new Set([...team.roster, ...(team.bench || [])].map(p => norm(p.name)));
  const byRoster = Object.entries(source).map(([teamId, roster]) => {
    const ids = Object.keys(roster.players || {});
    const overlap = ids.filter(id => projectNames.has(norm(stats[id]?.name || playerNames.get(id)))).length;
    const rounds = Object.values(roster.players || {}).reduce((sum, p) => sum + (p.rounds || 0), 0);
    return { team: teams.find(t => String(t.id) === String(teamId)), overlap, rounds };
  }).filter(x => x.team).sort((a, b) => b.overlap - a.overlap || b.rounds - a.rounds);
  if (byRoster[0]?.overlap >= 3 && byRoster[0].overlap > (byRoster[1]?.overlap || 0)) return byRoster[0].team;
  return named?.team || null;
}

function inferRole(playerId, record) {
  if (stats[playerId]?.primaryRole) return stats[playerId].primaryRole;
  const roleRounds = { DUE: 0, INI: 0, SEN: 0, CON: 0 };
  for (const [agent, rounds] of Object.entries(record.agents || {})) {
    for (const [role, agents] of Object.entries(model.roles)) if (agents.includes(agent)) roleRounds[role] += rounds;
  }
  return Object.entries(roleRounds).sort((a, b) => b[1] - a[1])[0][0];
}

const output = { schemaVersion: 1, year: 2026, source: 'profile_json/data/rosters/2026.json', activeRule: 'top_5_by_observed_rounds', teams: {} };
for (const [leagueId, league] of Object.entries(LEAGUES)) for (const team of league.teams) {
  const overrideId = runtimeConfig.teamIdOverrides?.[`${leagueId}:${team.short}`];
  const configuredId = team.teamId || overrideId;
  const entity = configuredId ? teams.find(t => String(t.id) === String(configuredId)) : resolveTeam(team);
  if (!entity) throw new Error(`Could not resolve team: ${leagueId}/${team.short}/${team.name}`);
  const observed = Object.entries(source[String(entity.id)]?.players || {}).map(([playerId, record]) => ({
    playerId,
    name: runtimeConfig.displayNameOverrides?.[playerId] || stats[playerId]?.name || playerNames.get(playerId) || playerId,
    role: inferRole(playerId, record),
    rounds: record.rounds || 0,
    maps: record.maps?.length || 0,
    matches: record.matches?.length || 0
  })).sort((a, b) => b.rounds - a.rounds || b.maps - a.maps || a.name.localeCompare(b.name));
  output.teams[`${leagueId}:${team.short}`] = {
    teamId: String(entity.id), teamName: entity.name,
    active: observed.slice(0, 5), bench: observed.slice(5)
  };
}

fs.writeFileSync(path.join(root, 'src/data/game-rosters-2026.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ teams: Object.keys(output.teams).length, active: Object.values(output.teams).reduce((s, t) => s + t.active.length, 0), bench: Object.values(output.teams).reduce((s, t) => s + t.bench.length, 0) }, null, 2));
