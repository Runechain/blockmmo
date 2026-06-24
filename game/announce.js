/* ============================================================================
   RUNECHAIN - announce feed
   Derives noteworthy, tweetable events from accepted ledger blocks and exposes
   them over an in-process, bounded feed. Zero dependencies.

   This is the "emit" leg of the auto-tweet pipeline:
       accepted block  ->  recordBlock()  ->  GET /announce-feed?since=<seq>
                                                        |
                                  scripts/announcer.js (composio run) polls it,
                                  composes a tweet, and posts to X via Composio.

   Opt-in: only active when env ANNOUNCE_FEED=1, so dev/test/CI ledgers stay
   silent and recordBlock() is a no-op otherwise. The feed is read-only public
   metadata (block heights, boss/relic names) - it never exposes account ids,
   keys, or addresses.
   ========================================================================== */
const { BOSS_SIGILS, RELICS } = require('./content.js');

// sigil slug -> boss key, e.g. "waxen-testament" -> "tallow"
const SIGIL_TO_BOSS = Object.fromEntries(
  Object.entries(BOSS_SIGILS || {}).map(([boss, sigil]) => [sigil, boss])
);
const RELIC_BY_ID = Object.fromEntries((RELICS || []).map((r) => [r.id, r]));

function titleCase(slug) {
  return String(slug || '')
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// How many of the most recent events to retain in memory. The worker polls
// far more often than this fills, so a small ring is plenty.
const RING_CAP = 500;
// Announce a chain-height milestone every N blocks.
const MILESTONE_EVERY = 250;

function createAnnounceFeed(options = {}) {
  const enabled = options.enabled != null
    ? !!options.enabled
    : process.env.ANNOUNCE_FEED === '1';
  const seasonId = options.seasonId || null;
  const events = [];
  let nextSeq = 1;

  function push(type, priority, dedupeKey, data) {
    events.push({
      seq: nextSeq++,
      ts: Date.now(),
      type,
      priority, // "high" | "medium" | "low"
      dedupeKey,
      seasonId,
      data,
    });
    if (events.length > RING_CAP) events.splice(0, events.length - RING_CAP);
  }

  // Inspect every tx in an accepted block and emit any noteworthy events.
  // Mundane rewards ("slew a Hollow") and per-stat level-ups are intentionally
  // dropped - they are too frequent to be tweetable.
  function recordBlock(block) {
    if (!enabled || !block || !Array.isArray(block.txs)) return;

    for (const tx of block.txs) {
      const auth = tx.auth;
      if (!auth) continue;

      if (auth.type === 'server-boss-reward' && auth.sigilId) {
        const boss = SIGIL_TO_BOSS[auth.sigilId] || auth.sigilId;
        push('boss-slain', 'high', `boss:${auth.sigilId}:${auth.characterId || ''}`, {
          boss,
          sigil: titleCase(auth.sigilId),
          rune: tx.amt || 0,
          blockIndex: block.index,
        });
      } else if (
        auth.type === 'server-spend' &&
        auth.effect && auth.effect.kind === 'relic' && auth.effect.relicId
      ) {
        const relic = RELIC_BY_ID[auth.effect.relicId];
        push('relic-forged', 'medium', `relic:${auth.effect.relicId}:${auth.characterId || ''}`, {
          relic: relic ? relic.name : titleCase(auth.effect.relicId),
          desc: relic ? relic.desc : null,
          rune: tx.amt || 0,
          blockIndex: block.index,
        });
      }
    }

    if (block.index > 0 && block.index % MILESTONE_EVERY === 0) {
      push('chain-milestone', 'medium', `milestone:${block.index}`, {
        height: block.index,
      });
    }
  }

  // Everything strictly newer than `sinceSeq`, plus the cursor to send next time.
  function since(sinceSeq) {
    const from = Number(sinceSeq) || 0;
    const fresh = events.filter((e) => e.seq > from);
    return {
      enabled: true,
      seasonId,
      cursor: nextSeq - 1, // highest seq currently assigned
      events: fresh,
    };
  }

  return { enabled, recordBlock, since };
}

module.exports = { createAnnounceFeed };
