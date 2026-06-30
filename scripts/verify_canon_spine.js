'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createCanonStore } = require('../game/canon.js');

function tmpFile() {
  return path.join(os.tmpdir(), `test-canon-${Math.random().toString(36).slice(2)}.json`);
}

// ─── 1. seedS1 initialises canon state on first run ─────────────────────────
{
  const f = tmpFile();
  const store = createCanonStore({ canonFile: f, seasonId: 's1' });
  store.seedS1();

  const state = store.getCanonState();
  assert(state, 'getCanonState should return an object');
  assert(typeof state.dwindlingLevel === 'number', 'dwindlingLevel should be a number');
  assert(Array.isArray(state.coldHearths), 'coldHearths should be an array');
  assert(Array.isArray(state.storyLog) && state.storyLog.length > 0, 'storyLog should be non-empty after seed');
  assert.strictEqual(state.dwindlingLevel, 0, 'S1 seeds at dwindlingLevel 0');
  console.log('  ok  seedS1 — initial state correct');

  // Idempotent: calling seedS1 again should not add a second season_start.
  store.seedS1();
  const events = store.getEvents();
  const starts = events.filter(e => e.event_type === 'season_start' && e.season_id === 's1');
  assert.strictEqual(starts.length, 1, 'seedS1 is idempotent — only one season_start per season');
  console.log('  ok  seedS1 — idempotent');

  fs.unlinkSync(f);
}

// ─── 2. appendEvent — story_beat appends to storyLog ────────────────────────
{
  const f = tmpFile();
  const store = createCanonStore({ canonFile: f, seasonId: 's1' });
  store.seedS1();

  store.appendEvent({ event_type: 'story_beat', event_data: { text: 'The Warden fell.' } });
  store.appendEvent({ event_type: 'story_beat', event_data: { text: 'The Moor remembered.' } });

  const log = store.getStoryLog();
  assert(log.includes('The Warden fell.'), 'storyLog should include story_beat text');
  assert(log.includes('The Moor remembered.'), 'storyLog should include second beat');
  console.log('  ok  story_beat events appear in storyLog');

  fs.unlinkSync(f);
}

// ─── 3. halving increments dwindlingLevel and updates coldHearths ──────────
{
  const f = tmpFile();
  const store = createCanonStore({ canonFile: f, seasonId: 's1' });
  store.seedS1();

  store.appendEvent({
    event_type: 'halving',
    event_data: {
      halvingEffect: { coldHearths: ['marginalia', 'lastlight'], canonAppend: 'Two fires went cold.' },
    },
  });

  const state = store.getCanonState();
  assert.strictEqual(state.dwindlingLevel, 1, 'halving increments dwindlingLevel to 1');
  assert(state.coldHearths.includes('marginalia'), 'marginalia marked cold after halving');
  assert(state.coldHearths.includes('lastlight'), 'lastlight marked cold after halving');
  assert(state.storyLog.includes('Two fires went cold.'), 'canonAppend appears in storyLog');
  console.log('  ok  halving event — dwindlingLevel and coldHearths updated');

  // Second halving
  store.appendEvent({
    event_type: 'halving',
    event_data: { halvingEffect: { coldHearths: [], canonAppend: 'Second halving passed.' } },
  });
  assert.strictEqual(store.getDwindlingLevel(), 2, 'second halving → dwindlingLevel 2');
  console.log('  ok  two halvings → dwindlingLevel 2');

  fs.unlinkSync(f);
}

// ─── 4. isHearthCold ────────────────────────────────────────────────────────
{
  const f = tmpFile();
  const store = createCanonStore({ canonFile: f, seasonId: 's1' });
  store.seedS1();

  assert(!store.isHearthCold('hearthlight'), 'hearthlight is warm at start');

  store.appendEvent({ event_type: 'hearth_dimmed', event_data: { hearthId: 'hearthlight' } });
  assert(store.isHearthCold('hearthlight'), 'hearthlight is cold after hearth_dimmed event');
  assert(!store.isHearthCold('forklight'), 'forklight still warm');
  console.log('  ok  isHearthCold correct after hearth_dimmed');

  fs.unlinkSync(f);
}

// ─── 5. appendEvent throws on duplicate season_start (append-only invariant) ─
{
  const f = tmpFile();
  const store = createCanonStore({ canonFile: f, seasonId: 's1' });
  store.seedS1();

  assert.throws(
    () => store.appendEvent({ event_type: 'season_start', season_id: 's1', event_data: {} }),
    /append-only|season_start/,
    'second season_start for same season_id must throw'
  );
  console.log('  ok  append-only invariant — duplicate season_start throws');

  fs.unlinkSync(f);
}

// ─── 6. appendEvent throws on unknown event_type ────────────────────────────
{
  const f = tmpFile();
  const store = createCanonStore({ canonFile: f, seasonId: 's1' });
  store.seedS1();

  assert.throws(
    () => store.appendEvent({ event_type: 'rogue_write', event_data: {} }),
    /unknown event_type/,
    'unknown event_type must throw'
  );
  console.log('  ok  unknown event_type rejected');

  fs.unlinkSync(f);
}

// ─── 7. getCanonState schema shape ──────────────────────────────────────────
{
  const f = tmpFile();
  const store = createCanonStore({ canonFile: f, seasonId: 's1' });
  store.seedS1();

  const state = store.getCanonState();
  assert('dwindlingLevel' in state, 'canonState has dwindlingLevel');
  assert('coldHearths' in state, 'canonState has coldHearths');
  assert('storyLog' in state, 'canonState has storyLog');
  assert(state.dwindlingLevel >= 0 && state.dwindlingLevel <= 10, 'dwindlingLevel in [0,10]');
  console.log('  ok  getCanonState matches canonState schema shape');

  fs.unlinkSync(f);
}

// ─── 8. Persistence: reload from disk returns consistent state ──────────────
{
  const f = tmpFile();
  const store1 = createCanonStore({ canonFile: f, seasonId: 's1' });
  store1.seedS1();
  store1.appendEvent({ event_type: 'story_beat', event_data: { text: 'Persistence check.' } });

  const store2 = createCanonStore({ canonFile: f, seasonId: 's1' });
  const log = store2.getStoryLog();
  assert(log.includes('Persistence check.'), 'story_beat survives a fresh store load');
  console.log('  ok  persisted events survive reload');

  fs.unlinkSync(f);
}

console.log('\nverify_canon_spine: all checks passed');
