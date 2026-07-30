import { useEffect, useRef } from 'react';
import { useStore } from '../useStore.js';
import { MATCH, ST } from '../../core/state.js';
import { matchupRead } from '../../core/draft.js';
import { ARCH, MAPDATA } from '../../data/agents.js';
import { LEAGUES } from '../../data/leagues.js';
import { DEV_ASCENT_BO1, backToHub, simCurrentMap, skipMatch } from '../match-flow.js';
import { tr, weekLabel } from '../../i18n.js';

function MapChips() {
  return (
    <div className="mapchips">
      {MATCH.mapPool.map((m, i) => {
        const res = MATCH.mapResults[i];
        let cls = 'mapchip';
        if (res) cls += res.hWon ? ' w' : ' l';
        else if (i === MATCH.curMap && MATCH.running) cls += ' live';
        return <span className={cls} key={i}>{m}{res ? ` ${res.h}-${res.a}` : ''}</span>;
      })}
    </div>
  );
}

function DraftPanel() {
  const cc = MATCH.comps[MATCH.curMap];
  if (!cc) return null;
  const chips = comp => comp.agents.map(a => (
    <span className={`ag r-${a.role}${a.favored ? ' fav' : ''}`}
      title={`${a.name} · mastery ${a.mastery}${a.favored ? ' · map pick' : ''}`} key={a.name}>{a.agent}</span>
  ));
  const favor = MAPDATA[cc.mapName] ? ARCH[MAPDATA[cc.mapName].favor].name : '';
  return (
    <div className="draftpanel">
      <div className="drafthd"><span>{tr('드래프트','Draft')}</span><span className="mapfav">{cc.mapName} · {tr('유리','favors')} {favor}</span></div>
      <div className="draftrow">
        <div className="dside">
          <div className="dstance h">{ARCH[cc.home.stance].name}<em>{ARCH[cc.home.stance].blurb}</em></div>
          <div className="agrow">{chips(cc.home)}</div>
        </div>
        <div className="dsplit">{cc.edge > 0 ? '◀' : cc.edge < 0 ? '▶' : '='}</div>
        <div className="dside right">
          <div className="dstance a">{ARCH[cc.away.stance].name}<em>{ARCH[cc.away.stance].blurb}</em></div>
          <div className="agrow">{chips(cc.away)}</div>
        </div>
      </div>
      <div className={`dread ${cc.edge > 0 ? 'h' : cc.edge < 0 ? 'a' : ''}`}>
        {matchupRead(cc, MATCH.home.short, MATCH.away.short)}{cc.edge !== 0 ? ` · +${Math.abs(cc.edge)} round power` : ''}
      </div>
    </div>
  );
}

function Pips() {
  const { h, a } = MATCH.liveRound;
  const need = Math.max(13, h, a);
  const homeRef = useRef(null);
  const awayRef = useRef(null);
  // pip "pop" flash on whichever side just won the most recent round -- only
  // when liveRound actually reflects that round (not the map-start 0-0 reset)
  const lastWinner = MATCH.feed.length && MATCH.feed[0].h === h && MATCH.feed[0].a === a ? MATCH.feed[0].winner : null;

  useEffect(() => {
    if (!lastWinner) return;
    const wrap = lastWinner === 'home' ? homeRef.current : awayRef.current;
    const filled = wrap && wrap.querySelectorAll('.pip.' + lastWinner);
    const lp = filled && filled[filled.length - 1];
    if (!lp) return;
    lp.classList.add('pop');
    const t = setTimeout(() => lp.classList.remove('pop'), 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h, a, lastWinner]);

  return (
    <div className="rounds">
      <div className="rlabel"><span>{MATCH.home.short}</span><span>{tr('라운드','Round')} {h + a}</span><span>{MATCH.away.short}</span></div>
      <div className="pips">
        <div className="pipwrap" ref={homeRef}>
          {Array.from({ length: need }, (_, i) => <div className={'pip' + (i < h ? ' home' : '')} key={i} />)}
        </div>
        <div className="halfmark"></div>
        <div className="pipwrap right" ref={awayRef}>
          {Array.from({ length: need }, (_, i) => <div className={'pip' + (i < a ? ' away' : '')} key={i} />)}
        </div>
      </div>
    </div>
  );
}

export function MatchHead() {
  useStore();
  if (!MATCH) return null;
  return (
    <>
      <div className="matchhead">
        <div className="mvenue">{LEAGUES[ST.league].name} · {weekLabel(MATCH.wi + 1)} · {DEV_ASCENT_BO1 ? 'Ascent (Bo1)' : 'Best of 3'}</div>
        <div className="scoreline">
          <div className="side home">
            <div className="crest" style={{ background: MATCH.home.color, fontSize: '13px' }}>{MATCH.home.short}</div>
            <div className="sn">{MATCH.home.name}</div>
          </div>
          <div className="bigscore">
            <span className={'s ' + (MATCH.hMaps > MATCH.aMaps ? 'win' : 'lose')}>{MATCH.hMaps}</span>
            <span className="colon">:</span>
            <span className={'s ' + (MATCH.aMaps > MATCH.hMaps ? 'win' : 'lose')}>{MATCH.aMaps}</span>
          </div>
          <div className="side away">
            <div className="crest" style={{ background: MATCH.away.color, fontSize: '13px' }}>{MATCH.away.short}</div>
            <div className="sn">{MATCH.away.name}</div>
          </div>
        </div>
        <MapChips />
      </div>
      <div className="mapname">{MATCH.mapPool[MATCH.curMap] || '—'}</div>
      <DraftPanel />
      <Pips />
    </>
  );
}

function FeedRow({ f }) {
  return (
    <div className={'ln ' + f.winner}>
      <span style={{ color: 'var(--muted)' }}>R{f.n}</span> <span className={`sidetag ${f.winSide}`}>{f.sideTag}</span>{' '}
      <span className="k">{f.teamShort}</span>
      {f.isPistol
        ? <span style={{ color: 'var(--muted)' }}> pistol</span>
        : <span style={{ color: 'var(--muted)' }}> vs {f.loserBuyLbl}</span>}
      <span style={{ color: 'var(--muted)' }}> · FB {f.fbKiller}</span>
      {f.topKiller && ` · ${f.topKiller.name} ${f.topKiller.k}k`}{' '}
      {f.ability && <span className={`abtag${f.ability.ult ? ' ult' : ''}`}>{f.ability.name}</span>}{' '}
      {f.clutch && <span className="cltag">{f.clutch.player} 1v{f.clutch.vs}</span>}{' '}
      {(f.defuse || f.plant) && <span className="evtag">{f.defuse ? 'defuse' : 'plant'}</span>}
      <span style={{ float: 'right', color: 'var(--text)' }}>{f.h} - {f.a}</span>
    </div>
  );
}

export function MatchFeed() {
  useStore();
  if (!MATCH) return null;
  return (
    <div className="feed">
      {MATCH.feed.map((f, i) => <FeedRow f={f} key={i} />)}
    </div>
  );
}

export function MatchButtons() {
  useStore();
  if (!MATCH) return null;
  const myId = ST.teams[ST.myTeamIdx].id;
  const phase = MATCH.fx.played ? 'end' : MATCH.running ? 'running' : 'start';

  if (phase === 'end') {
    const won = (MATCH.fx.home === myId && MATCH.hMaps > MATCH.aMaps) || (MATCH.fx.away === myId && MATCH.aMaps > MATCH.hMaps);
    return <div className="btnrow"><button className={'btn' + (won ? ' gold' : '')} onClick={() => backToHub()}>{won ? tr('멋진 승리 — 계속','Great win — Continue') : tr('계속','Continue')}</button></div>;
  }
  if (phase === 'running') {
    return <div className="btnrow"><button className="btn" disabled>{tr('경기 진행 중…','Playing…')}</button></div>;
  }
  return (
    <div className="btnrow">
      <button className="btn" onClick={() => simCurrentMap('normal')}>▶ {tr('관전','Watch')} · {MATCH.mapPool[MATCH.curMap]}</button>
      <button className="btn ghost" style={{ width: 'auto' }} onClick={() => simCurrentMap('fast')}>⏩ {tr('빠르게','Fast')}</button>
      <button className="btn ghost" style={{ width: 'auto' }} onClick={() => skipMatch()}>⏭ {tr('건너뛰기','Skip')}</button>
    </div>
  );
}
