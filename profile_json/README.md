# VCT profile feature store

`profile_json` contains objective, rating-model-independent profiles derived from `vct_json`.
It intentionally does **not** calculate game attributes such as aim, awareness, utility, mental, potential, or overall rating.

## Build

```powershell
node .\profile_json\scripts\build-profiles.mjs
```

Verify all profiles and JSONL observations with:

```powershell
node .\profile_json\scripts\verify-profiles.mjs
```

## Outputs

- `data/players/<year>.json`: player overall facts, map/agent/side splits, situational totals, competition splits, and ordered map observations.
- `data/teams/<year>.json`: results, sides, economy, win methods, drafts, compositions, and map history.
- `data/rosters/<year>.json`: observed player/team participation with rounds, maps, matches, and agents.
- `data/meta/<year>.json`: season baselines and distributions used for normalization.
- `data/maps/<year>.json`: map environment, side balance, economy, methods, scoring, and agent usage.
- `data/agents/<year>.json`: observed agent performance, usage, maps, players, and teams.
- `data/simulation/<year>.json`: neutral round/economy/result baselines for the simulation engine.
- `data/observations/player-maps/<year>.jsonl`: ordered per-map facts for form, consistency, peaks, pressure, and trend models.
- `data/observations/player-competition/<year>.jsonl`: source competition/agent splits kept separate because their scopes overlap.

## Rating-model independence

Numeric performance metrics retain sample size and weighted statistical moments (`count`, `weight`, `mean`, `variance`, `min`, `max`). This supports future attributes such as mechanics, entry, survival, trading, support, consistency, volatility, pressure performance, adaptability, specialization, discipline, economy impact, clutch, and form without changing this profile schema.

`mapHistory` preserves ordered map observations because the source has no reliable match date column. Its `sequence` reflects source order and must not be presented as a verified calendar date.

## Aggregation rules

- Player overall/map/agent facts use individual played maps with `Side=both` only.
- Attack and defense splits use their respective side rows and never get added to `Side=both` totals.
- `All Maps` rows are excluded from played-map aggregation.
- Competition splits from `players_stats` remain separate observations because tournament/stage/match-type scopes overlap.
- Synthetic player/team IDs are valid scoped identities and remain separate until an explicit canonical override exists.
- Placeholder teams are not suitable for standings or strength calculations.
- Draft map references are not counted as played games.
- Overtime rounds are kept separate from regulation attack/defense rounds. Source score rows that cannot classify a round by side are preserved under `unclassified` instead of being guessed.
