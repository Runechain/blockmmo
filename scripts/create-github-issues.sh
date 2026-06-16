#!/usr/bin/env bash
# RUNECHAIN — GitHub lane labels + issues bootstrap
# Run from repo root:  bash scripts/create-github-issues.sh
# Requires: gh CLI authenticated as water-bear86

set -euo pipefail
REPO="water-bear86/blockmmo"

echo "=== Creating labels ==="

create_label() {
  gh label create "$1" --color "$2" --description "$3" --repo "$REPO" --force 2>&1 || true
}

create_label "lane: foundations"        "0075ca" "Account system, server authority, anti-cheat, character persistence"
create_label "lane: engine"             "d4c5f9" "Turn-based mode, segment sequencer, mode transitions"
create_label "lane: world & content"    "0e8a16" "MMO presence, questline, puzzles, exploration, A2/A3 areas"
create_label "lane: art"                "f9a825" "Sprites, enemy sheets, tilesets, VFX"
create_label "lane: economy & chain"    "5319e7" "Chainwell ledger hardening, RUNE/Gold flow"
create_label "lane: solana & contracts" "b60205" "Settlement program, character NFT, transfer-hook, wallet adapter"
create_label "lane: legal & compliance" "e4e669" "Q-L3 gate, Q-A1 KYC decision, compliance tracking"
create_label "blocker"                  "d73a4a" "Blocks downstream work — nothing downstream is trustworthy without this"
create_label "open-question"            "e6b8a2" "Unresolved design/arch question from PRD"
create_label "priority: high"           "b60205" "Critical path item"

echo "=== Labels done. Creating issues ==="

###############################################################################
# LANE: FOUNDATIONS
###############################################################################

gh issue create --repo "$REPO" \
  --title "[FOUNDATIONS] Q-A1 (BLOCKER): Define account-binding model for one-character-per-season cap" \
  --label "lane: foundations,blocker,priority: high,open-question" \
  --body "## Context
PRD U6 / Q-A1. The one-character-per-season cap is a universal rule, but \`account\` is undefined.

## Options (need a decision)
- **Wallet** — easy, circumventable via multiple wallets
- **Game account** — middle ground; needs email/social login
- **Verified identity (KYC)** — strongest; adds friction, compliance surface, and cost (~\$1.35–\$1.85/verification, Sumsub benchmark)

## Why it's a blocker
No account system currently exists beyond an in-game name + peer id. This gates the entire Foundations sequencing step and all downstream economy/MMO work.

## Acceptance criteria
- Decision made on wallet vs game-acct vs KYC binding
- Sybil/multi-wallet circumvention strategy defined
- Account system implemented and character persistence wired to it

## References
PRD: Q-A1, U6, R6, R7 | DESIGN-BIBLE: Terminology (Character, Season)"

gh issue create --repo "$REPO" \
  --title "[FOUNDATIONS] Migrate server to authoritative validation model (U7 / S2)" \
  --label "lane: foundations,priority: high,blocker" \
  --body "## Context
PRD U7, S2.1–S2.3. Currently the server trusts client block validation — an exploit surface for forged RUNE balances (Risk R2).

## Three-tier authority model to implement
- **Authoritative:** all economy state (RUNE credit/debit, leveling, death, character/season state) + PvP outcomes — server-owned, server-validated
- **Validated:** solo-segment outcomes (platformer, turn-based) run client-side for responsiveness but outcomes are server-validated before touching the ledger
- **Non-authoritative:** casual movement broadcast in shared-world modes (relay stays)

## Key constraint
Client must stay buildless (A1) — authority moves to server, client gets thinner (propose + render only).

## Acceptance criteria
- Server validates every Chainwell block before accepting (S1.3)
- No client-side ledger mutations accepted without server sign-off
- Three-tier model documented and enforced

## References
PRD: U7, S2.1–S2.3, S1.3, R2, R3 | DESIGN-BIBLE: Ruling 10 (C4)"

gh issue create --repo "$REPO" \
  --title "[FOUNDATIONS] Q-S2b: Anti-cheat for browser-side SHA-256 PoW mining" \
  --label "lane: foundations,open-question,priority: high" \
  --body "## Context
PRD S1.3, Q-S2b. Browser-side PoW mining invites client tampering of the RUNE credit mechanism (Risk R3).

## Options
- Move mining fully server-side (removes client trust entirely)
- Keep browser mining but require server verification of every submitted nonce before crediting RUNE
- Hybrid: browser mines, server re-verifies + rate-limits submissions

## Acceptance criteria
- Decision made on mining location and verification model
- Implemented: RUNE credits only flow from server-verified PoW
- Risk R3 closed

## References
PRD: S1.3, Q-S2b, R3 | DESIGN-BIBLE: Terminology (RUNE)"

gh issue create --repo "$REPO" \
  --title "[FOUNDATIONS] Q-S2a: Define block-validation rules for the authoritative Chainwell" \
  --label "lane: foundations,open-question" \
  --body "## Context
PRD Q-S2a, S2.1. The server must validate every block, but the validation rules themselves are not yet specified.

## Questions to answer
- What constitutes a valid block? (hash format, difficulty target, timestamp range, parent reference)
- How are forks handled? (longest-chain vs. server-canonical)
- What are the rejection conditions? (forged nonce, invalid parent, replay, future timestamp)

## Acceptance criteria
- Block-validation rule set documented and implemented in server.js
- Invalid/forged blocks are rejected with an appropriate error
- Regression tests cover the main rejection paths

## References
PRD: Q-S2a, S2.1, S1.1"

gh issue create --repo "$REPO" \
  --title "[FOUNDATIONS] Implement character persistence and season-state model (F7.1)" \
  --label "lane: foundations,priority: high" \
  --body "## Context
PRD F7.1–F7.6. No account system, season state, or transfer gate currently exists.

## What's needed
- Season open/close clock (shared real-world window)
- Per-character 'season-complete' flag (mandatory tasks finished within window)
- Carry-over model on keep: grind-earned collection + stats persist for non-sellers
- Reset model on sale/restart: collection transfers, stats reset to zero (C3)

## Open questions (separate issues)
- Q-F7a: status of a character whose window closed with tasks unfinished (locked, penalty, auto-reset?)
- Q-A1: what 'account' binds to

## Acceptance criteria
- Season state persisted server-side
- Character season-complete check implemented
- Collection-carries / stats-reset logic implemented and tested

## References
PRD: F7.1–F7.6, C3 | DESIGN-BIBLE: Rulings 8–9 (C2/C3), Terminology (Character, Season)"

###############################################################################
# LANE: ENGINE
###############################################################################

gh issue create --repo "$REPO" \
  --title "[ENGINE] Build turn-based RPG battle mode — renderer + logic (F2.4)" \
  --label "lane: engine,priority: high" \
  --body "## Context
PRD F2.4. The turn-based battle mode does not exist — no renderer, no logic. It must implement the same \`enter/exit/update/render\` interface as \`battlefield.js\` and \`platformer.js\` so it slots into the mode manager and can also serve as a boss segment (F3).

## What's needed
- Turn-based combat logic: initiative, turn submission, action resolution, win/loss conditions
- Renderer: pixel art battle scene, combatant sprites, HP bars, action menu
- PvP entry: triggered by \`rc:pvp:challenge\`/\`accept\` handshake from real-time arena (F2.3)
- Boss RPG phases: the same mode serves as a boss segment in the sequencer (F3)
- Server-arbitrated turn resolution (Q-S2c — separate issue)

## Open questions
- Q-F2a: what state carries from real-time engagement into turn-based battle (HP, positioning, ambush advantage)?

## Architecture constraint
Client buildless (A1) — new ES module, no framework.

## Acceptance criteria
- Module exports the standard engine interface
- 1v1 PvP duel playable end-to-end (initiation → turns → outcome)
- Boss RPG phase usable from the segment sequencer
- No build step introduced

## References
PRD: F2.3, F2.4, Q-F2a, Q-S2c | engine/api.md | engine/mode.js"

gh issue create --repo "$REPO" \
  --title "[ENGINE] Q-S2c: Turn-arbitration protocol for server-authoritative PvP" \
  --label "lane: engine,open-question,priority: high" \
  --body "## Context
PRD Q-S2c. Turn-based PvP requires a fundamentally different networking shape from the existing rebroadcast relay.

## Questions to answer
- Turn submission format: what does a client send to the server per turn?
- Ordering: simultaneous vs. sequential turns; who goes first?
- Resolution: server computes outcome and broadcasts result to both clients
- Timeout/forfeit: what happens if a player disconnects or doesn't submit within N seconds?
- Replay protection: how are duplicate/replayed turn submissions rejected?

## Acceptance criteria
- Protocol documented (can be a section in engine/api.md or a new protocol.md)
- Implemented in server.js and the turn-based engine module
- Timeout/forfeit path tested

## References
PRD: Q-S2c, S2.1, F2.4"

gh issue create --repo "$REPO" \
  --title "[ENGINE] Build segment sequencer for multi-mode boss encounters (F3)" \
  --label "lane: engine,priority: high" \
  --body "## Context
PRD F3.1–F3.4. Boss encounters chain multiple play-styles (platformer → arena → turn-based RPG) via a data-driven script. The segment sequencer is a new component that sits *above* the existing mode manager.

## What's needed
- Segment sequencer component: reads a boss script (ordered list of segments), drives the mode manager
- Boss script format: each segment specifies mode + level payload + completion condition
- Transition beat: brief wipe/cut between segments (diegetic 'gate slams shut') — hides teardown/setup
- Carry-over handoff: player state (HP, stamina, earned state) passed between segments
- Reuse existing level JSON formats for platformer/battlefield segments (F3.4)

## Open questions
- Q-F3a: what defines segment 'completion' — reuse existing events (\`onExit\`, \`onZoneCleared\`, boss HP) or explicit declared condition?
- Q-F3b: exact carry-over payload across the transition beat

## Architecture constraint
Extend, don't replace (A4) — sits above existing mode manager, does not rewrite it.

## Acceptance criteria
- Sequencer drives at least one complete multi-segment boss (e.g. Mother Tallow: platformer → battlefield → turn-based)
- Transition beat plays between segments
- Correct player state carries across segments

## References
PRD: F3.1–F3.4, Q-F3a, Q-F3b | engine/sequencer.js (exists, check current state) | engine/mode.js"

gh issue create --repo "$REPO" \
  --title "[ENGINE] Q-N1: World-to-interior transitions (enter cave = enter platformer)" \
  --label "lane: engine,open-question" \
  --body "## Context
PRD Q-N1. A player currently cannot enter anything — there are no world-to-interior transitions. The design intent is that descending from the top-down world into a cave, building, or shaft would load a platformer segment inline.

## Questions to answer
- How is an entry-point defined in the top-down world map data?
- Does the transition reuse the segment sequencer (F3) or is it a separate lighter mechanism?
- Camera / position reconciliation at entry and exit
- Does the platformer instance report back to the world on completion (Q-F3b carry-over applies)?

## Acceptance criteria
- At least one world entry-point leads into a platformer segment
- Player re-emerges in the top-down world at the correct position after completion

## References
PRD: Q-N1, F3 | Current Build Reality (connective tissue absent)"

gh issue create --repo "$REPO" \
  --title "[ENGINE] Q-F2b: Define what shared-world players see when someone enters a solo segment" \
  --label "lane: engine,open-question" \
  --body "## Context
PRD Q-F2b. When a player transitions into a solo segment (platformer, turn-based battle) they leave the shared-world relay. Other players currently have no defined visual state for them.

## Options
- Avatar vanishes
- 'In an encounter' marker shown at last known position
- Frozen avatar at last position

## Acceptance criteria
- Decision made and documented
- Implemented in the shared-world relay / MMO presence layer

## References
PRD: Q-F2b, F2.1, F2.2"

###############################################################################
# LANE: WORLD & CONTENT
###############################################################################

gh issue create --repo "$REPO" \
  --title "[WORLD] Fix shared MMO presence — players must reliably see each other in town (F1)" \
  --label "lane: world & content,priority: high" \
  --body "## Context
PRD F1, Current Build Reality. The shared-presence MMO layer is not actually working. Players do not reliably see each other in town and realm-convergence is scaffold.

## What's needed
- Reliable real-time transform relay for all connected players in the top-down world
- Realm-convergence behavior: all players share one world state
- Other Recorded visible and moving in real time
- Depends on server-authority migration (U7) for correctness

## Acceptance criteria
- Two browser clients in the same session see each other's avatars moving in real time
- New joiners converge to current world state immediately
- No ghost duplicates or stale positions

## References
PRD: F1, U7 | server.js (relay exists, broken) | Current Build Reality"

gh issue create --repo "$REPO" \
  --title "[WORLD] Author Act 1 questline — q01–q05 content (Gracefall Parish)" \
  --label "lane: world & content,priority: high" \
  --body "## Context
PRD Current Build Reality: 'No questline exists at all. The STORY block / Act 1 slice is structural scaffolding, not authored content.'

## What's needed (per DESIGN-BIBLE Area 1)
- **Town / Hearthlight Chapel:** Recorder/Chaplain, Scribe/Archivist, Debt Confessional, Chapel Acolyte, Sexton grave-tenders — dialogue, interactions, lore
- **q01:** Registry stone interaction (recorded into the Chainwell)
- **q02:** Platformer — Parish Road Receipts, verification bells, Gate Sexton Marrow mini-boss
- **q03:** Town beats after q02
- **q04:** Battlefield — Chainwell Ledger & Mempool Yard, Mempool Warden mini-boss
- **q05:** Final boss — Mother Tallow (combined play-styles: candle hazards, Echoes, phase 2 smoke)
- Waxen Testament Sigil mint on defeat

## Acceptance criteria
- Full q01–q05 loop playable with authored dialogue and boss behaviors
- Waxen Testament Sigil minted on-chain on Mother Tallow defeat
- Path north to Shroud Vaults unlocked

## References
DESIGN-BIBLE: Area 1 (full spec) | game/content.js"

gh issue create --repo "$REPO" \
  --title "[WORLD] Design and build Area 2 — The Shroud Vaults" \
  --label "lane: world & content" \
  --body "## Context
DESIGN-BIBLE Area 2. Inherited debt, the forked archive (Canon vs Schism), crystallized ledger-stone.

## What's needed
- **Town — Vault Anteroom / Forklight Hearthlight:** Keeper of Ancestry, Custodian Archivist, Librarian Shade, Keeper of Margins + side-quest (weakens Debt Foreman), Vault Custodians
- **Platformer — Debt Mines:** forked Canon/Schism path, name-spelling identity puzzle at crossing, Debt Foreman mini-boss (dual-chain gimmick, Keeper-of-Margins graft)
- **Battlefield — Ledger Vaults:** Canon Auditor + Schism Shadow creatures, Bifurcated Guard mini-boss (simultaneous-kill mechanic)
- **Final boss — The Ledger-Bound:** forked arena, phase 2 split + fissure-center killing blow, Contested Will Sigil

## Acceptance criteria
- Full Area 2 loop playable
- Canon/Schism fork is a real mechanical choice affecting gameplay
- Keeper-of-Margins side-quest meaningfully affects Debt Foreman difficulty
- Contested Will Sigil minted on defeat

## References
DESIGN-BIBLE: Area 2"

gh issue create --repo "$REPO" \
  --title "[WORLD] Design and build Area 3 — The Archive of Attestation" \
  --label "lane: world & content" \
  --body "## Context
DESIGN-BIBLE Area 3. Paradox, hyperinflation, the Auditor — climax is co-authorship not combat. Three permanent endings (A/B/C).

## What's needed
- **Town — Archive Tower / Celestial Spark Hearthlight:** Archivist (hostile), Prime Witness, Unrecorded Pilgrim, Contradiction Echoes, Ledger State UI, hyperinflation ticker
- **Platformer — Ascent of Testimony:** gravity inversion, Great Redaction blackout zone, Audit Wolves, Scrivener mini-boss (speed-kill stat-greying gimmick, drops Scrivener's Quill)
- **Battlefield — Seized Asset Yard:** three overlapping ledger-zones, Relic Shades (player's own relics as husks), Cascade Anchor mini-boss (QTE contest mechanic)
- **Final boss — The Auditor:** cannot be killed; three choice-platforms; permanent account-bound endings A/B/C; Amended Record Sigil (Choice C)
- Endgame: Weekly Contestation Echo + Amendment Content sandbox (no farmable power)

## Acceptance criteria
- Full Area 3 loop playable
- All three endings reachable and permanently recorded on-chain
- Amended Record Sigil minted for Choice C
- Endgame modes accessible after Choice C

## References
DESIGN-BIBLE: Area 3"

gh issue create --repo "$REPO" \
  --title "[WORLD] Q-N2: Add explorable world — lore, dead-ends, rewarded curiosity" \
  --label "lane: world & content,open-question" \
  --body "## Context
PRD Q-N2 / Current Build Reality: 'No explorable world. No lore to discover, no dead-ends, no rewarded curiosity — the world is traversal, not exploration.'

## Questions to answer
- What form does lore discovery take? (interactables, hidden rooms, environmental text)
- What rewards exist for exploration that aren't power? (cosmetics, lore entries, Gold-pittance)
- How do dead-ends serve the cozy-gothic tone without feeling punishing?

## Acceptance criteria
- At least 3 off-path lore discoveries in Area 1
- At least one hidden room or dead-end with a cosmetic/lore reward

## References
PRD: Q-N2 | DESIGN-BIBLE: Tone"

gh issue create --repo "$REPO" \
  --title "[WORLD] Q-N3: Redesign puzzles to require actual thinking" \
  --label "lane: world & content,open-question" \
  --body "## Context
PRD Q-N3 / Current Build Reality: 'Puzzles are trivial. No thinking is required; the player moves through the steps. There is no puzzle design, only puzzle shape.'

## Questions to answer
- What cognitive mode do puzzles target? (spatial, timing, lore-gated knowledge, Canon/Schism mechanic)
- How does difficulty scale across areas?
- Can puzzle design connect to the bureaucratic/ledger theme (e.g. matching entries, debt-chain tracing)?

## Acceptance criteria
- At least 2 redesigned puzzles in Area 1 that require deliberate thought
- Playtested to confirm non-trivial solve rate

## References
PRD: Q-N3 | DESIGN-BIBLE: Tone (bureaucratic horror)"

###############################################################################
# LANE: ART
###############################################################################

gh issue create --repo "$REPO" \
  --title "[ART] Replace placeholder/garbage-quality top-down tiles and sprites" \
  --label "lane: art,priority: high" \
  --body "## Context
PRD Current Build Reality: 'Art is rough. Many top-down tiles and sprites are placeholder/garbage-quality and need replacement.'

## What's needed
- Audit existing assets against ASSET-CHECKLIST.md
- Replace failing tiles (Gracefall Parish top-down: warm candle-amber palette)
- Replace failing player/NPC sprites
- Maintain existing sheet indices — never break existing sprite indices in tiles.png

## Acceptance criteria
- All top-down tiles and sprites pass the ASSET-CHECKLIST criteria
- No placeholder-colored or visibly incorrect tiles in Area 1

## References
docs/design/ASSET-CHECKLIST.md | docs/design/ASSET-PROMPTS.md | DESIGN-BIBLE: Tone / Palette"

gh issue create --repo "$REPO" \
  --title "[ART] Generate new enemy sprite sheets — Area 1 bosses" \
  --label "lane: art" \
  --body "## Context
DESIGN-BIBLE Assets section. Area 1 requires new sprites not currently in the repo.

## Sprites needed
- \`tallow-echo\` — Tallow Echo adds (from Mother Tallow phase 2)
- \`sexton\` — Gate Sexton Marrow (reuses \`knight\` strip; new palette \`#d8b36b\`)
- \`mempool\` — Mempool Warden (reuses \`sorcerer\` strip; color \`#b88cff\`)
- \`tallow\` — Mother Tallow boss (reuses \`sentinel\` strip; boss; color \`#f1c75b\`)

## Process
Use prompts from docs/design/ASSET-PROMPTS.md and import via scripts/import_assets.js.

## Acceptance criteria
- All four sheets importable with correct frame counts and palette
- Registered in game/content.js enemy registry
- Visible in battlefield and boss encounters

## References
DESIGN-BIBLE: Area 1 boss specs | docs/design/ASSET-PROMPTS.md"

gh issue create --repo "$REPO" \
  --title "[ART] Generate new enemy sprite sheets — Area 2 & 3 bosses" \
  --label "lane: art" \
  --body "## Context
DESIGN-BIBLE Assets section. Areas 2 and 3 require new sprites.

## Sprites needed (Area 2)
- \`foreman\` — Debt Foreman (crystalline blue-green knight recolor)
- \`bifurcated\` — Bifurcated Guard (two linked knight recolors, amber + green)
- \`hollow-ancestor\` — Hollow Ancestor adds
- \`canon-auditor\` — Canon Auditor creature (armored/methodical)
- \`schism-shadow\` — Schism Shadow creature (fast/phasing)
- \`ledgerbound\` — The Ledger-Bound final boss

## Sprites needed (Area 3)
- \`scrivener\` — The Scrivener (sorcerer recolor, ink-black)
- \`audit-wolf\` — Audit Wolf adds
- \`cascade\` — Cascade Anchor (sentinel recolor, prismatic white)
- \`relic-shade\` — Relic Shade (player relic animated as hollow patroller)
- \`auditor\` — The Auditor final boss (humanoid scrolling-text silhouette)

## Acceptance criteria
- All sheets importable with correct frame counts
- Registered in game/content.js
- No existing sprite index broken

## References
DESIGN-BIBLE: Area 2 & 3 boss specs | docs/design/ASSET-PROMPTS.md"

gh issue create --repo "$REPO" \
  --title "[ART] Create new tilesets — tiles-vaults, tiles-archive, tiles-fx" \
  --label "lane: art" \
  --body "## Context
DESIGN-BIBLE Assets: 'New tilesets: tiles-vaults, tiles-archive, tiles-fx (extend tiles.png in place; never break existing indices).'

## What's needed
- \`tiles-vaults\` — Area 2 palette: cold mineral blue-green, crystallized ledger-stone, semi-transparent name-etched walls
- \`tiles-archive\` — Area 3 palette: phosphorescent ledger-white bleeding into hyperinflation reds, Escher-tower geometry
- \`tiles-fx\` — cross-area visual effects tiles (ink pools, wax pools, Canon amber / Schism sickly-green hazard tiles, belief-platforms)

## Constraint
Extend tiles.png in place. Never break existing tile indices used by Area 1.

## Acceptance criteria
- All three tilesets importable and renderable in their respective area maps
- Area 1 rendering unaffected

## References
DESIGN-BIBLE: Area 2 & 3 descriptions, Assets section"

###############################################################################
# LANE: ECONOMY & CHAIN
###############################################################################

gh issue create --repo "$REPO" \
  --title "[ECONOMY] Harden Chainwell to ledger-grade: server validates every block (S1.3 / R2)" \
  --label "lane: economy & chain,priority: high,blocker" \
  --body "## Context
PRD S1.3, R2. The server currently trusts client block validation ('trust the client for this demo'). This is an exploit surface for forged RUNE balances. Now that the Chainwell is the permanent ledger of record, this must be fixed.

## What's needed
- Server independently validates every submitted block (hash, difficulty, parent, timestamp, nonce)
- Reject invalid blocks with a structured error; do not append to the chain
- Remove the 'longest-chain / trust client' relay posture for ledger operations
- See Q-S2a issue for the specific validation rule set

## Acceptance criteria
- A client submitting a forged block is rejected by the server
- Risk R2 closed
- All legitimate mining continues to work

## References
PRD: S1.3, S2.1, Q-S2a, R2 | game/chain.js | server.js"

gh issue create --repo "$REPO" \
  --title "[ECONOMY] Implement RUNE earning, spending, and Chainwell credit flow" \
  --label "lane: economy & chain,priority: high" \
  --body "## Context
PRD F5 (RUNE side), Current Build Reality: 'The economy is not built. Earning, spending, conversion, and settlement are scaffold and mock.'

## What's needed
- RUNE earned from combat (monster drops, boss rewards per DESIGN-BIBLE specs)
- RUNE spent at Hearthlight for leveling (Vigor/Endurance/Strength) and relic forging
- Server-authoritative RUNE credit/debit (no client-side balance mutations)
- Chainwell ledger entries for all RUNE transactions

## Acceptance criteria
- Killing a Hollow Debtor credits the correct RUNE reward on the server-side Chainwell
- Leveling at the Chaplain debits RUNE and updates stats
- All transactions are recorded as Chainwell blocks
- No client-side RUNE manipulation accepted

## References
PRD: F5, S2.1 | DESIGN-BIBLE: Rulings 1 (RUNE power-only at Hearthlight), Terminology (RUNE)"

gh issue create --repo "$REPO" \
  --title "[ECONOMY] Implement Gold currency — cosmetics-only, on-ramps, PRIZE_POOL relabel (F5.3 / F5.4)" \
  --label "lane: economy & chain" \
  --body "## Context
PRD F5.3, F5.4, code discrepancy note. Gold is cosmetics-only (C1). Two on-ramps: (a) RUNE → Gold conversion at a flat rate; (b) wSOL → Gold via Solana settlement (F6 — separate issue).

## What's needed
- Gold balance tracked on server (Chainwell or sidecar)
- RUNE → Gold conversion endpoint (rate is Q-F5b — placeholder acceptable)
- Gold spend path: cosmetic shop at Hearthlight (dyes, vestments, skins, VFX)
- **Relabel \`PRIZE_POOL\` to \`MARKETING\`** throughout the codebase (F5.4 code discrepancy)
- Gold never touches progression speed or power

## Open question
- Q-F5b: RUNE→Gold conversion rate (balance placeholder for now)

## Acceptance criteria
- PRIZE_POOL renamed to MARKETING everywhere
- Gold earnable via RUNE conversion
- Gold spendable only on cosmetics — no power path
- G4 guardrail: Gold never purchases power or speed

## References
PRD: F5.3, F5.4, Q-F5b, code discrepancy note | DESIGN-BIBLE: Ruling 7 (C1), Terminology (Gold)"

gh issue create --repo "$REPO" \
  --title "[ECONOMY] Q-F7a: Define status of a character whose season window closed with tasks unfinished" \
  --label "lane: economy & chain,open-question" \
  --body "## Context
PRD Q-F7a, F7.1, F7.3. The transfer gate must handle a character that is neither mid-season nor season-complete — the window closed but tasks weren't finished.

## Options
- **Locked forever** — harsh; blocks the character entirely
- **Sellable at a penalty** — partial value exit
- **Auto-reset** — reverts to a fresh start for next season
- **Carried as 'failed'** — retains collection but cannot sell; can re-attempt next season

## Acceptance criteria
- Decision made and documented
- Gate logic implements the chosen state correctly
- Edge case tested: window closes exactly when player is mid-task

## References
PRD: Q-F7a, F7.1, F7.3"

###############################################################################
# LANE: SOLANA & CONTRACTS
###############################################################################

gh issue create --repo "$REPO" \
  --title "[SOLANA] Q-F6a: Decide settlement architecture — Anchor program vs. multi-instruction tx" \
  --label "lane: solana & contracts,open-question,priority: high" \
  --body "## Context
PRD Q-F6a, F6.1. The real-money settlement (wSOL → 50% burn / 35% marketing / 15% ops) must be atomic. Two implementation paths:

## Options
- **Custom Anchor program** — clean atomic 3-way routing in a single instruction; requires Rust/Anchor toolchain; server constructs the transaction (U7)
- **Client-built multi-instruction transaction** — uses standard SPL token program; atomicity relies on transaction-level all-or-nothing; simpler but client constructs it (conflicts with server-authority U7)

## Recommendation leaning
U7 (server authoritative) argues strongly for server-constructed/validated transactions → Anchor program is likely the right path.

## Acceptance criteria
- Architecture decision documented
- Q-F6b (which wSOL mint) decided alongside
- Implementation unblocked

## References
PRD: Q-F6a, F6.1, F6.2, U7 | contracts/"

gh issue create --repo "$REPO" \
  --title "[SOLANA] Build Solana settlement program — atomic 50/35/15 wSOL split with true SPL burn (F6)" \
  --label "lane: solana & contracts,priority: high" \
  --body "## Context
PRD F6. Replace devnet-mock \`Econ.buyGoldWithSol()\` with real settlement. Gated on legal sign-off (F6.3 / Q-L3) — **design and build now; do NOT go live until legal gate clears**.

## What's needed
- Solana program (Anchor/Rust) that atomically routes a wSOL payment:
  - **50% true SPL burn** — \`createBurnCheckedInstruction\`, reduces token supply, NOT incinerator address (F6.2)
  - **35% marketing wallet**
  - **15% ops fee wallet**
- Server constructs and validates the transaction (U7)
- On settlement success: Gold credited to player on Chainwell (S1.2 crossing point)
- Failure modes: partial-split impossible (F6.1 atomicity); failure leaves no partial state

## Open questions (need decisions first)
- Q-F6a: Anchor program vs. multi-instruction tx
- Q-F6b: which wSOL mint

## Go-live gate
F6.3 / Q-L3 — legal/compliance sign-off required before enabling real funds. Devnet deployment fine now.

## Acceptance criteria (devnet)
- Atomic split executes correctly on devnet
- True SPL burn confirmed (supply reduced, verifiable on-chain — G7 guardrail)
- G6 guardrail: no partial-split settlements
- Gold credited iff and only iff settlement tx confirms

## References
PRD: F6.1–F6.4, Q-F6a, Q-F6b, S1.2 | contracts/"

gh issue create --repo "$REPO" \
  --title "[SOLANA] Build character NFT with conditionally-gated transfer (F7.2 / F7.3)" \
  --label "lane: solana & contracts,priority: high" \
  --body "## Context
PRD F7.2, F7.3. The character is a normal transferable NFT whose transfer is program-gated by season-state. A Token-2022 NonTransferable token cannot implement 'sellable at season end' — confirmed by research.

## Mechanism options (Q-F7b — needs a decision)
- **Token-2022 transfer-hook** — vetoes transfers failing the season-complete check; hooks into standard transfer instruction
- **Escrow-program gating** — character held in escrow; released only on season-complete

## What the gate enforces (F7.3)
- Can't sell mid-season (window open / tasks unfinished) → transfer reverts
- Can't sell half-completed season → same check
- Sell ⇒ seller's account flagged to restart at zero next season

## What buyer inherits (F7.4 / C3)
- Full grind-earned collection (items, relics, sigils, cosmetics)
- Stats reset to zero — power never inherited

## Go-live gate
F6.3 / Q-L3 legal sign-off. Build and test on devnet now.

## Acceptance criteria (devnet)
- Transfer reverts if season-complete check fails
- Transfer succeeds if season-complete
- Buyer inherits collection; stats reset on new season
- G3 guardrail: only earned progress survives sale; G5 guardrail: ≤1 sale per account per season

## References
PRD: F7.1–F7.6, Q-F7a, Q-F7b, C2/C3 | DESIGN-BIBLE: Rulings 8–9"

gh issue create --repo "$REPO" \
  --title "[SOLANA] Implement wallet abstraction layer — browser-extension adapter (F6.4)" \
  --label "lane: solana & contracts" \
  --body "## Context
PRD F6.4, A3. The wallet integration should treat a browser-extension wallet (e.g. Phantom) as one adapter, not the only path, so a future mobile-wallet connection is not designed out.

## What's needed
- Wallet adapter interface: connect, sign transaction, get public key
- Phantom (browser extension) implemented as the first concrete adapter
- Server-side transaction construction path: server builds + serializes tx, client adapter signs + submits
- No raw wallet SDK calls scattered through game code — all go through the adapter

## Acceptance criteria
- Phantom wallet connects and can sign a devnet transaction
- Swapping to a different adapter (e.g. mobile wallet) requires only a new adapter module, no game logic changes
- No build step introduced (A1)

## References
PRD: F6.4, A1, A3"

###############################################################################
# LANE: LEGAL & COMPLIANCE
###############################################################################

gh issue create --repo "$REPO" \
  --title "[LEGAL] Q-L3 (BLOCKER): Legal/compliance review for real-money go-live gate" \
  --label "lane: legal & compliance,blocker,open-question" \
  --body "## Context
PRD F6.3, Q-L3, Legal & Compliance Stance section. This is the hard gate on Sequencing step 3. It does NOT block prototype/devnet work.

## What the gate covers
- F6: taking real wSOL, minting spendable Gold, collecting a 15% fee — money-in path, project-operated
- F7: operated transfer-gate on character sales — concentration of cash-out
- Together: real money in + real value out = requires review regardless of 'art/collectible/deflationary' framing

## Project's framing arguments (logged as inputs to review, not determinations)
- No responsibility for players' financial outcomes; participation at own risk (terms/disclaimer)
- Characters framed as collectibles; value set by players off-platform, not guaranteed by project
- Gold purchase as deflationary sink (true SPL burn), not investment asset
- Price discovery and sale settlement off-platform, peer-to-peer

## This issue tracks
- [ ] Engage legal counsel
- [ ] Provide counsel with PRD Legal & Compliance Stance + Risk Register
- [ ] Receive sign-off (or scoped revision) before enabling F6/F7 in production
- [ ] Document outcome and any required design changes

## Note
Timeline intentionally unstated (living-document rule). This runs in parallel with all other lanes and blocks only the production go-live flip.

## References
PRD: F6.3, Q-L3, Legal & Compliance Stance, R1, R8"

gh issue create --repo "$REPO" \
  --title "[LEGAL] Q-A1 compliance side: sybil resistance and one-character cap enforcement (U6)" \
  --label "lane: legal & compliance,open-question" \
  --body "## Context
PRD Q-A1 (compliance dimension), U6, R6. The one-character-per-season cap is a key guardrail in the project's legal case (G5). If the cap is trivially circumvented via multiple wallets, the case weakens.

## Questions
- Does wallet-binding provide sufficient sybil resistance for the legal case, or does the review require stronger identity binding?
- If KYC is required: which provider? Sumsub benchmark cost ~\$1.35–\$1.85/verification. What friction level is acceptable?
- Does KYC itself create a new compliance surface (data retention, privacy regulation)?

## This issue tracks
- [ ] Decision on wallet vs. game-acct vs. verified-identity (coordinated with Foundations Q-A1 issue)
- [ ] Legal counsel input on whether wallet-binding is sufficient
- [ ] If KYC chosen: provider selected, cost modeled, data-privacy obligations reviewed

## Note
This is the compliance dimension of Q-A1; the implementation dimension lives in the Foundations lane.

## References
PRD: Q-A1, U6, R6, R7, Open Questions Register (blocker detail)"

echo ""
echo "=== All issues created successfully ==="
