import { createEconomyState, resetEconomyForRound, settleEconomy } from '../../src/core/economy.js';
import { ECONOMY_MODEL } from '../../src/core/economy-model.js';
import { simulateMatch } from '../../src/core/match-engine.js';
import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { LEAGUES } from '../../src/data/leagues.js';

const state=createEconomyState(0),lossIncome=[];
for(let i=0;i<4;i++){const before=state.credits;const result=settleEconomy(state,{won:false});lossIncome.push(result.income);state.credits=0;}
const expectedLoss=[1900,2400,2900,2900];
const halftime=createEconomyState(7000);halftime.lossStreak=2;resetEconomyForRound(halftime,12);
const overtime=createEconomyState(0);resetEconomyForRound(overtime,24);
const capped=createEconomyState(8900);settleEconomy(capped,{won:true,planted:true});

applyRealStats();buildAgentPools();const [home,away]=LEAGUES.AMER.teams;
const match=simulateMatch({home,away,seed:'economy-verification',bestOf:3});
const rounds=match.mapResults.flatMap(map=>map.rounds),snapshots=rounds.flatMap(round=>[round.economy?.home,round.economy?.away]);
const roundLogsComplete=snapshots.every(e=>e&&e.before>=0&&e.afterBuy>=0&&e.after>=0&&e.after<=ECONOMY_MODEL.creditCap);
const passed=JSON.stringify(lossIncome)===JSON.stringify(expectedLoss)&&halftime.credits===800&&halftime.lossStreak===0&&overtime.credits===5000&&capped.credits===9000&&roundLogsComplete;
console.log(JSON.stringify({passed,lossIncome,expectedLoss,halftime,overtime,capped,matchRounds:rounds.length,roundLogsComplete},null,2));
if(!passed)process.exitCode=1;
