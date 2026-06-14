# RUNECHAIN — Art asset checklist

Tracking list for the art lane. Tick a box when the asset is imported into
`assets/pixel/` (it'll also show up in `assets/pixel/manifest.json`). Prompts +
exact `import_assets.js` commands: [`ASSET-PROMPTS.md`](ASSET-PROMPTS.md). Canon:
[`DESIGN-BIBLE.md`](DESIGN-BIBLE.md).

All character/enemy art is a **4-frame strip** (idle / walk / attack / hurt) unless
noted. Items marked *optional* already render via a reused sheet — dedicated art just
replaces the placeholder.

## Area 1 — Gracefall Parish
- [ ] `sexton` — Gate Sexton Marrow (mini-boss, 56px) — *optional, reuses `knight`*
- [ ] `mempool` — Mempool Warden (mini-boss, 56px) — *optional, reuses `sorcerer`*
- [ ] `tallow` — Mother Tallow (final boss, 64px) — *optional, reuses `sentinel`*
- [ ] `tallow-echo` — exploding wax-double add (24px) — **new**

## Area 2 — The Shroud Vaults
- [ ] `foreman` — The Debt Foreman (mini-boss, 64px) — **new**
- [ ] `bifurcated` — The Bifurcated Guard (mini-boss, 56px) — **new**
- [ ] `ledgerbound` — The Ledger-Bound (final boss, 80px) — **new**
- [ ] `hollow-ancestor` — bloodline husk (24px) — **new**
- [ ] `canon-auditor` — armored Canon enemy (24px) — **new**
- [ ] `schism-shadow` — fast phasing Schism enemy (24px) — **new**

## Area 3 — The Archive of Attestation
- [ ] `scrivener` — The Scrivener (mini-boss, 64px) — **new**
- [ ] `cascade` — The Cascade Anchor (mini-boss, 72px) — **new**
- [ ] `auditor` — The Auditor (final boss, 80px) — **new**
- [ ] `audit-wolf` — RUNE-draining add (32px) — **new**
- [ ] `relic-shade` — repossessed-relic husk, 2 tints (24px) — **new**

## Tilesets *(static grabs → `import_assets.js tileset`)*
- [ ] `tiles.png` — extend the existing Gracefall atlas in place *(never break existing indices)*
- [ ] `tiles-vaults` — Area 2
- [ ] `tiles-archive` — Area 3
- [ ] `tiles-fx` — shared overlays (ledger-dust, ink-pools, ripples, smoke, redaction bars)

## Item icons
- [ ] `sigil-icons` — 3× 32px: Waxen Testament, Contested Will, Amended Record

---

**Tally:** 9 boss/mini-boss strips (6 brand-new + 3 optional placeholder-replacements),
6 enemy/add strips, 3 new tilesets, 1 icon set.

**Reuse as-is (no art needed):** `player` (+ `player-directions`), `hollow`, `hound`,
`knight`, `sorcerer`, `sentinel`, `phantom`.
