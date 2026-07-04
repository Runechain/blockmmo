// Season manifest validator. UMD-compatible: works via require() in verify scripts
// and as a browser global (SEASON_VALIDATOR) in the game.
(function (root, factory) {
  if (typeof module !== 'undefined') module.exports = factory();
  else root.SEASON_VALIDATOR = factory();
})(globalThis, function () {

  // ---- helpers ----------------------------------------------------------------

  function err(errors, msg) { errors.push(msg); }

  function regionIds(season) {
    return new Set((season.regions || []).map(r => r.id));
  }

  function hearthIds(season) {
    const ids = new Set();
    (season.towns || []).forEach(t => { if (t.hearthId) ids.add(t.hearthId); });
    (season.halvingEffect?.coldHearths || []).forEach(h => ids.add(h));
    return ids;
  }

  // ---- validators -------------------------------------------------------------

  function validateMeta(meta, errors) {
    if (!meta || typeof meta !== 'object') { err(errors, 'meta: missing'); return; }
    if (!meta.id)   err(errors, 'meta.id: required');
    if (!meta.name) err(errors, 'meta.name: required');
    if (meta.id && !/^s[0-9]+$/.test(meta.id)) err(errors, `meta.id: must match /^s[0-9]+$/ got "${meta.id}"`);
  }

  function validateCanonState(cs, errors) {
    if (!cs || typeof cs !== 'object') { err(errors, 'canonState: missing'); return; }
    if (typeof cs.dwindlingLevel !== 'number' || cs.dwindlingLevel < 0 || cs.dwindlingLevel > 10)
      err(errors, 'canonState.dwindlingLevel: must be 0–10');
    if (!Array.isArray(cs.coldHearths)) err(errors, 'canonState.coldHearths: must be array');
    if (!Array.isArray(cs.storyLog))    err(errors, 'canonState.storyLog: must be array');
  }

  function validateRegions(regions, errors) {
    if (!Array.isArray(regions) || regions.length === 0) {
      err(errors, 'regions: must be a non-empty array'); return;
    }
    const seen = new Set();
    for (const r of regions) {
      if (!r.id)    err(errors, `region missing id`);
      if (!r.name)  err(errors, `region[${r.id}].name: required`);
      if (!r.tileset) err(errors, `region[${r.id}].tileset: required`);
      if (r.id && seen.has(r.id)) err(errors, `region id "${r.id}" is a duplicate`);
      if (r.id) seen.add(r.id);
      if (!r.position || typeof r.position.x !== 'number' || typeof r.position.y !== 'number')
        err(errors, `region[${r.id}].position: must have numeric x,y`);
      if (!Array.isArray(r.exits)) err(errors, `region[${r.id}].exits: must be array`);
    }
  }

  function validateExitRefs(regions, rIds, errors) {
    for (const r of regions) {
      for (const exit of (r.exits || [])) {
        if (!exit.to) { err(errors, `region[${r.id}] exit missing 'to'`); continue; }
        if (!rIds.has(exit.to))
          err(errors, `region[${r.id}].exits[].to "${exit.to}" does not reference any region`);
      }
    }
  }

  function validateTowns(towns, rIds, errors) {
    const seen = new Set();
    for (const t of (towns || [])) {
      if (!t.id)       err(errors, `town missing id`);
      if (!t.name)     err(errors, `town[${t.id}].name: required`);
      if (!t.regionId) err(errors, `town[${t.id}].regionId: required`);
      if (t.id && seen.has(t.id)) err(errors, `town id "${t.id}" is a duplicate`);
      if (t.id) seen.add(t.id);
      if (t.regionId && !rIds.has(t.regionId))
        err(errors, `town[${t.id}].regionId "${t.regionId}" does not reference any region`);
      if (typeof t.hearthBrightness !== 'undefined' &&
          (typeof t.hearthBrightness !== 'number' || t.hearthBrightness < 0 || t.hearthBrightness > 1))
        err(errors, `town[${t.id}].hearthBrightness: must be 0–1`);
    }
  }

  function validateConnections(connections, rIds, errors) {
    for (const c of (connections || [])) {
      if (!c.from) err(errors, `connection missing 'from'`);
      if (!c.to)   err(errors, `connection missing 'to'`);
      if (c.from && !rIds.has(c.from))
        err(errors, `connection.from "${c.from}" does not reference any region`);
      if (c.to && !rIds.has(c.to))
        err(errors, `connection.to "${c.to}" does not reference any region`);
    }
  }

  function validateHalvingEffect(effect, towns, errors) {
    if (!effect || typeof effect !== 'object') { err(errors, 'halvingEffect: missing'); return; }
    if (!Array.isArray(effect.coldHearths)) err(errors, 'halvingEffect.coldHearths: must be array');
    if (typeof effect.canonAppend !== 'string') err(errors, 'halvingEffect.canonAppend: must be string');
    // coldHearths must be a subset of known hearth IDs
    const knownHearths = new Set((towns || []).map(t => t.hearthId).filter(Boolean));
    for (const h of (effect.coldHearths || [])) {
      if (!knownHearths.has(h))
        err(errors, `halvingEffect.coldHearths["${h}"] does not match any town.hearthId`);
    }
  }

  function validateReachability(regions, connections, errors) {
    if (!Array.isArray(regions) || regions.length === 0) return;
    const adj = {};
    for (const r of regions) adj[r.id] = new Set();
    for (const c of (connections || [])) {
      if (adj[c.from]) adj[c.from].add(c.to);
      if (adj[c.to])   adj[c.to].add(c.from);
    }
    // Exits are also edges
    for (const r of regions) {
      for (const ex of (r.exits || [])) {
        if (adj[r.id] && ex.to) adj[r.id].add(ex.to);
        if (adj[ex.to]) adj[ex.to].add(r.id);
      }
    }
    const start = regions[0].id;
    const visited = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const cur = queue.shift();
      for (const n of (adj[cur] || [])) {
        if (!visited.has(n)) { visited.add(n); queue.push(n); }
      }
    }
    for (const r of regions) {
      if (!visited.has(r.id))
        err(errors, `reachability: region "${r.id}" is not reachable from "${start}"`);
    }
  }

  // ---- public -----------------------------------------------------------------

  function validate(seasonJson) {
    const errors = [];

    if (!seasonJson || typeof seasonJson !== 'object') {
      return { valid: false, errors: ['season manifest must be a non-null object'] };
    }

    validateMeta(seasonJson.meta, errors);
    validateCanonState(seasonJson.canonState, errors);
    validateRegions(seasonJson.regions, errors);

    const rIds = regionIds(seasonJson);
    validateExitRefs(seasonJson.regions || [], rIds, errors);
    validateTowns(seasonJson.towns || [], rIds, errors);
    validateConnections(seasonJson.connections || [], rIds, errors);
    validateHalvingEffect(seasonJson.halvingEffect, seasonJson.towns || [], errors);
    validateReachability(seasonJson.regions || [], seasonJson.connections || [], errors);

    return { valid: errors.length === 0, errors };
  }

  return { validate };
});
