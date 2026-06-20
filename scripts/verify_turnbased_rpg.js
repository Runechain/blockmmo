const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function loadFactory(rel, name) {
  let src = fs.readFileSync(path.join(root, rel), 'utf8');
  src = src.replace(/^export\s+/gm, '');
  return new Function(src + '\nreturn ' + name + ';')();
}

const createModeManager = loadFactory('engine/mode.js', 'createModeManager');
const createBattlefieldMode = loadFactory('engine/battlefield.js', 'createBattlefieldMode');
const createTurnBasedMode = loadFactory('engine/turnbased.js', 'createTurnBasedMode');
const createSegmentSequencer = loadFactory('engine/sequencer.js', 'createSegmentSequencer');

function makeCtx() {
  const calls = [];
  return {
    canvas: { width: 640, height: 360 },
    calls,
    save() { calls.push('save'); },
    restore() { calls.push('restore'); },
    translate() {},
    fillRect() { calls.push('fillRect'); },
    strokeRect() { calls.push('strokeRect'); },
    beginPath() {},
    ellipse() {},
    arc() {},
    fill() {},
    stroke() {},
    fillText() { calls.push('fillText'); },
    set fillStyle(v) { this._fillStyle = v; },
    get fillStyle() { return this._fillStyle; },
    set strokeStyle(v) { this._strokeStyle = v; },
    get strokeStyle() { return this._strokeStyle; },
    set lineWidth(v) { this._lineWidth = v; },
    get lineWidth() { return this._lineWidth; },
    set font(v) { this._font = v; },
    get font() { return this._font; },
    set textAlign(v) { this._textAlign = v; },
    get textAlign() { return this._textAlign; },
    set imageSmoothingEnabled(v) { this._imageSmoothingEnabled = v; },
    get imageSmoothingEnabled() { return this._imageSmoothingEnabled; },
  };
}

function makeApi(opts = {}) {
  const api = {
    viewW: 640,
    viewH: 360,
    logs: [],
    duelResults: [],
    exits: [],
    player: {
      id: 'recorded',
      name: 'Recorded',
      hp: opts.hp || 100,
      maxHp: opts.maxHp || 100,
      sta: opts.sta || 100,
      maxSta: opts.maxSta || 100,
      initiative: opts.initiative,
      getMeleeDamage(reason) {
        api.lastDamageReason = reason;
        return opts.meleeDamage || 20;
      },
      spendStamina(reason) {
        api.lastSpendReason = reason;
        return opts.staminaOk !== false;
      },
      regen() {},
    },
    assets: { drawSheet() { return false; } },
    log(msg) { api.logs.push(String(msg)); },
    onDuelResult(result, data) { this.duelResults.push({ result, data }); },
    onExit(id, data) { this.exits.push({ id, data }); },
  };
  return api;
}

function attachServerNet(api, id = 'local-peer', opts = {}) {
  const handlers = {};
  api.net = {
    id,
    sent: [],
    on(type, fn) {
      (handlers[type] || (handlers[type] = [])).push(fn);
      return () => {
        handlers[type] = (handlers[type] || []).filter((handler) => handler !== fn);
      };
    },
    send(message) {
      this.sent.push(message);
      return opts.sendResult !== false;
    },
    emit(message) {
      for (const fn of handlers[message.t] || []) fn(message);
    },
  };
  return api.net;
}

function withPinnedRandom(fn) {
  const orig = Math.random;
  Math.random = () => 0.5;
  try { fn(); } finally { Math.random = orig; }
}

function tick(mode, n = 1, input = {}) {
  for (let i = 0; i < n; i++) mode.update(0.05, input);
}

function runUntil(mode, pred, label, max = 1000) {
  for (let i = 0; i < max; i++) {
    if (pred()) return;
    mode.update(0.05, {});
  }
  assert.fail('timed out waiting for ' + label + ' at phase ' + mode.getState().phase);
}

function selectAction(mode, key) {
  runUntil(mode, () => ['menu', 'win', 'lose'].includes(mode.getState().phase), 'menu');
  assert.strictEqual(mode.getState().phase, 'menu', 'expected menu before selecting ' + key);
  const dual = !!mode.getState().dc;
  const actions = dual ? ['strikeA', 'strikeB', 'strikeAll', 'guard'] : ['strike', 'guard', 'focus', 'flee'];
  const target = Math.max(0, actions.indexOf(key));
  for (let guard = 0; mode.getState().menuIndex !== target && guard < 12; guard++) {
    tick(mode, 1, { down: true });
    tick(mode, 1, {});
  }
  tick(mode, 1, { confirm: true });
  tick(mode, 1, {});
}

function finishWithStrike(mode, api) {
  selectAction(mode, 'strike');
  runUntil(mode, () => mode.getState().finished || api.duelResults.length > 0, 'duel finish', 1000);
}

let pass = 0;
function ok(label) {
  pass++;
  console.log('  ok  ' + label);
}

// Standard mode-manager interface plus renderer smoke.
{
  const ctx = makeCtx();
  const api = makeApi();
  const mode = createTurnBasedMode({ id: 'iface', opponent: { name: 'Interface Foe', hp: 30, attack: 1 } });
  for (const fn of ['enter', 'exit', 'update', 'render']) assert.strictEqual(typeof mode[fn], 'function', fn + ' exported');
  const manager = createModeManager();
  manager.setMode(mode, ctx, api);
  runUntil(mode, () => mode.getState().phase === 'menu', 'intro');
  manager.render(ctx, { x: 0, y: 0, w: 640, h: 360 });
  assert(ctx.calls.includes('fillRect') && ctx.calls.includes('fillText'), 'renderer drew battle scene and menu text');
  assert.strictEqual(mode.getState().turn.actor, 'hero', 'default initiative gives hero the first menu');
  ok('standard mode interface renders a battle scene through the mode manager');
}

// Explicit initiative can give the foe first turn without changing default hero-first behavior.
withPinnedRandom(() => {
  const ctx = makeCtx();
  const api = makeApi({ hp: 100 });
  const mode = createTurnBasedMode({
    id: 'initiative',
    initiative: { hero: 1, foe: 9 },
    opponent: { name: 'Fast Foe', hp: 40, attack: 6, defense: 0 },
  });
  mode.enter(ctx, api);
  runUntil(mode, () => mode.getState().phase === 'foeWindup', 'foe initiative');
  assert.strictEqual(mode.getState().turn.initiative.first, 'foe');
  assert.strictEqual(mode.getState().turn.actor, 'foe');
  runUntil(mode, () => mode.getState().phase === 'menu', 'hero menu after foe turn');
  assert(api.player.hp < api.player.maxHp, 'foe first turn damaged the hero');
  assert.strictEqual(mode.getState().turn.actor, 'hero');
  ok('initiative selects first actor and advances into hero turn');
});

// 1v1 duel is playable end-to-end and returns a PvP-compatible duel result once.
withPinnedRandom(() => {
  const ctx = makeCtx();
  const api = makeApi({ meleeDamage: 30 });
  const net = attachServerNet(api, 'local-peer', { sendResult: false });
  const mode = createTurnBasedMode({
    id: 'verify-duel',
    duelId: 'duel-verify',
    peerId: 'peer-1',
    opponent: { name: 'Peer Recorded', hp: 24, attack: 1, defense: 0 },
  });
  mode.enter(ctx, api);
  finishWithStrike(mode, api);
  assert.strictEqual(net.sent.length, 0, 'non-authoritative local PvP should not submit relay turns');
  assert.strictEqual(api.duelResults.length, 1, 'duel result fired once');
  assert.deepStrictEqual(api.duelResults[0].data, { mode: 'turnbased' });
  assert.strictEqual(api.duelResults[0].result.duelId, 'duel-verify');
  assert.strictEqual(api.duelResults[0].result.reason, 'defeat');
  assert.strictEqual(api.duelResults[0].result.winner, 'Recorded');
  assert.strictEqual(api.exits[0].id, 'verify-duel');
  assert.strictEqual(mode.getState().turn.submittedAction, 'strike');
  mode.update(0.05, {});
  mode.update(0.05, {});
  assert.strictEqual(api.duelResults.length, 1, 'finished duel is idempotent');
  ok('1v1 PvP-shaped duel resolves end-to-end with stable result');
});

// Connected battlefield acceptance waits for the server-authored accept frame.
{
  const ctx = makeCtx();
  const api = makeApi();
  api.duelAccepts = [];
  api.onDuelAccepted = function onDuelAccepted(message, data) {
    this.duelAccepts.push({ message, data });
  };
  const net = attachServerNet(api, 'bob');
  const mode = createBattlefieldMode({ id: 'verify-field', rivals: 0, waves: [] });
  mode.enter(ctx, api);
  net.emit({ t: 'rc:pvp:challenge', duelId: 'duel-server-accept', from: 'alice', to: 'bob' });
  assert.strictEqual(mode.getState().pending['duel-server-accept'].from, 'alice');
  assert.strictEqual(mode.acceptDuel('duel-server-accept'), true);
  assert.strictEqual(net.sent[0].t, 'rc:pvp:accept');
  assert.strictEqual(api.duelAccepts.length, 0, 'live accept should wait for server accept frame');
  assert.strictEqual(mode.getState().duel.status, 'accepting');
  net.emit({
    t: 'rc:pvp:accept',
    duelId: 'duel-server-accept',
    from: 'alice',
    to: 'bob',
    actorPeerId: 'alice',
    turn: 1,
    state: { participants: {} },
  });
  assert.strictEqual(api.duelAccepts.length, 1, 'server accept frame starts the duel once');
  assert.strictEqual(api.duelAccepts[0].message.from, 'alice');
  assert.strictEqual(mode.getState().duel.peerId, 'alice');
  ok('connected battlefield PvP waits for relay-owned accept frames');
}

// Server-arbitrated PvP submits turns to the relay and does not resolve locally.
withPinnedRandom(() => {
  const ctx = makeCtx();
  const api = makeApi({ meleeDamage: 60 });
  const net = attachServerNet(api, 'local-peer');
  const mode = createTurnBasedMode({
    id: 'server-duel',
    duelId: 'duel-server-verify',
    peerId: 'peer-1',
    actorPeerId: 'local-peer',
    turn: 1,
    state: {
      participants: {
        'local-peer': { name: 'Recorded', hp: 100, maxHp: 100, sta: 100, maxSta: 100 },
        'peer-1': { name: 'Peer Recorded', hp: 24, maxHp: 90, sta: 100, maxSta: 100 },
      },
    },
    opponent: { name: 'Peer Recorded', hp: 24, attack: 1, defense: 0 },
  });
  mode.enter(ctx, api);
  selectAction(mode, 'strike');
  assert.strictEqual(net.sent.length, 1, 'PvP action should submit exactly one server turn');
  assert.strictEqual(net.sent[0].t, 'rc:pvp:turn:submit');
  assert.strictEqual(net.sent[0].duelId, 'duel-server-verify');
  assert.strictEqual(net.sent[0].turn, 1);
  assert.strictEqual(net.sent[0].action, 'strike');
  tick(mode, 30, {});
  assert.strictEqual(api.duelResults.length, 0, 'server PvP should not resolve locally while waiting');
  net.emit({
    t: 'rc:pvp:result',
    duelId: 'duel-server-verify',
    winner: 'local-peer',
    loser: 'peer-1',
    reason: 'defeat',
    state: {
      participants: {
        'local-peer': { name: 'Recorded', hp: 100, maxHp: 100, sta: 100, maxSta: 100 },
        'peer-1': { name: 'Peer Recorded', hp: 0, maxHp: 90, sta: 100, maxSta: 100 },
      },
    },
  });
  runUntil(mode, () => mode.getState().finished || api.duelResults.length > 0, 'server duel finish', 100);
  assert.strictEqual(api.duelResults.length, 1, 'server result should be the only PvP finish path');
  assert.strictEqual(api.duelResults[0].result.reason, 'defeat');
  assert.strictEqual(api.duelResults[0].result.winner, 'local-peer');
  ok('server-arbitrated PvP waits for relay-owned turn results');
});

// Boss RPG phase is usable from the segment sequencer.
withPinnedRandom(() => {
  const ctx = makeCtx();
  const api = makeApi({ meleeDamage: 40 });
  let activeMode = null;
  let completed = null;
  const script = {
    id: 'verify-boss',
    name: 'Verifier Boss',
    beat: 0.01,
    segments: [
      { mode: 'turnbased', name: 'Face to face', payload: { id: 'boss-duel', opponent: { name: 'Boss Phase', hp: 28, attack: 1 } }, complete: { event: 'duel' } },
    ],
  };
  const sequencer = createSegmentSequencer(script);
  api.onDuelResult = function(result, data) {
    this.duelResults.push({ result, data });
    sequencer.segmentEvent('duel', result);
  };
  api.onBossComplete = function(_script, result) { completed = result; };
  sequencer.enter(api, {
    startMode(segment) {
      assert.strictEqual(segment.mode, 'turnbased');
      activeMode = createTurnBasedMode(segment.payload);
      activeMode.enter(ctx, api);
    },
    exitMode() { activeMode = null; },
  });
  sequencer.update(0.05);
  assert(activeMode, 'sequencer started turnbased mode');
  const modeRef = activeMode;
  finishWithStrike(modeRef, api);
  assert(sequencer.isDone(), 'sequencer completed after duel event');
  assert(completed && completed.completed, 'boss complete callback fired');
  ok('turn-based boss phase completes through the segment sequencer');
});

// Static host seam checks: rc:pvp accept metadata reaches the turn-based encounter.
{
  const battlefield = fs.readFileSync(path.join(root, 'engine', 'battlefield.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert(battlefield.includes("call(api, 'onDuelAccepted'") && battlefield.includes('acceptedBy:localId()'),
    'acceptDuel should surface the accepted handshake to the host');
  assert(index.includes('startTurnDuel(m&&m.from,m&&m.duelId,m)'), 'host should pass accepted server duel frame into turn duel');
  assert(index.includes('duelId:duelId||null'), 'turn duel encounter should retain PvP duelId');
  assert(!pkg.scripts || !pkg.scripts.build, 'no build step should be introduced');
  ok('PvP challenge/accept handoff remains local and buildless');
}

console.log('\nturn-based RPG verification passed (' + pass + ' checks).');
