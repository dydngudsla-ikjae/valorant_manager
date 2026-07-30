import { useEffect, useRef, useState } from 'react';
import { ATTRIBUTE_DEFS, CORE_ATTRIBUTE_KEYS, playerAttribute, playerOVR, teamAxis, teamOVR } from '../../core/ratings.js';
import { visiblePool } from '../../core/roster.js';
import { agImg } from '../../data/agents.js';
import { LEAGUES, ROLE, isFlex, primaryRole, profBand } from '../../data/leagues.js';
import { attributeLabel, roleLabel } from '../../i18n.js';
import { selectTeam } from '../match-flow.js';
import { teamLogo } from '../../data/team-logos.js';
import { playerImage } from '../../data/player-images.js';

const PROF_ROLES = ['DUE', 'INI', 'SEN', 'CON'];
const ROLE_IMAGES = { DUE:'/img/roles/duelist.png', INI:'/img/roles/initiator.png', SEN:'/img/roles/sentinel.png', CON:'/img/roles/controller.png' };
const MINI_AXES = CORE_ATTRIBUTE_KEYS;

function TeamCard({ t, lk, selected, onClick }) {
  const nameClass=t.name.length>25?' extra-long':t.name.length>16?' long':'';
  const logo=teamLogo(t.id,t.name);
  return (
    <button className={'pick teamcard' + (selected ? ' sel' : '')} onClick={onClick}>
      <div className="stripe" style={{ background: t.color }}></div>
      {logo&&<img className="teamlogo" src={logo} alt="" />}
      <div className="ovr">{teamOVR(t)}<span>OVR</span></div>
      <div className={'tname'+nameClass} title={t.name}><span>{t.name}</span></div>
      <div className="tregion">{LEAGUES[lk].name}</div>
      <div className="mini">
        {MINI_AXES.map(ax => {
          const v = Math.round(teamAxis(t, ax));
          const col = ax === 'firepower' ? 'var(--val)' : ax === 'tactical' ? 'var(--ini)' : 'var(--def)';
          return <div className="m" title={ax} key={ax}><i style={{ width: v + '%', background: col }}></i></div>;
        })}
      </div>
    </button>
  );
}

function PreviewAgentChip({ x, role }) {
  const src = agImg(x.agent);
  return (
    <span className={`agentportrait r-${x.role || role}`} title={x.agent}>
      {src && <img src={src} alt={x.agent} loading="lazy" />}
    </span>
  );
}

function PreviewPlayerCard({ pl }) {
  const mainRole=primaryRole(pl),flex=isFlex(pl);
  const ovr = playerOVR(pl);
  const portrait=playerImage(pl);
  return (
    <div className="pcard">
      <div className="prow">
        <div className={'playerportrait'+(portrait?'':' empty')}>{portrait?<img src={portrait} alt="" loading="lazy" />:<span>{pl.name.slice(0,1)}</span>}</div>
        <div className="playeridentity"><div className="pn"><span>{pl.name}</span></div></div>
        <div className="cardrole" style={{ color:ROLE[mainRole].c }}><img src={ROLE_IMAGES[mainRole]} alt="" /><span>{roleLabel(mainRole)}</span></div>
        <div className="povr" style={{ color: ovr >= 90 ? 'var(--gold)' : 'var(--text)' }}>{ovr}</div>
      </div>
      <div className="cardbadges">{flex&&<span className="playerbadge flex">FLEX</span>}</div>
      <div className="profrow">
        {PROF_ROLES.map(rr => {
          const b = profBand(pl.prof[rr]);
          return (
            <span className="profseg" key={rr} title={`${ROLE[rr].name} ${pl.prof[rr]}`}>
              <i>{roleLabel(rr)}</i><em style={{ background: b[2] }}></em>
            </span>
          );
        })}
      </div>
      {ATTRIBUTE_DEFS.map(([k, lbl]) => {
        const v = playerAttribute(pl,k);
        const col = v >= 90 ? 'var(--gold)' : v >= 82 ? 'var(--def)' : 'var(--ini)';
        return (
          <div className="stat card-attribute-row" key={k}>
            <label>{attributeLabel(k)}</label>
            <div className="track"><i style={{ width: v + '%', background: col }}></i></div>
            <span className="v">{v}</span>
          </div>
        );
      })}
      <div className="poolrow">
        <span className="poollbl">Agent pool</span>
        {visiblePool(pl, 4).map(x => <PreviewAgentChip x={x} role={pl.role} key={x.agent} />)}
      </div>
    </div>
  );
}

export function Select() {
  const leagueKeys = Object.keys(LEAGUES);
  const [lk, setLk] = useState(leagueKeys[0]);
  const [previewIdx, setPreviewIdx] = useState(null);
  const previewRef = useRef(null);

  useEffect(() => {
    if (previewIdx !== null) previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [previewIdx]);

  const league = LEAGUES[lk];
  const previewT = previewIdx !== null ? league.teams[previewIdx] : null;
  const roster = previewT
    ? [...(previewT.registered || [...previewT.roster, ...(previewT.bench || [])])].sort((a, b) => playerOVR(b) - playerOVR(a))
    : [];

  return (
    <>
      <div className="tabs">
        {leagueKeys.map(k => (
          <button className={'tab' + (k === lk ? ' on' : '')} onClick={() => { setLk(k); setPreviewIdx(null); }} key={k}>
            {LEAGUES[k].name}
          </button>
        ))}
      </div>
      <div className="grid g-teams">
        {league.teams.map((t, idx) => (
          <TeamCard t={t} lk={lk} selected={idx === previewIdx} onClick={() => setPreviewIdx(idx)} key={t.name} />
        ))}
      </div>
      {previewT && (
        <div className="selectpreview" ref={previewRef}>
          <div className="sppanel">
            <div className="sphead">
              <div>
                <div className="eyebrow">{league.name}</div>
                <h2 className="spname">{previewT.name}</h2>
              </div>
              <div className="spright">
                <div className="povr" style={{ fontSize: '30px' }}>{teamOVR(previewT)}</div>
                <button className="btn" style={{ width: 'auto' }} onClick={() => selectTeam(lk, previewIdx)}>이 팀 선택 →</button>
              </div>
            </div>
            <p className="sub" style={{ margin: '2px 0 14px' }}>이 스쿼드로 시즌을 운영합니다. 선수 능력치·역할을 확인하고 <b>이 팀 선택</b>을 누르면 확정됩니다.</p>
            <div className="squadgrid">
              {roster.map(pl => <PreviewPlayerCard pl={pl} key={pl.name} />)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
