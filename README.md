# VALORANT League Manager

VCT 데이터를 기반으로 선수와 팀을 운영하고 경기를 시뮬레이션하는 VALORANT 매니지먼트 게임 프로젝트다. Football Manager처럼 팀 선택, 선수 능력치와 역할·요원 숙련도 확인, 맵 비토, 조합 선택, 경기 진행, 시즌 순위와 통계 확인을 하나의 흐름으로 만드는 것이 목표다.

현재 게임은 2026 VCT 국제 리그 48팀을 기준으로 한다. 선수 데이터는 여러 시즌의 객관적 경기 기록을 사용하며, 2026 표본이 적은 선수는 과거의 검증된 기록과 신뢰도를 함께 사용한다.

## 주요 기능

- Americas, EMEA, Pacific, China 4개 국제 리그와 48팀
- 2026 등록 선수단과 ID 기반 선수·팀 연결
- 선수별 11개 능력치
- 역할 숙련도, 요원 숙련도, 맵 숙련도와 플레이 성향
- 2023년 이후 대회·연도별 선수 기록
- 한국어/영어 UI
- 팀·선수 상세와 대회 통계
- 맵 비토, 요원 드래프트, 라운드 시뮬레이션과 박스스코어
- 로컬 팀 로고, 요원 이미지, 역할 아이콘과 선수 사진

## 기술 구성

- React 19
- Vite 5
- 순수 JavaScript ES modules
- JSON/JSONL 기반 데이터 저장
- Node.js 데이터 빌드·검증 스크립트
- 별도 데이터베이스 없이 안정적인 ID로 엔티티 연결

## 시작하기

### 요구 사항

- Node.js 20 이상 권장
- npm
- 전체 데이터를 다시 만들 경우 원본 `stats/**/*.csv`

### 설치

```powershell
npm install
```

### 개발 서버

```powershell
npm run dev
```

터미널에 표시되는 로컬 주소를 브라우저에서 연다. 개발 서버는 명령을 종료하기 전까지 계속 실행된다.

### 프로덕션 빌드

```powershell
npm run build
```

빌드 결과는 `dist/`에 생성된다.

### 빌드 결과 미리보기

```powershell
npm run preview
```

## 데이터 구조

데이터는 원본 보존 계층과 게임 소비 계층을 분리한다.

1. `stats/`: 원본 CSV
2. `vct_json/`: CSV 행을 손실 없이 변환한 ID 기반 JSONL
3. `profile_json/`: 선수·팀·맵·요원의 객관적 집계 프로필
4. `stat_json/`: 프로필을 11개 능력치와 숙련도로 변환
5. `runtime_2026/`: 여러 시즌을 결합한 2026 게임용 선수 데이터
6. `history_json/`: UI에서 보여주는 연도·대회별 선수 기록
7. `src/data/`: 브라우저에서 직접 사용하는 런타임 JSON

`vct_json/data`, `profile_json/data`, `stat_json/data`는 재생성 가능한 대용량 결과물이므로 Git에서 제외되어 있다. 스크립트, 설정, 스키마, 매니페스트와 검증 보고서는 보존한다.

## 데이터 전체 재빌드

원본 CSV 또는 변환 규칙을 바꿨다면 아래 순서대로 실행한다.

### 1. 원본 CSV 복구 및 정규화

필요한 경우에만 실행한다. 이 스크립트는 알려진 원본 데이터 오류를 수정한다.

```powershell
node .\vct_json\scripts\repair-source-data.mjs
```

### 2. CSV → VCT JSONL

```powershell
node .\vct_json\scripts\build-vct-json.mjs
node .\vct_json\scripts\verify-vct-json.mjs
```

### 3. 객관적 프로필 생성

```powershell
node .\profile_json\scripts\build-profiles.mjs
node .\profile_json\scripts\verify-profiles.mjs
```

### 4. 선수 능력치 생성

```powershell
node .\stat_json\scripts\build-player-stats.mjs
node .\stat_json\scripts\verify-player-stats.mjs
```

### 5. 2026 로스터와 게임 런타임 생성

```powershell
npm run data:rosters
npm run data:runtime
npm run verify:runtime
```

직접 실행할 수도 있다.

```powershell
node .\runtime_2026\scripts\build-game-rosters-2026.mjs
node .\runtime_2026\scripts\build-runtime-2026.mjs
node .\runtime_2026\scripts\verify-runtime-2026.mjs
```

### 6. 선수 역사 데이터 생성

```powershell
npm run data:history
```

또는:

```powershell
node .\history_json\scripts\build-player-history.mjs
```

### 7. 최종 앱 빌드 확인

```powershell
npm run build
```

## 에셋 스크립트

### 팀 로고

```powershell
npm run assets:team-logos
```

팀 로고는 `public/img/teams/`에 저장되고 출처와 매칭 정보는 같은 폴더의 `manifest.json`에 기록된다.

### 선수 사진

```powershell
npm run assets:player-photos
```

Liquipedia 선수 문서의 대표 사진을 선수 ID 기준으로 `public/img/players/`에 저장한다. 사진이 없거나 문서 매칭이 불확실한 선수는 억지로 연결하지 않는다.

- UI 매핑: `src/data/player-images.json`
- 출처·원본 URL·상태: `public/img/players/manifest.json`
- 수집 스크립트: `scripts/download-player-photos.mjs`

이미지별 권리는 서로 다를 수 있다. 현재 사진은 비상업적 개발 프로젝트 용도로 관리하며, 공개 배포 또는 상업화 전에 각 파일의 사용 조건을 다시 검토해야 한다.

### 역할 아이콘 정규화

```powershell
npm run assets:role-icons
```

### 관전 HUD 전투 아이콘

```powershell
npm run assets:combat
```

`images/PublicContentCatalog.json`과 `images/Weapons`, `images/Armors`, `images/Abilities`를 읽어 관전 HUD에서 사용하는 무기·방어구·스킬 이미지를 `public/img/combat/`에 복사한다. 이름과 로컬 경로는 `public/img/combat/manifest.json`에서 관리하므로 원본 UUID를 UI 코드에 직접 입력하지 않는다.

## 자주 실행하는 명령

| 목적 | 명령 |
|---|---|
| 개발 서버 | `npm run dev` |
| 프로덕션 빌드 | `npm run build` |
| 빌드 미리보기 | `npm run preview` |
| 2026 로스터 재생성 | `npm run data:rosters` |
| 2026 로스터 감사 | `npm run audit:rosters` |
| 2026 능력치 런타임 재생성 | `npm run data:runtime` |
| 선수 역사 재생성 | `npm run data:history` |
| 런타임 검증 | `npm run verify:runtime` |
| Seed 재현성 검증 | `npm run verify:rng` |
| 빠른 경기 엔진 검증 | `npm run verify:match-engine` |
| 능력치 민감도 검증 | `npm run verify:attributes` |
| 숙련도·성향 민감도 검증 | `npm run verify:experience` |
| 팀 요원 조합 검증 | `npm run verify:compositions` |
| 경제 상태 검증 | `npm run verify:economy` |
| 시뮬레이션 분포 검증 | `npm run validate:simulation` |
| Bo1·Bo3·Bo5 형식 검증 | `npm run verify:formats` |

### UI 없는 경기 시뮬레이션

`src/core/match-engine.js`의 `simulateMatch()`는 DOM 없이 Bo1, Bo3, Bo5 전체를 실행한다. 등록 선수단에서 출전 5인이 정해진 팀 객체와 seed를 전달하며, 필요하면 맵·진영·요원 조합을 직접 지정할 수 있다.

```js
const result = simulateMatch({
  home,
  away,
  seed: 'season-2026-week-1-match-3',
  bestOf: 3,
  maps: ['Ascent', 'Bind', 'Haven']
});
```

반환값에는 매치 승자, 맵 스코어, 라운드 차이, 맵별 seed, 전체 라운드 로그, 선수 박스스코어와 Rating이 포함된다.

### 능력치의 경기 사건 연결

| 능력치 | 주요 직접 영향 |
|---|---|
| Firepower | 모든 교전의 기본 화력, 킬 확률 |
| Combat efficiency | 교전 효율, 불완전 구매의 페널티 완화 |
| Entry | 공격 진입과 첫 교전 |
| Positioning | 기본 교전 안정성, 수비 홀드 |
| Teamplay | 어시스트 발생, 공격 유틸리티 연계 |
| Tactical | 정보 획득, 유틸리티 효율, 수비 판단 |
| Clutch | 수적 열세의 최종 교전 |
| Explosiveness | 첫 교전과 초반 고점 발생 |
| Consistency | 맵별 경기력 변동과 저점 완화 |
| Adaptability | 기본 대응력과 공격 전환 적응 |
| Pressure | 부진 완화와 클러치·중요 교전 |

### 팀 단위 요원 조합

자동 드래프트는 선수별 최고 숙련 요원을 독립적으로 선택하지 않는다. 각 선수의 상위 후보를 조합해 요원 중복 없이 팀 전체 점수가 가장 높은 구성을 찾는다. 평가는 개인 숙련도, 역할 숙련도, 맵 선호, 전략별 요원 기능 벡터와 역할 커버리지를 함께 사용한다.

사용자가 직접 만든 조합도 같은 평가 함수를 사용한다. 중복 요원이나 전략가·척후대 등 핵심 역할 부재는 `violations`와 수치 페널티로 반환된다. 조합 관련 후보 수·가중치·페널티는 `src/core/simulation-model.js`의 `COMPOSITION_MODEL`에서 조정한다.

### 경제 상태

경제 계산은 `src/core/economy.js`, 수치 조정은 `src/core/economy-model.js`로 분리한다. 라운드마다 구매 전 크레딧, 구매 종류와 지출, 라운드 수입, 연패 단계와 다음 크레딧을 로그에 저장한다. 승리 수입, 단계별 패배 보너스, 스파이크 설치 보너스, 하프타임·연장 초기화와 크레딧 상한을 지원한다. 화면 중계와 UI 없는 경기 엔진은 같은 라운드 경제 로그를 사용한다.

### 시뮬레이션 분포 검증

`runtime_2026/scripts/validate-simulation-balance.mjs`는 모든 팀이 포함되는 순환 표본을 만들고 평균 라운드 수, 연장 비율, 전력 차가 있는 경기의 업셋 비율, 팀별 승률·라운드 득실과 선수 Rating·K/D 분포를 저장한다. 오류 허용 범위와 밸런스 권장 범위는 `runtime_2026/simulation-validation-config.json`에서 따로 조정한다.

```powershell
npm run validate:simulation
node .\runtime_2026\scripts\validate-simulation-balance.mjs --matches=10000 --best-of=3 --seed=balance-v2
```

결과는 `runtime_2026/data/simulation-validation.json`에 저장된다. 같은 seed를 사용하면 계산식 변경 전후를 같은 대진으로 비교할 수 있다.

### 경기 형식과 비토

리그 기본값은 Bo3이며 `ST.matchBestOf`에 저장된다. 특정 일정 객체에 `bestOf: 1`, `bestOf: 3`, `bestOf: 5`를 지정하면 해당 경기만 형식을 덮어쓴다. 형식별 승리 조건과 비토 순서는 `src/core/match-format.js`에서 관리한다.

- Bo1: 6밴, 남은 1맵
- Bo3: 4밴·2픽·디사이더, 2맵 선승
- Bo5: 2밴·4픽·디사이더, 3맵 선승
| 팀 로고 수집 | `npm run assets:team-logos` |
| 선수 사진 수집 | `npm run assets:player-photos` |
| 관전 HUD 전투 아이콘 생성 | `npm run assets:combat` |

## 능력치 모델

게임은 다음 11개 능력치를 사용한다.

- Firepower
- Combat Efficiency
- Entry
- Positioning
- Teamplay
- Tactical
- Clutch
- Explosiveness
- Consistency
- Adaptability
- Pressure

점수는 다른 선수 집단의 상대 순위만으로 정하지 않고 고정된 절대 기준점으로 변환한다. 표본이 적으면 무조건 낮은 점수를 주지 않고 중립값에 수축하며, 신뢰도를 별도로 보존한다. ACS는 원본과 기록 화면에는 유지하지만 능력치 계산에서는 ADR, 킬, 첫 교전, 멀티킬 등과 중복되므로 핵심 입력에서 제외한다.

세부 계산식은 다음 파일에 있다.

- `stat_json/FORMULAS.md`
- `stat_json/config/rating-model.json`
- `runtime_2026/config.json`

## 현재 중요한 제한 사항

- 2026 출전 기록은 계약 명단이 아니므로 일부 선수의 팀 소유권이 중복되어 있다.
- 사용자 경기는 현재 개발용 Ascent Bo1 설정이다.
- 상세 공간 시뮬레이션은 Ascent 지형만 지원한다.
- 일부 능력치와 성향·맵 숙련도 데이터는 아직 시뮬레이션에 직접 연결되지 않았다.
- AI 요원 조합 생성은 팀 단위 중복 방지와 역할 균형 개선이 필요하다.
- 경제 시스템은 실제 VALORANT보다 단순하다.
- 직접 사용하는 `Math.random()` 때문에 동일 경기 재현 기능이 아직 없다.

구체적인 해결 순서와 완료 조건은 `PLAN.md`를 따른다.

## 데이터 원칙

- 원본 값을 가능한 한 보존한다.
- 변경될 수 있는 문자열보다 안정적인 ID 연결을 우선한다.
- 불확실하거나 모순되는 데이터는 추측해서 덮지 않는다.
- 잘못된 행과 매칭 실패는 검역·보고서에 남긴다.
- 계산된 능력치와 객관적 원본 프로필을 분리한다.
- 낮은 표본과 낮은 실력을 같은 의미로 취급하지 않는다.
- 표시용 OVR과 시뮬레이션 내부 능력치를 구분한다.

## 주요 폴더

```text
src/
  core/             시뮬레이션, 시즌, 드래프트, 경제와 능력치 소비 로직
  data/             브라우저 런타임 데이터와 정적 정의
  ui/               React 화면과 경기 진행 연결
  styles/           화면별 CSS
public/
  img/              팀, 선수, 요원, 역할과 맵 이미지
vct_json/            원본 CSV 변환 계층
profile_json/        객관적 프로필 계층
stat_json/           능력치 계산 계층
runtime_2026/        2026 게임 런타임 계층
history_json/        선수 역사 UI 데이터
scripts/             에셋 수집·정규화 스크립트
```

## 개발 방향

다음 핵심 단계는 UI 확장보다 시뮬레이션 기반 정리다.

1. 2026 로스터 중복 해결
2. seed 기반 난수 도입
3. 순수 빠른 경기 엔진 구현
4. 모든 능력치와 숙련도의 사건별 영향 연결
5. 합법적인 요원 조합 생성
6. 경제 시스템 고도화
7. 대량 경기 자동 검증
8. 검증된 결과를 중계 화면과 연결

프로젝트의 상세 계획은 [PLAN.md](./PLAN.md)에서 확인할 수 있다.

## 현재 경기 엔진 상태

경기 엔진은 Bo1, Bo3, Bo5를 지원하며 리그 경기의 기본 형식은 Bo3이다. 맵 비토, 선발 5인, 요원 조합, 선수 능력치, 진영, 경제, 맵 지형과 전술 성향을 이용해 라운드를 계산한다. 라운드에는 페이즈별 이동과 교전, 첫 교전, 트레이드, 크로스파이어, 스파이크 설치·해체와 클러치 기록이 포함된다.

사용자 관전 경기는 맵을 미리 끝까지 계산한 뒤 재생하지 않는다. `MATCH.mapSimulation`에 진행 중인 맵 상태를 메모리로 보관하고, 이전 라운드의 점수·경제·전술 적응 상태를 이어받아 다음 라운드를 하나씩 계산한다. 빠른 경기와 UI 없는 백그라운드 경기는 같은 라운드 엔진을 일괄 실행한다.

현재 이 인메모리 상태는 세이브 데이터가 아니다. 브라우저를 새로고침하거나 앱을 종료하면 진행 중인 경기는 사라진다. 시즌 진행 저장은 추후 버전이 있는 JSON 세이브로 추가하며, 현 단계에서는 SQLite를 사용하지 않는다.

### 경기 엔진 검증

```powershell
npm run verify:rng
npm run verify:incremental
npm run verify:boxscore
npm run verify:match-engine
npm run verify:economy
npm run verify:tactics
npm run verify:phases
npm run validate:simulation
```

`verify:incremental`은 같은 seed로 맵 전체를 즉시 계산한 결과와 한 라운드씩 계산한 결과가 일치하는지 확인한다. UI 렌더링이나 대기 중에 다른 난수가 사용되더라도 다음 라운드 결과가 달라지지 않는 것도 함께 검사한다.

`verify:boxscore`는 공간 교전 이벤트에서 K, D, A, 피해량, 생존과 트레이드를 집계해 ACS, ADR, KAST, KPR, APR, K:D와 FK:FD가 일관되게 계산되는지 검사한다. Rating은 이 지표들을 함께 사용하는 게임 내부 영향력 지표이며 VLR의 비공개 공식을 그대로 복제한 값은 아니다.

### 시즌 경기 기록

정규시즌 일정의 각 경기에는 `regular-w{주차}-m{순번}` 형식의 안정적인 ID가 있다. 사용자 경기와 백그라운드 경기는 모두 같은 결과 반영 함수를 통해 승패, 맵 득실, 라운드 득실과 선수 박스스코어를 `ST.matchArchive`에 기록한다. 순위는 승수, 맵 득실, 라운드 득실, 상대전적, 팀명 순으로 결정한다.

시즌 아카이브에는 장기 통계에 필요한 경기·맵 요약과 선수 박스스코어를 남긴다. 중계 재생용 좌표 트랙은 모든 백그라운드 경기에 중복 저장하지 않는다.

```powershell
npm run verify:season
npm run verify:tournament
```

게임의 2026 리그 Stage는 실제 VCT의 12팀과 상위 8팀 플레이오프 구조를 참고한다. 사용자 요청에 따라 Alpha/Omega 두 그룹은 사용하지 않고 12팀 전체 단일 라운드 로빈으로 구성한다. 정규시즌 상위 8팀은 더블 엘리미네이션에 진출하며 일반 경기는 Bo3, 패자조 결승과 결승은 Bo5다. 대회 화면에서 우리 팀 일정, 전체 일정과 승자조·패자조 대진표를 확인할 수 있다.

대회 구조는 `src/core/tournament.js`, 진행 상태는 `ST.competition`, 완료 경기 요약은 `ST.matchArchive`에서 관리한다.

### 경기 진행 제어와 타임아웃

관전 경기에서는 다음 라운드 전에 정지하거나, 한 라운드만 진행하거나, 자동 진행을 재개할 수 있다. 타임아웃은 경기 중 전술 성향을 다시 정하는 감독 개입 기능이다.

- 정규 구간에서는 팀마다 공격·수비 합산 총 2회
- 진영 변경 시 남은 횟수 유지
- 연장에서는 2라운드로 구성된 연장 구간마다 팀별 1회
- 연장 구간의 남은 횟수는 다음 구간으로 이월하지 않음
- 변경한 전술은 다음 라운드부터 적용
- 상대 AI도 같은 횟수 규칙 안에서 연패와 점수 차를 보고 타임아웃을 판단
- 사용 시점과 변경 전·후 전술 정책을 맵 결과 로그에 저장

타임아웃 규칙은 다음 명령으로 별도 검증한다.

```powershell
npm run verify:timeouts
```

세부 구현 순서와 완료 조건은 [PLAN.md](./PLAN.md)의 `경기 중 감독 개입` 항목에서 관리한다.
