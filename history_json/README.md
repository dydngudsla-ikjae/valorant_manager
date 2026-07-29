# Player history

`data/players.json` contains tournament and annual aggregates for players on 2026 rosters.

Rebuild after profile data changes:

```powershell
node .\history_json\scripts\build-player-history.mjs
```

All rate metrics are weighted by rounds. Counting stats are summed. UI labels follow the VLR-style column order.
