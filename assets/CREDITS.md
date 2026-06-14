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
