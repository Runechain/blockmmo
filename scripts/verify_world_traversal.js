'use strict';

const assert = require('node:assert/strict');
const Overworld = require('../game/overworld.js');

const roadIds = new Set(Overworld.ROADS.map((road) => road.id));
for (const id of ['drowned-west-road', 'drowned-causeway', 'reedwick-ring', 'sunken-shortcut', 'southern-causeway', 'seized-south-road', 'archive-return', 'seized-cut']) {
  assert(roadIds.has(id), 'missing exploration route: ' + id);
}

const worldWidth = Overworld.BOUNDS.maxX - Overworld.BOUNDS.minX;
const worldHeight = Overworld.BOUNDS.maxY - Overworld.BOUNDS.minY;
assert(worldWidth >= 4500, 'world should remain broad enough for the full campaign');
assert(worldHeight >= 1800, 'world must be a 2D landmass, not a horizontal strip');

assert.equal(Overworld.regionAt(-650, 850).id, 'drowned-reach', 'Reedwick must sit inside Drowned Reach');
assert.equal(Overworld.locationAt(-650, 850).id, 'reedwick', 'Reedwick hearth should identify the town');
for (const town of [
  ['forklight', 1076, -100, 'mempool-moor'],
  ['celestial-spark', 1960, -80, 'seized-grounds'],
  ['sump-row', 1760, 650, 'seized-grounds'],
  ['marginalia', 1900, 1030, 'archive-causeway'],
  ['lastlight', 2260, 820, 'archive-causeway']
]) {
  assert.equal(Overworld.locationAt(town[1], town[2]).id, town[0], town[0] + ' needs a landmark');
  assert.equal(Overworld.regionAt(town[1], town[2]).id, town[3], town[0] + ' must belong to its manifest region');
}

const lockedOptions = {
  blockLockedGates: true,
  solidProps: true,
  waterIsSolid: true,
  questReached: (id) => id !== 'reedwick-shortcut'
};
const openOptions = Object.assign({}, lockedOptions, { questReached: () => true });
assert.equal(Overworld.tileAt(-176, 456, lockedOptions).blocked, true, 'hound-held shortcut must begin blocked');
assert.equal(Overworld.tileAt(-176, 456, openOptions).blocked, false, 'clearing the hound pack must open the shortcut');

// Both authored approaches must remain walkable along their centre lines. The
// shortcut is tested separately because its gate intentionally begins closed.
for (const id of ['drowned-west-road', 'drowned-causeway', 'reedwick-ring']) {
  const road = Overworld.ROADS.find((candidate) => candidate.id === id);
  for (let i = 1; i < road.points.length; i += 1) {
    const a = road.points[i - 1];
    const b = road.points[i];
    for (let step = 0; step <= 12; step += 1) {
      const t = step / 12;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      assert.equal(Overworld.circleBlocked(x, y, 7, lockedOptions), false, id + ' is not traversable near ' + x + ',' + y);
    }
  }
}

for (const id of ['southern-causeway', 'seized-south-road', 'archive-return', 'seized-cut']) {
  const road = Overworld.ROADS.find((candidate) => candidate.id === id);
  for (let i = 1; i < road.points.length; i += 1) {
    const a = road.points[i - 1], b = road.points[i];
    for (let step = 0; step <= 12; step += 1) {
      const t = step / 12, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      assert.equal(Overworld.circleBlocked(x, y, 7, lockedOptions), false, id + ' cannot carry the player near ' + x + ',' + y);
    }
  }
}

assert.equal(Overworld.tileAt(0, 470, lockedOptions).blocked, true, 'deep marsh water should block off-road travel');
assert.equal(Overworld.tileAt(78, 560, lockedOptions).road.id, 'drowned-causeway', 'causeway must cross the marsh');
assert.equal(Overworld.tileAt(78, 560, lockedOptions).blocked, false, 'causeway crossing must be walkable');

console.log('world traversal verification passed (all S1 towns linked by loops, two Reedwick approaches, combat-opened shortcut, 2D bounds)');
