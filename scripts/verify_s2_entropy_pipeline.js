#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');

const root = path.join(__dirname, '..');
const entropy = require(path.join(root, 'engine/s2/entropy.js'));
const submit = require(path.join(root, 'engine/s2/submit.js'));

const now = 1700000000000;
const events = [
  { type: 'player.spawned', player: { id: 'player-a' }, occurredAt: new Date(now).toISOString(), source: { mode: 'town' }, position: { area: 'town', x: 0, y: 0 }, payload: {} },
  { type: 'player.moved', player: { id: 'player-a' }, occurredAt: new Date(now + 260).toISOString(), source: { mode: 'town' }, position: { area: 'town', x: 12, y: 14 }, payload: { moved: true } },
  { type: 'quest.progressed', player: { id: 'player-a' }, occurredAt: new Date(now + 520).toISOString(), source: { mode: 'town' }, position: { area: 'town', x: 12, y: 14 }, payload: { questId: 'q01', stepIndex: 1 } },
  { type: 'combat.creature_defeated', player: { id: 'player-a' }, occurredAt: new Date(now + 780).toISOString(), source: { mode: 'town' }, position: { area: 'area2', x: 19, y: 16 }, payload: { targetId: 'hollow' } },
  { type: 'player.died', player: { id: 'player-a' }, occurredAt: new Date(now + 1040).toISOString(), source: { mode: 'town' }, position: { area: 'area2', x: 24, y: 18 }, payload: { cause: 'enemy' } },
  { type: 'player.respawned', player: { id: 'player-a' }, occurredAt: new Date(now + 1300).toISOString(), source: { mode: 'town' }, position: { area: 'town', x: 25, y: 18 }, payload: {} },
  { type: 'ending.chosen', player: { id: 'player-a' }, occurredAt: new Date(now + 1560).toISOString(), source: { mode: 'town' }, position: { area: 'town', x: 26, y: 18 }, payload: { choice: 'A' } },
];

const resultA = entropy.processEvents(events);
const resultB = entropy.processEvents(events.slice());
assert.ok(resultA.seed && typeof resultA.seed === 'string' && resultA.seed.length === 64, 'entropy seed should be deterministic 256-bit hex');
assert.strictEqual(resultA.seed, resultB.seed, 'same event input should produce same seed');
assert.strictEqual(resultA.signals.eventCount, events.length, 'processEvents eventCount should reflect input length');
assert.ok(resultA.signals.aggregates.deathRate > 0, 'aggregates should reflect player deaths');
assert.ok(resultA.signals.modeDistribution.some((m) => m.item === 'town'), 'top modes should include town');
assert.strictEqual(typeof resultA.signals.areaTop3, 'string', 'areaTop3 should be stable');

const resultC = entropy.processEvents(events.concat([{
  type: 'combat.hit_landed',
  player: { id: 'player-a' },
  occurredAt: new Date(now + events.length * 260).toISOString(),
  source: { mode: 'town' },
  position: { area: 'area2', x: 31, y: 20 },
  payload: {},
}]));
assert.notStrictEqual(resultA.seed, resultC.seed, 'different event order/outcome should change seed');

const templates = [
  { id: 'local-1', complexity_tier: 'local', title: 'Local 1', prompt: '__RC_SEED__', max_tokens: 100, type: 'npc_dialogue', area: 'town' },
  { id: 'local-2', complexity_tier: 'local', title: 'Local 2', prompt: '__RC_SEED__', max_tokens: 100, type: 'npc_dialogue', area: 'town' },
  { id: 'local-3', complexity_tier: 'local', title: 'Local 3', prompt: '__RC_SEED__', max_tokens: 100, type: 'npc_dialogue', area: 'town' },
  { id: 'local-4', complexity_tier: 'local', title: 'Local 4', prompt: '__RC_SEED__', max_tokens: 100, type: 'npc_dialogue', area: 'town' },
  { id: 'local-5', complexity_tier: 'local', title: 'Local 5', prompt: '__RC_SEED__', max_tokens: 100, type: 'npc_dialogue', area: 'town' },
  { id: 'local-6', complexity_tier: 'local', title: 'Local 6', prompt: '__RC_SEED__', max_tokens: 100, type: 'npc_dialogue', area: 'town' },
  { id: 'mid-1', complexity_tier: 'high', title: 'Mid 1', prompt: '__RC_SEED__', max_tokens: 600, type: 'boss_script', area: 'area2' },
];

const picked1 = submit._selectTasks(templates, resultA.seed).map((task) => task.id);
const picked2 = submit._selectTasks(templates, resultA.seed).map((task) => task.id);
const picked3 = submit._selectTasks(templates, resultC.seed).map((task) => task.id);
assert.deepStrictEqual(picked1, picked2, 'same seed should rank tasks identically');
assert.ok(picked1.length <= 6, 'task selection stays bounded');
assert.ok(picked1.filter((id) => id.indexOf('mid-') === 0).length <= 1, 'mid-tier should stay bounded to at most one');
const hasDifferent = picked1.join(',') !== picked3.join(',');
assert.ok(hasDifferent, 'different seeds should shift selection');

console.log('S2 entropy pipeline verification passed');
