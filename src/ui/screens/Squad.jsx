import { useStore } from '../useStore.js';
import { ST, bump } from '../../core/state.js';
import { playerOVR } from '../../core/ratings.js';
import { visiblePool } from '../../core/roster.js';
import { agImg } from '../../data/agents.js';
import { LEAGUES, ROLE, displayRole, profBand, roleColor, roleFull } from '../../data/leagues.js';
import { go } from '../../legacy.js';

const AXES = [['aim', 'Aim'], ['sense', 'Sense'], ['clutch', 'Clutch'], ['util', 'Util'], ['mental', 'Mental']];
const PROF_ROLES = ['DUE', 'INI', 'SEN', 'CON'];

function openPlayer(name) {
  ST._viewPlayer = name;
  bump();
  go('scPlayer');
}

function AgentChip({ x, role }) {
  const src = agImg(x.agent);
  return (
    <span className={`ag r-${x.role || role}`}>
      {src && <img className="agicon ag-sm" src={src} alt={x.agent} loading="lazy" />}
      {x.agent} <b>{x.mastery}</b>
    </span>
  );
}

function PlayerCard({ pl, isSub }) {
  const disp = displayRole(pl);
  const ovr = playerOVR(pl);
  return (
    <div className={'pcard clickable' + (isSub ? ' sub' : '')} onClick={() => openPlayer(pl.name)}>
      <div className="prow">
        <div className="rolechip" style={{ background: roleColor(pl) }}>{disp}</div>
        <div>
          <div className="pn">{pl.name}{isSub && <span className="subtag">SUB</span>}</div>
          <div className="pmeta">{roleFull(pl)}</div>
        </div>
        <div className="povr" style={{ color: ovr >= 90 ? 'var(--gold)' : 'var(--text)' }}>{ovr}</div>
      </div>
      <div className="profrow">
        {PROF_ROLES.map(rr => {
          const b = profBand(pl.prof[rr]);
          return (
            <span className="profseg" key={rr} title={`${ROLE[rr].name} ${pl.prof[rr]}`}>
              <i>{rr}</i><em style={{ background: b[2] }}></em>
            </span>
          );
        })}
      </div>
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
      <div className="poolrow">
        <span className="poollbl">Agent pool</span>
        {visiblePool(pl, 4).map(x => <AgentChip x={x} role={pl.role} key={x.agent} />)}
      </div>
      <div className="cardhint">상세 보기 →</div>
    </div>
  );
}

export function Squad() {
  useStore();
  const my = ST.teams[ST.myTeamIdx];
  if (!my) return null;
  const roster = [...my.roster].sort((a, b) => playerOVR(b) - playerOVR(a));
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
        <div>
          <div className="eyebrow">{LEAGUES[ST.league].name} · My Club</div>
          <h1 className="big" style={{ fontSize: 'clamp(26px,5vw,40px)' }}>{my.name}</h1>
        </div>
        <button className="btn ghost" style={{ width: 'auto' }} onClick={() => go('scHub')}>Back to Hub</button>
      </div>
      <p className="sub" style={{ marginBottom: '20px' }}>Five ratings drive everything: <b style={{ color: 'var(--text)' }}>Aim</b> wins duels, <b style={{ color: 'var(--text)' }}>Sense</b> reads rounds, <b style={{ color: 'var(--text)' }}>Clutch</b> saves lost ones, <b style={{ color: 'var(--text)' }}>Util</b> is setup &amp; support, <b style={{ color: 'var(--text)' }}>Mental</b> holds under pressure. Role weights how each counts.</p>
      <div className="squadgrid">
        {roster.map(pl => <PlayerCard pl={pl} isSub={false} key={pl.name} />)}
        {(my.bench || []).map(pl => <PlayerCard pl={pl} isSub={true} key={pl.name} />)}
      </div>
    </>
  );
}
