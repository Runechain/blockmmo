// Gate 6: Every region is reachable from the starting region via BFS over connections + exits.
// Gated exits count as traversable for this check (reachability, not accessibility).
'use strict';
exports.check = function reachabilityCheck(seasonJson) {
  const regions = seasonJson.regions || [];
  if (regions.length === 0) return { pass: false, reason: 'no regions defined' };

  const ids = new Set(regions.map(r => r.id));
  const adj = {};
  for (const r of regions) adj[r.id] = new Set();

  for (const c of (seasonJson.connections || [])) {
    if (adj[c.from]) adj[c.from].add(c.to);
    if (adj[c.to])   adj[c.to].add(c.from);
  }
  for (const r of regions) {
    for (const ex of (r.exits || [])) {
      if (ex.to && ids.has(ex.to)) {
        adj[r.id].add(ex.to);
        adj[ex.to].add(r.id);
      }
    }
  }

  const start = regions[0].id;
  const visited = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    for (const n of adj[cur]) {
      if (!visited.has(n)) { visited.add(n); queue.push(n); }
    }
  }

  const unreachable = regions.map(r => r.id).filter(id => !visited.has(id));
  if (unreachable.length) {
    return { pass: false, reason: `unreachable region(s): ${unreachable.join(', ')} (not reachable from "${start}")` };
  }
  return { pass: true, reason: `all ${regions.length} regions reachable from "${start}"` };
};
