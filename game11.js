/* ── Game 11: Apples of the Hesperides ── */

// DOM refs
const gameStart   = document.getElementById('gameStart');
const gameBoard   = document.getElementById('gameBoard');
const meterFill   = document.getElementById('meterFill');
const gameMessage = document.getElementById('gameMessage');
const startButton = document.getElementById('startButton');

// ── Player + rivals configuration ──
const RIVALS = [
  { id: 'alex',  name: 'Alex'  },
  { id: 'sam',   name: 'Sam'   },
  { id: 'jamie', name: 'Jamie' },
  { id: 'riley', name: 'Riley' },
];

const PLAYER_CLICK_GAIN = 4;      // % per click on own bar
const FREEZE_MS         = 1500;   // how long player is frozen after comparing
const DISTRACT_MS       = 3000;   // how long rivals glow after being clicked

// ── State ──
let playerPct    = 0;
let rivalPcts    = {};
let frozen       = false;
let distractedUntil = 0;    // timestamp when rival distraction ends
let loopId       = null;
let won          = false;
let lastTick     = 0;

// Rival drift speeds (% per second, random per session)
let rivalSpeeds  = {};

// ── Comparison messages ──
const compareMessages = [
  name => `${name} jumped ahead — but does their path lead where yours does?`,
  name => `It looked like ${name} surged forward. Was that real, or just noise?`,
  name => `You glanced at ${name}. Meanwhile, your own bar stood still.`,
  name => `${name}'s bar moved. Yours didn't. Coincidence?`,
  name => `Watching ${name} costs you more than you think.`,
];

// ── Build DOM ──
function buildBoard() {
  gameBoard.innerHTML = '';

  // Compare message badge
  const badge = document.createElement('div');
  badge.className = 'game11-compare-msg';
  badge.id = 'compareBadge';
  gameBoard.appendChild(badge);

  // Player row (first, most prominent)
  gameBoard.appendChild(makeRow('player', 'You', true));

  // Rival rows
  RIVALS.forEach(r => {
    gameBoard.appendChild(makeRow(r.id, r.name, false));
  });
}

function makeRow(id, label, isPlayer) {
  const row = document.createElement('div');
  row.className = 'game11-bar-row ' + (isPlayer ? 'is-player' : 'is-other');
  row.dataset.id = id;

  const labelRow = document.createElement('div');
  labelRow.className = 'game11-bar-label';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'game11-name';
  nameSpan.textContent = label;

  const pctSpan = document.createElement('span');
  pctSpan.className = 'game11-pct';
  pctSpan.id = 'pct-' + id;
  pctSpan.textContent = '0%';

  labelRow.appendChild(nameSpan);
  labelRow.appendChild(pctSpan);

  const track = document.createElement('div');
  track.className = 'game11-track';
  track.id = 'track-' + id;

  const fill = document.createElement('div');
  fill.className = 'game11-fill';
  fill.id = 'fill-' + id;
  fill.style.width = '0%';

  track.appendChild(fill);
  row.appendChild(labelRow);
  row.appendChild(track);

  track.addEventListener('click', () => handleBarClick(id, isPlayer));
  return row;
}

// ── Handle clicks ──
function handleBarClick(id, isPlayer) {
  if (won) return;

  if (isPlayer) {
    if (frozen) return;
    playerPct = Math.min(100, playerPct + PLAYER_CLICK_GAIN);
    updateBars();
    if (playerPct >= 100) {
      triggerWin();
    } else {
      const encouragements = [
        'Keep going — the apples are within reach.',
        'That\'s it. Stay on your path.',
        'One step at a time. You\'re moving.',
        'Focus. The garden is getting closer.',
        'Your progress is real. Theirs is just noise.',
      ];
      setMessage(encouragements[Math.floor(Math.random() * encouragements.length)]);
    }
  } else {
    // Clicked a rival — trigger comparison penalty
    if (frozen) return;
    const rivalName = RIVALS.find(r => r.id === id)?.name || 'them';
    triggerComparison(rivalName);
  }
}

function triggerComparison(rivalName) {
  frozen = true;
  distractedUntil = Date.now() + DISTRACT_MS;

  // Show badge
  const badge = document.getElementById('compareBadge');
  const msgFn = compareMessages[Math.floor(Math.random() * compareMessages.length)];
  badge.textContent = msgFn(rivalName);
  badge.classList.add('visible');

  // Glow rivals
  RIVALS.forEach(r => {
    const row = gameBoard.querySelector(`[data-id="${r.id}"]`);
    if (row) row.classList.add('is-distracted');
  });

  // Freeze player bar visually
  const playerRow = gameBoard.querySelector('[data-id="player"]');
  if (playerRow) playerRow.classList.add('is-frozen');

  setMessage(`You glanced at ${rivalName}. Your progress is on hold for a moment.`);

  setTimeout(() => {
    frozen = false;
    if (playerRow) playerRow.classList.remove('is-frozen');
    setMessage('Back to your path. Click your bar to keep moving.');
  }, FREEZE_MS);

  setTimeout(() => {
    RIVALS.forEach(r => {
      const row = gameBoard.querySelector(`[data-id="${r.id}"]`);
      if (row) row.classList.remove('is-distracted');
    });
    badge.classList.remove('visible');
  }, DISTRACT_MS);
}

// ── Game loop ──
function tick(timestamp) {
  if (won) return;

  const dt = lastTick ? (timestamp - lastTick) / 1000 : 0;
  lastTick = timestamp;

  const distracted = Date.now() < distractedUntil;

  // Move rivals
  RIVALS.forEach(r => {
    const base  = rivalSpeeds[r.id] || 5;
    // When distracted, rivals move faster (1.8x) and occasionally jump
    const speed = distracted ? base * 1.8 : base;
    const drift = (Math.random() * speed - speed * 0.28) * dt;  // slightly net-positive drift
    rivalPcts[r.id] = Math.max(0, Math.min(98, (rivalPcts[r.id] || 0) + drift));

    // Occasional random jump (more frequent while distracting)
    const jumpChance = distracted ? 0.012 : 0.004;
    if (Math.random() < jumpChance) {
      rivalPcts[r.id] = Math.min(98, rivalPcts[r.id] + Math.random() * 15 + 5);
    }
    // Rivals also occasionally drop back
    if (Math.random() < 0.003) {
      rivalPcts[r.id] = Math.max(0, rivalPcts[r.id] - Math.random() * 12);
    }
  });

  updateBars();
  loopId = requestAnimationFrame(tick);
}

// ── Render ──
function updateBars() {
  // Player
  const playerFill = document.getElementById('fill-player');
  const playerPctEl = document.getElementById('pct-player');
  if (playerFill) playerFill.style.width = playerPct + '%';
  if (playerPctEl) playerPctEl.textContent = Math.round(playerPct) + '%';
  meterFill.style.width = playerPct + '%';

  // Rivals
  RIVALS.forEach(r => {
    const fill  = document.getElementById('fill-' + r.id);
    const pctEl = document.getElementById('pct-' + r.id);
    const pct   = rivalPcts[r.id] || 0;
    if (fill)  fill.style.width  = pct + '%';
    if (pctEl) pctEl.textContent = Math.round(pct) + '%';
  });
}

// ── Win ──
function triggerWin() {
  won = true;
  if (loopId) cancelAnimationFrame(loopId);

  meterFill.style.width = '100%';

  setMessage('You reached the golden apples. Your path was the only one that mattered.');

  const overlay = document.createElement('div');
  overlay.className = 'game11-end';
  overlay.innerHTML = `
    <h2>The apples are yours.</h2>
    <p>You stayed on your path and ignored the noise. The others' progress was never real — it was a story your mind told to distract you. Comparison is a construct. Your journey is the only one that counts.</p>
  `;
  gameBoard.appendChild(overlay);
}

// ── Start ──
function start() {
  // Reset state
  playerPct = 0;
  frozen    = false;
  won       = false;
  lastTick  = 0;
  distractedUntil = 0;

  // Randomise rival speeds (4–9 % per second)
  RIVALS.forEach(r => {
    rivalSpeeds[r.id] = 4 + Math.random() * 5;
    rivalPcts[r.id]   = Math.random() * 12; // stagger starting positions
  });

  // Swap panels
  gameStart.classList.add('hidden');
  gameBoard.classList.remove('hidden');

  buildBoard();
  updateBars();
  setMessage('Click YOUR bar (the top one) to advance. Ignore the golden bars below.');

  if (loopId) cancelAnimationFrame(loopId);
  loopId = requestAnimationFrame(tick);
}

function setMessage(text) {
  gameMessage.textContent = text;
}

startButton.addEventListener('click', start);

if (window.location.search.includes('autostart=1')) start();
