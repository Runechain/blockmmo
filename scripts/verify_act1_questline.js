const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const content = require(path.join(root, 'game', 'content.js'));
const sha256 = require(path.join(root, 'game', 'sha256.js'));
const { createChain } = require(path.join(root, 'game', 'chain.js'));
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function questById(id) {
  return content.STORY.quests.find((quest) => quest.id === id);
}

function simulateStory(events) {
  const state = { activeQuestId: content.STORY.startQuest, stepIndex: 0, stepCount: 0, completed: [] };
  function quest() { return questById(state.activeQuestId); }
  function step() {
    const active = quest();
    return active && active.steps[state.stepIndex];
  }
  function matches(done, type, payload) {
    if (!done || done.event !== type) return false;
    if (done.any) return true;
    if (done.monster && payload.key !== done.monster) return false;
    if (done.target && payload.target !== done.target) return false;
    if (done.stat && payload.stat !== done.stat) return false;
    return true;
  }
  function completeStep() {
    const active = quest();
    state.stepIndex++;
    state.stepCount = 0;
    if (active && state.stepIndex >= active.steps.length) {
      state.completed.push(active.id);
      state.activeQuestId = active.next || null;
      state.stepIndex = 0;
      state.stepCount = 0;
    }
  }
  for (const event of events) {
    const current = step();
    assert(current, 'expected an active story step before ' + JSON.stringify(event));
    assert(matches(current.done, event.type, event.payload), 'event should match current step: ' + JSON.stringify({ current, event }));
    if (current.done.count) {
      state.stepCount++;
      if (state.stepCount >= current.done.count) completeStep();
    } else {
      completeStep();
    }
  }
  return state;
}

const act1 = content.ACT1_GRACEFALL;
assert(act1, 'ACT1_GRACEFALL content contract should be exported');
assert.deepStrictEqual(act1.questIds, ['q01', 'q02', 'q03', 'q04', 'q05'], 'Act 1 should explicitly cover q01-q05');

const roles = new Set((act1.townBeats || []).map((beat) => beat.role));
for (const role of ['Recorder/Chaplain', 'Scribe/Archivist', 'Debt Confessional', 'Chapel Acolyte', 'Sexton grave-tenders']) {
  assert(roles.has(role), 'Act 1 should author town dialogue for ' + role);
}
for (const beat of act1.townBeats || []) {
  assert(Array.isArray(beat.lines) && beat.lines.length >= 2, 'town beat should include at least two authored lines: ' + beat.id);
}

for (const id of act1.questIds) {
  const quest = questById(id);
  assert(quest, 'missing Act 1 quest ' + id);
  assert(Array.isArray(quest.dialogue) && quest.dialogue.length >= 2, id + ' should carry authored quest dialogue');
}

assert(act1.interactions['hearth-registry'].some((line) => /Recorded|Chainwell/i.test(line)), 'registry interaction should author Chainwell recording dialogue');
assert(act1.interactions['verification-bell'].some((line) => /bell|confirmation/i.test(line)), 'verification bells should have authored confirmation dialogue');
assert(act1.interactions['pending-tablet'].some((line) => /pending|mempool/i.test(line)), 'pending tablets should have authored Mempool dialogue');
assert(act1.interactions['tallow-candle'].some((line) => /Tallow|wax|name/i.test(line)), 'Tallow candles should have authored wax-name dialogue');

assert(act1.bosses.sexton.behaviors.some((behavior) => /ink-pool|enrage/i.test(behavior)), 'Gate Sexton Marrow should describe ink-pool/enrage behavior');
assert(act1.bosses.mempool.behaviors.some((behavior) => /Pending Hollow|batch-confirm|stronger over time/i.test(behavior)), 'Mempool Warden should describe add/queue pressure behavior');
assert(act1.bosses.tallow.behaviors.some((behavior) => /phase 2 smoke|Echoes|Chaplain/i.test(behavior)), 'Mother Tallow should describe Echoes, smoke, and Chaplain behavior');
assert.strictEqual(act1.bosses.tallow.sigilKey, 'waxen-testament', 'Mother Tallow should award the Waxen Testament sigil key');
assert.strictEqual(act1.bosses.tallow.unlocksQuest, 'q06', 'Mother Tallow should unlock the Shroud Vaults quest');

assert.strictEqual(content.AREA1_ENCOUNTERS.tallow.segments.length, 3, 'Mother Tallow should remain a three-segment boss encounter');
assert.deepStrictEqual(
  content.AREA1_ENCOUNTERS.tallow.segments.map((segment) => segment.mode),
  ['platformer', 'battlefield', 'turnbased'],
  'Mother Tallow should combine platformer, battlefield, and turn-based modes'
);
assert(content.TURN_TALLOW.opponent.phase2 && content.TURN_TALLOW.opponent.phase2.threshold === 0.5, 'Mother Tallow duel should include a phase 2 smoke split at 50%');

const finalState = simulateStory([
  { type: 'interact', payload: { target: 'hearth-registry' } },
  { type: 'kill', payload: { key: 'hollow' } },
  { type: 'interact', payload: { target: 'verification-bell' } },
  { type: 'interact', payload: { target: 'verification-bell' } },
  { type: 'kill', payload: { key: 'hollow' } },
  { type: 'kill', payload: { key: 'hollow' } },
  { type: 'kill', payload: { key: 'sexton' } },
  { type: 'forge', payload: { item: 'ember-edge' } },
  { type: 'kill', payload: { key: 'hollow' } },
  { type: 'kill', payload: { key: 'hollow' } },
  { type: 'interact', payload: { target: 'pending-tablet' } },
  { type: 'interact', payload: { target: 'pending-tablet' } },
  { type: 'interact', payload: { target: 'pending-tablet' } },
  { type: 'kill', payload: { key: 'mempool' } },
  { type: 'interact', payload: { target: 'tallow-candle' } },
  { type: 'interact', payload: { target: 'tallow-candle' } },
  { type: 'interact', payload: { target: 'tallow-candle' } },
  { type: 'kill', payload: { key: 'tallow' } },
]);
assert.deepStrictEqual(finalState.completed, ['q01', 'q02', 'q03', 'q04', 'q05'], 'q01-q05 should complete in order');
assert.strictEqual(finalState.activeQuestId, 'q06', 'completing q05 should advance to q06 / Shroud Vaults');

const chain = createChain({ sha256, difficulty: 0 });
chain.mintGreatRune('Recorded', { id: 'tallow-test', name: 'The Waxen Testament', key: 'waxen-testament' });
const sigil = chain.greatRunesOf('Recorded').find((rune) => rune.key === 'waxen-testament');
assert(sigil, 'Chainwell prototype mint should expose the Waxen Testament sigil through greatRunesOf');
assert.strictEqual(content.SIGILS['waxen-testament'].runeMult, 0.12, 'Waxen Testament should grant the ratified +12% RUNE acquisition bonus');

assert(act1.northPathUnlock && act1.northPathUnlock.quest === 'q06', 'Act 1 should document the north path unlock to q06');
assert(/function northPathUnlocked/.test(index), 'runtime should expose a northPathUnlocked gate helper');
assert(/drawNorthPath/.test(index), 'runtime should render the north path once q06 is reached');
assert(/ACT1_GRACEFALL/.test(index), 'runtime should consume authored Act 1 content');
assert(/townBeat/.test(index), 'runtime should expose authored Act 1 town beats as repeatable interactions');
assert(/Chain\.mintGreatRune/.test(index), 'runtime should use the existing Chainwell ledger mint for Boss Sigils');

console.log('act1 questline verification passed (Boss Sigils use the prototype Chain.mintGreatRune ledger path; q06 gates the north path to Shroud Vaults)');
