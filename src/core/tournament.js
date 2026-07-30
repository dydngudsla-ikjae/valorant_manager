export const STAGE_FORMAT_2026={
  id:'vct-2026-stage-custom',name:'VCT 2026 League Stage',season:2026,
  regular:{system:'single-round-robin',groups:false,bestOf:3},
  playoffs:{teams:8,system:'double-elimination',defaultBestOf:3,lowerFinalBestOf:5,grandFinalBestOf:5},
  adaptation:'Alpha/Omega groups are replaced by one full-league table.',
};

const source=(type,value)=>({type,value});
const node=(id,label,bracket,order,a,b,bestOf=3)=>({id,label,bracket,order,bestOf,sources:[a,b],home:null,away:null,scheduled:false,completed:false,winner:null,loser:null,res:null});

export function createStageCompetition({leagueId,year=2026,qualificationPlaces=8}={}){
  const leagueName={PAC:'Pacific',AMER:'Americas',EMEA:'EMEA',CN:'China'}[leagueId]||leagueId||'';
  return{id:`${year}-${leagueId||'league'}-stage`,leagueId,year,name:`VCT ${year} ${leagueName} Stage 1`.trim(),phase:'regular',qualificationPlaces,format:structuredClone(STAGE_FORMAT_2026),seeds:[],bracket:[],champion:null};
}

export function createDoubleEliminationBracket(seedTeamIds){
  if(seedTeamIds.length!==8)throw new Error('double-elimination bracket requires eight seeds');
  const S=rank=>source('seed',rank),W=id=>source('winner',id),L=id=>source('loser',id);
  return[
    node('po-ub-r1-1','Upper Round 1','upper',1,S(1),S(8)),node('po-ub-r1-2','Upper Round 1','upper',1,S(4),S(5)),
    node('po-ub-r1-3','Upper Round 1','upper',1,S(2),S(7)),node('po-ub-r1-4','Upper Round 1','upper',1,S(3),S(6)),
    node('po-ub-sf-1','Upper Semifinal','upper',2,W('po-ub-r1-1'),W('po-ub-r1-2')),node('po-ub-sf-2','Upper Semifinal','upper',2,W('po-ub-r1-3'),W('po-ub-r1-4')),
    node('po-lb-r1-1','Lower Round 1','lower',2,L('po-ub-r1-1'),L('po-ub-r1-2')),node('po-lb-r1-2','Lower Round 1','lower',2,L('po-ub-r1-3'),L('po-ub-r1-4')),
    node('po-lb-r2-1','Lower Round 2','lower',3,W('po-lb-r1-1'),L('po-ub-sf-2')),node('po-lb-r2-2','Lower Round 2','lower',3,W('po-lb-r1-2'),L('po-ub-sf-1')),
    node('po-ub-final','Upper Final','upper',3,W('po-ub-sf-1'),W('po-ub-sf-2')),
    node('po-lb-r3','Lower Round 3','lower',4,W('po-lb-r2-1'),W('po-lb-r2-2')),
    node('po-lb-final','Lower Final','lower',5,W('po-lb-r3'),L('po-ub-final'),5),
    node('po-grand-final','Grand Final','final',6,W('po-ub-final'),W('po-lb-final'),5),
  ].map(match=>({...match,seeds:seedTeamIds.slice()}));
}

function resolveSource(match,competition){
  if(match.type==='seed')return competition.seeds[match.value-1]??null;
  const parent=competition.bracket.find(node=>node.id===match.value);
  return parent?.completed?(match.type==='winner'?parent.winner:parent.loser):null;
}

export function readyBracketMatches(competition){
  return competition.bracket.filter(match=>!match.scheduled&&!match.completed).map(match=>{
    const [home,away]=match.sources.map(slot=>resolveSource(slot,competition));
    if(home==null||away==null)return null;
    match.home=home;match.away=away;return match;
  }).filter(Boolean);
}

export function completeBracketMatch(competition,id,{hMaps,aMaps}){
  const match=competition.bracket.find(node=>node.id===id);if(!match||match.completed)return false;
  match.completed=true;match.res={hMaps,aMaps};match.winner=hMaps>aMaps?match.home:match.away;match.loser=hMaps>aMaps?match.away:match.home;
  if(match.id==='po-grand-final'){competition.champion=match.winner;competition.phase='complete';}
  return true;
}
