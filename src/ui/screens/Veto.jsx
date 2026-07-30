import { useStore } from '../useStore.js';
import { MATCH, ST } from '../../core/state.js';
import { mapSuitFor } from '../../core/draft.js';
import { ARCH, MAPDATA } from '../../data/agents.js';
import { MAPS } from '../../data/leagues.js';
import { playerVeto, startMapDraft, vetoSkip } from '../match-flow.js';
import { tr, weekLabel } from '../../i18n.js';

function sideLabel(side) {
  return side === MATCH.playerSide ? tr('내 팀','you') : (side === 'home' ? MATCH.home.short : MATCH.away.short);
}

function VetoTile({ map, acted: a, clickable }) {
  const myTeam = ST.teams[ST.myTeamIdx];
  const fav = ARCH[MAPDATA[map].favor].name;
  const suit = mapSuitFor(myTeam, map);
  const tag = a
    ? (a.act === 'pick' ? `PICK · ${sideLabel(a.side)}`
      : a.act === 'ban' ? `BAN · ${a.side === 'decider' ? '' : sideLabel(a.side)}`
      : 'DECIDER')
    : `favors ${fav}`;
  const Tag = clickable ? 'button' : 'div';
  return (
    <Tag className={'vtile' + (a ? ' ' + a.act : '') + (clickable ? ' live' : '')} onClick={clickable ? () => playerVeto(map) : undefined}>
      <div className="vmap">{map}</div>
      <div className="vtag">{tag}</div>
      {!a && <div className="vsuit">{tr('선수단 적합도','roster fit')} {suit >= 2 ? '★★' : suit >= 1 ? '★' : '·'}</div>}
    </Tag>
  );
}

export function Veto() {
  useStore();
  if (!MATCH || !MATCH.veto) return null;
  const v = MATCH.veto;
  const done = v.step >= v.order.length;

  let prompt;
  if (done) {
    prompt = tr('베토 완료 — 3개 맵 확정','Veto complete — 3 maps set');
  } else {
    const [side, act] = v.order[v.step];
    const mine = side === MATCH.playerSide;
    const team = side === 'home' ? MATCH.home.short : MATCH.away.short;
    const action = act === 'pick' ? tr('선택','PICK') : tr('제외','BAN');
    prompt = mine ? tr(`내 팀 차례 — 맵 ${action}`,`Your turn — ${action} a map`) : tr(`${team} 차례 — 맵 ${action}`,`${team}'s turn — ${action} a map`);
  }

  const actedBy = {};
  v.acts.forEach(a => { actedBy[a.map] = a; });
  const canClick = !done && v.order[v.step][0] === MATCH.playerSide;

  const order = [
    ...v.picks.map((p, i) => ({ label: `${tr('맵','Map')} ${i + 1}`, map: p.map })),
    ...(done ? [{ label: tr('결정 맵','Decider'), map: MATCH.mapPool[2] }] : []),
  ];

  return (
    <>
      <div className="matchhead">
        <div className="mvenue">{MATCH.home.short} vs {MATCH.away.short} · {weekLabel(MATCH.wi + 1)} · {tr('맵 베토','Map Veto')}</div>
        <div className="mapname">{prompt}</div>
      </div>
      <div className="vetogrid">
        {MAPS.map(map => {
          const a = actedBy[map];
          return <VetoTile map={map} acted={a} clickable={canClick && !a} key={map} />;
        })}
      </div>
      <div className="vetoresult">
        {(v.picks.length || done) && order.map(o => (
          <span className="vres" key={o.label}><b>{o.label}</b> {o.map}</span>
        ))}
      </div>
      <div className="btnrow">
        {done
          ? <button className="btn" onClick={() => startMapDraft(0)}>{tr('드래프트로','To the draft')} →</button>
          : <button className="btn ghost" onClick={() => vetoSkip()}>{tr('자동 베토 후 경기 건너뛰기','Auto-veto & skip match')}</button>}
      </div>
    </>
  );
}
