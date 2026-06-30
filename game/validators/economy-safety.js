// Gate 2: Economy safety — Gold = cosmetics only, no RUNE bypasses, halvingEffect valid.
//
// RUNECHAIN design bible: RUNE buys power only at a Hearthlight. Gold is cosmetics only.
// Character-sale is the sole real-money cashout. Power may not be sold for Gold.
// (DESIGN-BIBLE Ruling 1 + PRD §F4/F5)
'use strict';

const POWER_KEYS = ['atk', 'def', 'maxHp', 'speed', 'damage', 'armor', 'stat', 'level', 'power'];
const RUNE_BYPASS_KEYS = ['grantRune', 'freeRune', 'runeReward', 'runeGrant'];

function hasPowerKey(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return POWER_KEYS.some(k => k in obj) || Object.values(obj).some(v => typeof v === 'object' && hasPowerKey(v));
}

function hasRuneBypass(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return RUNE_BYPASS_KEYS.some(k => k in obj) || Object.values(obj).some(v => typeof v === 'object' && hasRuneBypass(v));
}

exports.check = function economySafetyCheck(seasonJson) {
  // 1. halvingEffect must be present and non-empty
  const he = seasonJson.halvingEffect;
  if (!he) return { pass: false, reason: 'halvingEffect missing — Halving cannot fire without it' };
  if (!Array.isArray(he.coldHearths) || he.coldHearths.length === 0)
    return { pass: false, reason: 'halvingEffect.coldHearths is empty — at least one hearth must go cold' };
  if (typeof he.canonAppend !== 'string' || !he.canonAppend.trim())
    return { pass: false, reason: 'halvingEffect.canonAppend is empty' };

  // 2. newPlayerItems must not include power-granting items
  for (const item of (seasonJson.newPlayerItems || [])) {
    if (hasPowerKey(item))
      return { pass: false, reason: `newPlayerItems contains power key: ${JSON.stringify(item)}` };
  }

  // 3. No entity in any region grants Gold AND power stats simultaneously
  for (const region of (seasonJson.regions || [])) {
    for (const entity of (region.entities || [])) {
      if (entity.grantsGold && hasPowerKey(entity))
        return { pass: false, reason: `entity "${entity.id}" in region "${region.id}" grants both Gold and power (forbidden)` };
    }
  }

  // 4. No RUNE bypass fields anywhere in the manifest
  if (hasRuneBypass(seasonJson))
    return { pass: false, reason: 'manifest contains a RUNE bypass field — RUNE must only be earned through grind' };

  return { pass: true, reason: 'economy safety checks pass: Gold=cosmetics, no RUNE bypasses, halvingEffect valid' };
};
