import { useStore } from './useStore.js';
import { ST } from '../core/state.js';

// Replaces the old direct #teamBadge/#badgeDot/#badgeName writes selectTeam()
// used to do -- the badge now just derives from ST.teams/myTeamIdx like every
// other migrated screen.
export function Header() {
  useStore();
  const my = ST.myTeamIdx != null ? ST.teams[ST.myTeamIdx] : null;
  return (
    <header>
      <div className="wrap bar">
        <div className="logo"><span className="sq"></span>VAL<span className="tag">·</span>MANAGER</div>
        <div className="spacer"></div>
        {my && (
          <div className="myteam">
            <span className="lbl">MY CLUB</span>
            <span className="dot" style={{ background: my.color }}></span>
            <b>{my.name}</b>
          </div>
        )}
      </div>
    </header>
  );
}
