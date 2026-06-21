## 2025-05-15 - [Keyboard Focus Clarity]
**Learning:** In dark-themed, custom-styled pixel MMOs, default browser focus indicators are often invisible or clash with the aesthetic. Keyboard users need a high-contrast, theme-consistent focus state.
**Action:** Use `:focus-visible` with the existing `--gold` variable and a small `outline-offset` to provide clear, delightful navigation feedback.
## 2025-06-21 - [Async UI Button States]
**Learning:** In a UI without React/Vue data binding, users may accidentally double-click buttons initiating async actions (like Wallet connections or blockchain transactions) if visual feedback isn't immediate.
**Action:** Always wrap async actions on buttons in `disabled=true` and update the `textContent` to a loading state (e.g. "Processing..."), ensuring a `finally` block restores the button state when the Promise resolves or rejects.
