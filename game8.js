// Game 8 — Mares of Diomedes / Destructive Habits

// ── DOM references ──────────────────────────────────────────────
const meterFill    = document.getElementById('meterFill');
const gameMessage  = document.getElementById('gameMessage');
const startButton  = document.getElementById('startButton');
const gameStart    = document.getElementById('gameStart');
const gameBoard    = document.getElementById('gameBoard');
const reliefBtn    = document.getElementById('reliefBtn');
const urgeFill     = document.getElementById('urgeFill');
const surgeBanner  = document.getElementById('surgeBanner');
const endOverlay   = document.getElementById('endOverlay');
const canvas       = document.getElementById('game8Canvas');
const ctx          = canvas.getContext('2d');

// ── Constants ───────────────────────────────────────────────────
const WIN_RESILIENCE   = 100;   // percent
const BASE_SPAWN_RATE  = 1.4;   // dots per second at baseline
const SURGE_DURATION   = 10000; // ms the spawn multiplier stays elevated after a press
const SURGE_MULTIPLIER = 3.2;   // spawn rate multiplier right after pressing
const RESILIENCE_GAIN  = 1.8;   // % per second while not pressing
const RESILIENCE_LOSS  = 28;    // % lost per button press
const DOT_LIFETIME     = 4200;  // ms a dot lives before fading naturally
const DOT_MAX          = 60;    // hard cap on simultaneous dots
const URGE_WAVE_PERIOD = 6800;  // ms between urge spike peaks

// ── State ───────────────────────────────────────────────────────
let dots        = [];
let nextId      = 0;
let resilience  = 0;
let spawnTimer  = 0;       // accumulated ms until next spawn
let surgeTimer  = 0;       // ms remaining in surge window
let urgePhase   = 0;       // drives sinusoidal urge oscillation (ms accumulator)
let pressCount  = 0;
let running     = false;
let won         = false;
let lastTs      = 0;
let bannerTimer = 0;       // ms remaining to show the surge banner
let raf         = 0;

// ── Utility ──────────────────────────────────────────────────────
function rand(min, max) { return Math.random() * (max - min) + min; }

// ── Canvas sizing ────────────────────────────────────────────────
function resizeCanvas() {
  const rect = gameBoard.getBoundingClientRect();
  canvas.width  = rect.width  || 600;
  canvas.height = rect.height || 360;
}

// ── Dot management ───────────────────────────────────────────────
function spawnDot() {
  if (dots.length >= DOT_MAX) { return; }
  const severity = 1 + (pressCount * 0.18); // dots grow larger with each press
  const r = rand(5, 11) * Math.min(severity, 3.5);
  dots.push({
    id:  nextId++,
    x:   rand(r, canvas.width  - r),
    y:   rand(r, canvas.height - 100 - r), // keep above button area
    r,
    vx:  rand(-0.4, 0.4),
    vy:  rand(-0.4, 0.4),
    age: 0,
    lifetime: DOT_LIFETIME * rand(0.7, 1.3),
    hue: rand(0, 25),       // red-orange spectrum
    flicker: rand(0, Math.PI * 2),
  });
}

function clearAllDots() {
  dots = [];
}

// ── Drawing ──────────────────────────────────────────────────────
function drawDots(dt) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const d of dots) {
    d.age += dt;
    d.x   += d.vx;
    d.y   += d.vy;
    d.flicker += 0.003 * dt;

    // bounce off walls
    if (d.x - d.r < 0)              { d.x = d.r;               d.vx *= -1; }
    if (d.x + d.r > canvas.width)   { d.x = canvas.width - d.r; d.vx *= -1; }
    if (d.y - d.r < 0)              { d.y = d.r;               d.vy *= -1; }
    if (d.y + d.r > canvas.height - 100) { d.y = canvas.height - 100 - d.r; d.vy *= -1; }

    const lifeRatio = d.age / d.lifetime;
    // fade in for first 10%, fade out for last 25%
    let alpha = 1;
    if (lifeRatio < 0.1) { alpha = lifeRatio / 0.1; }
    else if (lifeRatio > 0.75) { alpha = 1 - (lifeRatio - 0.75) / 0.25; }

    const flicker = 0.85 + 0.15 * Math.sin(d.flicker);
    const finalAlpha = Math.max(0, Math.min(1, alpha * flicker));

    const grd = ctx.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.3, 0, d.x, d.y, d.r);
    grd.addColorStop(0, `hsla(${d.hue}, 100%, 78%, ${finalAlpha})`);
    grd.addColorStop(0.55, `hsla(${d.hue}, 90%, 45%, ${finalAlpha * 0.85})`);
    grd.addColorStop(1, `hsla(${d.hue + 5}, 80%, 20%, 0)`);

    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
  }

  // remove dots that have lived their life
  dots = dots.filter(d => d.age < d.lifetime);
}

// ── Relief press ─────────────────────────────────────────────────
function pressRelief() {
  if (!running || won) { return; }

  // Instant visual catharsis
  clearAllDots();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Punish
  pressCount += 1;
  surgeTimer  = SURGE_DURATION;
  resilience  = Math.max(0, resilience - RESILIENCE_LOSS);

  // Show banner
  bannerTimer = 2200;
  surgeBanner.classList.remove('hidden');

  updateMeter();
  const msg = pressCount === 1
    ? 'Sweet relief — but watch what happens next…'
    : `Press #${pressCount}. The mares are getting wilder.`;
  gameMessage.textContent = msg;
}

// ── Urge indicator ───────────────────────────────────────────────
function updateUrge(dt) {
  urgePhase += dt;
  // base oscillation + extra spike every URGE_WAVE_PERIOD ms
  const base = 0.45 + 0.35 * Math.sin((urgePhase / URGE_WAVE_PERIOD) * Math.PI * 2);
  // add dot-count pressure
  const dotPressure = Math.min(0.4, dots.length / DOT_MAX * 0.55);
  const urgePct = Math.min(1, base + dotPressure);
  urgeFill.style.width = (urgePct * 100).toFixed(1) + '%';
}

// ── Meter & message helpers ───────────────────────────────────────
function updateMeter() {
  meterFill.style.width = resilience.toFixed(1) + '%';
}

function stageMessage() {
  if (won) { return; }
  const r = resilience;
  if (surgeTimer > 0) {
    gameMessage.textContent = 'Things came back stronger — the cycle deepens with each press.';
  } else if (r < 20) {
    gameMessage.textContent = 'Stay with the discomfort. Don\'t reach for the button.';
  } else if (r < 50) {
    gameMessage.textContent = 'The discomfort is fading on its own. Keep holding.';
  } else if (r < 80) {
    gameMessage.textContent = 'You\'re building real resilience. It\'s working.';
  } else {
    gameMessage.textContent = 'Almost there — the mares are losing their power over you.';
  }
}

// ── Main game loop ────────────────────────────────────────────────
function loop(ts) {
  if (!running) { return; }

  const dt = Math.min(ts - lastTs, 100); // cap at 100 ms to avoid jumps
  lastTs = ts;

  // Spawn timer
  const spawnMultiplier = surgeTimer > 0
    ? SURGE_MULTIPLIER * (surgeTimer / SURGE_DURATION) + 1
    : 1;
  const spawnRate = BASE_SPAWN_RATE * spawnMultiplier; // dots/s
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnDot();
    spawnTimer = (1000 / spawnRate) * rand(0.6, 1.4);
  }

  // Surge timer
  if (surgeTimer > 0) {
    surgeTimer = Math.max(0, surgeTimer - dt);
    if (surgeTimer === 0) {
      surgeBanner.classList.add('hidden');
    }
  }

  // Banner timer
  if (bannerTimer > 0) {
    bannerTimer = Math.max(0, bannerTimer - dt);
    if (bannerTimer === 0) {
      surgeBanner.classList.add('hidden');
    }
  }

  // Resilience grows while not in a surge (and game is running)
  if (surgeTimer === 0) {
    resilience = Math.min(WIN_RESILIENCE, resilience + RESILIENCE_GAIN * (dt / 1000));
  }

  updateMeter();
  updateUrge(dt);
  drawDots(dt);
  stageMessage();

  // Win check
  if (resilience >= WIN_RESILIENCE) {
    win();
    return;
  }

  raf = requestAnimationFrame(loop);
}

// ── Win ───────────────────────────────────────────────────────────
function win() {
  running = false;
  won = true;
  cancelAnimationFrame(raf);
  clearAllDots();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  endOverlay.classList.remove('hidden');
  meterFill.style.width = '100%';
  gameMessage.textContent = 'Resilience complete. You tamed the mares without feeding them.';
}

// ── Start ─────────────────────────────────────────────────────────
function start() {
  // Reset state
  dots        = [];
  nextId      = 0;
  resilience  = 0;
  spawnTimer  = 800;
  surgeTimer  = 0;
  urgePhase   = 0;
  pressCount  = 0;
  running     = false;
  won         = false;
  bannerTimer = 0;

  // Reset UI
  endOverlay.classList.add('hidden');
  surgeBanner.classList.add('hidden');
  meterFill.style.width = '0%';
  urgeFill.style.width  = '0%';
  gameMessage.textContent = 'Hold on. Don\'t press the button.';

  // Show board
  gameStart.classList.add('hidden');
  gameBoard.classList.remove('hidden');

  // Size canvas now that the board is visible
  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  running = true;
  lastTs  = performance.now();
  raf     = requestAnimationFrame(loop);
}

// ── Event listeners ──────────────────────────────────────────────
startButton.addEventListener('click', start);
reliefBtn.addEventListener('click', pressRelief);

// Keep canvas sized to board
window.addEventListener('resize', () => {
  if (running || won) { resizeCanvas(); }
});

// ── Required test hook ───────────────────────────────────────────
if (window.location.search.includes('autostart=1')) start();
