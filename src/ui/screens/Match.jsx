import { useStore } from '../useStore.js';
import { MATCH, ST, go } from '../../core/state.js';
import { agImg } from '../../data/agents.js';
import { mapAssets } from '../../data/geo/maps.js';
import { LEAGUES } from '../../data/leagues.js';
import { backToHub, cancelTacticalTimeout, confirmTacticalTimeout, openTacticalTimeout, pauseMap, playOneRound, resumeMap, setPlaybackSpeed, simCurrentMap, skipCurrentRound, skipMatch, updateTimeoutPolicy } from '../match-flow.js';
import { agentLabel, mapLabel, policyLabel, tacticLabel, tr } from '../../i18n.js';
import { ATTACK_POLICY_OPTIONS, DEFENSE_POLICY_OPTIONS, POLICY_PRESETS } from '../../core/tactics/tactical-policy.js';
import { timeoutAvailability } from '../../core/timeouts.js';
import { teamLogo } from '../../data/team-logos.js';
import { playerRoleAbilityOVR, ROLE_FIT_PERCENT } from '../../core/ratings.js';
import SEASON_SUMMARY from '../../data/player-season-summary.json' with { type: 'json' };
import { abilityNameLabel } from '../../data/combat-assets.js';
import { createPortal } from 'react-dom';

function DraftPanel() {
  const cc = MATCH.comps[MATCH.curMap];
  if (!cc) return null;
  const performanceLine=(entry,team)=>{
    const player=team.roster.find(candidate=>candidate.name===entry.name);
    const mastery=Math.max(1,Math.min(20,Math.round(entry.mastery||1)));
    const agentOVR=player?Math.round(playerRoleAbilityOVR(player,entry.role)*ROLE_FIT_PERCENT[mastery-1]/100):'—';
    const boxes=(ST.matchArchive||[]).map(match=>match.box?.[entry.name]).filter(stat=>stat?.rounds>0&&Number.isFinite(stat.rating));
    const rounds=boxes.reduce((sum,stat)=>sum+stat.rounds,0);
    const rating=rounds?boxes.reduce((sum,stat)=>sum+stat.rating*stat.rounds,0)/rounds:null;
    const totals=boxes.reduce((sum,stat)=>({k:sum.k+(stat.k||0),d:sum.d+(stat.d||0),acs:sum.acs+(stat.acs||0)}),{k:0,d:0,acs:0});
    if(rating!=null)return {rating:rating.toFixed(2),detail:`ACS ${Math.round(totals.acs/rounds)} · K/D ${(totals.k/Math.max(1,totals.d)).toFixed(2)}`,year:null,agentOVR};
    const fallback=SEASON_SUMMARY.years['2026']?.[player?.playerId]||SEASON_SUMMARY.years['2025']?.[player?.playerId];
    const year=SEASON_SUMMARY.years['2026']?.[player?.playerId]?2026:2025;
    return {rating:fallback?.rating?.toFixed(2)||'—',detail:fallback?`ACS ${fallback.acs} · K/D ${fallback.kd.toFixed(2)}`:'—',year:fallback?year:null,agentOVR};
  };
  const teamLine=(team)=>{
    const standing=ST.standings?.[team.id];
    if(!standing)return tr('대회 기록 —','Tournament record —');
    const ordered=[...ST.teams].sort((a,b)=>{
      const A=ST.standings[a.id],B=ST.standings[b.id];
      return (B.w-A.w)||((B.mapW-B.mapL)-(A.mapW-A.mapL))||(B.rd-A.rd);
    });
    const rank=ordered.findIndex(entry=>entry.id===team.id)+1;
    return `#${rank} (${standing.w}-${standing.l})`;
  };
  const lineup=(comp,team,side)=>comp.agents.map(a=>{
    const performance=performanceLine(a,team);
    return <div className={`draft-player ${side}`} key={a.name}>
      <div className="draft-season-stat"><strong>{performance.rating}{performance.year&&<em>({performance.year})</em>}</strong><span>{performance.detail}</span></div>
      <div className="draft-player-copy"><b>{a.name}</b><span>{agentLabel(a.agent)}</span></div>
      <img className="draft-agent" src={agImg(a.agent)} alt=""/>
      <div className="draft-agent-ovr">{performance.agentOVR}</div>
    </div>;
  });
  const homeLogo=teamLogo(MATCH.home.teamId||MATCH.home.id,MATCH.home.name),awayLogo=teamLogo(MATCH.away.teamId||MATCH.away.id,MATCH.away.name);
  return (
    <div className="draftpanel match-lineup" style={{'--lineup-map':`url("${mapAssets(cc.mapName).splash}")`}}>
      <div className="drafthd"><span>{tr('선발 라인업','Starting Lineups')}</span><b>{mapLabel(cc.mapName)}</b></div>
      <div className="lineup-versus">
        <section>
          <h3 className="lineup-team home">{homeLogo&&<img src={homeLogo} alt=""/>}<span className="lineup-team-name">{MATCH.home.name}</span><small>{teamLine(MATCH.home)}</small></h3>
          <div className="draft-lineup">{lineup(cc.home,MATCH.home,'home')}</div>
        </section>
        <div className="lineup-vs">VS</div>
        <section>
          <h3 className="lineup-team away"><small>{teamLine(MATCH.away)}</small><span className="lineup-team-name">{MATCH.away.name}</span>{awayLogo&&<img src={awayLogo} alt=""/>}</h3>
          <div className="draft-lineup away">{lineup(cc.away,MATCH.away,'away')}</div>
        </section>
      </div>
    </div>
  );
}

export function MatchHead() {
  useStore();
  if (!MATCH) return null;
  if (MATCH.running) return null;
  return (
    <>
      <div className="matchhead">
        <div className="mvenue">{MATCH.diagnostic ? tr('맵 중계 진단','Map Broadcast Lab') : (ST.competition?.name||`VCT 2026 ${LEAGUES[ST.league].name} Stage 1`)}</div>
      </div>
      <DraftPanel />
    </>
  );
}

function FeedRow({ f }) {
  if(f.timeout)return <div className={'ln timeout '+f.side}>
    <span style={{color:'var(--gold)'}}>TIMEOUT</span>{' '}<span className="k">{f.teamShort}</span>{' '}
    <span style={{color:'var(--muted)'}}>→ {f.policy} · R{f.n+1}</span>
  </div>;
  return (
    <div className={'ln ' + f.winner}>
      <span style={{ color: 'var(--muted)' }}>R{f.n}</span> <span className={`sidetag ${f.winSide}`}>{f.sideTag}</span>{' '}
      <span className="k">{f.teamShort}</span>
      {f.myTactic&&<span className="tactag">{tr('우리 팀','OUR')} {f.myRole==='atk'?tr('공격','ATK'):tr('수비','DEF')} · {tacticLabel(f.myTactic)}{f.targetSite?` ${f.targetSite}`:''}</span>}{' '}
      {f.trades>0&&<span className="tradetag">TRADE ×{f.trades}</span>}{' '}
      {f.isPistol
        ? <span style={{ color: 'var(--muted)' }}> {tr('피스톨','pistol')}</span>
        : <span style={{ color: 'var(--muted)' }}> vs {f.loserBuyLbl==='full-buy'?tr('풀 바이','full-buy'):f.loserBuyLbl==='semi-buy'?tr('세미 바이','semi-buy'):f.loserBuyLbl==='force'?tr('강제 구매','force'):f.loserBuyLbl==='bonus'?tr('보너스','bonus'):f.loserBuyLbl==='eco'?tr('에코','eco'):f.loserBuyLbl}</span>}
      <span style={{ color: 'var(--muted)' }}> · FB {f.fbKiller}</span>
      {f.topKiller && ` · ${f.topKiller.name} ${f.topKiller.k}k`}{' '}
      {f.ability && <span className={`abtag${f.ability.ult ? ' ult' : ''}`}>{abilityNameLabel(f.ability.name)}</span>}{' '}
      {f.clutch && <span className="cltag">{f.clutch.player} 1v{f.clutch.vs}</span>}{' '}
      {(f.defuse || f.plant) && <span className="evtag">{f.defuse ? tr('해체','defuse') : tr('설치','plant')}</span>}
      <span style={{ float: 'right', color: 'var(--text)' }}>{f.h} - {f.a}</span>
    </div>
  );
}

function TimeoutEditor(){
  const editor=MATCH.timeoutEditor;if(!editor)return null;
  const policy=editor.draft;
  return <div className="timeout-editor">
    <div className="timeout-editor-head">
      <div><b>{tr('전술 타임아웃','TACTICAL TIMEOUT')}</b><span>{tr('변경한 성향은 다음 라운드부터 적용됩니다.','Changes apply from the next round.')}</span></div>
      <button className="btn ghost timeout-cancel" onClick={cancelTacticalTimeout}>{tr('취소','Cancel')}</button>
    </div>
    <div className="timeout-presets">
      {Object.keys(POLICY_PRESETS).map(name=><button className={'timeout-preset'+(policy.preset===name?' on':'')} onClick={()=>updateTimeoutPolicy('preset',name)} key={name}>{policyLabel(name)}</button>)}
    </div>
    <div className="timeout-controls">
      <label><span>{tr('공격 성향','Attack focus')}</span><select value={policy.attackFocus} onChange={e=>updateTimeoutPolicy('attackFocus',e.target.value)}>{ATTACK_POLICY_OPTIONS.map(v=><option value={v} key={v}>{policyLabel(v)}</option>)}</select></label>
      <label><span>{tr('수비 성향','Defense focus')}</span><select value={policy.defenseFocus} onChange={e=>updateTimeoutPolicy('defenseFocus',e.target.value)}>{DEFENSE_POLICY_OPTIONS.map(v=><option value={v} key={v}>{policyLabel(v)}</option>)}</select></label>
      <label><span>{tr('위험 성향','Risk')}</span><select value={policy.risk} onChange={e=>updateTimeoutPolicy('risk',e.target.value)}>{['LOW','NORMAL','HIGH'].map(v=><option value={v} key={v}>{policyLabel(v)}</option>)}</select></label>
    </div>
    <button className="btn gold timeout-confirm" onClick={confirmTacticalTimeout}>{tr('전술 확정','Confirm tactics')}</button>
  </div>;
}

function RunningControls(){
  const playback=MATCH.playback||{};
  const editing=!!MATCH.timeoutEditor;
  const side=MATCH.playerSide||'home';
  const roundsPlayed=MATCH.mapSimulation?.r||0;
  const availability=MATCH.timeouts?timeoutAvailability(MATCH.timeouts,side,roundsPlayed):{remaining:0,limit:2,phase:'regulation',segment:null};
  const timeoutQueued=MATCH.timeoutQueued?.side===side;
  const canTimeout=roundsPlayed>0&&availability.remaining>0&&!editing;
  const autoMode=!playback.paused&&!playback.stopAfterRound;
  const stepMode=!!playback.stopAfterRound||(playback.paused&&playback.betweenRounds);
  const allowance=availability.phase==='overtime'?tr(`연장 ${availability.segment+1}구간`,`OT segment ${availability.segment+1}`):tr('정규 구간','Regulation');
  return <div className="running-control-wrap">
    <div className="match-control-status">
      <span>{playback.paused?(playback.betweenRounds?tr('일시정지 · 라운드 대기','Paused · Between rounds'):tr('일시정지','Paused')):tr('자동 진행 중','Auto playing')}</span>
      <span>{tr('타임아웃','Timeout')} {availability.remaining}/{availability.limit} · {allowance}</span>
    </div>
    <div className="broadcast-controls" role="group" aria-label={tr('중계 재생 제어','Broadcast playback controls')}>
      <button className={'broadcast-control play continue'+(autoMode?' active':'')} disabled={editing} onClick={resumeMap} title={tr('계속 진행','Continue')} aria-label={tr('계속 진행','Continue')}><span className="control-play-icon double"><i/><i/></span></button>
      <button className={'broadcast-control play one-round'+(stepMode?' active':'')} disabled={editing} onClick={playOneRound} title={playback.stopAfterRound?tr('현재 라운드 후 정지','Stop after round'):tr('한 라운드 진행','Play one round')} aria-label={tr('한 라운드 진행','Play one round')}><span className="control-play-icon"><i/></span></button>
      <button className="broadcast-control round-skip" disabled={editing||playback.betweenRounds} onClick={skipCurrentRound} title={tr('현재 라운드 건너뛰기','Skip current round')} aria-label={tr('현재 라운드 건너뛰기','Skip current round')}><span className="control-skip-icon"><i/><em/></span></button>
      <button className="broadcast-control pause" disabled={editing||playback.paused} onClick={pauseMap} title={tr('일시정지','Pause')} aria-label={tr('일시정지','Pause')}><span className="control-pause-icon"><i/><i/></span></button>
      <i className="broadcast-control-divider" aria-hidden="true"/>
      {[1,2,4].map(rate=><button className={'broadcast-control speed'+(playback.speed===rate?' active':'')} disabled={editing} onClick={()=>setPlaybackSpeed(rate)} title={`${rate}×`} aria-label={`${rate}×`} key={rate}>{rate}×</button>)}
      <i className="broadcast-control-divider" aria-hidden="true"/>
      <button className={'broadcast-control timeout'+(timeoutQueued?' queued':'')} disabled={!canTimeout} onClick={openTacticalTimeout} title={timeoutQueued?tr('타임아웃 예약 취소','Cancel queued timeout'):`${tr('타임아웃','Timeout')} ${availability.remaining}/${availability.limit}`} aria-label={tr('타임아웃','Timeout')}><span>{timeoutQueued?tr('타임 아웃 예약','TIME OUT QUEUED'):tr('타임 아웃','TIME OUT')}</span><small>{availability.remaining}</small></button>
    </div>
    <TimeoutEditor/>
  </div>;
}

export function MatchFeed() {
  useStore();
  if (!MATCH) return null;
  if (MATCH.running||!MATCH.feed.length) return null;
  return (
    <div className="feed">
      {MATCH.feed.map((f, i) => <FeedRow f={f} key={i} />)}
    </div>
  );
}

export function MatchButtons() {
  useStore();
  if (!MATCH) return null;
  const myId = ST.teams[ST.myTeamIdx]?.id??MATCH.home?.id;
  const phase = MATCH.fx.played ? 'end' : MATCH.running ? 'running' : 'start';

  if(phase==='running'){
    const target=typeof document!=='undefined'?document.getElementById('broadcastControls'):null;
    const controls=<RunningControls/>;
    return target?createPortal(controls,target):controls;
  }

  if (phase === 'end') {
    if(MATCH.diagnostic)return <div className="btnrow"><button className="btn gold" onClick={()=>go('scMapLab')}>{tr('진단실로 돌아가기','Back to Map Lab')}</button></div>;
    const won = (MATCH.fx.home === myId && MATCH.hMaps > MATCH.aMaps) || (MATCH.fx.away === myId && MATCH.aMaps > MATCH.hMaps);
    return <div className="btnrow"><button className={'btn' + (won ? ' gold' : '')} onClick={() => backToHub()}>{won ? tr('멋진 승리 — 계속','Great win — Continue') : tr('계속','Continue')}</button></div>;
  }
  if (false && phase === 'running') {
    return <div className="btnrow"><button className="btn" disabled>{tr('경기 진행 중…','Playing…')}</button></div>;
  }
  return (
    <div className="btnrow match-start-actions">
      <button className="btn" onClick={() => simCurrentMap(1)}>▶ {tr('관전','Watch')} · 1×</button>
      <button className="btn ghost" style={{ width: 'auto' }} onClick={() => skipMatch()}>⏭ {tr('건너뛰기','Skip')}</button>
    </div>
  );
}
