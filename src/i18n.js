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

export const roleLabel = role => (ROLE_LABELS[role] || [role, role])[ST.language === 'en' ? 1 : 0].toUpperCase();
export const attributeLabel = key => (ATTRIBUTE_LABELS[key] || [key, key])[ST.language === 'en' ? 1 : 0];
export const proficiencyLabel = label => (PROFICIENCY_LABELS[label] || [label, label])[ST.language === 'en' ? 1 : 0];
export const weekLabel = number => tr(`${number}주차`, `Week ${number}`);

const MAP_LABELS={Ascent:'어센트',Bind:'바인드',Haven:'헤이븐',Split:'스플릿',Lotus:'로터스',Sunset:'선셋',Icebox:'아이스박스'};
const TACTIC_LABELS={DEFAULT:'기본 운영',RUSH:'빠른 진입',SPLIT:'분할 공격',EXECUTE:'세트 플레이',FAKE:'페이크',CONTACT:'접촉 운영',STANDARD:'기본 수비',PASSIVE:'소극 수비',AGGRESSIVE:'공격 수비',STACK:'사이트 집중',RETAKE:'리테이크'};
const POLICY_LABELS={BALANCED:'균형',TEMPO:'템포',STRUCTURED:'체계적',ADAPTIVE:'적응형',AUTO:'자동',LOW:'낮음',NORMAL:'보통',HIGH:'높음'};
const STANCE_LABELS={AGGRO:'빠른 전개',CONTROL:'느린 기본 운영',LOCKDOWN:'봉쇄 운영',BALANCED:'균형 운영'};
const STANCE_BLURBS={AGGRO:'템포와 공간',CONTROL:'맵 장악',LOCKDOWN:'정보 차단',BALANCED:'유연한 대응'};
const AGENT_LABELS={Jett:'제트',Raze:'레이즈',Reyna:'레이나',Phoenix:'피닉스',Neon:'네온',Yoru:'요루',Iso:'아이소',Waylay:'웨이레이',Sova:'소바',Fade:'페이드',Breach:'브리치',Skye:'스카이','KAY/O':'케이/오',Gekko:'게코',Tejo:'테호',Killjoy:'킬조이',Cypher:'사이퍼',Sage:'세이지',Chamber:'체임버',Deadlock:'데드록',Vyse:'바이스',Veto:'베토',Omen:'오멘',Brimstone:'브림스톤',Viper:'바이퍼',Astra:'아스트라',Harbor:'하버',Clove:'클로브',Miks:'믹스'};
export const mapLabel=name=>ST.language==='en'?name:(MAP_LABELS[name]||name);
export const tacticLabel=name=>ST.language==='en'?name:(TACTIC_LABELS[name]||name);
export const policyLabel=name=>ST.language==='en'?name:(POLICY_LABELS[name]||TACTIC_LABELS[name]||name);
export const stanceLabel=name=>ST.language==='en'?({AGGRO:'Fast Execute',CONTROL:'Slow Default',LOCKDOWN:'Lockdown',BALANCED:'Balanced'}[name]||name):(STANCE_LABELS[name]||name);
export const stanceBlurb=name=>ST.language==='en'?({AGGRO:'tempo & space',CONTROL:'map control',LOCKDOWN:'info denial',BALANCED:'flexible'}[name]||name):(STANCE_BLURBS[name]||name);
export const agentLabel=name=>ST.language==='en'?name:(AGENT_LABELS[name]||name);
