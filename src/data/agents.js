export const AGENTS = {
  DUE:['Jett','Raze','Reyna','Phoenix','Neon','Yoru','Iso','Waylay'],
  INI:['Sova','Fade','Breach','Skye','KAY/O','Gekko','Tejo'],
  SEN:['Killjoy','Cypher','Sage','Chamber','Deadlock','Vyse','Veto'],
  CON:['Omen','Brimstone','Viper','Astra','Harbor','Clove','Miks'],
  FLEX:['Raze','Neon','Omen','Astra','KAY/O','Gekko','Sova','Cypher'],
};
// Each agent: kit vector en(entry) in(info) co(control) su(support) cl(clutch) le(lethality) + 4 abilities

export const AGENT_KITS = {
  Jett:{en:9,in:2,co:3,su:1,cl:7,le:4,ab:['Cloudburst','Updraft','Tailwind','Blade Storm']},
  Raze:{en:8,in:2,co:2,su:1,cl:6,le:9,ab:['Boom Bot','Blast Pack','Paint Shells','Showstopper']},
  Reyna:{en:8,in:1,co:1,su:1,cl:8,le:5,ab:['Leer','Devour','Dismiss','Empress']},
  Phoenix:{en:7,in:2,co:3,su:3,cl:6,le:5,ab:['Curveball','Hot Hands','Blaze','Run It Back']},
  Neon:{en:9,in:2,co:2,su:1,cl:6,le:5,ab:['Fast Lane','Relay Bolt','High Gear','Overdrive']},
  Yoru:{en:7,in:4,co:3,su:2,cl:6,le:4,ab:['Fakeout','Blindside','Gatecrash','Dimensional Drift']},
  Iso:{en:7,in:2,co:2,su:2,cl:8,le:6,ab:['Contingency','Undercut','Double Tap','Kill Contract']},
  Sova:{en:4,in:9,co:2,su:3,cl:4,le:6,ab:['Owl Drone','Shock Bolt','Recon Bolt',"Hunter's Fury"]},
  Fade:{en:4,in:9,co:2,su:3,cl:4,le:6,ab:['Prowler','Seize','Haunt','Nightfall']},
  Breach:{en:5,in:6,co:4,su:4,cl:3,le:6,ab:['Aftershock','Flashpoint','Fault Line','Rolling Thunder']},
  Skye:{en:4,in:7,co:2,su:7,cl:3,le:4,ab:['Regrowth','Trailblazer','Guiding Light','Seekers']},
  'KAY/O':{en:5,in:6,co:2,su:4,cl:4,le:6,ab:['FRAG/ment','FLASH/drive','ZERO/point','NULL/cmd']},
  Gekko:{en:5,in:7,co:3,su:6,cl:3,le:5,ab:['Mosh Pit','Wingman','Dizzy','Thrash']},
  Tejo:{en:4,in:8,co:3,su:3,cl:3,le:7,ab:['Stealth Drone','Special Delivery','Guided Salvo','Armageddon']},
  Killjoy:{en:2,in:6,co:6,su:4,cl:6,le:6,ab:['Nanoswarm','Alarmbot','Turret','Lockdown']},
  Cypher:{en:2,in:9,co:5,su:3,cl:6,le:3,ab:['Trapwire','Cyber Cage','Spycam','Neural Theft']},
  Sage:{en:2,in:3,co:6,su:9,cl:6,le:2,ab:['Barrier Orb','Slow Orb','Healing Orb','Resurrection']},
  Chamber:{en:5,in:3,co:4,su:2,cl:8,le:7,ab:['Trademark','Headhunter','Rendezvous','Tour De Force']},
  Deadlock:{en:2,in:5,co:7,su:4,cl:5,le:5,ab:['GravNet','Sonic Sensor','Barrier Mesh','Annihilation']},
  Vyse:{en:2,in:5,co:8,su:4,cl:6,le:4,ab:['Shear','Arc Rose','Razorvine','Steel Garden']},
  Omen:{en:3,in:4,co:8,su:3,cl:6,le:3,ab:['Shrouded Step','Paranoia','Dark Cover','From the Shadows']},
  Brimstone:{en:3,in:3,co:8,su:5,cl:4,le:5,ab:['Stim Beacon','Incendiary','Sky Smoke','Orbital Strike']},
  Viper:{en:3,in:4,co:9,su:4,cl:6,le:6,ab:['Snake Bite','Poison Cloud','Toxic Screen',"Viper's Pit"]},
  Astra:{en:2,in:5,co:9,su:5,cl:5,le:3,ab:['Gravity Well','Nova Pulse','Nebula','Astral Form']},
  Harbor:{en:3,in:4,co:8,su:5,cl:4,le:3,ab:['Cascade','Cove','High Tide','Reckoning']},
  Clove:{en:5,in:3,co:7,su:4,cl:7,le:4,ab:['Pick-me-up','Meddle','Ruse','Not Dead Yet']},
};

export const KIT_DEFAULT={DUE:{en:7,in:2,co:2,su:2,cl:6,le:6},INI:{en:4,in:7,co:3,su:5,cl:3,le:5},
  SEN:{en:2,in:6,co:6,su:5,cl:6,le:4},CON:{en:3,in:4,co:8,su:4,cl:5,le:4}};

export const ARCH = {
  AGGRO:   {name:'Fast Execute', blurb:'tempo & space'},
  CONTROL: {name:'Slow Default',  blurb:'map control'},
  LOCKDOWN:{name:'Lockdown',      blurb:'info denial'},
  BALANCED:{name:'Balanced',      blurb:'flexible'},
};

export const BEATS = {AGGRO:'CONTROL', CONTROL:'LOCKDOWN', LOCKDOWN:'AGGRO'};

export const MAPDATA = {
  Ascent:{favor:'CONTROL', agents:['Killjoy','Sova','Omen','Jett']},
  Bind:  {favor:'AGGRO',   agents:['Raze','Skye','Viper','Brimstone']},
  Haven: {favor:'CONTROL', agents:['Cypher','Breach','Omen','Jett']},
  Split: {favor:'LOCKDOWN',agents:['Sage','Cypher','Raze','Omen']},
  Lotus: {favor:'LOCKDOWN',agents:['Fade','Killjoy','Omen','Raze']},
  Sunset:{favor:'AGGRO',   agents:['Phoenix','Fade','Omen','Cypher']},
  Icebox:{favor:'CONTROL', agents:['Viper','Sova','Jett','Killjoy']},
};

// deterministic seeded shuffle so each player's pool is stable across sessions

export function agImg(a){ if(!a)return ""; return `/img/agents/${a.toLowerCase().replace(/\//g,"").replace(/[^a-z0-9]/g,"")}.png`; }

export function agIcon(a,cls){ const s=agImg(a); return s?`<img class="agicon ${cls||''}" src="${s}" alt="${a}" loading="lazy">`:""; }

export const AGENT_ROLE=(()=>{const m={};for(const r of ['DUE','INI','SEN','CON']){(AGENTS[r]||[]).forEach(a=>m[a]=r);}return m;})();
