# Asset credits

## Kenney Roguelike/RPG pack — CC0
- By Kenney Vleugels (www.kenney.nl), with help by Lynn Evers.
- License: **Creative Commons Zero (CC0)** — public domain; personal and commercial use OK,
  credit appreciated but not required.
- Imported (1px inter-tile gaps repacked out) into `assets/pixel/tiles-rogue.png` —
  a gap-free 912×496 atlas of 1767 × 16px tiles, indexed by `assets/pixel/tiles-rogue.json`:
  ```
  node scripts/import_assets.js tileset --name tiles-rogue \
    --src <pack>/Spritesheet/roguelikeSheet_transparent.png --tile 16 --spacing 1
  ```
- Covers terrain, stone/dungeon, gothic doors/windows, columns, fences, and props —
  a source library for the Gracefall surface and the Shroud Vaults.

## Project-generated assets
Deterministic starter sprites/tiles (`scripts/generate_pixel_assets.js`) and placeholder
strips (`scripts/generate_placeholders.js`) are original project assets, MIT with the repo.
PixelLab-authored hero/boss/creature art is original IP (see `docs/design/ASSET-PROMPTS.md`).

## Monster Creatures Fantasy v1.3 — licensed source/reference
- License/source: user-confirmed licensed for this project; no license text was present in
  the local folder at import time.
- Used as style/reference input for top-down `assets/pixel/flying-eye.png` and
  `assets/pixel/mushroom.png`, generated as transparent 4-frame RUNECHAIN enemy strips.
- Runtime side-view sheets imported directly into `assets/pixel/pf-flying-eye.png`,
  `assets/pixel/pf-goblin.png`, `assets/pixel/pf-mushroom.png`, `assets/pixel/pf-skeleton.png`,
  plus projectile sheets. Full local source copy lives in `assets/source/monster-creatures-fantasy/`.

## FreeKnight_v1 — user-supplied local asset drop
- No license text was present in the local folder at import time.
- Runtime side-view hero sheets imported directly into `assets/pixel/free-knight-*.png`
  from `Colour1/Outline/120x80_PNGSheets/`.
- Full local source copy lives in `assets/source/free-knight/`.

## Items icon pack — user-supplied local asset drop
- No license text was present in the local folder at import time.
- The full 1,244-icon source library lives in `assets/source/items/`.
- Five curated relic icons are wired into Hearthlight forging:
  `relic-ember-edge`, `relic-warden-sigil`, `relic-green-knot`, `relic-rune-lens`,
  and `relic-tallow-brand`.
