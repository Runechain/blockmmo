'use strict';
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const content = require(path.join(root, 'game', 'content.js'));
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function test(name, fn) {
  try { fn(); process.stdout.write('ok  ' + name + '\n'); }
  catch (e) { process.stderr.write('not ok  ' + name + '\n'); throw e; }
}

// ── content.js checks ──────────────────────────────────────────────────────

test('AREA4_ENCOUNTERS exported', function () {
  assert.ok(content.AREA4_ENCOUNTERS, 'AREA4_ENCOUNTERS must be exported');
});

test('AREA4_ENCOUNTERS uses hyphen key matching boss id', function () {
  const enc = content.AREA4_ENCOUNTERS;
  assert.ok(enc['grand-auditor'], 'key must be grand-auditor (hyphen)');
  assert.equal(enc['grand-auditor'].id, 'grand-auditor');
  assert.ok(!enc['grand_auditor'], 'underscore key must not exist');
});

test('AREA5_ENCOUNTERS uses hyphen key matching boss id', function () {
  const enc = content.AREA5_ENCOUNTERS;
  assert.ok(enc['tide-keeper'], 'key must be tide-keeper (hyphen)');
  assert.equal(enc['tide-keeper'].id, 'tide-keeper');
  assert.ok(!enc['tide_keeper'], 'underscore key must not exist');
});

test('AREA6_ENCOUNTERS uses hyphen key matching boss id', function () {
  const enc = content.AREA6_ENCOUNTERS;
  assert.ok(enc['prior-season-boss'], 'key must be prior-season-boss (hyphen)');
  assert.equal(enc['prior-season-boss'].id, 'prior-season-boss');
  assert.ok(!enc['prior_season'], 'underscore key must not exist');
});

test('each S2 encounter has segments with mode+payload', function () {
  const all = [
    content.AREA4_ENCOUNTERS['grand-auditor'],
    content.AREA5_ENCOUNTERS['tide-keeper'],
    content.AREA6_ENCOUNTERS['prior-season-boss'],
  ];
  for (const enc of all) {
    assert.ok(Array.isArray(enc.segments) && enc.segments.length >= 1, enc.id + ' needs segments');
    for (const seg of enc.segments) {
      assert.ok(seg.mode, enc.id + ' segment needs mode');
      assert.ok(seg.payload, enc.id + ' segment needs payload');
    }
  }
});

test('TODO comment removed from content.js', function () {
  const src = fs.readFileSync(path.join(root, 'game', 'content.js'), 'utf8');
  assert.ok(!src.includes('TODO: gate Area 4'), 'TODO comment must be removed');
});

// ── index.html checks ──────────────────────────────────────────────────────

test('index.html destructures AREA4/5/6_ENCOUNTERS', function () {
  assert.ok(index.includes('AREA4_ENCOUNTERS'), 'AREA4_ENCOUNTERS must be destructured');
  assert.ok(index.includes('AREA5_ENCOUNTERS'), 'AREA5_ENCOUNTERS must be destructured');
  assert.ok(index.includes('AREA6_ENCOUNTERS'), 'AREA6_ENCOUNTERS must be destructured');
});

test('BOSS_ENCOUNTER_KEYS includes all three S2 bosses', function () {
  assert.ok(index.includes("'grand-auditor'"), 'grand-auditor in BOSS_ENCOUNTER_KEYS');
  assert.ok(index.includes("'tide-keeper'"), 'tide-keeper in BOSS_ENCOUNTER_KEYS');
  assert.ok(index.includes("'prior-season-boss'"), 'prior-season-boss in BOSS_ENCOUNTER_KEYS');
});

test('S2 enemies spawned with requiresEnding:true', function () {
  assert.ok(/spawnEnemy\('grand-auditor'/.test(index), 'grand-auditor spawn must exist');
  assert.ok(/spawnEnemy\('tide-keeper'/.test(index), 'tide-keeper spawn must exist');
  assert.ok(/spawnEnemy\('prior-season-boss'/.test(index), 'prior-season-boss spawn must exist');
  const spawns = index.match(/spawnEnemy\('(?:grand-auditor|tide-keeper|prior-season-boss)'[^)]+\)/g) || [];
  for (const s of spawns) {
    assert.ok(s.includes('requiresEnding:true'), 'S2 boss spawn must have requiresEnding:true: ' + s);
  }
});

test('enemyUnlocked gates on requiresEnding before progress.ending', function () {
  assert.ok(/e\.requiresEnding && !progress\.ending/.test(index),
    'enemyUnlocked must check requiresEnding against progress.ending');
});

test('nearestBossEncounter includes S2 encounter lookup', function () {
  assert.ok(/AREA4_ENCOUNTERS\[e\.key\]/.test(index), 'nearestBossEncounter must look up AREA4_ENCOUNTERS');
  assert.ok(/AREA5_ENCOUNTERS\[e\.key\]/.test(index), 'nearestBossEncounter must look up AREA5_ENCOUNTERS');
  assert.ok(/AREA6_ENCOUNTERS\[e\.key\]/.test(index), 'nearestBossEncounter must look up AREA6_ENCOUNTERS');
});

test('nearestBossEncounter gates S2 lookup on progress.ending', function () {
  assert.ok(/progress\.ending&&\(AREA4_ENCOUNTERS/.test(index),
    'nearestBossEncounter must gate S2 lookup on progress.ending');
});

test('startBossEncounter includes S2 encounter lookup gated on progress.ending', function () {
  assert.ok(/progress\.ending&&\(AREA4_ENCOUNTERS\[enemy\.key\]/.test(index),
    'startBossEncounter must gate S2 lookup on progress.ending');
});

process.stdout.write('\nAll S2 gate tests passed.\n');
