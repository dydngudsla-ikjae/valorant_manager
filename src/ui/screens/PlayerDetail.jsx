import { useState } from 'react';
import { useStore } from '../useStore.js';
import { ST, go } from '../../core/state.js';
import { ATTRIBUTE_DEFS, playerAttribute, playerRoleOVR } from '../../core/ratings.js';
import { AGENTS, agImg } from '../../data/agents.js';
import { LEAGUES, PROFBANDS, ROLE, profBand } from '../../data/leagues.js';
import { attributeLabel, proficiencyLabel, roleLabel, tr } from '../../i18n.js';
import { PlayerHistory } from './PlayerHistory.jsx';

const PROF_ROLES = ['DUE', 'INI', 'SEN', 'CON'];
const ROLE_IMAGES = { DUE:'/img/roles/duelist.png', INI:'/img/roles/initiator.png', SEN:'/img/roles/sentinel.png', CON:'/img/roles/controller.png' };
const AGENT_MASTERY_BANDS = [
  [18,'#2ECC71','주력','Core'],
  [15,'#A3E635','능숙','Accomplished'],
  [10,'#F5C518','가능','Capable'],
  [1,'#FF4655','미숙','Unfamiliar'],
  [0,'#56606D','불가능','Unavailable'],
];
const agentMasteryBand=value=>AGENT_MASTERY_BANDS.find(b=>value>=b[0]) || AGENT_MASTERY_BANDS.at(-1);
const agentMasteryLabel=band=>tr(band[2],band[3]);

export function PlayerDetail() {
  useStore();
  const [roleSelection,setRoleSelection]=useState(null);
  const viewContext=ST.playerViewContext;
  const my = viewContext?.previewLeague
    ? LEAGUES[viewContext.previewLeague]?.teams?.[viewContext.previewTeamIdx]
    : ST.teams[ST.myTeamIdx];
  if (!my) return null;
  const pl = [...my.roster, ...(my.bench || [])].find(x => x.name === ST._viewPlayer) || my.roster[0];
  if (!pl) return null;
  const playerKey=pl.playerId||pl.name;
  const selectedRole=roleSelection?.playerKey===playerKey?roleSelection.role:pl.role;
  const ovr=playerRoleOVR(pl,selectedRole);
  const masteryByAgent=new Map((pl.pool || []).map(x => [x.agent,x]));
  const poolsByRole=PROF_ROLES.map(role => ({
    role,
    agents:AGENTS[role].map(agent => masteryByAgent.get(agent) || { agent,role,mastery:0 }),
  }));

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h1 className="big" style={{ fontSize: 'clamp(26px,5vw,40px)' }}>{pl.name}</h1>
        </div>
        <div className="btnrow" style={{ margin: 0, width: 'auto' }}>
          <div className="roleovrhead">
            <div className="detailrole" style={{ color:ROLE[selectedRole].c }}><img src={ROLE_IMAGES[selectedRole]} alt="" /><span>{roleLabel(selectedRole)}</span></div>
            <div className="povr">{ovr}</div>
            <span>OVR</span>
          </div>
          <button className="btn ghost" style={{ width: 'auto' }} onClick={() => go(viewContext?.returnScreen||'scSquad')}>{tr('선수단으로 돌아가기','Back to Squad')}</button>
        </div>
      </div>
      <div className="pdgrid">
        <div className="panel">
          <div className="ph">{tr('능력치','Attributes')}</div>
          <div className="pbody">
            {ATTRIBUTE_DEFS.map(([k, lbl]) => {
              const v = playerAttribute(pl,k);
              const col = v >= 90 ? 'var(--gold)' : v >= 82 ? 'var(--def)' : 'var(--ini)';
              return (
                <div className="stat" key={k}>
                  <label title={tr(`신뢰도 ${Math.round((pl.attributeReliability?.[k]||0)*100)}%`,`Reliability ${Math.round((pl.attributeReliability?.[k]||0)*100)}%`)}>{attributeLabel(k)}</label>
                  <div className="track"><i style={{ width: v + '%', background: col }}></i></div>
                  <span className="v">{v}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="panel">
          <div className="ph roleph">
            <span>{tr('포지션 숙련도','Position ratings')}</span>
            <small>{tr('(역할을 선택하세요)','(Select a role)')}</small>
          </div>
          <div className="pbody">
            <div className="proflegend">
              {PROFBANDS.map(b => (
                <span key={b[1]}><em style={{ background: b[2] }}></em>{proficiencyLabel(b[1])}</span>
              ))}
            </div>
            {PROF_ROLES.map(rr => {
              const v = pl.prof[rr] || 0;
              const b = profBand(v);
              return (
                <button type="button" className={'stat rolepick'+(selectedRole===rr?' selected':'')} key={rr} onClick={()=>setRoleSelection({playerKey,role:rr})}>
                  <label className="rolepicklabel" style={{ color: ROLE[rr].c }}><img src={ROLE_IMAGES[rr]} alt="" />{roleLabel(rr)}</label>
                  <div className="track"><i style={{ width: (v / 20 * 100) + '%', background: b[2] }}></i></div>
                  <span className="statuslight" style={{ '--status-color': b[2] }} title={proficiencyLabel(b[1])} aria-label={proficiencyLabel(b[1])}></span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="panel agentmasterypanel">
          <div className="ph agentmasteryhead">
            <span>{tr('요원 숙련도','Agent mastery')}</span>
            <div className="proflegend masterylegend">
              {AGENT_MASTERY_BANDS.map(b => (
                <span key={b[2]}><em style={{ background:b[1] }}></em>{agentMasteryLabel(b)}</span>
              ))}
            </div>
          </div>
          <div className="pbody agentmasterygrid">
            {poolsByRole.map(group => (
              <section className="agentrole" key={group.role}>
                <h3 style={{ color:ROLE[group.role].c }}><img src={ROLE_IMAGES[group.role]} alt="" />{roleLabel(group.role)}</h3>
                {group.agents.map(x => {
                  const mastery=x.mastery || 0;
                  const b = agentMasteryBand(mastery);
                  const src = agImg(x.agent);
                  return (
                    <div className={'agrow'+(mastery===0?' unmastered':'')} key={x.agent}>
                      <span className={`ag${mastery===0?'':' r-'+(x.role || group.role)}`}>
                        {src && <img className="agicon ag-sm" src={src} alt="" loading="lazy" onError={e=>{e.currentTarget.hidden=true;}} />}
                        {x.agent}
                      </span>
                      <div className="track"><i style={{ width: mastery ? (mastery / 20 * 100) + '%' : '100%', background: b[1] }}></i></div>
                      <span className="statuslight" style={{ '--status-color': b[1] }} title={agentMasteryLabel(b)} aria-label={agentMasteryLabel(b)}></span>
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        </div>
        <PlayerHistory playerId={pl.playerId} />
      </div>
    </>
  );
}
