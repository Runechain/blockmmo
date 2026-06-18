# Enemy sprites (source)

Bespoke top-down enemy sprites generated with PixelLab, replacing the placeholder
24×24 strips. Each shipped sheet is a **single-row 4-frame strip** matching the
engine's frame semantics in `drawEnemy` (`index.html`):
`frame = dead?3 : windup>0?2 : hurt>0?3 : floor(t*6)%2` → **[idle1, idle2, windup, hurt]**.

| Sheet | Enemy | PixelLab character id | Frame picks |
| --- | --- | --- | --- |
| `../../pixel/hollow.png` | Hollow Debtor (humanoid, v3) | `641be6ee-8728-4638-9933-4e05a5d49e17` | breathing-idle 0 & 2 · cross-punch 3 (windup) · taking-punch 2 (hurt) |
| `../../pixel/hound.png` | Red Hound (quadruped, dog template) | `0fd39422-082e-4478-8a4d-822537cc4d4f` | idle 0 & 4 · bark 3 (windup) · bark 1 (hurt) |

Packing: chosen frames cropped to a shared center-symmetric, bottom-aligned bbox
(keeps poses registered), padded to square, resized to 24×24. `content.js` already
declares both at `{w:24,h:24}`, so this is a pure asset swap — no code change.

`rotations/` and `frames/` hold the raw PixelLab output for re-packing / future
states. To add more enemies, repeat the pipeline and drop the strip at the key the
enemy's `asset`/`key` resolves to.
