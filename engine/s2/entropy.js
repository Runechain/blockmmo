(function(root, factory) {
  if (typeof module !== 'undefined') module.exports = factory();
  else root.RUNECHAIN_S2_ENTROPY = factory();
})(globalThis, function() {
  'use strict';

  function fnv1a32(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
  }

  function safeNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  function isStr(value) {
    return typeof value === 'string' && value.length > 0;
  }

  function parseTime(event, fallback) {
    const t = Date.parse(event && event.occurredAt);
    if (!Number.isNaN(t)) return t;
    return fallback;
  }

  function addCount(map, key) {
    if (!key) return;
    map[key] = (map[key] || 0) + 1;
  }

  function topItems(map, maxItems) {
    return Object.keys(map)
      .map((key) => [key, map[key]])
      .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
      .slice(0, maxItems)
      .map((row) => ({ item: row[0], count: row[1] }));
  }

  function clamp01(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
  }

  function deriveSignals(events) {
    const list = Array.isArray(events) ? events : [];
    const total = list.length || 1;
    const now = Date.now();
    const playerId = String((list[0] && list[0].player && list[0].player.id) || 'anon');

    const areaCounts = {};
    const modeCounts = {};
    const endingChoices = {};
    const questCounts = {};
    const deathByCause = {};
    const respawnByArea = {};
    const typeCounts = {};
    const combat = {
      deaths: 0,
      respawns: 0,
      creatureDefeats: 0,
      bossDefeats: 0,
      bossTriggers: 0,
      playerHits: 0,
      levelUps: 0,
      relicForged: 0,
      runeEarned: 0,
      runeSpent: 0,
    };

    const ts = list.map((event, index) => parseTime(event, now + index)).sort((a, b) => a - b);
    const timing = {
      firstAtMs: ts[0] || now,
      lastAtMs: ts[ts.length - 1] || now,
      avgGapMs: 0,
      spanMs: 0,
    };
    if (ts.length > 1) {
      let gaps = 0;
      for (let i = 1; i < ts.length; i++) gaps += ts[i] - ts[i - 1];
      timing.avgGapMs = gaps / Math.max(1, ts.length - 1);
      timing.spanMs = ts[ts.length - 1] - ts[0];
    } else {
      timing.avgGapMs = 250;
      timing.spanMs = 0;
    }

    const trace = list.map((event, index) => {
      const mode = event && event.source && event.source.mode ? event.source.mode : 'town';
      const area = (event && event.position && event.position.area) || (event && event.source && (event.source.areaId || event.source.segmentId)) || 'unknown';
      const type = isStr(event && event.type) ? event.type : 'event.unknown';
      const outcome = isStr(event && event.payload && event.payload.result) ? event.payload.result : 'ok';

      addCount(typeCounts, type);
      addCount(areaCounts, area);
      addCount(modeCounts, mode);
      return String(index) + ':' + type + ':' + mode + ':' + area + ':' + outcome;
    }).join('|');

    list.forEach((event) => {
      const payload = event && event.payload || {};
      const source = event && event.source || {};
      const area = (event && event.position && event.position.area) || source.areaId || source.segmentId || 'unknown';
      const type = isStr(event && event.type) ? event.type : 'event.unknown';
      const choice = isStr(payload && payload.choice) ? payload.choice : null;
      const questId = isStr(payload && payload.questId) ? payload.questId : null;
      const eventMode = source.mode || 'town';
      const isPlayerArea = event && event.position && event.position.area ? event.position.area : null;

      if (type === 'ending.chosen' && choice) addCount(endingChoices, choice);
      if (type === 'quest.completed' || type === 'quest.progressed' || type === 'quest.started') {
        addCount(questCounts, (questId ? questId : isStr(payload && payload.questId) ? payload.questId : 'unknown'));
      }
      if (type === 'combat.creature_defeated') {
        combat.creatureDefeats += 1;
      }
      if (type === 'boss.triggered') {
        combat.bossTriggers += 1;
      }
      if (type === 'boss.defeated') {
        combat.bossDefeats += 1;
      }
      if (type === 'player.died') {
        combat.deaths += 1;
        addCount(deathByCause, isStr(payload && payload.cause) ? payload.cause : 'unknown');
        addCount(deathByCause, 'mode:'+eventMode);
      }
      if (type === 'player.respawned') {
        combat.respawns += 1;
        addCount(respawnByArea, area);
      }
      if (type === 'player.stat_leveled') combat.levelUps += 1;
      if (type === 'player.relic_forged') combat.relicForged += 1;
      if (type === 'economy.rune_earned') combat.runeEarned += safeNumber(payload.amount);
      if (type === 'economy.rune_spent') combat.runeSpent += safeNumber(payload.amount);
      if (type === 'combat.hit_landed') combat.playerHits += 1;

      if (eventMode && isStr(eventMode) && isStr(payload && payload.cause) && isPlayerArea) {
        const key = String(eventMode) + '/' + isPlayerArea + ':' + (payload.cause || 'unknown');
        addCount(questCounts, key);
      }
    });

    return {
      playerId,
      eventCount: list.length,
      signatureTrace: trace,
      timing: {
        firstAtMs: timing.firstAtMs,
        lastAtMs: timing.lastAtMs,
        spanSec: Math.max(0, timing.spanMs / 1000),
        avgGapMs: timing.avgGapMs,
        avgGapSec: timing.avgGapMs / 1000,
      },
      typeCounts,
      areaDistribution: topItems(areaCounts, 6),
      modeDistribution: topItems(modeCounts, 6),
      endingDistribution: topItems(endingChoices, 6),
      questDistribution: topItems(questCounts, 8),
      typeDensity: topItems(typeCounts, 12),
      deaths: {
        total: combat.deaths,
        byCause: topItems(deathByCause, 8),
        byRespawnArea: topItems(respawnByArea, 6),
      },
      combat,
      aggregates: {
        deathRate: clamp01(combat.deaths / total),
        levelDensity: clamp01((combat.levelUps + 1) / total),
        relicDensity: clamp01((combat.relicForged + 1) / total),
        bossEfficiency: combat.bossTriggers ? combat.bossDefeats / combat.bossTriggers : 0,
        victoryBalance: clamp01((combat.creatureDefeats + combat.bossDefeats + 1) / Math.max(1, combat.deaths + 1)),
        runeEconomy: (combat.runeEarned + combat.runeSpent) > 0 ? clamp01(combat.runeEarned / (combat.runeEarned + combat.runeSpent)) : 0.5,
      },
      areaTop3: topItems(areaCounts, 3).map((row) => row.item).join('>'),
    };
  }

  function signalsToSeed(signals) {
    const payload = [
      signals.playerId,
      signals.eventCount,
      signals.signatureTrace,
      signals.timing.firstAtMs,
      signals.timing.lastAtMs,
      signals.aggregates.deathRate.toFixed(6),
      signals.aggregates.bossEfficiency.toFixed(6),
      signals.aggregates.victoryBalance.toFixed(6),
      signals.timing.spanSec.toFixed(3),
      signals.areaTop3,
      JSON.stringify(signals.typeCounts),
    ].join('|');
    const salts = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta'];
    const parts = [];
    for (let i = 0; i < 8; i++) {
      const hashed = fnv1a32(salts[i] + ':' + payload);
      parts.push(hashed.toString(16).padStart(8, '0'));
    }
    return parts.join('');
  }

  function processEvents(events) {
    const signals = deriveSignals(events || []);
    if (!signals.eventCount) return { seed: null, signals: signals };
    const seed = signalsToSeed(signals);
    return { playerId: signals.playerId, seed: seed, signals: signals };
  }

  function generateEntropySeed() {
    const E = globalThis.RUNECHAIN_EVENTS;
    if (!E || typeof E.getBuffer !== 'function') return null;
    const events = E.getBuffer();
    const result = processEvents(events);
    if (result && result.seed) globalThis.__rc_s2_seed = result.seed;
    return result.seed;
  }

  function attach() {
    return generateEntropySeed();
  }

  return { processEvents, generateEntropySeed, attach, _deriveSignals: deriveSignals };
});
