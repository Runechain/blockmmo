const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const serverApi = require(path.join(root, 'server.js'));

assert.strictEqual(typeof serverApi.createRealmServer, 'function', 'server should export createRealmServer');
assert.strictEqual(typeof serverApi.createAccountRegistry, 'function', 'server should export createAccountRegistry');
assert.strictEqual(typeof serverApi.decodeFrame, 'function', 'server should export decodeFrame');

function makeClient(id) {
  return {
    id,
    name: id,
    socket: {
      writable: true,
      writes: [],
      write(frame) { this.writes.push(frame); },
      end() {},
    },
    last: {},
  };
}

function readMessages(client) {
  const frames = client.socket.writes.splice(0);
  const messages = [];
  let buffer = Buffer.concat(frames);
  while (buffer.length) {
    const frame = serverApi.decodeFrame(buffer);
    assert(frame, 'expected complete server frame');
    messages.push(JSON.parse(frame.payload.toString('utf8')));
    buffer = frame.rest;
  }
  return messages;
}

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function makeCredential() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return {
    publicKey: publicKey.export({ format: 'jwk' }),
    sign(message) {
      return base64url(crypto.sign('sha256', Buffer.from(message), {
        key: privateKey,
        dsaEncoding: 'ieee-p1363',
      }));
    },
  };
}

function assertRejected(result, code) {
  assert.strictEqual(result.ok, false, `expected ${code} rejection`);
  assert.strictEqual(result.error.code, code);
}

function requestChallenge(realm, client, credential) {
  const result = realm.handleParsedMessage(client, {
    t: 'account:challenge',
    credential: { type: 'browser-p256-v1', publicKey: credential.publicKey },
  });
  assert.strictEqual(result.ok, true, 'challenge request should succeed');
  const message = readMessages(client)[0];
  assert.strictEqual(message.t, 'account:challenge');
  assert.strictEqual(message.credentialType, 'browser-p256-v1');
  assert.strictEqual(typeof message.challengeId, 'string');
  assert.strictEqual(typeof message.message, 'string');
  assert.strictEqual(typeof message.accountId, 'string');
  assert(message.accountId.startsWith('acct_'), 'account id should be opaque and typed');
  return message;
}

function joinWithChallenge(realm, client, credential, challenge, { peerId = client.id, name = 'Recorded', chain = undefined } = {}) {
  const result = realm.handleParsedMessage(client, {
    t: 'join',
    id: peerId,
    name,
    chain,
    credential: {
      type: 'browser-p256-v1',
      publicKey: credential.publicKey,
      challengeId: challenge.challengeId,
      signature: credential.sign(challenge.message),
    },
  });
  assert.strictEqual(result.ok, true, 'join should succeed with a valid account signature');
  const messages = readMessages(client);
  assert.strictEqual(messages[0].t, 'account');
  assert.strictEqual(messages[1].t, 'chain');
  return { result, account: messages[0], chain: messages[1] };
}

function authenticate(realm, client, credential, options) {
  const challenge = requestChallenge(realm, client, credential);
  return joinWithChallenge(realm, client, credential, challenge, options);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'account-binding-'));
const ledgerFile = path.join(tempDir, 'ledger.json');
const accountsFile = path.join(tempDir, 'accounts.json');
let nowMs = 1000;
const credential = makeCredential();

const realm = serverApi.createRealmServer({
  ledgerFile,
  accountsFile,
  seasonId: 'season-one',
  difficulty: 1,
  now: () => nowMs,
  saveDelayMs: 0,
  quiet: true,
});

const stray = makeClient('stray');
const submitter = makeClient('submitter');
const peer = makeClient('peer');
realm.addClient(stray);
realm.addClient(submitter);
realm.addClient(peer);

const rejectedUnauthedState = realm.handleParsedMessage(stray, {
  t: 'state',
  id: 'forged-peer',
  name: 'Intruder',
  x: 10,
});
assertRejected(rejectedUnauthedState, 'account_required');
assert.strictEqual(readMessages(stray)[0].t, 'join:error');
assert.strictEqual(readMessages(peer).length, 0, 'unauthenticated state must not broadcast');

const rejectedUnauthedBlock = realm.handleParsedMessage(stray, { t: 'block', block: {} });
assertRejected(rejectedUnauthedBlock, 'account_required');
assert.strictEqual(readMessages(stray)[0].error.code, 'account_required');
assert.strictEqual(readMessages(peer).length, 0, 'unauthenticated block must not broadcast');
assert.strictEqual(realm.getChain().length, 1, 'unauthenticated block must not mutate the chain');

const rejectedUnauthedReward = realm.handleParsedMessage(stray, {
  t: 'mine:reward',
  source: { type: 'enemy', key: 'hollow' },
});
assertRejected(rejectedUnauthedReward, 'account_required');
assert.strictEqual(readMessages(stray)[0].error.code, 'account_required');

const rejectedUnauthedSubmit = realm.handleParsedMessage(stray, {
  t: 'mine:submit',
  candidateId: 'srv_fake',
  block: {},
});
assertRejected(rejectedUnauthedSubmit, 'account_required');
assert.strictEqual(readMessages(stray)[0].error.code, 'account_required');

const badSignatureClient = makeClient('bad-signature');
realm.addClient(badSignatureClient);
const badSignatureChallenge = requestChallenge(realm, badSignatureClient, credential);
const badSignatureJoin = realm.handleParsedMessage(badSignatureClient, {
  t: 'join',
  id: 'bad-signature',
  name: 'BadSig',
  credential: {
    type: 'browser-p256-v1',
    publicKey: credential.publicKey,
    challengeId: badSignatureChallenge.challengeId,
    signature: credential.sign(badSignatureChallenge.message + '\ntampered'),
  },
});
assertRejected(badSignatureJoin, 'invalid_account_signature');
assert.strictEqual(readMessages(badSignatureClient)[0].error.code, 'invalid_account_signature');

const wrongKeyClient = makeClient('wrong-key');
realm.addClient(wrongKeyClient);
const wrongKeyOriginal = makeCredential();
const wrongKeyReplacement = makeCredential();
const wrongKeyChallenge = requestChallenge(realm, wrongKeyClient, wrongKeyOriginal);
const wrongKeyJoin = realm.handleParsedMessage(wrongKeyClient, {
  t: 'join',
  id: 'wrong-key',
  name: 'WrongKey',
  credential: {
    type: 'browser-p256-v1',
    publicKey: wrongKeyReplacement.publicKey,
    challengeId: wrongKeyChallenge.challengeId,
    signature: wrongKeyReplacement.sign(wrongKeyChallenge.message),
  },
});
assertRejected(wrongKeyJoin, 'invalid_account_challenge');
assert.strictEqual(readMessages(wrongKeyClient)[0].error.code, 'invalid_account_challenge');

const firstJoin = authenticate(realm, submitter, credential, { peerId: 'peer-a', name: 'Recorder' });
assert.strictEqual(firstJoin.account.seasonId, 'season-one');
assert.strictEqual(firstJoin.account.createdAccount, true);
assert.strictEqual(firstJoin.account.createdCharacter, true);
assert(firstJoin.account.peerId.startsWith('peer_'), 'server should assign a realm peer id');
assert(firstJoin.account.character.id.startsWith('char_'), 'character id should be opaque and typed');
assert.strictEqual(firstJoin.account.character.address, firstJoin.account.character.id);
assert.strictEqual(firstJoin.account.character.name, 'Recorder');
assert.strictEqual(firstJoin.result.accountId, firstJoin.account.accountId);
assert.strictEqual(firstJoin.result.character.id, firstJoin.account.character.id);

assert(fs.existsSync(accountsFile), 'account registry should persist after join');
const persisted = JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
assert.strictEqual(persisted.version, 1);
assert.strictEqual(Object.keys(persisted.accounts).length, 1);
assert.strictEqual(persisted.accounts[firstJoin.account.accountId].id, firstJoin.account.accountId);
assert(!JSON.stringify(persisted).includes(firstJoin.account.character.id + firstJoin.account.character.id), 'registry should not duplicate character data');
assert(!JSON.stringify(persisted).includes('signature'), 'registry must not persist login signatures');

const rejectedAuthedBlock = realm.handleParsedMessage(submitter, { t: 'block', block: {} });
assertRejected(rejectedAuthedBlock, 'client_block_submission_disabled');
assert.strictEqual(realm.getChain().length, 1, 'authenticated raw client block must not mutate the chain');
assert.strictEqual(readMessages(submitter)[0].error.code, 'client_block_submission_disabled');
assert.strictEqual(readMessages(peer).length, 0, 'authenticated raw client block must not broadcast');

const replayCredential = makeCredential();
const replayClient = makeClient('replay');
realm.addClient(replayClient);
const replayChallenge = requestChallenge(realm, replayClient, replayCredential);
joinWithChallenge(realm, replayClient, replayCredential, replayChallenge, { peerId: 'replay', name: 'Replay' });
const replayJoin = realm.handleParsedMessage(replayClient, {
  t: 'join',
  id: 'replay-again',
  name: 'Replay Again',
  credential: {
    type: 'browser-p256-v1',
    publicKey: replayCredential.publicKey,
    challengeId: replayChallenge.challengeId,
    signature: replayCredential.sign(replayChallenge.message),
  },
});
assertRejected(replayJoin, 'invalid_account_challenge');
assert.strictEqual(readMessages(replayClient)[0].error.code, 'invalid_account_challenge');

const peerJoin = authenticate(realm, peer, makeCredential(), { peerId: 'peer-b', name: 'Witness' });
assert.notStrictEqual(peerJoin.account.character.id, firstJoin.account.character.id);

const forgedState = realm.handleParsedMessage(submitter, {
  t: 'state',
  id: 'evil-peer',
  name: 'Mallory',
  characterId: 'char_evil',
  skin: 'specter',
  x: 22,
  y: 0,
  z: 44,
  yaw: 1.25,
  moving: true,
});
assert.strictEqual(forgedState.ok, true);
assert.deepStrictEqual(readMessages(peer)[0], {
  t: 'state',
  id: firstJoin.account.peerId,
  characterId: firstJoin.account.character.id,
  name: 'Recorder',
  skin: 'specter',
  x: 22,
  y: 0,
  z: 44,
  yaw: 1.25,
  moving: true,
  mode: 'town',
  encounter: null,
  interior: null,
});

nowMs = 2000;
const rewardRequest = realm.handleParsedMessage(submitter, {
  t: 'mine:reward',
  source: { type: 'enemy', key: 'hollow' },
});
assert.strictEqual(rewardRequest.ok, true, 'authenticated account should receive reward work');
const rewardWork = readMessages(submitter)[0];
assert.strictEqual(rewardWork.t, 'mine:work');
assert.strictEqual(rewardWork.work.block.txs[0].to, firstJoin.account.character.address);
assert.deepStrictEqual(rewardWork.work.block.txs[0].auth, {
  type: 'server-reward',
  source: 'enemy:hollow',
  accountId: firstJoin.account.accountId,
  characterId: firstJoin.account.character.id,
  seasonId: 'season-one',
});

realm.close();

const returningRealm = serverApi.createRealmServer({
  ledgerFile: path.join(tempDir, 'ledger-2.json'),
  accountsFile,
  seasonId: 'season-one',
  difficulty: 1,
  now: () => 3000,
  saveDelayMs: 0,
  quiet: true,
});
const returningClient = makeClient('returning');
returningRealm.addClient(returningClient);
const returningJoin = authenticate(returningRealm, returningClient, credential, { peerId: 'peer-returning', name: 'Renamed' });
assert.strictEqual(returningJoin.account.createdAccount, false);
assert.strictEqual(returningJoin.account.createdCharacter, false);
assert.strictEqual(returningJoin.account.accountId, firstJoin.account.accountId);
assert.strictEqual(returningJoin.account.character.id, firstJoin.account.character.id);
assert.strictEqual(returningJoin.account.character.name, 'Renamed');
returningRealm.close();

const nextSeasonRealm = serverApi.createRealmServer({
  ledgerFile: path.join(tempDir, 'ledger-3.json'),
  accountsFile,
  seasonId: 'season-two',
  difficulty: 1,
  now: () => 4000,
  saveDelayMs: 0,
  quiet: true,
});
const nextSeasonClient = makeClient('next-season');
nextSeasonRealm.addClient(nextSeasonClient);
const nextSeasonJoin = authenticate(nextSeasonRealm, nextSeasonClient, credential, { peerId: 'peer-next', name: 'Recorder II' });
assert.strictEqual(nextSeasonJoin.account.createdAccount, false);
assert.strictEqual(nextSeasonJoin.account.createdCharacter, true);
assert.notStrictEqual(nextSeasonJoin.account.character.id, firstJoin.account.character.id);
nextSeasonRealm.close();

const finalRegistry = JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
assert.deepStrictEqual(
  Object.keys(finalRegistry.accounts[firstJoin.account.accountId].characters).sort(),
  ['season-one', 'season-two'],
  'one account should have one character entry per season'
);

fs.rmSync(tempDir, { recursive: true, force: true });

console.log('account binding verification passed');
