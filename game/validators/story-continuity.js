// Gate 3: Story continuity — canonState.storyLog is append-only and non-contradictory.
// Context arg may include priorSeasonLog (string[]) representing the canon before this season.
'use strict';

const CONTRADICTION_PATTERNS = [
  // Pairs where the second contradicts the first if both are present
  ['ledger was erased',   'ledger is intact'],
  ['ledger is intact',    'ledger was erased'],
  ['hearthlight fell',    'hearthlight burns'],
  ['hearthlight burns',   'hearthlight fell'],
  ['wound closed',        'wound opened'],
  ['wound opened',        'wound closed'],
];

function normalize(str) { return str.toLowerCase().replace(/[^a-z\s]/g, ''); }

function detectContradiction(log) {
  const normed = log.map(normalize);
  for (const [a, b] of CONTRADICTION_PATTERNS) {
    const hasA = normed.some(s => s.includes(a));
    const hasB = normed.some(s => s.includes(b));
    if (hasA && hasB) return `contradiction: "${a}" and "${b}" both appear in storyLog`;
  }
  return null;
}

exports.check = function storyContinuityCheck(seasonJson, context = {}) {
  const log = seasonJson.canonState?.storyLog;
  if (!Array.isArray(log))
    return { pass: false, reason: 'canonState.storyLog must be an array' };
  if (log.length === 0)
    return { pass: false, reason: 'canonState.storyLog is empty — at least one canon entry required' };
  for (const entry of log) {
    if (typeof entry !== 'string' || !entry.trim())
      return { pass: false, reason: 'storyLog contains a non-string or blank entry' };
  }

  // Append-only: if prior canon log provided, new log must start with same entries
  const prior = context.priorSeasonLog || [];
  for (let i = 0; i < prior.length; i++) {
    if (log[i] !== prior[i])
      return { pass: false, reason: `storyLog[${i}] retcons prior canon — append-only, cannot change past entries` };
  }

  const contradiction = detectContradiction(log);
  if (contradiction) return { pass: false, reason: contradiction };

  return { pass: true, reason: `story continuity: ${log.length} entries, append-only, no contradictions` };
};
