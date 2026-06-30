// Verify the 6 season gate validators (issue #102).
// Tests: s1.json passes all gates; targeted malformed manifests fail the right gate.
const assert = require('assert');
const path   = require('path');
const fs     = require('fs');

const root = path.join(__dirname, '..');
const { runAll, GATES } = require(path.join(root, 'game', 'validators', 'index.js'));
const s1 = JSON.parse(fs.readFileSync(path.join(root, 'game', 'seasons', 's1.json'), 'utf8'));

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

// ---- s1.json passes all 6 gates ----------------------------------------------
const r = runAll(s1);
if (!r.pass) {
  console.error('s1.json failed validators:');
  r.results.filter(x => !x.pass).forEach(x => console.error(' ', x.gate, ':', x.reason));
  process.exit(1);
}
assert.ok(r.pass, 's1.json must pass all 6 gates');
assert.strictEqual(r.results.length, 6, 'must run exactly 6 gates');
assert.deepStrictEqual(GATES, ['traversability','economy-safety','story-continuity','chain-integrity','agent-path','reachability']);

// ---- gate: traversability (pass when no platformerSections in manifest) ------
// s1.json has platformerSections but no platformerData provided → unknown sections → pass (non-strict)
const tResult = runAll(s1, {});
const tGate = tResult.results.find(g => g.gate === 'traversability');
assert.ok(tGate.pass, 'traversability gate passes when platformerData not provided (non-strict)');

// With strict + unknown section → fail
const strictResult = runAll(s1, { strictSections: true });
const strictGate = strictResult.results.find(g => g.gate === 'traversability');
assert.ok(!strictGate.pass, 'traversability gate fails in strictSections mode with unknown IDs');

// ---- gate: economy-safety ----------------------------------------------------
let bad = clone(s1);
delete bad.halvingEffect;
assert.ok(!runAll(bad).results.find(g => g.gate === 'economy-safety').pass, 'missing halvingEffect fails economy-safety');

bad = clone(s1);
bad.halvingEffect.coldHearths = [];
assert.ok(!runAll(bad).results.find(g => g.gate === 'economy-safety').pass, 'empty coldHearths fails economy-safety');

bad = clone(s1);
bad.halvingEffect = { coldHearths: ['hearthlight'], canonAppend: 'ok', runeGrant: 999 };
assert.ok(!runAll(bad).results.find(g => g.gate === 'economy-safety').pass, 'runeGrant bypass fails economy-safety');

// ---- gate: story-continuity --------------------------------------------------
bad = clone(s1);
bad.canonState.storyLog = [];
assert.ok(!runAll(bad).results.find(g => g.gate === 'story-continuity').pass, 'empty storyLog fails story-continuity');

bad = clone(s1);
bad.canonState.storyLog = [...s1.canonState.storyLog, 'The ledger was erased.', 'The ledger is intact.'];
assert.ok(!runAll(bad).results.find(g => g.gate === 'story-continuity').pass, 'contradiction in storyLog fails story-continuity');

const priorCtx = { priorSeasonLog: ['first entry', 'second entry'] };
bad = clone(s1);
bad.canonState.storyLog = ['first entry', 'RETCONNED', 'third entry'];
assert.ok(!runAll(bad, priorCtx).results.find(g => g.gate === 'story-continuity').pass, 'retcon fails story-continuity');

// ---- gate: chain-integrity ---------------------------------------------------
bad = clone(s1);
bad.regions[0].entities = [{ id: 'rogue', type: 'hearth', owner: '0xBAD', goldBalance: 1000 }];
assert.ok(!runAll(bad).results.find(g => g.gate === 'chain-integrity').pass, 'forbidden on-chain field fails chain-integrity');

// ---- gate: agent-path --------------------------------------------------------
// s1.json has no gridAssignments key → passes implicitly
assert.ok(runAll(s1).results.find(g => g.gate === 'agent-path').pass, 'absent gridAssignments key passes agent-path');

bad = clone(s1);
bad.gridAssignments = [];
assert.ok(!runAll(bad).results.find(g => g.gate === 'agent-path').pass, 'explicitly empty gridAssignments fails agent-path');

bad = clone(s1);
bad.gridAssignments = [{ type: 'runechain-propose-region', goldReward: 50 }];
assert.ok(runAll(bad).results.find(g => g.gate === 'agent-path').pass, 'valid gridAssignments passes agent-path');

bad = clone(s1);
bad.gridAssignments = [{ type: 'runechain-propose-region', goldReward: 50, runeReward: 999 }];
assert.ok(!runAll(bad).results.find(g => g.gate === 'agent-path').pass, 'runeReward in assignment fails agent-path');

// ---- gate: reachability ------------------------------------------------------
bad = clone(s1);
bad.connections = [];
bad.regions.forEach(r => { r.exits = []; });
assert.ok(!runAll(bad).results.find(g => g.gate === 'reachability').pass, 'isolated regions fail reachability');

bad = clone(s1);
bad.regions.push({ id: 'orphan-isle', name: 'Orphan Isle', tileset: 'tileset-orphan', position: { x: 99, y: 99 }, exits: [] });
assert.ok(!runAll(bad).results.find(g => g.gate === 'reachability').pass, 'disconnected extra region fails reachability');

console.log('✓ season-validators: all 6 gates pass on s1.json; all targeted failure cases produce expected results');
console.log(`  Gates verified: ${GATES.join(', ')}`);
