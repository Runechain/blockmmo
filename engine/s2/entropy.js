// Derives a deterministic 256-bit behavioral entropy seed from the S1 event ring buffer.
// The seed encodes playstyle signals (aggression, boss efficiency, ending choice, etc.)
// and is used to personalise S2 content generation per player.
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

  function deriveSignals(events) {
    const deaths        = events.filter(e => e.type === 'player.died').length;
    const bossTriggered = events.filter(e => e.type === 'boss.triggered').length;
    const bossDefeated  = events.filter(e => e.type === 'boss.defeated').length;
    const kills         = events.filter(e => e.type === 'combat.creature_defeated').length;
    const runeEarned    = events.filter(e => e.type === 'economy.rune_earned')
                                .reduce((s, e) => s + (e.payload && e.payload.amount || 0), 0);
    const runeSpent     = events.filter(e => e.type === 'economy.rune_spent')
                                .reduce((s, e) => s + (e.payload && e.payload.amount || 0), 0);
    const levels        = events.filter(e => e.type === 'player.stat_leveled').length;
    const relics        = events.filter(e => e.type === 'player.relic_forged').length;
    const endingEvt     = events.find(e => e.type === 'ending.chosen');
    const ending        = endingEvt && endingEvt.payload && endingEvt.payload.choice || 'none';

    const areaCounts = {};
    for (const e of events) {
      const a = (e.position && e.position.area) || 'unknown';
      areaCounts[a] = (areaCounts[a] || 0) + 1;
    }
    const total = events.length || 1;

    return {
      death_rate:       Math.min(deaths / total, 1),
      boss_efficiency:  bossTriggered > 0 ? bossDefeated / bossTriggered : 0,
      kill_per_death:   Math.min(kills / Math.max(deaths, 1), 50) / 50,
      rune_hoard_ratio: (runeEarned + runeSpent) > 0 ? runeEarned / (runeEarned + runeSpent) : 0.5,
      level_density:    Math.min(levels / total, 1),
      relic_density:    Math.min(relics / total, 1),
      area2_weight:     (areaCounts['area2'] || 0) / total,
      area3_weight:     (areaCounts['area3'] || 0) / total,
      ending_code:      ending === 'A' ? 0.1 : ending === 'B' ? 0.5 : ending === 'C' ? 0.9 : 0,
    };
  }

  function signalsToSeed(signals, playerId) {
    // 8 × FNV-1a32 passes with distinct salts → 256-bit seed (64 hex chars)
    const salts   = ['alpha','beta','gamma','delta','epsilon','zeta','eta','theta'];
    const sigStr  = Object.keys(signals).map(k => k + '=' + signals[k].toFixed(6)).join(',');
    const parts   = [];
    for (let i = 0; i < 8; i++) {
      const h = fnv1a32(salts[i] + ':' + playerId + ':' + sigStr);
      parts.push(h.toString(16).padStart(8, '0'));
    }
    return parts.join('');
  }

  function generateEntropySeed() {
    const E = globalThis.RUNECHAIN_EVENTS;
    if (!E) return null;
    const events = E.getBuffer();
    if (!events.length) return null;
    const playerId = (events[0].player && events[0].player.id) || 'anon';
    const signals  = deriveSignals(events);
    return signalsToSeed(signals, playerId);
  }

  function attach() {
    const seed = generateEntropySeed();
    if (seed) globalThis.__rc_s2_seed = seed;
    return seed;
  }

  // Export for S2 broker tasks and for in-game opt-in UI
  return { generateEntropySeed, attach, _deriveSignals: deriveSignals };
});
