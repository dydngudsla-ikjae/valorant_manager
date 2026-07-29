import DATA from './team-logos.json' with { type:'json' };
export const teamLogo=(teamId,teamName)=>DATA.logos[String(teamId)]||DATA.logos[teamName]||'';
