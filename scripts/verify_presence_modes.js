const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const api = fs.readFileSync(path.join(root, 'engine', 'api.md'), 'utf8');

assert(
  index.includes("return {mode:'encounter',encounter:state.mode,interior:null}"),
  'network presence should advertise the active solo segment as encounter metadata'
);
assert(
  index.includes("if(state.mode==='interior')return {mode:'interior',encounter:null,interior:activeInterior?activeInterior.id:null}"),
  'network presence should advertise the walk-in interior the player is inside'
);
assert(
  index.includes("moving:(p.mode==='town'||p.mode==='interior')&&player.moving"),
  'encounter presence should not broadcast active town/interior movement'
);
assert(
  index.includes("mode:p.mode,encounter:p.encounter,interior:p.interior"),
  'outgoing state payload should carry mode/encounter/interior presence'
);
assert(
  index.includes("r.interior=m.interior||null"),
  'remote state should persist the peer interior id'
);
assert(
  index.includes("r.mode=m.mode||'town'"),
  'remote state should persist the peer presence mode'
);
assert(
  index.includes('function drawEncounterMarker'),
  'town renderer should have an explicit encounter marker renderer'
);
assert(
  index.includes("remote&&p.mode&&p.mode!=='town'"),
  'remote players in non-town modes should render as encounter markers'
);
assert(
  index.includes('Net.updatePeers(); log(\'Returned to Hearthlight.'),
  'peer list should refresh when the local player returns to town'
);
assert(
  index.includes("state.mode=name; Net.updatePeers();"),
  'peer list should refresh when the local player enters direct engine modes'
);
assert(
  index.includes("state.mode='sequencer'; Net.updatePeers();"),
  'peer list should refresh when the local player enters sequenced boss encounters'
);
assert(
  api.includes('Shared-world presence while in solo segments (Q-F2b)'),
  'engine API docs should document Q-F2b presence behavior'
);
assert(
  api.includes('mode:"encounter"') && api.includes('In Encounter'),
  'engine API docs should document encounter state payload and marker semantics'
);

console.log('presence mode verification passed');
