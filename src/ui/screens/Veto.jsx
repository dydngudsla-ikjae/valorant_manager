import { useStore } from '../useStore.js';
import { MATCH, ST } from '../../core/state.js';
import { mapSuitFor } from '../../core/draft.js';
import { ARCH, MAPDATA } from '../../data/agents.js';
import { MAPS } from '../../data/leagues.js';
import { playerVeto, startMapDraft, vetoSkip } from '../match-flow.js';

function sideLabel(side) {
  return side === MATCH.playerSide ? 'you' : (side === 'home' ? MATCH.home.short : MATCH.away.short);
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
      {!a && <div className="vsuit">roster fit {suit >= 2 ? '★★' : suit >= 1 ? '★' : '·'}</div>}
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
    prompt = 'Veto complete — 3 maps set';
  } else {
    const [side, act] = v.order[v.step];
    const mine = side === MATCH.playerSide;
    const who = mine ? 'Your' : `${side === 'home' ? MATCH.home.short : MATCH.away.short}'s`;
    prompt = `${who} turn — ${act.toUpperCase()} a map`;
  }

  const actedBy = {};
  v.acts.forEach(a => { actedBy[a.map] = a; });
  const canClick = !done && v.order[v.step][0] === MATCH.playerSide;

  const order = [
    ...v.picks.map((p, i) => ({ label: `Map ${i + 1}`, map: p.map })),
    ...(done ? [{ label: 'Decider', map: MATCH.mapPool[2] }] : []),
  ];

  return (
    <>
      <div className="matchhead">
        <div className="mvenue">{MATCH.home.short} vs {MATCH.away.short} · Week {MATCH.wi + 1} · Map Veto</div>
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
          ? <button className="btn" onClick={() => startMapDraft(0)}>To the draft →</button>
          : <button className="btn ghost" onClick={() => vetoSkip()}>Auto-veto &amp; skip match</button>}
      </div>
    </>
  );
}
