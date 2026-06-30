# Player Event Schema

`player-event-schema.json` defines the versioned event envelope used when the
browser host, engine modes, or server need to exchange player-authored gameplay
events.

The schema is intentionally an event contract, not an authority grant. Events can
describe what the client observed, but the server still owns ledger writes, PvP
outcomes, death, rewards, character state, account state, and season gates.

## Contract

Every event has:

- `schemaVersion`: currently `1.0.0`
- `eventId`: unique producer-generated id
- `idempotencyKey`: optional retry dedupe key
- `type`: namespaced event name such as `combat.creature_defeated`
- `occurredAt`: RFC 3339 timestamp from the producer
- `sequence`: optional per-player monotonic sequence
- `player`: stable player identity fields
- `source`: mode and session context
- `position`: optional transform snapshot
- `state`: optional HP, stamina, level, and cosmetic snapshot
- `payload`: event-specific details
- `metadata`: optional diagnostics that must not drive gameplay decisions

Unknown top-level fields are rejected. Known event families narrow `payload` to a
specific shape so producers fail early when they send ambiguous data.

## Event Types

The first schema version covers the events currently exposed by the no-build engine
and host seams:

- Player lifecycle: `player.spawned`, `player.moved`, `player.damaged`,
  `player.healed`, `player.died`, `player.respawned`
- World/story: `player.interacted`, `quest.progressed`, `quest.completed`,
  `ending.chosen`
- Combat: `combat.attack`, `combat.creature_defeated`
- Engine segments: `segment.entered`, `segment.exited`, `segment.completed`,
  `boss.triggered`, `boss.defeated`
- PvP protocol observations: `pvp.challenge_created`, `pvp.challenge_accepted`,
  `pvp.turn_submitted`, `pvp.result_received`
- Progression and economy observations: `player.item_collected`,
  `player.relic_forged`, `player.stat_leveled`, `economy.rune_mined`,
  `economy.rune_spent`, `economy.gold_spent`, `cosmetic.equipped`

Add new event names conservatively and keep them namespaced as `noun.verb`.

## Example

```json
{
  "schemaVersion": "1.0.0",
  "eventId": "evt-01J8M8F8V2P5Q8E3D1X0M6Y9ZK",
  "idempotencyKey": "local-42-combat-kill-hollow-3",
  "type": "combat.creature_defeated",
  "occurredAt": "2026-06-30T18:42:10.125Z",
  "sequence": 42,
  "player": {
    "id": "local",
    "name": "Recorded",
    "peerId": "peer-7"
  },
  "source": {
    "mode": "town",
    "areaId": "gracefall-parish",
    "questId": "q01",
    "sessionId": "realm-local"
  },
  "position": {
    "x": 820,
    "y": 440,
    "dirX": 1,
    "dirY": 0,
    "moving": false
  },
  "state": {
    "hp": 112,
    "maxHp": 120,
    "stamina": 54,
    "maxStamina": 100,
    "level": 1
  },
  "payload": {
    "targetId": "enemy-hollow-3",
    "targetType": "hollow",
    "damage": 18,
    "rewardRune": 2
  }
}
```

## Producer Rules

- Generate `eventId` before sending the event.
- Reuse `idempotencyKey` when retrying the same logical event.
- Use `sequence` as a monotonic per-player counter when the producer can maintain one.
- Include `position` for movement, combat, interaction, and segment events when available.
- Put gameplay context in `source`, not in `metadata`.
- Treat `metadata` as logging-only; consumers must be able to drop it.

## Authority Boundary

Validated events are still proposals or observations unless they are emitted by the
authoritative server. In connected realms:

- Economy changes must be reconciled with Chainwell server validation.
- PvP events must be reconciled with the `rc:pvp:*` server-owned turn protocol.
- Solo segment completions must be validated before rewards or progression are written.
- Client `player.died`, `boss.defeated`, or `economy.*` events must not be trusted by
  themselves for durable state changes.

## Versioning

`schemaVersion` follows semver:

- Patch: description-only changes or stricter documentation.
- Minor: additive event types or optional properties.
- Major: removed fields, renamed event types, changed required fields, or changed
  payload meaning.

When introducing a major version, keep the old schema available until all connected
clients that can produce it have aged out.
