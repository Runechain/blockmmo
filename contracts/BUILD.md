# Building the RUNECHAIN programs

## Prerequisites

- Rust + cargo (host)
- Solana CLI (`solana --version`) and the SBF platform-tools (`cargo-build-sbf`)
- Anchor (optional, via `avm`) — `cargo build-sbf` builds the programs without it

## Build

```bash
cd contracts
cargo build-sbf
```

Outputs go to `contracts/target/deploy/` (`.so` + IDL JSON).

### Verification status & toolchain

**The code is verified** — both programs type-check clean via the host toolchain
(`cargo check`, cargo 1.91, which parses edition 2024): only deprecation/unused warnings, no
errors.

The **SBF deploy build** (`cargo build-sbf`, which produces the `.so`) needs platform-tools whose
bundled cargo is **≥ 1.85**, because the current Solana dependency tree pulls crates that moved
to **Rust edition 2024** (`blake3 1.8 → constant_time_eq 0.4`, `indexmap → hashbrown 0.17`,
`zeroize 1.9`, …). The installed tools are just short:

| platform-tools | bundled cargo | edition2024 |
|---|---|---|
| `v1.43` (default) | 1.79 | ✗ |
| `v1.50` | 1.84 | ✗ (one minor short) |
| a release bundling cargo ≥ 1.85 | ≥ 1.85 | ✓ |

To produce deployable artifacts, install newer platform-tools:

```bash
cargo build-sbf --tools-version <release-with-cargo-1.85+>
```

This is an environment/toolchain version requirement, **not** a code issue — `cargo check`
already proves the programs compile. (Go-live is legal-gated regardless, so a deployable `.so`
is not the current gate.)

## Program keypairs

Live in `contracts/keys/` (gitignored — deploy secrets). The pubkeys are wired into each
program's `declare_id!` and `Anchor.toml`. If you rotate them, update both (or `anchor keys sync`).

## Deploy — **gated**

Do **not** deploy to a production cluster until the **legal/compliance sign-off** (F6.3 / F7)
is complete. Both programs ship `paused = true`; even once deployed, settlement and sales stay
off until an admin calls `set_paused(false)` after sign-off.

```bash
# localnet / devnet only, for development:
solana program deploy target/deploy/runechain_settlement.so
solana program deploy target/deploy/runechain_character.so
```

## Tests

TODO: Anchor/TS integration tests under `contracts/tests/` (happy paths + the gate reverts:
purchase while paused, list mid-season, list with tasks unfinished, buy releases escrow,
seller restart flag).
