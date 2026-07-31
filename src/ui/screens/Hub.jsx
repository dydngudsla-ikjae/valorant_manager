import { useStore } from '../useStore.js';
import { ST, go } from '../../core/state.js';
import { teamOVR } from '../../core/ratings.js';
import { firstUnplayedWeek, nameById, sortedStandings } from '../../core/season.js';
import { LEAGUES } from '../../data/leagues.js';
import { startNextMatch } from '../match-flow.js';
import { tr, weekLabel } from '../../i18n.js';

function StandingsTable() {
  const rows = sortedStandings();
  const myId = ST.teams[ST.myTeamIdx].id;
  const qualificationPlaces=ST.competition?.qualificationPlaces||8;
  return (
    <table>
      <thead>
        <tr>
          <th className="rank">#</th><th>{tr('팀','Team')}</th><th>{tr('승-패','W-L')}</th>
          <th className="hide">{tr('맵','Maps')}</th><th className="hide">RD</th><th>OVR</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((tm, i) => {
          const s = ST.standings[tm.id];
          return (
            <tr className={(i < qualificationPlaces ? 'playoff ' : '') + (tm.id === myId ? 'me' : '')} key={tm.id}>
              <td className="rank">{i + 1}</td>
              <td className="tn">
                <span className="dot" style={{ display: 'inline-block', background: tm.color, marginRight: '8px', verticalAlign: 'middle' }}></span>
                {tm.name}
              </td>
              <td className="wl"><b>{s.w}</b>-{s.l}</td>
              <td className="hide mono">{s.mapW}-{s.mapL}</td>
              <td className="hide mono">{s.rd > 0 ? '+' : ''}{s.rd}</td>
              <td className="mono" style={{ color: 'var(--gold)' }}>{teamOVR(tm)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ScheduleList() {
  const myId = ST.teams[ST.myTeamIdx].id;
  const myFix = [];
  ST.schedule.forEach((wk, wi) => wk.forEach(f => { if (f.home === myId || f.away === myId) myFix.push({ ...f, wi }); }));
  const nextWi = firstUnplayedWeek();
  return (
    <>
      <div className="ph">{tr('일정','Fixtures')} <span className="rl">{myFix.filter(f => f.played).length}/{myFix.length}</span></div>
      <div className="sched">
        {myFix.map(f => {
          const opp = f.home === myId ? f.away : f.home;
          const isNext = !f.played && f.wi === nextWi;
          let resNode = null;
          if (f.played) {
            const r = f.res;
            const won = (f.home === myId && r.hMaps > r.aMaps) || (f.away === myId && r.aMaps > r.hMaps);
            const mine = f.home === myId ? r.hMaps : r.aMaps, th = f.home === myId ? r.aMaps : r.hMaps;
            resNode = <span className={`res ${won ? 'w' : 'l'}`}>{mine}-{th}</span>;
          } else if (isNext) {
            resNode = <span className="res" style={{ color: 'var(--val)' }}>{tr('다음','NEXT')}</span>;
          }
          return (
            <div className={'fxrow' + (f.played ? ' done' : '') + (isNext ? ' next' : '')} key={f.wi}>
              <span className="wk">{weekLabel(f.wi + 1)}</span>
              <span className="teams">vs <b>{nameById(opp)}</b></span>
              {resNode}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function Hub() {
  useStore();
  const my = ST.teams[ST.myTeamIdx];
  if (!my) return null;
  const L = LEAGUES[ST.league];
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <div className="eyebrow">{L.name} · {tr('정규 시즌','Regular Season')}</div>
          <h1 className="big" style={{ fontSize: 'clamp(26px,5vw,40px)' }}>{ST.seasonOver ? tr('시즌 종료','Season Complete') : tr('시즌 허브','Season Hub')}</h1>
        </div>
        <div className="btnrow" style={{ margin: 0, width: 'auto' }}>
          <button className="btn ghost" style={{ width: 'auto' }} onClick={() => go('scTournament')}>{tr('대회 일정','Tournament')}</button>
          <button className="btn ghost" style={{ width: 'auto' }} onClick={() => go('scStats')}>{tr('대회 통계','Competition Stats')}</button>
          <button className="btn ghost" style={{ width: 'auto' }} onClick={() => go('scSquad')}>{tr('선수단','Squad')}</button>
          <button className="btn" style={{ width: 'auto' }} disabled={ST.seasonOver} onClick={() => startNextMatch()}>
            {ST.seasonOver ? tr('시즌 종료','Season Done') : tr('다음 경기','Play Next')}
          </button>
        </div>
      </div>
      <div className="hublayout">
        <div className="panel">
          <div className="ph">{tr('순위','Standings')} <span className="rl">{L.name}</span></div>
          <div className="standingslegend"><i></i><span>{tr('플레이오프 진출권','Playoff qualification')}</span></div>
          <div style={{ overflowX: 'auto' }}><StandingsTable /></div>
        </div>
        <div className="panel hidesmall">
          <ScheduleList />
        </div>
      </div>
    </>
  );
}
