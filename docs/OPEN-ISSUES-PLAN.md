# Open-Issues Plan — RUNECHAIN

_Snapshot: 2026-06-22. Live state pulled via `gh`. CI all green; merges through #100._

## Current open work

| # | Title | Lane | Real status |
|---|-------|------|-------------|
| PR #98 | Palette: wallet loading state | UX | Green CI — review & merge |
| PR #99 | Bolt: HUD DOM caching | Perf | Green CI — review & merge |
| #36 | Solana settlement: 50/35/15 wSOL split + true SPL burn | solana | Program written (burn included); **undeployed, untested, server still mocked** |
| #37 | Character NFT: season-gated transfer | solana | Program written (escrow gating); **undeployed, untested, server wiring missing** |
| #40 | Legal: sybil resistance / one-character cap | legal | **Decision needed** — go-live gate for #36 & #37 |

Key dependency: **#40 gates _go-live_ of #36 and #37**, but both issues explicitly allow full devnet build/test now. So devnet work is unblocked; only enabling real funds waits on legal.

---

## Phase 0 — Clear the board (today, ~15 min)

1. Review & merge **PR #98** and **PR #99** (both green). 
2. Prune stale worktrees/branches (most `wt-issue-*` are marked `prunable`); get back to a clean `main` + one active feature branch.

## Phase 1 — Decisions that unblock clean work (before coding #36/#37)

These are cheap to answer and prevent rework:

- **Q-F6a** — settlement as a single Anchor program vs. multi-instruction tx. _Recommend: Anchor program (atomicity + auditability; matches existing code)._
- **Q-F6b** — which wSOL mint (canonical `So111…112` on devnet vs. a test mint). _Recommend: canonical wSOL._
- **Q-F7b** — character gate via Token-2022 **transfer-hook** vs. **escrow**. _Code already uses escrow; recommend staying with escrow unless a hook is explicitly wanted._
- **#40 legal posture** — wallet-binding alone vs. game-account vs. KYC. _Needs counsel; see Phase 4._

## Phase 2 — Settlement program to devnet (#36)

1. Point Anchor at **devnet** (`Anchor.toml` cluster, provider wallet, fund via `solana airdrop`).
2. Replace the `TODO` test script with real **anchor tests**:
   - atomic 50/35/15 split executes; **partial split impossible** (G6).
   - **true SPL burn** confirmed: token supply reduced on-chain (G7), not an incinerator address.
   - Gold credited iff settlement tx confirms (S1.2 crossing point).
3. `anchor deploy` to devnet; record program ID.
4. Server: build + validate the settlement tx (U7); on confirm, credit Gold on Chainwell. Replace the devnet-mock `Econ.buyGoldWithSol()`.
5. Acceptance (devnet): all criteria in #36 pass; demo a wSOL → Gold purchase with verifiable burn.

## Phase 3 — Character NFT to devnet (#37)

1. Deploy the character program to devnet (same Anchor setup as Phase 2).
2. Anchor tests for the gate:
   - transfer **reverts** when season-incomplete / window-open (F7.3).
   - transfer **succeeds** when season-complete.
   - buyer inherits full collection; **stats reset to zero** (C3); seller flagged restart-at-zero.
   - **≤ 1 sale per account per season** (G5).
3. Server reconciliation: listen for `CharacterSold`, transfer collection + reset stats off-chain in `accounts.json`.
4. Acceptance (devnet): all criteria in #37 pass.

## Phase 4 — Legal gate (#40) — runs in parallel, blocks go-live only

This is the critical path to **mainnet**, not to devnet. Deliverables:

1. Write up the options memo (I can draft this): wallet-binding vs. game-account vs. verified-identity, with the sybil-resistance trade-offs and how each strengthens/weakens the G5 one-character-cap legal argument.
2. KYC cost/friction model if pursued (Sumsub ≈ $1.35–1.85/verification) + the new data-privacy surface it creates (retention, GDPR/CCPA).
3. **Counsel sign-off** — the actual decision. Not something to automate.
4. Output: a recorded ruling (DESIGN-BIBLE / Open Questions Register) that flips the F6.3/Q-L3 gate.

## Phase 5 — Go-live (only after Phase 4 clears)

- Flip `Config.paused = false` on settlement + character programs.
- Mainnet deploy with real wallets (burn/marketing/ops); secure the program upgrade authority + keypairs (KMS/hardware).
- Staged rollout + monitoring.

---

## What needs _you_ (decisions/humans), vs. what I can drive

**I can drive now (devnet, code, tests, docs):** Phases 0–3 entirely, plus drafting the Phase 4 options memo.

**Needs you / a human:** the four Phase-1 decisions (quick), and Phase 4 legal sign-off + Phase 5 mainnet key custody (slow, external).

Suggested first move: I knock out Phase 0 (merge the two PRs, prune branches) and draft the #40 legal options memo, while you make the four Phase-1 calls. Then I take #36 to devnet.
