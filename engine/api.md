# RUNECHAIN engine adapter

These modules are standalone browser ES modules. They do not import `index.html`
state, mutate economy rules, or own balance. The host wires them in by supplying a
small `api` object and a canvas context.

## Mode interface

Every mode implements:

```js
{
  enter(ctx, api),
  exit(),
  update(dt, input),
  render(ctx, camera)
}
```

`engine/mode.js` exports `createModeManager(initialMode, ctx, api)`, which swaps the
active mode and forwards `update` / `render`.

`camera` is a mutable viewport rectangle:

```js
{ x, y, w, h }
```

`x` and `y` are the world-space top-left of the visible viewport for these engines.
If the current host camera remains center-based, the integration adapter should
translate at the seam.

## Required host adapter

```js
const api = {
  player: {
    id, name,
    x, y, vx, vy, dirX, dirY, moving,
    hp, sta, stamina,
    spendStamina(reason, data),
    damage(amount, source),
    regen(amount, dt, source),
    getMeleeDamage(reason),
    onKnockback(source)
  },

  assets: {
    drawSheet(key, x, y, frame, scale)
  },

  net: {
    id,
    send(message),
    on(type, handler)
  },

  chain: {},
  camera: { x, y, w, h },

  log(message),
  onDamage(amount, source),
  onJump(data),
  onMeleeHit(targetOrHitbox, data),
  onCreatureDefeated(creature, data),
  onWaveSpawn(wave, data),
  onZoneCleared(zoneId, data),
  onExit(exitId, data),
  onBossTrigger(bossId, data),
  onDuelChallenge(message, data),
  onDuelAccepted(message, data),
  onDuelResult(result, data)
};
```

Only `player.damage`, `player.spendStamina`, `player.regen`, `player.getMeleeDamage`,
`net.send`, `net.on`, and `onBossTrigger` are behaviorally important. Everything
else is optional and guarded.

The engines update `api.player.x/y/vx/vy/dirX/dirY/moving` as a convenience so the
host can keep one player record. The host remains authoritative for stats, stamina,
damage mitigation, death, drops, RUNE, Gold, relics, and Chainwell writes.

## Shared-world presence while in solo segments (Q-F2b)

When a player leaves town for a solo segment (`platformer`, `battlefield`, `turnbased`,
or a sequenced boss encounter), the shared-world relay keeps their last town transform
visible instead of making the avatar vanish or freezing a normal-looking character.

The host sends normal state messages with a presence mode:

```js
{ t:"state", id, name, skin, x, y, z, yaw, moving, mode:"town" }
{ t:"state", id, name, skin, x, y, z, yaw, moving:false, mode:"encounter", encounter:"platformer" }
```

Remote town renderers treat any non-`town` mode as an **In Encounter** marker at that
last shared-world position. This communicates that the player is busy in a solo/instanced
segment without implying real-time town movement or leaving stale ghost duplicates.

## Input shape

The playground sends this action shape. The host can map keys, gamepad, or UI to it:

```js
{
  left, right, up, down,
  moveLeft, moveRight, moveUp, moveDown,
  jump, jumpPressed, jumpReleased,
  attack, attackPressed,
  confirmPressed,
  challenge, challengePressed,
  forfeit, forfeitPressed,
  peerId
}
```

Platformer uses horizontal movement, jump, and attack. Battlefield uses four-way
movement, attack, challenge, and forfeit.

## Platformer level JSON

```js
{
  id, name, width, height,
  spawn: { x, y },
  physics: {},
  platforms: [
    { id, x, y, w, h, type: "solid" },
    { id, x, y, w, h, type: "oneWay" },
    { id, x, y, w, h, type: "solid", vx, vy, minX, maxX, minY, maxY }
  ],
  hazards: [
    { id, type: "damage", x, y, w, h, damage },
    { id, type: "slow", x, y, w, h, slow },
    { id, type: "sticky", x, y, w, h, slow, staminaCost },
    { id, type: "stun", x, y, w, h, stun, damage },
    { id, type: "knockback", x, y, w, h, damage, knockX, knockY },
    { id, type: "projectile", x, y, w, h, interval, speedX, speedY, damage }
  ],
  exit: { id, x, y, w, h },
  bossTrigger: {
    id, x, y, w, h,
    lock: { x, y, w, h }
  }
}
```

Boss trigger behavior: when the player enters `bossTrigger`, the platformer locks
the camera to `lock` and calls `api.onBossTrigger(id, data)` once.

## Battlefield level JSON

```js
{
  id, name, width, height,
  spawn: { x, y },
  physics: {},
  creatures: {
    hollow: { hp, speed, damage, reach, radius, color },
    hound: { hp, speed, damage, reach, radius, color },
    default: { hp, speed, damage, reach, radius, color }
  },
  zones: [
    { id, x, y, w, h, regen, clearFor }
  ],
  waves: [
    {
      id, at, zoneId,
      spawns: [
        { type, x, y, count, zoneId }
      ]
    }
  ]
}
```

When every creature assigned to a spawned zone is cleared, the zone becomes a
temporary safe zone until `safeUntil`. While the player stands inside it, the mode
calls `api.player.regen(zone.regen, dt, data)`.

## PvP turn arbitration messages (Q-S2c)

Battlefield PvP is opt-in and contains no power transfer or loss. The battlefield mode
still initiates the duel, but live connected realms do not relay damage, forfeit, or
result claims from clients. The server owns the accepted duel session, mints the canonical
`duelId`, chooses the first actor deterministically (challenger first for this first
protocol slice), computes every turn, and sends targeted frames to the two participants.
Observers do not receive duel state.

Introduced `t:` message types:

- `rc:pvp:challenge`
- `rc:pvp:challenge:created`
- `rc:pvp:accept`
- `rc:pvp:decline`
- `rc:pvp:turn:submit`
- `rc:pvp:turn:forfeit`
- `rc:pvp:turn:state`
- `rc:pvp:result`
- `rc:pvp:error`

Shapes:

```js
// Client input. Server ignores client-authored from/actor/damage/result fields.
{ t:"rc:pvp:challenge", to, areaId }
{ t:"rc:pvp:accept", duelId }
{ t:"rc:pvp:decline", duelId, from, to, reason }
{ t:"rc:pvp:turn:submit", duelId, turn, action, submissionId }
{ t:"rc:pvp:turn:forfeit", duelId, turn, submissionId }

// Server output.
{ t:"rc:pvp:challenge:created", duelId, from, to, areaId }
{ t:"rc:pvp:challenge", duelId, from, to, areaId }
{ t:"rc:pvp:accept", duelId, from, to, sequence, challengerPeerId, challengedPeerId,
  turn, actorPeerId, deadlineAt, state }
{ t:"rc:pvp:turn:state", duelId, sequence, turn, actorPeerId, action, submissionId,
  events, nextTurn, nextActorPeerId, deadlineAt, state }
{ t:"rc:pvp:result", duelId, sequence, turn, winner, loser, reason, action,
  submissionId, state }
{ t:"rc:pvp:error", duelId, error, expectedTurn?, expectedActorPeerId? }
```

`action` is currently `strike`, `guard`, `focus`, or `flee`. Ordering is strict
alternation by `actorPeerId`; stale turns, wrong actors, repeated `submissionId`s, and
repeated `(duelId, actor, turn)` submissions are rejected without broadcasting another
state frame. Each active turn has `deadlineAt`; `server.js` exposes a testable
`sweepPvpTurnTimeouts()` seam and the live stale-client sweep also resolves overdue
turns. Timeout and explicit `flee` both produce a server-authored terminal
`rc:pvp:result`.

For participant-targeted accept frames, `from` is the receiver's opponent and `to` is the
receiver. The shared `challengerPeerId` / `challengedPeerId` fields preserve the canonical
duel roles.

Legacy `rc:pvp:hit`, `rc:pvp:forfeit`, and client-authored `rc:pvp:result` remain blocked
with `authoritative_message_requires_server`.

## Server authority boundary

The engines never mint, debit, credit, drop, price, or hardcode RUNE/Gold outcomes.
They surface events (`onCreatureDefeated`, `onZoneCleared`, `onBossTrigger`,
`onDuelResult`) and the host/server decides whether anything should happen economically.
Connected realms enforce the S2/U7 authority split in `server.js`:

- **Authoritative:** economy state, RUNE credit/debit, leveling, death, character/season
  state, and PvP outcomes are server-owned. Raw client `block` messages and client-authored
  PvP hit/forfeit/result claims are rejected; ledger changes append only from server-issued
  mining candidates re-validated with `validateBlockCandidate`.
- **Validated:** solo segment outcomes can run client-side for responsiveness, but any
  ledger-touching reward must be proposed through `segment:complete`. The server validates
  the outcome shape/proof, builds the exact Chainwell transaction, then accepts only the
  matching mined `mine:submit` block.
- **Non-authoritative:** shared-world movement remains a casual relay. The server
  canonicalizes identity (`peerId`, `characterId`, display name) but does not treat movement
  as economy or combat authority.

Authority policy is exported as `AUTHORITY_TIERS` for deterministic verification and server
tests. Client-authored PvP result/hit/forfeit messages stay rejected even after the
server-arbitrated turn protocol exists; clients may only submit turns into the active
server-owned duel session.

## Chainwell block validation rules (Q-S2a)

Connected realms use a server-canonical Chainwell. Clients do not submit arbitrary blocks
and the server does not adopt a longer client chain. Raw `block` messages are rejected with
`client_block_submission_disabled`; accepted ledger writes enter only through server-issued
`mine:work` followed by `mine:submit`.

The exported `CHAINWELL_BLOCK_RULES` contract documents the live server policy:

- Raw client blocks are disabled.
- The only accepted connected-realm block submission is `server-issued-mine-submit`.
- Fork policy is `server-canonical-tip`; a submitted block must extend the current server
  tip, not a client fork.
- Candidate identity is the server-issued `index`, `prev`, `time`, and `txs` payload.
- The browser contributes only proof fields: `nonce` and `hash`.
- `server.js` rebuilds the accepted block from the pending server candidate plus those proof
  fields, so extra top-level submitted fields are stripped before persistence or broadcast.
- Final validation is shared `validateBlockCandidate`: safe integer index/time/nonce,
  parent hash matching the server tip, monotonic timestamp with future-skew guard,
  recomputed lowercase 64-character hash, and the configured difficulty prefix.
- Replayed accepted candidate IDs return `mining_candidate_replayed`; stolen, unknown, or
  expired candidate IDs return `unknown_mining_candidate`.

## Turn-based RPG battle mode (`turnbased.js`, PRD F2.4)

`createTurnBasedMode(encounter)` returns the same `{enter, exit, update, render, getState}`
interface. Two combatants, initiative-selected first actor, alternating turns, and a
Strike/Guard/Focus/Flee command menu.
Reads the action-shape input (Up/Down navigate, confirm = attack/jump/confirm) with internal
rising-edge detection, so the host stays source-agnostic (A3). Damage uses
`api.player.getMeleeDamage('turnbased')`; Focus is gated by `api.player.spendStamina`.
Resolution is surfaced through `api.onDuelResult(result)` and `api.onExit(id)`.

```js
{ id, name,
  opponent:{ name, hp, attack, defense?, color?, initiative?, speed? }, // scripted/AI foe
  hero?:{ initiative?, speed? },
  initiative?: "hero"|"foe"|{ hero?, foe?, first? },
  firstTurn?: "hero"|"foe",                            // explicit override when needed
  peerId?, duelId? }                                   // set => resolved from an rc:pvp duel (F2.3)
```

`getState().turn` exposes `{ number, round, actor, pendingAction, submittedAction, initiative }`.
Hero wins initiative ties, so existing encounters remain hero-first unless configured otherwise.

PvP resolution (F2.3): the real-time battlefield initiates via `rc:pvp:challenge`/`accept`;
on `api.onDuelAccepted`, the host swaps the mode manager into the turn-based mode with the
peer as opponent and preserves the server `duelId`, actor, turn, and state snapshot. When
`peerId`/`duelId`, `actorPeerId`, a server `state` snapshot, and `api.net.send/on` are present, `turnbased.js` submits
`rc:pvp:turn:submit` and waits for server `rc:pvp:turn:state` / `rc:pvp:result`. Without a
server adapter, scripted boss phases and the solo demo continue to resolve locally.

## Segment sequencer (`sequencer.js`, PRD F3)

`createSegmentSequencer(script)` sits ABOVE the mode manager (F3.2). A boss is a data-driven
SCRIPT of ordered segments, each naming a mode + a level/encounter payload + a completion
event. On completion the sequencer plays a brief diegetic transition beat (F3.3) and advances,
telling the host to swap the active mode. The default wipe presents "Gate slams shut." and can
be overridden per script or segment with `transitionText`. Segment payloads reuse the
platformer/battlefield/turnbased formats unchanged (F3.4).

```js
{ id, name, beat?, transitionText?,
  segments:[ { mode:'platformer'|'battlefield'|'turnbased', name?, payload, beat?, beatText?,
               transitionText?, complete:{ event } } ] }
```

Completion (Q-F3a) reuses the engines' seam events, forwarded by the host via
`sequencer.segmentEvent(type, payload)`:

- platformer  → `'boss'` (from `onBossTrigger`) or `'exit'` (from `onExit`)
- battlefield → `'cleared'` (host detects all waves done + creatures dead)
- turnbased   → `'duel'` (from `onDuelResult`)

When the last segment completes the sequencer calls `api.onBossComplete(script, result)`.
Carry-over (Q-F3b): HP/stamina persist across segments by default.

Host integration: drive `sequencer.update(dt)` and, when `!sequencer.isBeat()`, the active
sub-mode through the mode manager; render `sequencer.render(ctx, camera)` during a beat,
otherwise the sub-mode (see the wiring in `index.html`, debug key `K`).
