import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEAGUES } from '../../src/data/leagues.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'src/data/player-runtime-2026.json'), 'utf8'));
const errors = [];
const expected = Object.values(LEAGUES).reduce((n, l) => n + l.teams.reduce((m, t) => m + (t.registered?.length || t.roster.length + (t.bench?.length || 0)), 0), 0);
const inRange = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;

if (data.targetYear !== 2026) errors.push(`targetYear=${data.targetYear}`);
if (data.report.projectPlayers !== expected) errors.push(`project player count ${data.report.projectPlayers} != ${expected}`);
if (data.report.ambiguousPlayers.length) errors.push(`${data.report.ambiguousPlayers.length} ambiguous player matches`);
if (data.report.unmatchedTeams.length) errors.push(`${data.report.unmatchedTeams.length} unmatched teams`);

for (const [key, p] of Object.entries(data.players)) {
  if (!p.playerId || !p.teamId) errors.push(`${key}: missing canonical ID`);
  for (const [name, value] of Object.entries(p.baseAttributes)) if (!inRange(value, 20, 99)) errors.push(`${key}: base ${name}=${value}`);
  for (const [name, value] of Object.entries(p.appliedAttributes)) if (!inRange(value, 20, 99)) errors.push(`${key}: applied ${name}=${value}`);
  for (const [name, value] of Object.entries(p.legacy)) if (!inRange(value, 20, 99)) errors.push(`${key}: legacy ${name}=${value}`);
  for (const [name, value] of Object.entries(p.attributeReliability)) if (!inRange(value, 0, 1)) errors.push(`${key}: reliability ${name}=${value}`);
  if (!inRange(p.form.adjustment, -8, 8)) errors.push(`${key}: form=${p.form.adjustment}`);
  const roleEntries = Object.entries(p.roleMastery || {});
  if (!roleEntries.length) errors.push(`${key}: missing role mastery`);
  for (const [roleName, role] of roleEntries) {
    if (!inRange(role.gameProficiency, 1, 20)) errors.push(`${key}: role ${roleName} proficiency=${role.gameProficiency}`);
    if (!inRange(role.usageShare, 0, 1)) errors.push(`${key}: role ${roleName} usageShare=${role.usageShare}`);
  }
  for (const agent of p.agentMastery) {
    if (!inRange(agent.mastery, 20, 99) || !inRange(agent.readiness, 20, 99) || !inRange(agent.gameMastery, 8, 20)) errors.push(`${key}: invalid agent mastery ${agent.agent}`);
    if (agent.readiness > agent.mastery) errors.push(`${key}: readiness exceeds mastery ${agent.agent}`);
  }
}

const summary = {
  expectedProjectPlayers: expected,
  matchedPlayers: Object.keys(data.players).length,
  unmatchedPlayers: data.report.unmatchedPlayers,
  ambiguousPlayers: data.report.ambiguousPlayers.length,
  errors: errors.length
};
console.log(JSON.stringify(summary, null, 2));
if (errors.length) {
  console.error(errors.slice(0, 50).join('\n'));
  process.exitCode = 1;
}
