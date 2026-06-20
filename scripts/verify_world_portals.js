// Verify world-to-interior portals (issue #19 / Q-N1): the connective tissue that lets a
// top-down entrance load a platformer interior inline and return the player to the same spot.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const content = require(path.join(root, 'game', 'content.js'));
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const PORTALS = content.WORLD_PORTALS;
assert(Array.isArray(PORTALS) && PORTALS.length >= 1, 'WORLD_PORTALS must define >= 1 entry-point');

const ids = new Set();
for (const p of PORTALS) {
  assert(p.id && !ids.has(p.id), 'portal needs a unique id: ' + JSON.stringify(p));
  ids.add(p.id);
  assert(typeof p.label === 'string' && p.label.length, p.id + ' needs a label');
  assert(typeof p.x === 'number' && typeof p.y === 'number', p.id + ' needs overworld x/y');
  assert(Math.abs(p.x) <= 2400 && Math.abs(p.y) <= 2400, p.id + ' must be inside the world bounds');
  // The interior must be a real platformer level the player can ALWAYS leave: it needs an exit.
  assert(p.level && typeof p.level === 'object', p.id + ' needs a level payload');
  assert(p.level.exit, p.id + ' interior must expose an exit so the player can climb back out');
  assert(Array.isArray(p.level.platforms) && p.level.platforms.length, p.id + ' interior needs platforms');
  assert(p.level.spawn && typeof p.level.spawn.x === 'number', p.id + ' interior needs a spawn');
}

// Host wiring in index.html.
for (const sym of ['WORLD_PORTALS', 'progress.portals', 'function enterPortal', 'function nearestPortal', 'function drawPortals', 'activePortal']) {
  assert(index.includes(sym), 'index.html must wire ' + sym);
}
// doInteract descends through a nearby portal.
assert(/enterPortal\(portal\)/.test(index), 'doInteract must call enterPortal for a nearby portal');
assert(/drawPortals\(\)/.test(index), 'render loop must call drawPortals()');
// Re-emergence: exit reconciles the overworld position back to the entrance (acceptance criterion).
assert(/player\.x=activePortal\.x;\s*player\.y=activePortal\.y/.test(index),
  'exitEngineMode must re-emerge the player at the portal entrance');
// Reaching the interior exit reports completion back to the world.
assert(/exitEngineMode\(\{completed:true\}\)/.test(index),
  'reaching the interior exit must complete the portal (onExit -> exitEngineMode({completed:true}))');
assert(/progress\.portals\.add\(activePortal\.id\)/.test(index),
  'completing a portal must be recorded (progress.portals)');

console.log('world portal verification passed (' + PORTALS.length + ' entry-point(s); interiors escapable; re-emergence reconciled)');
