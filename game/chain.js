(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RUNECHAIN_CHAIN = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createChain(options = {}) {
    const sha256 = options.sha256 || (typeof RUNECHAIN_SHA256 !== 'undefined' ? RUNECHAIN_SHA256 : null);
    if (typeof sha256 !== 'function') throw new Error('createChain requires a sha256 function');

    const DIFFICULTY = options.difficulty == null ? 3 : options.difficulty;
    let chain = [], mempool = [], miner = null, hashes = 0, hrTimer = 0, hashrate = 0;
    const rid = () => Math.random().toString(36).slice(2, 8);
    const onBlockMined = typeof options.onBlockMined === 'function' ? options.onBlockMined : null;

    function hashBlock(b) {
      return sha256(b.index + '|' + b.prev + '|' + b.time + '|' + JSON.stringify(b.txs) + '|' + b.nonce);
    }

    function valid(b) {
      return b && b.hash === hashBlock(b) && b.hash.startsWith('0'.repeat(DIFFICULTY));
    }

    function genesis() {
      const g = { index: 0, prev: '0'.repeat(64), time: 0, txs: [{ to: 'GENESIS', amt: 0, note: 'Chainwell spark' }], nonce: 0 };
      g.hash = hashBlock(g);
      chain = [g];
    }

    genesis();

    function credit(to, amt, note, cur) {
      mempool.push({ to, amt: +(+amt).toFixed(4), note, cur: cur || 'RUNE', id: rid() });
    }

    function debit(from, amt, note, cur, to) {
      mempool.push({ from, to: to || 'POWER_SINK', amt: +(+amt).toFixed(4), note, cur: cur || 'RUNE', id: rid() });
    }

    function reward(to, amt, note) { credit(to, amt, note, 'RUNE'); }
    function spend(from, amt, note) { debit(from, amt, note, 'RUNE', 'POWER_SINK'); }
    function mintGreatRune(to, rune) { mempool.push({ to, amt: 0, greatRune: rune, note: 'Boss Sigil: ' + rune.name, cur: 'RUNE', id: rid() }); }
    function mintCosmetic(to, id) { mempool.push({ to, amt: 0, cosmetic: id, note: 'skin ' + id, cur: 'GOLD', id: rid() }); }
    function mintItem(to, id) { mempool.push({ to, amt: 0, item: id, note: 'relic ' + id, cur: 'RUNE', id: rid() }); }

    function startBlock() {
      if (miner || !mempool.length) return;
      const prev = chain[chain.length - 1];
      miner = { index: prev.index + 1, prev: prev.hash, time: Date.now(), txs: mempool.slice(0, 6), nonce: 0 };
    }

    function tick(budget) {
      if (!miner) startBlock();
      if (!miner) return null;
      for (let i = 0; i < budget; i++) {
        const h = hashBlock(miner);
        hashes++;
        if (h.startsWith('0'.repeat(DIFFICULTY))) {
          miner.hash = h;
          chain.push(miner);
          const landed = miner;
          mempool = mempool.slice(landed.txs.length);
          miner = null;
          if (onBlockMined) onBlockMined(landed);
          return landed;
        }
        miner.nonce++;
      }
      return null;
    }

    function updateHashrate(dt) {
      hrTimer += dt;
      if (hrTimer >= 0.5) {
        hashrate = Math.round(hashes / hrTimer);
        hashes = 0;
        hrTimer = 0;
      }
    }

    function acceptRemote(b) {
      const tip = chain[chain.length - 1];
      if (b && b.index === tip.index + 1 && b.prev === tip.hash && valid(b)) {
        chain.push(b);
        const ids = new Set((b.txs || []).map(t => t.id));
        mempool = mempool.filter(t => !ids.has(t.id));
        if (miner && miner.index <= b.index) miner = null;
        return true;
      }
      return false;
    }

    function pool() { return miner ? mempool.concat(miner.txs) : mempool; }

    function balanceOf(name, cur = 'RUNE') {
      let bal = 0;
      for (const b of chain) for (const t of b.txs || []) {
        if ((t.cur || 'RUNE') !== cur) continue;
        if (t.to === name) bal += t.amt || 0;
        if (t.from === name) bal -= t.amt || 0;
      }
      return bal;
    }

    function pendingCredit(name, cur = 'RUNE') {
      let p = 0;
      for (const t of pool()) if ((t.cur || 'RUNE') === cur && t.to === name) p += t.amt || 0;
      return p;
    }

    function pendingDebit(name, cur = 'RUNE') {
      let p = 0;
      for (const t of pool()) if ((t.cur || 'RUNE') === cur && t.from === name) p += t.amt || 0;
      return p;
    }

    function spendable(name, cur = 'RUNE') { return balanceOf(name, cur) - pendingDebit(name, cur); }

    function tallyTo(addr, cur = 'RUNE') {
      let v = 0;
      for (const b of chain) for (const t of b.txs || []) if (t.to === addr && (t.cur || 'RUNE') === cur) v += t.amt || 0;
      for (const t of pool()) if (t.to === addr && (t.cur || 'RUNE') === cur) v += t.amt || 0;
      return v;
    }

    function greatRunesOf(name) {
      const out = [];
      for (const b of chain) for (const t of b.txs || []) if (t.to === name && t.greatRune) out.push(t.greatRune);
      for (const t of pool()) if (t.to === name && t.greatRune) out.push(t.greatRune);
      return out;
    }

    function cosmeticsOf(name) {
      const out = [];
      for (const b of chain) for (const t of b.txs || []) if (t.to === name && t.cosmetic) out.push(t.cosmetic);
      for (const t of pool()) if (t.to === name && t.cosmetic) out.push(t.cosmetic);
      return out;
    }

    function itemsOf(name) {
      const out = [];
      for (const b of chain) for (const t of b.txs || []) if (t.to === name && t.item) out.push(t.item);
      for (const t of pool()) if (t.to === name && t.item) out.push(t.item);
      return out;
    }

    return {
      DIFFICULTY, reward, spend, credit, debit, mintGreatRune, mintCosmetic, mintItem, tick, updateHashrate, acceptRemote,
      balanceOf, pendingCredit, pendingDebit, spendable, tallyTo, greatRunesOf, cosmeticsOf, itemsOf,
      get chain() { return chain; },
      get mining() { return miner; },
      get hashrate() { return hashrate; },
      replaceIfLonger(remote) {
        if (Array.isArray(remote) && remote.length > chain.length && remote.every((b, i) => i === 0 || valid(b))) {
          chain = remote;
          return true;
        }
        return false;
      }
    };
  }

  return { createChain };
});
