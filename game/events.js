(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RUNECHAIN_EVENTS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const RING_SIZE = 500;
  const ALLOWED_MODES = ['town', 'interior', 'platformer', 'battlefield', 'turnbased', 'sequencer', 'server'];
  const SENSITIVE_KEYS = new Set([
    'email',
    'wallet',
    'walletAddress',
    'wallet_address',
    'authToken',
    'auth_token',
    'token',
    'secret',
    'authorization',
    'cookie',
    'ip',
    'ipAddress',
    'ip_address',
  ].map(normalizeKey));
  const buffer = [];
  let counter = 0;

  function isObject(value) {
    return value && typeof value === 'object';
  }

  function normalizeKey(value) {
    return String(value || '').toLowerCase();
  }

  function cleanValue(value) {
    if (!isObject(value)) return value;
    if (Array.isArray(value)) return value.map(cleanValue);
    const out = {};
    for (const key of Object.keys(value)) {
      if (SENSITIVE_KEYS.has(normalizeKey(key))) continue;
      out[key] = cleanValue(value[key]);
    }
    return out;
  }

  function cleanObject(value) {
    if (!isObject(value)) return {};
    const out = {};
    for (const key of Object.keys(value)) {
      if (SENSITIVE_KEYS.has(normalizeKey(key))) continue;
      if (value[key] !== undefined) out[key] = value[key];
    }
    return out;
  }

  function sourceFrom(snapshot) {
    const mode = snapshot && ALLOWED_MODES.includes(snapshot.mode) ? snapshot.mode : 'town';
    const source = { mode };
    if (snapshot && snapshot.areaId) source.areaId = snapshot.areaId;
    if (snapshot && snapshot.questId) source.questId = snapshot.questId;
    if (snapshot && snapshot.sessionId) source.sessionId = snapshot.sessionId;
    if (snapshot && snapshot.segmentId) source.segmentId = snapshot.segmentId;
    return source;
  }

  function positionFrom(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return null;
    if (typeof snapshot.x !== 'number' || typeof snapshot.y !== 'number') return null;
    const position = { x: snapshot.x, y: snapshot.y };
    ['z', 'vx', 'vy', 'dirX', 'dirY'].forEach((key) => {
      if (typeof snapshot[key] === 'number') position[key] = snapshot[key];
    });
    if (typeof snapshot.area === 'string') position.area = snapshot.area;
    if (typeof snapshot.areaId === 'string') position.area = position.area || snapshot.areaId;
    if (typeof snapshot.moving === 'boolean') position.moving = snapshot.moving;
    return position;
  }

  function stateFrom(snapshot) {
    if (!isObject(snapshot)) return null;
    const state = {};
    if (typeof snapshot.hp === 'number') state.hp = snapshot.hp;
    if (typeof snapshot.maxHp === 'number' && snapshot.maxHp > 0) state.maxHp = snapshot.maxHp;
    if (typeof snapshot.stamina === 'number') state.stamina = snapshot.stamina;
    if (typeof snapshot.maxStamina === 'number' && snapshot.maxStamina > 0) state.maxStamina = snapshot.maxStamina;
    if (Number.isInteger(snapshot.level) && snapshot.level >= 1) state.level = snapshot.level;
    if (typeof snapshot.dead === 'boolean') state.dead = snapshot.dead;
    if (typeof snapshot.skin === 'string' && snapshot.skin) state.skin = snapshot.skin;
    return Object.keys(state).length ? state : null;
  }

  function emit(type, payload, playerSnapshot, positionSnapshot) {
    const player = cleanObject(playerSnapshot);
    const sourceSnapshot = positionSnapshot && positionSnapshot.mode ? positionSnapshot : {};
    const event = {
      schemaVersion: '1.0.0',
      eventId: 'ev-' + Date.now() + '-' + (++counter),
      type: String(type || 'event.unknown'),
      occurredAt: new Date().toISOString(),
      player: { id: String(player.id || 'anon') },
      source: sourceFrom(sourceSnapshot),
      payload: cleanValue(payload),
    };
    const position = positionFrom(positionSnapshot);
    const state = stateFrom(playerSnapshot);
    if (position) event.position = position;
    if (state) event.state = state;
    buffer.push(event);
    if (buffer.length > RING_SIZE) buffer.splice(0, buffer.length - RING_SIZE);
    return event;
  }

  function getBuffer() {
    return buffer.slice();
  }

  function clear() {
    buffer.length = 0;
  }

  function flushEvents() {
    const out = getBuffer();
    clear();
    return out;
  }

  function summary() {
    const typeCounts = {};
    buffer.forEach((event) => {
      typeCounts[event.type] = (typeCounts[event.type] || 0) + 1;
    });
    return {
      totalEvents: buffer.length,
      typeCounts: typeCounts,
      recentTypes: buffer.slice(-10).map((event) => event.type),
      firstTimestamp: buffer.length ? buffer[0].occurredAt : null,
      lastTimestamp: buffer.length ? buffer[buffer.length - 1].occurredAt : null
    };
  }

  return { emit, getBuffer, flushEvents, clear, summary, RING_SIZE };
});
