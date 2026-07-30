import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { quickSim } from '../../src/core/season.js';
import { LEAGUES } from '../../src/data/leagues.js';

applyRealStats();
buildAgentPools();
const [home,away]=LEAGUES.AMER.teams;
const seed='repro-test-2026';
const first=quickSim(home,away,seed);
const replay=quickSim(home,away,seed);
const alternate=quickSim(home,away,'different-seed');
const sameSeedIdentical=JSON.stringify(first)===JSON.stringify(replay);
const differentSeedChanged=JSON.stringify(first)!==JSON.stringify(alternate);
console.log(JSON.stringify({sameSeedIdentical,differentSeedChanged,first,replay,alternate},null,2));
if(!sameSeedIdentical||!differentSeedChanged)process.exitCode=1;
