## 2025-05-15 - [Keyboard Focus Clarity]
**Learning:** In dark-themed, custom-styled pixel MMOs, default browser focus indicators are often invisible or clash with the aesthetic. Keyboard users need a high-contrast, theme-consistent focus state.
**Action:** Use `:focus-visible` with the existing `--gold` variable and a small `outline-offset` to provide clear, delightful navigation feedback.

## 2025-05-20 - [Semantic & Visual Keyboard Hints]
**Learning:** Using semantic `<kbd>` tags combined with a custom "pixel-cozy" 3D keycap style significantly improves the discoverability and clarity of game controls. It creates a stronger mental model for the player that these are physical inputs.
**Action:** Always use `<kbd>` for keyboard shortcuts and apply the shared `kbd` CSS style which includes a `border-bottom` and theme-consistent colors.

## 2025-05-20 - [High-Frequency UI Performance]
**Learning:** In browser-based game loops, updating the DOM on every frame (even if the value is the same) can lead to layout thrashing and unnecessary CPU overhead. Caching elements and checking for content changes before updating is a crucial optimization for a smooth 60FPS HUD.
**Action:** Cache high-frequency HUD elements in a global `UI` object and use simple string comparison checks before modifying `innerHTML` or `textContent`.

## 2025-05-22 - [Discoverable Abbreviations]
**Learning:** In highly stylized or pixel-art UIs, standard browser defaults for `<abbr>` (like dotted underlines) are often overridden or removed for a "cleaner" look, but this kills tooltip discoverability. Users need a subtle visual hint that a term provides more info on hover.
**Action:** Maintain tooltip discoverability for `<abbr>` tags by using `cursor: help` and a theme-consistent `border-bottom` (e.g., dotted gold) rather than removing all text decoration.
