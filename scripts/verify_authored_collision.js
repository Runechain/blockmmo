#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert(index.includes('function authoredZoneBlocked'), 'authored west zone should expose a collision predicate');
assert(index.includes('function moveWithAuthoredCollision'), 'authored west zone should resolve X/Y movement against collision');
assert(
  /if\(actor\.x < OVERWORLD_SEAM_X\)return moveWithAuthoredCollision\(actor,dx,dy\);/.test(index),
  'moveOverworldActor must not bypass collision west of the overworld seam'
);

for (const token of ['BUILDINGS||[]', 'BRAMBLES||[]', 'FENCES||[]']) {
  assert(index.includes(token), `authored collision should include ${token}`);
}

assert(
  /door&&Math\.abs\(cx-door\.x\)<20&&Math\.abs\(cy-door\.y\)<28\)return false/.test(index),
  'building collision should preserve a doorway interaction gap'
);

assert(
  !/if\(actor\.x < OVERWORLD_SEAM_X\)\{ actor\.x\+=dx; actor\.y\+=dy; return \{hitX:false,hitY:false\}; \}/.test(index),
  'authored west zone must not keep the old free-movement bypass'
);

console.log('authored collision verification passed');
