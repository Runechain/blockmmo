## 2025-05-15 - [Keyboard Focus Clarity]
**Learning:** In dark-themed, custom-styled pixel MMOs, default browser focus indicators are often invisible or clash with the aesthetic. Keyboard users need a high-contrast, theme-consistent focus state.
**Action:** Use `:focus-visible` with the existing `--gold` variable and a small `outline-offset` to provide clear, delightful navigation feedback.

## 2025-05-20 - [Semantic & Visual Keyboard Hints]
**Learning:** Using semantic `<kbd>` tags combined with a custom "pixel-cozy" 3D keycap style significantly improves the discoverability and clarity of game controls. It creates a stronger mental model for the player that these are physical inputs.
**Action:** Always use `<kbd>` for keyboard shortcuts and apply the shared `kbd` CSS style which includes a `border-bottom` and theme-consistent colors.

## 2025-05-20 - [High-Frequency UI Performance]
**Learning:** In browser-based game loops, updating the DOM on every frame (even if the value is the same) can lead to layout thrashing and unnecessary CPU overhead. Caching elements and checking for content changes before updating is a crucial optimization for a smooth 60FPS HUD.
**Action:** Cache high-frequency HUD elements in a global `UI` object and use simple string comparison checks before modifying `innerHTML` or `textContent`.

## 2025-05-25 - [Async Button Feedback]
**Learning:** In single-page MMOs, wallet interactions (connecting, signing) can take unpredictable amounts of time. Without visual feedback, users may click multiple times or assume the app is broken.
**Action:** Always disable buttons, use `aria-busy="true"`, and change the button text (e.g., "Connecting...", "Processing...") during asynchronous operations, restoring the original state in a `finally` block. Also, ensure disabled buttons use `cursor: not-allowed` for clear visual cues.
