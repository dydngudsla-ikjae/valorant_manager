import { useState } from 'react';
import { useStore } from '../useStore.js';
import { ST, go } from '../../core/state.js';
import { MAPS } from '../../data/leagues.js';
import { mapAssets, MAPGEO } from '../../data/geo/maps.js';
import { openMapLab } from '../match-flow.js';
import { mapLabel, tr } from '../../i18n.js';

export function MapLab(){
  useStore();
  const teams=ST.teams;
  const [homeIndex,setHomeIndex]=useState(ST.myTeamIdx??0);
  const [awayIndex,setAwayIndex]=useState(()=>teams.findIndex((_,i)=>i!==(ST.myTeamIdx??0)));
  const [map,setMap]=useState(MAPS[0]);
  const [homeStartsAttack,setHomeStartsAttack]=useState(true);
  if(!teams.length)return null;
  const safeAway=awayIndex===homeIndex?teams.findIndex((_,i)=>i!==homeIndex):awayIndex;
  const geo=MAPGEO[map];
  const start=()=>openMapLab({homeIndex,awayIndex:safeAway,map,homeStartsAttack});
  return (
    <>
      <div className="labhead">
        <div>
          <div className="eyebrow">{tr('개발 도구 · 공간 시뮬레이션','Development Tool · Spatial Simulation')}</div>
          <h1 className="big">{tr('맵 중계','Map Broadcast')} <em>{tr('진단실','Lab')}</em></h1>
          <p className="sub">{tr('시즌 결과에 반영하지 않고 맵별 이동 경로와 중계 화면을 점검합니다.','Inspect map movement and broadcast visuals without changing season results.')}</p>
        </div>
        <button className="btn ghost labback" onClick={()=>go('scHub')}>← {tr('시즌 허브','Season Hub')}</button>
      </div>

      <div className="labgrid">
        <section className="panel labsettings">
          <div className="ph">{tr('테스트 경기 설정','Test Match Setup')}</div>
          <label>
            <span>{tr('홈 팀','Home Team')}</span>
            <select value={homeIndex} onChange={e=>{
              const next=Number(e.target.value);setHomeIndex(next);
              if(next===awayIndex)setAwayIndex(teams.findIndex((_,i)=>i!==next));
            }}>
              {teams.map((team,i)=><option value={i} key={`h-${team.id}`}>{team.name}</option>)}
            </select>
          </label>
          <label>
            <span>{tr('원정 팀','Away Team')}</span>
            <select value={safeAway} onChange={e=>setAwayIndex(Number(e.target.value))}>
              {teams.map((team,i)=><option value={i} disabled={i===homeIndex} key={`a-${team.id}`}>{team.name}</option>)}
            </select>
          </label>
          <fieldset>
            <legend>{tr('전반 시작 진영','Starting Side')}</legend>
            <button className={homeStartsAttack?'on':''} onClick={()=>setHomeStartsAttack(true)}>{teams[homeIndex]?.short} · ATK</button>
            <button className={!homeStartsAttack?'on':''} onClick={()=>setHomeStartsAttack(false)}>{teams[homeIndex]?.short} · DEF</button>
          </fieldset>
          <div className="labnote">
            <b>{mapLabel(map)}</b>
            <span>{tr('사이트','Sites')} {geo.siteNames.join(' · ')}</span>
            <span>160×160 NAV GRID</span>
          </div>
          <button className="btn" onClick={start}>▶ {tr('진단 경기 열기','Open Diagnostic Match')}</button>
        </section>

        <section className="panel labmaps">
          <div className="ph">{tr('맵 선택','Select Map')} <span className="rl">{MAPS.length}</span></div>
          <div className="labmapgrid">
            {MAPS.map(name=><button
              className={'labmap'+(name===map?' selected':'')}
              onClick={()=>setMap(name)}
              style={{backgroundImage:`linear-gradient(180deg,rgba(6,9,14,.1),rgba(6,9,14,.88)),url("${mapAssets(name).splash}")`}}
              key={name}
            ><b>{mapLabel(name)}</b><span>{MAPGEO[name].siteNames.join(' · ')}</span></button>)}
          </div>
          <div className="labpreview">
            <img src={mapAssets(map).tactical} alt={`${map} tactical map`}/>
            <div><b>{mapLabel(map)}</b><span>{tr('중계용 탑다운 도면','Broadcast tactical layout')}</span></div>
          </div>
        </section>
      </div>
    </>
  );
}
