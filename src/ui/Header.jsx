import { useStore } from './useStore.js';
import { ST, bump } from '../core/state.js';
import { tr } from '../i18n.js';

// Replaces the old direct #teamBadge/#badgeDot/#badgeName writes selectTeam()
// used to do -- the badge now just derives from ST.teams/myTeamIdx like every
// other migrated screen.
export function Header() {
  useStore();
  const my = ST.myTeamIdx != null ? ST.teams[ST.myTeamIdx] : null;
  const setLanguage = language => {
    ST.language = language;
    window.localStorage.setItem('vlm-language', language);
    document.documentElement.lang = language;
    bump();
  };
  return (
    <header>
      <div className="wrap bar">
        <div className="logo"><span className="sq"></span>VAL<span className="tag">·</span>MANAGER</div>
        <div className="spacer"></div>
        <div className="langswitch" aria-label={tr('언어 선택', 'Language')}>
          <button className={ST.language === 'ko' ? 'on' : ''} onClick={() => setLanguage('ko')}>한국어</button>
          <button className={ST.language === 'en' ? 'on' : ''} onClick={() => setLanguage('en')}>English</button>
        </div>
        {my && (
          <div className="myteam">
            <span className="lbl">{tr('내 팀', 'MY CLUB')}</span>
            <span className="dot" style={{ background: my.color }}></span>
            <b>{my.name}</b>
          </div>
        )}
      </div>
    </header>
  );
}
