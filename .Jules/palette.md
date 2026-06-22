## 2025-05-15 - [Keyboard Focus Clarity]
**Learning:** In dark-themed, custom-styled pixel MMOs, default browser focus indicators are often invisible or clash with the aesthetic. Keyboard users need a high-contrast, theme-consistent focus state.
**Action:** Use `:focus-visible` with the existing `--gold` variable and a small `outline-offset` to provide clear, delightful navigation feedback.

## 2025-05-20 - [Semantic & Visual Keyboard Hints]
**Learning:** Using semantic `<kbd>` tags combined with a custom "pixel-cozy" 3D keycap style significantly improves the discoverability and clarity of game controls. It creates a stronger mental model for the player that these are physical inputs.
**Action:** Always use `<kbd>` for keyboard shortcuts and apply the shared `kbd` CSS style which includes a `border-bottom` and theme-consistent colors.

## 2025-05-20 - [High-Frequency UI Performance]
**Learning:** In browser-based game loops, updating the DOM on every frame (even if the value is the same) can lead to layout thrashing and unnecessary CPU overhead. Caching elements and checking for content changes before updating is a crucial optimization for a smooth 60FPS HUD.
**Action:** Cache high-frequency HUD elements in a global `UI` object and use simple string comparison checks before modifying `innerHTML` or `textContent`.

## 2025-05-22 - [Terminology Clarity via Semantic Abbreviations]
**Learning:** In RPGs with abbreviated stat names (VGR, END, STR), providing semantic `<abbr>` tags with `title` attributes allows for effortless terminology discovery via tooltips without cluttering the compact HUD.
**Action:** Wrap stat abbreviations in `<abbr>` tags and ensure they use `cursor: help` for visual feedback.

## 2025-05-22 - [Currency Conversion Safeguards]
**Learning:** One-way currency conversions (especially from power-currency to cosmetic-currency) are high-stakes actions. A simple `confirm()` dialog prevents irreversible accidental progression loss and respects the user's grind.
**Action:** Always wrap one-way or destructive economic actions in a confirmation prompt.
