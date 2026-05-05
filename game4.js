/* Game 4 — Erymanthian Boar: Anxiety Cloud Chase */

const startButton  = document.getElementById('startButton');
const gameStart    = document.getElementById('gameStart');
const gameBoard    = document.getElementById('gameBoard');
const cloud        = document.getElementById('cloud');
const endOverlay   = document.getElementById('endOverlay');
const meterFill    = document.getElementById('meterFill');
const gameMessage  = document.getElementById('gameMessage');

// ── Constants ──────────────────────────────────────────────────────────────
const GOAL_MS          = 60_000;   // 60 s to win
const STATIONARY_MS    = 600;      // cursor still > 600 ms → caught
const CATCH_DISTANCE   = 52;       // px — cloud centre within this → caught
const LERP_START       = 0.072;    // cloud lerp factor at t=0 (fast)
const LERP_END         = 0.018;    // cloud lerp factor at t=GOAL (slow)

// ── State ──────────────────────────────────────────────────────────────────
let rafId          = null;
let running        = false;

// Cursor position (board-local)
let cursorX        = -999;
let cursorY        = -999;
let lastMoveTime   = 0;

// Cloud position (board-local, starts off-screen)
let cloudX         = 50;
let cloudY         = 50;

// Survival timer
let elapsedMs      = 0;
let lastFrameTime  = 0;

// Whether cursor is inside the board
let cursorInBoard  = false;

// Cursor dot element (created on start)
let cursorDot      = null;

// ── Helpers ────────────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }

function boardCoords(pageX, pageY) {
  const rect = gameBoard.getBoundingClientRect();
  return {
    x: pageX - rect.left,
    y: pageY - rect.top,
  };
}

function updateMeter(pct) {
  meterFill.style.width = Math.min(100, Math.max(0, pct)) + '%';
}

function resetCloud() {
  // Place cloud in a random corner so it's not immediately on top of cursor
  const rect = gameBoard.getBoundingClientRect();
  const margin = 80;
  const corners = [
    { x: margin, y: margin },
    { x: rect.width - margin, y: margin },
    { x: margin, y: rect.height - margin },
    { x: rect.width - margin, y: rect.height - margin },
  ];
  const corner = corners[Math.floor(Math.random() * corners.length)];
  cloudX = corner.x;
  cloudY = corner.y;
  positionCloud();
}

function positionCloud() {
  cloud.style.left = cloudX + 'px';
  cloud.style.top  = cloudY + 'px';
}

// Visual properties that evolve with progress (0..1)
function applyCloudProgress(progress) {
  // Shrink from 120×80 down to 60×40
  const w = lerp(120, 60, progress);
  const h = lerp(80, 40, progress);
  cloud.style.width  = w + 'px';
  cloud.style.height = h + 'px';
  // Fade from full opacity to 0.2
  cloud.style.opacity = lerp(1, 0.2, progress);
}

// ── Event handlers ─────────────────────────────────────────────────────────
function onMouseMove(e) {
  const pos = boardCoords(e.pageX, e.pageY);
  cursorX = pos.x;
  cursorY = pos.y;
  lastMoveTime = performance.now();

  if (cursorDot) {
    cursorDot.style.left = cursorX + 'px';
    cursorDot.style.top  = cursorY + 'px';
  }
}

function onMouseEnter() { cursorInBoard = true; }
function onMouseLeave() { cursorInBoard = false; }

// ── Game loop ──────────────────────────────────────────────────────────────
function tick(now) {
  if (!running) return;

  const dt = lastFrameTime ? now - lastFrameTime : 16;
  lastFrameTime = now;

  const progress = Math.min(1, elapsedMs / GOAL_MS);

  // Lerp factor decays with progress so the cloud slows down over time
  const lerpFactor = lerp(LERP_START, LERP_END, progress);

  // Move cloud toward cursor
  cloudX = lerp(cloudX, cursorX, lerpFactor);
  cloudY = lerp(cloudY, cursorY, lerpFactor);
  positionCloud();
  applyCloudProgress(progress);

  // Distance between cloud centre and cursor
  const dx   = cloudX - cursorX;
  const dy   = cloudY - cursorY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const stationaryMs = now - lastMoveTime;
  const caught =
    dist < CATCH_DISTANCE ||
    stationaryMs > STATIONARY_MS ||
    !cursorInBoard;

  if (caught) {
    elapsedMs = 0;
    updateMeter(0);
    applyCloudProgress(0);
    resetCloud();
    gameMessage.textContent = 'It caught you — keep moving.';
  } else {
    elapsedMs += dt;
    updateMeter((elapsedMs / GOAL_MS) * 100);

    // Dynamic message based on progress
    if (progress < 0.25) {
      gameMessage.textContent = 'Stay in motion — don\'t let it close in.';
    } else if (progress < 0.5) {
      gameMessage.textContent = 'The cloud is tiring. Keep going.';
    } else if (progress < 0.75) {
      gameMessage.textContent = 'It\'s shrinking. You\'re outlasting it.';
    } else {
      gameMessage.textContent = 'Almost there — the anxiety is fading.';
    }

    if (elapsedMs >= GOAL_MS) {
      win();
      return;
    }
  }

  rafId = requestAnimationFrame(tick);
}

// ── Win / Reset ────────────────────────────────────────────────────────────
function win() {
  running = false;
  cancelAnimationFrame(rafId);
  rafId = null;

  updateMeter(100);
  applyCloudProgress(1);
  gameMessage.textContent = 'The cloud is gone. You faced it and it exhausted itself.';

  endOverlay.innerHTML = `
    <div class="game4-end-inner">
      <h2>You endured.</h2>
      <p>The anxiety cloud couldn't keep up. By moving through it rather than fleeing or freezing, you let it exhaust itself. That's how it works in real life too.</p>
    </div>`;
  endOverlay.classList.remove('hidden');

  removeListeners();
}

function addListeners() {
  gameBoard.addEventListener('mousemove',  onMouseMove);
  gameBoard.addEventListener('mouseenter', onMouseEnter);
  gameBoard.addEventListener('mouseleave', onMouseLeave);
}

function removeListeners() {
  gameBoard.removeEventListener('mousemove',  onMouseMove);
  gameBoard.removeEventListener('mouseenter', onMouseEnter);
  gameBoard.removeEventListener('mouseleave', onMouseLeave);
}

// ── Start ──────────────────────────────────────────────────────────────────
function start() {
  // Hide start panel, show board
  gameStart.classList.add('hidden');
  gameBoard.classList.remove('hidden');
  endOverlay.classList.add('hidden');
  endOverlay.innerHTML = '';

  // Reset state
  elapsedMs     = 0;
  lastFrameTime = 0;
  cursorInBoard = false;
  cursorX       = -999;
  cursorY       = -999;
  lastMoveTime  = performance.now();
  running       = true;

  // Meter & message
  updateMeter(0);
  gameMessage.textContent = 'Move your cursor inside the arena — don\'t stop.';

  // Cloud visuals reset
  applyCloudProgress(0);

  // Create cursor dot if needed
  if (!cursorDot) {
    cursorDot = document.createElement('div');
    cursorDot.className = 'game4-cursor';
    gameBoard.appendChild(cursorDot);
  }

  // Place cloud
  resetCloud();

  // Attach input listeners
  removeListeners();
  addListeners();

  // Cancel any running loop
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);
}

// ── Boot ───────────────────────────────────────────────────────────────────
startButton.addEventListener('click', start);

if (window.location.search.includes('autostart=1')) start();
