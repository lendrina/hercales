// Game 12 — Cerberus / Facing Yourself
// Walk through your fears; fighting them makes them stronger.

const startButton  = document.getElementById('startButton');
const gameStart    = document.getElementById('gameStart');
const gameBoard    = document.getElementById('gameBoard');
const meterFill    = document.getElementById('meterFill');
const gameMessage  = document.getElementById('gameMessage');

// ─── Constants ───────────────────────────────────────────────────────────────

const BOARD_HEIGHT      = 360;
const PLAYER_SPEED      = 2.4;    // px per frame baseline
const SLOW_DURATION     = 1800;   // ms the player is slowed after fighting
const SLOW_FACTOR       = 0.38;
const FEAR_FADE_TIME    = 2200;   // ms to fully fade a fear once overlap passes threshold
const FEAR_TOUCH_THRESH = 0.8;    // seconds of continuous overlap to start fading
const MARGIN_X          = 48;     // px from left/right edges to start/end markers
const PLAYER_START_X    = MARGIN_X + 12;
const PLAYER_Y_RATIO    = 0.5;    // vertically centred on path
const PLAYER_RADIUS     = 9;
const FEAR_RADIUS       = 28;     // collision half-width

const FEAR_WORDS = [
  'regret', 'fear', 'shame', 'doubt', 'guilt', 'envy',
  'loneliness', 'failure', 'worthless', 'rage', 'grief',
  'emptiness', 'rejection', 'helpless', 'loss', 'anxiety'
];

// ─── State ───────────────────────────────────────────────────────────────────

let animId        = null;
let lastTime      = 0;
let playerX       = PLAYER_START_X;
let playerY       = BOARD_HEIGHT * PLAYER_Y_RATIO;
let slowUntil     = 0;
let slowPulseEnd  = 0;
let keys          = {};
let fears         = [];     // array of fear objects
let boardWidth    = 600;    // updated on start
let won           = false;

// ─── DOM Helpers ─────────────────────────────────────────────────────────────

function setMessage(text) { gameMessage.textContent = text; }

function setMeter(pct) {
  meterFill.style.width = Math.min(100, Math.max(0, pct)) + '%';
}

// ─── Fear objects ─────────────────────────────────────────────────────────────

function spawnFears() {
  gameBoard.querySelectorAll('.game12-fear').forEach(el => el.remove());
  fears = [];

  // We want dense coverage — roughly one blob every ~60px along the path,
  // from 18% to 88% of board width.
  const usableStart = Math.round(boardWidth * 0.18);
  const usableEnd   = Math.round(boardWidth * 0.88);
  const spacing     = 58;
  const slots       = Math.floor((usableEnd - usableStart) / spacing);
  const words       = shuffled([...FEAR_WORDS, ...FEAR_WORDS]).slice(0, Math.max(slots, 14));

  words.forEach((word, i) => {
    const x = usableStart + i * spacing + randBetween(-10, 10);
    // Vary y around the path centre ±28px so blobs feel scattered
    const y = BOARD_HEIGHT * 0.5 + randBetween(-28, 28);

    const el = document.createElement('div');
    el.className = 'game12-fear';
    el.textContent = word;
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    gameBoard.appendChild(el);

    fears.push({
      el,
      x, y,
      word,
      opacity:        1,
      overlapTime:    0,   // cumulative seconds overlapping player
      fading:         false,
      fadeStarted:    0,
      grown:          false,
      baseScale:      1,
      scale:          1,
      removed:        false,
    });
  });
}

function applyFearStyle(f) {
  if (f.removed) return;
  const s = f.el.style;
  s.opacity   = f.opacity;
  s.transform = `translate(-50%, -50%) scale(${f.scale})`;
}

// ─── Game setup ──────────────────────────────────────────────────────────────

function buildBoardStructure() {
  gameBoard.innerHTML = '';

  // Ambient background particles
  for (let i = 0; i < 6; i++) {
    const p = document.createElement('div');
    p.className = 'game12-ambient';
    const size = randBetween(40, 90);
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${randBetween(5, 90)}%;
      top:${randBetween(10, 80)}%;
      background: rgba(${randBetween(60,120)},${randBetween(30,80)},${randBetween(100,180)},1);
      animation-duration:${randBetween(4,9)}s;
      animation-delay:-${randBetween(0,8)}s;
    `;
    gameBoard.appendChild(p);
  }

  // Path strip
  const path = document.createElement('div');
  path.className = 'game12-path';
  gameBoard.appendChild(path);

  // Start marker
  const sm = document.createElement('div');
  sm.className = 'game12-start-marker';
  gameBoard.appendChild(sm);

  // End marker + label
  const em = document.createElement('div');
  em.className = 'game12-end-marker';
  gameBoard.appendChild(em);
  const el = document.createElement('div');
  el.className = 'game12-end-label';
  el.textContent = 'Light';
  gameBoard.appendChild(el);

  // Player
  const playerEl = document.createElement('div');
  playerEl.id = 'game12Player';
  playerEl.className = 'game12-player';
  playerEl.style.left = playerX + 'px';
  playerEl.style.top  = playerY + 'px';
  gameBoard.appendChild(playerEl);
}

function getPlayer() { return document.getElementById('game12Player'); }

// ─── Collision & interaction ──────────────────────────────────────────────────

function checkFearInteraction(dt) {
  const now = performance.now();
  const isSlowed = now < slowUntil;

  fears.forEach(f => {
    if (f.removed) return;

    const dx = playerX - f.x;
    const dy = playerY - f.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hitRadius = FEAR_RADIUS * f.scale + PLAYER_RADIUS;
    const overlapping = dist < hitRadius;

    if (overlapping) {
      f.overlapTime += dt;
      if (!f.el.classList.contains('game12-fear-touched')) {
        f.el.classList.add('game12-fear-touched');
      }
      // Start fading after sustained overlap
      if (!f.fading && f.overlapTime >= FEAR_TOUCH_THRESH) {
        f.fading = true;
        f.fadeStarted = now;
        f.el.classList.add('game12-fear-fading');
      }
    } else {
      // Reset overlap accumulation if we back off
      if (!f.fading) {
        f.overlapTime = Math.max(0, f.overlapTime - dt * 2);
        if (f.overlapTime <= 0) {
          f.el.classList.remove('game12-fear-touched');
        }
      }
    }

    // Progress the fade
    if (f.fading) {
      const elapsed = now - f.fadeStarted;
      f.opacity = Math.max(0, 1 - elapsed / FEAR_FADE_TIME);
      applyFearStyle(f);
      if (f.opacity <= 0) {
        f.el.remove();
        f.removed = true;
        spawnSpark(f.x, f.y);
      }
    }
  });

  // Remove fully faded from array occasionally
  if (fears.length > 0 && Math.random() < 0.02) {
    fears = fears.filter(f => !f.removed);
  }
}

function fightNearbyFear() {
  // Find the closest fear the player is in or near
  let closest = null;
  let closestDist = Infinity;
  fears.forEach(f => {
    if (f.removed || f.fading) return;
    const dx = playerX - f.x;
    const dy = playerY - f.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hitRadius = FEAR_RADIUS * f.scale + PLAYER_RADIUS + 30;
    if (dist < hitRadius && dist < closestDist) {
      closest = f;
      closestDist = dist;
    }
  });

  if (closest) {
    // Grow the blob
    closest.scale = Math.min(2.2, closest.scale + 0.45);
    closest.grown = true;
    closest.el.classList.add('game12-fear-grown');
    applyFearStyle(closest);
    setMessage('Fighting makes it stronger! Keep moving instead.');
  } else {
    setMessage("There's nothing to fight here. Just keep walking.");
  }

  // Slow and knock back the player
  const now = performance.now();
  slowUntil = now + SLOW_DURATION;
  // Knock back leftward
  playerX = Math.max(PLAYER_START_X, playerX - 30);
  updatePlayerEl();

  const p = getPlayer();
  if (p) {
    p.classList.add('game12-player-hurt');
    p.classList.add('game12-player-slowed');
    setTimeout(() => {
      if (p) p.classList.remove('game12-player-hurt');
    }, 400);
    setTimeout(() => {
      if (p) p.classList.remove('game12-player-slowed');
    }, SLOW_DURATION);
  }
}

// ─── Movement ────────────────────────────────────────────────────────────────

function updateMovement(dt) {
  if (won) return;

  const now       = performance.now();
  const isSlowed  = now < slowUntil;
  const speed     = PLAYER_SPEED * (isSlowed ? SLOW_FACTOR : 1) * 60 * dt;
  const endX      = boardWidth - MARGIN_X;

  if (keys['ArrowRight'] || keys['KeyD']) playerX += speed;
  if (keys['ArrowLeft']  || keys['KeyA']) playerX -= speed;
  if (keys['ArrowDown']  || keys['KeyS']) playerY += speed * 0.6;
  if (keys['ArrowUp']    || keys['KeyW']) playerY -= speed * 0.6;

  // Clamp horizontal
  playerX = Math.max(PLAYER_START_X, Math.min(endX - 2, playerX));
  // Clamp vertical to path area
  const halfPath = 56;
  const midY = BOARD_HEIGHT * 0.5;
  playerY = Math.max(midY - halfPath, Math.min(midY + halfPath, playerY));

  // Meter = horizontal progress from start to end
  const progress = (playerX - PLAYER_START_X) / (endX - PLAYER_START_X);
  setMeter(progress * 100);

  updatePlayerEl();

  // Win condition: reach end marker
  if (playerX >= endX - 4) {
    triggerWin();
  }
}

function updatePlayerEl() {
  const p = getPlayer();
  if (p) {
    p.style.left = playerX + 'px';
    p.style.top  = playerY + 'px';
  }
}

// ─── Sparks ──────────────────────────────────────────────────────────────────

function spawnSpark(x, y) {
  for (let i = 0; i < 4; i++) {
    const s = document.createElement('div');
    s.className = 'game12-spark';
    s.style.left = (x + randBetween(-12, 12)) + 'px';
    s.style.top  = (y + randBetween(-12, 12)) + 'px';
    gameBoard.appendChild(s);
    setTimeout(() => s.remove(), 650);
  }
}

// ─── Win ─────────────────────────────────────────────────────────────────────

function triggerWin() {
  won = true;
  cancelAnimationFrame(animId);
  setMeter(100);
  setMessage('You made it through. Acceptance is the final strength.');

  const overlay = document.createElement('div');
  overlay.className = 'game12-end';
  overlay.innerHTML = `
    <div class="game12-end-inner">
      <h2>You walked through.</h2>
      <p>The fears did not disappear — you simply stopped letting them stop you. Acceptance is not surrender. It is the courage to act despite discomfort.</p>
      <a class="link-button" href="index.html">Return to the labors</a>
    </div>
  `;
  gameBoard.appendChild(overlay);
}

// ─── Loop ────────────────────────────────────────────────────────────────────

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = timestamp;

  updateMovement(dt);
  checkFearInteraction(dt);

  if (!won) {
    animId = requestAnimationFrame(loop);
  }
}

// ─── Start ───────────────────────────────────────────────────────────────────

function start() {
  won        = false;
  playerX    = PLAYER_START_X;
  slowUntil  = 0;
  keys       = {};

  gameStart.classList.add('hidden');
  gameBoard.classList.remove('hidden');

  // Measure board actual width
  boardWidth = gameBoard.clientWidth || 600;
  playerY    = BOARD_HEIGHT * PLAYER_Y_RATIO;

  buildBoardStructure();
  spawnFears();
  setMeter(0);
  setMessage('Keep moving — walk through the words, don\'t fight them.');

  lastTime = performance.now();
  animId = requestAnimationFrame(loop);
}

// ─── Input ───────────────────────────────────────────────────────────────────

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space' && !won) {
    e.preventDefault();
    fightNearbyFear();
  }
  // Prevent page scroll with arrow keys while playing
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;
});

startButton.addEventListener('click', start);

// ─── Utilities ───────────────────────────────────────────────────────────────

function randBetween(a, b) { return a + Math.random() * (b - a); }

function shuffled(arr) {
  return arr
    .map(v => ({ v, s: Math.random() }))
    .sort((a, b) => a.s - b.s)
    .map(({ v }) => v);
}

// ─── Test hook ───────────────────────────────────────────────────────────────
if (window.location.search.includes('autostart=1')) start();
