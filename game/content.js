(function (root, factory) {
  const content = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = content;
  root.RUNECHAIN_CONTENT = content;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
const ECON = {
  GOLD_PER_RUNE:1,
  GOLD_PER_SOL:1000,
  SPLIT:{burn:0.50,marketing:0.35,ops:0.15},
  BURN_ADDR:'BURN', MARKETING_ADDR:'MARKETING', OPS_ADDR:'OPS', EXCHANGE_ADDR:'EXCHANGE'
};

const ENEMY_REWARDS = {
  hollow:{name:'Hollow Debtor', rune:14},
  hound:{name:'Red Hound', rune:16},
  knight:{name:'Fallen Knight', rune:26},
  sorcerer:{name:'Hollow Sorcerer', rune:30},
  'flying-eye':{name:'Ledger Eye', rune:20},
  mushroom:{name:'Spore Debtor', rune:18},
  sexton:{name:'Gate Sexton Marrow', rune:34},
  mempool:{name:'Mempool Warden', rune:42},
  tallow:{name:'Mother Tallow', rune:100},
  foreman:{name:'The Debt Foreman', rune:68},
  bifurcated:{name:'Bifurcated Guard', rune:58},
  ledgerbound:{name:'The Ledger-Bound', rune:160},
  scrivener:{name:'The Scrivener', rune:88},
  cascade:{name:'Cascade Anchor', rune:108},
  auditor:{name:'The Auditor', rune:300}
};

const STORY = root.RUNECHAIN_STORY || {
  version:1,
  startQuest:'q01',
  quests:[{
    id:'q01',
    title:'Hearthlight Chapel',
    dialogue:[
      'Recorder/Chaplain: Put your hand on the registry stone. The Chainwell needs a name before it can spare a body.',
      'Debt Confessional: The unpaid are not buried here. They are processed until they walk.'
    ],
    onStart:['You wake beneath a warm ledger-lamp. The chapel floor has already recorded your name.'],
    steps:[
      {id:'registry', text:'Touch the Hearthlight registry stone.', done:{event:'interact', target:'hearth-registry', count:1}},
      {id:'first-debt', text:'Step beyond Hearthlight and cut down the first Hollow Debtor.', done:{event:'kill', monster:'hollow', count:1}}
    ],
    onComplete:['The Hollow collapses into ledger ash. Something below the parish records the debt.'],
    rewards:{rune:8},
    next:'q02'
  },{
    id:'q02',
    title:'Parish Road Receipts',
    dialogue:[
      'Sexton grave-tender: Two bells, west then east, make a witness out of sound.',
      'Gate Sexton Marrow: No entry passes the tithe-house without my stamp.'
    ],
    onStart:['The road east is paved with unpaid vows and walking receipts. Two bells decide what counts.'],
    steps:[
      {id:'bells', text:'Ring 2 verification bells beside the parish road.', done:{event:'interact', target:'verification-bell', count:2}},
      {id:'debtors', text:'Clear 2 more Hollow Debtors from the road receipts.', done:{event:'kill', monster:'hollow', count:2}},
      {id:'sexton', text:'Defeat Gate Sexton Marrow before he stamps your name shut.', done:{event:'kill', monster:'sexton', count:1}}
    ],
    onComplete:['The bells agree. The Chainwell below the chapel accepts your first proof.'],
    rewards:{rune:18},
    next:'q03'
  },{
    id:'q03',
    title:'Chainwell Ledger',
    dialogue:[
      'Scribe/Archivist: A relic is not a gift. It is a receipt you can survive by carrying.',
      'Recorder/Chaplain: Power is forged only in Hearthlight. Spend outside it and the parish calls it theft.'
    ],
    onStart:['A dead ledger turns below the chapel stones. It wants proof, not prayer.'],
    steps:[
      {id:'first-relic', text:'Forge your first RUNE relic at Hearthlight.', done:{event:'forge', any:true}}
    ],
    onComplete:['The relic bites into your hand. The Chainwell writes you as the Recorded, not the chosen.'],
    rewards:{rune:12},
    next:'q04'
  },{
    id:'q04',
    title:'The Mempool Yard',
    dialogue:[
      'Debt Confessional: Pending dead circle the pit until someone confirms what they owe.',
      'Mempool Warden: The queue grows teeth when you leave records unattended.'
    ],
    onStart:['Petitioners circle the yard, each waiting to be confirmed into a worse shape.'],
    steps:[
      {id:'yard-debtors', text:'Clear 2 pending Hollow Debtors from the Mempool Yard.', done:{event:'kill', monster:'hollow', count:2}},
      {id:'tablets', text:'Stamp 3 pending tablets in ledger order.', done:{event:'interact', target:'pending-tablet', count:3}},
      {id:'warden', text:'Defeat the Mempool Warden before the queue overflows.', done:{event:'kill', monster:'mempool', count:1}}
    ],
    onComplete:['The pending dead finally settle. Something waxen wakes inside Tallow House.'],
    rewards:{rune:24},
    next:'q05'
  },{
    id:'q05',
    title:'Tallow House',
    dialogue:[
      'Scribe/Archivist: Mother Tallow was the first record-keeper. She melted herself into wax so names would hold.',
      'Recorder/Chaplain: If she yields, I will seal the mercy. The system will mint what the parish cannot forgive.'
    ],
    onStart:['Candles burn with names instead of wax. Some names are still screaming.'],
    steps:[
      {id:'candles', text:'Extinguish 3 duplicate Tallow candles and leave the canonical flame lit.', done:{event:'interact', target:'tallow-candle', count:3}},
      {id:'mother-tallow', text:'Defeat Mother Tallow and claim the first Boss Sigil.', done:{event:'kill', monster:'tallow', count:1}}
    ],
    onComplete:['Mother Tallow melts into a sealed sigil. Gracefall has its first hard proof. A cold light breaks through the northern floor.'],
    rewards:{rune:40},
    next:'q06'
  },{
    id:'q06',
    title:'Vault Anteroom',
    onStart:['The Shroud Vaults open northward. Crystallized ledger-stone hums with inherited debt.'],
    steps:[
      {id:'lectern', text:'Read the ancestor-chain lectern in the Vault Anteroom.', done:{event:'interact', target:'ancestor-lectern', count:1}}
    ],
    /* The Keeper of Margins (margin-scroll) is a canonical OPTIONAL side-interaction, not a
       required q06 step: re-inscribing her entry weakens the Debt Foreman (two difficulty
       states). See index.html interactableActive/startBossEncounter (predicate 'q06:margin-scroll'). */
    onComplete:['The anteroom records your descent. The shaft below splits Canon from Schism.'],
    rewards:{rune:28},
    next:'q07'
  },{
    id:'q07',
    title:'The Debt Mines',
    onStart:['The shaft descends through crystallized names. Canon left, Schism right — both roads lead down.'],
    steps:[
      {id:'mine-hollows', text:'Clear 3 Hollow Inheritors from the Debt Mines.', done:{event:'kill', monster:'hollow', count:3}},
      {id:'foreman', text:'Defeat the Debt Foreman before the shaft collapses.', done:{event:'kill', monster:'foreman', count:1}}
    ],
    onComplete:["The Foreman's ledger-stamp shatters. An ancestor's name surfaces from the rubble."],
    rewards:{rune:52},
    next:'q08'
  },{
    id:'q08',
    title:'The Ledger Vaults',
    onStart:['Family vault doors line the walls. The living floor scrolls names — yours included.'],
    steps:[
      {id:'vault-seals', text:'Break 2 contested vault seals to free the pending records.', done:{event:'interact', target:'vault-seal', count:2}},
      {id:'bifurcated', text:'Defeat the Bifurcated Guard — both halves must fall.', done:{event:'kill', monster:'bifurcated', count:1}}
    ],
    onComplete:["The Guard's amber and green chains unravel. The Contested Key drops."],
    rewards:{rune:72},
    next:'q09'
  },{
    id:'q09',
    title:'The Ledger-Bound',
    onStart:['The colossal golem of crystallized ancestral names stirs. Your record compounds against you.'],
    steps:[
      {id:'ledgerbound', text:'Fracture the Ledger-Bound and sever your name from the ancestral chain.', done:{event:'kill', monster:'ledgerbound', count:1}}
    ],
    onComplete:['The golem fractures. Your name contests its inheritance — and wins. The Contested Will is yours. The Ascent of Testimony opens above.'],
    rewards:{rune:120},
    next:'q10'
  },{
    id:'q10',
    title:'Archive Tower',
    onStart:['The Archive Tower rewrites you in real time. The ledger-desk already has your entry.'],
    steps:[
      {id:'reading-desk', text:'Let the archive reading-desk write your name in its current form.', done:{event:'interact', target:'reading-desk', count:1}},
      {id:'void-seals', text:'Stabilize 2 Void Seals before the hyperinflation tick corrupts them.', done:{event:'interact', target:'void-seal', count:2}}
    ],
    onComplete:["The Prime Witness stirs. She has seen every record since the first. She confirms your paradox."],
    rewards:{rune:48},
    next:'q11'
  },{
    id:'q11',
    title:'Ascent of Testimony',
    onStart:['The Ascent climbs and contradicts itself. Midway — you fall up.'],
    steps:[
      {id:'audit-wolves', text:'Outrun 3 Audit Wolf packs on the Ascent of Testimony.', done:{event:'kill', monster:'hollow', count:3}},
      {id:'scrivener', text:'Defeat the Scrivener before your stat-sheet is fully greyed.', done:{event:'kill', monster:'scrivener', count:1}}
    ],
    onComplete:['The Scrivener falls. Write-access is yours. The Scrivener\'s Quill drops.'],
    rewards:{rune:80},
    next:'q12'
  },{
    id:'q12',
    title:'Seized Asset Yard',
    onStart:['Your own repossessed relics patrol as husks. The arena overlaps three zones at once.'],
    steps:[
      {id:'ledger-cores', text:'Interact with 2 core ledgers to stabilize your record.', done:{event:'interact', target:'ledger-core', count:2}},
      {id:'cascade', text:'Contest 3 consecutive decrees from the Cascade Anchor to destabilize it.', done:{event:'kill', monster:'cascade', count:1}}
    ],
    onComplete:["The Cascade Anchor retreats. The Auditor isn't evil — only consistent. The paradox is your own."],
    rewards:{rune:100},
    next:'q13'
  },{
    id:'q13',
    title:'The Auditor',
    onStart:['The humanoid silhouette of scrolling text faces you. It cannot be killed. Only answered.'],
    steps:[
      {id:'auditor', text:'Stand before the Auditor and make your choice — there is no killing it.', done:{event:'ending', any:true}}
    ],
    onComplete:['The ledger rotates one final time and settles. Your choice is recorded, and permanent.'],
    rewards:{rune:200}
  }]
};

const RELICS = [
  {id:'ember-edge', name:'Ember Edge', price:18, desc:'+8 attack damage. First real upgrade.', dmg:8, icon:'relic-ember-edge'},
  {id:'warden-sigil', name:'Warden Sigil', price:28, desc:'+18 max health. Survive a mistake.', hp:18, icon:'relic-warden-sigil'},
  {id:'green-knot', name:'Green Knot', price:34, desc:'+16 max stamina. Dash and swing longer.', sta:16, icon:'relic-green-knot'},
  {id:'rune-lens', name:'Rune Lens', price:48, desc:'+20% RUNE bounty from kills.', runeMult:0.2, icon:'relic-rune-lens'},
  {id:'tallow-brand', name:'Tallow Brand', price:90, desc:'+18 attack and +25 health.', dmg:18, hp:25, icon:'relic-tallow-brand'}
];
/* Boss Sigils — unique on-chain final-boss drops. RATIFIED RULINGS (docs/design/DESIGN-BIBLE.md):
   sigils grant RUNE-ACQUISITION bonuses earned by boss kills (grind-gated), never purchasable power.
   RUNE buys power ONLY at a Hearthlight; Gold is cosmetics only; endgame loops grant no farmable power. */
/* Hearthlight leveling — the ONLY RUNE power-sink besides relic forging (DESIGN-BIBLE Ruling 1).
   A stat's level is derived from accepted spend blocks on the ledger; cost rises with each level so
   power stays grind-gated. Authoritative cost math lives here so client and server agree exactly. */
const LEVELING = {
  baseCost: 12,
  growth: 8,
  maxLevel: 20,
  stats: {
    vigor:     { name:'Vigor',     grants:'+12 max health',  hp:12 },
    endurance: { name:'Endurance', grants:'+10 max stamina', sta:10 },
    strength:  { name:'Strength',  grants:'+4 attack',       dmg:4 },
  },
  // Cost to buy the (level -> level+1) upgrade, where `level` is the current count of that stat.
  costFor(level) { return this.baseCost + this.growth * level; },
};
const SIGILS = {
  'waxen-testament': { name:'The Waxen Testament', runeMult:0.12, note:'Legitimately Recorded' },
  'contested-will':  { name:'The Contested Will', runeMult:0.10, atkSpeed:0.12, iframeOnHit:true, note:'Severed from inheritance' },
  'amended-record':  { name:'The Amended Record', runeMult:0.15, endgame:true, note:'Co-authored' }
};
/* Boss Sigils — mapping from final-boss enemy key to the sigil it drops on kill.
   amended-record is Choice C only: the server enforces choiceC:true on the source. */
const BOSS_SIGILS = {
  tallow: 'waxen-testament',
  ledgerbound: 'contested-will',
  auditor: 'amended-record',
};

/* ---- Area 3 finale — the Auditor's three endings (issue #24/#5) ----------- */
/* The Auditor cannot be killed; the climax is a CHOICE of three permanent, account-bound
   endings (A/B/C), not combat. Per the ratified scope ruling the ending is FLAG-BASED and the
   ledger is PRESERVED — no on-chain RUNE wipe or relic destruction. Choice C ('amend') is the
   ONLY path to the Amended Record sigil and the only one that unlocks the endgame. The server
   persists the public account-bound ending; index.html mirrors it in progress.ending. */
const AUDITOR_ENDINGS = [
  { id:'A', key:'comply', title:'Ending A — Reconciled', label:'Sign the ledger as the Auditor wrote it',
    lines:[
      'You countersign the Auditor\'s version. The discrepancy is closed; the parish is recorded solvent, and you compliant.',
      'Codex: "The discrepancy was you. It has been reconciled. You are, at last, in good standing — and nothing else."'
    ] },
  { id:'B', key:'refuse', title:'Ending B — Redacted', label:'Strike your own name from the registry',
    lines:[
      'You redact your entry entirely. The Auditor cannot audit what was never recorded; the column where you stood goes blank.',
      'Codex: "Unrecorded. You owe nothing because you are nothing the ledger can hold. Free, and alone with it."'
    ] },
  { id:'C', key:'amend', title:'Ending C — Amended', sigil:'amended-record', endgame:true, label:'Take the second quill and co-author the record',
    lines:[
      'You take the other quill. The record is rewritten by two hands, neither sovereign — the Auditor\'s and yours.',
      'Codex: "The Amended Record stands: co-authored, contestable, alive. You are the Second Scribe."',
      'AMENDED RECORD SIGIL sealed. The Amendment endgame opens.'
    ] }
];

const ACT1_GRACEFALL = {
  id:'gracefall-parish',
  title:'Gracefall Parish',
  questIds:['q01','q02','q03','q04','q05'],
  prototypeLedger:'Boss Sigils are represented by the existing Chainwell ledger path: Chain.mintGreatRune queues a greatRune transaction, and greatRunesOf reads pending or mined sigils.',
  townBeats:[
    {id:'recorder-chaplain',role:'Recorder/Chaplain',quest:'q01',lines:[
      'The Hearthlight does not judge. It records, confirms, and returns you safely when the parish breaks your body.',
      'Bring every proof back here. RUNE becomes power only under this lamp.'
    ]},
    {id:'scribe-archivist',role:'Scribe/Archivist',quest:'q03',lines:[
      'Relics are indexed promises: paid in RUNE, forged in public, and useless until the Chainwell accepts the spend.',
      'Tallow wrote the first parish names by candlelight. Ask why the wax still remembers them.'
    ]},
    {id:'debt-confessional',role:'Debt Confessional',quest:'q04',lines:[
      'A debtor enters with a balance and leaves with a shape. Hollows are not monsters here; they are unresolved accounts.',
      'The northern vaults inherit what Gracefall cannot settle.'
    ]},
    {id:'chapel-acolyte',role:'Chapel Acolyte',quest:'q01',lines:[
      'Gold buys robes, colors, and vanity. It never buys strength.',
      'If someone sells power for Gold, it is not Hearthlight doctrine.'
    ]},
    {id:'sexton-grave-tenders',role:'Sexton grave-tenders',quest:'q02',lines:[
      'Paid graves face the chapel. Unpaid graves face the road, so they can be collected again.',
      'Marrow stamps the doubtful twice. The second stamp usually screams.'
    ]}
  ],
  interactions:{
    'hearth-registry':[
      'Recorder/Chaplain: Your name is Recorded. The Chainwell now has a place to return you.',
      'The registry stone warms, then goes cold as your first entry settles.'
    ],
    'verification-bell':[
      'The bell answers with a confirmation tone. Somewhere below, a ledger page stops shaking.',
      'Sexton grave-tender: A bell without a witness is noise. Two bells make evidence.'
    ],
    'pending-tablet':[
      'The pending tablet flips from MEMPOOL to CONFIRMED, and a hollow in the yard forgets why it was angry.',
      'Debt Confessional: Batch-confirm the restless before the Warden turns the queue against you.'
    ],
    'tallow-candle':[
      'A duplicate wax-name gutters out. Mother Tallow flinches as if the flame was tied to her wrist.',
      'Scribe/Archivist: Leave the canonical flame. Extinguish only the copies that stole breath.'
    ],
    'ancestor-lectern':[
      'The Shroud Vaults accept the Waxen Testament and open their first ledger.',
      'Debt Confessional: North is inheritance. Do not mistake it for freedom.'
    ]
  },
  bosses:{
    sexton:{
      key:'sexton',encounter:'gate-sexton-marrow',reward:'sextons-stamp',
      behaviors:['ledger-stamp slams leave ink-pool pressure','enrage below 50% HP after the bells witness you']
    },
    mempool:{
      key:'mempool',encounter:'mempool-warden',
      behaviors:['summons 2 Pending Hollow adds when wounded','grows stronger over time unless tablets are batch-confirmed']
    },
    tallow:{
      key:'tallow',encounter:'mother-tallow',sigilKey:'waxen-testament',unlocksQuest:'q06',
      behaviors:['platformer candles permanently weaken her','battlefield Tallow Echoes rush the player','phase 2 smoke split below 50% HP','Chaplain intervenes at defeat and seals mercy'],
      defeatLines:[
        'Recorder/Chaplain: Mercy is also a record. The Waxen Testament is sealed.',
        'Mother Tallow dissolves into warm wax and leaves a clean sigil in the Chainwell.'
      ]
    }
  },
  northPathUnlock:{
    quest:'q06',
    afterQuest:'q05',
    label:'North path to the Shroud Vaults',
    marker:'ancestor-lectern',
    representation:'When q05 completes, Story advances to q06. The runtime draws the north path and activates the Vault Anteroom lectern.'
  }
};

const SKINS = [
  { id:'tarnished', name:'Recorded', price:0, body:'#334052', trim:'#8ca0b8', skin:'#cfa982' },
  { id:'crimson', name:'Crimson Lord', price:120, body:'#6b2020', trim:'#e24a4a', skin:'#cfa982' },
  { id:'verdant', name:'Verdant Knight', price:180, body:'#1f472f', trim:'#57c77a', skin:'#cfa982' },
  { id:'azure', name:'Azure Witness', price:240, body:'#233d73', trim:'#7aa7ff', skin:'#cfa982' },
  { id:'gilded', name:'Gilded Champion', price:500, body:'#4d3c17', trim:'#f1c75b', skin:'#d5c596' },
  { id:'void', name:'Voidwalker', price:800, body:'#17141f', trim:'#9b74ff', skin:'#77718f' },
  // Exploration-exclusive cosmetic: not sold for Gold (secret:true hides it from the wardrobe shop).
  // Granted only by finding the hidden Unrecorded Vault off the parish path — rewarded curiosity,
  // never power, never purchasable. See AREA1_LORE 'unrecorded-vault' + index.html lore wiring.
  { id:'unrecorded', name:'Unrecorded Pilgrim', price:0, secret:true, body:'#2b2622', trim:'#b9a06a', skin:'#bfae8c' },
  // Found by discovering the Sealed Cellar interior (a hidden building off the plaza). Curiosity-only.
  { id:'cellar-warden', name:'Cellar Warden', price:0, secret:true, body:'#20262a', trim:'#6f93a8', skin:'#b9b2a0' },
  { id:'fork-pilgrim', name:'Fork Pilgrim', price:0, secret:true, body:'#2a3028', trim:'#9ab89a', skin:'#b9a68a' },
  { id:'auditor-robe', name:"Auditor's Robe", price:0, secret:true, body:'#c8c2b4', trim:'#3a3630', skin:'#e0d8cc' },
  { id:'void-skin', name:'Void-Skin', price:0, secret:true, body:'#0a0a10', trim:'#2a2a3a', skin:'#1a1a26' },
  { id:'scribe-robes', name:"Scribe's Robes", price:0, secret:true, body:'#c8c2b4', trim:'#5a5a7a', skin:'#c0b0d4' },
  { id:'canon-clerk', name:'Canon Clerk', price:0, secret:true, body:'#3a3028', trim:'#d4a83e', skin:'#c8a882' }
];

/* ---- Area 1 — off-path lore (issue #25, world & content lane) ------------- */
/* Rewarded curiosity for Gracefall Parish: discoveries sit OFF the q01-q05 quest corridor
   (which clusters near y in [-140,140]). Each records a lore fragment in the player's Codex;
   none gate quests or grant power. The hidden 'unrecorded-vault' dead-end (reward:'unrecorded')
   grants the exploration-only cosmetic. The index.html host consumes this via LORE markers,
   nearestLore()/discoverLore() and the Codex counter. */
const AREA1_LORE=[
  { id:'pilgrim-cairn', title:'The Pilgrim Cairn', x:240, y:-320, kind:'cairn',
    lines:[
      'A cairn of unpaid debtors, stacked north of the parish where no road leads.',
      'Scratched into the topmost stone: "We walked here to NOT be recorded. The Chainwell found us anyway."'
    ] },
  { id:'drowned-ledger', title:'The Drowned Ledger', x:520, y:320, kind:'ledger',
    lines:[
      'A ledger-book bloats in the southern marsh, ink running into the reeds.',
      'The last legible line: "Balance forgiven — see Mother Tallow." The entry below it has been burned away.'
    ] },
  { id:'west-milestone', title:'The West Milestone', x:-380, y:120, kind:'milestone',
    lines:[
      'A milestone at the dead end of the western track. The mileage was chiselled off.',
      'Beneath, a newer hand: "Hearthlight is not the first parish. Ask the Archivist what stood here before."'
    ] },
  // Hidden dead-end. Concealed NW of the chapel behind the bramble wall; grants the cosmetic.
  { id:'unrecorded-vault', title:'The Unrecorded Vault', x:-600, y:-300, kind:'vault', reward:'unrecorded',
    lines:[
      'A collapsed strong-room the Chainwell never indexed. Dust here has never been counted.',
      'In a niche: a pilgrim\'s ash-grey shroud, unworn, unrecorded. You take it — the ledger does not notice.',
      'COSMETIC UNLOCKED: Unrecorded Pilgrim (wardrobe, B).'
    ] }
];

/* ---- Area 1 — ledger puzzles (issue #26, world & content lane) ------------ */
/* Q-N3: the old "puzzles" were puzzle SHAPE — press E N times in any order. These two require
   deliberate thought tied to the bureaucratic/ledger theme: read the clue + the inscriptions,
   DEDUCE the activation order, and stamp the stones in that order. A wrong stamp blanks the
   ledger (progress resets). Solving reveals a Codex fragment. `order` is the correct node-id
   sequence and is intentionally NOT the spatial (x-sorted) order, so the clue is required to
   solve — the host engine never reveals the order. Off the q01-q05 quest corridor; optional;
   no power reward. Consumed by index.html nearestPuzzleTarget()/stampPuzzle()/drawPuzzles(). */
const AREA1_PUZZLES=[
  { id:'reconciliation', title:'The Reconciliation Yard',
    clue:{ id:'recon-board', x:386, y:150, label:'TALLY BOARD',
      lines:[
        'TALLY BOARD: "The Chainwell settles the smallest debt before the great."',
        'Stamp the ledger stones from least owed to greatest. A false tally blanks the slate.'
      ] },
    // amounts deliberately scrambled in space; correct order is ascending by value.
    nodes:[
      { id:'r-47', value:47, label:'47', x:300, y:190, inscription:'Ledger stone — debt of 47 marks.' },
      { id:'r-8',  value:8,  label:'8',  x:470, y:250, inscription:'Ledger stone — debt of 8 marks.'  },
      { id:'r-23', value:23, label:'23', x:320, y:262, inscription:'Ledger stone — debt of 23 marks.' },
      { id:'r-12', value:12, label:'12', x:462, y:182, inscription:'Ledger stone — debt of 12 marks.' }
    ],
    order:['r-8','r-12','r-23','r-47'],
    stamp:'The stone settles. The slate accepts the tally.',
    wrong:'The tally does not balance — the slate blanks itself.',
    solvedLore:[
      'The four stones settle flush. A seam in the yard wall grinds open onto nothing — only dust.',
      'Codex: "Reconciliation is not forgiveness. The Chainwell only wants the order right."'
    ] },
  { id:'debt-chain', title:'The Writ of Succession',
    clue:{ id:'writ-board', x:-230, y:150, label:'OPENING WRIT',
      lines:[
        'OPENING WRIT: "Begin with Pell, who first broke faith."',
        'Each writ names the soul its debtor owes. Follow the chain to its settled end.'
      ] },
    // each marker names WHO it owes; trace Pell -> Marrow -> Goss -> Vance (settled).
    nodes:[
      { id:'w-vance',  label:'VANCE',  x:-300, y:190, inscription:'Writ of Vance — "Vance owes no one. Settled."' },
      { id:'w-goss',   label:'GOSS',   x:-150, y:282, inscription:'Writ of Goss — "Goss owes Vance."'    },
      { id:'w-pell',   label:'PELL',   x:-160, y:200, inscription:'Writ of Pell — "Pell owes Marrow."'   },
      { id:'w-marrow', label:'MARROW', x:-280, y:262, inscription:'Writ of Marrow — "Marrow owes Goss."' }
    ],
    order:['w-pell','w-marrow','w-goss','w-vance'],
    stamp:'The writ is countersigned. The next debtor waits.',
    wrong:'No writ binds these two — the chain falls slack and you must begin again.',
    solvedLore:[
      'The four writs braid into a single cord and burn cold. The succession is closed.',
      'Codex: "Every debt names another. Trace far enough and you find a name that owes only the Chainwell."'
    ] }
];

const AREA2_LORE=[
  { id:'ancestor-cairn', title:'The Ancestor Stack', x:900, y:-260, kind:'cairn',
    lines:[
      'A stack of crystallized debt-tablets, piled where no road leads north of the Vault.',
      '"We came here to contest our names. The Chainwell recorded the contestation and charged us for the filing."'],
    codex:'Inheritance is not a gift. It is a documented obligation with compound interest.' },
  { id:'canon-founding-stone', title:'Canon Founding Inscription', x:1242, y:-340, kind:'stone',
    lines:[
      'An amber-lit inscription deep in the Canon passage. The lettering is precise and careful.',
      '"First record: solvent. Every subsequent record: inherited deficit. The Chainwell notes the pattern but cannot break it."'],
    codex:'The first debt was recorded correctly. Every generation since has added a digit.' },
  { id:'schism-mirror-pool', title:'The Schism Reflection', x:1384, y:200, kind:'water',
    lines:[
      'A still pool at the edge of the Schism passage. Your reflection writes DEDROCER before you do.',
      '"You are already Contested. The pool read you before you arrived. It reads everyone that way."'],
    codex:'The Schism does not create contradiction. It reflects what was already there.' },
  { id:'contested-archive', title:'The Contested Archive', x:956, y:-324, kind:'vault',
    lines:[
      'A small collapsed vault off the main passage, never indexed by the Chainwell.',
      '"Unclaimed. The debt tablets here were never picked up. You take one — the ledger records the acquisition but does not bill you for it."'],
    codex:'Some records go unclaimed so long they become property of whoever finds them first.',
    reward:'fork-pilgrim', secret:true }
];

const AREA2_PUZZLES=[
  { id:'fork-sequence', title:'The Fork Sequence',
    clue:'The sequence of obligation: Canon before Schism, or debt redoubles.',
    mechanism:'stamp', location:{x:1180,y:-80},
    nodes:[
      {id:'canon-seal',label:'CANON SEAL',order:1,x:1162,y:-80},
      {id:'schism-seal',label:'SCHISM SEAL',order:2,x:1200,y:-80},
      {id:'cross-seal',label:'CROSSING SEAL',order:3,x:1180,y:-42}
    ],
    reward:'codex',
    stamp:'The seals accept the sequence. The crossing is recorded.',
    wrong:'The sequence refuses. Canon must precede Schism.',
    solvedLore:[
      'Three seals press together and lock with an amber click.',
      'Codex: "Canon first. Schism second. The crossing seals both. The order is the record."'] },
  { id:'debt-chain-trace', title:'The Debt Chain',
    clue:'Trace the chain: who named their inheritor first?',
    mechanism:'touch-in-order', location:{x:1040,y:80},
    nodes:[
      {id:'ancestor-voss',label:'VOSS (first debtor)',order:1,x:1034,y:60},
      {id:'ancestor-grey',label:'GREY (owes Voss)',order:2,x:1060,y:80},
      {id:'ancestor-plinth',label:'PLINTH (owes Grey)',order:3,x:1088,y:60},
      {id:'ancestor-chain-end',label:'SETTLED (the Chainwell)',order:4,x:1050,y:100}
    ],
    reward:'codex',
    stamp:'The chain is traced. The inheritance is named.',
    wrong:'The chain falls slack — the order of inheritance was broken.',
    solvedLore:[
      'The four names glow amber in sequence and go dark together.',
      'Codex: "Every debt chain ends at the Chainwell. Walk the inheritance to find where you stand."'] }
];

const ASSETS={
  tiles:{src:'assets/pixel/tiles-parish.png',w:16,h:16,img:null},
  playerDir:{src:'assets/pixel/player-directions.png',w:56,h:56,img:null},
  heroKnightDir:{src:'assets/pixel/hero-knight-directions.png',w:54,h:44,img:null},
  heroKnightAtk:{src:'assets/pixel/hero-knight-attack.png',w:54,h:44,img:null},
  player:{src:'assets/pixel/player.png',w:24,h:24,img:null},
  'free-knight-idle':{src:'assets/pixel/free-knight-idle.png',w:120,h:80,img:null},
  'free-knight-run':{src:'assets/pixel/free-knight-run.png',w:120,h:80,img:null},
  'free-knight-jump':{src:'assets/pixel/free-knight-jump.png',w:120,h:80,img:null},
  'free-knight-fall':{src:'assets/pixel/free-knight-fall.png',w:120,h:80,img:null},
  'free-knight-attack':{src:'assets/pixel/free-knight-attack.png',w:120,h:80,img:null},
  'free-knight-hit':{src:'assets/pixel/free-knight-hit.png',w:120,h:80,img:null},
  'free-knight-death':{src:'assets/pixel/free-knight-death.png',w:120,h:80,img:null},
  hollow:{src:'assets/pixel/hollow.png',w:24,h:24,img:null},
  hound:{src:'assets/pixel/hound.png',w:24,h:24,img:null},
  knight:{src:'assets/pixel/knight.png',w:24,h:24,img:null},
  sorcerer:{src:'assets/pixel/sorcerer.png',w:24,h:24,img:null},
  sexton:{src:'assets/pixel/sexton.png',w:56,h:56,img:null},
  tallow:{src:'assets/pixel/tallow.png',w:64,h:64,img:null},
  sentinel:{src:'assets/pixel/sentinel.png',w:48,h:48,img:null},
  phantom:{src:'assets/pixel/phantom.png',w:24,h:24,img:null},
  mempool:{src:'assets/pixel/mempool.png',w:56,h:56,img:null},
  'tallow-echo':{src:'assets/pixel/tallow-echo.png',w:24,h:24,img:null},
  foreman:{src:'assets/pixel/foreman.png',w:64,h:64,img:null},
  bifurcated:{src:'assets/pixel/bifurcated.png',w:56,h:56,img:null},
  ledgerbound:{src:'assets/pixel/ledgerbound.png',w:80,h:80,img:null},
  'hollow-ancestor':{src:'assets/pixel/hollow-ancestor.png',w:24,h:24,img:null},
  'canon-auditor':{src:'assets/pixel/canon-auditor.png',w:24,h:24,img:null},
  'schism-shadow':{src:'assets/pixel/schism-shadow.png',w:24,h:24,img:null},
  scrivener:{src:'assets/pixel/scrivener.png',w:64,h:64,img:null},
  cascade:{src:'assets/pixel/cascade.png',w:72,h:72,img:null},
  auditor:{src:'assets/pixel/auditor.png',w:80,h:80,img:null},
  'audit-wolf':{src:'assets/pixel/audit-wolf.png',w:32,h:32,img:null},
  'relic-shade':{src:'assets/pixel/relic-shade.png',w:24,h:24,img:null},
  'flying-eye':{src:'assets/pixel/flying-eye.png',w:24,h:24,img:null},
  mushroom:{src:'assets/pixel/mushroom.png',w:24,h:24,img:null},
  'pf-flying-eye':{src:'assets/pixel/pf-flying-eye.png',w:64,h:64,img:null},
  'pf-goblin':{src:'assets/pixel/pf-goblin.png',w:64,h:64,img:null},
  'pf-mushroom':{src:'assets/pixel/pf-mushroom.png',w:64,h:64,img:null},
  'pf-skeleton':{src:'assets/pixel/pf-skeleton.png',w:64,h:64,img:null},
  'pf-flying-eye-projectile':{src:'assets/pixel/pf-flying-eye-projectile.png',w:48,h:48,img:null},
  'pf-goblin-bomb':{src:'assets/pixel/pf-goblin-bomb.png',w:100,h:100,img:null},
  'pf-mushroom-projectile':{src:'assets/pixel/pf-mushroom-projectile.png',w:50,h:50,img:null},
  'pf-skeleton-sword':{src:'assets/pixel/pf-skeleton-sword.png',w:92,h:102,img:null},
  'relic-ember-edge':{src:'assets/pixel/relic-ember-edge.png',w:16,h:16,img:null},
  'relic-warden-sigil':{src:'assets/pixel/relic-warden-sigil.png',w:16,h:16,img:null},
  'relic-green-knot':{src:'assets/pixel/relic-green-knot.png',w:16,h:16,img:null},
  'relic-rune-lens':{src:'assets/pixel/relic-rune-lens.png',w:16,h:16,img:null},
  'relic-tallow-brand':{src:'assets/pixel/relic-tallow-brand.png',w:16,h:16,img:null},
  'gl-terrain':{src:'assets/pixel/gl-terrain.png',w:192,h:64,img:null},
  'gl-bg1':{src:'assets/pixel/gl-bg1.png',w:368,h:208,img:null},
  'gl-bg2':{src:'assets/pixel/gl-bg2.png',w:400,h:208,img:null},
  'gl-bg3':{src:'assets/pixel/gl-bg3.png',w:416,h:208,img:null},
  'gl-cloud1':{src:'assets/pixel/gl-cloud1.png',w:48,h:16,img:null},
  'gl-cloud2':{src:'assets/pixel/gl-cloud2.png',w:64,h:32,img:null},
  'gl-cloud3':{src:'assets/pixel/gl-cloud3.png',w:96,h:32,img:null},
  'gl-tree':{src:'assets/pixel/gl-tree.png',w:64,h:80,img:null},
  'gl-bush':{src:'assets/pixel/gl-bush.png',w:16,h:16,img:null},
  'gl-stone':{src:'assets/pixel/gl-stone.png',w:16,h:16,img:null},
  'gl-tallgrass1':{src:'assets/pixel/gl-tallgrass1.png',w:16,h:16,img:null},
  'gl-tallgrass2':{src:'assets/pixel/gl-tallgrass2.png',w:16,h:16,img:null},
  'gl-stone2':{src:'assets/pixel/gl-stone2.png',w:16,h:16,img:null},
  'gl-stone3':{src:'assets/pixel/gl-stone3.png',w:32,h:16,img:null},
  'gl-choppedtree':{src:'assets/pixel/gl-choppedtree.png',w:32,h:16,img:null}
};

const PLAT_LEVEL={id:'a1-parish-road',name:'Parish Road Receipts',width:2000,height:640,
  spawn:{x:80,y:530},physics:{maxRun:220,jump:455},
  tilesheet:'gl-terrain',
  bg:['gl-bg1','gl-bg2','gl-bg3'],bgParallax:[0.08,0.2,0.42],
  clouds:[
    {key:'gl-cloud1',x:120,y:32,parallax:0.04},{key:'gl-cloud2',x:340,y:20,parallax:0.06},
    {key:'gl-cloud3',x:620,y:40,parallax:0.05},{key:'gl-cloud1',x:900,y:24,parallax:0.04},
    {key:'gl-cloud2',x:1180,y:36,parallax:0.06},{key:'gl-cloud3',x:1520,y:18,parallax:0.05}
  ],
  props:[
    {key:'gl-tree',x:48,y:560},{key:'gl-bush',x:160,y:560},{key:'gl-stone',x:400,y:560},
    {key:'gl-tree',x:580,y:560},{key:'gl-bush',x:720,y:560},{key:'gl-stone',x:876,y:560},
    {key:'gl-tree',x:1168,y:496},{key:'gl-bush',x:1440,y:496},{key:'gl-tree',x:1760,y:336}
  ],
  platforms:[
    {id:'ground-a',x:0,y:560,w:512,h:80},
    {id:'shelf-a',x:80,y:496,w:96,h:16,type:'oneWay'},
    {id:'ledge-a',x:224,y:432,w:80,h:16,type:'oneWay'},
    {id:'scout-post',x:336,y:368,w:64,h:16,type:'oneWay'},
    {id:'mover-a',x:462,y:512,w:80,h:16,type:'solid',vx:36,minX:444,maxX:596},
    {id:'island-a',x:544,y:560,w:200,h:80},
    {id:'upper-a',x:576,y:496,w:112,h:16,type:'oneWay'},
    {id:'island-b',x:792,y:560,w:236,h:80},
    {id:'step-b',x:840,y:496,w:80,h:16,type:'oneWay'},
    {id:'bridge-c',x:972,y:528,w:64,h:16,type:'oneWay'},
    {id:'bridge-d',x:1020,y:480,w:64,h:16,type:'oneWay'},
    {id:'raised-c',x:1056,y:496,w:688,h:144},
    {id:'wall-c',x:1264,y:448,w:72,h:48},
    {id:'ledge-c',x:1376,y:432,w:112,h:16,type:'oneWay'},
    {id:'mover-b',x:1472,y:451,w:72,h:16,type:'solid',vy:-40,minY:392,maxY:451},
    {id:'boss-step1',x:1592,y:448,w:104,h:16,type:'oneWay'},
    {id:'boss-step2',x:1672,y:400,w:104,h:16,type:'oneWay'},
    {id:'boss-arena',x:1744,y:336,w:256,h:80}
  ],
  hazards:[
    {id:'mud',type:'slow',x:150,y:544,w:130,h:16,slow:0.45},
    {id:'wax-a',type:'sticky',x:300,y:544,w:120,h:16,slow:0.35,staminaCost:1},
    {id:'pages-a',type:'projectile',x:718,y:80,w:32,h:32,interval:1.2,speedY:225,damage:2},
    {id:'stun-bell',type:'stun',x:1088,y:480,w:48,h:16,stun:0.6},
    {id:'spikes-wall',type:'damage',x:1192,y:480,w:48,h:16,damage:3},
    {id:'kb-boss',type:'knockback',x:1420,y:480,w:48,h:16,damage:1,knockX:200,knockY:-200}
  ],
  enemies:[
    {id:'road-goblin',type:'goblin',sprite:'pf-goblin',x:280,y:560,w:24,h:38,hp:44,damage:2,speed:38,patrolMin:200,patrolMax:450,frameCount:12,scale:.88},
    {id:'gap-eye',type:'flying-eye',sprite:'pf-flying-eye',x:630,y:430,w:26,h:30,hp:34,damage:2,speed:30,patrolMin:530,patrolMax:720,frameCount:6,scale:.8,flying:true,baseY:430},
    {id:'spore-tyrant',type:'mushroom',sprite:'pf-mushroom',name:'The Spore Tyrant',boss:true,x:912,y:560,w:52,h:58,hp:140,damage:3,speed:24,aggro:210,patrolMin:828,patrolMax:1004,frameCount:7,animRate:6,scale:2.0,burstFrame:9,
      ranged:{interval:1.9,speed:165,damage:3,range:380,rangeY:240,delay:0.9,sprite:'pf-mushroom-projectile',frameCount:8,animRate:14,scale:.5,w:20,h:20,color:'#9f3e45'}},
    {id:'raised-goblin',type:'goblin',sprite:'pf-goblin',x:1150,y:496,w:24,h:38,hp:44,damage:2,speed:34,patrolMin:1072,patrolMax:1250,frameCount:12,scale:.88},
    {id:'wall-skeleton',type:'skeleton',sprite:'pf-skeleton',x:1430,y:432,w:24,h:40,hp:52,damage:3,speed:28,patrolMin:1376,patrolMax:1480,frameCount:6,scale:.9},
    {id:'approach-eye',type:'flying-eye',sprite:'pf-flying-eye',x:1700,y:380,w:26,h:30,hp:34,damage:2,speed:28,patrolMin:1660,patrolMax:1790,frameCount:6,scale:.8,flying:true,baseY:380},
    {id:'gate-skeleton',type:'skeleton',sprite:'pf-skeleton',x:1800,y:336,w:24,h:40,hp:52,damage:3,speed:30,patrolMin:1752,patrolMax:1940,frameCount:6,scale:.9}
  ],
  bossTrigger:{id:'gate-sexton-marrow',x:1820,y:272,w:100,h:64,lock:{x:1680,y:200,w:400,h:216}},
  exit:{id:'to-mempool-yard',x:1900,y:316,w:40,h:80}};
const BATTLE_LEVEL={id:'a1-mempool-yard',name:'Mempool Yard',width:1500,height:920,spawn:{x:230,y:420},physics:{speed:180},
  creatures:{hollow:{hp:22,speed:46,damage:3,reach:18,radius:10,color:'#7c3936'},hound:{hp:16,speed:74,damage:2,reach:16,radius:9,color:'#c66c34'},knight:{hp:36,speed:35,damage:5,reach:20,radius:12,color:'#8e969b'},goblin:{hp:24,speed:48,damage:4,reach:20,radius:12,color:'#9e6a3e',asset:'pf-goblin',scale:.72},skeleton:{hp:36,speed:38,damage:5,reach:22,radius:12,color:'#d4d0c8',asset:'pf-skeleton',scale:.74},mushroom:{hp:30,speed:24,damage:3,reach:20,radius:13,color:'#9f3e45',asset:'pf-mushroom',scale:.7},'flying-eye':{hp:24,speed:56,damage:3,reach:18,radius:10,color:'#b65a48',asset:'pf-flying-eye',scale:.66},default:{hp:18,speed:42,damage:2,reach:16,radius:10,color:'#8c7650'}},
  zones:[{id:'west-tablets',x:120,y:250,w:380,h:280,regen:9,clearFor:14},{id:'east-ledger',x:760,y:220,w:430,h:320,regen:7,clearFor:16},{id:'south-well',x:500,y:590,w:420,h:230,regen:11,clearFor:12}],
  waves:[{id:'first-debtors',at:0.4,zoneId:'west-tablets',spawns:[{type:'goblin',x:320,y:330,count:2},{type:'mushroom',x:410,y:455,count:1}]},{id:'ledger-knights',at:5.5,zoneId:'east-ledger',spawns:[{type:'skeleton',x:870,y:320,count:2},{type:'flying-eye',x:1030,y:440,count:2}]},{id:'well-surge',at:10.5,zoneId:'south-well',spawns:[{type:'hound',x:630,y:690,count:2},{type:'hollow',x:760,y:710,count:2},{type:'goblin',x:820,y:660,count:1}]}]};
const TURN_ENCOUNTER={id:'duel-demo',name:'Sparring',opponent:{name:'Hollow Duelist',hp:64,attack:9,defense:1,color:'#7c3936',sprite:'hollow'}};
const BOSS_SCRIPT={id:'gate-sexton-marrow',name:'Gate Sexton Marrow',beat:0.8,segments:[
  {mode:'platformer',name:'Parish Road approach',payload:PLAT_LEVEL,beatText:'The tithe-house gate looms...',complete:{event:'boss'}},
  {mode:'battlefield',name:'Tithe-house yard',payload:BATTLE_LEVEL,beatText:'The Sexton stamps the dead awake.',complete:{event:'cleared'}},
  {mode:'turnbased',name:'Marrow, face to face',payload:TURN_ENCOUNTER,beatText:'He raises the ledger-stamp.',complete:{event:'duel'}}
]};
/* Area 1 bosses as story-gated, multi-play-style encounters (bible: Gracefall Parish). */
const TURN_SEXTON={id:'duel-sexton',name:'Gate Sexton Marrow',opponent:{name:'Gate Sexton Marrow',hp:96,attack:14,defense:2,color:'#d8b36b',sprite:'sexton'}};
const TURN_WARDEN={id:'duel-warden',name:'Mempool Warden',opponent:{name:'Mempool Warden',hp:92,attack:13,defense:1,color:'#b88cff',sprite:'mempool'}};
/* Mother Tallow hp = 260 is canon (DESIGN-BIBLE.md Area 1: "hp 260, dmg 22..."); matches the index.html registry.
   Phase 2 (smoke split): at 50% HP she sheds her waxen body and a smoke echo, becoming a dual-chain foe
   (engine/turnbased.js resolveFoe). Both halves must be cut down; they slowly re-merge each foe turn unless
   the hero holds the split open with Strike Both. This is the Area-1 introduction to the dual-chain mechanic
   the Canon/Schism bosses lean on later — gentler halves and merge than the final Ledger-Bound. */
const TURN_TALLOW={id:'duel-tallow',name:'Mother Tallow',opponent:{name:'Mother Tallow',hp:260,attack:18,defense:3,color:'#f1c75b',sprite:'tallow',
  phase2:{threshold:0.5,aHp:72,bHp:72,aLabel:'WAXEN',bLabel:'SMOKE',aColor:'#f1c75b',bColor:'#9a8f7a',mergePerTurn:4}}};
/* Tallow House: vertical wax-choked interior, rising lift, dripping-wax hazards — distinct from the Parish Road climb. */
const PLAT_TALLOW_HOUSE={id:'a1-tallow-house',name:'Tallow House',width:1080,height:720,spawn:{x:60,y:616},physics:{maxRun:195,jump:445},
  platforms:[{id:'ground',x:0,y:660,w:1080,h:60,type:'solid'},{id:'shelf-a',x:90,y:580,w:130,h:12,type:'oneWay'},{id:'mid-floor',x:320,y:560,w:260,h:14,type:'solid'},{id:'wax-lift',x:510,y:510,w:110,h:14,type:'solid',vy:32,minY:400,maxY:520},{id:'shelf-b',x:120,y:460,w:160,h:12,type:'oneWay'},{id:'walkway',x:650,y:430,w:200,h:14,type:'solid'},{id:'step-a',x:200,y:360,w:120,h:14,type:'solid'},{id:'step-b',x:750,y:340,w:140,h:12,type:'oneWay'},{id:'upper',x:380,y:270,w:260,h:14,type:'solid'},{id:'altar',x:700,y:190,w:230,h:14,type:'solid'}],
  hazards:[{id:'wax-pool-a',type:'slow',x:130,y:646,w:180,h:14,slow:0.45},{id:'wax-pool-b',type:'slow',x:380,y:545,w:190,h:14,slow:0.42},{id:'drip-a',type:'damage',x:275,y:545,w:28,h:14,damage:2},{id:'drip-b',type:'damage',x:655,y:415,w:28,h:14,damage:2},{id:'wax-fall-a',type:'projectile',x:360,y:60,w:24,h:20,interval:1.2,speedY:250,damage:3},{id:'wax-fall-b',type:'projectile',x:640,y:80,w:24,h:20,interval:1.8,speedY:240,damage:3},{id:'wax-seal',type:'sticky',x:395,y:255,w:240,h:14,slow:0.3,staminaCost:2},{id:'flame-pillar',type:'stun',x:560,y:250,w:46,h:20,stun:0.65},{id:'wax-burst',type:'knockback',x:780,y:170,w:44,h:20,damage:2,knockX:-240,knockY:-200}],
  bossTrigger:{id:'mother-tallow',x:740,y:120,w:160,h:70,lock:{x:580,y:80,w:470,h:220}},exit:{id:'tallow-echoes',x:1040,y:580,w:34,h:80}};
/* Tallow Echoes: fast hollow rush + wax-knight golems — distinct creature tuning vs the Mempool Yard pending dead. */
const BATTLE_TALLOW_ECHOES={id:'a1-tallow-echoes',name:'Tallow Echoes',width:1200,height:800,spawn:{x:190,y:360},physics:{speed:170},
  creatures:{'tallow-echo':{hp:10,speed:100,damage:2,reach:14,radius:8,color:'#f5e8d0'},knight:{hp:48,speed:28,damage:7,reach:22,radius:13,color:'#d4b85a'},hound:{hp:18,speed:65,damage:3,reach:16,radius:9,color:'#e87d3e'},default:{hp:14,speed:55,damage:2,reach:14,radius:9,color:'#b8a870'}},
  zones:[{id:'wax-antechamber',x:80,y:160,w:360,h:300,regen:8,clearFor:10},{id:'tallow-chapel',x:520,y:150,w:400,h:360,regen:6,clearFor:14},{id:'candle-ring',x:300,y:520,w:580,h:220,regen:10,clearFor:11}],
  waves:[{id:'echo-rush',at:0.3,zoneId:'wax-antechamber',spawns:[{type:'tallow-echo',x:280,y:280,count:5},{type:'tallow-echo',x:360,y:360,count:3}]},{id:'wax-sentries',at:5.0,zoneId:'tallow-chapel',spawns:[{type:'knight',x:650,y:260,count:2},{type:'tallow-echo',x:820,y:380,count:4}]},{id:'candle-surge',at:11.0,zoneId:'candle-ring',spawns:[{type:'hound',x:440,y:580,count:3},{type:'tallow-echo',x:600,y:620,count:5},{type:'knight',x:760,y:560,count:1}]}]};
const AREA1_ENCOUNTERS={
  sexton:{id:'gate-sexton-marrow',name:'Gate Sexton Marrow',beat:0.8,segments:[
    {mode:'platformer',name:'Parish Road approach',payload:PLAT_LEVEL,beatText:'The tithe-house gate looms...',complete:{event:'boss'}},
    {mode:'turnbased',name:'Marrow, face to face',payload:TURN_SEXTON,beatText:'He raises the ledger-stamp.',complete:{event:'duel'}}
  ]},
  mempool:{id:'mempool-warden',name:'Mempool Warden',beat:0.8,segments:[
    {mode:'battlefield',name:'The Mempool Yard',payload:BATTLE_LEVEL,beatText:'The pending dead stir.',complete:{event:'cleared'}},
    {mode:'turnbased',name:'The Warden',payload:TURN_WARDEN,beatText:'It drags its chains forward.',complete:{event:'duel'}}
  ]},
  tallow:{id:'mother-tallow',name:'Mother Tallow',beat:0.9,segments:[
    {mode:'platformer',name:'Tallow House',payload:PLAT_TALLOW_HOUSE,beatText:'Wax names burn in the dark.',complete:{event:'boss'}},
    {mode:'battlefield',name:'Tallow Echoes',payload:BATTLE_TALLOW_ECHOES,beatText:'The echoes swarm.',complete:{event:'cleared'}},
    {mode:'turnbased',name:'Mother Tallow',payload:TURN_TALLOW,beatText:'She melts toward you.',complete:{event:'duel'}}
  ]}
};
/* ---- World-to-interior portals (issue #19 / Q-N1) ------------------------- */
/* The connective tissue the top-down world was missing: descend an overworld entrance and a
   platformer interior loads inline; reach its exit (or leave via T) and re-emerge at the same
   spot. Reuses the segment-free engine path (host: enterPortal/exitEngineMode) and validated
   platformer geometry — bespoke interior layouts are a follow-up. `level` must expose an `exit`
   so the player can always climb back out. `unlock` (optional) story-gates the entrance: the
   portal only opens once that quest is reached, so descending is an EARNED, diegetic reward
   (folded in from the #78 design) rather than a bare hole in the wall. Omit it = always open. */
const WORLD_PORTALS=[
  { id:'undercroft', x:-250, y:-188, label:'the Sunken Undercroft', kind:'cave', unlock:'q02',
    intro:'A stair drops beneath the parish into a flooded receipts-tunnel.',
    level:PLAT_LEVEL }
];
/* ---- Area 2 — The Shroud Vaults ---------------------------------------- */
const AREA2_TOWN={id:'a2-vault-anteroom',name:'Vault Anteroom / Forklight Hearthlight',
  hearthlight:{id:'forklight',free:true,safe:true},
  npcs:[
    {id:'keeper-ancestry',name:'Keeper of Ancestry',role:'Explains inherited debt-chain and confirms authorship at the Ledger-Bound fracture.'},
    {id:'custodian-archivist',name:'Custodian Archivist',role:"Warns the deep records rest but never stay rested."},
    {id:'librarian-shade',name:'Librarian Shade',role:'Advanced RUNE relic vendor and fork-lore witness.'},
    {id:'keeper-margins',name:'Keeper of Margins',role:'Optional re-inscription side quest; testimony weakens the Debt Foreman.'},
    {id:'vault-custodians',name:'Vault Custodians',role:'Gold cosmetics only.'}
  ],
  sideQuest:{id:'keeper-margins',interactionKey:'q06:margin-scroll',effect:'weaken-debt-foreman'}};
const AREA3_TOWN={id:'a3-chamber-attestation',name:'Chamber of Attestation / Celestial Spark Hearthlight',
  hearthlight:{id:'celestial-spark',free:true,safe:true},
  npcs:[
    {id:'hostile-archivist',name:'Archivist',role:'HOSTILE to non-compliance. Uses the Auditor to correct paradoxes. Insists Ending A is the only valid resolution. Warns B or C will unmake the record.'},
    {id:'prime-witness',name:'The Prime Witness',role:'Dying ancient; has seen every record since the first. Confirms the paradox. Her three questions mirror the three choices. Gates the ascending platformer.'},
    {id:'unrecorded-wanderer',name:'Unrecorded Wanderer',role:'Whispers that erasing your name is the only true freedom. Tempts toward Ending B. Looks like a ghost of what the player could become.'},
    {id:'amendment-echo',name:'The Amendment Echo',role:'Ghost of a player who chose Ending C. Co-authored the record with the Auditor. Shows what co-authorship looks like in practice. Tempts toward Ending C.'}
  ]};
/* Debt Mines: descent through a forked crystallized shaft, Canon left / Schism right, forced crossing bridge at mid-depth. */
const PLAT_DEBT_MINES={id:'a2-debt-mines',name:'Debt Mines & Ledger Cistern',width:1300,height:760,spawn:{x:100,y:90},physics:{maxRun:200,jump:458},
  fork:{splitX:650,
    canon:{label:'CANON',region:{x:0,y:0,w:520,h:540},effect:{speedMul:0.92},identityRunes:['R','E','C','O','R','D','E','D'],desc:'stable amber platforms, slower but predictable'},
    schism:{label:'SCHISM',region:{x:840,y:0,w:460,h:540},effect:{speedMul:1.08,damagePerSecond:2,damageEvery:0.75},identityRunes:['D','E','D','R','O','C','E','R'],desc:'faster mirror path with toxic debt-pressure'},
    crossing:{region:{x:340,y:470,w:620,h:44},requiresBothSpellings:true,solution:'RECORDED|DEDROCER'}},
  platforms:[{id:'entrance',x:0,y:120,w:280,h:14,type:'solid'},{id:'c1',x:0,y:200,w:210,h:12,type:'solid'},{id:'c2',x:60,y:290,w:180,h:12,type:'solid'},{id:'c3',x:0,y:370,w:200,h:12,type:'solid'},{id:'c4',x:80,y:450,w:160,h:12,type:'solid'},{id:'pendulum',x:140,y:330,w:110,h:12,type:'solid',vx:48,minX:80,maxX:330},{id:'cross',x:340,y:490,w:620,h:14,type:'solid'},{id:'s1',x:1080,y:200,w:220,h:10,type:'oneWay'},{id:'s2',x:1000,y:290,w:190,h:10,type:'oneWay'},{id:'s3',x:1100,y:370,w:200,h:10,type:'oneWay'},{id:'s4',x:1020,y:450,w:170,h:10,type:'oneWay'},{id:'boss-floor',x:380,y:700,w:740,h:60,type:'solid'},{id:'boss-wall-l',x:380,y:560,w:50,h:140,type:'solid'},{id:'boss-wall-r',x:1070,y:560,w:50,h:140,type:'solid'},{id:'boss-step-l',x:440,y:640,w:120,h:14,type:'solid'},{id:'boss-step-r',x:940,y:640,w:120,h:14,type:'solid'}],
  hazards:[{id:'shard-a',type:'damage',x:90,y:285,w:30,h:12,damage:2},{id:'shard-b',type:'damage',x:180,y:365,w:30,h:12,damage:2},{id:'crystal-a',type:'projectile',x:110,y:80,w:20,h:16,interval:1.6,speedY:265,damage:3},{id:'crystal-b',type:'projectile',x:230,y:80,w:20,h:16,interval:2.2,speedY:258,damage:3},{id:'pendulum-blow',type:'knockback',x:180,y:285,w:80,h:36,damage:2,knockX:240,knockY:-200},{id:'echo-stun',type:'stun',x:80,y:356,w:36,h:14,stun:0.55},{id:'gas-a',type:'slow',x:1000,y:282,w:190,h:22,slow:0.34},{id:'gas-b',type:'slow',x:1020,y:442,w:170,h:22,slow:0.31},{id:'vent-a',type:'damage',x:1080,y:194,w:28,h:14,damage:3},{id:'vent-b',type:'damage',x:1100,y:362,w:28,h:14,damage:3},{id:'current',type:'slow',x:400,y:476,w:500,h:14,slow:0.40},{id:'crystal-s',type:'projectile',x:1140,y:80,w:20,h:16,interval:1.3,speedY:275,damage:3},{id:'gas-cross',type:'slow',x:540,y:474,w:260,h:14,slow:0.38}],
  enemies:[
    {id:'canon-acolyte-1',type:'skeleton',sprite:'pf-skeleton',x:100,y:195,w:24,h:40,hp:40,damage:3,speed:30,patrolMin:0,patrolMax:200,frameCount:6,scale:.9},
    {id:'canon-acolyte-2',type:'skeleton',sprite:'pf-skeleton',x:60,y:365,w:24,h:40,hp:40,damage:3,speed:30,patrolMin:0,patrolMax:180,frameCount:6,scale:.9},
    {id:'schism-specter-1',type:'flying-eye',sprite:'pf-flying-eye',x:1140,y:195,w:26,h:30,hp:28,damage:3,speed:55,patrolMin:1080,patrolMax:1280,frameCount:6,scale:.8,flying:true,baseY:195},
    {id:'schism-specter-2',type:'flying-eye',sprite:'pf-flying-eye',x:1100,y:365,w:26,h:30,hp:28,damage:3,speed:55,patrolMin:1040,patrolMax:1260,frameCount:6,scale:.8,flying:true,baseY:365},
    {id:'debt-ghost',type:'goblin',sprite:'pf-goblin',x:620,y:485,w:24,h:38,hp:36,damage:2,speed:44,patrolMin:400,patrolMax:850,frameCount:12,scale:.88},
    {id:'ledger-eye',type:'flying-eye',sprite:'pf-flying-eye',x:700,y:610,w:28,h:32,hp:44,damage:4,speed:12,patrolMin:650,patrolMax:760,frameCount:6,scale:.9,flying:true,baseY:610},
    {id:'debt-warden',type:'skeleton',sprite:'pf-skeleton',x:720,y:695,w:26,h:44,hp:72,damage:5,speed:36,patrolMin:440,patrolMax:1060,frameCount:6,scale:1.05}
  ],
  bossTrigger:{id:'debt-foreman',x:660,y:620,w:180,h:80,lock:{x:400,y:530,w:700,h:240}},exit:{id:'to-ledger-vaults',x:0,y:640,w:40,h:80}};
/* Ledger Vaults: underground split-zone arena, Canon left (amber) / Schism right (green). */
const BATTLE_LEDGER_VAULTS={id:'a2-ledger-vaults',name:"Ledger Vaults / Well's Mouth",width:1600,height:900,spawn:{x:200,y:400},physics:{speed:175},
  fork:{canonZone:'canon-sanctuary',schismZone:'schism-chasm',centerZone:'well-mouth',
    canon:{enemy:'canon-auditor',style:'armored methodical pressure',regen:12},
    schism:{enemy:'schism-shadow',style:'fast phasing pressure',regen:5}},
  creatures:{'hollow-ancestor':{hp:18,speed:80,damage:3,reach:14,radius:8,color:'#8cb8e0'},'canon-auditor':{hp:52,speed:28,damage:7,reach:24,radius:13,color:'#d4a83e'},'schism-shadow':{hp:14,speed:115,damage:4,reach:14,radius:7,color:'#4ecb7a'},default:{hp:20,speed:50,damage:3,reach:14,radius:9,color:'#7c9cbc'}},
  zones:[{id:'canon-sanctuary',x:80,y:150,w:500,h:320,regen:12,clearFor:16},{id:'schism-chasm',x:1020,y:150,w:500,h:320,regen:5,clearFor:14},{id:'well-mouth',x:600,y:500,w:400,h:280,regen:8,clearFor:12}],
  waves:[{id:'canon-first',at:0.5,zoneId:'canon-sanctuary',spawns:[{type:'canon-auditor',x:250,y:250,count:2},{type:'hollow-ancestor',x:420,y:360,count:3}]},{id:'schism-rush',at:5.5,zoneId:'schism-chasm',spawns:[{type:'schism-shadow',x:1150,y:260,count:4},{type:'hollow-ancestor',x:1280,y:380,count:3}]},{id:'well-surge',at:12.0,zoneId:'well-mouth',spawns:[{type:'canon-auditor',x:720,y:560,count:2},{type:'schism-shadow',x:880,y:620,count:3},{type:'hollow-ancestor',x:650,y:680,count:4}]}]};
/* Area 2 fork bosses use the turn-based engine's additive dual-chain model:
   opponent{} stays for sprite/attack/defense back-compat; dualChain.a/b are the real bars
   (BOTH must reach 0). crossHeal:true => striking one half mends the other unless Strike Both. */
const TURN_FOREMAN={id:'duel-foreman',name:'The Debt Foreman',opponent:{name:'The Debt Foreman',hp:140,attack:16,defense:3,color:'#4ecbaa',sprite:'foreman'},
  dualChain:{a:{hp:70,label:'CANON',color:'#d4a83e'},b:{hp:70,label:'SCHISM',color:'#4ecb7a'},crossHeal:false}};
const TURN_BIFURCATED={id:'duel-bifurcated',name:'Bifurcated Guard',opponent:{name:'Bifurcated Guard',hp:120,attack:14,defense:4,color:'#d4a83e',sprite:'bifurcated'},
  dualChain:{a:{hp:60,label:'LEFT',color:'#d4a83e'},b:{hp:60,label:'RIGHT',color:'#4ecb7a'},crossHeal:true}};
/* Ledger-Bound (FINAL): single-HP Phase 1, then opponent.phase2 splits it into a dual-pool
   re-merging arena at 40% HP (mergePerTurn regen unless Strike Both). Mints 'The Contested Will'. */
const TURN_LEDGERBOUND={id:'duel-ledgerbound',name:'The Ledger-Bound',finalStroke:{requiresCenter:true,centerLabel:'FISSURE-CENTER',sigilKey:'contested-will'},opponent:{name:'The Ledger-Bound',hp:220,attack:20,defense:5,color:'#a8c8ff',sprite:'ledgerbound',
  phase2:{threshold:0.4,aHp:60,bHp:60,aLabel:'CANON',bLabel:'SCHISM',aColor:'#d4a83e',bColor:'#4ecb7a',mergePerTurn:5,finalStroke:'center'}}};
const AREA2_ENCOUNTERS={
  foreman:{id:'debt-foreman',name:'The Debt Foreman',beat:0.8,segments:[
    {mode:'platformer',name:'Descent into the Debt Mines',payload:PLAT_DEBT_MINES,beatText:'The shaft swallows names.',complete:{event:'boss'}},
    {mode:'turnbased',name:'The Foreman rises',payload:TURN_FOREMAN,beatText:'Its ledger-stamp cracks the stone.',complete:{event:'duel'}}
  ]},
  bifurcated:{id:'bifurcated-guard',name:'Bifurcated Guard',beat:0.8,segments:[
    {mode:'battlefield',name:'The Ledger Vaults',payload:BATTLE_LEDGER_VAULTS,beatText:'Two chains converge.',complete:{event:'cleared'}},
    {mode:'turnbased',name:'The Guard divides',payload:TURN_BIFURCATED,beatText:'Amber and green pull each way.',complete:{event:'duel'}}
  ]},
  ledgerbound:{id:'ledger-bound',name:'The Ledger-Bound',beat:0.9,segments:[
    {mode:'platformer',name:'The Forked Archive',payload:PLAT_DEBT_MINES,beatText:'The fissure opens beneath your feet.',complete:{event:'boss'}},
    {mode:'battlefield',name:'The Named Paladins',payload:BATTLE_LEDGER_VAULTS,beatText:'The dead inherit your record.',complete:{event:'cleared'}},
    {mode:'turnbased',name:'The Ledger-Bound',payload:TURN_LEDGERBOUND,beatText:'Stone names press down.',complete:{event:'duel'}}
  ]}
};
/* ---- Area 3 — The Archive of Attestation --------------------------------- */
/* Ascent of Testimony: vertical climb that contradicts itself; second half is floaty-gravity (high jump, slow fall) to simulate the "inverted" upper section. */
const PLAT_ASCENT_TESTIMONY={id:'a3-ascent-testimony',name:'Ascent of Testimony',width:960,height:880,spawn:{x:100,y:800},physics:{maxRun:210,jump:520},
  platforms:[{id:'ground',x:0,y:840,w:960,h:40,type:'solid'},{id:'t1-a',x:60,y:760,w:180,h:12,type:'solid'},{id:'t1-b',x:380,y:730,w:160,h:12,type:'oneWay'},{id:'t1-c',x:700,y:750,w:200,h:12,type:'solid'},{id:'t2-a',x:140,y:660,w:160,h:12,type:'oneWay'},{id:'t2-b',x:560,y:640,w:180,h:12,type:'solid'},{id:'t2-c',x:800,y:660,w:140,h:12,type:'oneWay'},{id:'t3-a',x:60,y:560,w:200,h:12,type:'solid'},{id:'t3-b',x:440,y:540,w:160,h:12,type:'oneWay'},{id:'t3-c',x:720,y:555,w:180,h:12,type:'solid'},{id:'invert-marker',x:280,y:480,w:400,h:8,type:'solid'},{id:'u1-a',x:100,y:400,w:160,h:10,type:'oneWay'},{id:'u1-b',x:480,y:380,w:200,h:10,type:'oneWay'},{id:'u1-c',x:760,y:400,w:160,h:10,type:'solid'},{id:'u2-a',x:60,y:300,w:200,h:10,type:'oneWay'},{id:'u2-b',x:360,y:280,w:160,h:10,type:'solid'},{id:'u2-c',x:680,y:300,w:220,h:10,type:'oneWay'},{id:'u3-a',x:140,y:200,w:200,h:10,type:'solid'},{id:'u3-b',x:500,y:180,w:200,h:10,type:'solid'},{id:'u3-c',x:820,y:200,w:100,h:10,type:'oneWay'},{id:'boss-shelf',x:360,y:100,w:340,h:14,type:'solid'}],
  hazards:[{id:'page-fall-a',type:'projectile',x:200,y:840,w:20,h:16,interval:1.4,speedY:-280,damage:2},{id:'page-fall-b',type:'projectile',x:600,y:840,w:20,h:16,interval:1.8,speedY:-275,damage:2},{id:'ink-static-a',type:'stun',x:400,y:465,w:160,h:16,stun:0.6},{id:'ink-static-b',type:'stun',x:700,y:545,w:120,h:12,stun:0.5},{id:'paradox-echo',type:'damage',x:480,y:370,w:40,h:14,damage:3},{id:'redact-zone',type:'slow',x:280,y:250,w:400,h:30,slow:0.28},{id:'compliance-drag',type:'slow',x:0,y:800,w:960,h:40,slow:0.50},{id:'decree-blow-a',type:'knockback',x:620,y:180,w:50,h:20,damage:2,knockX:-280,knockY:180},{id:'decree-blow-b',type:'knockback',x:100,y:280,w:50,h:20,damage:2,knockX:280,knockY:180}],
  bossTrigger:{id:'scrivener',x:440,y:54,w:180,h:46,lock:{x:300,y:0,w:440,h:200}},exit:{id:'to-seized-yard',x:900,y:760,w:40,h:80}};
/* Seized Asset Yard: three overlapping ledger-zones, Contradiction Hollows + Relic Shades. */
const BATTLE_SEIZED_YARD={id:'a3-seized-yard',name:'Seized Asset Yard / Contradiction Field',width:1400,height:900,spawn:{x:200,y:380},physics:{speed:168},
  creatures:{'hollow-ancestor':{hp:24,speed:72,damage:3,reach:14,radius:9,color:'#d0c0ff'},'audit-wolf':{hp:16,speed:130,damage:4,reach:12,radius:7,color:'#ff80c0'},'relic-shade':{hp:44,speed:32,damage:8,reach:22,radius:12,color:'#e8c880'},default:{hp:20,speed:55,damage:3,reach:14,radius:9,color:'#c0d0e8'}},
  zones:[{id:'recorded-zone',x:80,y:140,w:380,h:300,regen:10,clearFor:14},{id:'unrecorded-zone',x:960,y:140,w:360,h:300,regen:6,clearFor:12},{id:'void-zone',x:540,y:480,w:320,h:300,regen:4,clearFor:16}],
  waves:[{id:'contradiction-first',at:0.4,zoneId:'recorded-zone',spawns:[{type:'hollow-ancestor',x:200,y:240,count:4},{type:'audit-wolf',x:380,y:320,count:2}]},{id:'relic-shades',at:6.0,zoneId:'unrecorded-zone',spawns:[{type:'relic-shade',x:1060,y:240,count:2},{type:'hollow-ancestor',x:1200,y:340,count:3}]},{id:'void-surge',at:13.0,zoneId:'void-zone',spawns:[{type:'audit-wolf',x:620,y:580,count:4},{type:'hollow-ancestor',x:720,y:660,count:4},{type:'relic-shade',x:840,y:580,count:1}]}]};
const TURN_SCRIVENER={id:'duel-scrivener',name:'The Scrivener',opponent:{name:'The Scrivener',hp:100,attack:14,defense:2,color:'#1a1a2e',sprite:'scrivener'}};
const TURN_CASCADE={id:'duel-cascade',name:'Cascade Anchor',opponent:{name:'Cascade Anchor',hp:130,attack:11,defense:6,color:'#e8f0ff',sprite:'cascade'}};
const TURN_AUDITOR={id:'duel-auditor',name:'The Auditor',opponent:{name:'The Auditor',hp:280,attack:8,defense:8,color:'#f0f0e8',sprite:'auditor'}};
const AREA3_ENCOUNTERS={
  scrivener:{id:'scrivener',name:'The Scrivener',beat:0.8,segments:[
    {mode:'platformer',name:'Ascent of Testimony',payload:PLAT_ASCENT_TESTIMONY,beatText:'The ledger eats itself.',complete:{event:'boss'}},
    {mode:'turnbased',name:'The Scrivener rewrites the room',payload:TURN_SCRIVENER,beatText:'Every platform vanishes.',complete:{event:'duel'}}
  ]},
  cascade:{id:'cascade-anchor',name:'Cascade Anchor',beat:0.8,segments:[
    {mode:'battlefield',name:'The Seized Asset Yard',payload:BATTLE_SEIZED_YARD,beatText:'Your relics walk as husks.',complete:{event:'cleared'}},
    {mode:'turnbased',name:'Contest three decrees',payload:TURN_CASCADE,beatText:'You cannot damage it — contest its logic.',complete:{event:'duel'}}
  ]},
  // The Auditor cannot be fought: the ascent + rift lead to the choice, which the host presents
  // on encounter completion (openAuditorChoice). No turn-based duel — the climax is co-authorship.
  auditor:{id:'the-auditor',name:'The Auditor',beat:0.9,segments:[
    {mode:'platformer',name:'The Testimony Ascent',payload:PLAT_ASCENT_TESTIMONY,beatText:'Paradox waves invert your controls.',complete:{event:'boss'}},
    {mode:'battlefield',name:'The Temporal Rift',payload:BATTLE_SEIZED_YARD,beatText:'Past versions of every enemy spawn. Beyond them, the Auditor waits to be answered.',complete:{event:'cleared'}}
  ]}
};
/* ---- NPCs — branching dialogue (issue #22, lore/dialogue lane) ----------- */
/* DIALOGUE DATA FORMAT (reusable for Area 2/3 NPCs — the index.html Dialogue UI consumes this):
   npc.dialogue = { start:'nodeId', repeat:'nodeId'(optional), nodes:{ id:node, ... } }
     start  — entry node the first time you talk to this NPC.
     repeat — entry node on every subsequent talk (defaults to start when omitted).
   node = {
     speaker: 'Name'        // optional per-node speaker override (defaults to npc.name)
     text: ['line', ...]    // lines shown one at a time; advance with E / Space
     choices: [             // optional; shown after the last line. Arrow keys pick, E confirms.
       { label:'...', goto:'nodeId' }
     ]
     goto: 'nodeId'         // optional; auto-jump to another node after the last line (no choices)
     end: true              // optional; closes the conversation after the last line
   }
   A node with neither choices, goto, nor end simply closes when its last line is dismissed. */
const NPCS=[
  {id:'recorder-chaplain', x:-72, y:-26, color:'#f1c75b', sprite:'knight', name:'Chaplain Verity', role:'Hearthlight Recorder',
    dialogue:{ start:'intro', repeat:'again', nodes:{
      intro:{ text:[
        'Welcome, Recorded. The Hearthlight has your name already — it wrote you the moment you woke.',
        'I keep the registry well. Here your RUNE is confirmed, your relics forged, your stats raised. Rest is free; the dead do not cross this plaza.'],
        choices:[
          {label:'What is this place?', goto:'place'},
          {label:'How do I grow stronger?', goto:'power'},
          {label:'I should go.', goto:'farewell'} ] },
      place:{ text:[
        'A tax-house, once. The Chainwell turns beneath these stones — the ledger of every soul that ever owed.',
        'We turned it into sanctuary. Better the well keep us warm than swallow us cold.'],
        goto:'intro' },
      power:{ text:[
        'Bring RUNE to the Hearthlight and I will record the spend as levels. That ledger is the only one that grants power.',
        'Gold buys nothing but vestment and dye. No coin hurries a soul up the registry — only the grind, only the proof.'],
        goto:'intro' },
      farewell:{ text:['Go correctly filed, Recorded. The bells will mark your confirmations.'], end:true },
      again:{ text:['Back at the warm ledger? Rest, forge, or raise your record — I will witness all three.'],
        choices:[
          {label:'Tell me of Mother Tallow.', goto:'tallow'},
          {label:'Just resting.', goto:'farewell'} ] },
      tallow:{ text:[
        'She was the First Recorded — our original keeper. She melted into wax to bind names when the debts outgrew paper.',
        'When you face her, do not hate her. She bound herself so debtors might still find a path to confirmation. I will be there when she falls.'],
        goto:'again' } }} },
  {id:'scribe-archivist', x:96, y:18, color:'#9b74ff', sprite:'sorcerer', name:'Archivist Quill', role:'Relic Scribe',
    dialogue:{ start:'intro', repeat:'again', nodes:{
      intro:{ text:[
        'Mind the dust — every speck is a name nobody paid to keep clean.',
        'I trade in relics. RUNE forged into edge and ward. Real power, honestly earned — none of that cosmetic glitter the Acolyte peddles.'],
        choices:[
          {label:'Show me what relics do.', goto:'relics'},
          {label:'Who was here before us?', goto:'legacy'},
          {label:'Maybe later.', goto:'farewell'} ] },
      relics:{ text:[
        'Forge at the Hearthlight; I only catalogue. An Ember Edge bites harder, a Warden Sigil keeps you breathing.',
        'A blessed relic strikes Mother Tallow truer — the wax remembers the hands that recorded it.'],
        goto:'intro' },
      legacy:{ text:[
        'Tallow kept these ledgers before the melting. Her hand is in every old margin — inheritances, compounded down the bloodlines.',
        'What you owe, you did not always borrow. Some debts are willed to you. Remember that when you descend north.'],
        goto:'intro' },
      farewell:{ text:['The archive keeps. So do I.'], end:true },
      again:{ text:['Back among the shelves? The relic ledger has not changed since you last read it — but the dust has.'],
        choices:[
          {label:'Refresh me on relics.', goto:'relics'},
          {label:'Nothing today.', goto:'farewell'} ] } }} },
  {id:'debt-confessional', x:188, y:54, color:'#7c3936', sprite:'hollow', name:'The Confessional', role:'Debt Booth',
    dialogue:{ start:'intro', repeat:'intro', nodes:{
      intro:{ text:[
        'Kneel, debtor. State the sum you cannot pay.',
        'This is where it begins — a debt confessed, a debt recorded, a debt that will not be forgiven. Watch the booth and learn how a Hollow is made.'],
        choices:[
          {label:'How does a soul go Hollow?', goto:'process'},
          {label:'Where do the unpaid go?', goto:'north'},
          {label:'Leave the booth.', goto:'farewell'} ] },
      process:{ text:[
        'First the debt compounds. Then the name greys. Then the body forgets it was ever owed-to, and only remembers it owes.',
        'A Hollow is not punished. It is simply processed — filed, like all of us, into the shape the ledger needs.'],
        goto:'intro' },
      north:{ text:[
        'North. Always north, and always down — to the Shroud Vaults, where the unpaid are kept against their heirs.',
        'You will go there too, in time. The booth has already written it.'],
        goto:'intro' },
      farewell:{ text:['The booth keeps your confession. It keeps everything.'], end:true } }} },
  {id:'chapel-acolyte', x:-36, y:42, color:'#7aa7ff', sprite:'knight', name:'Acolyte Plume', role:'Vestment Keeper',
    dialogue:{ start:'intro', repeat:'again', nodes:{
      intro:{ text:[
        'Oh — a visitor with COLOUR potential! Stand still, let me imagine you in azure.',
        'I keep the vestments and dyes. Gold only, and Gold buys looks alone — never an ounce of strength. The Archivist will tell you the same, grumpily.'],
        choices:[
          {label:'Gold gets me no power?', goto:'nopower'},
          {label:'Show me vestments.', goto:'cosmetics'},
          {label:'Not my style.', goto:'farewell'} ] },
      nopower:{ text:[
        'None whatsoever. That is the whole point, darling — a Gilded Champion and a tarnished Recorded swing the very same blade.',
        'You buy Gold with real settlement, you wear it, you turn heads at the Hearthlight. Power you must earn in RUNE, like everyone.'],
        goto:'intro' },
      cosmetics:{ text:[
        'Press B at any time to open the wardrobe. Crimson, Verdant, Voidwalker — all yours, for Gold.',
        'A soul filed correctly may as well be filed beautifully.'],
        goto:'intro' },
      farewell:{ text:['Come back when you crave a little colour.'], end:true },
      again:{ text:['Reconsidered the azure? The wardrobe is one tap of B away.'],
        choices:[
          {label:'Remind me — Gold and power?', goto:'nopower'},
          {label:'Still no.', goto:'farewell'} ] } }} },
  {id:'sexton-marrow-elder', x:228, y:-104, color:'#8d9386', sprite:'knight', name:'Sexton Greave', role:'Grave-Tender',
    dialogue:{ start:'intro', repeat:'again', nodes:{
      intro:{ text:[
        'Quiet round the stones, if you would. The Paid rest easy here — and the Unpaid only pretend to.',
        'Two kinds of grave in Gracefall. One marked with a settled flame, one left dark. I tend both, though only one tends back.'],
        choices:[
          {label:'Paid and Unpaid?', goto:'graves'},
          {label:'Why the candles?', goto:'candles'},
          {label:'Rest in peace.', goto:'farewell'} ] },
      graves:{ text:[
        'A Paid grave means the debt closed before the breath did. Those sleep. Those stay sleeping.',
        'An Unpaid grave is just a Hollow that has not stood up yet. Step lightly. Some of them are listening for their names.'],
        goto:'intro' },
      candles:{ text:[
        'A lit candle is a settled account — a flame the ledger accepts in place of the soul.',
        'When you see them gutter out east, in the Tallow House — do not relight them. Those names are screaming to stay lit.'],
        goto:'intro' },
      farewell:{ text:['Mind the dark stones on your way out.'], end:true },
      again:{ text:['Still walking among my stones? The Paid have not stirred. The Unpaid... we do not discuss.'],
        choices:[
          {label:'Tell me of the graves again.', goto:'graves'},
          {label:'I will go.', goto:'farewell'} ] } }} },
  {id:'sexton-junior', x:328, y:-122, color:'#cfa982', sprite:'hollow', name:'Tender Bram', role:'Grave-Digger',
    dialogue:{ start:'intro', repeat:'intro', nodes:{
      intro:{ text:[
        'Dug three new plots this morning. All Unpaid. They always are, lately.',
        'Old Greave says not to name them while I dig. I forget sometimes. Then they move.'],
        choices:[
          {label:'They move?', goto:'move'},
          {label:'Stay safe, digger.', goto:'farewell'} ] },
      move:{ text:[
        'Just the dirt settling. That is what Greave says. The dirt settling, upward, in the shape of a hand.',
        'I dig the holes. The ledger fills them. I try not to think about which order it does that in.'],
        goto:'intro' },
      farewell:{ text:['Back to the spade. Always more plots.'], end:true } }} },
  {id:'keeper-ancestry', x:1068, y:-54, color:'#d4a83e', sprite:'knight', name:'Keeper of Ancestry', role:'Guardian of the ancestral ledger',
    dialogue:{ start:'intro', repeat:'again', nodes:{
      intro:{ text:[
        'You have arrived at the place your bloodline promised you would reach. Do not look so wounded; you did not choose the debt.',
        'Your ancestors accrued it, amended it, and willed it forward until your name answered. The Vault Anteroom offers the Forklight, safe rest, and what guidance an old keeper can still give.'],
        choices:[
          {label:'My ancestry owed this?', goto:'ancestry'},
          {label:'What waits in the vaults?', goto:'bosses'},
          {label:'I will return.', goto:'farewell'} ] },
      ancestry:{ text:[
        'Your debt pre-dates your first breath. Your name appears in the ledger before you were born, written as heir, witness, and collateral.',
        'That is the cruelty of inheritance: the hand that signs may be ash, but the ink continues through the living.'],
        goto:'intro' },
      bosses:{ text:[
        'The Foreman will stamp authority into the mines, and the Bifurcated Guard will mend one half with the other.',
        'But remember the Ledger-Bound. A golem of every ancestor who ever wrote your name into a debt-chain. It has many of their faces.'],
        goto:'intro' },
      farewell:{ text:['Go with care, heir of old accounts. May the Forklight mark you kindly.'], end:true },
      again:{ text:['You return with more of the old chain broken. Good. Then you are ready to hear what the final fracture means.'],
        choices:[
          {label:'What happens if I sever it?', goto:'sealing'},
          {label:'Remind me of the Ledger-Bound.', goto:'bosses'},
          {label:'Not now.', goto:'farewell'} ] },
      sealing:{ text:[
        'Defeat the Ledger-Bound, and the ancestral inheritance chain can no longer carry your name.',
        'Your name becomes your own. No inheritance, no chain. What you owe after that will at least be yours to answer for.'],
        goto:'again' } }} },
  {id:'custodian-archivist', x:1132, y:28, color:'#9b74ff', sprite:'sorcerer', name:'Custodian Archivist', role:'Keeper of record-stones',
    dialogue:{ start:'intro', repeat:'again', nodes:{
      intro:{ text:[
        'Speak softly. The deep records breathe when strangers enter, and breath is very near to appetite.',
        'Sometimes the names move inside the stones. Sometimes they move toward the surface. Both are considered normal, in the old manuals.'],
        choices:[
          {label:'The records move?', goto:'records'},
          {label:'Tell me of the Ledger-Bound.', goto:'ledgerbound'},
          {label:'I will be quiet.', goto:'farewell'} ] },
      records:{ text:[
        'Some records have been in the vault so long they have developed... opinions.',
        'They prefer descendants who do not argue. They prefer names that lie still. They prefer many things they are not entitled to keep.'],
        goto:'intro' },
      ledgerbound:{ text:[
        'The Ledger-Bound is not one creature. It is a consensus.',
        'Every ancestor who agreed to pass debt down speaks through it. To defeat it, you must disagree with all of them simultaneously.'],
        goto:'intro' },
      farewell:{ text:['Go before the stones learn your footstep pattern.'], end:true },
      again:{ text:['Something has stirred since your last visit. It used your surname first, then corrected itself.'],
        choices:[
          {label:'What do the records want?', goto:'records'},
          {label:'Explain the consensus again.', goto:'ledgerbound'},
          {label:'Leave the stones.', goto:'farewell'} ] } }} },
  {id:'librarian-shade', x:1184, y:-38, color:'#4ecb7a', sprite:'sorcerer', name:'Librarian Shade', role:'Fork-lore scholar and relic vendor',
    dialogue:{ start:'intro', repeat:'again', nodes:{
      intro:{ text:[
        'Oh, marvelous timing. The CANON/SCHISM fork is the most interesting thing I have seen in four hundred years of archiving.',
        'CANON records debts as incurred: stable, honest, and slow. SCHISM records debts as contested: fast, risky, and rather rude to the body. Both arrive at the same vault, which is academically thrilling.'],
        choices:[
          {label:'Explain the fork.', goto:'fork'},
          {label:'Tell me about relics.', goto:'relics'},
          {label:'Another time.', goto:'farewell'} ] },
      fork:{ text:[
        'CANON is amber method: each debt acknowledged in the order it was made. The mine respects that pace, which is why it takes so long.',
        'SCHISM is green objection: each debt challenged as it appears. You may win time, but the argument cuts you either way.',
        'At the crossing bridge, the archive asks for both readings: RECORDED, then DEDROCER, the Schism mirror. Elegant, dangerous, very satisfying.'],
        goto:'intro' },
      relics:{ text:[
        'Area relics here are forged from crystallized debt-material, which sounds dreadful until you see the resonance under heat.',
        'The relics here carry the weight of inherited obligation - they hit harder because they have been owed a long time. Spend RUNE wisely.'],
        goto:'intro' },
      farewell:{ text:['May your footnotes be accurate and your bridge-spellings reversible.'], end:true },
      again:{ text:['New observation: the crossing bridge does not merely test spelling. It tests whether a record can survive being read backward. Deliciously severe.'],
        choices:[
          {label:'Refresh me on the bridge.', goto:'fork'},
          {label:'Refresh me on relics.', goto:'relics'},
          {label:'Close the book.', goto:'farewell'} ] } }} },
  {id:'keeper-margins', x:988, y:48, color:'#b9c2cf', sprite:'hollow', name:'Keeper of Margins', role:'Optional side quest giver',
    dialogue:{ start:'intro', repeat:'again', nodes:{
      intro:{ text:[
        'Good. You look like someone with more urgency than reverence.',
        'There is a margin scroll east of the Forklight edge. Find it, mark it, and the Debt Foreman enters his fight with less authority than he expected.'],
        choices:[
          {label:'How does the scroll work?', goto:'scroll'},
          {label:'What changes after I use it?', goto:'result'},
          {label:'I know where to go.', goto:'farewell'} ] },
      scroll:{ text:[
        'Every official record has a margin. Annotations are not the main text, but they affect how the record reads.',
        "The Debt Foreman's authority is encoded in a clear record. Write in the margin, cloud the authority. It will not erase him. It will... inconvenience him."],
        goto:'intro' },
      result:{ text:[
        'Once the scroll is found and used, the Foreman still fights. Bureaucracy rarely kills its own officers outright.',
        'But his stamp lands lighter, his claim carries less weight, and the mine hears hesitation where it used to hear command. Mechanically speaking: weakened boss.'],
        goto:'intro' },
      farewell:{ text:["East of the Forklight. It waits. So does the Foreman's margin."], end:true },
      again:{ text:[
        'If you have used the margin scroll, good. The Foreman will notice when his authority fails to arrive at full strength.',
        'If you have not, the scroll is still east of the Forklight edge. Systems only bend for people who touch the paper.'],
        choices:[
          {label:'Remind me how margins work.', goto:'scroll'},
          {label:'What will it do?', goto:'result'},
          {label:'I am going.', goto:'farewell'} ] } }} },
  {id:'vault-custodians', x:1156, y:72, color:'#c8b89a', sprite:'knight', name:'Vault Custodians', role:'Gold cosmetics vendor',
    dialogue:{ start:'intro', repeat:'again', nodes:{
      intro:{ text:[
        'Vault cosmetics desk. Appearances only.',
        'Gold buys vestments, dyes, and presentation. It does not buy power, favor, clearance, or mercy.'],
        choices:[
          {label:'Gold is only style?', goto:'gold'},
          {label:'Understood.', goto:'farewell'} ] },
      gold:{ text:[
        'Correct. RUNE is power. Gold is style.',
        'It is the only currency in this vault with no bearing on debt status. That is why people enjoy spending it.'],
        goto:'intro' },
      farewell:{ text:['Filed.'], end:true },
      again:{ text:['Same desk. Same terms. Gold for cosmetics only.'],
        choices:[
          {label:'Confirm the terms.', goto:'gold'},
          {label:'Done.', goto:'farewell'} ] } }} }
];

/* ---- Walk-in town interiors (top-down rooms) ----------------------------- */
/* Distinct from WORLD_PORTALS (those drop into platformer caves). An INTERIOR is a small
   top-down room you walk into through an overworld door, with its own local coordinate space
   (0,0 .. w,h), its own decor, and NPCs that reuse the same npc.dialogue format as NPCS above.
   index.html consumes this: BUILDINGS doors live in the town; pressing E at a door calls
   enterInterior(); the room renders via drawInterior(); the exit pad (or T) returns you outside.
   Fields:
     id,name                              — identity + peers-panel label
     building:{x,y,w,h,wall,roof,door:{x,y},sign,drawn?,secret?} — overworld footprint + entry point
                                            drawn:true => facade already drawn elsewhere (e.g. chapel)
                                            secret:true => rendered subtly; entering grants `reward`
     unlock                               — optional quest id gate (Story.questReached); omit = open
     reward                               — optional cosmetic skin id granted once on first entry
     w,h,spawn,exit                       — interior bounds, entry point, exit pad (local coords)
     floor,wall,accent                    — palette
     decor:[{x,y,w,h,c,top?,t?,label?}]   — rects; t:'rug' draws under actors, t:'candle' flickers
     npcs:[{id,x,y,color,sprite,name,role,dialogue}] — local-coord NPCs (same format as NPCS)        */
const INTERIORS=[
  { id:'chapel', name:'Chapel of the Hearthlight',
    building:{x:-92,y:-104,w:150,h:84,door:{x:-44,y:-40},sign:'CHAPEL',drawn:true},
    w:360, h:250, spawn:{x:180,y:188}, exit:{x:180,y:236}, floor:'#241f1b', wall:'#463a30', accent:'#8f2f2a',
    decor:[
      {x:60,y:40,w:240,h:150,c:'#2c2620',t:'rug'},
      {x:150,y:34,w:60,h:26,c:'#5c1d22',top:'#f1c75b'},   // altar
      {x:172,y:18,w:16,h:18,c:'#f1c75b',t:'candle'},      // altar flame
      {x:74,y:96,w:44,h:12,c:'#3b3128'},{x:74,y:128,w:44,h:12,c:'#3b3128'},   // pews L
      {x:242,y:96,w:44,h:12,c:'#3b3128'},{x:242,y:128,w:44,h:12,c:'#3b3128'}, // pews R
      {x:36,y:60,w:10,h:14,c:'#caa84a',t:'candle'},{x:314,y:60,w:10,h:14,c:'#caa84a',t:'candle'}
    ],
    npcs:[
      {id:'int-chaplain', x:180, y:64, color:'#f1c75b', sprite:'knight', name:'Chaplain Verity', role:'Hearthlight Recorder',
        dialogue:{ start:'intro', repeat:'again', nodes:{
          intro:{ text:[
            'Inside at last. The Hearthlight burns brighter where the walls keep the cold ledger out.',
            'This is sanctuary, Recorded. Rest is free here; no debt is read aloud beneath this roof.'],
            choices:[ {label:'Why a chapel for a tax-house?', goto:'why'}, {label:'Bless my record.', goto:'bless'}, {label:'I should go.', goto:'bye'} ] },
          why:{ text:['Because a number is easier to forgive when you kneel beside it.','We kept the architecture. We changed the verdict.'], goto:'again' },
          bless:{ text:['Then be witnessed: you woke owing, and you may yet leave owing nothing.','Carry that out the door. The plaza forgets it quickly.'], goto:'again' },
          bye:{ text:['Go warm, go recorded.'], end:true },
          again:{ text:['The flame holds. So does your name.'],
            choices:[ {label:'Tell me of the chapel.', goto:'why'}, {label:'Step back out.', goto:'bye'} ] } }} }
    ] },
  { id:'tavern', name:'The Settled Tankard',
    building:{x:172,y:-152,w:150,h:96,wall:'#5a4124',roof:'#7a3b22',door:{x:172,y:-108},sign:'TAVERN'},
    w:420, h:280, spawn:{x:210,y:216}, exit:{x:210,y:264}, floor:'#2b2218', wall:'#4a3722', accent:'#caa24a',
    decor:[
      {x:40,y:48,w:340,h:24,c:'#3a2c1c',top:'#6b4a26'},   // bar counter (back)
      {x:96,y:120,w:60,h:36,c:'#3a2c1c',top:'#5a4326'},{x:264,y:120,w:60,h:36,c:'#3a2c1c',top:'#5a4326'}, // tables
      {x:110,y:196,w:60,h:36,c:'#3a2c1c',top:'#5a4326'},
      {x:46,y:30,w:14,h:18,c:'#caa24a',t:'candle'},{x:360,y:30,w:14,h:18,c:'#caa24a',t:'candle'},
      {x:300,y:30,w:80,h:18,c:'#241a10',label:'KEGS'}
    ],
    npcs:[
      {id:'int-barkeep', x:210, y:84, color:'#caa24a', sprite:'knight', name:'Goodwife Sump', role:'Keeper of the Tankard',
        dialogue:{ start:'intro', repeat:'again', nodes:{
          intro:{ text:[
            'Mind the step and mind your tab — I record both.',
            'We pour settled accounts here. Drink is the one debt the Hearthlight lets you carry gladly.'],
            choices:[ {label:'Heard any rumors?', goto:'rumor'}, {label:'Who drinks here?', goto:'who'}, {label:'Just passing.', goto:'bye'} ] },
          rumor:{ text:[
            'Rumor? The Assayer two doors down has been crossing out names that were already paid.',
            'And someone bricked over the old cellar stair to the west. Folk who go looking for it do not always come back the same colour.'],
            goto:'again' },
          who:{ text:['Diggers, scribes, the odd pilgrim who confused this for the chapel.','And Sot in the corner. He owes me a story for every cup. Ask him.'], goto:'again' },
          bye:{ text:['Door is where you left it.'], end:true },
          again:{ text:['Back for another? The tap is honest.'],
            choices:[ {label:'Any fresh rumor?', goto:'rumor'}, {label:'Leave.', goto:'bye'} ] } }} },
      {id:'int-sot', x:328, y:198, color:'#9b6b46', sprite:'hollow', name:'Sot Halfpenny', role:'Regular',
        dialogue:{ start:'intro', repeat:'intro', nodes:{
          intro:{ text:[
            'You — you have the look of someone who reads margins.',
            'I had a name once. Sold it for the cellar key, west of the plaza. Then they sealed the door and kept my name inside.'],
            choices:[ {label:'A sealed cellar?', goto:'cellar'}, {label:'Your name?', goto:'name'}, {label:'Sober up.', goto:'bye'} ] },
          cellar:{ text:['West. Past the brambles where the grass forgets to grow.','The door only shows itself to someone already looking. Walk slow out there.'], goto:'intro' },
          name:{ text:['Gone into the dark with the wax. If you ever stand in that cellar — say it back to me.','Whatever it answers, do not believe all of it.'], goto:'intro' },
          bye:{ text:['...one more, Sump. On the pilgrim.'], end:true } }} }
    ] },
  { id:'vestry', name:'The Gilded Vestry',
    building:{x:-282,y:34,w:140,h:90,wall:'#3a3550',roof:'#5a4a7a',door:{x:-282,y:74},sign:'VESTRY'},
    w:360, h:250, spawn:{x:180,y:188}, exit:{x:180,y:236}, floor:'#221f2a', wall:'#3a3550', accent:'#9b74ff',
    decor:[
      {x:50,y:60,w:36,h:120,c:'#2c2740',top:'#6f5fa0'},{x:274,y:60,w:36,h:120,c:'#2c2740',top:'#6f5fa0'}, // wardrobes
      {x:140,y:150,w:80,h:40,c:'#2c2740',top:'#9b74ff'},  // dais
      {x:40,y:30,w:14,h:18,c:'#9b74ff',t:'candle'},{x:306,y:30,w:14,h:18,c:'#9b74ff',t:'candle'},
      {x:120,y:30,w:120,h:18,c:'#191527',label:'GOLD ONLY'}
    ],
    npcs:[
      {id:'int-vestry-keeper', x:180, y:104, color:'#9b74ff', sprite:'sorcerer', name:'Vestry-Keeper Lune', role:'Cosmetics Vendor',
        dialogue:{ start:'intro', repeat:'again', nodes:{
          intro:{ text:[
            'A new silhouette walks in! Stand on the dais — let me see you in something settled.',
            'Everything here is Gold, and Gold buys looks alone. Not one thread of it will swing your blade harder.'],
            choices:[ {label:'Gold gives no power?', goto:'nopower'}, {label:'Open the wardrobe.', goto:'shop'}, {label:'Later.', goto:'bye'} ] },
          nopower:{ text:['None. That is the law of the realm and the whole charm of it.','You earn strength in RUNE like everyone. Here you only earn admiration.'], goto:'again' },
          shop:{ text:['Press B anywhere to browse and equip. Crimson, Azure, Voidwalker — all settled coin, all yours to wear.'], goto:'again' },
          bye:{ text:['Come back when you crave a new outline.'], end:true },
          again:{ text:['Back to be re-dressed? B opens the wardrobe.'],
            choices:[ {label:'Remind me — Gold and power?', goto:'nopower'}, {label:'Step out.', goto:'bye'} ] } }} }
    ] },
  { id:'assayer', name:"The Assayer's Office", unlock:null,
    building:{x:322,y:72,w:130,h:88,wall:'#2f3a30',roof:'#3f5a3f',door:{x:322,y:110},sign:'ASSAYER'},
    w:360, h:240, spawn:{x:180,y:180}, exit:{x:180,y:228}, floor:'#1d231d', wall:'#2f3a30', accent:'#7fb37f',
    decor:[
      {x:50,y:44,w:260,h:22,c:'#26301f',top:'#4a5e3a'},   // long desk
      {x:60,y:90,w:50,h:90,c:'#222b1c',top:'#3a4a2e'},{x:250,y:90,w:50,h:90,c:'#222b1c',top:'#3a4a2e'}, // shelves
      {x:150,y:96,w:60,h:36,c:'#26301f',top:'#4a5e3a'},
      {x:40,y:28,w:14,h:16,c:'#9fd07a',t:'candle'}
    ],
    npcs:[
      {id:'int-assayer', x:180, y:78, color:'#7fb37f', sprite:'sorcerer', name:'Assayer Coin', role:'Verifier of Debts',
        dialogue:{ start:'intro', repeat:'again', nodes:{
          intro:{ text:[
            'Papers. You have none? Good — the honest rarely do.',
            'I verify debts. Lately the ledger hands me names already settled and asks me to open them again. I have stopped obeying.'],
            choices:[ {label:'Who orders the re-opening?', goto:'who'}, {label:'A task, then?', goto:'task'}, {label:'No business today.', goto:'bye'} ] },
          who:{ text:['The order comes up from the north, stamped in wax that is still warm.','Someone down in the Vaults is forging closure into debt. I would name them if I dared.'], goto:'again' },
          task:{ text:[
            'If you find a settled candle gone dark in this realm, do not relight it — bring me its name instead.',
            'A name carried out of the dark and spoken here is worth more than coin. It is worth a correction.'],
            goto:'again' },
          bye:{ text:['Mind the stamps on your way out.'], end:true },
          again:{ text:['Back at my desk? The forgeries have not stopped.'],
            choices:[ {label:'Who is forging closure?', goto:'who'}, {label:'Remind me of the task.', goto:'task'}, {label:'Leave.', goto:'bye'} ] } }} }
    ] },
  { id:'cellar', name:'The Sealed Cellar', reward:'cellar-warden',
    building:{x:-520,y:182,w:96,h:60,wall:'#23282c',roof:'#2b3338',door:{x:-520,y:152},sign:'',secret:true},
    w:320, h:230, spawn:{x:160,y:172}, exit:{x:160,y:220}, floor:'#16191c', wall:'#262d31', accent:'#6f93a8',
    decor:[
      {x:40,y:40,w:60,h:90,c:'#1c2226',top:'#39474e'},{x:220,y:40,w:60,h:90,c:'#1c2226',top:'#39474e'}, // racks
      {x:130,y:60,w:60,h:30,c:'#1a2024',top:'#4a606a'},  // a single sealed casket
      {x:150,y:40,w:12,h:16,c:'#6f93a8',t:'candle'}
    ],
    npcs:[
      {id:'int-cellar-shade', x:160, y:70, color:'#6f93a8', sprite:'hollow', name:'A Sealed Voice', role:'Unrecorded',
        dialogue:{ start:'intro', repeat:'again', nodes:{
          intro:{ text:[
            'You found the door. Almost no one does. They wall me up and the wall forgets why.',
            'I am the name Sot sold. Speak it back and I keep my shape a little longer.'],
            choices:[ {label:'Speak the name.', goto:'name'}, {label:'What is this place?', goto:'place'}, {label:'I cannot stay.', goto:'bye'} ] },
          name:{ text:['...you said it correctly. The first to, in a long dark.','Take the warden’s cloak from the rack. Wear it where the light is — let them wonder where you found it.'], goto:'again' },
          place:{ text:['The cellar beneath the cellar. Where the realm files what it would rather not have written.','Curiosity brought you. Curiosity is the only currency that ever reaches down here.'], goto:'again' },
          bye:{ text:['Climb back to the warm. Leave the door as you found it.'], end:true },
          again:{ text:['Still here, in the cold file? Good. The wall has not won yet.'],
            choices:[ {label:'Tell me of this place.', goto:'place'}, {label:'Climb out.', goto:'bye'} ] } }} }
    ] },
  { id:'vault-registry', name:'The Vault Registry',
    building:{x:1044,y:-96,w:130,h:90,wall:'#393b44',roof:'#2c2e36',door:{x:1080,y:-40},sign:'REGISTRY'},
    w:400, h:260, spawn:{x:200,y:198}, exit:{x:200,y:246}, floor:'#22232a', wall:'#333540', accent:'#d4a83e',
    decor:[
      {x:140,y:80,w:120,h:50,c:'#2c2e36',top:'#d4a83e'},
      {x:30,y:40,w:40,h:100,c:'#262830'},{x:330,y:40,w:40,h:100,c:'#262830'},
      {x:155,y:74,w:20,h:14,c:'#b9c2cf'},{x:210,y:74,w:20,h:14,c:'#d4a83e'},
      {x:140,y:60,w:10,h:14,c:'#d4a83e',t:'candle'},{x:250,y:60,w:10,h:14,c:'#d4a83e',t:'candle'}
    ],
    npcs:[
      {id:'int-keeper-ancestry', x:200, y:68, color:'#d4a83e', sprite:'knight', name:'Keeper of Ancestry', role:'Registry Guardian',
        dialogue:{ start:'intro', repeat:'again', nodes:{
          intro:{ text:[
            'In the Registry, I can read your inheritance directly. Your name was entered here before you were named.',
            'Your ancestors filed correctly. Their debt compounded correctly. That is the tragedy of correct record-keeping.'],
            choices:[ {label:'Who wrote me in?', goto:'wrote'}, {label:'Tell me about the chain.', goto:'chain'}, {label:'Farewell.', goto:'bye'} ] },
          wrote:{ text:['The first ancestor accepted the debt-chain with a clear hand and a colder heart. They did not only name themselves. They named everyone after.','Every descendant became collateral in the same sentence. You were written by someone who never met you and still spent you.'], goto:'again' },
          chain:{ text:['The Ledger-Bound holds the aggregate of that chain: every accepted debt, every inherited signature, every quiet consent passed forward.','Defeat it and you do not merely kill a guardian. You write yourself out of the inheritance.'], goto:'again' },
          sealing:{ text:['When the Ledger-Bound falls, this table will show one fewer name in the chain. I will be here to witness it.'], goto:'again' },
          bye:{ text:['Filed. Go earn your severance.'], end:true },
          again:{ text:['You return to the table where your name waits. It has not moved.'],
            choices:[ {label:'How will the sealing show?', goto:'sealing'}, {label:'Who wrote me in?', goto:'wrote'}, {label:'Leave the Registry.', goto:'bye'} ] } }} }
    ] },
  { id:'fissured-cistern', name:'The Fissured Cistern',
    building:{x:1104,y:32,w:150,h:100,wall:'#3a3c44',roof:'#2e3038',door:{x:1148,y:76},sign:'CISTERN'},
    w:460, h:300, spawn:{x:230,y:238}, exit:{x:230,y:286}, floor:'#22232a', wall:'#2e3038', accent:'#7a8a98',
    decor:[
      {x:0,y:100,w:230,h:100,c:'#3a2a10',t:'rug'},{x:230,y:100,w:230,h:100,c:'#0a2a18',t:'rug'},
      {x:224,y:80,w:12,h:160,c:'#404550'},
      {x:60,y:80,w:14,h:18,c:'#d4a83e',t:'candle'},{x:40,y:120,w:30,h:50,c:'#2a2010'},{x:80,y:140,w:30,h:40,c:'#2e2418'},
      {x:380,y:80,w:14,h:18,c:'#4ecb7a',t:'candle'},{x:350,y:110,w:36,h:55,c:'#0a2a1a'},{x:390,y:135,w:28,h:40,c:'#122418'},
      {x:100,y:160,w:20,h:14,c:'#262830'},{x:130,y:160,w:20,h:14,c:'#262830'},{x:310,y:160,w:20,h:14,c:'#0a2218'},{x:340,y:160,w:20,h:14,c:'#0a2218'}
    ],
    npcs:[
      {id:'int-canon-drinker', x:110, y:130, color:'#d4a83e', sprite:'knight', name:'A Canon Drinker', role:'Settled Patron',
        dialogue:{ start:'intro', repeat:'again', nodes:{
          intro:{ text:[
            'The left side is slower. The left side pays its debts in full, on schedule, without complaint.',
            'I have been here six generations. My family chose Canon at the fork. None of us have ever been in Schism. None of us are free.'],
            choices:[ {label:'Why slow?', goto:'slow'}, {label:'Canon and Schism?', goto:'canon-schism'}, {label:'Farewell.', goto:'bye'} ] },
          slow:{ text:['CANON is not punishment. It is accounting. The debt exists. CANON simply... records it correctly.'], goto:'again' },
          'canon-schism':{ text:['They cross to our side sometimes, the Schism-walkers. They always look a little burned. But faster. I do not understand the appeal.'], goto:'again' },
          crossing:{ text:['The bridge at the bottom requires both spellings. RECORDED from our side. DEDROCER from theirs. Think about that.'], goto:'again' },
          bye:{ text:['Sit here long enough and the debt almost feels earned.'], end:true },
          again:{ text:['The cup is exactly where I left it. So is the debt.'],
            choices:[ {label:'Tell me about crossing.', goto:'crossing'}, {label:'Canon and Schism?', goto:'canon-schism'}, {label:'Leave this side.', goto:'bye'} ] } }} },
      {id:'int-schism-drinker', x:360, y:130, color:'#4ecb7a', sprite:'sorcerer', name:'A Schism Drinker', role:'Contested Patron',
        dialogue:{ start:'intro', repeat:'again', nodes:{
          intro:{ text:[
            'The right side costs two damage every three-quarters of a second. I have been here six generations.',
            'My family contested the debt at the fork. We have been contesting it ever since. We are faster. We bleed, and we are faster.'],
            choices:[ {label:'Why fast?', goto:'fast'}, {label:'Contested?', goto:'contest'}, {label:'Farewell.', goto:'bye'} ] },
          fast:{ text:['SCHISM does not erase the debt. It argues it is unjust. The vaults do not care about justice. But the speed is real.'], goto:'again' },
          contest:{ text:['We are not broken. We are contested. There is a difference. A broken record cannot be argued. A contested one can.'], goto:'again' },
          crossing:{ text:['Walk both sides before the crossing. The bridge only opens when you have been both RECORDED and DEDROCER. You cannot fake it.'], goto:'again' },
          bye:{ text:['Faster. Worth it. Probably.'], end:true },
          again:{ text:['New ache. Same argument. The Schism keeps excellent time.'],
            choices:[ {label:'Tell me about crossing.', goto:'crossing'}, {label:'Why fast?', goto:'fast'}, {label:'Leave this side.', goto:'bye'} ] } }} }
    ] },
  { id:'archivist-reading-room', name:"The Archivist's Reading Room",
    building:{x:980,y:-68,w:120,h:80,wall:'#35384a',roof:'#2a2d38',door:{x:1016,y:-28},sign:'ARCHIVE'},
    w:380, h:250, spawn:{x:190,y:190}, exit:{x:190,y:238}, floor:'#22232a', wall:'#2e3040', accent:'#b9c2cf',
    decor:[
      {x:20,y:30,w:80,h:100,c:'#252830'},{x:140,y:30,w:100,h:100,c:'#252830'},{x:280,y:30,w:80,h:100,c:'#252830'},
      {x:80,y:140,w:70,h:36,c:'#2c2e36'},{x:230,y:140,w:70,h:36,c:'#2c2e36'},
      {x:160,y:90,w:60,h:40,c:'#303850',top:'#b9c2cf'},
      {x:80,y:130,w:10,h:14,c:'#b9c2cf',t:'candle'},{x:230,y:130,w:10,h:14,c:'#b9c2cf',t:'candle'}
    ],
    npcs:[
      {id:'int-custodian-archivist', x:110, y:110, color:'#9b74ff', sprite:'sorcerer', name:'Custodian Archivist', role:'Record-Stone Tender',
        dialogue:{ start:'intro', repeat:'again', nodes:{
          intro:{ text:[
            'This room is where I tend the secondary records. The primaries are in the vaults. The primaries are... territorial.',
            'I have found three new names in the overnight record. They were not there yesterday. They were not written by human hand.'],
            choices:[ {label:'Territorial?', goto:'territorial'}, {label:'The Ledger-Bound?', goto:'ledgerbound'}, {label:'Farewell.', goto:'bye'} ] },
          territorial:{ text:['A record-stone that has been in the vault long enough stops being data and starts being... entity. It knows what it is. It resists being updated.'], goto:'again' },
          ledgerbound:{ text:['The Ledger-Bound is not one creature. It is the accumulated weight of every ancestor who agreed to pass their debt forward. To defeat it you must disagree with all of them at once. A single moment of total dissent.'], goto:'again' },
          center:{ text:['When the chain splits, strike the center. Not the CANON half, not the SCHISM half. The thing that holds them both - that is where the inheritance lives.'], goto:'again' },
          bye:{ text:['Try not to stand still long enough for the stones to learn your name. I mean that.'], end:true },
          again:{ text:['The overnight record changed again while you were away. It is beginning to prefer certain names.'],
            choices:[ {label:'What changed at the center?', goto:'center'}, {label:'The Ledger-Bound?', goto:'ledgerbound'}, {label:'Leave the records.', goto:'bye'} ] } }} },
      {id:'int-librarian-shade', x:280, y:110, color:'#4ecb7a', sprite:'sorcerer', name:'Librarian Shade', role:'Fork Scholar and Relic Advisor',
        dialogue:{ start:'intro', repeat:'again', nodes:{
          intro:{ text:[
            'Fascinating! Another Recorded visitor. Do you know how many people walk through that fork without understanding what they are choosing? Almost all of them.',
            'CANON and SCHISM are not just paths. They are epistemological positions on debt. CANON says: debt is a fact. SCHISM says: debt is a proposition.'],
            choices:[ {label:'Explain the fork.', goto:'fork'}, {label:'Tell me about relics.', goto:'relics'}, {label:'Farewell.', goto:'bye'} ] },
          fork:{ text:['The crossing bridge at the bottom requires both spellings. RECORDED from the Canon side. DEDROCER - that is RECORDED written backwards - from the Schism side. You must walk both to cross. Identity requires experiencing both propositions.'], goto:'again' },
          relics:{ text:['Area 2 relics are forged from crystallized debt-stone - actual material compressed by centuries of obligation. They carry inherited weight. An Ancestral Edge hits harder because it has been owed a long time. Forge one at the Forklight and you will feel the difference.'], goto:'again' },
          paper:{ text:['My paper: the crossing requires BOTH spellings because the bridge itself is a paradox-object. It exists only if you have been both Recorded and Contested simultaneously. The ledger cannot hold that. The bridge exploits the gap.'], goto:'again' },
          bye:{ text:['Come back if you find any new inscriptions. I pay in scholarship.'], end:true },
          again:{ text:['I finished a paper on the crossing bridge puzzle since your last visit. The conclusion is elegant and probably actionable.'],
            choices:[ {label:'Tell me about the paper.', goto:'paper'}, {label:'Tell me about relics.', goto:'relics'}, {label:'Leave the archive.', goto:'bye'} ] } }} }
    ] },
  { id:'margin-chamber', name:'The Margin Chamber', reward:'canon-clerk',
    building:{x:1160,y:-68,w:80,h:60,wall:'#2e3038',roof:'#252830',door:{x:1188,y:-38},sign:'',secret:true},
    w:280, h:200, spawn:{x:140,y:148}, exit:{x:140,y:192}, floor:'#1e2028', wall:'#282c38', accent:'#d4a83e',
    decor:[
      {x:90,y:60,w:100,h:50,c:'#1c2028',top:'#9a8a6a'},
      {x:30,y:50,w:40,h:80,c:'#1a1e24'},{x:210,y:50,w:40,h:80,c:'#1a1e24'},
      {x:115,y:52,w:12,h:16,c:'#d4a83e',t:'candle'},
      {x:155,y:64,w:14,h:12,c:'#28303a'},{x:172,y:66,w:10,h:10,c:'#28303a'}
    ],
    npcs:[
      {id:'int-margins-keeper', x:140, y:78, color:'#b9c2cf', sprite:'hollow', name:'Keeper of Margins', role:'Margin Annotator',
        dialogue:{ start:'intro', repeat:'again', nodes:{
          intro:{ text:[
            'You found the chamber. Good. The Forklight staff do not know this room exists. That is by design.',
            "Every official record in this vault has a margin. The margin is not the record - it is the annotation space beside it. The Foreman's authority is encoded in a very clear main record. Very clear records have very wide margins."],
            choices:[ {label:'The margin-scroll?', goto:'margin-scroll'}, {label:'The Foreman?', goto:'foreman'}, {label:'Farewell.', goto:'bye'} ] },
          'margin-scroll':{ text:["East of the Forklight, behind the lectern. There is a scroll with my marks on it. Bring it to the Foreman's door and press it against the ledger face. The marginal note becomes part of the record. His authority... crowds. The record is still true. The margin makes it... less efficient."], goto:'again' },
          foreman:{ text:['I do not hate the Foreman. He is what the system made him. A record that achieved sentience by being too large to dispute. I just believe every sentient record deserves a margin note.'], goto:'again' },
          bye:{ text:['East of the Forklight. The scroll already has my pen-marks on it. All you provide is the contact.'], end:true },
          again:{ text:["Did you use the scroll yet? If not, it waits east of the Forklight. If you did, then somewhere the Foreman's record is learning how cramped a margin can become."],
            choices:[ {label:'Remind me about the scroll.', goto:'margin-scroll'}, {label:'Why the Foreman?', goto:'foreman'}, {label:'Leave the chamber.', goto:'bye'} ] } }} }
    ] }
];

  return {
    ECON, ENEMY_REWARDS, STORY, RELICS, LEVELING, SIGILS, BOSS_SIGILS, AUDITOR_ENDINGS, SKINS, ASSETS, NPCS, INTERIORS, ACT1_GRACEFALL, AREA1_LORE, AREA1_PUZZLES, AREA2_LORE, AREA2_PUZZLES, WORLD_PORTALS,
    PLAT_LEVEL, BATTLE_LEVEL, TURN_ENCOUNTER, BOSS_SCRIPT,
    TURN_SEXTON, TURN_WARDEN, TURN_TALLOW, PLAT_TALLOW_HOUSE, BATTLE_TALLOW_ECHOES, AREA1_ENCOUNTERS,
    AREA2_TOWN, AREA3_TOWN, PLAT_DEBT_MINES, BATTLE_LEDGER_VAULTS, TURN_FOREMAN, TURN_BIFURCATED, TURN_LEDGERBOUND, AREA2_ENCOUNTERS,
    PLAT_ASCENT_TESTIMONY, BATTLE_SEIZED_YARD, TURN_SCRIVENER, TURN_CASCADE, TURN_AUDITOR, AREA3_ENCOUNTERS
  };
});
