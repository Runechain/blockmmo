#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const content = require('../game/content.js');

const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert(index.includes('function normalizePuzzle'), 'index.html should normalize mixed puzzle content shapes');
assert(/\.map\(normalizePuzzle\)/.test(index), 'PUZZLES should be normalized before render/update code consumes them');

function normalizePuzzle(p) {
  const nodes = (p.nodes || []).map((n) => ({
    ...n,
    inscription: n.inscription || n.label || n.id,
  }));
  const order = Array.isArray(p.order)
    ? p.order.slice()
    : nodes.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).map((n) => n.id);
  const location = p.location || nodes[0] || { x: 0, y: 0 };
  const clue = typeof p.clue === 'string'
    ? { id: p.id + '-clue', x: location.x, y: location.y - 34, label: 'CLUE', lines: [p.clue] }
    : p.clue;
  return { ...p, nodes, order, clue };
}

const puzzles = [
  ...(content.AREA1_PUZZLES || []),
  ...(content.AREA2_PUZZLES || []),
].map(normalizePuzzle);

assert(puzzles.length >= 4, 'combined puzzle host should cover Area 1 and Area 2 puzzles');

for (const p of puzzles) {
  assert(Array.isArray(p.nodes) && p.nodes.length > 0, p.id + ' should have nodes');
  assert(Array.isArray(p.order) && p.order.length === p.nodes.length, p.id + ' should expose a full order array');
  assert(p.order.every((id) => p.nodes.some((n) => n.id === id)), p.id + ' order should only reference node ids');
  assert(p.clue && Number.isFinite(p.clue.x) && Number.isFinite(p.clue.y), p.id + ' clue should have drawable coordinates');
  assert(Array.isArray(p.clue.lines) && p.clue.lines.length > 0, p.id + ' clue should expose readable lines');
  for (const node of p.nodes) {
    assert(node.id && node.label && node.inscription, p.id + ' node should be drawable and readable: ' + node.id);
  }
}

console.log('puzzle host shape verification passed');
