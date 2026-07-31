import { useState } from 'react';
import { useStore } from '../useStore.js';
import { MATCH } from '../../core/state.js';
import { agentMap, matchMVP } from '../../core/round-engine.js';
import { agentLabel, mapLabel, tr } from '../../i18n.js';
import { abilityNameLabel } from '../../data/combat-assets.js';

function EconGraph({ mr }) {
  const W = 460, H = 70, pad = 4, max = 45000, n = mr.econ.length;
  const xf = i => pad + (n <= 1 ? 0 : i * (W - 2 * pad) / (n - 1));
  const yf = v => H - pad - (v / max) * (H - 2 * pad);
  const line = key => mr.econ.map((e, i) => `${i ? 'L' : 'M'}${xf(i).toFixed(1)},${yf(e[key]).toFixed(1)}`).join(' ');
  return (
    <div className="econgraph">
      <div className="eghd">{mapLabel(mr.mapName)} · {tr('라운드별 팀 크레딧','team credits by round')}</div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <path d={line('h')} fill="none" stroke="var(--val)" strokeWidth="2" />
        <path d={line('a')} fill="none" stroke="var(--def)" strokeWidth="2" />
      </svg>
    </div>
  );
}

function TimelineMap({ mr }) {
  return (
    <div className="tlmap">
      <div className="tlmaphd">{mapLabel(mr.mapName)} <b>{mr.h}-{mr.a}</b></div>
      <div className="tlrow">
        {mr.rounds.map(rd => {
          const icons = (rd.defuse ? '◈' : rd.plant ? '✸' : '') + (rd.clutch ? '★' : '');
          const winnerShort = rd.winner === 'home' ? MATCH.home.short : MATCH.away.short;
          const title = `R${rd.n} ${(rd.winner === 'home' ? rd.hSide : rd.aSide).toUpperCase()} ${winnerShort} win`
            + ` · FB ${rd.fb.killer}` + (rd.ability ? ` · ${abilityNameLabel(rd.ability.name)}` : '')
            + (rd.plant ? (rd.defuse ? ' · defused' : ' · planted') : '')
            + (rd.clutch ? ` · ${rd.clutch.player} 1v${rd.clutch.vs}` : '');
          return (
            <span className={`tlcell ${rd.winner}${rd.isPistol ? ' pistol' : ''}`} title={title} key={rd.n}>
              <span className="tln">{rd.n}</span><span className="tlic">{icons}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function Box() {
  useStore();
  const [side, setSide] = useState('home');
  if (!MATCH || !MATCH.fx.played) return null;

  const team = side === 'home' ? MATCH.home : MATCH.away;
  const agBy = MATCH.comps[0] ? agentMap(MATCH.comps[0]) : {};
  const rows = team.roster.map(pl => ({ pl, b: MATCH.box[pl.name] })).sort((a, b) => b.b.rating - a.b.rating);
  const mvpName = matchMVP();
  const mvpStat = MATCH.box[mvpName];

  return (
    <>
      <div className="box">
        <div className="boxtab">
          <button className={side === 'home' ? 'on' : ''} onClick={() => setSide('home')}>{MATCH.home.short}</button>
          <button className={side === 'away' ? 'on' : ''} onClick={() => setSide('away')}>{MATCH.away.short}</button>
        </div>
        <div className="panel">
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>{tr('선수','Player')}</th><th title={tr('영향력 레이팅','Impact rating')}>R</th><th>ACS</th><th>K:D</th><th>KAST</th><th>ADR</th><th>KPR</th><th>APR</th><th>FK:FD</th><th>K</th><th>D</th><th>A</th>
                  <th title="First bloods" className="hide">FB</th><th title="First deaths" className="hide">FD</th>
                  <th title="Clutches">CL</th><th title="Utility plays" className="hide">UT</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ pl, b }) => {
                  const ag = agBy[pl.name] || '';
                  const ratCls = b.rating >= 1.15 ? 'pos' : b.rating < 0.85 ? 'neg' : '';
                  return (
                    <tr key={pl.name}>
                      <td className="pl">{pl.name === mvpName && <span className="mvpstar">★</span>} {pl.name}<span className="agtag"> {agentLabel(ag)}</span></td>
                      <td className={`rat ${ratCls}`}>{b.rating.toFixed(2)}</td>
                      <td className="acs">{b.acsFinal}</td><td>{b.kd.toFixed(2)}</td><td>{Math.round(b.kast*100)}%</td><td>{b.adr.toFixed(1)}</td><td>{b.kpr.toFixed(2)}</td><td>{b.apr.toFixed(2)}</td><td>{b.fb}:{b.fd}</td><td>{b.k}</td><td>{b.d}</td><td>{b.a}</td>
                      <td className="hide">{b.fb}</td><td className="hide">{b.fd}</td><td>{b.cl || 0}</td><td className="hide">{b.util || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="timeline">
        <div className="tlmvp">
          <span className="mvplbl">{tr('경기 최우수 선수','Player of the match')}</span>
          <span className="mvpname">★ {mvpName}</span>
          <span className="mvpline">{mvpStat.rating.toFixed(2)} R · {mvpStat.acsFinal} ACS · {mvpStat.adr.toFixed(1)} ADR · {Math.round(mvpStat.kast*100)}% KAST · {mvpStat.k}/{mvpStat.d}/{mvpStat.a}{mvpStat.cl ? ` · ${mvpStat.cl} clutch` : ''}</span>
        </div>
        {MATCH.mapResults.map((mr, mi) => mr && mr.rounds ? <TimelineMap mr={mr} key={mi} /> : null)}
        {MATCH.mapResults.map((mr, mi) => mr && mr.econ && mr.econ.length ? <EconGraph mr={mr} key={mi} /> : null)}
      </div>
    </>
  );
}
