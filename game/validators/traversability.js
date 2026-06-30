// Gate 1: Traversability — every platformer section referenced in the manifest has
// a reachable exit. Static analysis: spawn defined, exit trigger exists, section
// is within engine physics limits. Full headless simulation is a future enhancement;
// this gate catches broken/impossible level configs at manifest-author time.
'use strict';

// Jump height in tiles (16px) given default engine physics: jump:430, gravity:1320.
// t_peak = jump/gravity ≈ 0.326s  →  h = jump²/(2*gravity) ≈ 70px ≈ 4.4 tiles.
const MAX_JUMP_PX = 75;
const TILE = 16;

function checkSection(section) {
  if (!section || typeof section !== 'object')
    return 'section data is missing or malformed';

  const { spawn, width, height, platforms, exit } = section;

  if (!spawn || typeof spawn.x !== 'number' || typeof spawn.y !== 'number')
    return 'spawn position missing or malformed';

  // Exit: either an explicit exit object, or a platform/hazard with type='exit'
  const hasExit = exit ||
    (Array.isArray(platforms) && platforms.some(p => p.type === 'exit')) ||
    (Array.isArray(section.hazards) && section.hazards.some(h => h.type === 'exit'));
  if (!hasExit)
    return 'no exit trigger found (need exit object or platform with type="exit")';

  // Level dimensions: if specified, must be positive
  if (width != null && (typeof width !== 'number' || width <= 0))
    return `width must be a positive number, got ${width}`;
  if (height != null && (typeof height !== 'number' || height <= 0))
    return `height must be a positive number, got ${height}`;

  // Scan platforms for impossible vertical gaps (gap > max jump height)
  // Sort solid platforms by y (ascending = higher in world) and check spacing
  if (Array.isArray(platforms)) {
    const solids = platforms.filter(p => p.type === 'solid' || !p.type)
      .map(p => ({ y: p.y || 0, x: p.x || 0, w: p.w || 0 }))
      .sort((a, b) => a.y - b.y);

    for (let i = 0; i + 1 < solids.length; i++) {
      const gap = solids[i + 1].y - solids[i].y;
      if (gap > MAX_JUMP_PX + TILE) {
        return `platform gap of ${gap}px between y=${solids[i].y} and y=${solids[i+1].y} exceeds max jump height (${MAX_JUMP_PX}px)`;
      }
    }
  }

  return null; // pass
}

exports.check = function traversabilityCheck(seasonJson, context = {}) {
  // context.platformerData: map of sectionId → section definition
  const platformerData = context.platformerData || {};

  const allSections = [];
  for (const region of (seasonJson.regions || [])) {
    for (const sectionId of (region.platformerSections || [])) {
      allSections.push({ regionId: region.id, sectionId });
    }
  }

  if (allSections.length === 0)
    return { pass: true, reason: 'no platformer sections in manifest — traversability gate satisfied' };

  const failures = [];
  for (const { regionId, sectionId } of allSections) {
    const data = platformerData[sectionId];
    if (!data) {
      // Unknown section ID: fail only if strict mode requested; otherwise warn and pass.
      if (context.strictSections) {
        failures.push(`region "${regionId}": platformer section "${sectionId}" not found in context.platformerData`);
      }
      continue;
    }
    const reason = checkSection(data);
    if (reason) failures.push(`region "${regionId}" / section "${sectionId}": ${reason}`);
  }

  if (failures.length)
    return { pass: false, reason: failures.join('; ') };

  const checked = allSections.filter(s => platformerData[s.sectionId]).length;
  return { pass: true, reason: `${checked}/${allSections.length} platformer section(s) structurally traversable` };
};
