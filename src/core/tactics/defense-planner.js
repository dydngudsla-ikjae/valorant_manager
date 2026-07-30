export function buildDefensePlan({selection,siteNames}){
  const setup=Object.fromEntries(siteNames.map(site=>[site,1]));
  setup.mid=1;
  const extra=siteNames.length===2?2:1;
  let focus=selection.read.likelySite;
  if(selection.type==='STACK')setup[focus]+=extra;
  else if(selection.type==='RETAKE')setup[focus]+=1;
  else if(selection.type==='AGGRESSIVE')setup.mid+=1;
  else setup[focus]+=1;
  while(Object.values(setup).reduce((a,b)=>a+b,0)>5){
    const candidate=siteNames.find(site=>site!==focus&&setup[site]>1);
    if(candidate)setup[candidate]--;else if(setup.mid>0)setup.mid--;else setup[focus]--;
  }
  while(Object.values(setup).reduce((a,b)=>a+b,0)<5)setup[focus]++;
  return{...selection,setup,focusSite:focus,reason:selection.type==='STACK'?'opponent_site_pattern':selection.type==='RETAKE'?'retake_strength':'team_strength'};
}

