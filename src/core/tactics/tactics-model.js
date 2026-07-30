// Data-only tactical definitions. Balance values belong here so adding a tactic
// or changing its priorities does not require editing the spatial engine.
export const ATTACK_TACTICS={
  DEFAULT:{formation:{main:3,mid:1,lurk:1},requirements:{tactical:.30,teamplay:.25,positioning:.20,adaptability:.15,firepower:.10},risk:.35,pace:.42},
  RUSH:{formation:{main:5,mid:0,lurk:0},requirements:{entry:.30,explosiveness:.25,firepower:.20,teamplay:.15,pressure:.10},risk:.78,pace:.95},
  SPLIT:{formation:{main:3,mid:2,lurk:0},requirements:{teamplay:.30,tactical:.25,positioning:.20,adaptability:.15,firepower:.10},risk:.52,pace:.60},
  EXECUTE:{formation:{main:4,mid:1,lurk:0},requirements:{tactical:.30,teamplay:.25,adaptability:.15,entry:.15,positioning:.15},risk:.45,pace:.72},
  FAKE:{formation:{main:3,mid:1,lurk:1},requirements:{tactical:.35,adaptability:.25,teamplay:.20,positioning:.15,pressure:.05},risk:.62,pace:.50},
  CONTACT:{formation:{main:4,mid:0,lurk:1},requirements:{positioning:.30,teamplay:.20,firepower:.20,tactical:.15,pressure:.15},risk:.40,pace:.35},
};

export const DEFENSE_TACTICS={
  STANDARD:{requirements:{positioning:.25,tactical:.25,teamplay:.20,firepower:.15,adaptability:.15},aggression:.35,retake:.35},
  PASSIVE:{requirements:{positioning:.30,consistency:.20,tactical:.20,teamplay:.15,clutch:.15},aggression:.12,retake:.48},
  AGGRESSIVE:{requirements:{firepower:.25,entry:.20,explosiveness:.20,teamplay:.15,pressure:.10,positioning:.10},aggression:.90,retake:.12},
  STACK:{requirements:{tactical:.30,adaptability:.25,teamplay:.20,positioning:.15,firepower:.10},aggression:.30,retake:.28},
  RETAKE:{requirements:{teamplay:.30,tactical:.25,clutch:.20,adaptability:.15,positioning:.10},aggression:.10,retake:.92},
};

export const TACTICS_MODEL={
  version:'tactics-v1',
  neutralAttribute:60,
  selectionTemperature:12,
  executionNoise:4,
  edgeScale:.09,
  memoryRounds:6,
};

