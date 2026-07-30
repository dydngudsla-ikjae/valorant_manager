export const REGULATION_TIMEOUTS=2;
export const OVERTIME_TIMEOUTS_PER_SEGMENT=1;

export function createTimeoutLedger(){
  return{version:'timeout-ledger-v1',home:{regularUsed:0,overtimeUsed:{}},away:{regularUsed:0,overtimeUsed:{}},log:[]};
}

export function timeoutWindow(roundsPlayed){
  if(roundsPlayed<24)return{phase:'regulation',segment:null,key:'regulation'};
  const segment=Math.floor((roundsPlayed-24)/2);
  return{phase:'overtime',segment,key:`overtime-${segment}`};
}

export function timeoutAvailability(ledger,side,roundsPlayed){
  const window=timeoutWindow(roundsPlayed),team=ledger[side];
  if(window.phase==='regulation'){
    const used=team.regularUsed||0;
    return{...window,used,limit:REGULATION_TIMEOUTS,remaining:Math.max(0,REGULATION_TIMEOUTS-used)};
  }
  const used=team.overtimeUsed[window.segment]||0;
  return{...window,used,limit:OVERTIME_TIMEOUTS_PER_SEGMENT,remaining:Math.max(0,OVERTIME_TIMEOUTS_PER_SEGMENT-used)};
}

export function useTacticalTimeout({ledger,side,roundsPlayed,beforePolicy,afterPolicy,source='user'}){
  const availability=timeoutAvailability(ledger,side,roundsPlayed);
  if(availability.remaining<=0)return null;
  const team=ledger[side];
  if(availability.phase==='regulation')team.regularUsed=(team.regularUsed||0)+1;
  else team.overtimeUsed[availability.segment]=(team.overtimeUsed[availability.segment]||0)+1;
  const entry={
    n:ledger.log.length+1,side,source,afterRound:roundsPlayed,beforeRound:roundsPlayed+1,
    phase:availability.phase,overtimeSegment:availability.segment,
    beforePolicy:{...beforePolicy},afterPolicy:{...afterPolicy},
  };
  ledger.log.push(entry);
  return entry;
}
