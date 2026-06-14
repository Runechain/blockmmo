# Drop your character models here  🧟‍♂️🍄🐉

The game loads one GLB per role from this folder. Anything missing falls back to
an online placeholder rig (and then to the built-in box rig), so the game always
runs — it just gets **wilder** as you add files.

The loader auto-handles the annoying parts:
- **size** — any pack's native scale is normalised to fit the world automatically,
- **animations** — it fuzzy-matches each pack's clip names onto Idle / Walk / Run /
  Jump / Attack / Death, so different packs "just work",
- **colour** — each role is tinted to its monster palette.

## The files it looks for

| File name        | Role in game            |
|------------------|-------------------------|
| `player.glb`     | You (the Tarnished)     |
| `hollow.glb`     | Basic melee mob         |
| `hound.glb`      | Fast, low-HP swarmer    |
| `knight.glb`     | Tanky armored foe       |
| `sorcerer.glb`   | Ranged caster           |
| `sentinel.glb`   | The boss                |

## A deliberately wild starter mix (all CC0, all animated, all Quaternius)

Everything below is free for any use, no attribution required. On each Poly Pizza
page click **Download → glTF**, which gives a `.glb`. Rename it to the file name
in the table and drop it here, then reload the browser.

- **player.glb** → "Adventurer"  →  https://poly.pizza/m/5EGWBMpuXq
  (or "Character Animated" → https://poly.pizza/m/DgOCW9ZCRJ)
- **hollow.glb** → "Skeleton"  →  https://poly.pizza/m/yq5ATpujSt
- **hound.glb** → "Slime Enemy" (a bouncing slime as your fast swarmer = chaos)  →  https://poly.pizza/m/eSLKTsbl7F
- **sentinel.glb** → "Giant" (boss energy)  →  https://poly.pizza/m/BldaiPtyJa
- **knight.glb** → grab a demon/golem from the **Ultimate Monsters Bundle** → https://poly.pizza/bundle/Ultimate-Monsters-Bundle-5oyGWAmOB6
- **sorcerer.glb** → grab a **Mushroom (Mushnub)** or mage from that same bundle (a mushroom that lobs spells = perfect)

Browse the full free animated catalogue: https://poly.pizza/u/Quaternius

## Notes

- Use the **GLB** (single-file binary) download, not a multi-file gltf+bin+textures zip.
- If characters walk *backwards*, flip `FACE_OFFSET` from `Math.PI` to `0` in `index.html`.
- The start screen shows exactly which models loaded, so you can tell what's live.
- Mix freely — swap any creature into any role. The wilder the better.
