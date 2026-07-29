# Player stat formulas

Model version: `vct-player-ratings-1.0.0`

The authoritative editable weights and thresholds are in `config/rating-model.json`. The executable implementation is `scripts/build-player-stats.mjs`.

## Reference population

1. Determine a player's primary role from the role receiving the most observed agent rounds.
2. For every raw feature, build a distribution for the same year and primary role.
3. If that role has fewer than `minimumReferencePlayers`, use the full-year distribution.
4. Convert the raw value to its empirical percentile. Ties use the midpoint of the tied percentile interval.

This prevents Duelists and Controllers from sharing inappropriate ACS, entry, assist, and survival baselines.

## Reliability and score

Overall sample reliability:

```text
reliability = rounds / (rounds + overallHalfLifeRounds)
```

Adjusted percentile:

```text
adjustedPercentile = 0.5 + reliability × modelConfidence × (percentile - 0.5)
```

Displayed score:

```text
score = round(minimum + (maximum - minimum) × adjustedPercentile)
```

With the current 20–99 scale, the neutral value is 60. A missing observation receives value 60, reliability 0, and `imputation: neutral_no_observation`.

## Raw features

```text
KPR  = kills / rounds
DPR  = deaths / rounds
APR  = assists / rounds
FKPR = first kills / rounds
FDPR = first deaths / rounds
FK differential per round = (first kills - first deaths) / rounds
objective actions per round = (plants + defuses) / rounds
```

Consistency uses coefficients of variation:

```text
rating CV = sqrt(rating variance) / abs(mean rating)
ACS CV    = sqrt(ACS variance) / abs(mean ACS)
```

Lower CV ranks higher.

Clutch impact uses observed successful clutches:

```text
clutch impact = 1v1 + 1.7×1v2 + 2.6×1v3 + 3.8×1v4 + 5.0×1v5
clutch impact per round = clutch impact / rounds
```

The source does not provide reliable attempt counts for every clutch split, so this is impact frequency, not a pure success probability.

Multikill impact:

```text
multikill impact = 0.5×2K + 1.5×3K + 3.0×4K + 5.0×5K
multikill impact per round = multikill impact / rounds
```

Agent, role, and map effective counts use Shannon diversity:

```text
entropy = -sum(p_i × ln(p_i))
effective count = exp(entropy)
```

This distinguishes meaningful usage across several options from a long list containing only token appearances.

Pressure observations are played-map records whose stage or match-type label contains a configured pressure keyword. Pressure delta is pressure-map Rating minus the player's season Rating. Missing pressure samples remain neutral with zero reliability.

## Attribute composites

Each expression combines empirical percentiles, not raw values. Exact editable weights live in `rating-model.json`.

```text
firepower = .30 ADR + .25 ACS + .30 KPR + .15 Rating

combatEfficiency = .30 K/D + .15 KPR + .25 inverse DPR
                 + .20 KAST + .10 headshot rate

entry = .45 FKPR + .25 inverse FDPR + .30 FK differential per round

positioning = .40 inverse DPR + .35 KAST + .15 K/D + .10 inverse FDPR

teamplay = .55 APR + .45 KAST

tactical = .30 APR + .25 KAST + .15 objective actions per round
         + .15 side balance + .15 effective agent count

clutch = clutch impact per round

explosiveness = .70 multikill impact per round + .30 ACS peak/mean ratio

consistency = .60 inverse Rating CV + .40 inverse ACS CV

adaptability = .30 effective agent count + .25 effective role count
             + .25 effective map count + .20 agent performance stability

pressure = .55 pressure Rating + .45 pressure delta
```

`teamplay`, `tactical`, and `pressure` intentionally have lower model-confidence multipliers because their source indicators are indirect.

## Tendencies

Tendencies describe behavior and must not be treated as skill bonuses.

```text
entry activity = (first kills + first deaths) / rounds
entry success  = first kills / (first kills + first deaths)
risk index     = first deaths / rounds
aggression     = .65 entry-activity percentile + .35 risk-index percentile
objective duty = (plants + defuses) / rounds
specialization = largest agent-round share
role flexibility = effective role count
```

## Mastery

Agent and map mastery compare Rating, ACS, ADR, KPR, and KAST within the same agent or map. Their mean percentile is shrunk using:

```text
mastery reliability = context rounds / (context rounds + masteryHalfLifeRounds)
```

Role proficiency is the context-round-weighted mean of the player's agent masteries in that role. Mastery is contextual performance, not a replacement for the player's base attributes.

## Explicit exclusions

The model does not infer potential, leadership, communication, professionalism, psychology, morale, fatigue, confidence, or coachability. These require game-system state or separate authored data.

`summary.unweightedAttributeMean` is diagnostic and is not an OVR. The simulation should select attributes based on the event being resolved.
