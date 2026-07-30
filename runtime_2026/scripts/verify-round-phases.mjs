import { simulateMatch } from '../../src/core/match-engine.js';
import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { LEAGUES, MAPS } from '../../src/data/leagues.js';

applyRealStats();buildAgentPools();
const [home,away]=LEAGUES.PAC.teams;
const phaseTypes=new Set(),failures=[];
let rounds=0,tradeWindows=0,tradeAttempts=0,trades=0,crossfireKills=0,turningPoints=0,plantedRounds=0;
for(let sample=0;sample<5;sample++){
  const result=simulateMatch({home:structuredClone(home),away:structuredClone(away),seed:`phase-trade-${sample}`,bestOf:1,maps:[MAPS[sample]],homeStartsAttack:sample%2===0});
  for(const round of result.mapResults[0].rounds){
    rounds++;
    const summary=round.phases,trade=round.tradeSummary;
    if(!summary?.phases?.length)failures.push({sample,round:round.n,reason:'missing_phases'});
    else{
      summary.phases.forEach(phase=>phaseTypes.add(phase.phase));
      if(summary.turningPoint)turningPoints++;
      if(!summary.phases.every(phase=>Number.isFinite(phase.start)&&Number.isFinite(phase.end)&&phase.end>=phase.start))failures.push({sample,round:round.n,reason:'invalid_phase_time'});
    }
    if(!trade)failures.push({sample,round:round.n,reason:'missing_trade_summary'});
    else{tradeWindows+=trade.windows;tradeAttempts+=trade.attempts;trades+=trade.completed;crossfireKills+=trade.crossfireKills;}
    if(round.plant){plantedRounds++;if(!summary.phases.some(phase=>phase.phase==='POST_PLANT')||!summary.phases.some(phase=>phase.phase==='RETAKE'))failures.push({sample,round:round.n,reason:'missing_postplant_phase'});}
    for(const kill of round.kills.filter(kill=>kill.traded)){if(!kill.tradeOf||!kill.tradeAttempt)failures.push({sample,round:round.n,reason:'invalid_trade_kill'});}
  }
}
const required=['INFORMATION','OPENING','EXECUTE','POST_PLANT','RETAKE'];
const allPhases=required.every(phase=>phaseTypes.has(phase));
const activeTrades=tradeWindows>0&&tradeAttempts>0&&trades>0&&crossfireKills>0;
console.log(JSON.stringify({rounds,phaseTypes:[...phaseTypes],allPhases,plantedRounds,turningPoints,trades:{windows:tradeWindows,attempts:tradeAttempts,completed:trades,crossfireKills,active:activeTrades},failures},null,2));
if(failures.length||!allPhases||!activeTrades)process.exitCode=1;
