'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const content = require('../game/content.js');
const Overworld = require('../game/overworld.js');
const season = require('../game/seasons/s1.json');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const town = season.towns.find((candidate) => candidate.id === 'reedwick-town');
assert(town, 'Season 1 must define Reedwick');
assert.equal(town.regionId, 'drowned-reach');
assert(town.npcs.length >= 3, 'Reedwick needs an exterior cast');
assert(town.interiors.length >= 3, 'Reedwick needs multiple enterable civic spaces');

const npcById = new Map(content.NPCS.map((npc) => [npc.id, npc]));
for (const id of town.npcs) {
  const npc = npcById.get(id);
  assert(npc, 'missing Reedwick NPC content: ' + id);
  assert(Math.hypot(npc.x + 650, npc.y - 850) < 260, id + ' should physically live in Reedwick');
  assert(npc.dialogue && npc.dialogue.nodes && Object.keys(npc.dialogue.nodes).length >= 3, id + ' needs substantive dialogue');
}

const interiorById = new Map(content.INTERIORS.map((interior) => [interior.id, interior]));
const serviceChoices = new Set();
for (const id of town.interiors) {
  const interior = interiorById.get(id);
  assert(interior, 'missing Reedwick interior: ' + id);
  assert(interior.building && interior.building.door, id + ' needs a reachable world door');
  assert(Math.hypot(interior.building.x + 650, interior.building.y - 850) < 260, id + ' should physically belong to Reedwick');
  assert(Array.isArray(interior.npcs) && interior.npcs.length, id + ' should be inhabited');
  for (const npc of interior.npcs) {
    for (const node of Object.values(npc.dialogue.nodes || {})) {
      for (const choice of node.choices || []) if (choice.service) serviceChoices.add(choice.service);
    }
  }
}

for (const service of ['hearth:reedwick', 'wardrobe', 'wallet']) {
  assert(serviceChoices.has(service), 'Reedwick must surface existing service in-world: ' + service);
}

for (const id of ['sunken-records', 'marsh-watch', 'grounded-ferry']) {
  assert(content.AREA1_LORE.some((node) => node.id === id), 'missing Drowned Reach discovery: ' + id);
}
assert(content.AREA1_PUZZLES.some((puzzle) => puzzle.id === 'reedwick-tide-tally'), 'Reedwick needs its authored town-ring puzzle');

assert(index.includes("group:'reedwick-hounds'"), 'runtime must spawn the shortcut encounter as one pack');
assert(index.includes("progress.shortcutOpen=true"), 'clearing the pack must change world traversal');
assert(index.includes('runDialogueService'), 'dialogue choices must activate existing service UI');
assert(!index.includes("html='Safe Hearthlight -"), 'town hearth prompts must not all claim to be Hearthlight');
assert(index.includes("html='Safe '+esc(hearth.name)"), 'town hearth prompts must name the nearest safe settlement');
assert(!index.includes('OVERWORLD_SEAM_X'), 'the old vertical world seam must be removed');
assert(!index.includes('WORLD_LIMIT=2400'), 'the old square clamp must not truncate the new world');

const allNpcById = new Map(content.NPCS.map((npc) => [npc.id, npc]));
for (const interior of content.INTERIORS) for (const npc of interior.npcs || []) allNpcById.set(npc.id, npc);
for (const candidate of season.towns) {
  assert(candidate.npcs.length >= 3, candidate.name + ' needs at least three authored residents');
  assert(candidate.interiors.length >= 3, candidate.name + ' needs at least three enterable places');
  for (const id of candidate.npcs) assert(allNpcById.has(id), candidate.name + ' references missing resident ' + id);
  for (const id of candidate.interiors) {
    const interior = interiorById.get(id);
    assert(interior, candidate.name + ' references missing interior ' + id);
    assert(interior.npcs && interior.npcs.length, candidate.name + ' interior is empty: ' + id);
  }
  const hearth = Overworld.LANDMARKS.find((landmark) => landmark.id === candidate.hearthId);
  assert(hearth && hearth.kind === 'hearth', candidate.name + ' needs a world hearth');
  assert.equal(Overworld.regionAt(hearth.x, hearth.y).id, candidate.regionId, candidate.name + ' hearth must sit in ' + candidate.regionId);
}

for (const id of ['sump-row-town', 'marginalia-town', 'lastlight-town']) {
  const expanded = season.towns.find((candidate) => candidate.id === id);
  const services = new Set();
  for (const interiorId of expanded.interiors) {
    for (const npc of interiorById.get(interiorId).npcs || []) {
      for (const node of Object.values(npc.dialogue.nodes || {})) for (const choice of node.choices || []) if (choice.service) services.add(choice.service);
    }
  }
  assert(services.size >= 2, expanded.name + ' needs multiple in-world services');
}

for (const id of ['seized-auction-lore', 'bailiff-camp-lore', 'open-air-library-lore', 'verge-return-stone']) {
  assert(content.S1_WORLD_LORE.some((node) => node.id === id), 'missing world discovery ' + id);
}
for (const id of ['seized-lot-order', 'last-bell-witnesses']) {
  assert(content.S1_WORLD_PUZZLES.some((puzzle) => puzzle.id === id), 'missing regional puzzle ' + id);
}

console.log('town content verification passed (all seven S1 towns inhabited, enterable, region-correct, and service-connected)');
