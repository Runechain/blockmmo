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

## PvP relay messages

Battlefield PvP is opt-in and contains no power transfer or loss. The host relay only
broadcasts messages; the mode's adapter listens by `t`.

Introduced `t:` message types:

- `rc:pvp:challenge`
- `rc:pvp:accept`
- `rc:pvp:decline`
- `rc:pvp:state`
- `rc:pvp:hit`
- `rc:pvp:forfeit`
- `rc:pvp:result`

Shapes:

```js
{ t:"rc:pvp:challenge", duelId, from, to, areaId }
{ t:"rc:pvp:accept", duelId, from, to }
{ t:"rc:pvp:decline", duelId, from, to, reason }
{ t:"rc:pvp:state", duelId, from, to, x, y, hp, stamina }
{ t:"rc:pvp:hit", duelId, from, to, amount, at }
{ t:"rc:pvp:forfeit", duelId, from, to }
{ t:"rc:pvp:result", duelId, from, winner, loser, reason }
```

The current `server.js` dumb relay can pass these through unchanged once the host
adapter exposes `net.send` and routes incoming messages to `net.on(type, handler)`.

## Economy boundary

The engines never mint, debit, credit, drop, price, or hardcode RUNE/Gold outcomes.
They surface events (`onCreatureDefeated`, `onZoneCleared`, `onBossTrigger`,
`onDuelResult`) and the host decides whether anything should happen economically.
