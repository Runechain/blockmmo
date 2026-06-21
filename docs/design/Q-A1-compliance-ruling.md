# Q-A1 compliance ruling — sybil resistance and one-character cap enforcement

**Status:** DECIDED (project working stance; counsel must still validate before go-live).
Closes issue #40.
**Refs:** PRD U6, F7, Q-A1, R6, R7, F6.3; `docs/design/ACCOUNT-BINDING.md`.

## The gap

The prototype account system deliberately optimizes for low friction: a browser-local P-256
credential gives the server a stable pseudonymous account without requiring a wallet or email.
That is enough to stop accidental duplicate characters in one browser profile, but it is **not**
enough to prove "one human, one season character." Clearing storage, using another browser
profile, or rotating wallets/devices can bypass it.

That matters legally because the one-character-per-season cap (U6) is one of the design
guardrails used to narrow the real-value exit surface. If production relied on wallet-only or
browser-only binding, the guardrail would be too easy to route around.

## Decision

### 1) Wallet-binding is **not** sufficient for the production legal case

Wallets are cheap to create and easy to multiply, so they are treated as **payment/settlement
rails only**, not the production identity anchor for U6.

### 2) The project uses a split model: low-friction play, higher-friction cash-out

- **Prototype / non-cash play:** keep the existing browser-local game account.
- **Production sale-capable season:** require a **verified identity** link and bind the U6 cap
  to that identity.
- **Rule:** one verified person may enable at most one sale-capable character per season.

This keeps casual/internal play accessible while making the real-money boundary rely on something
stronger than wallet possession.

### 3) KYC is opt-in at the sale-capable boundary, not at first launch

The acceptable friction level is:

- **No KYC** for first launch, prototyping, or non-cash play.
- **One-time KYC** when a player opts into a production season whose character may become
  sale-capable.
- If the player declines or fails KYC, they may still play the game, but that character is **not
  sale-capable**.

This keeps the higher-friction step attached to the regulated/value-exit path instead of forcing
it onto every player.

## Provider choice

**Planning baseline:** **Sumsub**.

Reason: the repository already uses Sumsub's approximate benchmark cost
(`~$1.35–$1.85 / verification`) in issue #40, so it is the cleanest default for production
planning and cost modeling. Replace it only if another hosted-verification provider offers a
materially better cost/coverage trade-off **without** increasing the game's data-handling burden.

## Privacy/compliance stance

KYC **does** create a new compliance surface. The project should narrow it aggressively:

- Use a **hosted provider flow**; do not collect or persist raw ID images/selfies on game
  infrastructure.
- Persist only the minimum operational facts needed to enforce the cap and support audits:
  provider reference id, verification state/result, timestamps, and jurisdiction/region if
  needed for policy enforcement.
- Require a **provider DPA**, a written **retention/deletion schedule**, and a user-facing path
  for access/erasure requests before production go-live.
- Re-verification should be exception-based (provider risk flag, account recovery, or regulatory
  trigger), not a routine every-season burden.

## Options considered

| Option | Rejected / chosen because |
| --- | --- |
| **Wallet only** | Rejected for production. Too easy to sybil; weakens the U6/G5 legal guardrail. |
| **Game account only** | Rejected for production cash-out. Good prototype ergonomics, but still only pseudonymous/browser-local. |
| **Verified identity everywhere** | Rejected as the default onboarding path. It adds unnecessary friction and privacy surface to pure play. |
| **Split model: browser game account for play, verified identity for sale-capable seasons** | **Chosen.** Preserves low-friction play while making the real-money boundary rely on stronger identity binding. |

## Implementation implications (tracked elsewhere)

- Foundations/account work keeps the current browser-local account layer for play.
- The production character-sale path must add a verified-identity gate and enforce the "one
  verified person, one sale-capable character per season" rule.
- Wallet adapters remain adapters for settlement UX, not the compliance identity primitive.
