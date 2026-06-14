# ⛓ RUNECHAIN

A tiny **Soulslike MMO** that runs in the browser, with a **real on-chain economy** —
monsters drop RUNE, your own browser mines it into a genuine SHA-256 proof-of-work
chain, and you spend it (recorded as on-chain transactions) to level up at a Site of
Grace. Bosses mint unique **Great Runes** as one-of-a-kind on-chain assets.

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
| Mouse | Look (click to capture) |
| `Shift` | **Hold** to sprint · **tap** to dodge-roll (i-frames, costs stamina) |
| `Q` | Lock on / release the nearest foe |
| `Space` | Jump |
| Click / `L` | Attack (costs stamina) |
| `G` | Rest at Site of Grace / level up (spends **RUNE**) |
| `B` | Open the **Wardrobe** (buy/equip cosmetic skins with **Gold**) |
| `M` | Toggle wallet |

**Combat feel:** rolling grants brief invulnerability (i-frames) — time it against a swing
to take no damage. Attacks, rolls and sprinting all draw from one stamina bar that pauses
before refilling, so you can't spam. Taking a hit briefly staggers you (slowed, can't
attack) — roll to break out. With a target locked, you strafe around it and your swings
and rolls orient to it.

## Economy

Two currencies, and the line between them is the whole design:

- **RUNE** — the grind currency. Drops from kills, mined into the proof-of-work chain.
  **Power is bought only with RUNE** (leveling at the Site of Grace). It is *never* for sale.
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
chance-based spending. Every lever — rates, the split, skin prices — lives in the `ECON`
config and `SKINS` table in [`index.html`](index.html).

> The wrapped-SOL purchase is currently a **devnet mock** — it mints Gold and records the
> split on-chain locally, with **no real funds**. Swapping `Econ.buyGoldWithSol()` for a real
> SPL token transfer is the seam to go live, and should not happen without proper legal/
> compliance review first (selling cosmetics for real crypto still has tax/jurisdiction
> implications; a tradeable secondary market would reopen far more).

## What's in it

- **Mechanically-real 3D world** — Three.js terrain with slopes, real-time shadows,
  gradient sky, fog; gravity, jump, ground collision, stamina-gated sprint.
- **Animated characters** — a multi-model glTF pipeline (`SkeletonUtils` + animation
  mixers) with auto size-normalization and fuzzy animation-clip remapping, so you can
  mix and match free CC0 model packs. Falls back to a procedural rig if none are present.
- **Monster roster** — Hollow, Rabid Hound, Fallen Knight, ranged Hollow Sorcerer, and
  the Erdtree Sentinel boss, with size-aware hitboxes.
- **Soulslike combat** — dodge-roll with invulnerability frames, a shared stamina bar
  gating attacks / rolls / sprint, hit-stagger recovery, and lock-on strafing.
- **Souls-style levelling** — spend confirmed RUNE on Vigor / Endurance / Strength (power is grind-only).
- **Cosmetic economy** — a Gold-funded Wardrobe of soulbound skins (no power, no loot boxes),
  with two one-way on-ramps (RUNE→Gold, or wrapped-SOL split 50% prize / 35% burn / 15% fee).
  Equipped skins sync over the network, so other Tarnished see what you're wearing.
- **A real blockchain economy** — from-scratch SHA-256 proof-of-work chain (verified
  against Node's `crypto`), credits from kills, on-chain debits when levelling,
  unique Great Rune assets, and pending-debit anti-double-spend accounting. Blocks
  gossip across the network so the realm converges on one ledger.
- **MMO server** — `server.js` is an authoritative relay implementing WebSocket and
  static serving by hand, with **zero dependencies**.

## Add your own character art

Drop CC0 GLB models into `models/` (see `models/README.md` for a curated wild mix from
Poly Pizza). The loader auto-fits size, remaps animations, and tints each role.

## Deploy

See `DEPLOY-AWS.md` for hosting paths (Lightsail/EC2, ECS, App Runner). A `Dockerfile`
is included. The client connects to the WebSocket on the same origin, so it works
behind any host/port.

## Project layout

```
index.html      # the whole game client
server.js       # zero-dependency Node MMO relay + static server
models/         # drop your GLB character models here
Dockerfile      # containerized deploy
DEPLOY-AWS.md   # hosting guide
```

## License

Code is MIT (see `LICENSE`). Built on [three.js](https://threejs.org) (MIT).
Recommended character models are CC0 from [Quaternius](https://poly.pizza/u/Quaternius).

## Disclaimer

This is a game prototype. The blockchain is a pure in-browser proof-of-work mechanic
for gameplay; it is not a cryptocurrency, holds no monetary value, and involves no
wallet or real funds.
