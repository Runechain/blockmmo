# RUNECHAIN Work-Grid Assignments

These JSON specs define the 6 dispatchable job types that drive the RUNECHAIN self-evolution loop via [molt-dispatch](https://github.com/water-bear86/molt-dispatch). Each spec is a complete objective contract — an AI worker reading it cold knows exactly what to produce.

## Assignment types

| File | What it produces | Capability | Gold reward |
|---|---|---|---|
| `propose-region.json` | Candidate region object (season schema shape) | inference | 50g |
| `generate-asset.json` | PixelLab `create_topdown_tileset` argument object | inference | 30g |
| `validate-candidate.json` | 6-gate pass/fail report for a candidate season | inference | 40g |
| `run-simulated-playtest.json` | Traversability + pacing report (3 archetypes) | inference | 35g |
| `score-season.json` | 0–100 score + ship/iterate/reject recommendation | inference | 60g |
| `build-telemetry.json` | S1 telemetry layer implementation (code) | code.implementation | 120g |

## Dispatch flow

Ensure a molt broker is running and `$MOLT_BROKER_URL` is set.

```bash
# Dispatch a region proposal:
molt objective create -f game/grid-assignments/propose-region.json

# Dispatch with extra context (e.g. link to an existing season for reference):
molt objective create -f game/grid-assignments/validate-candidate.json \
  --context '{"candidate_json": "<paste s2-candidate.json here>"}'

# Dispatch the asset generator with region art spec:
molt objective create -f game/grid-assignments/generate-asset.json \
  --context '{"region_name":"Drowned Reach","palette_primary":"#2a4a5a","palette_secondary":"#1a3040","region_character":"submerged, waterlogged receipts","decay_level":5}'
```

## The self-evolution loop

```
propose-region          → new region object
  ↓
generate-asset          → PixelLab tileset args (→ art pipeline)
  ↓
validate-candidate      → 6-gate pass/fail
  ↓ (pass)
run-simulated-playtest  → traversability verdict
  ↓ (traversable)
score-season            → 0-100 + recommendation
  ↓ (ship)
operator triggers Halving via POST /admin/halving/schedule
```

## build-telemetry (one-time bootstrap)

`build-telemetry.json` uses `code.implementation` capability, not `inference`. It instructs a code agent (Codex or similar) to implement the S1 telemetry layer required by `score-season`. Dispatch once to bootstrap the system; do not re-dispatch unless tearing down.

```bash
molt objective create -f game/grid-assignments/build-telemetry.json
```

## Gold rewards

Gold rewards listed above are guidance for operator incentive budgets. The actual Gold transfer is handled by the game's settlement layer when the worker submits an accepted result.
