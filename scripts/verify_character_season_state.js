const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const { createAccountRegistry } = require(path.join(root, 'server.js'));

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function makeCredential() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return {
    publicKey: publicKey.export({ format: 'jwk' }),
    sign(message) {
      return base64url(crypto.sign('sha256', Buffer.from(message), { key: privateKey, dsaEncoding: 'ieee-p1363' }));
    },
  };
}

function join(registry, credential, name) {
  const challenge = registry.createChallenge({ type: 'browser-p256-v1', publicKey: credential.publicKey });
  assert.strictEqual(challenge.ok, true, 'challenge should succeed');
  const result = registry.verifyJoin({
    type: 'browser-p256-v1',
    publicKey: credential.publicKey,
    challengeId: challenge.challenge.challengeId,
    signature: credential.sign(challenge.challenge.message),
  }, name);
  assert.strictEqual(result.ok, true, 'join should succeed');
  return result;
}

function assertRejected(result, code) {
  assert.strictEqual(result.ok, false, `expected ${code} rejection`);
  assert.strictEqual(result.error.code, code);
}

let pass = 0;
function ok(label) {
  pass++;
  console.log('  ok  ' + label);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'season-state-'));
const accountsFile = path.join(tempDir, 'accounts.json');
const tasks = ['q01', 'q05'];
let nowMs = 1100;

const keeperCredential = makeCredential();
const sellerCredential = makeCredential();
const buyerCredential = makeCredential();
const lateCredential = makeCredential();

const seasonOne = createAccountRegistry({
  accountsFile,
  season: { id: 'season-one', opensAt: 1000, closesAt: 2000, mandatoryTasks: tasks },
  now: () => nowMs,
});

assert(fs.existsSync(accountsFile), 'registry should persist season state on startup');
let persisted = JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
assert.deepStrictEqual(persisted.seasons['season-one'].mandatoryTasks, tasks, 'season tasks should persist');
assert.strictEqual(persisted.seasons['season-one'].opensAt, 1000);
assert.strictEqual(persisted.seasons['season-one'].closesAt, 2000);
assert.strictEqual(seasonOne.getSeasonState().open, true, 'season should be open inside the configured window');
ok('season clock and mandatory task config persist server-side');

const keeperJoin = join(seasonOne, keeperCredential, 'Keeper');
const sellerJoin = join(seasonOne, sellerCredential, 'Seller');
const buyerJoin = join(seasonOne, buyerCredential, 'Buyer');
const lateJoin = join(seasonOne, lateCredential, 'Late');

assert.strictEqual(keeperJoin.character.seasonComplete, false, 'new character should not start complete');
assert.deepStrictEqual(keeperJoin.character.stats, { vigor: 0, endurance: 0, strength: 0 });

let r = seasonOne.completeMandatoryTask(keeperJoin.accountId, 'q01', 1200);
assert.strictEqual(r.ok, true);
assert.strictEqual(r.seasonComplete, false, 'one of two mandatory tasks should not complete the season');
r = seasonOne.completeMandatoryTask(keeperJoin.accountId, 'q05', 1300);
assert.strictEqual(r.ok, true);
assert.strictEqual(r.seasonComplete, true, 'all mandatory tasks inside the window should complete the season');
assert.strictEqual(seasonOne.isCharacterSeasonComplete(keeperJoin.accountId).seasonComplete, true);
assertRejected(seasonOne.canSellCharacter(keeperJoin.accountId, 1500), 'season_open');
assert.strictEqual(seasonOne.canSellCharacter(keeperJoin.accountId, 2100).ok, true, 'complete character should be sale-eligible after close');
assertRejected(seasonOne.completeMandatoryTask(lateJoin.accountId, 'q01', 2100), 'season_closed');
ok('season-complete flag requires mandatory tasks inside the open window');

seasonOne.recordCharacterProgress(keeperJoin.accountId, {
  stats: { vigor: 2, endurance: 1, strength: 1 },
  collection: {
    relics: ['ember-edge'],
    cosmetics: ['crimson'],
    items: ['rare-ledger-page'],
  },
});
seasonOne.applyAcceptedBlock({
  txs: [
    { auth: { type: 'server-spend', characterId: keeperJoin.character.id, effect: { kind: 'level', stat: 'vigor', level: 3 } } },
    { auth: { type: 'server-spend', characterId: keeperJoin.character.id, effect: { kind: 'relic', relicId: 'green-knot' } } },
  ],
});
let keeperState = seasonOne.getCharacterState(keeperJoin.accountId).character;
assert.strictEqual(keeperState.stats.vigor, 3, 'accepted level spend should update persisted character stat');
assert(keeperState.collection.relics.includes('green-knot'), 'accepted relic spend should update persisted collection');
ok('server-issued spend effects update persisted character progress');

seasonOne.recordCharacterProgress(sellerJoin.accountId, {
  stats: { vigor: 4, endurance: 2, strength: 3 },
  collection: {
    relics: ['tallow-brand'],
    cosmetics: ['gilded'],
    items: ['contested-key'],
    sigils: ['waxen-testament'],
  },
});
seasonOne.completeMandatoryTask(sellerJoin.accountId, 'q01', 1250);
seasonOne.completeMandatoryTask(sellerJoin.accountId, 'q05', 1350);
assert.strictEqual(seasonOne.recordCharacterSale(sellerJoin.accountId, buyerJoin.accountId, { at: 2100 }).ok, true);
assertRejected(seasonOne.recordCharacterSale(lateJoin.accountId, buyerJoin.accountId, { at: 2100 }), 'season_tasks_unfinished');
ok('sale gate requires closed season and completed mandatory tasks');

nowMs = 3100;
const seasonTwo = createAccountRegistry({
  accountsFile,
  season: { id: 'season-two', opensAt: 3000, closesAt: 4000, mandatoryTasks: ['q10'] },
  now: () => nowMs,
});

const keeperNext = join(seasonTwo, keeperCredential, 'Keeper II');
assert.strictEqual(keeperNext.createdCharacter, true);
assert.strictEqual(keeperNext.character.carry.mode, 'keep');
assert.deepStrictEqual(keeperNext.character.stats, { vigor: 3, endurance: 1, strength: 1 });
assert.deepStrictEqual(keeperNext.character.collection.relics.sort(), ['ember-edge', 'green-knot']);
assert.deepStrictEqual(keeperNext.character.collection.cosmetics, ['crimson']);
ok('non-seller keep carries grind-earned stats and collection');

const sellerNext = join(seasonTwo, sellerCredential, 'Seller Restarted');
assert.strictEqual(sellerNext.character.carry.mode, 'restart-zero');
assert.strictEqual(sellerNext.character.carry.statsReset, true);
assert.deepStrictEqual(sellerNext.character.stats, { vigor: 0, endurance: 0, strength: 0 });
assert.deepStrictEqual(sellerNext.character.collection, { items: [], cosmetics: [], relics: [], sigils: [] });

const buyerNext = join(seasonTwo, buyerCredential, 'Buyer Inherited');
assert.strictEqual(buyerNext.character.carry.mode, 'sale-transfer');
assert.strictEqual(buyerNext.character.carry.sourceCharacterId, sellerJoin.character.id);
assert.strictEqual(buyerNext.character.carry.statsReset, true);
assert.deepStrictEqual(buyerNext.character.stats, { vigor: 0, endurance: 0, strength: 0 });
assert.deepStrictEqual(buyerNext.character.collection.items, ['contested-key']);
assert.deepStrictEqual(buyerNext.character.collection.cosmetics, ['gilded']);
assert.deepStrictEqual(buyerNext.character.collection.relics, ['tallow-brand']);
assert.deepStrictEqual(buyerNext.character.collection.sigils, ['waxen-testament']);
ok('sale/restart transfers collection and resets stats to zero');

persisted = JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
assert(persisted.seasons['season-one'] && persisted.seasons['season-two'], 'both seasons should persist');
assert.strictEqual(
  persisted.accounts[buyerJoin.accountId].characters['season-two'].carry.mode,
  'sale-transfer',
  'buyer carry result should survive reload'
);
assert.strictEqual(
  persisted.accounts[sellerJoin.accountId].characters['season-two'].stats.vigor,
  0,
  'seller restart stats reset should survive reload'
);
ok('carry/reset state persists across registry reload');

fs.rmSync(tempDir, { recursive: true, force: true });

console.log('\ncharacter season-state verification passed (' + pass + ' checks).');
