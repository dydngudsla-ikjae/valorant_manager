# Data-derived VCT player stats

`stat_json` converts the objective `profile_json` feature store into simulation attributes. It does not add potential, leadership, communication, professionalism, morale, fatigue, or other facts that the source cannot observe.

## Build

```powershell
node .\stat_json\scripts\build-player-stats.mjs
```

Validate ranges, evidence, reliability, yearly distributions, mastery values, and latest-season selection with:

```powershell
node .\stat_json\scripts\verify-player-stats.mjs
```

## Model

- Every raw metric uses fixed absolute anchors from `config/rating-model.json`. The same ADR, ACS, KPR, or other observation receives the same pre-confidence score regardless of season, role, or the players present in the dataset.
- Each feature is mapped piecewise from `[low, neutral, high]` to `[0, 0.5, 1]`, then combined by the configured attribute weights.
- Scores use a 20–99 scale. The midpoint is approximately 60 because the configured endpoints are 20 and 99.
- Reliability is `sample / (sample + halfLife)` and shrinks low-sample percentiles toward the neutral midpoint.
- Missing attribute evidence receives the neutral score with reliability `0` and `imputation: neutral_no_observation`; it is never presented as measured performance.
- Synthetic identities receive a small reliability discount but are not discarded.
- Each attribute stores its raw inputs, absolute levels, weights, composite level, sample size, and reliability.

## Attributes

`firepower`, `combatEfficiency`, `entry`, `positioning`, `teamplay`, `tactical`, `clutch`, `explosiveness`, `consistency`, `adaptability`, and `pressure`.

`teamplay`, `tactical`, and `pressure` have lower model-confidence multipliers because the source only provides indirect proxies. They must not be interpreted as verified communication, utility mechanics, or psychology.

ACS is preserved in the source profiles and match outputs but is deliberately excluded from player-ability, agent-mastery, and map-mastery calculations because it overlaps with damage, kills, opening kills, and multikills already modeled separately. VLR rating remains a supporting signal: its contextual fight value is useful, but it is not treated as a standalone intrinsic ability.

## Other outputs

- Tendencies describe behavior rather than skill: aggression, entry frequency/success, risk, objective duty, specialization, and role flexibility.
- Agent, role, and map mastery are sample-shrunk, context-specific ratings.
- `summary.unweightedAttributeMean` is diagnostic only and is explicitly not an OVR.
- `data/latest.json` chooses each canonical/scoped identity's most recent season; it does not blend seasons.
