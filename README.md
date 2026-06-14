# ⛓ RUNECHAIN

A tiny **pixel Soulslike MMO** set in **Gracefall Parish**: a ruined, cozy-gothic
top-down RPG space with a real on-chain economy. Monsters drop RUNE, your own browser
mines it into a genuine SHA-256 proof-of-work chain, and you spend it (recorded as
on-chain transactions) to level up at a Site of Grace. Bosses mint unique **Great
Runes** as one-of-a-kind on-chain assets.

It's a single HTML file for the client and one zero-dependency Node file for the
realm server. No build step, no framework, no `npm install`.

> Research/prototype project. The "crypto" is an in-game proof-of-work mechanic only —
> no wallet, no token of value, no real money.

## Run it

**Single player (instant):** open `index.html` in a browser.

**True MMO (one command, no installs):**

```bash
node server.js
```

Then open **http://localhost:8080** in two or more tabs/machines. Every connected
browser shares one world and one ledger.

## Controls

| Key | Action |
|-----|--------|
| `WASD` | Move |
| Mouse | Aim |
| `Shift` | Dash with brief i-frames |
| `Q` | Target the nearest foe |
| Click / `Space` / `L` | Attack (costs stamina) |
| `G` | Rest at Site of Grace / level up / forge RUNE relics |
| `B` | Open the **Wardrobe** (buy/equip cosmetic skins with **Gold**) |
| `M` | Toggle wallet |

**Combat feel:** the demo opens in a safe Grace zone, with one weak Hollow outside the
light. Enemies escalate through story gates instead of dogpiling the spawn. Movement is
faster now, dashing grants brief invulnerability, attacks spend stamina, and target lock
turns your swings toward the selected foe.

## Economy

Two currencies, and the line between them is the whole design:

- **RUNE** — the grind currency. Drops from kills, mined into the proof-of-work chain.
  **Power is bought only with RUNE** (leveling and soulbound relics at the Site of Grace).
  It is *never* for sale.
- **Gold** — the spend currency for **cosmetics only** (skins in the Wardrobe). No power,
  ever. Skins are **soulbound** (non-transferable), bought by **direct purchase** — no loot
  boxes, no randomness.

Two one-way on-ramps fill Gold (there is **no cash-out**):

1. **Grind → convert:** turn confirmed RUNE into Gold at a flat rate.
2. **Buy with wrapped SOL:** each purchase splits **50% to the skill-prize pool · 35% burned ·
   15% platform fee**, all routed on-chain. This 15% is the *only* fee in the whole game —
   grinding, converting, spending, and account trades are all free.

Because real money can only ever buy *looks*, the free grind always reaches every power
tier (just slower than a payer would gear cosmetically), and there's no pay-to-win and no
chance-based spending. Every lever — rates, the split, skin prices, and RUNE relics —
lives in the `ECON`, `SKINS`, and `RELICS` tables in [`index.html`](index.html).

> The wrapped-SOL purchase is currently a **devnet mock** — it mints Gold and records the
> split on-chain locally, with **no real funds**. Swapping `Econ.buyGoldWithSol()` for a real
> SPL token transfer is the seam to go live, and should not happen without proper legal/
> compliance review first (selling cosmetics for real crypto still has tax/jurisdiction
> implications; a tradeable secondary market would reopen far more).

## What's in it

- **Gracefall Parish art direction** — a higher top-down pixel view with old parish road
  tiles, mossy grass, shrine rubble, grave clusters, candles, brambles, cursed soil, and
  warm Grace light against colder outer-road corruption.
- **Pixelorama-ready tile and sprite sheets** — deterministic PNG assets in
  `assets/pixel/`, including the terrain atlas plus player, Hollow, Hound, Knight,
  Sorcerer, Sentinel, and Phantom strips.
- **Monster roster** — Hollow, Red Hound, Fallen Knight, ranged Hollow Sorcerer, and
  the Erdtree Sentinel boss, with nameplates, health bars, and wind-up tells.
- **Soulslike combat** — dash i-frames, stamina-gated attacks, target lock, visible
  attack arcs, safe Grace start, and limited simultaneous attackers.
- **Souls-style levelling and relics** — spend confirmed RUNE on Vigor / Endurance /
  Strength or forge soulbound relics (power is grind-only).
- **Data-driven Act 1 story seam** — the `STORY` block chains quests from Gracefall
  Parish, to the Chainwell Ledger, to the Sentinel Road. Paste a richer storyline into
  `window.RUNECHAIN_STORY` later without changing the game loop.
- **Cosmetic economy** — a Gold-funded Wardrobe of soulbound skins (no power, no loot boxes),
  with two one-way on-ramps (RUNE→Gold, or wrapped-SOL split 50% prize / 35% burn / 15% fee).
  Equipped skins sync over the network, so other Tarnished see what you're wearing.
- **A real blockchain economy** — from-scratch SHA-256 proof-of-work chain (verified
  against Node's `crypto`), credits from kills, on-chain debits when levelling,
  unique Great Rune assets, and pending-debit anti-double-spend accounting. Blocks
  gossip across the network so the realm converges on one ledger.
- **MMO server** — `server.js` is an authoritative relay implementing WebSocket and
  static serving by hand, with **zero dependencies**.

## Edit the pixel art

Open the PNGs in `assets/pixel/` with Pixelorama or any pixel editor. `tiles.png` is a
16px terrain atlas; character sheets have four frames in one row: idle, walk,
attack/cast, and hurt/death. Re-run `node scripts/generate_pixel_assets.js` only when
you want to regenerate the deterministic starter assets; hand-edited art should be kept
as the source of truth once approved.

## Deploy

See `DEPLOY-AWS.md` for hosting paths (Lightsail/EC2, ECS, App Runner). A `Dockerfile`
is included. The client connects to the WebSocket on the same origin, so it works
behind any host/port.

## Project layout

```
index.html      # the whole game client; pixel renderer, story, relics, combat
server.js       # zero-dependency Node MMO relay + static server
assets/pixel/   # editable Pixelorama-ready tile atlas and sprite strips
scripts/        # deterministic local pixel asset generator
models/         # legacy optional GLB notes from the old 3D path
Dockerfile      # containerized deploy
DEPLOY-AWS.md   # hosting guide
```

## License

Code is MIT (see `LICENSE`). The current web-pixel demo has no runtime art or engine
dependency. Generated starter sprites are deterministic project assets.

## Disclaimer

This is a game prototype. The blockchain is a pure in-browser proof-of-work mechanic
for gameplay; it is not a cryptocurrency, holds no monetary value, and involves no
wallet or real funds.
