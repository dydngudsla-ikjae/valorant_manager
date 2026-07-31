import { useEffect, useRef, useState } from 'react';
import { useStore } from '../useStore.js';
import { ST, go } from '../../core/state.js';
import { LEAGUES, MAPS } from '../../data/leagues.js';
import { mapAssets, MAPGEO } from '../../data/geo/maps.js';
import { openMapLab } from '../match-flow.js';
import { mapLabel, tr } from '../../i18n.js';
import { semanticRegionRaster } from '../../data/geo/semantic-regions.js';

const lineStyle=(from,to)=>({left:`${from.x}%`,top:`${from.y}%`,width:`${Math.hypot(to.x-from.x,to.y-from.y)}%`,transform:`rotate(${Math.atan2(to.y-from.y,to.x-from.x)*180/Math.PI}deg)`});
const AREA_COLORS=[[92,155,211],[135,185,104],[160,119,196],[211,119,109],[215,166,77],[77,183,177],[105,121,190],[194,103,160]];

function SemanticRegions({map,geo}){
  const ref=useRef(null);
  const rasterRef=useRef(null);
  const [hovered,setHovered]=useState(null);
  useEffect(()=>{const raster=semanticRegionRaster(map),canvas=ref.current;if(!raster||!canvas)return;canvas.width=raster.w;canvas.height=raster.h;const context=canvas.getContext('2d'),image=context.createImageData(raster.w,raster.h);
    rasterRef.current=raster;
    for(let index=0;index<raster.owner.length;index++){const area=raster.owner[index];if(area<0)continue;const x=index%raster.w,y=(index/raster.w)|0,color=AREA_COLORS[area%AREA_COLORS.length],edge=(x>0&&raster.owner[index-1]!==area)||(x<raster.w-1&&raster.owner[index+1]!==area)||(y>0&&raster.owner[index-raster.w]!==area)||(y<raster.h-1&&raster.owner[index+raster.w]!==area),nearHovered=hovered?.areaIndex===area,nearEdge=edge||(nearHovered&&((x>1&&raster.owner[index-2]!==area)||(x<raster.w-2&&raster.owner[index+2]!==area)||(y>1&&raster.owner[index-raster.w*2]!==area)||(y<raster.h-2&&raster.owner[index+raster.w*2]!==area))),pixel=index*4;image.data[pixel]=color[0];image.data[pixel+1]=color[1];image.data[pixel+2]=color[2];image.data[pixel+3]=nearHovered?(nearEdge?245:168):(edge?185:58);}
    context.putImageData(image,0,0);
  },[map,hovered?.areaIndex]);
  const inspect=event=>{const canvas=ref.current,raster=rasterRef.current;if(!canvas||!raster)return;const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*100,y=(event.clientY-rect.top)/rect.height*100,site=geo.siteNames.find(name=>{const zone=geo.plantZone(name);return x>=zone.x-zone.w/2&&x<=zone.x+zone.w/2&&y>=zone.y-zone.h/2&&y<=zone.y+zone.h/2;}),gx=Math.max(0,Math.min(raster.w-1,Math.floor(x/100*raster.w))),gy=Math.max(0,Math.min(raster.h-1,Math.floor(y/100*raster.h))),areaIndex=raster.owner[gy*raster.w+gx],area=areaIndex>=0?raster.areas[areaIndex]:null;setHovered(area||site?{areaIndex,label:site?tr(`${site} 설치 구역`,`${site} Plant Zone`):tr(area.ko,area.en),x,y}:null);};
  return <><canvas className="labsemanticcanvas" ref={ref} onMouseMove={inspect} onMouseLeave={()=>setHovered(null)}/>{hovered&&<span className="labmaphover" style={{left:`${hovered.x}%`,top:`${hovered.y}%`}}>{hovered.label}</span>}</>;
}

function StaticMapTest({map,geo}){
  return <section className="labteststage" aria-label={`${mapLabel(map)} map test`}>
    <div className="labtestmap" style={{backgroundImage:`url("${mapAssets(map).tactical}")`}}>
      <SemanticRegions map={map} geo={geo}/>
      {geo.siteNames.map(site=>{const zone=geo.plantZone(site);return <span className="mvplantarea" style={{left:`${zone.x-zone.w/2}%`,top:`${zone.y-zone.h/2}%`,width:`${zone.w}%`,height:`${zone.h}%`}} key={`site-${site}`}/>;})}
      {(geo.orbs||[]).map(orb=><span className="mvorb" style={{left:`${orb.x}%`,top:`${orb.y}%`}} title={orb.label} key={orb.id}><i/></span>)}
      {(geo.annotations?.barriers||[]).map(barrier=><span className={`mvbarrier ${barrier.side}`} style={lineStyle(barrier.from,barrier.to)} title={barrier.id} key={barrier.id}/>)}
      {(geo.annotations?.doors||[]).flatMap(door=>[<span className="mvdoor" style={lineStyle(door.from,door.to)} title={door.id} key={door.id}/>,<span className="mvdoorbutton" style={{left:`${door.button.x}%`,top:`${door.button.y}%`}} title={`${door.id} button`} key={`${door.id}-button`}/>])}
      {(geo.annotations?.stairs||[]).map(stair=><span className="mvstairs" style={{left:`${stair.at.x}%`,top:`${stair.at.y}%`,width:`${stair.w}%`,height:`${stair.h}%`}} title={stair.id} key={stair.id}/>)}
    </div>
  </section>;
}

export function MapLab(){
  useStore();
  const teams=ST.teams.length?ST.teams:Object.entries(LEAGUES).flatMap(([league,data])=>data.teams.map((team,index)=>({...team,id:team.id??`lab-${league}-${index}`,league})));
  const [homeIndex,setHomeIndex]=useState(ST.myTeamIdx??0);
  const [awayIndex,setAwayIndex]=useState(()=>teams.findIndex((_,i)=>i!==(ST.myTeamIdx??0)));
  const [map,setMap]=useState(MAPS[0]);
  const [homeStartsAttack,setHomeStartsAttack]=useState(true);
  const [mapTest,setMapTest]=useState(false);
  if(!teams.length)return null;
  const safeAway=awayIndex===homeIndex?teams.findIndex((_,i)=>i!==homeIndex):awayIndex;
  const geo=MAPGEO[map];
  const start=()=>openMapLab({homeIndex,awayIndex:safeAway,map,homeStartsAttack,teams});
  return (
    <>
      <div className="labhead">
        <div>
          <div className="eyebrow">{tr('개발 도구 · 공간 시뮬레이션','Development Tool · Spatial Simulation')}</div>
          <h1 className="big">{tr('맵 중계','Map Broadcast')} <em>{tr('진단실','Lab')}</em></h1>
          <p className="sub">{tr('시즌 결과에 반영하지 않고 맵별 이동 경로와 중계 화면을 점검합니다.','Inspect map movement and broadcast visuals without changing season results.')}</p>
        </div>
        <div className="labactions">
          <button className={'btn ghost'+(mapTest?' active':'')} onClick={()=>setMapTest(value=>!value)}>{mapTest?tr('진단 설정','Diagnostic Setup'):tr('맵 테스트','Map Test')}</button>
          <button className="btn ghost labback" onClick={()=>go(ST.teams.length?'scHub':'scSelect')}>← {ST.teams.length?tr('시즌 허브','Season Hub'):tr('메인으로','Back to main')}</button>
        </div>
      </div>

      {mapTest?<StaticMapTest map={map} geo={geo}/>:<div className="labgrid">
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
      </div>}
    </>
  );
}
