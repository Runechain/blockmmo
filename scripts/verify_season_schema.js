// Verify season manifest schema and validator (issues #103, #106).
// Checks: schema file is valid JSON, s1.json passes the validator,
// malformed manifests produce errors.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const { validate } = require(path.join(root, 'game', 'season-validator.js'));
const s1 = JSON.parse(fs.readFileSync(path.join(root, 'game', 'seasons', 's1.json'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(root, 'game', 'schema', 'season.json'), 'utf8'));

// ---- schema file is valid JSON -----------------------------------------------
assert.ok(schema.$schema, 'schema.$schema present');
assert.strictEqual(schema.title, 'RUNECHAIN Season Manifest');

// ---- s1.json passes the validator --------------------------------------------
const s1Result = validate(s1);
if (!s1Result.valid) {
  console.error('s1.json validation errors:', s1Result.errors);
  process.exit(1);
}
assert.ok(s1Result.valid, 's1.json must be valid');

// ---- meta checks -------------------------------------------------------------
const s1Copy = () => JSON.parse(JSON.stringify(s1));

let bad = s1Copy(); delete bad.meta.id;
assert.ok(!validate(bad).valid, 'missing meta.id must fail');

bad = s1Copy(); bad.meta.id = 'season1';
assert.ok(!validate(bad).valid, 'meta.id must match /^s[0-9]+$/');

bad = s1Copy(); bad.canonState.dwindlingLevel = 99;
assert.ok(!validate(bad).valid, 'dwindlingLevel > 10 must fail');

// ---- region reference checks -------------------------------------------------
bad = s1Copy();
bad.regions[0].exits.push({ to: 'does-not-exist', direction: 'west' });
const refResult = validate(bad);
assert.ok(!refResult.valid, 'dangling exit.to reference must fail');
assert.ok(refResult.errors.some(e => e.includes('does-not-exist')), 'error mentions the bad ID');

// ---- town.regionId reference -------------------------------------------------
bad = s1Copy();
bad.towns[0].regionId = 'ghost-region';
assert.ok(!validate(bad).valid, 'unknown town.regionId must fail');

// ---- halvingEffect coldHearths must be known hearths -------------------------
bad = s1Copy();
bad.halvingEffect.coldHearths = ['phantom-hearth'];
assert.ok(!validate(bad).valid, 'unknown coldHearths must fail');

// ---- reachability check ------------------------------------------------------
bad = s1Copy();
bad.connections = [];
bad.regions.forEach(r => { r.exits = []; });
const reachResult = validate(bad);
// With no connections or exits, only the first region is reachable.
if (bad.regions.length > 1) {
  assert.ok(!reachResult.valid, 'isolated regions must fail reachability');
}

console.log('✓ season-validator: all assertions passed');
console.log(`  s1.json regions: ${s1.regions.length}, towns: ${s1.towns.length}, connections: ${s1.connections.length}`);
