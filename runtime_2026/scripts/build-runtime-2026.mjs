import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEAGUES } from '../../src/data/leagues.js';
import { AGENTS, AGENT_ROLE } from '../../src/data/agents.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const config = read('runtime_2026/config.json');
const years = Object.keys(config.attributeYearWeights.default).map(Number).sort();
const stats = Object.fromEntries(years.map(y => [y, read(`stat_json/data/players/${y}.json`).players]));
const rosters = read('profile_json/data/rosters/2026.json').rosters;
const teamEntities = read('vct_json/data/entities/teams.json').teams;
const playerEntities = read('vct_json/data/entities/players.json').players;

const norm = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const round = (v, n = 2) => Number(Number(v).toFixed(n));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const scale = p => Math.round(config.scale.minimum + clamp(p, 0, 1) * (config.scale.maximum - config.scale.minimum));
const canonicalAgent = new Map(Object.values(AGENTS).flat().map(a => [norm(a), a]));
const entityNames = new Map(playerEntities.map(p => [String(p.id), p.name]));
const canonicalTeamScopes = new Map();
for (const entity of playerEntities.filter(p=>!String(p.id).startsWith('synthetic:'))) {
  const scopes=new Set();
  years.forEach(year=>(stats[year][String(entity.id)]?.teamIds||[]).forEach(id=>scopes.add(String(id))));
  canonicalTeamScopes.set(String(entity.id),scopes);
}
const identityAliases = new Map();
for (const entity of playerEntities.filter(p=>p.resolutionStatus==='synthetic'&&p.canonicalCandidateIds?.length)) {
  const matching=entity.canonicalCandidateIds.map(String).filter(id=>canonicalTeamScopes.get(id)?.has(String(entity.teamScope)));
  if(matching.length===1){const id=matching[0];if(!identityAliases.has(id))identityAliases.set(id,[]);identityAliases.get(id).push(String(entity.id));}
}
function statRecord(playerId,year){
  const ids=[String(playerId),...(identityAliases.get(String(playerId))||[])];
  return ids.map(id=>stats[year][id]).filter(Boolean).sort((a,b)=>(b.sample?.rounds||0)-(a.sample?.rounds||0))[0]||null;
}

function findTeam(team) {
  const wanted = new Set([team.name, team.short].map(norm));
  const matches = teamEntities.filter(e => [e.name, ...(e.aliases || [])].some(n => wanted.has(norm(n))));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    const projectNames = new Set((team.registered || [...team.roster, ...(team.bench || [])]).map(p => norm(p.name)));
    const ranked = matches.map(entity => {
      const ids = Object.keys(rosters[String(entity.id)]?.players || {});
      const overlap = ids.filter(id => projectNames.has(norm(stats[2026][id]?.name || entityNames.get(id)))).length;
      const rounds = ids.reduce((sum, id) => sum + (rosters[String(entity.id)]?.players?.[id]?.rounds || 0), 0);
      return { entity, overlap, rounds };
    }).sort((a, b) => b.overlap - a.overlap || b.rounds - a.rounds);
    if (ranked[0].overlap > ranked[1].overlap || ranked[0].rounds > ranked[1].rounds) return ranked[0].entity;
  }
  return null;
}

function playerCandidates(teamId, name) {
  const wanted = norm(name);
  const ids = Object.keys(rosters[String(teamId)]?.players || {});
  const inRoster = ids.filter(id => norm(stats[2026][id]?.name || entityNames.get(id)) === wanted);
  if (inRoster.length) return choosePlayer(inRoster, teamId);
  const current = Object.values(stats[2026]).filter(p => norm(p.name) === wanted && p.teamIds?.includes(String(teamId))).map(p => String(p.id));
  if (current.length) return choosePlayer(current, teamId);
  const entity = playerEntities.filter(p => norm(p.name) === wanted).map(p => String(p.id));
  return choosePlayer(entity.filter(id => years.some(y => stats[y][id])), teamId);
}

function choosePlayer(ids, teamId) {
  const unique = [...new Set(ids)];
  if (unique.length < 2) return unique;
  const ranked = unique.map(id => {
    const current = stats[2026][id];
    const score = (current?.identityStatus === 'canonical' ? 1_000_000 : 0)
      + (current?.teamIds?.includes(String(teamId)) ? 100_000 : 0)
      + (current?.sample?.rounds || 0);
    return { id, score };
  }).sort((a, b) => b.score - a.score);
  return ranked[0].score > ranked[1].score ? [ranked[0].id] : ranked.filter(x => x.score === ranked[0].score).map(x => x.id);
}

function weightedPercentile(observations, priorRounds, cap) {
  let weight = priorRounds;
  let total = priorRounds * 0.5;
  for (const o of observations) {
    const w = Math.min(o.rounds || 0, cap) * o.yearWeight * (o.confidence ?? 1);
    if (!(w > 0) || !Number.isFinite(o.percentile)) continue;
    total += o.percentile * w;
    weight += w;
  }
  return { percentile: total / weight, evidenceRounds: weight - priorRounds, reliability: (weight - priorRounds) / weight };
}

function blendAttributes(playerId) {
  const result = {};
  const reliability = {};
  const contributions = {};
  const attributeNames = Object.keys(statRecord(playerId,2026)?.attributes || statRecord(playerId,years.find(y=>statRecord(playerId,y)))?.attributes || {});
  for (const attr of attributeNames) {
    const weights = config.attributeYearWeights[attr] || config.attributeYearWeights.default;
    const obs = years.flatMap(year => {
      const a = statRecord(playerId,year)?.attributes?.[attr];
      const percentile = a?.evidence?.compositePercentile;
      return Number.isFinite(percentile) ? [{ year, percentile, rounds: a.sampleRounds, confidence: a.reliability > 0 ? 1 : 0, yearWeight: weights[year] || 0 }] : [];
    });
    const b = weightedPercentile(obs, config.neutralPriorRounds.attribute, config.evidenceCaps.attributeRounds);
    const floorConfig=config.provenAbilityFloor;
    const provenFloor=floorConfig.attributes.includes(attr)?Math.max(...obs.filter(o=>o.rounds>=floorConfig.minimumRounds&&floorConfig.seasonPenalty[o.year]!==undefined).map(o=>o.percentile-floorConfig.seasonPenalty[o.year]),-Infinity):-Infinity;
    const finalPercentile=Math.max(b.percentile,provenFloor);
    result[attr] = scale(finalPercentile);
    reliability[attr] = round(b.reliability, 3);
    contributions[attr] = obs.map(o => ({ year: o.year, rounds: o.rounds, weight: o.yearWeight }));
  }
  return { values: result, reliability, contributions };
}

function priorAttributeValue(playerId, attr) {
  const weights = config.attributeYearWeights[attr] || config.attributeYearWeights.default;
  const obs = years.filter(y => y < 2026).flatMap(year => {
    const a = statRecord(playerId,year)?.attributes?.[attr];
    return Number.isFinite(a?.evidence?.compositePercentile) ? [{ percentile: a.evidence.compositePercentile, rounds: a.sampleRounds, yearWeight: weights[year] || 0 }] : [];
  });
  return obs.length ? scale(weightedPercentile(obs, config.neutralPriorRounds.attribute, config.evidenceCaps.attributeRounds).percentile) : null;
}

function blendValueGroup(playerId, group, yearWeights, cap, prior, percentileKey = 'performancePercentile') {
  const keys = new Set();
  years.forEach(y => Object.keys(statRecord(playerId,y)?.mastery?.[group] || {}).forEach(k => keys.add(k)));
  const out = {};
  for (const key of keys) {
    const obs = years.flatMap(year => {
      const item = statRecord(playerId,year)?.mastery?.[group]?.[key];
      const percentile = item?.[percentileKey] ?? (Number.isFinite(item?.value) ? (item.value - config.scale.minimum) / (config.scale.maximum - config.scale.minimum) : null);
      return Number.isFinite(percentile) ? [{ year, percentile, rounds: item.rounds, yearWeight: yearWeights[year] || 0 }] : [];
    });
    const b = weightedPercentile(obs, prior, cap);
    const lastObservedYear = Math.max(...obs.filter(o => o.rounds > 0).map(o => o.year));
    out[key] = { value: scale(b.percentile), reliability: round(b.reliability, 3), evidenceRounds: Math.round(b.evidenceRounds), lastObservedYear };
  }
  return out;
}

function blendTendencies(playerId) {
  const keys = new Set();
  years.forEach(y => Object.keys(statRecord(playerId,y)?.tendencies || {}).forEach(k => keys.add(k)));
  const out = {};
  for (const key of keys) {
    let total = 0, weight = 0;
    years.forEach(year => {
      const record=statRecord(playerId,year),t = record?.tendencies?.[key];
      const w = (config.attributeYearWeights.default[year] || 0) * Math.min(record?.sample?.rounds || 0, 1000) * (t?.reliability || 0);
      if (Number.isFinite(t?.value) && w > 0) { total += t.value * w; weight += w; }
    });
    out[key] = weight ? Math.round(total / weight) : config.scale.neutral;
  }
  return out;
}

function buildRoleProficiencies(playerId) {
  const usage = {};
  for (const year of years) {
    const record=statRecord(playerId,year);
    for (const [role,item] of Object.entries(record?.mastery?.roles||{})) {
      if (!usage[role]) usage[role]={experienceRounds:0,deploymentRounds:0,observedRounds:0,lastObservedYear:year,agents:{}};
      const rounds=item.rounds||0;
      usage[role].experienceRounds+=rounds*(config.roleExperienceYearWeights[year]||0);
      usage[role].deploymentRounds+=rounds*(config.roleYearWeights[year]||0);
      usage[role].observedRounds+=rounds;
      if(rounds>0)usage[role].lastObservedYear=Math.max(usage[role].lastObservedYear,year);
    }
    for(const [agentId,item] of Object.entries(record?.mastery?.agents||{})){
      const canonical=canonicalAgent.get(norm(agentId)),role=AGENT_ROLE[canonical];if(!role||!usage[role])continue;
      usage[role].agents[agentId]=(usage[role].agents[agentId]||0)+(item.rounds||0)*(config.roleExperienceYearWeights[year]||0);
    }
  }
  const total = Object.values(usage).reduce((sum,x)=>sum+x.deploymentRounds,0);
  const recency={2026:1,2025:.9,2024:.8,2023:.65};
  return Object.fromEntries(Object.entries(usage).map(([role, x]) => {
    const share=total?x.deploymentRounds/total:0;
    const experience=1-Math.exp(-x.experienceRounds/config.roleExperienceSaturationRounds);
    const qualifiedAgents=Object.values(x.agents).filter(rounds=>rounds>=config.roleAgentMinimumRounds).length;
    const breadth=Math.min(1,qualifiedAgents/3),recent=recency[x.lastObservedYear]||0;
    const gameProficiency=clamp(Math.round(3+12*experience+3*breadth+2*recent),1,20);
    return [role,{value:clamp(gameProficiency*5,20,99),reliability:round(experience,3),evidenceRounds:Math.round(x.experienceRounds),observedRounds:x.observedRounds,usageShare:round(share,4),qualifiedAgents,lastObservedYear:x.lastObservedYear,gameProficiency}];
  }));
}

const legacyWeights = {
  aim: { firepower: .38, combatEfficiency: .32, explosiveness: .18, entry: .12 },
  sense: { positioning: .38, tactical: .22, teamplay: .18, consistency: .12, adaptability: .10 },
  clutch: { clutch: .50, pressure: .30, combatEfficiency: .12, consistency: .08 },
  util: { tactical: .38, teamplay: .30, adaptability: .20, positioning: .12 },
  mental: { consistency: .42, pressure: .30, positioning: .18, adaptability: .10 }
};
const deriveLegacy = attrs => Object.fromEntries(Object.entries(legacyWeights).map(([axis, weights]) => [axis, Math.round(Object.entries(weights).reduce((s, [a, w]) => s + (attrs[a] ?? 60) * w, 0))]));

const output = { schemaVersion: 1, modelVersion: config.modelVersion, targetYear: 2026, generatedAt: new Date().toISOString(), players: {}, report: { teams: 0, projectPlayers: 0, matched: 0, unmatchedTeams: [], unmatchedPlayers: [], ambiguousPlayers: [] } };

for (const [leagueId, league] of Object.entries(LEAGUES)) for (const team of league.teams) {
  output.report.teams++;
  const rosterTeamId = team.registered?.[0]?.teamId || team.roster[0]?.teamId || team.bench?.[0]?.teamId;
  const entity = (rosterTeamId && teamEntities.find(t => String(t.id) === String(rosterTeamId))) || findTeam(team);
  if (!entity) output.report.unmatchedTeams.push({ leagueId, short: team.short, name: team.name });
  for (const pl of (team.registered || [...team.roster, ...(team.bench || [])])) {
    output.report.projectPlayers++;
    const key = `${leagueId}:${team.short}:${norm(pl.name)}`;
    const seededPlayerId = pl.playerId && years.some(y => stats[y][String(pl.playerId)]) ? String(pl.playerId) : null;
    const candidates = seededPlayerId ? [seededPlayerId] : (entity ? playerCandidates(entity.id, pl.name) : []);
    if (candidates.length !== 1) {
      const bucket = candidates.length ? output.report.ambiguousPlayers : output.report.unmatchedPlayers;
      bucket.push({ key, teamId: entity?.id ?? null, name: pl.name, candidates });
      continue;
    }
    const playerId = candidates[0];
    const attrs = blendAttributes(playerId);
    const currentRecord=statRecord(playerId,2026);
    const current = Object.fromEntries(Object.entries(currentRecord?.attributes || {}).map(([a, v]) => [a, v.value]));
    const formByAttribute = {};
    for (const [attr, value] of Object.entries(current)) {
      const prior = priorAttributeValue(playerId, attr);
      const rel = currentRecord?.attributes?.[attr]?.reliability || 0;
      formByAttribute[attr] = prior == null ? 0 : clamp(Math.round((value - prior) * rel * config.form.conversion), -config.form.maximumAdjustment, config.form.maximumAdjustment);
    }
    const formAdjustment = Math.round(Object.values(formByAttribute).reduce((s, v) => s + v, 0) / Math.max(1, Object.keys(formByAttribute).length));
    const applied = Object.fromEntries(Object.entries(attrs.values).map(([a, v]) => [a, clamp(v + (formByAttribute[a] || 0), 20, 99)]));
    const agents = blendValueGroup(playerId, 'agents', config.agentYearWeights, config.evidenceCaps.agentRounds, config.neutralPriorRounds.agent);
    const currentAgentRounds = currentRecord?.mastery?.agents || {};
    const total2026AgentRounds = Object.values(currentAgentRounds).reduce((s, a) => s + (a.rounds || 0), 0);
    const agentMastery = Object.entries(agents).filter(([agentId,a])=>a.lastObservedYear>=config.agentHistoryMinimumYear&&(a.evidenceRounds>=config.agentMinimumEvidenceRounds||(currentAgentRounds[agentId]?.rounds||0)>=40)).map(([agentId, a]) => {
      const canonical = canonicalAgent.get(norm(agentId)) || agentId;
      const penalty = config.agentInactivityPenalty[a.lastObservedYear] ?? 8;
      const readiness = clamp(a.value - penalty, 20, 99);
      return { agentId, agent: canonical, role: AGENT_ROLE[canonical] || null, mastery: a.value, readiness, gameMastery: clamp(Math.round(readiness / 5), 8, 20), reliability: a.reliability, lastObservedYear: a.lastObservedYear, usage2026: round((currentAgentRounds[agentId]?.rounds || 0) / Math.max(1, total2026AgentRounds), 4) };
    }).sort((a, b) => b.readiness - a.readiness || b.reliability - a.reliability);
    const roles = buildRoleProficiencies(playerId);
    const maps = blendValueGroup(playerId, 'maps', config.mapYearWeights, config.evidenceCaps.mapRounds, config.neutralPriorRounds.map);
    const primaryRole = Object.entries(roles).sort((a,b)=>b[1].usageShare-a[1].usageShare||b[1].gameProficiency-a[1].gameProficiency)[0]?.[0] || currentRecord?.primaryRole || pl.role;
    output.players[key] = {
      playerId, name: currentRecord?.name || entityNames.get(playerId) || pl.name,
      teamId: String(entity.id), teamName: entity.name, leagueId, rosterStatus: 'registered', primaryRole,
      sample2026: currentRecord?.sample || { rounds: 0, maps: 0, reliability: 0 },
      baseAttributes: attrs.values, appliedAttributes: applied, season2026Attributes: current,
      attributeReliability: attrs.reliability, attributeContributions: attrs.contributions,
      form: { adjustment: formAdjustment, byAttribute: formByAttribute }, tendencies: blendTendencies(playerId),
      roleMastery: roles,
      mapMastery: maps, agentMastery, legacy: deriveLegacy(applied)
    };
    output.report.matched++;
  }
}

fs.mkdirSync(path.join(root, 'src/data'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/data/player-runtime-2026.json'), JSON.stringify(output, null, 2) + '\n');
fs.mkdirSync(path.join(root, 'runtime_2026/data'), { recursive: true });
fs.writeFileSync(path.join(root, 'runtime_2026/data/match-report.json'), JSON.stringify(output.report, null, 2) + '\n');
console.log(JSON.stringify(output.report, null, 2));
