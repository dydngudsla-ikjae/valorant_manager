import { useStore } from '../useStore.js';
import { MATCH, ST } from '../../core/state.js';
import { autoAgentFor, buildCompChoice, buildCompForStance, stanceSuit } from '../../core/draft.js';
import { MAPDATA } from '../../data/agents.js';
import { ROLE } from '../../data/leagues.js';
import { confirmDraft, selectAgent, selectStance, selectTacticalPolicy, skipMatch } from '../match-flow.js';
import { agentLabel, mapLabel, policyLabel, stanceBlurb, stanceLabel, tr, weekLabel } from '../../i18n.js';
import { ATTACK_POLICY_OPTIONS, DEFENSE_POLICY_OPTIONS, POLICY_PRESETS } from '../../core/tactics/tactical-policy.js';

const STANCES = ['AGGRO', 'CONTROL', 'LOCKDOWN', 'BALANCED'];
const POLICY_COPY={
  BALANCED:[['균형','Balanced'],['상황 판단을 우선합니다.','Let the team read the round.']],
  TEMPO:[['템포','Tempo'],['빠른 진입과 적극 수비를 선호합니다.','Favor fast hits and proactive defense.']],
  STRUCTURED:[['체계적','Structured'],['세트 플레이와 리테이크를 선호합니다.','Favor set plays and coordinated retakes.']],
  ADAPTIVE:[['적응형','Adaptive'],['상대 패턴에 따른 페이크와 스택을 선호합니다.','Favor fakes and stacks based on patterns.']],
};

function TacticalPolicyEditor({policy}){
  return <div className="policyedit">
    <div className="policytitle"><b>{tr('감독 전술 정책','Coach Tactical Policy')}</b><span>{tr('선호도이며 상황 판단을 강제하지 않습니다.','Preferences; situational adaptation remains active.')}</span></div>
    <div className="policygrid">
      {Object.keys(POLICY_PRESETS).map(name=>{const copy=POLICY_COPY[name];return <button className={'policycard'+(policy.preset===name?' on':'')} onClick={()=>selectTacticalPolicy('preset',name)} key={name}><b>{tr(...copy[0])}</b><span>{tr(...copy[1])}</span></button>;})}
    </div>
    <div className="policycontrols">
      <label><span>{tr('공격 선호','Attack Focus')}</span><select value={policy.attackFocus} onChange={e=>selectTacticalPolicy('attackFocus',e.target.value)}>{ATTACK_POLICY_OPTIONS.map(value=><option value={value} key={value}>{policyLabel(value)}</option>)}</select></label>
      <label><span>{tr('수비 선호','Defense Focus')}</span><select value={policy.defenseFocus} onChange={e=>selectTacticalPolicy('defenseFocus',e.target.value)}>{DEFENSE_POLICY_OPTIONS.map(value=><option value={value} key={value}>{policyLabel(value)}</option>)}</select></label>
      <label><span>{tr('위험 성향','Risk')}</span><select value={policy.risk} onChange={e=>selectTacticalPolicy('risk',e.target.value)}>{['LOW','NORMAL','HIGH'].map(value=><option value={value} key={value}>{policyLabel(value)}</option>)}</select></label>
    </div>
  </div>;
}

function StanceCard({ mi, s, map, rec, chosen }) {
  const me = ST.teams[ST.myTeamIdx];
  const suit = stanceSuit(me, s);
  const verdict = suit >= 2 ? ['good', tr('우리 팀에 매우 적합','Strong team fit')]
    : suit >= 1 ? ['even', tr('우리 팀에 적합','Good team fit')]
    : ['bad', tr('우리 팀에 익숙하지 않음','Unfamiliar team fit')];
  return (
    <button className={'stanceopt' + (rec ? ' rec' : '') + (chosen ? ' chosen' : '')} onClick={() => selectStance(mi, s)}>
      {rec && <span className="recflag">{tr('분석 추천','Analyst pick')}</span>}
      <div className="sname">{stanceLabel(s)}</div>
      <div className="sblurb">{stanceBlurb(s)}</div>
      <div className={`verdict ${verdict[0]}`}>{verdict[1]}</div>
      <div className="fitrow">
        <span>{tr('적합도','Fit')} <b>{suit >= 2 ? tr('높음','high') : suit >= 1 ? tr('보통','ok') : tr('낮음','low')}</b></span>
        <span>{tr('맵','Map')} <b>{MAPDATA[map].favor === s ? tr('유리','favored') : tr('보통','neutral')}</b></span>
      </div>
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
    return { s, projected: +comp.delta.toFixed(1) };
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
    const recommended=buildCompForStance(my,map,sel.stance);
    const recommendedByPlayer=Object.fromEntries(recommended.agents.map(agent=>[agent.name,agent.agent]));
    compEditor = (
      <div className="compedit">
        {my.roster.map(pl => {
          const chosenAg = sel.choice[pl.name] || recommendedByPlayer[pl.name] || autoAgentFor(pl, map);
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
                    {agentLabel(x.agent)}<b>{x.mastery}</b>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
    const choice = {};
    my.roster.forEach(pl => { choice[pl.name] = sel.choice[pl.name] || recommendedByPlayer[pl.name] || autoAgentFor(pl, map); });
    const myComp = buildCompChoice(my, map, sel.stance, choice);
    draftBtns = (
      <>
        <button className="btn" onClick={() => confirmDraft(mi)}>
          {tr('조합 확정 후 경기 시작','Lock comp & play')} · <span style={{ opacity: .85 }}>{tr('평균 숙련도','avg mastery')} {myComp.avgMastery} · {tr('맵 요원','map agents')} {myComp.favCount}/5 · {tr('페널티','penalty')} -{myComp.penalty}</span>
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
        <div className="mapname">{mapLabel(map)} — {tr('맵 특성','map profile')} {stanceLabel(MAPDATA[map].favor)} · {MATCH.hMaps}-{MATCH.aMaps} {tr('맵','maps')}</div>
      </div>
      <div className="oppread">
        <div className="olbl">{oppTeam.short} {tr('선택 완료','locked in')}</div>
        <div className="ostance">{tr('상대 게임 플랜 비공개','Opponent game plan hidden')}</div>
        <div className="oags">
          {opp.agents.map(a => <span className={`ag r-${a.role}`} key={a.agent}>{agentLabel(a.agent)}</span>)}
        </div>
      </div>
      <div className="eyebrow" style={{ margin: '22px 0 10px' }}>{tr('게임 플랜을 선택하세요','Your call — pick a game plan')}</div>
      <div className="stancegrid">
        {previews.map(({ s, projected }) => (
          <StanceCard mi={mi} s={s} map={map}
            rec={projected === bestProj} chosen={sel.stance === s} key={s} />
        ))}
      </div>
      {sel.stance && <div className="eyebrow" style={{ margin: '24px 0 10px' }}>{tr('선발 선수의 요원을 선택하세요',"Set your comp — pick each starter's agent")}</div>}
      {sel.stance&&sel.policy&&<TacticalPolicyEditor policy={sel.policy}/>}
      {compEditor}
      <div className="btnrow" style={{ marginTop: '18px' }}>{draftBtns}</div>
    </>
  );
}
