const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const serverApi = require(path.join(root, 'server.js'));

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
  let buffer = frames.length ? Buffer.concat(frames) : Buffer.alloc(0);
  while (buffer.length) {
    const frame = serverApi.decodeFrame(buffer);
    assert(frame, 'expected complete server frame');
    messages.push(JSON.parse(frame.payload.toString('utf8')));
    buffer = frame.rest;
  }
  return messages;
}

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

function authenticate(realm, client, credential, name) {
  const challenge = realm.handleParsedMessage(client, {
    t: 'account:challenge',
    credential: { type: 'browser-p256-v1', publicKey: credential.publicKey },
  });
  assert.strictEqual(challenge.ok, true, 'challenge should succeed');
  const challengeMsg = readMessages(client)[0];
  const join = realm.handleParsedMessage(client, {
    t: 'join',
    id: client.id,
    name: name || client.name,
    credential: {
      type: 'browser-p256-v1',
      publicKey: credential.publicKey,
      challengeId: challengeMsg.challengeId,
      signature: credential.sign(challengeMsg.message),
    },
  });
  assert.strictEqual(join.ok, true, 'join should succeed');
  const messages = readMessages(client);
  return messages.find((m) => m.t === 'account');
}

function assertRejected(result, code) {
  assert.strictEqual(result.ok, false, 'expected rejection ' + code);
  assert.strictEqual(result.error.code, code);
}

function challengeAndAccept(realm, challenger, challenged, challengerAccount, challengedAccount, label) {
  const challenge = realm.handleParsedMessage(challenger, {
    t: 'rc:pvp:challenge',
    to: challengedAccount.peerId,
    areaId: 'verify-yard',
    duelId: 'client-forged-' + label,
  });
  assert.strictEqual(challenge.ok, true, 'challenge should succeed');
  assert(challenge.duelId && challenge.duelId !== 'client-forged-' + label, 'server should mint canonical duel id');

  const challengerAck = readMessages(challenger);
  const challengedMessages = readMessages(challenged);
  assert.strictEqual(challengerAck[0].t, 'rc:pvp:challenge:created');
  assert.strictEqual(challengerAck[0].duelId, challenge.duelId);
  assert.strictEqual(challengerAck[0].from, challengerAccount.peerId);
  assert.strictEqual(challengedMessages[0].t, 'rc:pvp:challenge');
  assert.strictEqual(challengedMessages[0].duelId, challenge.duelId);
  assert.strictEqual(challengedMessages[0].from, challengerAccount.peerId);
  assert.strictEqual(challengedMessages[0].to, challengedAccount.peerId);

  const accept = realm.handleParsedMessage(challenged, { t: 'rc:pvp:accept', duelId: challenge.duelId });
  assert.strictEqual(accept.ok, true, 'accept should succeed');
  const acceptedByChallenger = readMessages(challenger)[0];
  const acceptedByChallenged = readMessages(challenged)[0];
  assert.strictEqual(acceptedByChallenger.t, 'rc:pvp:accept');
  assert.strictEqual(acceptedByChallenged.t, 'rc:pvp:accept');
  assert.strictEqual(acceptedByChallenger.duelId, challenge.duelId);
  assert.strictEqual(acceptedByChallenged.duelId, challenge.duelId);
  assert.strictEqual(acceptedByChallenger.from, challengedAccount.peerId, 'challenger sees the challenged peer as opponent');
  assert.strictEqual(acceptedByChallenger.to, challengerAccount.peerId);
  assert.strictEqual(acceptedByChallenged.from, challengerAccount.peerId, 'challenged sees the challenger as opponent');
  assert.strictEqual(acceptedByChallenged.to, challengedAccount.peerId);
  assert.strictEqual(acceptedByChallenger.actorPeerId, challengerAccount.peerId, 'challenger acts first deterministically');
  assert.strictEqual(acceptedByChallenged.actorPeerId, challengerAccount.peerId, 'challenger acts first for both participants');
  assert.strictEqual(acceptedByChallenger.turn, 1);
  assert.strictEqual(acceptedByChallenged.turn, 1);
  assert(acceptedByChallenger.deadlineAt > 0, 'accept includes turn deadline');
  assert.deepStrictEqual(acceptedByChallenger.state, acceptedByChallenged.state, 'both participants receive the same state snapshot');
  return { duelId: challenge.duelId, accepted: acceptedByChallenger };
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pvp-turn-arbitration-'));
let nowMs = 50_000;
const realm = serverApi.createRealmServer({
  ledgerFile: path.join(tempDir, 'ledger.json'),
  accountsFile: path.join(tempDir, 'accounts.json'),
  seasonId: 'pvp-turn-arbitration',
  now: () => nowMs,
  pvpTurnTimeoutMs: 250,
  saveDelayMs: 0,
  quiet: true,
});

const unauthenticated = makeClient('unauthenticated');
const alice = makeClient('alice');
const bob = makeClient('bob');
const observer = makeClient('observer');
realm.addClient(unauthenticated);
realm.addClient(alice);
realm.addClient(bob);
realm.addClient(observer);

const aliceAccount = authenticate(realm, alice, makeCredential(), 'Alice');
const bobAccount = authenticate(realm, bob, makeCredential(), 'Bob');
authenticate(realm, observer, makeCredential(), 'Observer');

assertRejected(realm.handleParsedMessage(unauthenticated, {
  t: 'rc:pvp:turn:submit',
  duelId: 'duel-missing-auth',
  turn: 1,
  action: 'strike',
  submissionId: 'unauth-1',
}), 'account_required');
assert.strictEqual(readMessages(unauthenticated)[0].t, 'join:error');
assert.strictEqual(readMessages(alice).length, 0, 'unauthenticated PvP submit should not reach authenticated clients');
assert.strictEqual(readMessages(observer).length, 0, 'unauthenticated PvP submit should not reach observers');

const firstDuel = challengeAndAccept(realm, alice, bob, aliceAccount, bobAccount, 'first');
assert.strictEqual(readMessages(observer).length, 0, 'challenge/accept frames are participant-only');

assertRejected(realm.handleParsedMessage(bob, {
  t: 'rc:pvp:turn:submit',
  duelId: firstDuel.duelId,
  turn: 1,
  action: 'strike',
  submissionId: 'bob-wrong-actor',
}), 'pvp_wrong_actor');
assert.strictEqual(readMessages(bob)[0].t, 'rc:pvp:error');
assert.strictEqual(readMessages(alice).length, 0, 'wrong-actor rejection should not broadcast to opponent');

const strike = realm.handleParsedMessage(alice, {
  t: 'rc:pvp:turn:submit',
  duelId: firstDuel.duelId,
  turn: 1,
  action: 'strike',
  submissionId: 'alice-turn-1',
  from: 'forged-peer',
  actorPeerId: bobAccount.peerId,
  amount: 999,
});
assert.strictEqual(strike.ok, true, 'actor should submit the current turn');
const aliceTurn = readMessages(alice)[0];
const bobTurn = readMessages(bob)[0];
assert.deepStrictEqual(aliceTurn, bobTurn, 'turn state should be identical for both participants');
assert.strictEqual(aliceTurn.t, 'rc:pvp:turn:state');
assert.strictEqual(aliceTurn.duelId, firstDuel.duelId);
assert.strictEqual(aliceTurn.turn, 1);
assert.strictEqual(aliceTurn.actorPeerId, aliceAccount.peerId, 'server canonicalizes actor from authenticated client');
assert.strictEqual(aliceTurn.nextActorPeerId, bobAccount.peerId);
assert.strictEqual(aliceTurn.nextTurn, 2);
assert(aliceTurn.state.participants[bobAccount.peerId].hp < firstDuel.accepted.state.participants[bobAccount.peerId].hp,
  'server-computed strike should reduce opponent HP');
assert.strictEqual(readMessages(observer).length, 0, 'turn state is not broadcast to observers');

assertRejected(realm.handleParsedMessage(alice, {
  t: 'rc:pvp:turn:submit',
  duelId: firstDuel.duelId,
  turn: 1,
  action: 'strike',
  submissionId: 'alice-turn-1',
}), 'turn_submission_replayed');
assert.strictEqual(readMessages(alice)[0].error.code, 'turn_submission_replayed');
assert.strictEqual(readMessages(bob).length, 0, 'replay should not emit another turn state');

assertRejected(realm.handleParsedMessage(alice, {
  t: 'rc:pvp:turn:submit',
  duelId: firstDuel.duelId,
  turn: 1,
  action: 'guard',
  submissionId: 'alice-turn-1-new-id',
}), 'stale_turn_submission');
assert.strictEqual(readMessages(alice)[0].error.code, 'stale_turn_submission');

const forgedResult = realm.handleParsedMessage(alice, {
  t: 'rc:pvp:result',
  duelId: firstDuel.duelId,
  winner: aliceAccount.peerId,
  loser: bobAccount.peerId,
  reason: 'forged',
});
assertRejected(forgedResult, 'authoritative_message_requires_server');
assert.strictEqual(readMessages(alice)[0].error.code, 'authoritative_message_requires_server');
assert.strictEqual(readMessages(bob).length, 0, 'client-authored terminal PvP result remains blocked');

const flee = realm.handleParsedMessage(bob, {
  t: 'rc:pvp:turn:submit',
  duelId: firstDuel.duelId,
  turn: 2,
  action: 'flee',
  submissionId: 'bob-turn-2',
});
assert.strictEqual(flee.ok, true, 'flee should be accepted as explicit forfeit');
const aliceResult = readMessages(alice)[0];
const bobResult = readMessages(bob)[0];
assert.deepStrictEqual(aliceResult, bobResult, 'terminal result should be identical for both participants');
assert.strictEqual(aliceResult.t, 'rc:pvp:result');
assert.strictEqual(aliceResult.reason, 'forfeit');
assert.strictEqual(aliceResult.winner, aliceAccount.peerId);
assert.strictEqual(aliceResult.loser, bobAccount.peerId);
assert.strictEqual(readMessages(observer).length, 0, 'terminal PvP result is participant-only');

assertRejected(realm.handleParsedMessage(bob, {
  t: 'rc:pvp:turn:submit',
  duelId: firstDuel.duelId,
  turn: 2,
  action: 'strike',
  submissionId: 'after-finished',
}), 'pvp_duel_finished');
assert.strictEqual(readMessages(bob)[0].error.code, 'pvp_duel_finished');

const timeoutDuel = challengeAndAccept(realm, bob, alice, bobAccount, aliceAccount, 'timeout');
readMessages(observer);
nowMs = timeoutDuel.accepted.deadlineAt + 1;
assert.strictEqual(realm.sweepPvpTurnTimeouts(), 1, 'timeout sweep should finish one overdue duel');
const bobTimeout = readMessages(bob)[0];
const aliceTimeout = readMessages(alice)[0];
assert.deepStrictEqual(bobTimeout, aliceTimeout, 'timeout result should be identical for both participants');
assert.strictEqual(bobTimeout.t, 'rc:pvp:result');
assert.strictEqual(bobTimeout.reason, 'timeout');
assert.strictEqual(bobTimeout.loser, bobAccount.peerId, 'current actor loses on timeout');
assert.strictEqual(bobTimeout.winner, aliceAccount.peerId);
assert.strictEqual(readMessages(observer).length, 0, 'timeout result is participant-only');

realm.close();
fs.rmSync(tempDir, { recursive: true, force: true });
console.log('pvp turn arbitration verification passed');
