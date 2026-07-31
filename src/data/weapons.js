export const WEAP={
  pistol:['Ghost','Classic','Sheriff','Ghost','Classic'],
  eco:['Classic','Sheriff','Frenzy','Ghost','Classic'],
  force:['Spectre','Bulldog','Marshal','Spectre','Stinger'],
  full:['Vandal','Phantom','Operator','Vandal','Phantom'],
};

const bands=(near,mid=near,far=mid)=>({near,mid,far});

// Canonical economy + combat definition. Both the buy planner and duel engine
// derive their values from here so a balance update cannot desync them.
export const WEAPON_DATA=Object.freeze({
  Classic:  {cost:0,    head:bands(78,66,66),   body:bands(26,22,22), leg:bands(22,18,18), cadence:.42},
  Frenzy:   {cost:450,  head:bands(78,63,63),   body:bands(26,21,21), leg:bands(22,17,17), cadence:.30},
  Ghost:    {cost:500,  head:bands(105,87,87),  body:bands(30,25,25), leg:bands(25,21,21), cadence:.40},
  Sheriff:  {cost:800,  head:bands(159,159,145),body:bands(55,55,50), leg:bands(46,46,42), cadence:.55},
  Stinger:  {cost:1100, head:bands(67,57,57),   body:bands(27,23,23), leg:bands(22,19,19), cadence:.24},
  Spectre:  {cost:1600, head:bands(78,66,60),   body:bands(26,22,20), leg:bands(22,18,17), cadence:.27},
  Bulldog:  {cost:2050, head:bands(116,116,92), body:bands(35,35,28), leg:bands(29,29,23), cadence:.34},
  Phantom:  {cost:2900, head:bands(156,140,140),body:bands(39,35,35), leg:bands(33,29,29), cadence:.29},
  Vandal:   {cost:2900, head:bands(160),         body:bands(40),       leg:bands(34),       cadence:.31},
  Marshal:  {cost:950,  head:bands(202),         body:bands(101),      leg:bands(85),       cadence:.82},
  Operator: {cost:4700, head:bands(255),         body:bands(150),      leg:bands(120),      cadence:1.15},
  BladeStorm:{cost:0, head:bands(150),body:bands(50),leg:bands(42),cadence:.24},
});

export const ARMOR_DATA=Object.freeze({
  none:  {cost:0,shield:0,absorption:.66},
  light: {cost:400,shield:25,absorption:.66},
  heavy: {cost:1000,shield:50,absorption:.66},
  regen: {cost:650,shield:25,absorption:1,regenerationPool:50},
});

export const WCOST=Object.fromEntries(Object.entries(WEAPON_DATA).map(([name,data])=>[name,data.cost]));
export const SCOST=Object.fromEntries(Object.entries(ARMOR_DATA).map(([name,data])=>[name,data.cost]));
// choose a loadout from a player's credits (Valorant-like thresholds)

export const ABFX={
  'Cloudburst':'smoke','Updraft':'move','Tailwind':'move','Blade Storm':'ult',
  'Boom Bot':'recon','Blast Pack':'move','Paint Shells':'molly','Showstopper':'ult',
  'Leer':'flash','Devour':'heal','Dismiss':'move','Empress':'ult',
  'Curveball':'flash','Hot Hands':'molly','Blaze':'wall','Run It Back':'ult',
  'Fast Lane':'wall','Relay Bolt':'stun','High Gear':'move','Overdrive':'ult',
  'Fakeout':'flash','Blindside':'flash','Gatecrash':'move','Dimensional Drift':'ult',
  'Contingency':'wall','Undercut':'stun','Double Tap':'buff','Kill Contract':'ult',
  'Owl Drone':'recon','Shock Bolt':'molly','Recon Bolt':'recon',"Hunter's Fury":'ult',
  'Prowler':'recon','Seize':'stun','Haunt':'recon','Nightfall':'ult',
  'Aftershock':'molly','Flashpoint':'flash','Fault Line':'stun','Rolling Thunder':'ult',
  'Regrowth':'heal','Trailblazer':'recon','Guiding Light':'flash','Seekers':'ult',
  'FRAG/ment':'molly','FLASH/drive':'flash','ZERO/point':'recon','NULL/cmd':'ult',
  'Mosh Pit':'molly','Wingman':'recon','Dizzy':'flash','Thrash':'ult',
  'Stealth Drone':'recon','Special Delivery':'stun','Guided Salvo':'molly','Armageddon':'ult',
  'Nanoswarm':'molly','Alarmbot':'trap','Turret':'trap','Lockdown':'ult',
  'Trapwire':'trap','Cyber Cage':'smoke','Spycam':'recon','Neural Theft':'ult',
  'Barrier Orb':'wall','Slow Orb':'molly','Healing Orb':'heal','Resurrection':'ult',
  'Trademark':'trap','Headhunter':'buff','Rendezvous':'move','Tour De Force':'ult',
  'GravNet':'stun','Sonic Sensor':'trap','Barrier Mesh':'wall','Annihilation':'ult',
  'Shear':'wall','Arc Rose':'flash','Razorvine':'molly','Steel Garden':'ult',
  'Shrouded Step':'move','Paranoia':'flash','Dark Cover':'smoke','From the Shadows':'ult',
  'Stim Beacon':'buff','Incendiary':'molly','Sky Smoke':'smoke','Orbital Strike':'ult',
  'Snake Bite':'molly','Poison Cloud':'smoke','Toxic Screen':'wall',"Viper's Pit":'ult',
  'Gravity Well':'stun','Nova Pulse':'stun','Nebula':'smoke','Astral Form':'ult',
  'Cascade':'wall','Cove':'smoke','High Tide':'wall','Reckoning':'ult',
  'Pick-me-up':'heal','Meddle':'molly','Ruse':'smoke','Not Dead Yet':'ult',
};

export const TYPESYM={smoke:'◍', molly:'♨', wall:'▬', recon:'◎', flash:'✸', stun:'✦', heal:'✚', trap:'◇', move:'»', buff:'▲', ult:'★'};

export const TYPEKO={smoke:'연막', molly:'몰로토프', wall:'벽', recon:'정찰', flash:'섬광', stun:'기절', heal:'회복', trap:'함정', move:'이동', buff:'버프', ult:'궁극기'};
// approximate effect footprint radius as % of the map's width (VALORANT skills have fixed sizes)

export const SKILL_R={smoke:5.5, molly:4, wall:8, recon:9, flash:6, stun:5, heal:3, trap:2.5, move:2, buff:3, ult:8};
