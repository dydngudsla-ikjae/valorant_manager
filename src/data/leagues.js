export const ROLE = {
  DUE:{name:"Duelist",  c:"var(--due)", w:{aim:.36,sense:.20,clutch:.22,util:.08,mental:.14}},
  INI:{name:"Initiator",c:"var(--ini)", w:{aim:.24,sense:.28,clutch:.12,util:.24,mental:.12}},
  SEN:{name:"Sentinel", c:"var(--sen)", w:{aim:.22,sense:.22,clutch:.20,util:.24,mental:.12}},
  CON:{name:"Controller",c:"var(--con)",w:{aim:.20,sense:.30,clutch:.12,util:.26,mental:.12}},
  FLEX:{name:"Flex",     c:"var(--flex)", w:{aim:.255,sense:.25,clutch:.165,util:.205,mental:.125}},
};

export const MAPS=["Ascent","Bind","Haven","Split","Lotus","Sunset","Icebox"];

/* p(): compact player factory  — name, role, aim,sense,clutch,util,mental */

export function p(name,role,a,s,c,u,m,prof){
  const base={DUE:8,INI:8,SEN:8,CON:8}; base[role]=20;
  if(prof) Object.assign(base,prof);
  return{name,role,aim:a,sense:s,clutch:c,util:u,mental:m,prof:base};
}

export function primaryRole(pl){ let best=pl.role,bv=-1; for(const r of ['DUE','INI','SEN','CON']){ if(pl.prof[r]>bv){bv=pl.prof[r];best=r;} } return best; }

export function isFlex(pl){ if(pl._flex===true)return true; if(pl._flex===false)return false; return ['DUE','INI','SEN','CON'].filter(r=>pl.prof[r]>=15).length>=2; }

export function secondaryRole(pl){ const prim=primaryRole(pl); let best=null,bv=12; for(const r of ['DUE','INI','SEN','CON']){ if(r!==prim&&pl.prof[r]>bv){bv=pl.prof[r];best=r;} } return best; }

export function displayRole(pl){ if(isFlex(pl))return 'FLEX'; const sec=secondaryRole(pl); const prim=primaryRole(pl); return sec?prim+'/'+sec:prim; }

export function roleColor(pl){ return ROLE[primaryRole(pl)].c; }

export function roleFull(pl){ if(isFlex(pl))return 'Flex · main '+ROLE[primaryRole(pl)].name; const sec=secondaryRole(pl); return ROLE[primaryRole(pl)].name+(sec?' / '+ROLE[sec].name:''); }
// a compact, role-balanced pool for cards: top by mastery, but guarantee a secondary-role agent shows

export const PROFBANDS=[[18,'능숙함','#2ECC71'],[15,'자연스러움','#A3E635'],[10,'가능함','#F5C518'],[0,'불가능','#FF4655']];

export function profBand(v){ for(const b of PROFBANDS){ if(v>=b[0])return b; } return PROFBANDS[PROFBANDS.length-1]; }


export const LEAGUES = {
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
