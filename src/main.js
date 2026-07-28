import './styles/all.css';
import STATS_BY_NAME from './data/player-stats.json';
import NAVGRID from './data/geo/ascent-navgrid.json';

/* ============================================================
   VALORANT LEAGUE MANAGER — foundation engine
   Data-driven so growth/aging/transfers bolt on later.
   ============================================================ */

const ROLE = {
  DUE:{name:"Duelist",  c:"var(--due)", w:{aim:.36,sense:.20,clutch:.22,util:.08,mental:.14}},
  INI:{name:"Initiator",c:"var(--ini)", w:{aim:.24,sense:.28,clutch:.12,util:.24,mental:.12}},
  SEN:{name:"Sentinel", c:"var(--sen)", w:{aim:.22,sense:.22,clutch:.20,util:.24,mental:.12}},
  CON:{name:"Controller",c:"var(--con)",w:{aim:.20,sense:.30,clutch:.12,util:.26,mental:.12}},
  FLEX:{name:"Flex",     c:"var(--flex)", w:{aim:.255,sense:.25,clutch:.165,util:.205,mental:.125}},
};
const MAPS=["Ascent","Bind","Haven","Split","Lotus","Sunset","Icebox"];

/* p(): compact player factory  — name, role, aim,sense,clutch,util,mental */
function p(name,role,a,s,c,u,m,prof){
  const base={DUE:8,INI:8,SEN:8,CON:8}; base[role]=20;
  if(prof) Object.assign(base,prof);
  return{name,role,aim:a,sense:s,clutch:c,util:u,mental:m,prof:base};
}
function primaryRole(pl){ let best=pl.role,bv=-1; for(const r of ['DUE','INI','SEN','CON']){ if(pl.prof[r]>bv){bv=pl.prof[r];best=r;} } return best; }
function isFlex(pl){ if(pl._flex===true)return true; if(pl._flex===false)return false; return ['DUE','INI','SEN','CON'].filter(r=>pl.prof[r]>=15).length>=2; }
function secondaryRole(pl){ const prim=primaryRole(pl); let best=null,bv=12; for(const r of ['DUE','INI','SEN','CON']){ if(r!==prim&&pl.prof[r]>bv){bv=pl.prof[r];best=r;} } return best; }
function displayRole(pl){ if(isFlex(pl))return 'FLEX'; const sec=secondaryRole(pl); const prim=primaryRole(pl); return sec?prim+'/'+sec:prim; }
function roleColor(pl){ return ROLE[primaryRole(pl)].c; }
function roleFull(pl){ if(isFlex(pl))return 'Flex · main '+ROLE[primaryRole(pl)].name; const sec=secondaryRole(pl); return ROLE[primaryRole(pl)].name+(sec?' / '+ROLE[sec].name:''); }
// a compact, role-balanced pool for cards: top by mastery, but guarantee a secondary-role agent shows
function visiblePool(pl,n){ n=n||4; const pool=(pl.pool||[]).slice(); if(!pool.length)return [];
  const roleOf=x=>x.role||'?'; const prim=primaryRole(pl);
  const pick=pool.slice(0,n);
  // roles to guarantee representation for: any real secondary (prof>=15) plus the displayed secondary (prof>=13)
  const want=new Set(); ['DUE','INI','SEN','CON'].forEach(r=>{ if(r!==prim&&pl.prof[r]>=15)want.add(r); });
  const sec=secondaryRole(pl); if(sec)want.add(sec);
  want.forEach(r=>{ if(!pick.some(x=>roleOf(x)===r)){ const a=pool.find(x=>roleOf(x)===r); if(a){ pick.pop(); pick.push(a); } } });
  return pick; }
// 0-20 proficiency bands: [min, label, color]
const PROFBANDS=[[18,'능숙함','#2ECC71'],[15,'자연스러움','#A3E635'],[10,'가능함','#F5C518'],[0,'불가능','#FF4655']];
function profBand(v){ for(const b of PROFBANDS){ if(v>=b[0])return b; } return PROFBANDS[PROFBANDS.length-1]; }

const LEAGUES = {
  AMER: { name:"Americas", teams:[
    {name:"NRG", short:"NRG", color:"#000000", roster:[p("keiko","CON",80,80,80,80,80),p("Ethan","INI",80,80,80,80,80),p("skuba","CON",80,80,80,80,80),p("mada","DUE",80,80,80,80,80),p("brawk","INI",80,80,80,80,80)], bench:[]},
    {name:"Sentinels", short:"SEN", color:"#E4223A", roster:[p("johnqt","CON",80,80,80,80,80),p("cortezia","SEN",80,80,80,80,80),p("Reduxx","DUE",80,80,80,80,80),p("JonahP","INI",80,80,80,80,80),p("Jerrwin","DUE",80,80,80,80,80)], bench:[p("Kyu","INI",80,80,80,80,80)]},
    {name:"G2 Esports", short:"G2", color:"#E7352C", roster:[p("leaf","CON",80,80,80,80,80),p("valyn","CON",80,80,80,80,80),p("jawgemo","DUE",80,80,80,80,80),p("trent","INI",80,80,80,80,80),p("BABYBAY","SEN",80,80,80,80,80)], bench:[]},
    {name:"MIBR", short:"MBR", color:"#F2C200", roster:[p("Mazino","CON",80,80,80,80,80),p("tex","SEN",80,80,80,80,80),p("aspas","DUE",80,80,80,80,80),p("zekken","DUE",80,80,80,80,80),p("Verno","INI",80,80,80,80,80)], bench:[]},
    {name:"LOUD", short:"LLL", color:"#12E28C", roster:[p("lukxo","CON",80,80,80,80,80),p("Darker","CON",80,80,80,80,80),p("cauanzin","INI",80,80,80,80,80),p("Virtyy","DUE",80,80,80,80,80),p("erde","CON",80,80,80,80,80)], bench:[p("Bati","CON",80,80,80,80,80)]},
    {name:"Cloud9", short:"C9", color:"#0090D6", roster:[p("Xeppaa","INI",80,80,80,80,80),p("Zellsis","SEN",80,80,80,80,80),p("v1c","CON",80,80,80,80,80),p("penny","DUE",80,80,80,80,80),p("OXY","DUE",80,80,80,80,80)], bench:[p("Jackk","INI",80,80,80,80,80)]},
    {name:"Leviatán", short:"LEV", color:"#0A0A0A", roster:[p("kiNgg","CON",80,80,80,80,80),p("blowz","INI",80,80,80,80,80),p("Sato","DUE",80,80,80,80,80),p("Neon","CON",80,80,80,80,80),p("spike","DUE",80,80,80,80,80)], bench:[p("PxS","INI",80,80,80,80,80)]},
    {name:"KRÜ Esports", short:"KRU", color:"#00C2E8", roster:[p("silentzz","SEN",80,80,80,80,80),p("saadhak","INI",80,80,80,80,80),p("Less","CON",80,80,80,80,80),p("mwzera","INI",80,80,80,80,80),p("Dantedeu5","DUE",80,80,80,80,80)], bench:[p("Governor","INI",80,80,80,80,80)]},
    {name:"ENVY", short:"NV", color:"#111111", roster:[p("Rossy","CON",80,80,80,80,80),p("keznit","DUE",80,80,80,80,80),p("P0PPIN","INI",80,80,80,80,80),p("Eggsterr","DUE",80,80,80,80,80),p("Demon1","DUE",80,80,80,80,80)], bench:[p("Inspire","CON",80,80,80,80,80)]},
    {name:"FURIA", short:"FUR", color:"#111111", roster:[p("koalanoob","DUE",80,80,80,80,80),p("artzin","INI",80,80,80,80,80),p("eeiu","INI",80,80,80,80,80),p("nerve","CON",80,80,80,80,80),p("alym","DUE",80,80,80,80,80)], bench:[]},
  ]},
  EMEA: { name:"EMEA", teams:[
    {name:"Team Vitality", short:"VIT", color:"#F4D40C", roster:[p("PROFEK","CON",80,80,80,80,80),p("Chronicle","CON",80,80,80,80,80),p("Jamppi","INI",80,80,80,80,80),p("Derke","DUE",80,80,80,80,80),p("Sayonara","DUE",80,80,80,80,80)], bench:[p("UNFAKE","INI",80,80,80,80,80)]},
    {name:"Fnatic", short:"FNC", color:"#FF5900", roster:[p("Alfajer","SEN",80,80,80,80,80),p("Boaster","CON",80,80,80,80,80),p("crashies","INI",80,80,80,80,80),p("kaajak","DUE",80,80,80,80,80),p("Veqaj","CON",80,80,80,80,80)], bench:[p("CyvOph","CON",80,80,80,80,80)]},
    {name:"Team Heretics", short:"TH", color:"#111111", roster:[p("Boo","CON",80,80,80,80,80),p("benjyfishy","SEN",80,80,80,80,80),p("Wo0t","DUE",80,80,80,80,80),p("RieNs","INI",80,80,80,80,80),p("koshmaras","DUE",80,80,80,80,80)], bench:[p("ComeBack","DUE",80,80,80,80,80)]},
    {name:"Team Liquid", short:"TL", color:"#0B1B3A", roster:[p("purp0","INI",80,80,80,80,80),p("nAts","SEN",80,80,80,80,80),p("kamo","DUE",80,80,80,80,80),p("wayne","CON",80,80,80,80,80),p("MiniBoo","DUE",80,80,80,80,80)], bench:[p("Kicks","INI",80,80,80,80,80)]},
    {name:"NAVI", short:"NAVI", color:"#F2D200", roster:[p("Ruxic","CON",80,80,80,80,80),p("Filu","DUE",80,80,80,80,80),p("hiro","SEN",80,80,80,80,80),p("chloric","INI",80,80,80,80,80),p("Shao","CON",80,80,80,80,80)], bench:[p("sociablEE","CON",80,80,80,80,80)]},
    {name:"Karmine Corp", short:"KC", color:"#3AA0FF", roster:[p("LewN","DUE",80,80,80,80,80),p("Avez","INI",80,80,80,80,80),p("SUYGETSU","CON",80,80,80,80,80),p("dos9","CON",80,80,80,80,80),p("N4RRATE","INI",80,80,80,80,80)], bench:[p("sheydos","INI",80,80,80,80,80)]},
    {name:"Gentle Mates", short:"M8", color:"#5A2D8C", roster:[p("Minny","SEN",80,80,80,80,80),p("starxo","INI",80,80,80,80,80),p("bipo","DUE",80,80,80,80,80),p("marteen","DUE",80,80,80,80,80),p("GLYPH","CON",80,80,80,80,80)], bench:[]},
    {name:"FUT Esports", short:"FUT", color:"#E4002B", roster:[p("yetujey","SEN",80,80,80,80,80),p("KROSTALY","INI",80,80,80,80,80),p("xeus","DUE",80,80,80,80,80),p("s0pp","DUE",80,80,80,80,80),p("baha","CON",80,80,80,80,80)], bench:[]},
    {name:"GIANTX", short:"GX", color:"#111111", roster:[p("grubinho","CON",80,80,80,80,80),p("westside","SEN",80,80,80,80,80),p("Cloud","INI",80,80,80,80,80),p("Flickless","INI",80,80,80,80,80),p("ara","DUE",80,80,80,80,80)], bench:[]},
    {name:"BBL Esports", short:"BBL", color:"#00A3E0", roster:[p("Lar0k","DUE",80,80,80,80,80),p("Rosé","INI",80,80,80,80,80),p("Loita","CON",80,80,80,80,80),p("Crewen","SEN",80,80,80,80,80),p("lovers rock","DUE",80,80,80,80,80)], bench:[]},
  ]},
  PAC: { name:"Pacific", teams:[
    {name:"Paper Rex", short:"PRX", color:"#F5C518", roster:[p("invy","INI",80,80,80,80,80),p("Jinggg","DUE",80,80,80,80,80),p("f0rsakeN","CON",80,80,80,80,80),p("d4v41","SEN",80,80,80,80,80),p("something","DUE",80,80,80,80,80)], bench:[]},
    {name:"T1", short:"T1", color:"#E2012D", roster:[p("Meteor","SEN",80,80,80,80,80),p("Munchkin","CON",80,80,80,80,80),p("stax","INI",80,80,80,80,80),p("iZu","DUE",80,80,80,80,80),p("BuZz","DUE",80,80,80,80,80)], bench:[]},
    {name:"KIWOOM DRX", short:"DRX", color:"#0033A0", roster:[p("BeYN","INI",80,80,80,80,80),p("MaKo","CON",80,80,80,80,80),p("free1ng","INI",80,80,80,80,80),p("HYUNMIN","DUE",80,80,80,80,80),p("yong","SEN",80,80,80,80,80)], bench:[p("Hermes","DUE",80,80,80,80,80)]},
    {name:"Gen.G", short:"GEN", color:"#AA8B56", roster:[p("t3xture","DUE",80,80,80,80,80),p("Karon","CON",80,80,80,80,80),p("Lakia","INI",80,80,80,80,80),p("Ash","INI",80,80,80,80,80),p("ZynX","DUE",80,80,80,80,80)], bench:[p("KiTae","CON",80,80,80,80,80)]},
    {name:"Global Esports", short:"GE", color:"#00B5B0", roster:[p("PatMen","INI",80,80,80,80,80),p("Autumn","DUE",80,80,80,80,80),p("Kr1stal","INI",80,80,80,80,80),p("xavi8k","CON",80,80,80,80,80),p("UdoTan","DUE",80,80,80,80,80)], bench:[]},
    {name:"Nongshim RedForce", short:"NS", color:"#E4002B", roster:[p("Ivy","SEN",80,80,80,80,80),p("Xross","INI",80,80,80,80,80),p("Rb","CON",80,80,80,80,80),p("Dambi","DUE",80,80,80,80,80),p("Francis","DUE",80,80,80,80,80)], bench:[]},
    {name:"Rex Regum Qeon", short:"RRQ", color:"#F5A623", roster:[p("crazyguy","CON",80,80,80,80,80),p("xffero","SEN",80,80,80,80,80),p("Jemkin","DUE",80,80,80,80,80),p("Kushy","INI",80,80,80,80,80),p("Monyet","DUE",80,80,80,80,80)], bench:[]},
    {name:"FULL SENSE", short:"FS", color:"#E4002B", roster:[p("Leviathan","CON",80,80,80,80,80),p("Killua","INI",80,80,80,80,80),p("JitBoyS","SEN",80,80,80,80,80),p("primmie","DUE",80,80,80,80,80),p("Crws","INI",80,80,80,80,80)], bench:[p("thyy","DUE",80,80,80,80,80)]},
    {name:"DetonatioN FocusMe", short:"DFM", color:"#111111", roster:[p("SSeeS","CON",80,80,80,80,80),p("Caedye","SEN",80,80,80,80,80),p("Meiy","DUE",80,80,80,80,80),p("yatsuka","INI",80,80,80,80,80),p("Akame","INI",80,80,80,80,80)], bench:[]},
    {name:"ZETA DIVISION", short:"ZETA", color:"#00A0C6", roster:[p("SyouTa","CON",80,80,80,80,80),p("Xdll","INI",80,80,80,80,80),p("SugarZ3ro","CON",80,80,80,80,80),p("eKo","DUE",80,80,80,80,80),p("Absol","DUE",80,80,80,80,80)], bench:[]},
  ]},
  CN: { name:"China", teams:[
    {name:"EDward Gaming", short:"EDG", color:"#111111", roster:[p("Smoggy","CON",80,80,80,80,80),p("nobody","INI",80,80,80,80,80),p("CHICHOO","CON",80,80,80,80,80),p("ZmjjKK","DUE",80,80,80,80,80),p("Jieni7","DUE",80,80,80,80,80)], bench:[p("cb","DUE",80,80,80,80,80)]},
    {name:"Bilibili Gaming", short:"BLG", color:"#00A1D6", roster:[p("rushia","CON",80,80,80,80,80),p("nephh","INI",80,80,80,80,80),p("whzy","DUE",80,80,80,80,80),p("Knight","INI",80,80,80,80,80),p("yilai","DUE",80,80,80,80,80)], bench:[p("bud","INI",80,80,80,80,80)]},
    {name:"Trace Esports", short:"TE", color:"#E60012", roster:[p("Kai","DUE",80,80,80,80,80),p("Viva","INI",80,80,80,80,80),p("deLb","CON",80,80,80,80,80),p("Xlele","DUE",80,80,80,80,80),p("Abo","SEN",80,80,80,80,80)], bench:[p("LuoK1ng","CON",80,80,80,80,80)]},
    {name:"Xi Lai Gaming", short:"XLG", color:"#C0392B", roster:[p("NoMan","DUE",80,80,80,80,80),p("WsLeo","INI",80,80,80,80,80),p("Lysoar","CON",80,80,80,80,80),p("happywei","CON",80,80,80,80,80),p("Rarga","DUE",80,80,80,80,80)], bench:[]},
    {name:"JDG Esports", short:"JDG", color:"#C41E3A", roster:[p("jkuro","CON",80,80,80,80,80),p("coconut","INI",80,80,80,80,80),p("stew","DUE",80,80,80,80,80),p("Yuicaw","SEN",80,80,80,80,80),p("zhe","DUE",80,80,80,80,80)], bench:[]},
    {name:"FunPlus Phoenix", short:"FPX", color:"#E4002B", roster:[p("BerLIN","CON",80,80,80,80,80),p("AAAAY","INI",80,80,80,80,80),p("KovaQ","INI",80,80,80,80,80),p("Setrod","DUE",80,80,80,80,80),p("Ben1Ley","DUE",80,80,80,80,80)], bench:[p("Life","DUE",80,80,80,80,80)]},
    {name:"Wolves Esports", short:"WOL", color:"#F5A623", roster:[p("Spring","CON",80,80,80,80,80),p("jowa","CON",80,80,80,80,80),p("SiuFatBB","INI",80,80,80,80,80),p("yosemite","CON",80,80,80,80,80),p("glacier","DUE",80,80,80,80,80)], bench:[p("qiutiaN","INI",80,80,80,80,80)]},
    {name:"Dragon Ranger Gaming", short:"DRG", color:"#C0392B", roster:[p("Flex1n","CON",80,80,80,80,80),p("vo0kashu","SEN",80,80,80,80,80),p("Nicc","INI",80,80,80,80,80),p("SpiritZ1","DUE",80,80,80,80,80),p("Akeman","DUE",80,80,80,80,80)], bench:[]},
    {name:"Nova Esports", short:"NOVA", color:"#2ECC71", roster:[p("GREEN","CON",80,80,80,80,80),p("Ezeir","CON",80,80,80,80,80),p("GuanG","SEN",80,80,80,80,80),p("swagzor","DUE",80,80,80,80,80),p("heybay","INI",80,80,80,80,80)], bench:[]},
    {name:"All Gamers", short:"AG", color:"#9B59B6", roster:[p("K1ra","CON",80,80,80,80,80),p("Shr1mp","INI",80,80,80,80,80),p("iamgrq","CON",80,80,80,80,80),p("f4ngeer","DUE",80,80,80,80,80),p("Youze","DUE",80,80,80,80,80)], bench:[p("Au1","CON",80,80,80,80,80)]},
  ]},
};

/* ---- ratings ---- */
function playerOVR(pl){const w=ROLE[pl.role].w;
  return Math.round(pl.aim*w.aim+pl.sense*w.sense+pl.clutch*w.clutch+pl.util*w.util+pl.mental*w.mental);}
function teamOVR(t){return Math.round(t.roster.reduce((s,p)=>s+playerOVR(p),0)/t.roster.length);}
function teamAxis(t,axis){return t.roster.reduce((s,p)=>s+p[axis],0)/t.roster.length;}

/* ============================================================
   PHASE 1 — AGENTS · COMPS · COUNTERS · MAP CONTEXT
   Draft now swings the round math, and it's shown on screen.
   ============================================================ */
const AGENTS = {
  DUE:['Jett','Raze','Reyna','Phoenix','Neon','Yoru','Iso'],
  INI:['Sova','Fade','Breach','Skye','KAY/O','Gekko','Tejo'],
  SEN:['Killjoy','Cypher','Sage','Chamber','Deadlock','Vyse'],
  CON:['Omen','Brimstone','Viper','Astra','Harbor','Clove'],
  FLEX:['Raze','Neon','Omen','Astra','KAY/O','Gekko','Sova','Cypher'],
};
// Each agent: kit vector en(entry) in(info) co(control) su(support) cl(clutch) le(lethality) + 4 abilities
const AGENT_KITS = {
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
const KIT_DEFAULT={DUE:{en:7,in:2,co:2,su:2,cl:6,le:6},INI:{en:4,in:7,co:3,su:5,cl:3,le:5},
  SEN:{en:2,in:6,co:6,su:5,cl:6,le:4},CON:{en:3,in:4,co:8,su:4,cl:5,le:4}};
function kitOf(agent,role){const k=AGENT_KITS[agent]; if(k)return k;
  const d=KIT_DEFAULT[role]||KIT_DEFAULT.DUE; return {...d,ab:[agent,'Ability','Ability','Ultimate']};}
function kitTotal(k){return k.en+k.in+k.co+k.su+k.cl+k.le;}
function compKitScore(agentList){ // agentList: [{agent,role}] avg per-agent kit total /6
  const avg=agentList.reduce((s,a)=>s+kitTotal(kitOf(a.agent,a.role)),0)/agentList.length/6;
  return avg;
}
// Tactical stances. Triangle: AGGRO > CONTROL > LOCKDOWN > AGGRO. BALANCED neutral.
const ARCH = {
  AGGRO:   {name:'Fast Execute', blurb:'tempo & space'},
  CONTROL: {name:'Slow Default',  blurb:'map control'},
  LOCKDOWN:{name:'Lockdown',      blurb:'info denial'},
  BALANCED:{name:'Balanced',      blurb:'flexible'},
};
const BEATS = {AGGRO:'CONTROL', CONTROL:'LOCKDOWN', LOCKDOWN:'AGGRO'};
function counterEdge(a,b){ // + => stance a has the edge over b, in power points
  if(a===b) return 0;
  if(BEATS[a]===b) return 6;
  if(BEATS[b]===a) return -6;
  // committing to a real stance slightly beats hedging with Balanced
  if(a==='BALANCED' && b!=='BALANCED') return -2;
  if(b==='BALANCED' && a!=='BALANCED') return 2;
  return 0;
}
// Each map favors a stance and rewards certain agents (map-comfort).
const MAPDATA = {
  Ascent:{favor:'CONTROL', agents:['Killjoy','Sova','Omen','Jett']},
  Bind:  {favor:'AGGRO',   agents:['Raze','Skye','Viper','Brimstone']},
  Haven: {favor:'CONTROL', agents:['Cypher','Breach','Omen','Jett']},
  Split: {favor:'LOCKDOWN',agents:['Sage','Cypher','Raze','Omen']},
  Lotus: {favor:'LOCKDOWN',agents:['Fade','Killjoy','Omen','Raze']},
  Sunset:{favor:'AGGRO',   agents:['Phoenix','Fade','Omen','Cypher']},
  Icebox:{favor:'CONTROL', agents:['Viper','Sova','Jett','Killjoy']},
};

// deterministic seeded shuffle so each player's pool is stable across sessions
function seededPool(name, arr, n){
  let h=2166136261>>>0; for(const c of name){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}
  const idx=[...arr.keys()];
  for(let i=idx.length-1;i>0;i--){h=(Math.imul(h,1103515245)+12345)>>>0;const j=h%(i+1);[idx[i],idx[j]]=[idx[j],idx[i]];}
  return idx.slice(0,n).map(i=>arr[i]);
}
function agImg(a){ if(!a)return ""; return `/img/agents/${a.toLowerCase().replace(/\//g,"").replace(/[^a-z0-9]/g,"")}.png`; }
function agIcon(a,cls){ const s=agImg(a); return s?`<img class="agicon ${cls||''}" src="${s}" alt="${a}" loading="lazy">`:""; }
function applyRealStats(){
  Object.values(LEAGUES).forEach(L=>L.teams.forEach(t=>[...t.roster,...(t.bench||[])].forEach(pl=>{
    const s=STATS_BY_NAME[pl.name.toLowerCase()]; if(!s)return;
    pl.aim=s.aim; pl.sense=s.sense; pl.clutch=s.clutch; pl.util=s.util; pl.mental=s.mental;
    if(s.role) pl.role=s.role;
    if(typeof s.flex==="boolean") pl._flex=s.flex;
    if(s.prof) pl.prof=Object.assign({DUE:8,INI:8,SEN:8,CON:8},s.prof);
    if(s.pool&&s.pool.length){ pl.pool=s.pool.map(x=>({agent:x.agent,mastery:x.mastery,role:x.role})); pl._realpool=true; }
    pl._real=true;
  })));
}
const AGENT_ROLE=(()=>{const m={};for(const r of ['DUE','INI','SEN','CON']){(AGENTS[r]||[]).forEach(a=>m[a]=r);}return m;})();
function buildAgentPools(){
  Object.values(LEAGUES).forEach(L=>L.teams.forEach(t=>[...t.roster,...(t.bench||[])].forEach(pl=>{
    if(pl._realpool)return;
    const ags=seededPool(pl.name, AGENTS[pl.role], 3);
    const base=Math.round(playerOVR(pl)/5); // ~12-20 on a 0-20 scale
    pl.pool=ags.map((a,i)=>({agent:a, mastery:Math.max(11,Math.min(20, base + (i===0?1:-i))), role:AGENT_ROLE[a]||pl.role}));
  })));
}

function roleCounts(team){const c={DUE:0,INI:0,SEN:0,CON:0,FLEX:0};team.roster.forEach(p=>c[p.role]++);return c;}
function stanceSuit(team,stance){const c=roleCounts(team);
  if(stance==='AGGRO')   return c.DUE;
  if(stance==='LOCKDOWN') return c.SEN;
  if(stance==='CONTROL')  return c.CON + 0.5*c.INI;
  return 1.3; // balanced baseline (a hedge, not a default)
}
function mapFit(stance,mapName){return (MAPDATA[mapName]&&MAPDATA[mapName].favor===stance)?6:0;}
function pickAgents(team,mapName){
  const fav=(MAPDATA[mapName]?MAPDATA[mapName].agents:[]);
  return team.roster.map(pl=>{
    let best=pl.pool[0];
    const inFav=pl.pool.filter(x=>fav.includes(x.agent)).sort((a,b)=>b.mastery-a.mastery);
    if(inFav.length && inFav[0].mastery>=best.mastery-2) best=inFav[0]; // prefer a comfy map agent
    return {name:pl.name, role:pl.role, agent:best.agent, mastery:best.mastery, favored:fav.includes(best.agent)};
  });
}
// pure draft: choose a stance, assign agents, return the power delta it yields
function draftComp(team,mapName,oppStance){
  let bestStance=null,bestScore=-1e9;
  ['AGGRO','CONTROL','LOCKDOWN','BALANCED'].forEach(s=>{
    const suitBonus=(stanceSuit(team,s)-1.5)*3;
    const ce=(oppStance!=null)?counterEdge(s,oppStance)*1.2:0; // read the opponent when we can
    const score=suitBonus+mapFit(s,mapName)+ce;
    if(score>bestScore){bestScore=score;bestStance=s;}
  });
  const agents=pickAgents(team,mapName);
  const avgM=agents.reduce((s,a)=>s+a.mastery,0)/agents.length;
  const favCount=agents.filter(a=>a.favored).length;
  const delta=(stanceSuit(team,bestStance)-1.5)*3 + mapFit(bestStance,mapName) + (avgM-16)*1.3 + favCount*0.6 + (compKitScore(agents)-4.3)*0.8;
  return {stance:bestStance, agents, avgMastery:Math.round(avgM), favCount, delta:+delta.toFixed(2)};
}
// build a comp for a SPECIFIC chosen stance with AUTO agents (used for previews)
function buildCompForStance(team,mapName,stance){
  const agents=pickAgents(team,mapName);
  const avgM=agents.reduce((s,a)=>s+a.mastery,0)/agents.length;
  const favCount=agents.filter(a=>a.favored).length;
  const delta=(stanceSuit(team,stance)-1.5)*3 + mapFit(stance,mapName) + (avgM-16)*1.3 + favCount*0.6 + (compKitScore(agents)-4.3)*0.8;
  return {stance, agents, avgMastery:Math.round(avgM), favCount, delta:+delta.toFixed(2)};
}
// build a comp from the player's EXPLICIT agent choices (per player name -> agent)
function buildCompChoice(team,mapName,stance,choice){
  const fav=(MAPDATA[mapName]?MAPDATA[mapName].agents:[]);
  const agents=team.roster.map(pl=>{
    const wanted=choice&&choice[pl.name];
    const entry=pl.pool.find(x=>x.agent===wanted)||pl.pool[0];
    return {name:pl.name, role:pl.role, agent:entry.agent, mastery:entry.mastery, favored:fav.includes(entry.agent)};
  });
  const avgM=agents.reduce((s,a)=>s+a.mastery,0)/agents.length;
  const favCount=agents.filter(a=>a.favored).length;
  const delta=(stanceSuit(team,stance)-1.5)*3 + mapFit(stance,mapName) + (avgM-16)*1.3 + favCount*0.6 + (compKitScore(agents)-4.3)*0.8;
  return {stance, agents, avgMastery:Math.round(avgM), favCount, delta:+delta.toFixed(2)};
}
// away drafts on map+roster; home gets last-pick info and drafts to counter
function draftPair(home,away,mapName){
  const ad=draftComp(away,mapName,null);
  const hd=draftComp(home,mapName,ad.stance);
  return {home:hd, away:ad, edge:counterEdge(hd.stance,ad.stance), mapName};
}
function matchupRead(cc,hShort,aShort){
  if(cc.edge>0) return `${hShort} ${ARCH[cc.home.stance].name} counters ${ARCH[cc.away.stance].name}`;
  if(cc.edge<0) return `${aShort} ${ARCH[cc.away.stance].name} counters ${ARCH[cc.home.stance].name}`;
  if(cc.home.stance===cc.away.stance) return `Mirror — ${ARCH[cc.home.stance].name} both sides`;
  return `${ARCH[cc.home.stance].name} vs ${ARCH[cc.away.stance].name} — even read`;
}

/* ---- global state ---- */
let ST={league:null, myTeamIdx:null, teams:[], schedule:[], week:0, standings:{}, seasonOver:false};

/* ============ SELECT SCREEN ============ */
function buildSelect(){
  const tabs=document.getElementById('leagueTabs'); tabs.innerHTML='';
  Object.keys(LEAGUES).forEach((k,i)=>{
    const b=document.createElement('button'); b.className='tab'+(i===0?' on':'');
    b.textContent=LEAGUES[k].name; b.onclick=()=>{document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));b.classList.add('on');renderTeams(k);};
    tabs.appendChild(b);
  });
  renderTeams(Object.keys(LEAGUES)[0]);
}
function renderTeams(lk){
  const pv=document.getElementById('selectPreview'); if(pv)pv.style.display='none';
  const g=document.getElementById('teamGrid'); g.innerHTML='';
  LEAGUES[lk].teams.forEach((t,idx)=>{
    const ovr=teamOVR(t);
    const c=document.createElement('button'); c.className='pick teamcard';
    c.innerHTML=`<div class="stripe" style="background:${t.color}"></div>
      <div class="ovr">${ovr}<span>OVR</span></div>
      <div class="tname">${t.name}</div>
      <div class="tregion">${LEAGUES[lk].name}</div>
      <div class="mini">
        ${['aim','sense','clutch','util','mental'].map(ax=>{
          const v=Math.round(teamAxis(t,ax));
          return `<div class="m" title="${ax}"><i style="width:${v}%;background:${ax==='aim'?'var(--val)':ax==='util'?'var(--ini)':'var(--def)'}"></i></div>`;
        }).join('')}
      </div>`;
    c.onclick=()=>previewTeam(lk,idx,c);
    g.appendChild(c);
  });
}
function previewTeam(lk,idx,cardEl){
  document.querySelectorAll('#teamGrid .teamcard').forEach(x=>x.classList.remove('sel'));
  if(cardEl)cardEl.classList.add('sel');
  const t=LEAGUES[lk].teams[idx];
  document.getElementById('spRegion').textContent=LEAGUES[lk].name;
  document.getElementById('spName').textContent=t.name;
  document.getElementById('spOvr').textContent=teamOVR(t);
  document.getElementById('spConfirm').onclick=()=>selectTeam(lk,idx);
  const g=document.getElementById('spRoster'); g.innerHTML='';
  const axes=[['aim','Aim'],['sense','Sense'],['clutch','Clutch'],['util','Util'],['mental','Mental']];
  [...t.roster].sort((a,b)=>playerOVR(b)-playerOVR(a)).concat((t.bench||[]).map(b=>Object.assign({_sub:true},b))).forEach(pl=>{
    const disp=displayRole(pl), ovr=playerOVR(pl);
    const card=document.createElement('div'); card.className='pcard'+(pl._sub?' sub':'');
    const profStrip=['DUE','INI','SEN','CON'].map(rr=>{const b=profBand(pl.prof[rr]);
      return `<span class="profseg" title="${ROLE[rr].name} ${pl.prof[rr]}"><i>${rr}</i><em style="background:${b[2]}"></em></span>`;}).join('');
    card.innerHTML=`<div class="prow">
      <div class="rolechip" style="background:${roleColor(pl)}">${disp}</div>
      <div><div class="pn">${pl.name}${pl._sub?' <span class="subtag">SUB</span>':''}</div><div class="pmeta">${roleFull(pl)}</div></div>
      <div class="povr" style="color:${ovr>=90?'var(--gold)':'var(--text)'}">${ovr}</div>
    </div><div class="profrow">${profStrip}</div>`+
    axes.map(([k,lbl])=>{const v=pl[k]; const col=v>=90?'var(--gold)':v>=82?'var(--def)':'var(--ini)';
      return `<div class="stat"><label>${lbl}</label><div class="track"><i style="width:${v}%;background:${col}"></i></div><span class="v">${v}</span></div>`;}).join('')+
    `<div class="poolrow"><span class="poollbl">Agent pool</span>`+
      visiblePool(pl,4).map(x=>`<span class="ag r-${x.role||pl.role}">${agIcon(x.agent,'ag-sm')}${x.agent} <b>${x.mastery}</b></span>`).join('')+`</div>`;
    g.appendChild(card);
  });
  const pv=document.getElementById('selectPreview'); pv.style.display='block';
  pv.scrollIntoView({behavior:'smooth',block:'start'});
}

/* ============ SEASON SETUP ============ */
function selectTeam(lk,idx){
  ST.league=lk;
  ST.teams=LEAGUES[lk].teams.map((t,i)=>({...t, id:i}));
  ST.myTeamIdx=idx;
  ST.week=0; ST.seasonOver=false;
  ST.standings={};
  ST.teams.forEach(t=>ST.standings[t.id]={w:0,l:0,mapW:0,mapL:0,rd:0});
  ST.schedule=makeSchedule(ST.teams.length);
  // badge
  const bt=ST.teams[idx];
  document.getElementById('teamBadge').style.display='flex';
  document.getElementById('badgeName').textContent=bt.name;
  document.getElementById('badgeDot').style.background=bt.color;
  renderHub(); go('scHub');
}

/* round-robin (single). circle method */
function makeSchedule(n){
  const ids=[...Array(n).keys()];
  if(n%2)ids.push(-1);
  const m=ids.length, rounds=m-1, half=m/2;
  const arr=ids.slice(); const weeks=[];
  for(let r=0;r<rounds;r++){
    const wk=[];
    for(let i=0;i<half;i++){
      const a=arr[i], b=arr[m-1-i];
      if(a!==-1&&b!==-1) wk.push({home:(r%2?b:a),away:(r%2?a:b),played:false,res:null});
    }
    weeks.push(wk);
    arr.splice(1,0,arr.pop());
  }
  return weeks;
}

/* ============ HUB RENDER ============ */
function renderHub(){
  const L=LEAGUES[ST.league];
  document.getElementById('hubLeague').textContent=L.name+' · Regular Season';
  document.getElementById('standRegion').textContent=L.name;
  document.getElementById('squadRegion').textContent=L.name+' · My Club';
  const my=ST.teams[ST.myTeamIdx];
  document.getElementById('squadTitle').textContent=my.name;
  renderStandings(); renderSchedule();
  const pb=document.getElementById('playBtn');
  if(ST.seasonOver){pb.textContent='Season Done'; pb.disabled=true;
    document.getElementById('hubTitle').textContent='Season Complete';
  } else {pb.disabled=false; pb.textContent='Play Next';}
}
function sortedStandings(){
  return [...ST.teams].sort((a,b)=>{
    const A=ST.standings[a.id],B=ST.standings[b.id];
    if(B.w-A.w)return B.w-A.w;
    if((B.mapW-B.mapL)-(A.mapW-A.mapL))return (B.mapW-B.mapL)-(A.mapW-A.mapL);
    return B.rd-A.rd;
  });
}
function renderStandings(){
  const t=document.getElementById('standTable');
  const rows=sortedStandings();
  t.innerHTML=`<thead><tr><th class="rank">#</th><th>Team</th><th>W-L</th>
    <th class="hide">Maps</th><th class="hide">RD</th><th>OVR</th></tr></thead><tbody>`+
    rows.map((tm,i)=>{
      const s=ST.standings[tm.id]; const mine=tm.id===ST.teams[ST.myTeamIdx].id;
      const q=i<8?`<span class="qbadge">PO</span>`:'';
      return `<tr class="${mine?'me':''}"><td class="rank">${i+1}</td>
        <td class="tn"><span class="dot" style="display:inline-block;background:${tm.color};margin-right:8px;vertical-align:middle"></span>${tm.name}${q}</td>
        <td class="wl"><b>${s.w}</b>-${s.l}</td>
        <td class="hide mono">${s.mapW}-${s.mapL}</td>
        <td class="hide mono">${s.rd>0?'+':''}${s.rd}</td>
        <td class="mono" style="color:var(--gold)">${teamOVR(tm)}</td></tr>`;
    }).join('')+`</tbody>`;
}
function nameById(id){return ST.teams.find(t=>t.id===id).name;}
function renderSchedule(){
  const box=document.getElementById('schedList'); box.innerHTML='';
  const myId=ST.teams[ST.myTeamIdx].id;
  const myFix=[];
  ST.schedule.forEach((wk,wi)=>wk.forEach(f=>{if(f.home===myId||f.away===myId)myFix.push({...f,wi});}));
  document.getElementById('fixMeta').textContent=`${myFix.filter(f=>f.played).length}/${myFix.length}`;
  const nextWi=firstUnplayedWeek();
  myFix.forEach(f=>{
    const opp=f.home===myId?f.away:f.home;
    const isNext=!f.played && f.wi===nextWi;
    let resHtml='';
    if(f.played){const r=f.res; const won=(f.home===myId&&r.hMaps>r.aMaps)||(f.away===myId&&r.aMaps>r.hMaps);
      const my=f.home===myId?r.hMaps:r.aMaps, th=f.home===myId?r.aMaps:r.hMaps;
      resHtml=`<span class="res ${won?'w':'l'}">${my}-${th}</span>`;}
    const div=document.createElement('div');
    div.className='fxrow'+(f.played?' done':'')+(isNext?' next':'');
    div.innerHTML=`<span class="wk">W${f.wi+1}</span>
      <span class="teams">vs <b>${nameById(opp)}</b></span>${resHtml||(isNext?'<span class="res" style="color:var(--val)">NEXT</span>':'')}`;
    box.appendChild(div);
  });
}
function firstUnplayedWeek(){
  for(let i=0;i<ST.schedule.length;i++) if(ST.schedule[i].some(f=>!f.played)) return i;
  return -1;
}

/* ============ SQUAD RENDER ============ */
function renderSquad(){
  const my=ST.teams[ST.myTeamIdx];
  const g=document.getElementById('squadGrid'); g.innerHTML='';
  const axes=[['aim','Aim'],['sense','Sense'],['clutch','Clutch'],['util','Util'],['mental','Mental']];
  const mkCard=(pl,isSub)=>{
    const disp=displayRole(pl); const ovr=playerOVR(pl);
    const card=document.createElement('div'); card.className='pcard clickable'+(isSub?' sub':'');
    card.onclick=()=>openPlayer(pl.name);
    const profStrip=['DUE','INI','SEN','CON'].map(rr=>{const b=profBand(pl.prof[rr]);
      return `<span class="profseg" title="${ROLE[rr].name} ${pl.prof[rr]}"><i>${rr}</i><em style="background:${b[2]}"></em></span>`;}).join('');
    card.innerHTML=`<div class="prow">
      <div class="rolechip" style="background:${roleColor(pl)}">${disp}</div>
      <div><div class="pn">${pl.name}${isSub?' <span class="subtag">SUB</span>':''}</div><div class="pmeta">${roleFull(pl)}</div></div>
      <div class="povr" style="color:${ovr>=90?'var(--gold)':'var(--text)'}">${ovr}</div>
    </div>`+
    `<div class="profrow">${profStrip}</div>`+
    axes.map(([k,lbl])=>{
      const v=pl[k]; const col=v>=90?'var(--gold)':v>=82?'var(--def)':'var(--ini)';
      return `<div class="stat"><label>${lbl}</label>
        <div class="track"><i style="width:${v}%;background:${col}"></i></div>
        <span class="v">${v}</span></div>`;
    }).join('')+
    `<div class="poolrow"><span class="poollbl">Agent pool</span>`+
      visiblePool(pl,4).map(x=>`<span class="ag r-${x.role||pl.role}">${agIcon(x.agent,'ag-sm')}${x.agent} <b>${x.mastery}</b></span>`).join('')+
    `</div><div class="cardhint">상세 보기 →</div>`;
    g.appendChild(card);
  };
  [...my.roster].sort((a,b)=>playerOVR(b)-playerOVR(a)).forEach(pl=>mkCard(pl,false));
  (my.bench||[]).forEach(pl=>mkCard(pl,true));
}
function openPlayer(name){ ST._viewPlayer=name; renderPlayer(); go('scPlayer'); }
function renderPlayer(){
  const my=ST.teams[ST.myTeamIdx];
  const pl=[...my.roster,...(my.bench||[])].find(x=>x.name===ST._viewPlayer)||my.roster[0]; if(!pl)return;
  const disp=displayRole(pl), ovr=playerOVR(pl);
  document.getElementById('plName').textContent=pl.name;
  document.getElementById('plRole').textContent=disp+' · '+roleFull(pl);
  document.getElementById('plOvr').textContent=ovr;
  const axes=[['aim','Aim'],['sense','Sense'],['clutch','Clutch'],['util','Util'],['mental','Mental']];
  document.getElementById('plStats').innerHTML=axes.map(([k,lbl])=>{
    const v=pl[k]; const col=v>=90?'var(--gold)':v>=82?'var(--def)':'var(--ini)';
    return `<div class="stat"><label>${lbl}</label><div class="track"><i style="width:${v}%;background:${col}"></i></div><span class="v">${v}</span></div>`;
  }).join('');
  // position proficiency (FM-style, color banded)
  document.getElementById('plProf').innerHTML=`<div class="proflegend">`+
    PROFBANDS.map(b=>`<span><em style="background:${b[2]}"></em>${b[1]} ${b[0]?b[0]+'+':'&lt;10'}</span>`).join('')+`</div>`+
    ['DUE','INI','SEN','CON'].map(rr=>{
    const v=pl.prof[rr], b=profBand(v);
    return `<div class="stat"><label style="color:${ROLE[rr].c}">${ROLE[rr].name}</label>
      <div class="track"><i style="width:${v/20*100}%;background:${b[2]}"></i></div><span class="v" style="color:${b[2]}">${v}</span></div>`;
  }).join('');
  // agent mastery
  document.getElementById('plAgents').innerHTML=(pl.pool||[]).map(x=>{
    const b=profBand(x.mastery);
    return `<div class="agrow"><span class="ag r-${x.role||pl.role}">${agIcon(x.agent,'ag-sm')}${x.agent}</span>
      <div class="track"><i style="width:${x.mastery/20*100}%;background:${b[2]}"></i></div><span class="v">${x.mastery}</span></div>`;
  }).join('')||'<div class="pmeta">에이전트 풀 데이터 없음</div>';
}

/* ============ MATCH ENGINE ============
   Bo3. Each map: rounds to 13, win-by-2 OT.
   Round win prob from team "round power" (attack/def context + form). */
function teamPower(t,formMap){
  // weighted by role, plus per-map form swing already baked per player
  let sum=0;
  t.roster.forEach(pl=>{ sum += (playerOVR(pl)+ (formMap[pl.name]||0)); });
  return sum/t.roster.length;
}
function rollForm(t){ // per-map ±, mental dampens downside
  const f={};
  t.roster.forEach(pl=>{
    const base=(Math.random()*2-1); // -1..1
    const swing = base*10; // ±10
    const mentalGuard = base<0 ? (pl.mental-80)/5 : 0; // high mental reduces bad days
    f[pl.name]=Math.round(swing + mentalGuard);
  });
  return f;
}
let MATCH=null; // active match state

function startNextMatch(){
  const wi=firstUnplayedWeek(); if(wi<0)return;
  const myId=ST.teams[ST.myTeamIdx].id;
  const fx=ST.schedule[wi].find(f=>!f.played&&(f.home===myId||f.away===myId));
  if(!fx){ // my match this week already played -> sim rest, advance
    simRestOfWeek(wi); renderHub(); toast('Week advanced.'); return;
  }
  openMatch(fx,wi);
}
function teamObj(id){return ST.teams.find(t=>t.id===id);}

/* DEV: skip map veto and play a single Ascent map (Bo1). Set false to restore veto/Bo3. */
const DEV_ASCENT_BO1=true;
function openMatch(fx,wi){
  const home=teamObj(fx.home), away=teamObj(fx.away);
  const myId=ST.teams[ST.myTeamIdx].id;
  MATCH={fx,wi,home,away,hMaps:0,aMaps:0,mapResults:[],
    mapPool:pickMaps(3), curMap:0, box:{}, running:false, comps:[],
    mapsToWin:2, roundsPlayed:0,
    playerSide: fx.home===myId?'home':'away'};
  if(DEV_ASCENT_BO1){ MATCH.mapPool=['Ascent']; MATCH.mapsToWin=1; }
  // init box stats
  [...home.roster,...away.roster].forEach(pl=>MATCH.box[pl.name]=newStat());
  // paint match head (used after draft)
  document.getElementById('mVenue').textContent=`${LEAGUES[ST.league].name} · Week ${wi+1} · ${DEV_ASCENT_BO1?'Ascent (Bo1)':'Best of 3'}`;
  document.getElementById('homeName').textContent=home.name;
  document.getElementById('awayName').textContent=away.name;
  const hc=document.getElementById('homeCrest'), ac=document.getElementById('awayCrest');
  hc.textContent=home.short; hc.style.background=home.color; hc.style.fontSize='13px';
  ac.textContent=away.short; ac.style.background=away.color; ac.style.fontSize='13px';
  document.getElementById('homeMaps').textContent='0';
  document.getElementById('awayMaps').textContent='0';
  document.getElementById('rHomeName').textContent=home.short;
  document.getElementById('rAwayName').textContent=away.short;
  document.getElementById('boxWrap').style.display='none';
  document.getElementById('feed').innerHTML='';
  if(DEV_ASCENT_BO1){ startMapDraft(0); return; } // straight to agent draft on Ascent
  startVeto();
}

/* ============ MAP VETO (coach bans/picks) ============ */
function mapSuitFor(team,map){return stanceSuit(team, MAPDATA[map].favor);}
function startVeto(){
  const order = MATCH.playerSide==='home'
    ? [['home','ban'],['away','ban'],['home','pick'],['away','pick'],['home','ban'],['away','ban']]
    : [['away','ban'],['home','ban'],['away','pick'],['home','pick'],['away','ban'],['home','ban']];
  MATCH.veto={remaining:[...MAPS], picks:[], acts:[], order, step:0};
  go('scVeto');
  document.getElementById('vVenue').textContent=`${MATCH.home.short} vs ${MATCH.away.short} · Week ${MATCH.wi+1} · Map Veto`;
  document.getElementById('vetoBtns').innerHTML=`<button class="btn ghost" onclick="vetoSkip()">Auto-veto &amp; skip match</button>`;
  renderVeto(); stepVeto();
}
function stepVeto(){
  const v=MATCH.veto;
  if(v.step>=v.order.length){ finalizeVeto(); return; }
  const [side]=v.order[v.step];
  if(side===MATCH.playerSide){ renderVeto(); }        // wait for player click
  else { setTimeout(()=>{ aiVetoAct(); }, 550); renderVeto(); }
}
function aiVetoAct(){
  const v=MATCH.veto; const [side,act]=v.order[v.step];
  const myTeam=ST.teams[ST.myTeamIdx];
  const aiTeam = MATCH.playerSide==='home'?MATCH.away:MATCH.home;
  let map;
  if(act==='ban'){ // deny the player's most comfortable remaining map
    map=[...v.remaining].sort((x,y)=>mapSuitFor(myTeam,y)-mapSuitFor(myTeam,x))[0];
  } else { // pick the map that suits the AI best
    map=[...v.remaining].sort((x,y)=>mapSuitFor(aiTeam,y)-mapSuitFor(aiTeam,x))[0];
  }
  applyVeto(side,act,map);
}
function playerVeto(map){
  const v=MATCH.veto; if(v.step>=v.order.length)return;
  const [side,act]=v.order[v.step];
  if(side!==MATCH.playerSide) return;               // not your turn
  if(!v.remaining.includes(map)) return;
  applyVeto(side,act,map);
}
function applyVeto(side,act,map){
  const v=MATCH.veto;
  v.remaining=v.remaining.filter(m=>m!==map);
  v.acts.push({side,act,map});
  if(act==='pick') v.picks.push({side,map});
  v.step++;
  renderVeto(); stepVeto();
}
function finalizeVeto(){
  const v=MATCH.veto;
  const decider=v.remaining[0];
  v.acts.push({side:'decider',act:'decider',map:decider});
  MATCH.mapPool=[v.picks[0].map, v.picks[1].map, decider];
  renderVeto(true);
  document.getElementById('vetoBtns').innerHTML=
    `<button class="btn" onclick="startMapDraft(0)">To the draft →</button>`;
}
function renderVeto(done){
  const v=MATCH.veto;
  const myTeam=ST.teams[ST.myTeamIdx];
  let prompt;
  if(done){ prompt='Veto complete — 3 maps set'; }
  else if(v.step<v.order.length){
    const [side,act]=v.order[v.step];
    const mine=side===MATCH.playerSide;
    const who=mine?'Your':(side==='home'?MATCH.home.short:MATCH.away.short)+"'s";
    prompt=`${who} turn — ${act.toUpperCase()} a map`;
  }
  document.getElementById('vPrompt').textContent=prompt;
  const actedBy={}; v.acts.forEach(a=>actedBy[a.map]=a);
  const canClick = !done && v.step<v.order.length && v.order[v.step][0]===MATCH.playerSide;
  const grid=document.getElementById('vetoGrid'); grid.innerHTML='';
  MAPS.forEach(map=>{
    const a=actedBy[map];
    const fav=ARCH[MAPDATA[map].favor].name;
    const suit=mapSuitFor(myTeam,map);
    const tile=document.createElement(canClick&&!a?'button':'div');
    tile.className='vtile'+(a?(' '+a.act):'')+(canClick&&!a?' live':'');
    let tag = a ? (a.act==='pick'?`PICK · ${a.side===MATCH.playerSide?'you':(a.side==='home'?MATCH.home.short:MATCH.away.short)}`
                 : a.act==='ban'?`BAN · ${a.side==='decider'?'':a.side===MATCH.playerSide?'you':(a.side==='home'?MATCH.home.short:MATCH.away.short)}`
                 : 'DECIDER') : `favors ${fav}`;
    tile.innerHTML=`<div class="vmap">${map}</div><div class="vtag">${tag}</div>
      ${!a?`<div class="vsuit">roster fit ${suit>=2?'★★':suit>=1?'★':'·'}</div>`:''}`;
    if(canClick&&!a) tile.onclick=()=>playerVeto(map);
    grid.appendChild(tile);
  });
  // result order strip
  const rs=document.getElementById('vetoResult');
  if(v.picks.length||done){
    const order=[...v.picks.map((p,i)=>({label:`Map ${i+1}`,map:p.map})),
      ...(done?[{label:'Decider',map:MATCH.mapPool[2]}]:[])];
    rs.innerHTML=order.map(o=>`<span class="vres"><b>${o.label}</b> ${o.map}</span>`).join('');
  } else rs.innerHTML='';
}
function vetoSkip(){ MATCH.mapPool=pickMaps(3); skipMatch(); }
// player drafts this map: opponent commits first (map-optimal), player gets last-pick info
function startMapDraft(mi){
  MATCH.curMap=mi;
  MATCH.draftSel={stance:null, choice:{}};
  const oppTeam = MATCH.playerSide==='home'?MATCH.away:MATCH.home;
  MATCH.pendingOpp = draftComp(oppTeam, MATCH.mapPool[mi], null);
  renderDraftScreen(mi);
  go('scDraft');
}
function renderDraftScreen(mi){
  const map=MATCH.mapPool[mi];
  const me=ST.teams[ST.myTeamIdx];
  const oppTeam=MATCH.playerSide==='home'?MATCH.away:MATCH.home;
  const opp=MATCH.pendingOpp;
  const sel=MATCH.draftSel;
  document.getElementById('dVenue').textContent=`${MATCH.home.short} vs ${MATCH.away.short} · Week ${MATCH.wi+1} · Draft`;
  document.getElementById('dMapNo').textContent=`Map ${mi+1}`;
  document.getElementById('dMapName').textContent=`${map} — favors ${ARCH[MAPDATA[map].favor].name} · ${MATCH.hMaps}-${MATCH.aMaps} maps`;
  const hc=document.getElementById('dHomeCrest'),ac=document.getElementById('dAwayCrest');
  hc.textContent=MATCH.home.short;hc.style.background=MATCH.home.color;hc.style.fontSize='13px';
  ac.textContent=MATCH.away.short;ac.style.background=MATCH.away.color;ac.style.fontSize='13px';
  document.getElementById('dHomeName').textContent=MATCH.home.name;
  document.getElementById('dAwayName').textContent=MATCH.away.name;
  // opponent read
  document.getElementById('oppRead').innerHTML=
    `<div class="olbl">${oppTeam.short} locked in</div>
     <div class="ostance">${ARCH[opp.stance].name}</div>
     <div class="oags">${opp.agents.map(a=>`<span class="ag r-${a.role}${a.favored?' fav':''}">${a.agent}</span>`).join('')}</div>`;
  // stance options with live preview vs opponent
  const grid=document.getElementById('stanceGrid'); grid.innerHTML='';
  const previews=['AGGRO','CONTROL','LOCKDOWN','BALANCED'].map(s=>{
    const comp=buildCompForStance(me,map,s);
    const edge=counterEdge(s,opp.stance);
    return {s,comp,edge,projected:+(comp.delta - opp.delta + edge).toFixed(1)};
  });
  const bestProj=Math.max(...previews.map(p=>p.projected));
  previews.forEach(({s,comp,edge,projected})=>{
    const rec=projected===bestProj, chosen=sel.stance===s;
    const suit=stanceSuit(me,s);
    const verdict = edge>0?['good',`Counters ${ARCH[opp.stance].name} +${edge}`]
                  : edge<0?['bad',`Countered ${edge}`]
                  : ['even',`Even read`];
    const card=document.createElement('button'); card.className='stanceopt'+(rec?' rec':'')+(chosen?' chosen':'');
    card.innerHTML=`${rec?'<span class="recflag">Analyst pick</span>':''}
      <div class="sname">${ARCH[s].name}</div>
      <div class="sblurb">${ARCH[s].blurb}</div>
      <div class="verdict ${verdict[0]}">${verdict[1]}</div>
      <div class="fitrow"><span>Fit <b>${suit>=2?'high':suit>=1?'ok':'low'}</b></span>
        <span>Map <b>${MAPDATA[map].favor===s?'favored':'neutral'}</b></span></div>
      <div class="pw ${projected>=0?'pos':'neg'}">${projected>=0?'+':''}${projected}</div>`;
    card.onclick=()=>selectStance(mi,s);
    grid.appendChild(card);
  });
  // comp editor (agent per player) — visible once a stance is chosen
  const lbl=document.getElementById('compEditLbl'), ce=document.getElementById('compEdit');
  if(!sel.stance){ lbl.style.display='none'; ce.innerHTML=''; document.getElementById('draftBtns').innerHTML=
    `<button class="btn" disabled>Pick a game plan first</button>
     <button class="btn ghost" style="width:auto" onclick="skipMatch()">Skip match</button>`; return; }
  lbl.style.display='block';
  const fav=MAPDATA[map].agents;
  ce.innerHTML=me.roster.map(pl=>{
    const chosenAg=sel.choice[pl.name]||autoAgentFor(pl,map);
    return `<div class="pcomp"><div class="pcname"><span class="rolechip sm" style="background:${ROLE[pl.role].c}">${pl.role}</span>${pl.name}</div>
      <div class="agpick">${pl.pool.map(x=>`<button class="agopt r-${pl.role}${x.agent===chosenAg?' on':''}${fav.includes(x.agent)?' fav':''}" onclick="selectAgent(${mi},'${pl.name.replace(/'/g,"\\'")}','${x.agent}')">${x.agent}<b>${x.mastery}</b></button>`).join('')}</div></div>`;
  }).join('');
  // live comp summary + lock
  const choice={}; me.roster.forEach(pl=>choice[pl.name]=sel.choice[pl.name]||autoAgentFor(pl,map));
  const myComp=buildCompChoice(me,map,sel.stance,choice);
  const edge=counterEdge(sel.stance,opp.stance);
  const proj=+(myComp.delta-opp.delta+edge).toFixed(1);
  document.getElementById('draftBtns').innerHTML=
    `<button class="btn" onclick="confirmDraft(${mi})">Lock comp &amp; play · <span style="opacity:.85">avg mastery ${myComp.avgMastery} · map agents ${myComp.favCount}/5 · proj ${proj>=0?'+':''}${proj}</span></button>
     <button class="btn ghost" style="width:auto" onclick="skipMatch()">Skip</button>`;
}
function autoAgentFor(pl,map){
  const fav=(MAPDATA[map]?MAPDATA[map].agents:[]);
  let best=pl.pool[0];
  const inFav=pl.pool.filter(x=>fav.includes(x.agent)).sort((a,b)=>b.mastery-a.mastery);
  if(inFav.length && inFav[0].mastery>=best.mastery-8) best=inFav[0];
  return best.agent;
}
function selectStance(mi,s){ MATCH.draftSel.stance=s; renderDraftScreen(mi); }
function selectAgent(mi,name,agent){ MATCH.draftSel.choice[name]=agent; renderDraftScreen(mi); }
function confirmDraft(mi){
  const me=ST.teams[ST.myTeamIdx]; const map=MATCH.mapPool[mi];
  const choice={}; me.roster.forEach(pl=>choice[pl.name]=MATCH.draftSel.choice[pl.name]||autoAgentFor(pl,map));
  const myComp=buildCompChoice(me,map,MATCH.draftSel.stance,choice);
  const opp=MATCH.pendingOpp;
  if(MATCH.playerSide==='home'){
    MATCH.comps[mi]={home:myComp, away:opp, edge:counterEdge(myComp.stance,opp.stance), mapName:map};
  } else {
    MATCH.comps[mi]={home:opp, away:myComp, edge:counterEdge(opp.stance,myComp.stance), mapName:map};
  }
  renderMapChips();
  go('scMatch');
  renderMatchButtons('start');
  paintMap(0,0);
}
function pickMaps(n){const pool=[...MAPS].sort(()=>Math.random()-.5);return pool.slice(0,n);}
function renderMapChips(){
  const box=document.getElementById('mapChips'); box.innerHTML='';
  MATCH.mapPool.forEach((m,i)=>{
    let cls='mapchip';
    if(MATCH.mapResults[i]){cls+= MATCH.mapResults[i].hWon?' w':' l';}
    else if(i===MATCH.curMap && MATCH.running) cls+=' live';
    const c=document.createElement('span'); c.className=cls;
    c.textContent=m+(MATCH.mapResults[i]?` ${MATCH.mapResults[i].h}-${MATCH.mapResults[i].a}`:'');
    box.appendChild(c);
  });
}
function paintMap(h,a){
  if(!MATCH.comps) MATCH.comps=[];
  // player-drafted maps already have comps set by lockDraft; only auto-draft as a safety net
  if(!MATCH.comps[MATCH.curMap]) MATCH.comps[MATCH.curMap]=draftPair(MATCH.home,MATCH.away,MATCH.mapPool[MATCH.curMap]);
  document.getElementById('curMapName').textContent=MATCH.mapPool[MATCH.curMap]||'—';
  renderDraft();
  buildPips(h,a);
  document.getElementById('rRoundNo').textContent=`Round ${h+a}`;
}
function renderDraft(){
  const cc=MATCH.comps[MATCH.curMap]; const p=document.getElementById('draftPanel'); if(!cc||!p)return;
  const chips=comp=>comp.agents.map(a=>`<span class="ag r-${a.role}${a.favored?' fav':''}" title="${a.name} · mastery ${a.mastery}${a.favored?' · map pick':''}">${a.agent}</span>`).join('');
  const favor=MAPDATA[cc.mapName]?ARCH[MAPDATA[cc.mapName].favor].name:'';
  p.innerHTML=`
    <div class="drafthd"><span>Draft</span><span class="mapfav">${cc.mapName} favors ${favor}</span></div>
    <div class="draftrow">
      <div class="dside">
        <div class="dstance h">${ARCH[cc.home.stance].name}<em>${ARCH[cc.home.stance].blurb}</em></div>
        <div class="agrow">${chips(cc.home)}</div>
      </div>
      <div class="dsplit">${cc.edge>0?'◀':cc.edge<0?'▶':'='}</div>
      <div class="dside right">
        <div class="dstance a">${ARCH[cc.away.stance].name}<em>${ARCH[cc.away.stance].blurb}</em></div>
        <div class="agrow">${chips(cc.away)}</div>
      </div>
    </div>
    <div class="dread ${cc.edge>0?'h':cc.edge<0?'a':''}">${matchupRead(cc,MATCH.home.short,MATCH.away.short)}${cc.edge!==0?` · +${Math.abs(cc.edge)} round power`:''}</div>`;
}
/* ============ PHASE 3 — ROUND ENGINE (sides · economy · duels) ============
   simOneMap computes the full round-by-round log; the three entry points
   (animated / skip / background) all replay or apply the same result. */
const BUYMOD={pistol:0, full:0, force:-3, eco:-6};
const SIDEMOD={AGGRO:{atk:2,def:-1},CONTROL:{atk:1,def:1},LOCKDOWN:{atk:-1,def:3},BALANCED:{atk:0,def:0}};
function decideBuy(credits,isPistol){
  if(isPistol) return 'pistol';
  if(credits>=3900) return 'full';
  if(credits>=2000) return (Math.random()<0.45?'force':'eco');
  return 'eco';
}
function homeSideAt(r,homeStartAtk){
  // 12-round halves; alternate each round in OT
  let atk;
  if(r<12) atk=homeStartAtk;
  else if(r<24) atk=!homeStartAtk;
  else atk = ((r-24)%2===0)?homeStartAtk:!homeStartAtk;
  return atk?'atk':'def';
}
function rand5(){return Math.floor(Math.random()*5);}
function agentMap(cc){const m={};cc.home.agents.forEach(a=>m[a.name]=a.agent);cc.away.agents.forEach(a=>m[a.name]=a.agent);return m;}
// weighted pick by aim + a kit dimension + form
function pickByKit(team,form,agByName,dim,mult){
  const w=team.roster.map(pl=>Math.max(1, pl.aim*0.4 + kitOf(agByName[pl.name],pl.role)[dim]*(mult||3) + (form[pl.name]||0)));
  const tot=w.reduce((s,x)=>s+x,0); let r=Math.random()*tot;
  for(let i=0;i<team.roster.length;i++){r-=w[i];if(r<=0)return team.roster[i];}
  return team.roster[0];
}
function fbSbYScore(team,form,agByName){ // entry duel score of a team's best entry
  const pl=pickByKit(team,form,agByName,'en',3);
  return {pl, score: pl.aim*0.5 + kitOf(agByName[pl.name],pl.role).en*3 + (form[pl.name]||0)};
}
function applyKills(box,kills){
  kills.forEach(k=>{ if(!box[k.killer])return;
    box[k.killer].k++; box[k.killer].acs+=(k.fb?230:(150+Math.floor(Math.random()*90)));
    if(box[k.victim])box[k.victim].d++;
    if(k.assist&&box[k.assist])box[k.assist].a++; });
}
function applyRoundStats(box,rd){
  applyKills(box,rd.kills);
  if(rd.fb){ if(box[rd.fb.killer])box[rd.fb.killer].fb++; if(box[rd.fb.victim])box[rd.fb.victim].fd++; }
  if(rd.clutch&&box[rd.clutch.player]){box[rd.clutch.player].cl++; box[rd.clutch.player].acs+=60;}
  if(rd.abilities&&rd.abilities.length){ rd.abilities.forEach(ab=>{ if(box[ab.player]){box[ab.player].util++; box[ab.player].acs+=12;} }); }
  else if(rd.ability&&box[rd.ability.player]){box[rd.ability.player].util++; box[rd.ability.player].acs+=15;}
  if(rd.plant&&rd.planter&&box[rd.planter])box[rd.planter].plant++;
  if(rd.defuse&&rd.defuser&&box[rd.defuser])box[rd.defuser].defuse++;
}
function newStat(){return {k:0,d:0,a:0,acs:0,fb:0,fd:0,cl:0,util:0,plant:0,defuse:0};}
function freshBox(home,away){const b={};[...home.roster,...away.roster].forEach(p=>b[p.name]=newStat());return b;}
function finalizeRatings(box,totalRounds){
  Object.values(box).forEach(b=>{
    b.acsFinal=Math.round(b.acs/Math.max(1,totalRounds));
    let r=0.75 + (b.acsFinal-200)*0.0025 + (b.fb-b.fd)*0.03 + b.cl*0.08 + (b.util-3)*0.01 + (b.k-b.d)*0.006;
    b.rating=+Math.max(0.30,Math.min(2.0,r)).toFixed(2);
  });
}
// full map sim: rich round-by-round log (opening duel, ability moment, plant/defuse, clutch)
function simOneMap(home,away,cc,homeStartAtk){
  const hForm=rollForm(home),aForm=rollForm(away);
  const agBy=agentMap(cc);
  const baseH=teamPower(home,hForm)+cc.home.delta;
  const baseA=teamPower(away,aForm)+cc.away.delta;
  let credH=800,credA=800;
  let h=0,a=0,r=0; const rounds=[];
  const effR=(pl,form)=>playerOVR(pl)+kitOf(agBy[pl.name],pl.role).le*0.5+(form[pl.name]||0)+(pl.role==='DUE'?3:0);
  while(!((h>=13||a>=13)&&Math.abs(h-a)>=2)){
    if(r>50)break;
    const hSide=homeSideAt(r,homeStartAtk), aSide=hSide==='atk'?'def':'atk';
    const isPistol=(r===0||r===12);
    const buyH=decideBuy(credH,isPistol), buyA=decideBuy(credA,isPistol);
    const powH=baseH+SIDEMOD[cc.home.stance][hSide]+BUYMOD[buyH];
    const powA=baseA+SIDEMOD[cc.away.stance][aSide]+BUYMOD[buyA];
    // per-duel team bias (home perspective). pistols flatten skill/economy.
    const teamGap=(powH-powA+cc.edge)*(isPistol?0.4:1);
    const atkSide=hSide==='atk'?'home':'away', defSide=atkSide==='home'?'away':'home';
    const atkTeamObj=atkSide==='home'?home:away;
    // recon/util strength from the attacking team's agent kits (initiators find angles; controllers/duelists open sites)
    let sumIn=0,sumUt=0; atkTeamObj.roster.forEach(pl=>{const k=kitOf(agBy[pl.name],pl.role); sumIn+=k.in; sumUt+=(k.co+k.le);});
    const reconStrength=Math.max(0,Math.min(1,(sumIn/atkTeamObj.roster.length)/8));
    const utilStrength=Math.max(0,Math.min(1,(sumUt/atkTeamObj.roster.length)/12));
    const ratingOf=(pl,key)=>effR(pl, key==='home'?hForm:aForm);
    const res=spatialRound(home,away,{atkTeamKey:atkSide,defTeamKey:defSide,teamGap,ratingOf,reconStrength,utilStrength,isPistol});
    const kills=res.kills, fb=res.fb, site=res.site;
    const homeWon = res.winner==='home';
    if(homeWon)h++; else a++;
    if(homeWon){credH=Math.min(9000,credH+3000);credA=Math.min(9000,credA+1900);}
    else {credA=Math.min(9000,credA+3000);credH=Math.min(9000,credH+1900);}
    const winSide=res.winner;
    const atkTeam=atkSide==='home'?home:away, defTeam=defSide==='home'?home:away;
    let plant=res.planted, defuse=res.defused,
        planter=res.plantEv?res.plantEv.planter:null, defuser=res.defuseEv?res.defuseEv.defuser:null;
    const clutch=res.clutch;
    // ability moments for the broadcast visuals (names/agents); positions/timing come from the tick log
    const abilities=[];
    const nAb=1+Math.floor(Math.random()*3);
    for(let ai=0;ai<nAb;ai++){
      const abSide=Math.random()<0.6?winSide:(winSide==='home'?'away':'home');
      const Tm=abSide==='home'?home:away;
      const dims=['in','co','su','le']; const dim=dims[Math.floor(Math.random()*dims.length)];
      const pl=pickByKit(Tm,abSide==='home'?hForm:aForm,agBy,dim,3);
      const kit=kitOf(agBy[pl.name],pl.role);
      const idx=Math.random()<0.14?3:Math.floor(Math.random()*3);
      abilities.push({player:pl.name, agentName:agBy[pl.name], name:kit.ab[idx], ult:idx===3, side:abSide, kind:dim});
    }
    const ability=abilities[0]||null;
    rounds.push({n:r+1,hSide,aSide,winner:winSide,buyH,buyA,isPistol,kills,fb,
      ability,abilities,plant,defuse,planter,defuser,clutch,site,h,a,
      spatial:{units:res.units,events:res.events,duration:res.duration,site:res.site},
      reconEv:res.reconEv,utilEvs:res.utilEvs});
    r++;
  }
  return {h,a,rounds,hForm,aForm};
}
function buyLabel(b){return b==='pistol'?'pistol':b==='full'?'full-buy':b==='force'?'force':'eco';}
function topKillerOfRound(rd){const c={};rd.kills.forEach(k=>{if(k.side===rd.winner)c[k.killer]=(c[k.killer]||0)+1;});
  let best=null,bk=0;Object.entries(c).forEach(([n,v])=>{if(v>bk){bk=v;best=n;}});return best?{name:best,k:bk}:null;}

function buildPips(h,a){
  const hp=document.getElementById('pipsHome'), ap=document.getElementById('pipsAway');
  hp.innerHTML=''; ap.innerHTML='';
  const need=Math.max(13,h,a);
  for(let i=0;i<need;i++){const d=document.createElement('div');d.className='pip'+(i<h?' home':'');hp.appendChild(d);}
  for(let i=0;i<need;i++){const d=document.createElement('div');d.className='pip'+(i<a?' away':'');ap.appendChild(d);}
}

/* ============ TOP-DOWN MAP VIEW ============ */
const MV={dots:{}, nameIdx:{}, st:{}, raf:null, timer:null};
/* ===== Real map geometry: ASCENT — attacker POV: LEFT = B, RIGHT = A ===== */
const ASCENT_BG="/img/maps/ascent.png";
const GEO_ASCENT={
  name:'Ascent',
  // coords are % of the embedded ValoPlant image (B left, A right, ATK bottom, CT top)
  atkSpawn:[{x:30,y:80},{x:34,y:83},{x:38,y:80},{x:31,y:86},{x:37,y:86}],
  pts:{
    // A side (right)
    aLobby:{x:52,y:64}, aLong:{x:55,y:50}, aMain:{x:55,y:40}, aSite:{x:60,y:30}, aLink:{x:48,y:38}, heaven:{x:63,y:26},
    // Mid vertical spine + branches
    topMid:{x:33,y:72}, catwalk:{x:42,y:58}, botMid:{x:32,y:52}, courtyard:{x:35,y:44}, dConn:{x:37,y:22}, defSpawn:{x:37,y:11},
    short:{x:46,y:40}, market:{x:24,y:44},
    // B side (left)
    bLobby:{x:15,y:62}, bMain:{x:14,y:46}, bLane:{x:18,y:38}, bSite:{x:11,y:28}, bLink:{x:22,y:40},
  },
  site(s){ return s==='A'?this.pts.aSite:this.pts.bSite; },
  plantZone(s){ const c=this.site(s); return {x:c.x, y:c.y+1, w:9, h:6}; },
  route(s,viaMid){ const p=this.pts;
    if(s==='A') return viaMid?[p.topMid,p.catwalk,p.short,p.aLink,p.aSite]:[p.aLobby,p.aLong,p.aMain,p.aSite];
    return viaMid?[p.topMid,p.botMid,p.market,p.bLink,p.bSite]:[p.bLobby,p.bMain,p.bLane,p.bSite]; },
  holds(s){ const p=this.pts;
    const A=[{x:62,y:28},{x:57,y:33}], B=[{x:10,y:27},{x:16,y:33}];
    return s==='A' ? [A[0],A[1],p.aLink,p.botMid,B[0]] : [B[0],B[1],p.bLink,p.botMid,A[0]]; },
  choke(s){ const c=this.site(s); return {x:c.x, y:c.y+11}; },
  routeMain(s){ return this.route(s,false); },
  routeMid(s){ return this.route(s,true); },
  siteHolds(s){ return s==='A'?[{x:62,y:28},{x:57,y:33},{x:58,y:25}]:[{x:10,y:27},{x:16,y:33},{x:9,y:31}]; },
  midHolds(){ return [{x:37,y:26},{x:33,y:40},{x:43,y:40}]; },
};
const MAPGEO={Ascent:GEO_ASCENT};
function curGeo(){ return (MATCH&&MATCH.mapPool&&MAPGEO[MATCH.mapPool[MATCH.curMap]])||GEO_ASCENT; }
/* ===== NAV GRID (walkable mask from the real map): pathfinding + line-of-sight ===== */
function navOpenCell(cx,cy){ if(cx<0||cy<0||cx>=NAVGRID.w||cy>=NAVGRID.h)return false; return NAVGRID.cells[cy*NAVGRID.w+cx]==='1'; }
function navToCell(x,y){ return [Math.max(0,Math.min(NAVGRID.w-1,Math.floor(x/100*NAVGRID.w))), Math.max(0,Math.min(NAVGRID.h-1,Math.floor(y/100*NAVGRID.h)))]; }
function navCellPct(cx,cy){ return {x:(cx+0.5)/NAVGRID.w*100, y:(cy+0.5)/NAVGRID.h*100}; }
function navOpenNear(cx,cy){ if(navOpenCell(cx,cy))return[cx,cy]; const seen=new Set([cx+','+cy]); let q=[[cx,cy]];
  const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]];
  while(q.length){ const [x,y]=q.shift(); for(const [dx,dy] of dirs){ const nx=x+dx,ny=y+dy,k=nx+','+ny;
    if(nx<0||ny<0||nx>=NAVGRID.w||ny>=NAVGRID.h||seen.has(k))continue; if(navOpenCell(nx,ny))return[nx,ny]; seen.add(k); q.push([nx,ny]); } }
  return [cx,cy]; }
function navLOS(a,b){ // true if sightline a->b is clear; tolerates thin (1-cell) props, blocked by real walls
  let ca=navOpenNear(...navToCell(a.x,a.y)), cb=navOpenNear(...navToCell(b.x,b.y));
  let x0=ca[0],y0=ca[1],x1=cb[0],y1=cb[1];
  let dx=Math.abs(x1-x0), dy=Math.abs(y1-y0), sx=x0<x1?1:-1, sy=y0<y1?1:-1, err=dx-dy, guard=0, blocked=0;
  while(guard++<600){ if(!(x0===ca[0]&&y0===ca[1]) && !(x0===x1&&y0===y1)){ if(!navOpenCell(x0,y0)){ blocked++; if(blocked>1)return false; } }
    if(x0===x1&&y0===y1)return true;
    const e2=2*err; if(e2>-dy){err-=dy;x0+=sx;} if(e2<dx){err+=dx;y0+=sy;} }
  return true; }
const _navCache={};
function navPath(ax,ay,bx,by){ // A* on the grid, returns list of {x,y} in % (cached)
  const key=ax.toFixed(1)+','+ay.toFixed(1)+'>'+bx.toFixed(1)+','+by.toFixed(1);
  if(_navCache[key])return _navCache[key];
  const a=navOpenNear(...navToCell(ax,ay)), b=navOpenNear(...navToCell(bx,by));
  const W=NAVGRID.w,ok=(x,y)=>navOpenCell(x,y);
  const hn=(x,y)=>Math.abs(x-b[0])+Math.abs(y-b[1]);
  const g={}, came={}, sk=a[0]+','+a[1]; g[sk]=0;
  const pq=[[hn(a[0],a[1]),a[0],a[1]]];
  const dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]];
  let found=false, guard=0;
  while(pq.length && guard++<45000){ pq.sort((m,n)=>m[0]-n[0]); const [,cx,cy]=pq.shift();
    if(cx===b[0]&&cy===b[1]){found=true;break;}
    const ck=cx+','+cy;
    for(const [dx,dy] of dirs){ const nx=cx+dx,ny=cy+dy; if(!ok(nx,ny))continue;
      if(dx&&dy&&!(ok(cx+dx,cy)&&ok(cx,cy+dy)))continue; // no corner cutting
      const ng=g[ck]+((dx&&dy)?1.4:1), nk=nx+','+ny;
      if(!(nk in g)||ng<g[nk]){ g[nk]=ng; came[nk]=ck; pq.push([ng+hn(nx,ny),nx,ny]); } } }
  const pts=[]; let cur=b[0]+','+b[1];
  if(found){ while(cur){ const [cx,cy]=cur.split(',').map(Number); pts.unshift(navCellPct(cx,cy)); cur=came[cur]; } }
  else { pts.push(navCellPct(a[0],a[1]),navCellPct(b[0],b[1])); }
  // simplify: keep every 2nd point to reduce jitter, always keep ends
  const simp=pts.filter((p,i)=>i===0||i===pts.length-1||i%2===0);
  _navCache[key]=simp; return simp; }
function navRouteThrough(nodes){ let out=[]; for(let i=0;i<nodes.length-1;i++){ const seg=navPath(nodes[i].x,nodes[i].y,nodes[i+1].x,nodes[i+1].y);
    out=out.concat(i===0?seg:seg.slice(1)); } return out; }
/* ===== TICK-BASED SPATIAL ROUND ENGINE (single source of truth for a round) ===== */
function sdist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
const SP_TUNE={ holdBonus:3.0, execBonus:1.2, peekPenalty:1.0, gapMul:1.0, scale:26, utilSuppress:0.85, utilWindow:4.0, reconBase:0.18, reconGain:0.5 };
const SP_SETUPS=[{A:2,mid:1,B:2,w:6},{A:2,mid:0,B:3,w:2},{A:3,mid:0,B:2,w:2},{A:1,mid:1,B:3,w:1},{A:3,mid:1,B:1,w:1},{A:2,mid:2,B:1,w:1},{A:1,mid:2,B:2,w:1}];
function spPickSetup(){ const tot=SP_SETUPS.reduce((s,x)=>s+x.w,0); let r=Math.random()*tot; for(const s of SP_SETUPS){ if((r-=s.w)<=0)return s; } return SP_SETUPS[0]; }
// home/away rosters; opts:{atkTeamKey,defTeamKey,teamGap,ratingOf,reconStrength,utilStrength,isPistol}
function spatialRound(home,away,opts){
  const G=GEO_ASCENT;
  const {atkTeamKey,defTeamKey,teamGap,ratingOf,reconStrength=0.5,utilStrength=0.5,isPistol=false}=opts;
  const atkTeam=atkTeamKey==='home'?home:away, defTeam=defTeamKey==='home'?home:away;
  const TICK=0.1,MAXT=100,SPEED=5.5,SIGHT=16;
  const setup=opts.setup||spPickSetup(); const perSite={A:setup.A,B:setup.B,mid:setup.mid};
  const effA=perSite.A+perSite.mid*0.5, effB=perSite.B+perSite.mid*0.5;
  const weaker=effA<effB?'A':(effB<effA?'B':(Math.random()<0.5?'A':'B'));
  const infoP=SP_TUNE.reconBase+SP_TUNE.reconGain*reconStrength;
  const hasInfo=Math.random()<infoP;
  const site=opts.forceSite||(hasInfo?weaker:(Math.random()<0.5?'A':'B'));
  const mk=(team,key,idx)=>({name:team.roster[idx].name,side:key,idx,alive:true,x:0,y:0,path:null,seg:0,r:ratingOf(team.roster[idx],key),startDelay:0,zone:null,track:[],deathT:null,role:null,carrier:false,face:0,hold:null,joined:false});
  const atk=atkTeam.roster.map((_,i)=>mk(atkTeam,atkTeamKey,i));
  const def=defTeam.roster.map((_,i)=>mk(defTeam,defTeamKey,i));
  const snap=p=>{const c=navOpenNear(...navToCell(p.x,p.y));return navCellPct(c[0],c[1]);};
  // defenders spawn at defender spawn and DEPLOY out to (slightly randomized) holds
  const dsp=snap(G.pts.defSpawn);
  const jit=p=>snap({x:p.x+(Math.random()*6-3),y:p.y+(Math.random()*6-3)});
  const aH=G.siteHolds('A').map(jit),bH=G.siteHolds('B').map(jit),mH=G.midHolds().map(jit); let di=0;
  const deploy=(u,hold,zone)=>{ const s2=snap({x:dsp.x+(Math.random()*8-4),y:dsp.y+(Math.random()*4-2)}); u.x=s2.x;u.y=s2.y; u.zone=zone; u.hold=hold; u.path=navRouteThrough([{x:u.x,y:u.y},hold]); u.seg=0; u.startDelay=Math.random()*0.3; u.face=Math.atan2(hold.y-u.y,hold.x-u.x)*180/Math.PI; };
  for(let k=0;k<perSite.A;k++){ deploy(def[di++],aH[k%aH.length],'A'); }
  for(let k=0;k<perSite.mid;k++){ deploy(def[di++],mH[k%mH.length],'mid'); }
  for(let k=0;k<perSite.B;k++){ deploy(def[di++],bH[k%bH.length],'B'); }
  const spawnC=snap(G.atkSpawn[1]);
  const other=site==='A'?'B':'A';
  // attacker formation: main+mid commit to the target, a lurk works the other side (cut backups / take empty)
  const FORMS=[{lurk:1,mid:1,main:3,w:4},{lurk:1,mid:0,main:4,w:2},{lurk:0,mid:2,main:3,w:2},{lurk:1,mid:2,main:2,w:2},{lurk:2,mid:1,main:2,w:1}];
  const form=(()=>{const tot=FORMS.reduce((s,x)=>s+x.w,0);let r=Math.random()*tot;for(const f of FORMS){if((r-=f.w)<=0)return f;}return FORMS[0];})();
  const mainPath=navRouteThrough([spawnC].concat(G.routeMain(site)));
  const midPath =navRouteThrough([spawnC].concat(G.routeMid(site)));
  const lurkPath=navRouteThrough([spawnC].concat(G.routeMain(other)));
  let ai=0;
  for(let k=0;k<form.main&&ai<5;k++){const u=atk[ai++];u.role='main';u.path=mainPath.slice();}
  for(let k=0;k<form.mid&&ai<5;k++){const u=atk[ai++];u.role='mid';u.path=midPath.slice();}
  for(let k=0;k<form.lurk&&ai<5;k++){const u=atk[ai++];u.role='lurk';u.path=lurkPath.slice();}
  while(ai<5){const u=atk[ai++];u.role='main';u.path=mainPath.slice();}
  atk.forEach((u,i)=>{const p=snap(G.atkSpawn[i]);u.x=p.x;u.y=p.y;u.seg=0;u.startDelay=i*0.4+(u.role==='lurk'?0.8:0);});
  const mains=atk.filter(u=>u.role==='main'); let spikeCarrier=(mains[mains.length-1]||atk[0]); spikeCarrier.carrier=true;
  const pzc=G.plantZone(site); const plantAtSite=snap({x:pzc.x,y:pzc.y});
  const events=[]; let planted=false,plantT=-1,defused=false,contact=false,utilAt=-1;
  let spikeDropped=null, planting=-1, retriever=null; const PLANT_TIME=4, DEFUSE_TIME=4, SPIKE_TIME=22; let defusing=-1, defuserName=null;
  const aliveAtk=()=>atk.filter(u=>u.alive), aliveDef=()=>def.filter(u=>u.alive);
  if(hasInfo) events.push({t:1.0,type:'recon',x:plantAtSite.x,y:plantAtSite.y,site});
  function moveUnit(u,t){ if(!u.alive)return; if(u.startDelay&&t<u.startDelay)return; if(!u.path||u.seg>=u.path.length)return;
    const w=u.path[u.seg],d=sdist(u,w),step=SPEED*TICK; if(d>0.001)u.face=Math.atan2(w.y-u.y,w.x-u.x)*180/Math.PI;
    if(d<=step){u.x=w.x;u.y=w.y;u.seg++;} else {u.x+=(w.x-u.x)/d*step;u.y+=(w.y-u.y)/d*step;} }
  function utilActive(t){ return utilAt>=0&&(t-utilAt)<SP_TUNE.utilWindow; }
  let fb=null, clutchWho=null, clutchVs=0;
  function tryDuel(t){
    let best=null,bd=SIGHT; aliveAtk().forEach(A=>aliveDef().forEach(D=>{ if(!navLOS(A,D))return; const d=sdist(A,D); if(d<bd){bd=d;best=[A,D];}}));
    if(!best)return; contact=true; const [A,D]=best;
    A.face=Math.atan2(D.y-A.y,D.x-A.x)*180/Math.PI; D.face=Math.atan2(A.y-D.y,A.x-D.x)*180/Math.PI;
    const aHold=(!A.path||A.seg>=A.path.length), dHold=(!D.path||D.seg>=D.path.length);
    let holdD=dHold?SP_TUNE.holdBonus:0; if(utilActive(t)&&!planted) holdD*=(1-SP_TUNE.utilSuppress*utilStrength);
    const holdA=aHold?SP_TUNE.holdBonus:0;
    const execTerm=planted?0:SP_TUNE.execBonus;
    const teamAdj=(atkTeamKey==='home'?teamGap:-teamGap)*SP_TUNE.gapMul;
    const scale=isPistol?(SP_TUNE.scale*1.7):SP_TUNE.scale;
    const exponent=((A.r-D.r)+teamAdj+execTerm+holdA-holdD)/scale;
    const atkWins=Math.random()<1/(1+Math.pow(10,-exponent));
    const winner=atkWins?A:D, loser=atkWins?D:A;
    loser.alive=false; loser.path=null; loser.deathT=t;
    if(loser===spikeCarrier){ spikeDropped={x:loser.x,y:loser.y}; spikeCarrier=null; planting=-1;
      events.push({t,type:'spikeDrop',x:loser.x,y:loser.y});
      aliveDef().forEach(u=>{u.path=navRouteThrough([{x:u.x,y:u.y},spikeDropped]);u.seg=0;}); }
    const assist=Math.random()<.32?(function(){const mates=(winner.side===atkTeamKey?aliveAtk():aliveDef()).filter(u=>u!==winner); return mates.length?mates[Math.floor(Math.random()*mates.length)].name:null;})():null;
    if(!fb)fb={killer:winner.name,victim:loser.name,side:winner.side};
    events.push({t,type:'kill',killer:winner.name,victim:loser.name,side:winner.side,x:loser.x,y:loser.y,fb:events.filter(e=>e.type==='kill').length===0,assist});
    if(!clutchWho){ if(aliveAtk().length===1&&aliveDef().length>=2){clutchWho=aliveAtk()[0];clutchVs=aliveDef().length;}
      else if(aliveDef().length===1&&aliveAtk().length>=2){clutchWho=aliveDef()[0];clutchVs=aliveAtk().length;} }
  }
  for(let step=0,t=0; step<MAXT/TICK; step++, t+=TICK){
    atk.forEach(u=>moveUnit(u,t)); def.forEach(u=>moveUnit(u,t));
    // facing for stationary units: look at nearest visible enemy, else watch the threat direction
    const setWatch=(u,enemies)=>{ if(u.path&&u.seg<u.path.length)return; // moving handled in moveUnit
      let tgt=null,td=1e9; enemies.forEach(e=>{ if(e.alive&&navLOS(u,e)){const d=sdist(u,e); if(d<td&&d<SIGHT*1.4){td=d;tgt=e;}} });
      if(tgt){ u.face=Math.atan2(tgt.y-u.y,tgt.x-u.x)*180/Math.PI; }
      else { const aim = (u.side===atkTeamKey)? plantAtSite : (u.zone==='mid'?G.pts.botMid:G.choke(u.zone==='B'?'B':(u.zone==='A'?'A':site))); u.face=Math.atan2(aim.y-u.y,aim.x-u.x)*180/Math.PI; } };
    atk.forEach(u=>{ if(u.alive)setWatch(u,def); }); def.forEach(u=>{ if(u.alive)setWatch(u,atk); });
    // lurker joins the main push when the team is thinning out or outnumbered on site
    if(step%10===0){ const atkN=aliveAtk().length, defN=aliveDef().length, mainAlive=aliveAtk().filter(x=>x.role!=='lurk').length;
      aliveAtk().forEach(u=>{ if(u.role==='lurk'&&!u.joined&&(mainAlive<=1||atkN<defN)){ u.joined=true; u.role='main'; u.path=navRouteThrough([{x:u.x,y:u.y},plantAtSite]); u.seg=0; } }); }
    if(step%3===0){ const ck=spikeCarrier?(spikeCarrier.side+spikeCarrier.idx):null;
      for(const u of atk){ if(u.alive)u.track.push({t:+t.toFixed(2),x:+u.x.toFixed(2),y:+u.y.toFixed(2),f:Math.round(u.face),c:(u.side+u.idx)===ck?1:0}); }
      for(const u of def){ if(u.alive)u.track.push({t:+t.toFixed(2),x:+u.x.toFixed(2),y:+u.y.toFixed(2),f:Math.round(u.face)}); } }
    if(utilAt<0){ const ck=G.choke(site); if(aliveAtk().some(u=>sdist(u,ck)<14&&t>1.5)){ utilAt=t;
      events.push({t,type:'util',kind:'smoke',x:ck.x,y:ck.y,site}); events.push({t:t+0.2,type:'util',kind:'flash',x:plantAtSite.x,y:plantAtSite.y,site}); } }
    if(contact||utilAt>=0){ def.forEach(u=>{ if(u.alive&&u.zone!==site&&!u.path){ u.path=navRouteThrough([{x:u.x,y:u.y},G.pts.botMid,plantAtSite]); u.seg=0; u.zone=site; } }); }
    tryDuel(t);
    // spike pickup: a dedicated retriever goes to the dropped spike (others keep clearing)
    if(!planted && !spikeCarrier && spikeDropped){
      if(!retriever || !retriever.alive) retriever=aliveAtk().slice().sort((a,b)=>sdist(a,spikeDropped)-sdist(b,spikeDropped))[0]||null;
      if(retriever){ if(sdist(retriever,spikeDropped)<4){ spikeCarrier=retriever; retriever.carrier=true; events.push({t,type:'spikePickup',by:retriever.name,x:retriever.x,y:retriever.y}); spikeDropped=null; retriever=null; }
        else if(!retriever.path||retriever.seg>=retriever.path.length){ retriever.path=navRouteThrough([{x:retriever.x,y:retriever.y},spikeDropped]); retriever.seg=0; } }
    }
    // seek/clear only pre-plant; the carrier and the spike retriever are excluded
    if(!planted && (contact||t>7) && step%10===0){
      aliveAtk().forEach(u=>{ if(u===spikeCarrier||u===retriever)return; if(!u.path || u.seg>=u.path.length){
        let tgt=null,td=1e9; aliveDef().forEach(D=>{const d=sdist(u,D); if(d<td){td=d;tgt=D;}});
        if(tgt && td>4){ u.path=navRouteThrough([{x:u.x,y:u.y},{x:tgt.x,y:tgt.y}]); u.seg=0; }
        else if(sdist(u,plantAtSite)>6){ u.path=navRouteThrough([{x:u.x,y:u.y},plantAtSite]); u.seg=0; }
      }});
    }
    if(!planted && spikeCarrier && spikeCarrier.alive){
      const c=spikeCarrier; const onSite=sdist(c,plantAtSite)<6;
      const defHold=aliveDef().some(u=> sdist(u,plantAtSite)<20 && navLOS(u,plantAtSite));
      if(!onSite){ if(!c.path||c.seg>=c.path.length){ c.path=navRouteThrough([{x:c.x,y:c.y},plantAtSite]); c.seg=0; } planting=-1; }
      else if(defHold){ planting=-1; }
      else { if(planting<0){ planting=t; events.push({t,type:'plantStart',planter:c.name,x:plantAtSite.x,y:plantAtSite.y}); }
        else if(t-planting>=PLANT_TIME){ planted=true; plantT=t; events.push({t,type:'plant',planter:c.name,x:plantAtSite.x,y:plantAtSite.y});
          c.carrier=false; spikeCarrier=null; // spike is planted on site — nobody carries it anymore
          aliveDef().forEach(u=>{u.path=navRouteThrough([{x:u.x,y:u.y},plantAtSite]);u.seg=0;}); } }
    } else if(planted){
      // RETAKE: defenders push onto the spike; attackers hold angles on it (stationary = advantage)
      if(step%8===0){ aliveDef().forEach(u=>{ if(!u.path||u.seg>=u.path.length){ if(sdist(u,plantAtSite)>4){u.path=navRouteThrough([{x:u.x,y:u.y},plantAtSite]);u.seg=0;} } }); }
      if(step%12===0){ aliveAtk().forEach((u,ix)=>{ if(!u.path||u.seg>=u.path.length){ const hp=G.siteHolds(site)[ix%3]; if(hp&&sdist(u,hp)>3){u.path=navRouteThrough([{x:u.x,y:u.y},snap(hp)]);u.seg=0;} } }); }
      // DEFUSE: a defender on the spike, with no attacker holding sight on it, defuses over time (interruptible)
      const onSpike=aliveDef().find(u=>sdist(u,plantAtSite)<5);
      const atkWatch=aliveAtk().some(u=> sdist(u,plantAtSite)<24 && navLOS(u,plantAtSite));
      if(onSpike && !atkWatch){ if(defusing<0){ defusing=t; defuserName=onSpike.name; events.push({t,type:'defuseStart',defuser:onSpike.name,x:plantAtSite.x,y:plantAtSite.y}); }
        else if(t-defusing>=DEFUSE_TIME){ defused=true; events.push({t,type:'defuse',defuser:defuserName,x:plantAtSite.x,y:plantAtSite.y}); events.push({t,type:'end',winner:defTeamKey}); return spFin(defTeamKey,t); } }
      else if(defusing>=0){ defusing=-1; events.push({t,type:'defuseStop',x:plantAtSite.x,y:plantAtSite.y}); }
    }
    if(aliveDef().length===0){ if(!planted){planted=true;plantT=t;events.push({t,type:'plant',planter:(spikeCarrier||aliveAtk()[0]||{name:'?'}).name,x:plantAtSite.x,y:plantAtSite.y});} if(spikeCarrier){spikeCarrier.carrier=false;spikeCarrier=null;}
      events.push({t,type:'end',winner:atkTeamKey}); return spFin(atkTeamKey,t); }
    if(aliveAtk().length===0 && !planted){ events.push({t,type:'end',winner:defTeamKey}); return spFin(defTeamKey,t); }
    if(planted && t-plantT>SPIKE_TIME){ events.push({t,type:'end',winner:atkTeamKey}); return spFin(atkTeamKey,t); }
  }
  events.push({t:MAXT,type:'end',winner:planted?atkTeamKey:defTeamKey});
  return spFin(planted?atkTeamKey:defTeamKey,MAXT);
  function spFin(winnerKey,t){
    atk.concat(def).forEach(u=>{ const tt=u.alive?t:(u.deathT!=null?u.deathT:t); const last=u.track[u.track.length-1];
      if(!last||last.t<tt) u.track.push({t:+tt.toFixed(2),x:+u.x.toFixed(2),y:+u.y.toFixed(2),f:Math.round(u.face)}); });
    const units=atk.concat(def).map(u=>({side:u.side,idx:u.idx,name:u.name,track:u.track,deathT:u.deathT,role:(u.side===atkTeamKey?'atk':'def')}));
    let clutch=null; if(clutchWho&&clutchWho.side===winnerKey)clutch={player:clutchWho.name,side:winnerKey,vs:clutchVs};
    return { winner:winnerKey, site, setup:perSite, hadInfo:hasInfo, hitWeaker:(site===weaker),
      planted, defused, duration:t, events, units, fb, clutch,
      kills:events.filter(e=>e.type==='kill'),
      plantEv:events.find(e=>e.type==='plant')||null, defuseEv:events.find(e=>e.type==='defuse')||null,
      reconEv:events.find(e=>e.type==='recon')||null, utilEvs:events.filter(e=>e.type==='util') }; }
}
function geoSVG(){ return `<svg class="mvmap" viewBox="0 0 100 100" preserveAspectRatio="none">
  <g class="floor">
    <!-- A SITE (right, Generator/Hell/Site Pillar) + Heaven + Hell/Bricks/Wine -->
    <polygon points="74,20 96,20 96,40 78,40 74,32"/>
    <polygon points="78,8 92,8 92,20 78,20"/>
    <polygon points="90,40 98,40 98,52 90,52"/>
    <!-- A Long / A Main / Door / Tree / Arch (right vertical approach) -->
    <polygon points="72,40 84,40 84,72 72,72"/>
    <polygon points="60,42 74,40 74,50 60,52"/>
    <!-- A Lobby / A Alley (spawn to A, lower right) -->
    <polygon points="60,72 82,68 84,84 62,90 56,82"/>
    <!-- MID: D-Spawn/CT -> D Conn -> Courtyard -> Bottom/Pizza -> Top Mid -> spawn -->
    <polygon points="42,10 58,10 58,20 42,20"/>
    <polygon points="44,20 56,20 56,34 44,34"/>
    <polygon points="40,34 60,34 60,50 40,50"/>
    <polygon points="42,50 58,50 58,72 42,72"/>
    <polygon points="44,72 56,72 56,88 44,88"/>
    <!-- Catwalk (mid->A) & Market (mid->B) -->
    <polygon points="56,56 68,50 70,60 58,66"/>
    <polygon points="44,36 34,34 32,44 42,46"/>
    <!-- B SITE (left, Triple/Double/Back Site) + B Stairs/Boathouse -->
    <polygon points="4,20 26,20 26,32 22,40 4,40"/>
    <polygon points="26,22 34,22 34,34 26,34"/>
    <!-- B Main / B Lane / B Orb (left vertical approach) -->
    <polygon points="16,40 28,40 28,66 16,66"/>
    <polygon points="26,42 34,40 34,48 26,50"/>
    <!-- B Lobby / B Alley (spawn to B, lower left) -->
    <polygon points="18,72 40,68 44,82 38,90 16,84"/>
  </g>
  <polygon class="zone site" points="74,20 96,20 96,40 78,40 74,32"/>
  <polygon class="zone site" points="4,20 26,20 26,32 22,40 4,40"/>
  <polygon class="zone spawn atk" points="34,86 66,86 62,98 38,98"/>
  <polygon class="zone spawn def" points="42,8 58,8 58,18 42,18"/>
  <rect class="plant" x="82" y="27" width="7" height="5" rx="1"/>
  <rect class="plant" x="12" y="26" width="7" height="5" rx="1"/>
  <text class="sitebig" x="84" y="33">A</text><text class="sitebig" x="14" y="32">B</text>
  <text class="zlbl" x="85" y="16">A SITE</text><text class="zlbl" x="14" y="16">B SITE</text>
  <text class="zlbl sm" x="78" y="58">A MAIN</text><text class="zlbl sm" x="22" y="56">B MAIN</text>
  <text class="zlbl sm" x="50" y="43">MID</text><text class="zlbl sm" x="50" y="66">BOT MID</text>
  <text class="zlbl sm" x="64" y="59">CAT</text><text class="zlbl sm" x="37" y="41">MKT</text>
  <text class="zlbl sm" x="84" y="14">HVN</text>
  <text class="zlbl sm" x="50" y="14">CT</text><text class="zlbl sm" x="50" y="95">ATK</text>
  <text class="zlbl sm" x="73" y="82">A LOB</text><text class="zlbl sm" x="27" y="82">B LOB</text>
</svg>`; }
const WEAP={
  pistol:['Ghost','Classic','Sheriff','Ghost','Classic'],
  eco:['Classic','Sheriff','Frenzy','Ghost','Classic'],
  force:['Spectre','Bulldog','Marshal','Spectre','Stinger'],
  full:['Vandal','Phantom','Operator','Vandal','Phantom'],
};
function loadoutFor(buy,i,role){
  let weapon,shield;
  if(buy==='pistol'){weapon=WEAP.pistol[i]; shield='light';}
  else if(buy==='eco'){weapon=WEAP.eco[i]; shield=(i%2?'none':'light');}
  else if(buy==='force'){weapon=WEAP.force[i]; shield='light';}
  else {weapon=(role==='SEN'&&i===2)?'Operator':WEAP.full[i]; shield='heavy';}
  return {weapon,shield};
}
const WCOST={Classic:0,Ghost:500,Sheriff:800,Frenzy:450,Stinger:950,Spectre:1600,Marshal:950,Bulldog:2050,Vandal:2900,Phantom:2900,Operator:4700};
const SCOST={none:0,light:400,heavy:1000};
// choose a loadout from a player's credits (Valorant-like thresholds)
function buyFromCredits(cr,role,i){
  let weapon,shield;
  if(cr>=4900){ weapon=(role==='SEN'&&i===2)?'Operator':(i%2?'Phantom':'Vandal'); shield='heavy'; }
  else if(cr>=3900){ weapon=(i%2?'Phantom':'Vandal'); shield='heavy'; }
  else if(cr>=2400){ weapon= cr>=2900?'Spectre':'Bulldog'; shield='light'; }
  else if(cr>=1200){ weapon='Spectre'; shield='light'; }
  else if(cr>=800){ weapon='Sheriff'; shield= cr>=1200?'light':'none'; }
  else { weapon= cr>=500?'Ghost':'Classic'; shield='none'; }
  let spent=(WCOST[weapon]||0)+SCOST[shield];
  if(spent>cr){ // downgrade to affordable
    shield='none'; weapon= cr>=800?'Sheriff':(cr>=500?'Ghost':'Classic'); spent=WCOST[weapon]||0;
  }
  return {weapon,shield,spent,remaining:Math.max(0,cr-spent)};
}
function initEcon(){ MV.econ={home:[800,800,800,800,800], away:[800,800,800,800,800]}; }
// map each real Valorant ability to an effect type for the viewer
const ABFX={
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
function abFxType(ab){ if(ab.ult)return 'ult'; return ABFX[ab.name] || ({in:'recon',co:'smoke',su:'heal',le:'molly'}[ab.kind]||'recon'); }
const TYPESYM={smoke:'◍', molly:'♨', wall:'▬', recon:'◎', flash:'✸', stun:'✦', heal:'✚', trap:'◇', move:'»', buff:'▲', ult:'★'};
const TYPEKO={smoke:'연막', molly:'몰로토프', wall:'벽', recon:'정찰', flash:'섬광', stun:'기절', heal:'회복', trap:'함정', move:'이동', buff:'버프', ult:'궁극기'};
// approximate effect footprint radius as % of the map's width (VALORANT skills have fixed sizes)
const SKILL_R={smoke:5.5, molly:4, wall:8, recon:9, flash:6, stun:5, heal:3, trap:2.5, move:2, buff:3, ult:8};


function shieldPips(sh){const n=sh==='heavy'?2:sh==='light'?1:0;
  return Array.from({length:2},(_,i)=>`<i class="shp${i<n?' on':''}"></i>`).join('');}
function abbr(a){return (a||'').replace('/','').slice(0,2);}
function mvBuild(home,away,agBy){
  const field=document.getElementById('mvField'); if(!field)return;
  MV.nameIdx={}; MV.dots={}; MV.st={}; MV.agBy=agBy;
  field.style.backgroundImage='url('+ASCENT_BG+')';
  field.style.backgroundSize='100% 100%';
  field.style.backgroundRepeat='no-repeat';
  field.innerHTML='';
  const mk=(side,team)=>team.roster.forEach((pl,i)=>{
    const d=document.createElement('div'); d.className='mvdot '+side;
    const _ag=agBy?agBy[pl.name]:''; const _im=agImg(_ag);
    d.innerHTML=`<span class="lbl">${pl.name}</span>`+(_im?`<img class="dotimg" src="${_im}" alt="${_ag}">`:`<span class="agi">${abbr(_ag)}</span>`);
    field.appendChild(d);
    MV.dots[side+i]=d; MV.nameIdx[pl.name]={side,i}; MV.st[side+i]={x:50,y:50,tx:50,ty:50,dead:false,path:null,seg:0};
  });
  mk('home',home); mk('away',away);
  const lg=document.getElementById('mvLegend');
  if(lg){ const keys=['smoke','molly','flash','recon','wall','trap','ult'];
    lg.innerHTML=`<span class="lg"><span class="lgteam atk"></span>공격 유틸</span>`+
      `<span class="lg"><span class="lgteam def"></span>수비 유틸</span>`+
      keys.map(t=>`<span class="lg"><span class="lgsym">${TYPESYM[t]}</span>${TYPEKO[t]}</span>`).join(''); }
}
function mvSet(key,x,y,instant){ const s=MV.st[key]; if(!s)return; s.tx=x; s.ty=y; s.path=null; s.anchor={x,y}; s.nextW=0;
  if(instant){s.x=x;s.y=y; const d=MV.dots[key]; if(d){d.style.left=x+'%';d.style.top=y+'%';}} }
function mvPath(key,wps,speed){ const s=MV.st[key]; if(!s||!wps.length)return; s.path=wps.slice(); s.seg=0; s.speed=speed||17;
  const last=wps[wps.length-1]; s.tx=last.x; s.ty=last.y; }
function mvStartRAF(){
  if(typeof requestAnimationFrame!=='function')return;
  MV._last=null;
  const step=(ts)=>{ if(MV._last==null)MV._last=ts; const dt=Math.min(0.05,((ts||0)-MV._last)/1000||0.016); MV._last=ts;
    Object.keys(MV.st).forEach(key=>{const s=MV.st[key],d=MV.dots[key]; if(!d)return;
      if(s.path&&s.seg<s.path.length){ const w=s.path[s.seg]; const dx=w.x-s.x,dy=w.y-s.y; const dist=Math.hypot(dx,dy);
        const mv=(s.speed||17)*dt;
        if(dist<=mv){ s.x=w.x; s.y=w.y; s.seg++; if(s.seg>=s.path.length)s.anchor={x:w.x,y:w.y}; } else { s.x+=dx/dist*mv; s.y+=dy/dist*mv; } }
      else { // holding: gentle idle wander around the anchor so dots feel alive (dead dots stay put)
        if(!s.dead){ if(!s.nextW || (ts||0)>s.nextW){ const a=s.anchor||{x:s.x,y:s.y}; s.tx=a.x+(Math.random()*3.4-1.7); s.ty=a.y+(Math.random()*3.4-1.7); s.nextW=(ts||0)+700+Math.random()*900; } }
        s.x+=(s.tx-s.x)*0.08; s.y+=(s.ty-s.y)*0.08; }
      d.style.left=s.x.toFixed(2)+'%'; d.style.top=s.y.toFixed(2)+'%';});
    MV.raf=requestAnimationFrame(step); };
  MV.raf=requestAnimationFrame(step);
}
function mvStopRAF(){ if(MV.raf&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(MV.raf); MV.raf=null;
  if(MV.timer){clearInterval(MV.timer);MV.timer=null;} }
function mvRenderAlive(atkAlive,defAlive,atkShort,defShort){
  const el=document.getElementById('mvAlive'); if(!el)return;
  const pips=(n,cls)=>Array.from({length:5},(_,i)=>`<span class="apip ${cls}${i<n?'':' out'}"></span>`).join('');
  el.innerHTML=`<span class="aside"><span class="alabel atk">${atkShort} ATK</span>${pips(atkAlive,'atk')}</span>`+
    `<span class="aside">${pips(defAlive,'def')}<span class="alabel def">${defShort} DEF</span></span>`;
}
// broadcast player cards: agent · HP · weapon · shield · K/D
function mvRenderCards(which,team,side,loadouts){
  const el=document.getElementById(which==='home'?'cardsHome':'cardsAway'); if(!el)return;
  el.innerHTML=team.roster.map((pl,i)=>{
    const b=MATCH.box[pl.name]||{k:0,d:0}; const lo=loadouts[i]||{weapon:'',shield:'none'};
    const dead=MV.st[which+i]&&MV.st[which+i].dead;
    const shp=(sh=>{const n=sh==='heavy'?2:sh==='light'?1:0;return[0,1].map(j=>`<i class="${j<n?'on':''}"></i>`).join('');})(lo.shield);
    return `<div class="bcard ${which}${dead?' dead':''}">
      <div class="pcag">${(function(a){return agImg(a)?`<img class="pcagimg" src="${agImg(a)}" alt="${a}">`:abbr(a);})(MV.agBy?MV.agBy[pl.name]:'')}</div>
      <div class="pcname" title="${pl.name}">${pl.name}</div>
      <div class="pchp"><i style="width:${dead?0:100}%"></i></div>
      <div class="pcwep">${lo.weapon}</div>
      <div class="pcbot"><span class="pcsh">${shp}</span><span class="pckd">${b.k}/${b.d}</span></div>
      <div class="pccr">${lo.remaining!=null?('₵'+lo.remaining):''}</div>
    </div>`;
  }).join('');
}
function mvKill(killerName,victimName){
  const kk=MV.nameIdx[killerName], vk=MV.nameIdx[victimName]; const field=document.getElementById('mvField');
  const sa=kk&&MV.st[kk.side+kk.i], sb=vk&&MV.st[vk.side+vk.i];
  // if killer & victim are far apart, pull the victim into the killer's fight (they were never really cross-map)
  if(sa&&sb){ const dist=Math.hypot(sb.x-sa.x, sb.y-sa.y);
    if(dist>18){ sb.path=null; sb.x=sa.x+(Math.random()*10-5); sb.y=sa.y+(Math.random()*8-4); sb.tx=sb.x; sb.ty=sb.y; } }
  if(vk){const key=vk.side+vk.i; const d=MV.dots[key]; if(d)d.classList.add('dead'); if(MV.st[key]){MV.st[key].dead=true;MV.st[key].path=null;}}
  if(kk&&vk&&field&&sa&&sb){
    const dx=sb.x-sa.x,dy=sb.y-sa.y; const len=Math.hypot(dx,dy); const ang=Math.atan2(dy,dx)*180/Math.PI;
    const t=document.createElement('div'); t.className='mvtracer show';
    t.style.left=sa.x+'%'; t.style.top=sa.y+'%'; t.style.width=len+'%'; t.style.transform=`rotate(${ang}deg)`;
    field.appendChild(t); setTimeout(()=>t.remove(),400);
  }
}
function mvSpike(x,y,defused){
  const field=document.getElementById('mvField'); if(!field)return;
  const s=document.createElement('div'); s.className='mvspike'+(defused?' defused':''); s.textContent=defused?'◈':'✸';
  s.style.left=x+'%'; s.style.top=y+'%'; field.appendChild(s);
  setTimeout(()=>s.classList.add('show'),20);
}
function mvAbility(ab,rd){
  const k=MV.nameIdx[ab.player]; const field=document.getElementById('mvField'); if(!k||!field)return;
  const s=MV.st[k.side+k.i]; if(!s)return;
  const type=abFxType(ab);
  const atkSide=rd.hSide==='atk'?'home':'away';
  const isAtk=k.side===atkSide;
  const GEO=curGeo();
  const site=GEO.site(rd.site);
  const choke=GEO.choke(rd.site);
  // angle of the approach into the site (choke -> site), used to orient walls/smokes
  const ang=Math.atan2(site.y-choke.y, site.x-choke.x)*180/Math.PI;
  // block-point sits between the site and its choke (where fights actually happen)
  const bp={x:(site.x*0.55+choke.x*0.45), y:(site.y*0.55+choke.y*0.45)};
  let px=s.x, py=s.y;
  if(['smoke','molly','wall','stun','recon','flash'].includes(type)){
    if(isAtk){ px=bp.x+(Math.random()*8-4); py=bp.y+(Math.random()*6-3); }  // attackers deny the defenders' angle
    else { px=site.x+(Math.random()*10-5); py=site.y+(Math.random()*7-3.5); } // defenders play on the site
  }
  const add=(cls,html,ms,x,y)=>{ const e=document.createElement('div'); e.className='fx '+cls+(isAtk?' atk':' def'); e.style.left=(x!=null?x:px)+'%'; e.style.top=(y!=null?y:py)+'%'; const ty=cls.replace('fx-',''); const R=SKILL_R[ty]; if(R&&ty!=='wall'){ e.style.width=(R*2)+'%'; e.style.height=(R*2)+'%'; } e.innerHTML=html||('<span class="fxsym">'+(TYPESYM[ty]||'')+'</span>'); field.appendChild(e); if(ms>=0)setTimeout(()=>e.remove(),ms); return e; };
  const dur = ab.ult?2600:(type==='smoke'||type==='molly'||type==='wall')?2600:900;
  switch(type){
    case 'smoke': add('fx-smoke',null,dur); break;
    case 'molly': add('fx-molly',null,dur); break;
    case 'wall': { const e=add('fx-wall',null,dur); e.style.transform='translate(-50%,-50%) rotate('+(ang+90).toFixed(0)+'deg)'; break; } // wall across the lane
    case 'recon': add('fx-recon',null,1100, site.x, site.y); break; // scans the site
    case 'flash': add('fx-flash',null,650); break;
    case 'stun': add('fx-stun',null,850); break;
    case 'heal': add('fx-heal',null,1000, s.x+(Math.random()*8-4), s.y+(Math.random()*8-4)); break;
    case 'trap': { // traps stay on a defender hold until the round resets (cleared in reset)
      add('fx-trap',null,-1, isAtk? bp.x : choke.x+(Math.random()*8-4), isAtk? bp.y : choke.y+(Math.random()*6-3)); break; }
    case 'move': { const nx=s.x+(site.x-s.x)*0.35, ny=s.y+(site.y-s.y)*0.35; s.path=null; s.tx=nx; s.ty=ny; add('fx-move',null,500,s.x,s.y); break; }
    case 'buff': add('fx-buff',null,900, s.x, s.y); break;
    case 'ult': add('fx-ult',null,dur); break;
    default: add('fx-recon',null,900);
  }
  const lab=document.createElement('div'); lab.className='mvablabel'+(ab.ult?' ult':'')+(' k-'+(ab.kind||'in'));
  lab.style.left=px+'%'; lab.style.top=(py-7)+'%'; lab.textContent=(ab.ult?'★ ':'')+ab.player+': '+ab.name; field.appendChild(lab);
  setTimeout(()=>lab.remove(), 1600);
}
function fmtClock(sec){const s=Math.max(0,Math.round(sec)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
// animate one round: buy -> movement from spawn -> duels over time -> plant/defuse -> end
function mvPlayRound(rd,speed,onDone){
  const field=document.getElementById('mvField');
  if(!field){ onDone(); return; }
  mvStopRAF();
  const fast=speed==='fast';
  if(!rd.spatial){ onDone(); return; }
  const atkTeamSide=rd.hSide==='atk'?'home':'away';
  const defTeamSide=atkTeamSide==='home'?'away':'home';
  const atkTeam=atkTeamSide==='home'?MATCH.home:MATCH.away, defTeam=defTeamSide==='home'?MATCH.home:MATCH.away;
  const atkShort=atkTeam.short, defShort=defTeam.short;
  if(!MV.econ) initEcon();
  const loadoutsHome = MATCH.home.roster.map((pl,i)=>buyFromCredits(MV.econ.home[i],pl.role,i));
  const loadoutsAway = MATCH.away.roster.map((pl,i)=>buyFromCredits(MV.econ.away[i],pl.role,i));
  MV.remaining={home:loadoutsHome.map(l=>l.remaining), away:loadoutsAway.map(l=>l.remaining)};
  const wepBy={}; MATCH.home.roster.forEach((pl,i)=>wepBy[pl.name]=loadoutsHome[i].weapon);
  MATCH.away.roster.forEach((pl,i)=>wepBy[pl.name]=loadoutsAway[i].weapon);
  const kf=document.getElementById('killFeed'); if(kf)kf.innerHTML='';
  const refreshPanels=()=>{ mvRenderCards('home',MATCH.home,rd.hSide,loadoutsHome); mvRenderCards('away',MATCH.away,rd.aSide,loadoutsAway); };
  field.classList.remove('fast'); field.querySelectorAll('.mvtracer,.mvspike,.mvpulse,.mvablabel,.fx,.sight,.plantzone').forEach(e=>e.remove());
  Object.values(MV.dots).forEach(d=>{d.classList.remove('dead');d.classList.remove('clutch');});

  // ---- replay directly from recorded per-tick position tracks (exact engine motion) ----
  const sp=rd.spatial; const dur=sp.duration||8;
  const uByKey={}; sp.units.forEach(u=>uByKey[u.side+u.idx]=u);
  const walkers={};
  const cones={};
  Object.keys(MV.st).forEach(key=>{
    const u=uByKey[key]; const track=(u&&u.track&&u.track.length)?u.track:[{t:0,x:MV.st[key].x,y:MV.st[key].y,f:0}];
    walkers[key]={track,deathT:(u?u.deathT:null)};
    MV.st[key].dead=false; mvSet(key,track[0].x,track[0].y,true);
    const cone=document.createElement('div'); cone.className='sight '+(key.indexOf(atkTeamSide)===0?'atk':'def');
    field.appendChild(cone); cones[key]=cone;
  });
  function posAt(w,te){ const tr=w.track; if(tr.length===1)return {x:tr[0].x,y:tr[0].y,f:tr[0].f||0,c:tr[0].c?1:0};
    if(te<=tr[0].t)return {x:tr[0].x,y:tr[0].y,f:tr[0].f||0,c:tr[0].c?1:0}; if(te>=tr[tr.length-1].t){const L=tr[tr.length-1];return {x:L.x,y:L.y,f:L.f||0,c:L.c?1:0};}
    let lo=0,hi=tr.length-1; while(hi-lo>1){const mid=(lo+hi)>>1; if(tr[mid].t<=te)lo=mid; else hi=mid;}
    const a=tr[lo],b=tr[hi],f=(b.t-a.t)?(te-a.t)/(b.t-a.t):0; return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,f:a.f||0,c:a.c?1:0}; }
  // defined spike install zone (rectangular, like the real site plant area)
  const gz=curGeo().plantZone(rd.site);
  const pe0=(sp.events||[]).find(e=>e.type==='plant'||e.type==='plantStart');
  const zone=document.createElement('div'); zone.className='plantzone';
  zone.style.left=(pe0?pe0.x:gz.x)+'%'; zone.style.top=(pe0?pe0.y:gz.y)+'%';
  zone.style.width=gz.w+'%'; zone.style.height=gz.h+'%'; field.appendChild(zone);

  let atkAlive=5,defAlive=5; mvRenderAlive(atkAlive,defAlive,atkShort,defShort); refreshPanels();
  const bcH=document.getElementById('bcH'), bcA=document.getElementById('bcA'), bSpike=document.getElementById('bSpike');
  if(bcH){bcH.textContent=MATCH.home.short; bcH.style.background=MATCH.home.color;}
  if(bcA){bcA.textContent=MATCH.away.short; bcA.style.background=MATCH.away.color;}
  if(bSpike){bSpike.textContent=''; bSpike.className='bspike';}
  const phase=document.getElementById('mvPhase');
  const setPhase=(t,cls)=>{ if(phase){phase.className='mvphase '+(cls||''); phase.textContent=t;} };
  const timerEl=document.getElementById('rTimer');
  setPhase('Buy · 수비 세팅 / 공격 바이','');
  if(timerEl){ timerEl.textContent='0:30'; timerEl.classList.remove('spike'); }
  MV._planted=false; MV._plantAt=0;

  // ---- event queue (kills/plant/defuse/util/recon from log + ability visuals) ----
  const evs=sp.events.slice();
  const abList=rd.abilities&&rd.abilities.length?rd.abilities:(rd.ability?[rd.ability]:[]);
  abList.forEach((ab,i)=>evs.push({t:Math.min(dur-0.1, 1.8 + i*(dur-1.8)/(abList.length+1)), type:'ability', ab}));
  evs.sort((x,y)=>x.t-y.t);
  let ei=0, firstBlood=false;

  function fireEvent(e){
    if(e.type==='kill'){
      mvKill(e.killer,e.victim);
      if(kf){ const kk=MV.nameIdx[e.killer]; if(kk){ const row=document.createElement('div'); row.className='kfrow '+kk.side;
        row.innerHTML=`<b>${e.killer}</b><span class="kfw">${wepBy[e.killer]||''}</span><b>${e.victim}</b>`;
        kf.prepend(row); while(kf.children.length>5)kf.removeChild(kf.lastChild); } }
      const vk=MV.nameIdx[e.victim]; if(vk){ if(vk.side===atkTeamSide)atkAlive=Math.max(0,atkAlive-1); else defAlive=Math.max(0,defAlive-1); }
      mvRenderAlive(atkAlive,defAlive,atkShort,defShort); refreshPanels();
      if(!firstBlood){ firstBlood=true; setPhase('First blood · '+e.killer,''); } else setPhase('교전 · '+atkAlive+'v'+defAlive,'');
      if(rd.clutch){ const ck=MV.nameIdx[rd.clutch.player]; if(ck && MV.st[ck.side+ck.i] && !MV.st[ck.side+ck.i].dead){ const d=MV.dots[ck.side+ck.i]; if(d)d.classList.add('clutch'); } }
    } else if(e.type==='plantStart'){
      setPhase(e.planter+' 설치 중...','atk');
      const el=document.createElement('div'); el.className='fx fx-trap atk'; el.style.left=e.x+'%'; el.style.top=e.y+'%'; el.innerHTML='<span class="fxsym">◆</span>';
      field.appendChild(el); setTimeout(()=>el.remove(), fast?300:3600);
    } else if(e.type==='spikeDrop'){
      setPhase('스파이크 낙하 — 위치 노출','def');
      field.querySelectorAll('.mvspike.dropped').forEach(x=>x.remove());
      const el=document.createElement('div'); el.className='mvspike show dropped'; el.textContent='✸'; el.style.left=e.x+'%'; el.style.top=e.y+'%'; field.appendChild(el);
    } else if(e.type==='spikePickup'){
      setPhase(e.by+' 스파이크 회수','atk');
      field.querySelectorAll('.mvspike.dropped').forEach(x=>x.remove());
    } else if(e.type==='defuseStart'){
      setPhase(e.defuser+' 해체 중...','def');
      const el=document.createElement('div'); el.className='fx fx-recon def'; el.style.left=e.x+'%'; el.style.top=e.y+'%'; el.innerHTML='<span class="fxsym">◈</span>';
      field.appendChild(el); setTimeout(()=>el.remove(), fast?300:3600);
    } else if(e.type==='defuseStop'){
      setPhase('해체 중단','atk');
    } else if(e.type==='plant'){
      MV._planted=true; MV._plantAt=Date.now(); field.querySelectorAll('.mvspike.dropped').forEach(x=>x.remove()); mvSpike(e.x,e.y,false);
      if(bSpike){bSpike.textContent='◆ SPIKE '+rd.site; bSpike.className='bspike';}
      setPhase('Spike planted · '+rd.site,'atk');
    } else if(e.type==='defuse'){
      mvSpike(e.x,e.y,true); if(bSpike){bSpike.textContent='◈ DEFUSED'; bSpike.className='bspike def';}
      setPhase('Spike defused','def');
    } else if(e.type==='util'){
      const el=document.createElement('div'); el.className='fx fx-'+(e.kind==='flash'?'flash':'smoke')+' atk';
      el.style.left=e.x+'%'; el.style.top=e.y+'%'; el.innerHTML='<span class="fxsym">'+(TYPESYM[e.kind]||'')+'</span>';
      field.appendChild(el); setTimeout(()=>el.remove(), fast?300:(e.kind==='flash'?700:4600));
      if(e.kind==='smoke') setPhase('진입 연막 — '+e.site+' 초크','atk');
    } else if(e.type==='recon'){
      const el=document.createElement('div'); el.className='fx fx-recon atk';
      el.style.left=e.x+'%'; el.style.top=e.y+'%'; el.innerHTML='<span class="fxsym">'+TYPESYM.recon+'</span>';
      field.appendChild(el); setTimeout(()=>el.remove(), fast?300:1100);
      setPhase('정찰 — 약한 사이트 포착','def');
    } else if(e.type==='ability'){ mvAbility(e.ab,rd); }
  }

  const buyWall=fast?60:1800;
  const moveWall=fast?460:Math.max(5000,Math.min(14000,dur*850));
  const holdWall=fast?60:800;
  let t0=null, plantTe=-1;
  function firePlantClock(){}
  function frame(ts){
    const now=(typeof ts==='number'?ts:0); if(t0==null)t0=now; const el=now-t0;
    let te;
    if(el<buyWall){ te=0; }
    else { te=Math.min(dur,(el-buyWall)/moveWall*dur); if(!firstBlood && el<buyWall+120) setPhase('Execute · '+rd.site+' 진입','atk'); }
    Object.keys(walkers).forEach(key=>{ const s=MV.st[key]; const cone=cones[key];
      if(s.dead){ if(cone)cone.style.display='none'; return; }
      const p=posAt(walkers[key],te);
      s.x=p.x; s.y=p.y; const d=MV.dots[key]; if(d){ d.style.left=s.x.toFixed(2)+'%'; d.style.top=s.y.toFixed(2)+'%'; d.classList.toggle('carry',!!p.c); }
      if(cone){ cone.style.left=s.x.toFixed(2)+'%'; cone.style.top=s.y.toFixed(2)+'%'; cone.style.transform='translate(-50%,-50%) rotate('+(p.f||0)+'deg)'; } });
    while(ei<evs.length && evs[ei].t<=te){ if(evs[ei].type==='plant'&&plantTe<0)plantTe=evs[ei].t; fireEvent(evs[ei]); ei++; }
    if(timerEl && !fast){ if(el<buyWall){ timerEl.classList.remove('spike'); timerEl.textContent=fmtClock(30*(1-el/buyWall)); }
      else if(plantTe>=0){ timerEl.classList.add('spike'); const p=Math.min(1,(te-plantTe)/Math.max(0.1,dur-plantTe)); timerEl.textContent=fmtClock(45*(1-p)); }
      else { timerEl.classList.remove('spike'); timerEl.textContent=fmtClock(100*(1-te/dur)); } }
    if(el < buyWall+moveWall){ MV.raf=requestAnimationFrame(frame); }
    else {
      while(ei<evs.length){ if(evs[ei].type==='plant'&&plantTe<0)plantTe=evs[ei].t; fireEvent(evs[ei]); ei++; }
      setPhase((rd.winner===atkTeamSide?atkShort:defShort)+' win the round', rd.winner===atkTeamSide?'atk':'def');
      if(timerEl&&!fast)timerEl.textContent='0:00'; if(bSpike&&!rd.plant)bSpike.textContent='';
      setTimeout(()=>{ mvStopRAF(); onDone(); }, holdWall);
    }
  }
  MV.raf=requestAnimationFrame(frame);
}
function mvPlantConverge(){}


/* animated: compute the map, then replay round-by-round on the top-down map */
function simCurrentMap(speed){
  if(MATCH.running)return;
  speed=speed||'normal';
  MATCH.running=true; renderMatchButtons('running'); renderMapChips();
  const home=MATCH.home, away=MATCH.away, cc=MATCH.comps[MATCH.curMap];
  if(MATCH.playerSide) MATCH.homeStartAtk = MATCH.playerSide==='home'; else MATCH.homeStartAtk=true;
  const result=simOneMap(home,away,cc,MATCH.homeStartAtk);
  MATCH.curResult=result;
  const feed=document.getElementById('feed'); feed.innerHTML='';
  document.getElementById('mapView').style.display='block';
  mvBuild(home,away,agentMap(cc));
  initEcon(); MATCH.curEconHist=[];
  paintMap(0,0);
  let idx=0;
  const step=()=>{
    if(idx>=result.rounds.length){ document.getElementById('mvBanner').innerHTML=''; finishMap(result.h,result.a); return; }
    const rd=result.rounds[idx]; idx++;
    if(rd.n===13) initEcon(); // side switch — economy resets at half
    // economy snapshot (pre-buy team credits) for the post-map graph
    if(MV.econ){ MATCH.curEconHist=MATCH.curEconHist||[];
      MATCH.curEconHist.push({n:rd.n, h:MV.econ.home.reduce((s,x)=>s+x,0), a:MV.econ.away.reduce((s,x)=>s+x,0)}); }
    // broadcast center: pre-round score + round number
    const preH=idx>1?result.rounds[idx-2].h:0, preA=idx>1?result.rounds[idx-2].a:0;
    const bsh=document.getElementById('bScoreH'), bsa=document.getElementById('bScoreA'), brd=document.getElementById('bRound');
    if(bsh)bsh.textContent=preH; if(bsa)bsa.textContent=preA; if(brd)brd.textContent='Round '+rd.n;
    // banner: side switch / overtime / normal
    const atkTeam = rd.hSide==='atk'?home:away;
    const bnEl=document.getElementById('mvBanner');
    if(rd.n===13) bnEl.innerHTML=`<span class="switchbanner">⇄ SIDE SWITCH · second half</span>`;
    else if(rd.n>24) bnEl.innerHTML=`<span class="switchbanner">OVERTIME · Round ${rd.n}</span> · <b>${atkTeam.short}</b> attack <b>${rd.site}</b>`;
    else bnEl.innerHTML=`Round ${rd.n} · <b class="atk">${atkTeam.short}</b> <span class="atk">attack</span> hitting <b>${rd.site}</b>${rd.isPistol?' · pistol':''}`;
    mvPlayRound(rd, speed, ()=>{
      applyRoundStats(MATCH.box, rd);
      const winTeam=rd.winner==='home'?home:away;
      const winSide=rd.winner==='home'?rd.hSide:rd.aSide;
      const loserBuyLbl=buyLabel(rd.winner==='home'?rd.buyA:rd.buyH);
      const tk=topKillerOfRound(rd);
      const sideTag=winSide==='atk'?'ATK':'DEF';
      const tags=[];
      if(rd.ability) tags.push(`<span class="abtag${rd.ability.ult?' ult':''}">${rd.ability.name}</span>`);
      if(rd.clutch) tags.push(`<span class="cltag">${rd.clutch.player} 1v${rd.clutch.vs}</span>`);
      if(rd.defuse) tags.push(`<span class="evtag">defuse</span>`); else if(rd.plant) tags.push(`<span class="evtag">plant</span>`);
      const ln=document.createElement('div'); ln.className='ln '+rd.winner;
      ln.innerHTML=`<span style="color:var(--muted)">R${rd.n}</span> <span class="sidetag ${winSide}">${sideTag}</span> `+
        `<span class="k">${winTeam.short}</span>`+
        `${rd.isPistol?' <span style="color:var(--muted)">pistol</span>':` <span style="color:var(--muted)">vs ${loserBuyLbl}</span>`}`+
        ` <span style="color:var(--muted)">· FB ${rd.fb.killer}</span>`+
        `${tk?` · ${tk.name} ${tk.k}k`:''} ${tags.join(' ')}`+
        `<span style="float:right;color:var(--text)">${rd.h} - ${rd.a}</span>`;
      feed.prepend(ln);
      while(feed.children.length>7)feed.removeChild(feed.lastChild);
      buildPips(rd.h,rd.a);
      if(bsh)bsh.textContent=rd.h; if(bsa)bsa.textContent=rd.a;
      // economy: carry remaining + income (win 3000 / loss 1900) + 200/kill + plant bonus
      if(MV.econ&&MV.remaining){
        const atkS=rd.hSide==='atk'?'home':'away';
        const killsBy={home:{},away:{}};
        rd.kills.forEach(k=>{const nk=MV.nameIdx[k.killer]; if(nk)killsBy[nk.side][nk.i]=(killsBy[nk.side][nk.i]||0)+1;});
        ['home','away'].forEach(sd=>{
          const won = (sd==='home')===(rd.winner==='home');
          (sd==='home'?MATCH.home:MATCH.away).roster.forEach((pl,i)=>{
            let add=won?3000:1900;
            if(rd.plant && sd===atkS && !won) add+=600; // planted but lost
            add+=(killsBy[sd][i]||0)*200;
            MV.econ[sd][i]=Math.min(9000,(MV.remaining[sd][i]||0)+add);
          });
        });
      }
      const sel=rd.winner==='home'?document.querySelectorAll('#pipsHome .pip.home'):document.querySelectorAll('#pipsAway .pip.away');
      if(sel.length){const lp=sel[sel.length-1];lp.classList.add('pop');setTimeout(()=>lp.classList.remove('pop'),120);}
      document.getElementById('rRoundNo').textContent=`Round ${rd.h+rd.a}`;
      step();
    });
  };
  setTimeout(step, 220);
}
function weightedPlayer(team,form){
  const weights=team.roster.map(pl=>Math.max(1,pl.aim + (form[pl.name]||0) + (pl.role==='DUE'?8:0)));
  const tot=weights.reduce((s,w)=>s+w,0); let r=Math.random()*tot;
  for(let i=0;i<team.roster.length;i++){r-=weights[i];if(r<=0)return team.roster[i];}
  return team.roster[0];
}

function finishMap(h,a){
  const hWon=h>a;
  MATCH.mapResults[MATCH.curMap]={h,a,hWon,rounds:(MATCH.curResult?MATCH.curResult.rounds:[]),mapName:MATCH.mapPool[MATCH.curMap],econ:(MATCH.curEconHist||[]).slice()};
  MATCH.roundsPlayed=(MATCH.roundsPlayed||0)+(h+a);
  if(hWon)MATCH.hMaps++; else MATCH.aMaps++;
  document.getElementById('homeMaps').textContent=MATCH.hMaps;
  document.getElementById('awayMaps').textContent=MATCH.aMaps;
  document.getElementById('homeMaps').className='s '+(MATCH.hMaps>MATCH.aMaps?'win':'lose');
  document.getElementById('awayMaps').className='s '+(MATCH.aMaps>MATCH.hMaps?'win':'lose');
  MATCH.running=false; renderMapChips();
  const done=MATCH.hMaps===MATCH.mapsToWin||MATCH.aMaps===MATCH.mapsToWin;
  if(done){ endMatch(); }
  else {
    toast(`Map ${MATCH.curMap+1}: ${MATCH.home.short} ${h}-${a} ${MATCH.away.short}`);
    startMapDraft(MATCH.curMap+1); // player drafts the next map
  }
}

function endMatch(){
  finalizeRatings(MATCH.box, MATCH.roundsPlayed||1);
  // record result into season
  const fx=MATCH.fx; const r={hMaps:MATCH.hMaps,aMaps:MATCH.aMaps};
  fx.played=true; fx.res=r;
  const H=ST.standings[fx.home], A=ST.standings[fx.away];
  H.mapW+=MATCH.hMaps; H.mapL+=MATCH.aMaps; A.mapW+=MATCH.aMaps; A.mapL+=MATCH.hMaps;
  let rd=0; MATCH.mapResults.forEach(m=>{if(m)rd+=(m.h-m.a);}); H.rd+=rd; A.rd-=rd;
  if(MATCH.hMaps>MATCH.aMaps){H.w++;A.l++;}else{A.w++;H.l++;}
  // sim the rest of this week's other matches
  simRestOfWeek(MATCH.wi, fx);
  showBox();
  renderTimeline();
  renderMatchButtons('end');
}
function simRestOfWeek(wi, skipFx){
  ST.schedule[wi].forEach(f=>{
    if(f.played||f===skipFx)return;
    const res=quickSim(teamObj(f.home),teamObj(f.away));
    f.played=true; f.res={hMaps:res.h,aMaps:res.a};
    const H=ST.standings[f.home],A=ST.standings[f.away];
    H.mapW+=res.h;H.mapL+=res.a;A.mapW+=res.a;A.mapL+=res.h;
    H.rd+=res.rd;A.rd-=res.rd;
    if(res.h>res.a){H.w++;A.l++;}else{A.w++;H.l++;}
  });
  if(firstUnplayedWeek()<0)ST.seasonOver=true;
}
/* headless quick sim for background matches — Bo3, same engine, no replay */
function quickSim(home,away){
  let hM=0,aM=0,rd=0;
  const maps=pickMaps(3);
  const throwBox=freshBox(home,away);
  for(let m=0;m<3&&hM<2&&aM<2;m++){
    const cc=draftPair(home,away,maps[m]);
    const result=simOneMap(home,away,cc,Math.random()<0.5);
    rd+=(result.h-result.a); if(result.h>result.a)hM++;else aM++;
  }
  return {h:hM,a:aM,rd};
}

/* ---- box score ---- */
let boxSide='home';
function showBox(){
  document.getElementById('boxWrap').style.display='block';
  const tb=document.getElementById('boxTabs');
  tb.innerHTML=`<button class="${boxSide==='home'?'on':''}" onclick="setBoxSide('home')">${MATCH.home.short}</button>
    <button class="${boxSide==='away'?'on':''}" onclick="setBoxSide('away')">${MATCH.away.short}</button>`;
  renderBox();
}
function renderBox(){
  document.getElementById('boxTabs').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',(i===0)===(boxSide==='home')));
  const team=boxSide==='home'?MATCH.home:MATCH.away;
  const agBy = MATCH.comps[0]? agentMap(MATCH.comps[0]) : {};
  const rows=team.roster.map(pl=>({pl,b:MATCH.box[pl.name]})).sort((x,y)=>y.b.rating-x.b.rating);
  const mvpName=matchMVP();
  const t=document.getElementById('boxTable');
  t.innerHTML=`<thead><tr><th>Player</th><th title="Impact rating">RAT</th><th>ACS</th><th>K</th><th>D</th><th>A</th>
    <th title="First bloods" class="hide">FB</th><th title="First deaths" class="hide">FD</th><th title="Clutches">CL</th><th title="Utility plays" class="hide">UT</th></tr></thead><tbody>`+
    rows.map(({pl,b})=>{
      const ag=agBy[pl.name]||'';
      const ratCls=b.rating>=1.15?'pos':b.rating<0.85?'neg':'';
      return `<tr><td class="pl">${pl.name==mvpName?'<span class="mvpstar">★</span> ':''}${pl.name}<span class="agtag"> ${ag}</span></td>
      <td class="rat ${ratCls}">${b.rating.toFixed(2)}</td>
      <td class="acs">${b.acsFinal}</td><td>${b.k}</td><td>${b.d}</td><td>${b.a}</td>
      <td class="hide">${b.fb}</td><td class="hide">${b.fd}</td><td>${b.cl||0}</td><td class="hide">${b.util||0}</td></tr>`;
    }).join('')+`</tbody>`;
}
function matchMVP(){let best=null,ba=-1;Object.entries(MATCH.box).forEach(([n,b])=>{if(b.rating>ba){ba=b.rating;best=n;}});return best;}
/* round-by-round timeline (TFM-style inspectable log) */
function renderTimeline(){
  const wrap=document.getElementById('timelineWrap'); if(!wrap)return;
  wrap.style.display='block';
  const mvp=matchMVP(); const mvpStat=MATCH.box[mvp];
  let html=`<div class="tlmvp"><span class="mvplbl">Player of the match</span>
    <span class="mvpname">★ ${mvp}</span>
    <span class="mvpline">${mvpStat.rating.toFixed(2)} rating · ${mvpStat.k}/${mvpStat.d}/${mvpStat.a} · ${mvpStat.fb} FB${mvpStat.cl?` · ${mvpStat.cl} clutch`:''}</span></div>`;
  MATCH.mapResults.forEach((mr,mi)=>{
    if(!mr||!mr.rounds)return;
    html+=`<div class="tlmap"><div class="tlmaphd">${mr.mapName} <b>${mr.h}-${mr.a}</b></div><div class="tlrow">`;
    mr.rounds.forEach(rd=>{
      const winCls=rd.winner;
      const icons=(rd.defuse?'◈':rd.plant?'✸':'')+(rd.clutch?'★':'');
      const title=`R${rd.n} ${(rd.winner==='home'?rd.hSide:rd.aSide).toUpperCase()} ${rd.winner==='home'?MATCH.home.short:MATCH.away.short} win`+
        ` · FB ${rd.fb.killer}`+(rd.ability?` · ${rd.ability.name}`:'')+(rd.plant?(rd.defuse?' · defused':' · planted'):'')+(rd.clutch?` · ${rd.clutch.player} 1v${rd.clutch.vs}`:'');
      html+=`<span class="tlcell ${winCls}${rd.isPistol?' pistol':''}" title="${title}"><span class="tln">${rd.n}</span><span class="tlic">${icons}</span></span>`;
    });
    html+=`</div></div>`;
  });
  // economy graphs per map (credits per round)
  MATCH.mapResults.forEach((mr,mi)=>{
    if(!mr||!mr.econ||!mr.econ.length)return;
    const W=460,H=70,pad=4,max=45000,n=mr.econ.length;
    const xf=i=>pad+(n<=1?0:i*(W-2*pad)/(n-1));
    const yf=v=>H-pad-(v/max)*(H-2*pad);
    const line=(key,col)=>mr.econ.map((e,i)=>`${i?'L':'M'}${xf(i).toFixed(1)},${yf(e[key]).toFixed(1)}`).join(' ');
    html+=`<div class="econgraph"><div class="eghd">${mr.mapName} · team credits by round</div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <path d="${line('h','')}" fill="none" stroke="var(--val)" stroke-width="2"/>
        <path d="${line('a','')}" fill="none" stroke="var(--def)" stroke-width="2"/>
      </svg></div>`;
  });
  wrap.innerHTML=html;
}

/* ---- match buttons ---- */
function renderMatchButtons(phase){
  const box=document.getElementById('matchBtns'); box.innerHTML='';
  if(phase==='start'){
    box.innerHTML=`<button class="btn" onclick="simCurrentMap('normal')">▶ Watch · ${MATCH.mapPool[MATCH.curMap]}</button>
    <button class="btn ghost" style="width:auto" onclick="simCurrentMap('fast')">⏩ Fast</button>
    <button class="btn ghost" style="width:auto" onclick="skipMatch()">⏭ Skip</button>`;
  } else if(phase==='running'){
    box.innerHTML=`<button class="btn" disabled>Playing…</button>`;
  } else if(phase==='nextmap'){
    box.innerHTML=`<button class="btn" onclick="simCurrentMap()">Sim Map ${MATCH.curMap+1} · ${MATCH.mapPool[MATCH.curMap]}</button>`;
  } else if(phase==='end'){
    const myId=ST.teams[ST.myTeamIdx].id;
    const won=(MATCH.fx.home===myId&&MATCH.hMaps>MATCH.aMaps)||(MATCH.fx.away===myId&&MATCH.aMaps>MATCH.hMaps);
    box.innerHTML=`<button class="btn ${won?'gold':''}" onclick="backToHub()">${won?'Great win — Continue':'Continue'}</button>`;
  }
}
function skipMatch(){
  go('scMatch'); // may be called from the veto or draft screen
  document.getElementById('boxWrap').style.display='none';
  document.getElementById('mapView').style.display='none';
  document.getElementById('feed').innerHTML='';
  if(!MATCH.comps)MATCH.comps=[];
  const homeStartAtk = MATCH.playerSide ? MATCH.playerSide==='home' : true;
  while(MATCH.hMaps<MATCH.mapsToWin&&MATCH.aMaps<MATCH.mapsToWin){
    const home=MATCH.home,away=MATCH.away;
    if(!MATCH.comps[MATCH.curMap])MATCH.comps[MATCH.curMap]=draftPair(home,away,MATCH.mapPool[MATCH.curMap]);
    const cc=MATCH.comps[MATCH.curMap];
    const result=simOneMap(home,away,cc,homeStartAtk);
    result.rounds.forEach(rd=>applyRoundStats(MATCH.box,rd));
    MATCH.roundsPlayed=(MATCH.roundsPlayed||0)+(result.h+result.a);
    MATCH.mapResults[MATCH.curMap]={h:result.h,a:result.a,hWon:result.h>result.a,rounds:result.rounds,mapName:MATCH.mapPool[MATCH.curMap]};
    if(result.h>result.a)MATCH.hMaps++;else MATCH.aMaps++;
    MATCH.curMap++;
  }
  MATCH.curMap=Math.min(MATCH.curMap,MATCH.mapPool.length-1);
  document.getElementById('homeMaps').textContent=MATCH.hMaps;
  document.getElementById('awayMaps').textContent=MATCH.aMaps;
  document.getElementById('homeMaps').className='s '+(MATCH.hMaps>MATCH.aMaps?'win':'lose');
  document.getElementById('awayMaps').className='s '+(MATCH.aMaps>MATCH.hMaps?'win':'lose');
  renderMapChips();
  endMatch();
}
function backToHub(){renderHub();go('scHub');
  if(ST.seasonOver){showChampCheck();}
}
function showChampCheck(){
  const rows=sortedStandings();
  const my=ST.teams[ST.myTeamIdx];
  const pos=rows.findIndex(t=>t.id===my.id)+1;
  toast(`Regular season done — ${my.name} finished #${pos}. Playoffs coming in the next build.`);
}

/* ---- nav + toast ---- */
function go(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.getElementById(id).classList.add('on');
  if(id==='scSquad')renderSquad();
  if(id==='scHub')renderHub();
  window.scrollTo({top:0,behavior:'smooth'});
}
let toastTimer=null;
function toast(msg){const t=document.getElementById('toast');t.innerHTML=msg;t.classList.add('on');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('on'),3200);}

/* boot */
// TEMP (Phase 0): the script is now an ES module, so its top-level bindings
// are no longer visible to onclick="" strings baked into innerHTML templates
// (they used to share the classic-script global lexical scope). Expose exactly
// what those inline strings call. Removed in Phase 4 when handlers move to
// addEventListener.
function setBoxSide(v){ boxSide=v; renderBox(); }
Object.assign(window, {
  go, startNextMatch, vetoSkip, startMapDraft, skipMatch, selectAgent,
  confirmDraft, backToHub, simCurrentMap, setBoxSide,
});

applyRealStats();
buildAgentPools();
buildSelect();
