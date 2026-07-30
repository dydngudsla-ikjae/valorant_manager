import { useStore } from '../useStore.js';
import { MATCH, ST } from '../../core/state.js';
import { mapSuitFor } from '../../core/draft.js';
import { MAPDATA } from '../../data/agents.js';
import { MAPS } from '../../data/leagues.js';
import { mapAssets } from '../../data/geo/maps.js';
import { playerVeto, startMapDraft, vetoSkip } from '../match-flow.js';
import { mapLabel, stanceLabel, tr, weekLabel } from '../../i18n.js';

function sideLabel(side){
  return side===MATCH.playerSide?tr('나','YOU'):(side==='home'?MATCH.home.short:MATCH.away.short);
}

function VetoTile({map,acted,clickable}){
  const myTeam=ST.teams[ST.myTeamIdx];
  const fav=stanceLabel(MAPDATA[map].favor);
  const suit=mapSuitFor(myTeam,map);
  const tag=acted
    ?(acted.act==='pick'?`PICK · ${sideLabel(acted.side)}`:acted.act==='ban'?`BAN · ${acted.side==='decider'?'':sideLabel(acted.side)}`:'DECIDER')
    :`${tr('유리한 전술','FAVORS')} ${fav}`;
  const Tag=clickable?'button':'div';
  return (
    <Tag
      className={'vtile'+(acted?' '+acted.act:'')+(clickable?' live':'')}
      onClick={clickable?()=>playerVeto(map):undefined}
      style={{'--map-splash':`url("${mapAssets(map).splash}")`}}
    >
      <span className="vshade" aria-hidden="true" />
      <div className="vcontent">
        <div className="vmap">{mapLabel(map)}</div>
        <div className="vtag">{tag}</div>
        {!acted&&<div className="vsuit">{tr('선수단 적합도','ROSTER FIT')} {suit>=2?'●●●':suit>=1?'●●○':'●○○'}</div>}
      </div>
    </Tag>
  );
}

export function Veto(){
  useStore();
  if(!MATCH||!MATCH.veto)return null;
  const v=MATCH.veto;
  const done=v.step>=v.order.length;
  let prompt;
  if(done){
    prompt=tr(`베토 완료 · ${MATCH.mapPool.length}개 맵 확정`,`Veto complete · ${MATCH.mapPool.length} maps set`);
  }else{
    const [side,act]=v.order[v.step];
    const mine=side===MATCH.playerSide;
    const team=side==='home'?MATCH.home.short:MATCH.away.short;
    const action=act==='pick'?tr('선택','PICK'):tr('제외','BAN');
    prompt=mine?tr(`내 차례 · 맵 ${action}`,`Your turn · ${action} a map`):tr(`${team} 차례 · 맵 ${action}`,`${team}'s turn · ${action} a map`);
  }
  const actedBy={};
  v.acts.forEach(a=>{actedBy[a.map]=a;});
  const canClick=!done&&v.order[v.step][0]===MATCH.playerSide;
  const order=[
    ...v.picks.map((pick,i)=>({label:`${tr('맵','Map')} ${i+1}`,map:pick.map})),
    ...(done&&MATCH.mapPool.length>v.picks.length?[{label:tr('결정 맵','Decider'),map:MATCH.mapPool.at(-1)}]:[]),
  ];
  return (
    <>
      <div className="matchhead">
        <div className="mvenue">{MATCH.home.short} vs {MATCH.away.short} · {weekLabel(MATCH.wi+1)} · {tr('맵 베토','Map Veto')}</div>
        <div className="mapname">{prompt}</div>
      </div>
      <div className="vetogrid">
        {MAPS.map(map=><VetoTile map={map} acted={actedBy[map]} clickable={canClick&&!actedBy[map]} key={map}/>)}
      </div>
      <div className="vetoresult">
        {(v.picks.length||done)&&order.map(o=><span className="vres" key={o.label}><b>{o.label}</b> {mapLabel(o.map)}</span>)}
      </div>
      <div className="btnrow">
        {done
          ?<button className="btn" onClick={()=>startMapDraft(0)}>{tr('드래프트로','To the draft')} →</button>
          :<button className="btn ghost" onClick={()=>vetoSkip()}>{tr('자동 베토 후 경기 건너뛰기','Auto-veto & skip match')}</button>}
      </div>
    </>
  );
}
