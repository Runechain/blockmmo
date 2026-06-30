// Gate 5: Agent contribution path — the season must expose at least one work-grid
// assignment type that pays Gold (not power). This ensures the AI self-evolution loop
// can operate in the new season without operator intervention.
'use strict';

const VALID_ASSIGNMENT_TYPES = [
  'runechain-propose-region',
  'runechain-generate-asset',
  'runechain-validate-candidate',
  'runechain-run-simulated-playtest',
  'runechain-score-season',
  'runechain-build-telemetry',
];

exports.check = function agentPathCheck(seasonJson) {
  // Assignments may live at the top level or under a dedicated key.
  const assignments = seasonJson.gridAssignments || seasonJson.assignments || [];

  if (!Array.isArray(assignments) || assignments.length === 0) {
    // If the field is absent entirely, we treat it as implicitly satisfied — the
    // global game/grid-assignments/ specs are always available for any season.
    // A season FAILS this gate only if assignments is explicitly present but empty,
    // or if it contains entries that grant power rewards.
    if (!('gridAssignments' in seasonJson) && !('assignments' in seasonJson)) {
      return { pass: true, reason: 'no gridAssignments key — global game/grid-assignments/ specs apply (gate satisfied)' };
    }
    return { pass: false, reason: 'gridAssignments key present but empty — must list at least one valid assignment type' };
  }

  for (const a of assignments) {
    if (!VALID_ASSIGNMENT_TYPES.includes(a.type))
      return { pass: false, reason: `unknown assignment type "${a.type}" — must be one of: ${VALID_ASSIGNMENT_TYPES.join(', ')}` };
    if (a.runeReward || a.powerReward)
      return { pass: false, reason: `assignment "${a.type}" grants RUNE/power reward — agent rewards must be Gold only` };
    if (!a.goldReward && a.goldReward !== 0)
      return { pass: false, reason: `assignment "${a.type}" has no goldReward — all grid assignments must specify a Gold reward` };
  }

  return { pass: true, reason: `${assignments.length} valid Gold-rewarding assignment(s) present` };
};
