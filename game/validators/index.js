// Season gate runner — runs all 6 validators and returns a unified result.
// A season passes only if EVERY gate returns { pass: true }.
'use strict';

const traversability  = require('./traversability.js');
const economySafety   = require('./economy-safety.js');
const storyContinuity = require('./story-continuity.js');
const chainIntegrity  = require('./chain-integrity.js');
const agentPath       = require('./agent-path.js');
const reachability    = require('./reachability.js');

const GATES = [
  { name: 'traversability',   validator: traversability  },
  { name: 'economy-safety',   validator: economySafety   },
  { name: 'story-continuity', validator: storyContinuity },
  { name: 'chain-integrity',  validator: chainIntegrity  },
  { name: 'agent-path',       validator: agentPath       },
  { name: 'reachability',     validator: reachability    },
];

/**
 * runAll(seasonJson, context?) → { pass: boolean, results: Array<{gate, pass, reason}> }
 *
 * context optional shape:
 *   priorSeasonLog: string[]          — for story-continuity append-only check
 *   platformerData: { [id]: section } — for traversability structural checks
 *   strictSections: boolean           — fail traversability on unknown section IDs
 */
exports.runAll = function runAll(seasonJson, context = {}) {
  const results = GATES.map(({ name, validator }) => {
    let result;
    try {
      result = validator.check(seasonJson, context);
    } catch (e) {
      result = { pass: false, reason: `validator threw: ${e.message}` };
    }
    return { gate: name, pass: !!result.pass, reason: result.reason || '' };
  });

  const pass = results.every(r => r.pass);
  return { pass, results };
};

exports.GATES = GATES.map(g => g.name);
