# VALORANT League Manager

VCT 데이터를 기반으로 선수와 팀을 운영하고 경기를 시뮬레이션하는 VALORANT 매니지먼트 게임 프로젝트다. Football Manager처럼 팀 선택, 선수 능력치와 역할·요원 숙련도 확인, 맵 비토, 조합 선택, 경기 진행, 시즌 순위와 통계 확인을 하나의 흐름으로 만드는 것이 목표다.

현재 게임은 2026 VCT 국제 리그 48팀을 기준으로 한다. 선수 데이터는 여러 시즌의 객관적 경기 기록을 사용하며, 2026 표본이 적은 선수는 과거의 검증된 기록과 신뢰도를 함께 사용한다.

## 주요 기능

- Americas, EMEA, Pacific, China 4개 국제 리그와 48팀
- 2026 로스터, 벤치와 ID 기반 선수·팀 연결
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

## 자주 실행하는 명령

| 목적 | 명령 |
|---|---|
| 개발 서버 | `npm run dev` |
| 프로덕션 빌드 | `npm run build` |
| 빌드 미리보기 | `npm run preview` |
| 2026 로스터 재생성 | `npm run data:rosters` |
| 2026 능력치 런타임 재생성 | `npm run data:runtime` |
| 선수 역사 재생성 | `npm run data:history` |
| 런타임 검증 | `npm run verify:runtime` |
| 팀 로고 수집 | `npm run assets:team-logos` |
| 선수 사진 수집 | `npm run assets:player-photos` |

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
