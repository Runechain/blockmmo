# Asset pipeline

Pixel art is authored in **PixelLab**. These scripts only **import + pack** that art
into the sheets the game consumes. Zero dependencies — plain `node`, no install.

```
node scripts/import_assets.js <type> --name <name> --src <path> [options]
```

## Types and the PixelLab export each expects

| Type | `--src` is | Export shape | Output |
|------|-----------|--------------|--------|
| `hero` | a rotations folder | 8 named PNGs: `south.png`, `south-east.png`, `east.png`, `north-east.png`, `north.png`, `north-west.png`, `west.png`, `south-west.png` | `<name>-directions.png` (8×56px row) |
| `npc` | a rotations folder | same 8 named PNGs | `<name>-directions.png` (8×40px row) |
| `monster` | a frames folder | 4 anim PNGs → `idle, walk, attack, hurt` | `<name>.png` (4×24px row) |
| `boss` | a frames folder | N anim PNGs | `<name>.png` (N×48px row) |
| `creature` | a frames folder | grid PNGs named `<direction>-<frame>.png` (`south-0.png`, `south-1.png`, …) | `<name>.png` (cols×rows grid) |
| `prop` | a frames folder | 1+ PNGs (static or short anim) — candles, bells, tablets | `<name>.png` (16px) |
| `projectile` | a frames folder | 1+ tiny PNGs | `<name>.png` (12px) |
| `tileset` | a single sheet PNG | your static map grab, any size | `<name>.png` + `<name>.json` index, sliced on a 16px grid |

Frame folders are natural-sorted by any trailing number (`frame_0.png`, `frame_1.png`, …),
or pass an explicit order with `--files a.png,b.png,c.png`. All exports must be
**8-bit RGBA PNGs with alpha** (transparent background) — that's PixelLab's default.

## Options

`--name` `--src` `--out` · `--frame <px>` (square cell) · `--fw` / `--fh` ·
`--frames idle,walk,attack,hurt` · `--dirs south,east,…` · `--cols <n>` (creature) ·
`--tile <px>` (tileset) · `--margin <px>` · `--files a.png,b.png`

## Examples

```bash
# A new mini-boss exported as 4 animation frames
node scripts/import_assets.js boss --name gate-sexton --src ~/Downloads/sexton/frames

# A town NPC with 8-direction rotations
node scripts/import_assets.js npc --name chainwright --src ~/Downloads/chainwright/rotations

# A standard monster (idle/walk/attack/hurt)
node scripts/import_assets.js monster --name hound --src ~/Downloads/hound/frames

# A terrain sheet you grabbed (sliced into a 16px atlas + index)
node scripts/import_assets.js tileset --name parish-tiles --src ~/Downloads/parish.png
```

## Manifest

Every import upserts an entry in **`assets/pixel/manifest.json`**, keyed by name:

```json
{
  "gate-sexton": { "name": "gate-sexton", "type": "strip", "layout": "row",
                   "frameW": 48, "frameH": 48, "file": "gate-sexton.png",
                   "frames": ["idle","walk","attack","hurt"] }
}
```

This is the single source of truth for what art exists — read it before wiring an
asset in, and so Codex / build agents don't have to guess sheet dimensions.

## Wiring an imported asset into the game

1. Add it to the `ASSETS` table in `index.html` (the loader preloads every entry):

   ```js
   // directional sheet (hero / npc): w = h = frameSize
   chainwright:{ src:'assets/pixel/chainwright-directions.png', w:40, h:40, img:null },
   // animation strip (monster / boss / prop): w = frameW, h = frameH
   'gate-sexton':{ src:'assets/pixel/gate-sexton.png', w:48, h:48, img:null },
   ```

2. Draw it:
   - **Strips** → `drawSheet(key, x, y, frame, scale)` — `frame` indexes the row
     (`0=idle, 1=walk, 2=attack, 3=hurt`). For enemies, set `asset:'<key>'` on the
     `TYPES` entry to reuse another sheet.
   - **Directional sheets** → the directional draw path (`directionName()` →
     `PLAYER_DIR_ORDER` index), as the player does via `drawDirectionalPlayer()`.
   - **`grid`** sheets need the directional-anim draw path that lands with the
     platformer/battlefield engine work; the packer is ready ahead of the renderer.

## Architecture

- `scripts/lib/pixel-png.js` — the shared zero-dep RGBA PNG codec + image helpers
  (`encodePng`, `decodePng`, `alphaBounds`, `blitInto`, …).
- `scripts/lib/asset-pipeline.js` — the three packers (`packDirections`,
  `packStrip`, `packGrid`), `importTileset`, and the per-type `importX` wrappers.
- `scripts/import_assets.js` — the CLI.
- `scripts/import_pixellab_character.js` — back-compat shim (`hero` import for `player`).
- `scripts/generate_pixel_assets.js` — the older deterministic starter-art generator
  (unchanged; could later be ported onto `lib/pixel-png.js`).
