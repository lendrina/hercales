// ============================================================
// Game 3 — Cerynitian Hind / Perfectionism
// Shower knob: hold "good enough" for 5 s to win.
// ============================================================

const startButton    = document.getElementById('startButton');
const gameStart      = document.getElementById('gameStart');
const gameBoard      = document.getElementById('gameBoard');
const meterFill      = document.getElementById('meterFill');
const gameMessage    = document.getElementById('gameMessage');
const knobThumb      = document.getElementById('knobThumb');
const waterIndicator = document.getElementById('waterIndicator');
const tempLabel      = document.getElementById('tempLabel');
const endOverlay     = document.getElementById('endOverlay');
const steam          = document.getElementById('steam');
const sliderTrack    = document.getElementById('sliderTrack');

// ── Constants ────────────────────────────────────────────────
const PERFECT_LO  = 0.475;   // 47.5% — left edge of perfect zone
const PERFECT_HI  = 0.525;   // 52.5% — right edge of perfect zone
const GOOD_LO     = 0.175;   // 17.5%
const GOOD_HI     = 0.825;   // 82.5%

const WOBBLE_PER_MOVE  = 0.035;   // wobble added per drag event
const WOBBLE_DECAY     = 0.0012;  // wobble lost per ms at rest
const WOBBLE_CAP       = 0.40;    // maximum wobble
const WIN_HOLD_MS      = 5000;    // ms in good zone to win
const CALM_DECAY_RATE  = 0.55;    // fraction calm progress lost per ms when outside good zone

// ── State ────────────────────────────────────────────────────
let knobPos    = 0.5;   // player-set position [0..1]
let wobble     = 0;     // current wobble amplitude
let waterPos   = 0.5;   // actual water = knobPos + wobble offset
let holdMs     = 0;     // continuous ms in good zone
let running    = false;
let won        = false;
let lastTs     = 0;
let dragging   = false;
let lastMouseX = 0;
let lastMsgKey = '';

// ── Helpers ──────────────────────────────────────────────────
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function trackWidth() {
  return sliderTrack.getBoundingClientRect().width || 1;
}

function trackLeft() {
  return sliderTrack.getBoundingClientRect().left;
}

function setMessage(text) {
  if (gameMessage.textContent !== text) {
    gameMessage.textContent = text;
  }
}

function zone(pos) {
  if (pos >= PERFECT_LO && pos <= PERFECT_HI) return 'perfect';
  if (pos >= GOOD_LO    && pos <= GOOD_HI)    return 'good';
  if (pos < 0.05 || pos > 0.95)               return 'extreme';
  return 'bad';
}

function tempString(pos) {
  if (pos < 0.10)  return 'Freezing';
  if (pos < 0.175) return 'Cold';
  if (pos < 0.40)  return 'Cool — getting there';
  if (pos < PERFECT_LO) return 'Warm — almost good';
  if (pos <= PERFECT_HI) return 'Perfect';
  if (pos < 0.60)  return 'Warm — almost good';
  if (pos < GOOD_HI)    return 'Hot — getting there';
  if (pos < 0.90)  return 'Hot';
  return 'Scalding';
}

// ── Render ───────────────────────────────────────────────────
function render() {
  const knobPct  = (knobPos  * 100).toFixed(2) + '%';
  const waterPct = (waterPos * 100).toFixed(2) + '%';

  knobThumb.style.left      = knobPct;
  waterIndicator.style.left = waterPct;
  tempLabel.textContent     = tempString(waterPos);

  // Steam shows when water is warm
  const z = zone(waterPos);
  if (z === 'perfect' || z === 'good') {
    steam.classList.add('warm');
  } else {
    steam.classList.remove('warm');
  }

  // Calm meter: holdMs / WIN_HOLD_MS
  const pct = Math.round(clamp(holdMs / WIN_HOLD_MS, 0, 1) * 100);
  meterFill.style.width = pct + '%';
}

// ── Game loop ────────────────────────────────────────────────
function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  const dt = Math.min(100, ts - lastTs);
  lastTs = ts;

  // Wobble decays when not dragging
  if (!dragging) {
    wobble = Math.max(0, wobble - WOBBLE_DECAY * dt);
  }

  // Actual water oscillates using wobble as amplitude
  // sin wave driven by time keeps it feeling alive
  const phase = (ts / 420) * Math.PI * 2;
  waterPos = clamp(knobPos + wobble * Math.sin(phase), 0, 1);

  const z = zone(waterPos);

  if (z === 'good' || z === 'perfect') {
    holdMs = Math.min(WIN_HOLD_MS, holdMs + dt);
  } else {
    // Calm drains faster the more extreme you are
    const drainRate = z === 'extreme' ? 3.0 : 1.4;
    holdMs = Math.max(0, holdMs - dt * drainRate);
  }

  // Messages
  let msgKey = '';
  const ratio = holdMs / WIN_HOLD_MS;
  if (wobble > 0.22) {
    msgKey = 'wobble-high';
  } else if (z === 'perfect') {
    msgKey = 'in-perfect';
  } else if (z === 'good') {
    if (ratio > 0.66)      msgKey = 'good-near-win';
    else if (ratio > 0.33) msgKey = 'good-mid';
    else                   msgKey = 'good-start';
  } else if (z === 'bad' || z === 'extreme') {
    msgKey = 'outside';
  }

  if (msgKey !== lastMsgKey) {
    lastMsgKey = msgKey;
    if (msgKey === 'wobble-high') {
      setMessage('Too many corrections — the water is swinging wildly. Hold still.');
    } else if (msgKey === 'in-perfect') {
      setMessage('You found "perfect" — but can you hold it? Even a twitch might tip you off.');
    } else if (msgKey === 'good-near-win') {
      setMessage('Almost there. Stay calm. Good enough IS enough.');
    } else if (msgKey === 'good-mid') {
      setMessage('Feeling stable. Resist the urge to fine-tune — just hold.');
    } else if (msgKey === 'good-start') {
      setMessage('Good enough zone. Let the water settle on its own.');
    } else if (msgKey === 'outside') {
      setMessage('Off target. One gentle nudge, then stop adjusting.');
    }
  }

  render();

  if (holdMs >= WIN_HOLD_MS && !won) {
    won = true;
    running = false;
    win();
    return;
  }

  requestAnimationFrame(loop);
}

// ── Win ──────────────────────────────────────────────────────
function win() {
  meterFill.style.width = '100%';
  setMessage('You let go of perfect — and the water found its warmth.');
  endOverlay.classList.remove('hidden');
  steam.classList.add('warm');
}

// ── Drag / input ─────────────────────────────────────────────
function onDragStart(clientX) {
  if (!running || won) return;
  dragging   = true;
  lastMouseX = clientX;
}

function onDragMove(clientX) {
  if (!dragging || !running || won) return;
  const dx      = clientX - lastMouseX;
  lastMouseX    = clientX;
  const delta   = dx / trackWidth();

  if (Math.abs(delta) > 0.001) {
    knobPos = clamp(knobPos + delta, 0, 1);
    // Every move adds wobble
    wobble  = Math.min(WOBBLE_CAP, wobble + WOBBLE_PER_MOVE);
  }
}

function onDragEnd() {
  dragging = false;
}

// Mouse events on the track
sliderTrack.addEventListener('mousedown', e => {
  // Jump knob to click position first, then start drag
  const pct  = (e.clientX - trackLeft()) / trackWidth();
  knobPos    = clamp(pct, 0, 1);
  wobble     = Math.min(WOBBLE_CAP, wobble + WOBBLE_PER_MOVE * 2);
  onDragStart(e.clientX);
});

window.addEventListener('mousemove', e => onDragMove(e.clientX));
window.addEventListener('mouseup',   ()  => onDragEnd());

// Touch events
sliderTrack.addEventListener('touchstart', e => {
  e.preventDefault();
  const t   = e.touches[0];
  const pct = (t.clientX - trackLeft()) / trackWidth();
  knobPos   = clamp(pct, 0, 1);
  wobble    = Math.min(WOBBLE_CAP, wobble + WOBBLE_PER_MOVE * 2);
  onDragStart(t.clientX);
}, { passive: false });

window.addEventListener('touchmove', e => {
  if (!dragging) return;
  e.preventDefault();
  onDragMove(e.touches[0].clientX);
}, { passive: false });

window.addEventListener('touchend', () => onDragEnd());

// ── Start ────────────────────────────────────────────────────
function start() {
  // Reset state
  knobPos    = 0.5;
  wobble     = 0;
  waterPos   = 0.5;
  holdMs     = 0;
  running    = false;
  won        = false;
  lastTs     = 0;
  dragging   = false;
  lastMsgKey = '';

  gameStart.classList.add('hidden');
  gameBoard.classList.remove('hidden');
  endOverlay.classList.add('hidden');
  steam.classList.remove('warm');
  meterFill.style.width = '0%';
  setMessage('Drag the knob to find "good enough" — then hold still.');

  render();
  running = true;
  requestAnimationFrame(loop);
}

startButton.addEventListener('click', start);

if (window.location.search.includes('autostart=1')) start();
