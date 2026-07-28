import { useStore } from '../useStore.js';
import { ST } from '../../core/state.js';
import { playerOVR } from '../../core/ratings.js';
import { agImg } from '../../data/agents.js';
import { PROFBANDS, ROLE, displayRole, profBand, roleFull } from '../../data/leagues.js';
import { go } from '../../legacy.js';

const AXES = [['aim', 'Aim'], ['sense', 'Sense'], ['clutch', 'Clutch'], ['util', 'Util'], ['mental', 'Mental']];
const PROF_ROLES = ['DUE', 'INI', 'SEN', 'CON'];

export function PlayerDetail() {
  useStore();
  const my = ST.teams[ST.myTeamIdx];
  if (!my) return null;
  const pl = [...my.roster, ...(my.bench || [])].find(x => x.name === ST._viewPlayer) || my.roster[0];
  if (!pl) return null;
  const disp = displayRole(pl);
  const ovr = playerOVR(pl);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <div>
          <div className="eyebrow">{disp} · {roleFull(pl)}</div>
          <h1 className="big" style={{ fontSize: 'clamp(26px,5vw,40px)' }}>{pl.name}</h1>
        </div>
        <div className="btnrow" style={{ margin: 0, width: 'auto' }}>
          <div className="povr" style={{ fontSize: '34px', marginRight: '8px' }}>{ovr}</div>
          <button className="btn ghost" style={{ width: 'auto' }} onClick={() => go('scSquad')}>Back to Squad</button>
        </div>
      </div>
      <div className="pdgrid">
        <div className="panel">
          <div className="ph">Attributes</div>
          <div className="pbody">
            {AXES.map(([k, lbl]) => {
              const v = pl[k];
              const col = v >= 90 ? 'var(--gold)' : v >= 82 ? 'var(--def)' : 'var(--ini)';
              return (
                <div className="stat" key={k}>
                  <label>{lbl}</label>
                  <div className="track"><i style={{ width: v + '%', background: col }}></i></div>
                  <span className="v">{v}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel">
          <div className="ph">Position proficiency</div>
          <div className="pbody">
            <div className="proflegend">
              {PROFBANDS.map(b => (
                <span key={b[1]}><em style={{ background: b[2] }}></em>{b[1]} {b[0] ? b[0] + '+' : '<10'}</span>
              ))}
            </div>
            {PROF_ROLES.map(rr => {
              const v = pl.prof[rr];
              const b = profBand(v);
              return (
                <div className="stat" key={rr}>
                  <label style={{ color: ROLE[rr].c }}>{ROLE[rr].name}</label>
                  <div className="track"><i style={{ width: (v / 20 * 100) + '%', background: b[2] }}></i></div>
                  <span className="v" style={{ color: b[2] }}>{v}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel">
          <div className="ph">Agent mastery</div>
          <div className="pbody">
            {(pl.pool || []).length ? (pl.pool || []).map(x => {
              const b = profBand(x.mastery);
              const src = agImg(x.agent);
              return (
                <div className="agrow" key={x.agent}>
                  <span className={`ag r-${x.role || pl.role}`}>
                    {src && <img className="agicon ag-sm" src={src} alt={x.agent} loading="lazy" />}
                    {x.agent}
                  </span>
                  <div className="track"><i style={{ width: (x.mastery / 20 * 100) + '%', background: b[2] }}></i></div>
                  <span className="v">{x.mastery}</span>
                </div>
              );
            }) : <div className="pmeta">에이전트 풀 데이터 없음</div>}
          </div>
        </div>
      </div>
    </>
  );
}
