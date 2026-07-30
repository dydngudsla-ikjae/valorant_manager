# 2026 game runtime data

This layer uses `profile_json/data/rosters/2026.json` as the authoritative player list. Team presentation metadata remains in `src/data/leagues.js`. Because the source records appearances rather than contract status, the five players with the most observed rounds are marked active and every other observed player is retained on the bench.

`league-memberships-2026.json` is the ID-based source of truth for the 48 Stage 1 league slots: 12 teams each in Americas, EMEA, Pacific, and China. ULF Esports is retained in `slotHistory` as Eternal Fire's Kickoff predecessor rather than counted as a second EMEA slot.

- Base attributes blend 2021–2026 absolute-score evidence. Low 2026 samples therefore cannot erase established ability.
- `season2026Attributes` remains separate from the base. A reliability-scaled, capped 2026 form adjustment produces `appliedAttributes`.
- Current agent pools treat 2023–2026 experience nearly equally (`1.00, 0.95, 0.85, 0.70`); only 2022-and-older-only agent history is removed from the playable pool.
- Position proficiency is FM-style `1–20` and is shared across every player: `3 + 12 * accumulated role experience + 3 * qualified-agent breadth + 2 * recent role activity`. Experience uses 2023–2026 only, while current deployment share is calculated separately and selects the primary role. Performance remains in the independent attributes.
- Split synthetic player IDs are merged only when exactly one canonical candidate has matching team continuity. Ambiguous identities are still reported instead of guessed, so historical role and agent experience is not silently lost.
- Raw 11-axis attributes, evidence reliability, tendencies, role/map/agent mastery, and canonical IDs are preserved. The old five game axes are derived compatibility fields, not new source facts.
- Unmatched or ambiguous project roster entries are never guessed. They are written to `data/match-report.json` and keep their project defaults until resolved.

Build after changing rosters, source stats, or the blending rules:

```powershell
node .\runtime_2026\scripts\build-game-rosters-2026.mjs
node .\runtime_2026\scripts\build-runtime-2026.mjs
```

Validate IDs, match counts, rating ranges, reliability, form caps, and agent readiness with:

```powershell
node .\runtime_2026\scripts\verify-runtime-2026.mjs
```

## Roster audit and manual overrides

등록 선수단에는 고정 주전·벤치·기본 라인업을 두지 않습니다. 실제 경기에서는 감독이 `registered` 중 5명을 선택합니다. 감독 선택 화면이 구현되기 전까지는 역할 커버리지와 OVR을 기준으로 경기마다 자동 선발합니다.

```powershell
npm run audit:rosters
```

- `ROSTERS_2026.md`: 등록 선수단과 초기 5인, 중복 소속 경고.
- `roster-audit-2026.json`: machine-readable audit result.
- `roster-overrides-2026.json`: 48팀의 현재 등록 선수 ID를 담은 수동 교정 파일.

`rosterPlayerIds`에는 등록 선수 전원을 기록합니다. 같은 항목의 `rosterPlayers`는 ID와 선수명을 눈으로 확인하기 위한 참고 목록이며 빌드에는 사용하지 않습니다. 눈으로 확인한 팀은 `verificationMode`를 `manual_verified`로 바꾸고 `verifiedAt`, `sources`를 채웁니다.

수정 후 다음 순서로 재생성하고 검증합니다:

```powershell
npm run data:rosters
npm run data:runtime
npm run audit:rosters
npm run verify:runtime
```
