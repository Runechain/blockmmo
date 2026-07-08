// Gate 4: Chain integrity — the manifest must not attempt to rewrite on-chain state.
// On-chain state: character ownership, Gold balances, minted relics, verified accounts.
// These are held authoritative on the Solana Chainwell; a season manifest may not touch them.
'use strict';

const FORBIDDEN_FIELDS = [
  'owner', 'ownerPubkey', 'walletAddress', 'mintAddress', 'tokenAccount',
  'goldBalance', 'goldBalances', 'runeBalance', 'runeBalances',
  'relicMints', 'mintedRelics', 'characterMints',
  'verifiedAccounts', 'accountBalances',
  'transferHook', 'burnAmount', 'wsolSplit',
];

function scanForForbidden(obj, path = '') {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_FIELDS.includes(key))
      return `forbidden field "${key}" at path "${path}.${key}" — on-chain state is Chainwell-authoritative`;
    const nested = scanForForbidden(obj[key], `${path}.${key}`);
    if (nested) return nested;
  }
  return null;
}

exports.check = function chainIntegrityCheck(seasonJson) {
  const violation = scanForForbidden(seasonJson, 'root');
  if (violation) return { pass: false, reason: violation };
  return { pass: true, reason: 'no forbidden on-chain fields in manifest — chain state remains Chainwell-authoritative' };
};
