# VLM 분리 계획 (valorant-league-manager.html → Vite + React)

> 다음 세션에서 이 파일을 읽고 다음 미완료 Phase부터 순서대로 실행.
> **각 Phase 끝마다 `npm run dev`로 앱이 그대로 동작하는지 확인 후 커밋. 안 돌면 다음으로 넘어가지 말 것.**

**진행 상황 (2026-07-28 기준): Phase 0~3a 완료.** 다음은 Phase 4(React 이관).
- Phase 0: Vite 스캐폴딩 (커밋 `0fe16ca`)
- Phase 1: 인라인 데이터 4종 추출 — AGENT_IMG/STATS_BY_NAME/ASCENT_BG/NAVGRID (커밋 `ce6d7b0`)
- (부수) 에이전트 아이콘을 `images/Characters/_small` 원본에서 64px로 리사이즈해 교체 (커밋 `42acc37`)
- Phase 2: CSS 9분할 (커밋 `279bc81`)
- Phase 3a: `main.js`(163개 top-level 선언)를 `data/`(4) + `core/`(7) + `core/state.js` + `ui/mapview.js` + `legacy.js`로 분리 (커밋 `9543db8`). `tools/split-main.mjs`가 DOM 접근 여부를 grep으로 실측해 분류함 — 섹션 주석만 믿지 않음. 맵 비토 함수들은 겉보기엔 독립적이지만 서로 순환 호출하다 `renderVeto()`의 DOM 조작으로 귀결돼 전부 `legacy.js`로 감(`mapSuitFor`만 순수). `MATCH` 재할당은 `openMatch()` 단 한 곳뿐이라 `setMatch()`로 우회. `core/round-engine.js`↔`core/season.js` 순환 import 있음 — 오가는 심볼이 전부 `function` 선언(호이스팅)이라 안전 확인 완료.

**확정 사항: React로 이관한다.** 따라서 `ui/` 렌더 코드를 바닐라 모듈로 정리하는 단계는 건너뛴다
(어차피 버릴 코드를 정리하는 낭비 ~670줄). 엔진만 뽑아내고 바로 React로 간다.

---

## 0. 현황 실측

| 항목 | 값 |
|---|---|
| `valorant-league-manager.html` | 2564줄 / 645KB |
| `<style>` | L10–569 (약 560줄) |
| `<body>` 마크업 | L571–767 (약 197줄, 8개 `.screen` 섹션) |
| `<script>` | L768–2562 (약 1795줄) |
| `images/` | **515MB** (Characters 87, Maps 70, Weapons 68, Abilities 118 + `PublicContentCatalog.json` 14MB) |
| `stats/` | **1.3GB** (vct_2021~2026 × {agents, ids, matches, players_stats} CSV) |
| 인라인 이벤트 핸들러 | body 4개 + JS 템플릿 문자열 19개 = **23개** |
| `stats/` · `images/` 참조 | **0건** — 현재 코드는 두 폴더를 전혀 안 씀 |

### 645KB 중 실제 코드는 ~200KB뿐

나머지 ~445KB는 소스에 박힌 데이터 덩어리:

| 위치 | 심볼 | 크기 |
|---|---|---|
| L949 | `AGENT_IMG` (에이전트 아이콘 base64) | **235KB** |
| L952 | `STATS_BY_NAME` (선수 실능력치 JSON) | **184KB** |
| L1683 | `ASCENT_BG` (맵 배경 base64) | **40KB** |
| L1684 | `NAVGRID.cells` (160×119 워크 마스크 문자열) | **19KB** |

→ **이 4개만 빼내도 소스가 200KB로 줄어 편집 가능한 크기가 됨.** Phase 1에서 최우선 처리.

### JS 1795줄의 성격별 분류

| 덩어리 | 분량 | React 이관 시 운명 |
|---|---|---|
| `data/` + `core/` — 엔진·순수 로직 | ~800줄 | **그대로 재사용.** 손대지 않음 |
| `mapview` — RAF 루프·SVG 애니메이션 | ~314줄 | **명령형 유지.** ref + useEffect로 감싸기만 함 |
| `screen-*` — innerHTML 렌더 7화면 | ~670줄 | **React로 재작성.** 이것만 버려짐 |

---

## 1. 이전 대화에서 바로잡은 것

### "브라우저에서 CSV 파싱" — 이 규모에선 불가
`stats/`는 1.3GB. `vct_2025/matches/kills.csv` 하나가 13MB다. 브라우저에 fetch로 던지면 탭이 죽는다.
→ **Node 빌드 스크립트로 미리 집계해 작은 JSON으로 굽는다.** 브라우저는 결과만 읽는다.
→ 원본 `stats/`·`images/` (합 1.8GB)는 **git에 올리지 않는다.**

### React 이관은 Phase 3a 직후 — 단, 엔진 추출은 반드시 먼저
엔진(`core/`)이 DOM에서 분리돼 있어야 React 컴포넌트가 그걸 그냥 호출할 수 있다.
엔진 추출 없이 React부터 시작하면 로직과 렌더를 동시에 재작성하게 되어 버그 추적이 불가능해진다.

---

## 2. 목표 디렉터리 구조

```
vlm/
  index.html                    # <head> + body 마크업(8 screen) + <script type="module" src="/src/main.jsx">
  package.json
  vite.config.js
  .gitignore                    # images/ stats/ node_modules dist   ← 1.8GB 원본 커밋 금지

  src/
    main.jsx                    # boot + React 루트 마운트
    legacy.js                   # ⚠️ 임시. 미이관 렌더 코드 전부. React로 옮기며 줄어들다 최종 삭제
    styles/                     # Phase 2 결과 (plain CSS, React에서 그대로 import)
      base.css                  # :root 변수, reset, header, .wrap, .btn   (L10–55)
      select.css                # 리그 탭 + 팀 그리드 + 프리뷰              (L56–78)
      hub.css                   # 허브 + 스케줄                             (L79–125)
      squad.css                 # 스쿼드 + 선수 카드                        (L126–167)
      match.css                 # 매치 화면 + 라운드 트래커 + 타임라인      (L168–241)
      mapview.css               # 탑다운 맵 + 방송 HUD                      (L242–440)
      box.css                   # 박스스코어                                (L441–467)
      draft.css                 # 드래프트 패널/화면 + 컴프 에디터          (L468–528, 549–568)
      veto.css                  # 맵 비토                                   (L529–548)
    data/                       # 순수 상수. 의존성 없음
      leagues.js                # ROLE, MAPS, p(), 역할 헬퍼, PROFBANDS, LEAGUES  (L774–858)
      agents.js                 # AGENTS, AGENT_KITS, KIT_DEFAULT, ARCH, BEATS, MAPDATA, AGENT_ROLE (L869–942, 964)
      weapons.js                # WEAP, WCOST, SCOST, ABFX, TYPESYM, TYPEKO, SKILL_R (L1948–2018)
      player-stats.json         # ← L952 STATS_BY_NAME 추출 (184KB)
      geo/
        ascent.js               # MV, GEO_ASCENT, MAPGEO            (L1681, 1685–1713)
        ascent-navgrid.json     # ← L1684 NAVGRID.cells 추출 (19KB)
    core/                       # 엔진. DOM 접근 0. React가 그대로 호출
      state.js                  # ST, MATCH + subscribe/bump  ← §4 참고
      ratings.js                # playerOVR, teamOVR, teamAxis, kitOf, compKitScore, counterEdge, seededPool (L860–864, 907–947)
      roster.js                 # applyRealStats, buildAgentPools, visiblePool  (L796–804, 953–973)
      draft.js                  # roleCounts, stanceSuit, mapFit, pickAgents, draftComp, buildComp*, draftPair, matchupRead (L974–1039)
      season.js                 # makeSchedule, sortedStandings, firstUnplayedWeek, simRestOfWeek, quickSim, endMatch
      veto.js                   # mapSuitFor, startVeto, stepVeto, aiVetoAct, playerVeto, applyVeto, finalizeVeto (L1325–1378)
      economy.js                # BUYMOD, SIDEMOD, decideBuy, buyFromCredits, initEcon, loadoutFor, buyLabel (L1558–1573, 1954–1980)
      round-engine.js           # rand5, agentMap, pickByKit, applyKills, applyRoundStats, freshBox, finalizeRatings, simOneMap (L1574–1679)
      spatial.js                # sdist, SP_TUNE, SP_SETUPS, nav*, navPath, navLOS, spatialRound (L1714–1903)
    ui/
      mapview.js                # ⭐ 명령형 영구 보존. geoSVG, mv* 전부 (L1904–1947, 2016–2287)
      useStore.js               # Phase 4. useSyncExternalStore 훅
      MapView.jsx               # Phase 4. mapview.js를 감싸는 얇은 래퍼
      screens/                  # Phase 4. Squad → Hub → Select → Box → Veto → Draft → Match 순
  public/
    img/
      agents/<slug>.png         # AGENT_IMG 대체 (~25장, images/Characters에서 추출)
      maps/ascent.png           # ASCENT_BG 대체
  tools/
    extract-inline.mjs          # (Phase 1 1회용) HTML에서 base64/JSON 덩어리 추출
    build-assets.mjs            # images/ → public/img/ 필요분만 복사 (PublicContentCatalog.json으로 이름→UUID 매핑)
    build-stats.mjs             # (Phase 5) stats/**/*.csv → src/data/derived/*.json 집계
```

> 줄 번호는 원본 HTML 기준 **앵커**다. 정확한 경계는 이관 시 직접 확인할 것.

---

## 3. 실행 순서

### Phase 0 — 스캐폴딩 (동작 변화 0)
1. `git init` + `.gitignore` — **`images/`, `stats/` 반드시 제외** (1.8GB)
2. `npm create vite@latest . -- --template vanilla` 후 불필요 파일 정리
   *(React 플러그인은 Phase 4에서 추가. 지금 넣으면 검증만 복잡해짐)*
3. 원본을 `valorant-league-manager.html.bak`으로 보존
4. `index.html` = 원본 `<head>`(단 `<style>` 제외) + `<body>` 마크업 + `<script type="module" src="/src/main.js">`
5. `src/main.js` = 원본 `<script>` 내용 **통째로** 붙여넣기 (아직 안 쪼갬)
6. `src/styles/all.css` = 원본 `<style>` 통째로, `main.js`에서 `import './styles/all.css'`
7. body 인라인 `onclick` 4개(`go`, `startNextMatch`)용으로 `main.js` 끝에 임시 `Object.assign(window, {...})`
8. ✅ **검증: 팀 선택 → 매치 1경기 완주**

### Phase 1 — 뚱뚱한 데이터 추출 (효과 최대 · 위험 최소)
`tools/extract-inline.mjs`로 자동화 권장. 이 Phase 후 645KB → ~200KB.

9. **`STATS_BY_NAME`** (L952) → `src/data/player-stats.json` **−184KB**
10. **`ASCENT_BG`** (L1683) → base64 디코드 → `public/img/maps/ascent.png`, 상수는 `'/img/maps/ascent.png'` **−40KB**
11. **`NAVGRID.cells`** (L1684) → `src/data/geo/ascent-navgrid.json` **−19KB**
12. **`AGENT_IMG`** (L949) → 각 base64를 `public/img/agents/<slug>.png`로 디코드 저장. `agImg()`를 경로 생성기로 교체:
    ```js
    const slug = a => a.toLowerCase().replace(/\//g,'').replace(/[^a-z0-9]/g,'');
    function agImg(a){ return a ? `/img/agents/${slug(a)}.png` : ''; }
    ```
    ⚠️ 슬러그는 **기존 `AGENT_IMG` 키를 정답으로 삼을 것** (`kay/o` → `kayo` 등) **−235KB**
13. ✅ **검증: 에이전트 아이콘 · 맵 배경 · 선수 능력치가 Phase 0과 픽셀 동일**

### Phase 2 — CSS 분리
14. `all.css`를 §2 구조표의 줄 범위대로 9개 파일로 절단
15. `src/styles/index.css`에서 `@import`로 묶고 `main.js`는 이것만 import
16. ⚠️ **CSS Modules 쓰지 말 것.** 전 클래스명을 바꿔야 해서 React 이관과 충돌한다. plain CSS 유지 — React에서 `className`으로 그대로 쓴다.
17. ✅ **검증: 8개 화면 육안 비교**

### Phase 3a — 엔진만 추출 (`ui/`는 건드리지 않음)
의존성 없는 리프부터. 매 파일 이동 후 dev 서버 확인.

18. `data/*` — 순수 상수. 가장 먼저.
19. `core/ratings.js`, `core/economy.js`, `core/spatial.js` — 순수 함수, 부작용 없음
20. **`core/state.js`** ← *가장 조심할 곳.* §4 설계대로 `subscribe`/`bump` 포함해 작성
21. `core/roster.js`, `core/draft.js`, `core/veto.js`, `core/round-engine.js`, `core/season.js`
22. **`ui/mapview.js`** — 명령형 그대로 추출. 여긴 React 가도 안 버리므로 지금 제대로 뽑아둘 것
23. 남은 렌더 코드(~670줄) 전부 → **`src/legacy.js` 한 덩어리로.** 정리하지 말 것. 곧 지운다.
24. `src/main.js` = import + boot 3줄:
    ```js
    applyRealStats(); buildAgentPools(); buildSelect();
    ```
25. ✅ **검증: 전 화면 + 매치 완주 + 박스스코어 + 시즌 종료까지**

### Phase 4 — React 이관 (화면 단위, 앱은 계속 동작)

**한 세션에 한 단계씩만 진행. 끝나면 커밋하고 아래 체크박스에 표시한 뒤 멈춘다.**
다음 세션(또는 다음 지시)에서 첫 번째 미체크 항목부터 이어간다.

- [x] **1. 셋업** — `npm i react react-dom` + `@vitejs/plugin-react`, `main.js` → `main.jsx`, `src/ui/useStore.js` 작성 (§4의 `useSyncExternalStore` 훅)
- [ ] **2. Squad 화면** — ~58줄. 가장 단순, `ST` 읽기만 함. 패턴 확립용
- [ ] **3. Hub 화면** — ~63줄. 순위표 + 일정 테이블
- [ ] **4. Select 화면** — ~75줄. 팀 선택
- [ ] **5. Box 화면** — ~63줄. 박스스코어 + 타임라인
- [ ] **6. Veto 화면** — ~38줄. 맵 비토
- [ ] **7. Draft 화면** — ~136줄. **React 이득이 가장 큰 화면** (폼·상태 복잡)
- [ ] **8. Match 화면** — ~240줄. 오케스트레이션, 가장 까다로움
- [ ] **9. MapView.jsx** — `mapview.js`를 `useRef`+`useEffect`로 감싸는 래퍼만. **내부 명령형 코드는 손대지 않음**
- [ ] **10. 최종 통합** — 루트를 하나로 합치고 `go()`를 `screen` state로 대체, `legacy.js` 삭제, 임시 `window` 노출 제거, 인라인 `onclick` 23개 제거, 전 기능 회귀 테스트

각 화면 단계마다: React 컴포넌트 작성 → 해당 `.screen` 섹션에 독립 React 루트 마운트 → `legacy.js`에서 그 화면 코드 삭제 → 헤드리스 Chrome으로 검증 → 커밋.

**마운트 전략**: 앱이 화면 단위(`.screen` 섹션, 한 번에 하나만 표시)라 섹션마다 독립 React 루트를 붙일 수 있다. 미이관 화면은 계속 `legacy.js`가 그린다. `go()`는 이관 도중엔 그대로 `.on` 클래스를 토글한다 (10번 단계에서만 교체).

### Phase 5 — 실제 스탯 파이프라인 (1.3GB)
지금 코드가 `stats/`를 전혀 안 쓰므로 **이건 이관이 아니라 신규 기능이다.**
React 완료 후에 하는 게 맞다 — 바닐라로 만들었다가 다시 포팅하는 낭비를 피한다.

32. `tools/build-stats.mjs` — Node에서 CSV **스트리밍** 파싱(`csv-parse`), 필요한 집계만 추출
33. 출력은 `src/data/derived/`에 **작은 JSON** (목표: 파일당 100KB 이하)
    - 예: 팀별 맵 승률, 에이전트 픽률, 선수 시즌 요약
34. `package.json`에 `"prebuild": "node tools/build-stats.mjs"` 등록
35. 하드코딩된 `LEAGUES` / `player-stats.json`을 실데이터 기반으로 점진 교체

---

## 4. 상태 브리지 설계 (Phase 3a에서 미리 넣을 것)

React 화면과 바닐라 `legacy.js`가 **같은 `ST`를 공유하며 공존**하는 기간이 있다.
그래서 `state.js`는 Phase 3a 때부터 구독 메커니즘을 갖고 있어야 한다.

```js
// src/core/state.js
export const ST = { league:null, myTeamIdx:null, teams:[], schedule:[],
                    week:0, standings:{}, seasonOver:false };
export let MATCH = null;

let version = 0;
const subs = new Set();

export function subscribe(fn){ subs.add(fn); return () => subs.delete(fn); }
export function getVersion(){ return version; }
export function bump(){ version++; subs.forEach(f => f()); }   // 상태 변경 후 호출
export function setMatch(m){ MATCH = m; bump(); }
```

```js
// src/ui/useStore.js  (Phase 4)
import { useSyncExternalStore } from 'react';
import { subscribe, getVersion } from '../core/state.js';
export function useStore(){ return useSyncExternalStore(subscribe, getVersion); }
```

`ST`는 **제자리 변형(in-place mutation)** 되므로 참조 비교가 안 통한다. 그래서 `version` 카운터가 필요하다.

⚠️ **`legacy.js`의 액션 핸들러는 `ST`를 직접 변형하면서 `bump()`를 부르지 않는다.**
React 화면이 의존하는 값을 바꾸는 지점(23개 onclick 핸들러 끝)에 `bump()`를 넣어라. 거칠지만 충분하다.

---

## 5. 사전에 알아둘 함정

- **`ST` 재할당 금지** — ES 모듈에서 import된 바인딩은 재할당 불가. 기존 코드에 `ST = {...}` 가 있으면 `Object.assign(ST, {...})`로 바꿀 것. `MATCH`는 `setMatch()` 경유.
- **`kay/o` 슬러그** — 에이전트 이름에 `/`가 있어 파일명 슬러그화 필요. 기존 `AGENT_IMG` 키가 정답.
- **`DEV_ASCENT_BO1`** (L1296) — 맵 비토를 건너뛰고 Ascent Bo1만 도는 개발용 플래그. 이관 중엔 `true`로 두면 매치 검증이 빠르다. **완료 후 원래 값 복구 확인.**
- **`_navCache`** (L1731) — 모듈 스코프 캐시. 분리 후에도 단일 인스턴스여야 함.
- **`mapview.js`를 React로 재작성하지 말 것** — `requestAnimationFrame` 루프 + SVG 직접 조작이다. React 앱에서도 이런 애니메이션은 명령형으로 두고 `useEffect` 안에서 돌리는 게 정석이다. `MapView.jsx`는 마운트/언마운트와 props 전달만 담당하는 얇은 래퍼여야 한다.
- **`images/PublicContentCatalog.json` 14MB** — 빌드 스크립트(Node)에서만 읽는다. **절대 `src/`에서 import 금지.**
- **`legacy.js`를 정리하고 싶은 충동을 참을 것** — Phase 4에서 통째로 지워진다.
