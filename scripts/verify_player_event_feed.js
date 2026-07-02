#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const events = require(path.join(root, 'game', 'events.js'));
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

events.clear();

assert.strictEqual(events.RING_SIZE, 500, 'S2 event ring should retain the last 500 observations');
assert.strictEqual(typeof events.flushEvents, 'function', 'event buffer should expose flushEvents()');

for (let i = 0; i < 505; i++) {
  events.emit(
    'player.moved',
    {
      step: i,
      email: 'recorded@example.com',
      walletAddress: 'So11111111111111111111111111111111111111112',
      authToken: 'secret',
      note: undefined,
    },
    {
      id: 'local-player',
      email: 'recorded@example.com',
      walletAddress: 'So11111111111111111111111111111111111111112',
    },
    { mode: 'town', x: i, y: i + 1, moving: true }
  );
}

const snapshot = events.getBuffer();
assert.strictEqual(snapshot.length, 500, 'ring should drop only the oldest overflow events');
assert.strictEqual(snapshot[0].payload.step, 5, 'oldest retained event should be the sixth emitted event');
assert.strictEqual(snapshot[499].payload.step, 504, 'newest retained event should be the final emitted event');

snapshot.pop();
assert.strictEqual(events.getBuffer().length, 500, 'getBuffer() should return a defensive copy');

const serialized = JSON.stringify(events.getBuffer());
for (const disallowed of ['email', 'walletAddress', 'authToken', 'secret', 'recorded@example.com']) {
  assert(!serialized.includes(disallowed), 'event buffer should not retain sensitive field: ' + disallowed);
}

const flushed = events.flushEvents();
assert.strictEqual(flushed.length, 500, 'flushEvents() should return the retained events');
assert.strictEqual(events.getBuffer().length, 0, 'flushEvents() should clear the internal buffer');
flushed.pop();
assert.strictEqual(events.getBuffer().length, 0, 'mutating a flushed copy should not affect the cleared buffer');

for (const type of [
  'player.spawned',
  'player.moved',
  'player.died',
  'player.respawned',
  'player.interacted',
  'quest.progressed',
  'combat.creature_defeated',
  'ending.chosen',
]) {
  const escapedType = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hasEmit = new RegExp("E\\.emit\\(\\s*['\\\"]" + escapedType + "['\\\"]", 'm').test(indexHtml);
  assert(hasEmit, 'index.html should emit ' + type + ' into the S2 event feed');
}

console.log('player event feed verification passed');
