import { useStore } from '../useStore.js';
import { ST, bump, go } from '../../core/state.js';
import { ATTRIBUTE_DEFS, playerAttribute, playerOVR } from '../../core/ratings.js';
import { visiblePool } from '../../core/roster.js';
import { agImg } from '../../data/agents.js';
import { LEAGUES, ROLE, isFlex, primaryRole, profBand } from '../../data/leagues.js';
import { selectTeam } from '../match-flow.js';
import { attributeLabel, roleLabel, tr } from '../../i18n.js';
import { teamLogo } from '../../data/team-logos.js';

const PROF_ROLES = ['DUE', 'INI', 'SEN', 'CON'];
const ROLE_IMAGES = { DUE:'/img/roles/duelist.png', INI:'/img/roles/initiator.png', SEN:'/img/roles/sentinel.png', CON:'/img/roles/controller.png' };

function openPlayer(name,context) {
  ST._viewPlayer = name;
  ST.playerViewContext=context;
  bump();
  go('scPlayer');
}

function AgentChip({ x, role }) {
  const src = agImg(x.agent);
  return (
    <span className={`agentportrait r-${x.role || role}`} title={x.agent}>
      {src && <img src={src} alt={x.agent} loading="lazy" />}
    </span>
  );
}

function PlayerCard({ pl, isSub, viewContext }) {
  const mainRole=primaryRole(pl),flex=isFlex(pl);
  const ovr = playerOVR(pl);
  return (
    <div className={'pcard clickable' + (isSub ? ' bench' : '')} onClick={() => openPlayer(pl.name,viewContext)}>
      <div className="prow">
        <div className="roleunit">
          <div className="rolechip roleiconchip" style={{ '--role-color':ROLE[mainRole].c }}><img src={ROLE_IMAGES[mainRole]} alt="" /></div>
          <span className="rolecaption">{roleLabel(mainRole)}</span>
        </div>
        <div className="playeridentity"><div className="pn"><span>{pl.name}</span></div></div>
        <div className="povr" style={{ color: ovr >= 90 ? 'var(--gold)' : 'var(--text)' }}>{ovr}</div>
      </div>
      <div className="cardbadges">{flex&&<span className="playerbadge flex">FLEX</span>}{isSub&&<span className="playerbadge substitute">SUB</span>}</div>
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
          <div className="stat" key={k}>
            <label>{attributeLabel(k)}</label>
            <div className="track"><i style={{ width: v + '%', background: col }}></i></div>
            <span className="v">{v}</span>
          </div>
        );
      })}
      <div className="poolrow">
        <span className="poollbl">{tr('요원폭','Agent pool')}</span>
        {visiblePool(pl, 4).map(x => <AgentChip x={x} role={pl.role} key={x.agent} />)}
      </div>
      <div className="cardhint">상세 보기 →</div>
    </div>
  );
}

export function Squad({preview=false}) {
  useStore();
  const previewLeague=ST.previewLeague,previewIdx=ST.previewTeamIdx;
  const my = preview ? LEAGUES[previewLeague]?.teams?.[previewIdx] : ST.teams[ST.myTeamIdx];
  if (!my) return null;
  const viewContext=preview?{returnScreen:'scTeamPreview',previewLeague,previewTeamIdx:previewIdx}:{returnScreen:'scSquad'};
  const roster = [...my.roster].sort((a, b) => playerOVR(b) - playerOVR(a));
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
        <div className="teamtitle">
          {teamLogo(my.id,my.name)&&<img className="teamtitlelogo" src={teamLogo(my.id,my.name)} alt="" />}
          <div>
            <h1 className="big" style={{ fontSize: 'clamp(26px,5vw,40px)' }}>{my.name}</h1>
          </div>
        </div>
        <div className="btnrow" style={{margin:0,width:'auto'}}>
          {preview&&<button className="btn" style={{width:'auto'}} onClick={()=>selectTeam(previewLeague,previewIdx)}>{tr('이 팀 선택','Select this team')}</button>}
          <button className="btn ghost" style={{width:'auto'}} onClick={()=>go(preview?'scSelect':'scHub')}>{preview?tr('팀 목록으로','Back to teams'):tr('허브로','Back to Hub')}</button>
        </div>
      </div>
      <p className="sub" style={{ marginBottom: '20px' }}>
        {tr('능력치는 여러 시즌의 VCT 기록을 사용합니다.','Ratings use multi-year VCT evidence.')}<br />
        {tr('현재 시즌 폼은 별도로 반영되며 역할별 가중치가 OVR과 시뮬레이션 영향도를 결정합니다.','Current-season form is applied separately, and role-specific weights determine OVR and simulation impact.')}
      </p>
      <div className="squadgrid">
        {roster.map(pl => <PlayerCard pl={pl} isSub={false} viewContext={viewContext} key={pl.name} />)}
        {(my.bench || []).map(pl => <PlayerCard pl={pl} isSub={true} viewContext={viewContext} key={pl.name} />)}
      </div>
    </>
  );
}
