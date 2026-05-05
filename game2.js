const thoughtLabels = [
  'press me',
  'fix me',
  'think about this',
  'click here',
  'solve me',
  'analyze me',
  'just one click',
  'figure it out',
  'don’t ignore',
  'check me',
  'reply now',
  'replay it'
];

const gumLayer = document.getElementById('gumLayer');
const peaceFill = document.getElementById('peaceFill');
const gameMessage = document.getElementById('gameMessage');
const startButton = document.getElementById('startButton');
const gameStart = document.getElementById('gameStart');
const gameBoard = document.getElementById('gameBoard');
const endOverlay = document.getElementById('endOverlay');

const SPAWN_BASE_MS = 1500;
const SPAWN_MIN_MS = 800;
const NATURAL_LIFE_MS = 5000;
const FADE_MS = 700;
const MAX_GUM = 22;
const WIN_TIME_MS = 25000;
const PEACE_LOSS_MS_PER_CLICK = 4500;
const MULTIPLY_ON_CLICK = 3;

let gum = [];
let nextId = 1;
let peace = 0;
let elapsed = 0;
let lastTs = 0;
let spawnTimer = 0;
let running = false;
let won = false;
let lastMessageStage = -1;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function pickThought() {
  return thoughtLabels[Math.floor(Math.random() * thoughtLabels.length)];
}

function spawnGum(x, y) {
  if (gum.length >= MAX_GUM) {
    return;
  }
  const item = {
    id: nextId++,
    x: x ?? rand(10, 90),
    y: y ?? rand(14, 86),
    rot: rand(-18, 18),
    age: 0,
    fading: false,
    el: null
  };
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'game2-gum game2-gum-spawning';
  el.style.left = `${item.x}%`;
  el.style.top = `${item.y}%`;
  el.style.setProperty('--rot', `${item.rot}deg`);
  el.textContent = pickThought();
  el.addEventListener('click', () => onClickGum(item));
  gumLayer.appendChild(el);
  item.el = el;
  gum.push(item);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.remove('game2-gum-spawning'));
  });
}

function fadeAndRemove(item) {
  if (item.fading) {
    return;
  }
  item.fading = true;
  item.el.classList.add('fading');
  setTimeout(() => {
    if (item.el && item.el.parentNode) {
      item.el.parentNode.removeChild(item.el);
    }
    gum = gum.filter(g => g.id !== item.id);
  }, FADE_MS);
}

function onClickGum(item) {
  if (!running || item.fading) {
    return;
  }
  for (let i = 0; i < MULTIPLY_ON_CLICK; i++) {
    const dx = rand(-14, 14);
    const dy = rand(-12, 12);
    const nx = Math.max(6, Math.min(94, item.x + dx));
    const ny = Math.max(8, Math.min(92, item.y + dy));
    spawnGum(nx, ny);
  }
  peace = Math.max(0, peace - PEACE_LOSS_MS_PER_CLICK);
  setMessage('Touching it makes it multiply. Pull back — let it pass.');
}

function setMessage(text) {
  gameMessage.textContent = text;
}

function updateMessageForProgress() {
  const ratio = peace / WIN_TIME_MS;
  let stage = 0;
  if (ratio > 0.66) stage = 2;
  else if (ratio > 0.33) stage = 1;
  if (stage !== lastMessageStage) {
    lastMessageStage = stage;
    if (stage === 0) {
      setMessage('Resist clicking. Sticky thoughts fade if you leave them alone.');
    } else if (stage === 1) {
      setMessage('Stay with it. They lose their grip when you don’t engage.');
    } else {
      setMessage('Almost there — the noise fades when you stop feeding it.');
    }
  }
}

function update(dt) {
  for (const item of gum) {
    if (item.fading) continue;
    item.age += dt;
    if (item.age >= NATURAL_LIFE_MS) {
      fadeAndRemove(item);
    }
  }

  spawnTimer -= dt;
  if (spawnTimer <= 0 && gum.length < MAX_GUM) {
    spawnGum();
    const ramp = Math.min(700, elapsed / 30);
    spawnTimer = Math.max(SPAWN_MIN_MS, SPAWN_BASE_MS - ramp);
  }

  const activeGum = gum.filter(g => !g.fading).length;
  const congestion = Math.max(0.25, 1 - activeGum / MAX_GUM);
  peace = Math.min(WIN_TIME_MS, peace + dt * congestion);
  elapsed += dt;

  peaceFill.style.width = `${Math.round((peace / WIN_TIME_MS) * 100)}%`;
  updateMessageForProgress();

  if (peace >= WIN_TIME_MS && !won) {
    won = true;
    running = false;
    endGame();
  }
}

function endGame() {
  setMessage('You let the thoughts pass. They lost their grip on their own.');
  endOverlay.textContent = 'You won. By not feeding the cycle, the gum lost its hold and faded.';
  endOverlay.classList.remove('hidden');
  for (const item of gum) {
    fadeAndRemove(item);
  }
}

function loop(ts) {
  if (!running) return;
  if (!lastTs) lastTs = ts;
  const dt = Math.min(100, ts - lastTs);
  lastTs = ts;
  update(dt);
  requestAnimationFrame(loop);
}

function start() {
  for (const item of gum) {
    if (item.el && item.el.parentNode) {
      item.el.parentNode.removeChild(item.el);
    }
  }
  gum = [];
  peace = 0;
  elapsed = 0;
  lastTs = 0;
  spawnTimer = 0;
  won = false;
  running = true;
  lastMessageStage = -1;

  gameStart.classList.add('hidden');
  gameBoard.classList.remove('hidden');
  endOverlay.classList.add('hidden');
  peaceFill.style.width = '0%';
  setMessage('Resist clicking. Sticky thoughts fade if you leave them alone.');

  spawnGum();
  spawnGum();
  requestAnimationFrame(loop);
}

if (startButton) {
  startButton.addEventListener('click', start);
} else {
  console.warn('Game 2 start button was not found.');
}
