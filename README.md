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
| `Shift` | Sprint |
| `Space` | Jump |
| Click / `L` | Attack |
| `G` | Rest at Site of Grace / level up |
| `M` | Toggle wallet |

## What's in it

- **Mechanically-real 3D world** — Three.js terrain with slopes, real-time shadows,
  gradient sky, fog; gravity, jump, ground collision, stamina-gated sprint.
- **Animated characters** — a multi-model glTF pipeline (`SkeletonUtils` + animation
  mixers) with auto size-normalization and fuzzy animation-clip remapping, so you can
  mix and match free CC0 model packs. Falls back to a procedural rig if none are present.
- **Monster roster** — Hollow, Rabid Hound, Fallen Knight, ranged Hollow Sorcerer, and
  the Erdtree Sentinel boss, with size-aware hitboxes.
- **Souls-style levelling** — spend confirmed RUNE on Vigor / Endurance / Strength.
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
