#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert(index.includes('function nearestAttackTarget()'), 'keyboard attacks need a soft target helper');
assert(/dist\(e,player\)<reach/.test(index), 'soft attack target should stay melee-limited');
assert(/const softTarget=nearestAttackTarget\(\)/.test(index), 'doAttack should use the soft target when no lock exists');
assert(/if\(softTarget\)faceToward\(softTarget\.x,softTarget\.y\)/.test(index), 'doAttack should face the nearby threat before resolving the arc');

console.log('keyboard combat verification passed');
