export const WEAP={
  pistol:['Ghost','Classic','Sheriff','Ghost','Classic'],
  eco:['Classic','Sheriff','Frenzy','Ghost','Classic'],
  force:['Spectre','Bulldog','Marshal','Spectre','Stinger'],
  full:['Vandal','Phantom','Operator','Vandal','Phantom'],
};

export const WCOST={Classic:0,Ghost:500,Sheriff:800,Frenzy:450,Stinger:950,Spectre:1600,Marshal:950,Bulldog:2050,Vandal:2900,Phantom:2900,Operator:4700};

export const SCOST={none:0,light:400,heavy:1000};
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
