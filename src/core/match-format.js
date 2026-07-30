export const MATCH_FORMATS={
  1:{bestOf:1,mapsToWin:1,label:'Bo1',actions:['ban','ban','ban','ban','ban','ban']},
  3:{bestOf:3,mapsToWin:2,label:'Bo3',actions:['ban','ban','pick','pick','ban','ban']},
  5:{bestOf:5,mapsToWin:3,label:'Bo5',actions:['ban','ban','pick','pick','pick','pick']}
};

export function matchFormat(bestOf=3){const format=MATCH_FORMATS[bestOf];if(!format)throw new Error('bestOf must be 1, 3, or 5');return format;}
export function vetoOrder(bestOf,firstSide='home'){
  const other=firstSide==='home'?'away':'home',actions=matchFormat(bestOf).actions;
  if(bestOf===5)return [[firstSide,'ban'],[other,'ban'],[firstSide,'pick'],[other,'pick'],[other,'pick'],[firstSide,'pick']];
  return actions.map((action,index)=>[index%2===0?firstSide:other,action]);
}
