import { useStore } from '../useStore.js';
import { MATCH, ST } from '../../core/state.js';
import { autoAgentFor, buildCompChoice, buildCompForStance, stanceSuit } from '../../core/draft.js';
import { counterEdge } from '../../core/ratings.js';
import { ARCH, MAPDATA } from '../../data/agents.js';
import { ROLE } from '../../data/leagues.js';
import { confirmDraft, selectAgent, selectStance, skipMatch } from '../match-flow.js';
import { tr, weekLabel } from '../../i18n.js';

const STANCES = ['AGGRO', 'CONTROL', 'LOCKDOWN', 'BALANCED'];

function StanceCard({ mi, s, map, oppStance, edge, projected, rec, chosen }) {
  const me = ST.teams[ST.myTeamIdx];
  const suit = stanceSuit(me, s);
  const verdict = edge > 0 ? ['good', `Counters ${ARCH[oppStance].name} +${edge}`]
    : edge < 0 ? ['bad', `Countered ${edge}`]
    : ['even', 'Even read'];
  return (
    <button className={'stanceopt' + (rec ? ' rec' : '') + (chosen ? ' chosen' : '')} onClick={() => selectStance(mi, s)}>
      {rec && <span className="recflag">{tr('분석 추천','Analyst pick')}</span>}
      <div className="sname">{ARCH[s].name}</div>
      <div className="sblurb">{ARCH[s].blurb}</div>
      <div className={`verdict ${verdict[0]}`}>{verdict[1]}</div>
      <div className="fitrow">
        <span>{tr('적합도','Fit')} <b>{suit >= 2 ? tr('높음','high') : suit >= 1 ? tr('보통','ok') : tr('낮음','low')}</b></span>
        <span>{tr('맵','Map')} <b>{MAPDATA[map].favor === s ? tr('유리','favored') : tr('보통','neutral')}</b></span>
      </div>
      <div className={`pw ${projected >= 0 ? 'pos' : 'neg'}`}>{projected >= 0 ? '+' : ''}{projected}</div>
    </button>
  );
}

export function Draft() {
  useStore();
  const my = ST.teams[ST.myTeamIdx];
  if (!my || !MATCH || !MATCH.pendingOpp) return null;

  const mi = MATCH.curMap;
  const map = MATCH.mapPool[mi];
  const opp = MATCH.pendingOpp;
  const sel = MATCH.draftSel;
  const oppTeam = MATCH.playerSide === 'home' ? MATCH.away : MATCH.home;

  const previews = STANCES.map(s => {
    const comp = buildCompForStance(my, map, s);
    const edge = counterEdge(s, opp.stance);
    return { s, edge, projected: +(comp.delta - opp.delta + edge).toFixed(1) };
  });
  const bestProj = Math.max(...previews.map(p => p.projected));

  let compEditor = null;
  let draftBtns;
  if (!sel.stance) {
    draftBtns = (
      <>
        <button className="btn" disabled>{tr('먼저 게임 플랜을 선택하세요','Pick a game plan first')}</button>
        <button className="btn ghost" style={{ width: 'auto' }} onClick={() => skipMatch()}>{tr('경기 건너뛰기','Skip match')}</button>
      </>
    );
  } else {
    const fav = MAPDATA[map].agents;
    compEditor = (
      <div className="compedit">
        {my.roster.map(pl => {
          const chosenAg = sel.choice[pl.name] || autoAgentFor(pl, map);
          return (
            <div className="pcomp" key={pl.name}>
              <div className="pcname"><span className="rolechip sm" style={{ background: ROLE[pl.role].c }}>{pl.role}</span>{pl.name}</div>
              <div className="agpick">
                {pl.pool.map(x => (
                  <button
                    className={'agopt r-' + pl.role + (x.agent === chosenAg ? ' on' : '') + (fav.includes(x.agent) ? ' fav' : '')}
                    onClick={() => selectAgent(mi, pl.name, x.agent)}
                    key={x.agent}
                  >
                    {x.agent}<b>{x.mastery}</b>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
    const choice = {};
    my.roster.forEach(pl => { choice[pl.name] = sel.choice[pl.name] || autoAgentFor(pl, map); });
    const myComp = buildCompChoice(my, map, sel.stance, choice);
    const edge = counterEdge(sel.stance, opp.stance);
    const proj = +(myComp.delta - opp.delta + edge).toFixed(1);
    draftBtns = (
      <>
        <button className="btn" onClick={() => confirmDraft(mi)}>
          {tr('조합 확정 후 경기 시작','Lock comp & play')} · <span style={{ opacity: .85 }}>{tr('평균 숙련도','avg mastery')} {myComp.avgMastery} · {tr('맵 요원','map agents')} {myComp.favCount}/5 · {tr('예상','proj')} {proj >= 0 ? '+' : ''}{proj}</span>
        </button>
        <button className="btn ghost" style={{ width: 'auto' }} onClick={() => skipMatch()}>{tr('건너뛰기','Skip')}</button>
      </>
    );
  }

  return (
    <>
      <div className="matchhead">
        <div className="mvenue">{MATCH.home.short} vs {MATCH.away.short} · {weekLabel(MATCH.wi + 1)} · {tr('드래프트','Draft')}</div>
        <div className="scoreline" style={{ margin: '10px 0' }}>
          <div className="side home">
            <div className="crest" style={{ background: MATCH.home.color, fontSize: '13px' }}>{MATCH.home.short}</div>
            <div className="sn">{MATCH.home.name}</div>
          </div>
          <div className="bigscore" style={{ fontSize: 'clamp(20px,4vw,30px)' }}><span>{tr('맵','Map')} {mi + 1}</span></div>
          <div className="side away">
            <div className="crest" style={{ background: MATCH.away.color, fontSize: '13px' }}>{MATCH.away.short}</div>
            <div className="sn">{MATCH.away.name}</div>
          </div>
        </div>
        <div className="mapname">{map} — {tr('유리한 플랜','favors')} {ARCH[MAPDATA[map].favor].name} · {MATCH.hMaps}-{MATCH.aMaps} {tr('맵','maps')}</div>
      </div>
      <div className="oppread">
        <div className="olbl">{oppTeam.short} {tr('선택 완료','locked in')}</div>
        <div className="ostance">{ARCH[opp.stance].name}</div>
        <div className="oags">
          {opp.agents.map(a => <span className={`ag r-${a.role}${a.favored ? ' fav' : ''}`} key={a.agent}>{a.agent}</span>)}
        </div>
      </div>
      <div className="eyebrow" style={{ margin: '22px 0 10px' }}>{tr('게임 플랜을 선택하세요','Your call — pick a game plan')}</div>
      <div className="stancegrid">
        {previews.map(({ s, edge, projected }) => (
          <StanceCard mi={mi} s={s} map={map} oppStance={opp.stance} edge={edge} projected={projected}
            rec={projected === bestProj} chosen={sel.stance === s} key={s} />
        ))}
      </div>
      {sel.stance && <div className="eyebrow" style={{ margin: '24px 0 10px' }}>{tr('선발 선수의 요원을 선택하세요',"Set your comp — pick each starter's agent")}</div>}
      {compEditor}
      <div className="btnrow" style={{ marginTop: '18px' }}>{draftBtns}</div>
    </>
  );
}
