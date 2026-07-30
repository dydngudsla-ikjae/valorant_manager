function hashSeed(value){
  const text=String(value); let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
  return h>>>0;
}

let state=hashSeed('vlm-2026');

export function deriveSeed(...parts){return parts.map(String).join('\u001f');}
export function setSeed(seed){state=hashSeed(seed)||0x9e3779b9;return state;}
export function random(){
  state=(state+0x6D2B79F5)>>>0;
  let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
}
export function withSeed(seed,fn){const previous=state;setSeed(seed);try{return fn();}finally{state=previous;}}
export function randomInt(max){return Math.floor(random()*max);}
export function rngSnapshot(){return state>>>0;}
