# VCT JSON data

This directory is generated from `stats/**/*.csv` by `scripts/build-vct-json.mjs`.
The conversion preserves every valid CSV row as one JSONL record and adds ID references without replacing the original labels.

## Rebuild

```powershell
node .\vct_json\scripts\build-vct-json.mjs
```

Generated files under `data/`, `quarantine/`, `manifest.json`, and `validation-report.json` may be regenerated. The script, schemas, and this document are the maintained source.

Run the independent full JSONL parse and row-count verification with:

```powershell
node .\vct_json\scripts\verify-vct-json.mjs
```

The result is stored in `verification-result.json`.

## Layout

- `data/entities/players.json`: canonical player IDs and known labels.
- `data/entities/teams.json`: canonical team IDs and abbreviation mappings.
- `data/entities/competition.json`: tournament, stage, match type, match, and game IDs.
- `data/entities/taxonomy.json`: stable map and agent slug IDs with source labels.
- `data/<year>/<dataset>.jsonl`: one normalized object per original CSV row.
- `data/global/*.jsonl`: cross-year ID and mapping sources.
- `quarantine/records.jsonl`: records with invalid values, unresolved references, or ambiguous references. One source row is written once with all of its issues.
- `quarantine/column_count_mismatch.jsonl`: malformed CSV row shapes that cannot safely be mapped to headers.
  Records with reference issues remain in the main dataset as well; quarantine is an audit trail, not a trash bin.
- `validation-report.json`: source/output row counts, entity counts, output sizes, and exception totals.

## Record contract

Each JSONL record contains:

- `_source.file` and `_source.line`: exact source location.
- `year`: integer year, or `null` for global index data.
- `refs`: resolved stable IDs. Unresolved values are `null`.
- `values`: all original CSV columns converted to camelCase keys.

Empty CSV cells become `null`, never zero. Percent strings become decimal fractions (`74%` becomes `0.74`). Numeric strings become JSON numbers when the column has numeric semantics. Labels are retained in `values` even when an ID is resolved.

## Reference resolution

- Canonical IDs are preferred whenever the source ID tables identify exactly one entity.
- `All Maps`, `All Stages`, and `All Match Types` receive stable `aggregate:*` IDs.
- Known tournament spelling variants are resolved as aliases and recorded under `refs._resolution`.
- Missing or ambiguous players and teams receive deterministic `synthetic:*` IDs scoped by year, team, and/or tournament. Their source candidate IDs and `resolutionStatus` remain in the entity dictionaries and quarantine audit log.
- `TBD` receives a `placeholder:*` ID and must not be treated as a real team.

Consumers may safely group records by the assigned ID. Synthetic identities must remain distinct from canonical people/teams until an explicit override proves the relationship.

## Important limitations

The source files do not always carry IDs in statistical rows. References are resolved through exact normalized labels plus year/tournament/stage/match/map context. Ambiguous and unresolved cases are never guessed; inspect `quarantine/` and `validation-report.json` before consuming the data for rating or simulation logic.
