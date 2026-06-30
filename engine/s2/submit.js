// S2 opt-in panel + broker task submitter. Players who complete S1 can optionally
// contribute their device's inference capacity to generate Season 2 content.
// The player's behavioral entropy seed personalises the generated content without
// exposing any personal data — the seed is derived purely from in-game events.
(function(root, factory) {
  if (typeof module !== 'undefined') module.exports = factory();
  else root.RUNECHAIN_S2_SUBMIT = factory();
})(globalThis, function() {
  'use strict';

  const CONSENT_KEY   = 'rc_s2_consent';
  const SUBMITTED_KEY = 'rc_s2_submitted';
  const MAX_TASKS     = 6;
  let _brokerUrl = '';
  let _taskCount = 0;

  // ---- UI -------------------------------------------------------------------

  function buildPanel(onConsent, onDismiss) {
    const el = document.createElement('div');
    el.id = 'rc-s2-panel';
    el.style.cssText = [
      'position:fixed', 'bottom:24px', 'right:24px', 'z-index:9000',
      'background:#1a1a1a', 'border:1px solid #d4a83e', 'border-radius:4px',
      'padding:18px 22px', 'max-width:320px', 'font-family:monospace',
      'font-size:13px', 'color:#d8d2c4', 'line-height:1.6',
      'box-shadow:0 4px 24px rgba(0,0,0,.7)',
    ].join(';');
    el.innerHTML = [
      '<div style="color:#d4a83e;font-weight:bold;margin-bottom:8px;font-size:14px">Join the S2 Network</div>',
      '<div style="margin-bottom:14px">You\'ve completed Season 1. Your playstyle can shape Season 2 content — anonymously, using local inference. No personal data leaves your machine.</div>',
      '<div style="display:flex;gap:10px">',
      '<button id="rc-s2-yes" style="flex:1;background:#d4a83e;color:#1a1a1a;border:none;padding:7px;border-radius:3px;cursor:pointer;font-weight:bold;font-family:monospace">Contribute</button>',
      '<button id="rc-s2-no" style="flex:1;background:transparent;color:#d8d2c4;border:1px solid #5a5446;padding:7px;border-radius:3px;cursor:pointer;font-family:monospace">Not now</button>',
      '</div>',
      '<div id="rc-s2-status" style="margin-top:10px;font-size:11px;color:#9b8a6a;min-height:14px"></div>',
    ].join('');
    document.body.appendChild(el);
    el.querySelector('#rc-s2-yes').onclick = function() { localStorage.setItem(CONSENT_KEY,'yes'); onConsent(); };
    el.querySelector('#rc-s2-no').onclick  = function() { localStorage.setItem(CONSENT_KEY,'not_now'); onDismiss(); };
    return el;
  }

  function setStatus(msg) {
    const el = document.getElementById('rc-s2-status');
    if (el) el.textContent = msg;
  }

  function closePanel() {
    const el = document.getElementById('rc-s2-panel');
    if (el) el.remove();
  }

  // ---- Task submission ------------------------------------------------------

  function selectTasks(templates) {
    // Bias toward local-tier tasks (lighter on player device); always include at most 1 mid-tier.
    const local = templates.filter(t => t.complexity_tier === 'local');
    const mid   = templates.filter(t => t.complexity_tier !== 'local');
    const picked = [];
    // Shuffle local
    for (let i = local.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = local[i]; local[i] = local[j]; local[j] = tmp;
    }
    picked.push(...local.slice(0, Math.min(5, local.length)));
    if (mid.length && picked.length < MAX_TASKS) picked.push(mid[0]);
    return picked.slice(0, MAX_TASKS);
  }

  function patchSeed(template, seed) {
    return Object.assign({}, template, {
      entropy_seed: seed,
      prompt: template.prompt.replace(/__RC_SEED__/g, seed),
    });
  }

  async function submitTasks(seed) {
    const res = await fetch('/engine/s2/objectives.json');
    if (!res.ok) throw new Error('objectives.json unavailable');
    const templates = await res.json();
    const tasks = selectTasks(templates).map(t => patchSeed(t, seed));

    let sent = 0;
    for (const task of tasks) {
      try {
        const payload = {
          title:      task.title,
          prompt:     task.prompt,
          repo:       'Runechain/blockmmo',
          capability: task.complexity_tier === 'local' ? 'inference.local' : 'inference.mid',
          contract:   { entropy_seed: task.entropy_seed, max_tokens: task.max_tokens, s2_type: task.type, s2_area: task.area },
        };
        const r = await fetch(_brokerUrl + '/objectives', {
          method:  'POST',
          headers: { 'content-type': 'application/json' },
          body:    JSON.stringify(payload),
        });
        if (r.ok) sent++;
        setStatus('Submitted ' + sent + '/' + tasks.length + ' tasks...');
      } catch (err) {
        console.warn('[S2] task submit error:', err);
      }
    }
    _taskCount = sent;
    setStatus('Done — ' + sent + ' S2 tasks in the network. Thank you.');
    sessionStorage.setItem(SUBMITTED_KEY, String(sent));
    return sent;
  }

  // ---- Public API -----------------------------------------------------------

  function init(brokerUrl) {
    if (!brokerUrl) return;
    _brokerUrl = brokerUrl.replace(/\/$/, '');

    if (sessionStorage.getItem(SUBMITTED_KEY)) return; // already submitted this session

    const prior = localStorage.getItem(CONSENT_KEY);
    if (prior === 'yes') {
      submit();
      return;
    }
    if (prior === 'not_now') return;

    buildPanel(
      function() { closePanel(); submit(); },
      function() { closePanel(); }
    );
  }

  function submit() {
    const seed = globalThis.__rc_s2_seed;
    if (!seed) { console.warn('[S2] no entropy seed yet'); return; }
    submitTasks(seed).catch(function(err) {
      console.warn('[S2] submit failed:', err);
      setStatus('Could not reach the S2 network — try again later.');
    });
  }

  function getStatus() {
    return {
      consented:  localStorage.getItem(CONSENT_KEY) === 'yes',
      submitted:  !!sessionStorage.getItem(SUBMITTED_KEY),
      taskCount:  _taskCount || parseInt(sessionStorage.getItem(SUBMITTED_KEY) || '0', 10),
    };
  }

  return { init, submit, getStatus };
});
