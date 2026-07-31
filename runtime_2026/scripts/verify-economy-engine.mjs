import { createEconomyState, createTeamEconomyState, planTeamBuy, resetEconomyForRound, resetTeamEconomyForRound, settleEconomy, settleTeamEconomy } from '../../src/core/economy.js';
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
const teamEconomy=createTeamEconomyState(home);resetTeamEconomyForRound(teamEconomy,0);
const pistolPlan=planTeamBuy(teamEconomy,home,{isPistol:true,agents:{}});
const survivorUnits=home.roster.map((player,idx)=>({idx,name:player.name,deathT:idx===0?null:1,weapon:pistolPlan.loadouts[idx].weapon,shieldType:pistolPlan.loadouts[idx].shield,finalShield:pistolPlan.loadouts[idx].shieldValue}));
settleTeamEconomy(teamEconomy,{won:true,units:survivorUnits,loadouts:pistolPlan.loadouts});
const carriedWeapon=teamEconomy.players[0].carried?.weapon===pistolPlan.loadouts[0].weapon;
const deadLostWeapons=teamEconomy.players.slice(1).every(player=>player.carried===null);
const match=simulateMatch({home,away,seed:'economy-verification',bestOf:3});
const rounds=match.mapResults.flatMap(map=>map.rounds),snapshots=rounds.flatMap(round=>[round.economy?.home,round.economy?.away]);
const roundLogsComplete=snapshots.every(e=>e&&e.before>=0&&e.afterBuy>=0&&e.after>=0&&e.after<=ECONOMY_MODEL.creditCap);
const playerLogsComplete=snapshots.every(e=>e?.playerBefore?.length===5&&e?.playerAfter?.length===5&&e?.loadouts?.length===5);
const passed=JSON.stringify(lossIncome)===JSON.stringify(expectedLoss)&&halftime.credits===800&&halftime.lossStreak===0&&overtime.credits===5000&&capped.credits===9000&&roundLogsComplete&&playerLogsComplete&&carriedWeapon&&deadLostWeapons;
console.log(JSON.stringify({passed,lossIncome,expectedLoss,halftime,overtime,capped,playerEconomy:{pistolBuy:pistolPlan.buy,carriedWeapon,deadLostWeapons},matchRounds:rounds.length,roundLogsComplete,playerLogsComplete},null,2));
if(!passed)process.exitCode=1;
