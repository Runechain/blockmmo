# RUNECHAIN — Art asset checklist

Tracking list for the art lane. Tick a box when the asset is imported into
`assets/pixel/` (it'll also show up in `assets/pixel/manifest.json`). Prompts +
exact `import_assets.js` commands: [`ASSET-PROMPTS.md`](ASSET-PROMPTS.md). Canon:
[`DESIGN-BIBLE.md`](DESIGN-BIBLE.md).

All character/enemy art is a **4-frame strip** (idle / walk / attack / hurt) unless
noted. Items marked *optional* already render via a reused sheet — dedicated art just
replaces the placeholder.

## Area 1 — Gracefall Parish
- [ ] `sexton` — Gate Sexton Marrow (mini-boss, 56px) — *optional dedicated art; runtime reuses `knight`*
- [ ] `mempool` — Mempool Warden (mini-boss, 56px) — *optional dedicated art; runtime reuses `sorcerer`*
- [ ] `tallow` — Mother Tallow (final boss, 64px) — *optional dedicated art; runtime reuses `sentinel`*
- [x] `tallow-echo` — exploding wax-double add (24px) — placeholder imported + wired

## Area 2 — The Shroud Vaults
- [x] `foreman` — The Debt Foreman (mini-boss, 64px) — placeholder imported + wired
- [x] `bifurcated` — The Bifurcated Guard (mini-boss, 56px) — placeholder imported + wired
- [x] `ledgerbound` — The Ledger-Bound (final boss, 80px) — placeholder imported + wired
- [x] `hollow-ancestor` — bloodline husk (24px) — placeholder imported + wired
- [x] `canon-auditor` — armored Canon enemy (24px) — placeholder imported + wired
- [x] `schism-shadow` — fast phasing Schism enemy (24px) — placeholder imported + wired

## Area 3 — The Archive of Attestation
- [x] `scrivener` — The Scrivener (mini-boss, 64px) — placeholder imported + wired
- [x] `cascade` — The Cascade Anchor (mini-boss, 72px) — placeholder imported + wired
- [x] `auditor` — The Auditor (final boss, 80px) — placeholder imported + wired
- [x] `audit-wolf` — RUNE-draining add (32px) — placeholder imported + wired
- [x] `relic-shade` — repossessed-relic husk, 2 tints (24px) — placeholder imported + wired

## Tilesets *(static grabs → `import_assets.js tileset`)*
- [x] `tiles-rogue` — **Kenney Roguelike/RPG pack (CC0)** imported, 1767 tiles, gap-free 912×496 atlas. Source library for surface + vaults terrain/dungeon/doors/props. (`assets/CREDITS.md`)
- [ ] `tiles.png` — extend the existing Gracefall atlas in place *(never break existing indices)*
- [ ] `tiles-vaults` — Area 2 *(can be curated from `tiles-rogue`)*
- [ ] `tiles-archive` — Area 3 *(Escher/phosphorescent — likely custom)*
- [ ] `tiles-fx` — shared overlays (ledger-dust, ink-pools, ripples, smoke, redaction bars) *(custom)*

## Item icons
- [ ] `sigil-icons` — 3× 32px: Waxen Testament, Contested Will, Amended Record

---

**Tally:** 12 placeholder strips imported + wired (6 boss/mini-boss, 6 enemy/add),
3 optional Area 1 dedicated boss replacements still reuse base sheets, 3 new tilesets,
1 icon set.

**Reuse as-is (no art needed):** `player` (+ `player-directions`), `hollow`, `hound`,
`knight`, `sorcerer`, `sentinel`, `phantom`.
