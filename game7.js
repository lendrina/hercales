/* ============================================================
   Game 7 — Cretan Bull / Emotional Overload
   Lesson: Accept emotions; control your actions, not the chaos.
   ============================================================ */

// DOM refs
const startButton  = document.getElementById('startButton');
const gameStart    = document.getElementById('gameStart');
const gameBoard    = document.getElementById('gameBoard');
const gameTable    = document.getElementById('gameTable');
const gameCup      = document.getElementById('gameCup');
const gameWater    = document.getElementById('gameWater');
const meterFill    = document.getElementById('meterFill');
const gameMessage  = document.getElementById('gameMessage');
const gameEnd      = document.getElementById('gameEnd');
const gameControls = document.getElementById('gameControls');
const btnLegs      = document.getElementById('btnLegs');
const btnHold      = document.getElementById('btnHold');
const btnFeet      = document.getElementById('btnFeet');
const btnLift      = document.getElementById('btnLift');

// Game state
let waterLevel   = 0.72;   // 0–1
let lifted       = false;
let gameRunning  = false;
let loopId       = null;
let dropTimer    = null;
let redHerringCount = 0;

// Red-herring flavour messages
const redMessages = [
  'The legs are tight — the table keeps shaking anyway.',
  'You press down hard. It rattles more than ever.',
  'Your feet are planted, yet the trembling continues.',
  'Nothing changes. The table has a will of its own.',
  'Tighter, harder, more effort — still shaking.',
  'You can\'t stop what isn\'t yours to control.',
];

function setWater(level) {
  waterLevel = Math.max(0, Math.min(1, level));
  const pct = Math.round(waterLevel * 100);
  gameWater.style.height = pct + '%';
  meterFill.style.width  = pct + '%';
}

function spawnDrop() {
  if (lifted || !gameRunning) return;

  // Position drop near the cup which is on the table
  const cup = gameCup;
  const board = gameBoard;
  const cupRect  = cup.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();

  const drop = document.createElement('div');
  drop.className = 'game7-drop';

  const relLeft = cupRect.left - boardRect.left + Math.random() * cupRect.width;
  const relTop  = cupRect.top  - boardRect.top  + cupRect.height * 0.5;

  drop.style.left = relLeft + 'px';
  drop.style.top  = relTop  + 'px';
  board.appendChild(drop);

  drop.addEventListener('animationend', () => drop.remove());
}

function tick() {
  if (!gameRunning) return;

  if (!lifted) {
    // Water spills: lose ~1% every tick (tick = 80ms → ~12.5%/s but only on spill ticks)
    setWater(waterLevel - 0.008);

    if (waterLevel <= 0) {
      gameMessage.textContent = 'The cup is empty. The table won\'t stop — try something else.';
      // Reset water so the player can try again without restarting
      setWater(0.72);
    }
  } else {
    // Cup is held — slowly refill
    setWater(waterLevel + 0.012);

    if (waterLevel >= 1) {
      win();
      return;
    }
  }

  loopId = setTimeout(tick, 80);
}

function startDrops() {
  if (dropTimer) return;
  dropTimer = setInterval(() => {
    if (!lifted && gameRunning) spawnDrop();
  }, 300);
}

function stopDrops() {
  clearInterval(dropTimer);
  dropTimer = null;
}

function win() {
  gameRunning = false;
  clearTimeout(loopId);
  stopDrops();

  meterFill.style.width = '100%';
  gameMessage.textContent = 'The water is steady. You controlled what was yours all along.';
  gameEnd.classList.remove('hidden');
  gameControls.style.visibility = 'hidden';
}

function liftCup() {
  if (!gameRunning) return;

  if (!lifted) {
    // Lift: detach from table shaking
    lifted = true;
    gameCup.classList.add('lifted');
    gameTable.classList.remove('shaking');
    btnLift.textContent = 'Lower the cup';
    btnLift.classList.add('holding');
    gameMessage.textContent = 'You\'re holding the cup. The trembling has no reach here — the water is settling.';
  } else {
    // Lower back
    lifted = false;
    gameCup.classList.remove('lifted');
    gameTable.classList.add('shaking');
    btnLift.textContent = 'Lift the cup';
    btnLift.classList.remove('holding');
    gameMessage.textContent = 'Back on the table — the spilling resumes. Maybe keeping it lifted is the answer.';
  }
}

function redHerring(label) {
  if (!gameRunning || lifted) return;
  redHerringCount++;
  const msg = redMessages[Math.min(redHerringCount - 1, redMessages.length - 1)];
  gameMessage.textContent = msg;

  // Brief visual jolt: shake slightly harder
  gameTable.style.animationDuration = '0.28s';
  setTimeout(() => { gameTable.style.animationDuration = ''; }, 600);
}

function start() {
  // Reset state
  lifted       = false;
  gameRunning  = true;
  redHerringCount = 0;
  clearTimeout(loopId);
  stopDrops();

  // Reset DOM
  gameCup.classList.remove('lifted');
  gameTable.classList.add('shaking');
  gameEnd.classList.add('hidden');
  gameControls.style.visibility = '';
  btnLift.textContent = 'Lift the cup';
  btnLift.classList.remove('holding');
  setWater(0.72);
  gameMessage.textContent = 'The table is rattling. Water is spilling. Try something.';

  // Show board
  gameStart.classList.add('hidden');
  gameBoard.classList.remove('hidden');

  // Begin loops
  startDrops();
  loopId = setTimeout(tick, 80);
}

// Wire up buttons
startButton.addEventListener('click', start);
btnLift.addEventListener('click', liftCup);
gameCup.addEventListener('click', liftCup);
btnLegs.addEventListener('click', () => redHerring('legs'));
btnHold.addEventListener('click', () => redHerring('hold'));
btnFeet.addEventListener('click', () => redHerring('feet'));

// Required test hook
if (window.location.search.includes('autostart=1')) start();
