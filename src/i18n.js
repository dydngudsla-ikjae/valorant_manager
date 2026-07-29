import { ST } from './core/state.js';

export const tr = (ko, en) => ST.language === 'en' ? en : ko;

const ROLE_LABELS = {
  DUE: ['타격대', 'Duelist'], INI: ['척후대', 'Initiator'],
  SEN: ['감시자', 'Sentinel'], CON: ['전략가', 'Controller'], FLEX: ['플렉스', 'Flex'],
};
const ATTRIBUTE_LABELS = {
  firepower: ['화력', 'Firepower'], combatEfficiency: ['전투 효율', 'Combat efficiency'],
  entry: ['진입', 'Entry'], positioning: ['포지셔닝', 'Positioning'], teamplay: ['팀플레이', 'Teamplay'],
  tactical: ['전술 이해', 'Tactical'], clutch: ['클러치', 'Clutch'], explosiveness: ['폭발력', 'Explosiveness'],
  consistency: ['꾸준함', 'Consistency'], adaptability: ['적응력', 'Adaptability'], pressure: ['압박 대응', 'Pressure'],
};
const PROFICIENCY_LABELS = {
  '능숙함': ['능숙함', 'Accomplished'], '자연스러움': ['자연스러움', 'Natural'],
  '가능함': ['가능함', 'Competent'], '불가능': ['불가능', 'Unfamiliar'],
};

export const roleLabel = role => (ROLE_LABELS[role] || [role, role])[ST.language === 'en' ? 1 : 0];
export const attributeLabel = key => (ATTRIBUTE_LABELS[key] || [key, key])[ST.language === 'en' ? 1 : 0];
export const proficiencyLabel = label => (PROFICIENCY_LABELS[label] || [label, label])[ST.language === 'en' ? 1 : 0];
export const weekLabel = number => tr(`${number}주차`, `Week ${number}`);
