'use strict';
// Append-only canon event log — the persistent world spine that persists across seasons.
// Storage: a single JSON flat file (same zero-dep pattern as ledger.json / accounts.json).
//
// Event types:
//   season_start  — initial canon state for a new season (one per season_id)
//   story_beat    — chronicle entry from in-game event (appends to storyLog)
//   halving       — season transition; coldHearths updated, dwindlingLevel incremented
//   region_added  — world expands with a new region
//   hearth_dimmed — a specific hearth goes cold

const fs = require('fs');
const path = require('path');

const VALID_TYPES = new Set(['season_start', 'story_beat', 'halving', 'region_added', 'hearth_dimmed']);

// S1 bootstrap — seeded on first run.
const S1_INITIAL_STATE = {
  dwindlingLevel: 0,
  coldHearths: [],
  storyLog: ['Season 1 begins. Gracefall Parish holds its first hearth-light.'],
};

function createCanonStore({ canonFile, seasonId }) {
  canonFile = canonFile || path.join(__dirname, '..', 'canon.json');
  seasonId = seasonId || 's1';

  // Internal mutable state — events array loaded from disk.
  let store = null;

  function load() {
    if (store) return;
    try {
      const raw = fs.readFileSync(canonFile, 'utf8');
      store = JSON.parse(raw);
      if (!Array.isArray(store.events)) store = null;
    } catch (_) {
      store = null;
    }
    if (!store) store = { version: 1, events: [] };
  }

  function save() {
    const tmp = canonFile + '.tmp';
    fs.mkdirSync(path.dirname(canonFile), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2) + '\n');
    fs.renameSync(tmp, canonFile);
  }

  // Seed S1 canon state on first run (idempotent).
  function seedS1() {
    load();
    const alreadySeeded = store.events.some(
      e => e.event_type === 'season_start' && e.season_id === 's1'
    );
    if (alreadySeeded) return;
    const event = {
      id: nextId(),
      season_id: 's1',
      event_type: 'season_start',
      event_data: { canonState: S1_INITIAL_STATE },
      block_height: null,
      created_at: Date.now(),
    };
    store.events.push(event);
    save();
  }

  function nextId() {
    if (!store.events.length) return 1;
    return Math.max(...store.events.map(e => e.id)) + 1;
  }

  // Append a new event. Throws if it would violate the append-only invariant:
  //   - Unknown event_type
  //   - Attempting a second season_start for the same season_id (seasons start once)
  function appendEvent(event) {
    load();
    const type = event.event_type || event.type;
    if (!VALID_TYPES.has(type)) {
      throw new Error(`canon: unknown event_type '${type}'`);
    }
    if (type === 'season_start') {
      const sid = event.season_id || seasonId;
      const dup = store.events.find(e => e.event_type === 'season_start' && e.season_id === sid);
      if (dup) {
        throw new Error(`canon: season_start already recorded for season '${sid}' (append-only: cannot re-open a season)`);
      }
    }
    const row = {
      id: nextId(),
      season_id: event.season_id || seasonId,
      event_type: type,
      event_data: event.event_data || event.data || {},
      block_height: event.block_height || null,
      created_at: Date.now(),
    };
    store.events.push(row);
    save();
    return row;
  }

  // Synthesise the current canonState from the event log.
  function getCanonState() {
    load();
    let dwindlingLevel = 0;
    const coldHearths = new Set();
    const storyLog = [];

    for (const e of store.events) {
      if (e.event_type === 'season_start') {
        const s = e.event_data && e.event_data.canonState;
        if (s) {
          if (typeof s.dwindlingLevel === 'number') dwindlingLevel = s.dwindlingLevel;
          if (Array.isArray(s.coldHearths)) s.coldHearths.forEach(h => coldHearths.add(h));
          if (Array.isArray(s.storyLog)) s.storyLog.forEach(l => storyLog.push(l));
        }
      } else if (e.event_type === 'halving') {
        dwindlingLevel = Math.min(10, dwindlingLevel + 1);
        const effect = e.event_data && e.event_data.halvingEffect;
        if (effect) {
          if (Array.isArray(effect.coldHearths)) effect.coldHearths.forEach(h => coldHearths.add(h));
          if (effect.canonAppend) storyLog.push(effect.canonAppend);
        }
      } else if (e.event_type === 'hearth_dimmed') {
        const id = e.event_data && e.event_data.hearthId;
        if (id) coldHearths.add(id);
      } else if (e.event_type === 'story_beat') {
        const text = e.event_data && (e.event_data.text || e.event_data.effect);
        if (text) storyLog.push(text);
      }
    }

    return { dwindlingLevel, coldHearths: [...coldHearths], storyLog };
  }

  function getDwindlingLevel() {
    return getCanonState().dwindlingLevel;
  }

  function isHearthCold(hearthId) {
    return getCanonState().coldHearths.includes(hearthId);
  }

  function getStoryLog() {
    load();
    return store.events
      .filter(e => e.event_type === 'story_beat' || e.event_type === 'season_start')
      .flatMap(e => {
        if (e.event_type === 'season_start') {
          return (e.event_data && e.event_data.canonState && e.event_data.canonState.storyLog) || [];
        }
        const text = e.event_data && (e.event_data.text || e.event_data.effect);
        return text ? [text] : [];
      });
  }

  function getEvents() {
    load();
    return store.events.slice();
  }

  return { seedS1, appendEvent, getCanonState, getDwindlingLevel, isHearthCold, getStoryLog, getEvents };
}

module.exports = { createCanonStore };
