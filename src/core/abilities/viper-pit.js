export const VIPER_PIT_MODEL={version:'viper-pit-v1',radius:12,maxOutsideSeconds:8,integrityRegenSeconds:25};

export function createViperPitState(time=0){return{active:true,integrity:VIPER_PIT_MODEL.maxOutsideSeconds,lastUpdate:time,ownerInside:true,collapsedAt:null,collapseReason:null};}

export function advanceViperPit(state,time,ownerInside=true,ownerAlive=true){
  const next={...state},elapsed=Math.max(0,time-next.lastUpdate);if(!next.active)return next;
  if(!ownerAlive){next.active=false;next.collapsedAt=time;next.collapseReason='owner_dead';next.lastUpdate=time;return next;}
  if(ownerInside)next.integrity=Math.min(VIPER_PIT_MODEL.maxOutsideSeconds,next.integrity+elapsed*(VIPER_PIT_MODEL.maxOutsideSeconds/VIPER_PIT_MODEL.integrityRegenSeconds));
  else next.integrity=Math.max(0,next.integrity-elapsed);
  next.ownerInside=ownerInside;next.lastUpdate=time;
  if(next.integrity<=0){next.active=false;next.collapsedAt=time;next.collapseReason='integrity_depleted';}
  return next;
}

export function viperPitSnapshot(state){return{version:VIPER_PIT_MODEL.version,active:state.active,integrity:+state.integrity.toFixed(2),ownerInside:state.ownerInside,collapsedAt:state.collapsedAt,collapseReason:state.collapseReason};}
