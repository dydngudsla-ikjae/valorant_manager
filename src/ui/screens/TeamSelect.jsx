import { useState } from 'react';
import { teamAxis, teamOVR } from '../../core/ratings.js';
import { ST, go } from '../../core/state.js';
import { LEAGUES } from '../../data/leagues.js';
import { attributeLabel, tr } from '../../i18n.js';
import { selectTeam } from '../match-flow.js';
import { teamLogo } from '../../data/team-logos.js';

const MINI_AXES=['firepower','combatEfficiency','positioning','tactical','clutch'];

function openTeam(leagueId,teamIdx){
  ST.previewLeague=leagueId; ST.previewTeamIdx=teamIdx; ST.playerViewContext=null;
  go('scTeamPreview');
}

function TeamCard({team,leagueId,teamIdx,selected,onSelect}){
  const nameClass=team.name.length>25?' extra-long':team.name.length>16?' long':'';
  const logo=teamLogo(team.id,team.name);
  return <div className="teamcardwrap">
    <button className={'pick teamcard'+(selected?' sel':'')} onClick={onSelect} aria-pressed={selected}>
      <div className="stripe" style={{background:team.color}}></div>
      {logo&&<img className="teamlogo" src={logo} alt="" />}
      <div className="ovr">{teamOVR(team)}<span>OVR</span></div>
      <div className={'tname'+nameClass} title={team.name}><span>{team.name}</span></div><div className="tregion">{LEAGUES[leagueId].name}</div>
      <div className="mini">{MINI_AXES.map(axis=>{const value=Math.round(teamAxis(team,axis));const color=axis==='firepower'?'var(--val)':axis==='tactical'?'var(--ini)':'var(--def)';return <div className="m" title={attributeLabel(axis)} key={axis}><i style={{width:value+'%',background:color}}></i></div>;})}</div>
    </button>
    <button className="teamdetail" onClick={()=>openTeam(leagueId,teamIdx)} aria-label={tr(`${team.name} 선수단 보기`,`View ${team.name} squad`)} title={tr('선수단 보기','View squad')}>↗</button>
  </div>;
}

export function TeamSelect(){
  const leagueKeys=Object.keys(LEAGUES);
  const initial=ST.previewLeague&&LEAGUES[ST.previewLeague]?ST.previewLeague:leagueKeys[0];
  const [leagueId,setLeagueId]=useState(initial); const [selectedIdx,setSelectedIdx]=useState(null); const league=LEAGUES[leagueId];
  const changeLeague=id=>{setLeagueId(id);setSelectedIdx(null);};
  return <>
    <div className="tabs">{leagueKeys.map(id=><button className={'tab'+(id===leagueId?' on':'')} onClick={()=>changeLeague(id)} key={id}>{LEAGUES[id].name}</button>)}</div>
    <div className="grid g-teams">{league.teams.map((team,idx)=><TeamCard team={team} leagueId={leagueId} teamIdx={idx} selected={idx===selectedIdx} onSelect={()=>setSelectedIdx(idx)} key={team.name}/>)}</div>
    <div className="teamselectactions">
      <span>{selectedIdx===null?tr('계속하려면 팀을 선택하세요','Select a club to continue'):tr(`${league.teams[selectedIdx].name} 선택됨`,`${league.teams[selectedIdx].name} selected`)}</span>
      <button className="btn" disabled={selectedIdx===null} onClick={()=>selectedIdx!==null&&selectTeam(leagueId,selectedIdx)}>{tr('팀 선택','Select team')}</button>
    </div>
  </>;
}
