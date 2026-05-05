/* ── Game 10 — Cattle of Geryon / Productivity Loop ── */

// DOM refs
const startButton  = document.getElementById('startButton');
const gameStart    = document.getElementById('gameStart');
const gameBoard    = document.getElementById('gameBoard');
const meterFill    = document.getElementById('meterFill');
const gameMessage  = document.getElementById('gameMessage');

// task label pool
const TASK_LABELS = [
  'Reply to all',
  'Update the doc',
  'Sync meeting notes',
  'Triage the backlog',
  'Review open PRs',
  'Respond to Slack',
  'Update the roadmap',
  'Schedule a sync',
  'File the report',
  'Clarify requirements',
  'Follow up on emails',
  'Log time entries',
  'Ping the stakeholders',
  'Rewrite the summary',
  'Archive old tickets',
  'Check analytics',
  'Approve the draft',
  'Prepare slides',
  'Consolidate feedback',
  'Close stale issues',
  'Send the recap',
  'Update task status',
  'Forward the agenda',
  'Delegate to team',
];

// state
let score         = 0;
let taskIdSeq     = 0;
let tasks         = [];          // [{id, label}]
let intervalId    = null;        // spawn-loop interval
let meterTimer    = null;        // awareness tick
let awareness     = 0;           // 0-100
let finishShown   = false;
let gameOver      = false;
let spawnDelay    = 3000;        // ms between new card spawns (decreases over time)
let spawnTimerId  = null;

// ── helpers ────────────────────────────────────────────

function pickLabel() {
  return TASK_LABELS[Math.floor(Math.random() * TASK_LABELS.length)];
}

function setMessage(msg) {
  gameMessage.textContent = msg;
}

function updateMeter(pct) {
  meterFill.style.width = pct + '%';
}

// ── rendering ─────────────────────────────────────────

function renderBoard() {
  // Keep score badge and finish button; only rebuild the task list.
  let list = gameBoard.querySelector('.game10-task-list');
  if (!list) return;

  list.innerHTML = '';
  tasks.forEach(task => {
    const card = document.createElement('div');
    card.className = 'game10-task';
    card.dataset.id = task.id;

    const label = document.createElement('span');
    label.className = 'game10-task-text';
    label.textContent = task.label;

    const btn = document.createElement('button');
    btn.className = 'game10-task-btn';
    btn.textContent = 'Done ✓';
    btn.type = 'button';
    btn.addEventListener('click', () => completeTask(task.id));

    card.appendChild(label);
    card.appendChild(btn);
    list.appendChild(card);
  });

  // auto-scroll to bottom so new cards are visible
  list.scrollTop = list.scrollHeight;
}

function updateScoreBadge() {
  const badge = gameBoard.querySelector('.game10-score');
  if (!badge) return;
  badge.textContent = score;
  badge.classList.add('game10-score-bump');
  setTimeout(() => badge.classList.remove('game10-score-bump'), 200);
}

// ── task lifecycle ─────────────────────────────────────

function spawnTask(count = 1) {
  if (gameOver) return;
  for (let i = 0; i < count; i++) {
    tasks.push({ id: taskIdSeq++, label: pickLabel() });
  }
  renderBoard();
}

function completeTask(id) {
  if (gameOver) return;

  // remove from list
  tasks = tasks.filter(t => t.id !== id);
  score += 10;
  updateScoreBadge();
  renderBoard();

  // spawn 1 or 2 replacement cards
  const extra = Math.random() < 0.4 ? 2 : 1;
  spawnTask(extra);

  // accelerate spawn loop
  spawnDelay = Math.max(700, spawnDelay * 0.92);
  resetSpawnTimer();

  setMessage(
    score < 40
      ? 'Great job! Keep going — the inbox is almost clear…'
      : score < 100
      ? 'You\'re so productive! But there\'s always more…'
      : 'The score keeps climbing. Does it feel like enough?'
  );
}

function resetSpawnTimer() {
  if (spawnTimerId) clearTimeout(spawnTimerId);
  spawnTimerId = setTimeout(function tick() {
    if (gameOver) return;
    spawnTask(1);
    spawnTimerId = setTimeout(tick, spawnDelay);
  }, spawnDelay);
}

// ── awareness meter tick ───────────────────────────────

function startMeterTick() {
  meterTimer = setInterval(() => {
    if (gameOver) return;
    awareness = Math.min(92, awareness + 1.4); // never quite hits 100 on its own
    updateMeter(Math.round(awareness));
  }, 800);
}

// ── finish-button reveal ───────────────────────────────

function showFinishButton() {
  if (finishShown) return;
  finishShown = true;
  const btn = gameBoard.querySelector('.game10-finish');
  if (btn) btn.classList.add('game10-finish-visible');
}

// ── win ───────────────────────────────────────────────

function win() {
  if (gameOver) return;
  gameOver = true;

  clearTimeout(spawnTimerId);
  clearInterval(meterTimer);

  awareness = 100;
  updateMeter(100);

  // overlay
  const overlay = document.createElement('div');
  overlay.className = 'game10-end';
  overlay.innerHTML = `
    <h3>You stepped back.</h3>
    <p>Your score was <strong>${score}</strong> — but it never mattered.</p>
    <p>The tasks would never have ended. The only meaningful move was to <em>stop</em> and choose what's real.</p>
    <p style="color:#5fd4e1;font-weight:700;margin-top:0.8rem;">Shift from achievement to meaning.</p>
  `;
  gameBoard.appendChild(overlay);

  setMessage('Awareness complete. The inbox can wait.');
}

// ── start ─────────────────────────────────────────────

function start() {
  // reset state
  score        = 0;
  taskIdSeq    = 0;
  tasks        = [];
  awareness    = 0;
  finishShown  = false;
  gameOver     = false;
  spawnDelay   = 3000;

  clearTimeout(spawnTimerId);
  clearInterval(meterTimer);

  // switch panels
  gameStart.classList.add('hidden');
  gameBoard.classList.remove('hidden');

  // build board scaffold
  gameBoard.innerHTML = `
    <span class="game10-score-label">SCORE</span>
    <span class="game10-score">0</span>
    <div class="game10-task-list"></div>
    <button class="game10-finish" id="finishBtn" type="button">Finish</button>
  `;

  document.getElementById('finishBtn').addEventListener('click', win);

  updateMeter(0);
  setMessage('The tasks keep coming. Click "Done" to clear them.');

  // seed 3 initial cards
  spawnTask(3);

  // start auto-spawn
  resetSpawnTimer();

  // start awareness meter
  startMeterTick();

  // reveal finish button after ~13 seconds
  setTimeout(showFinishButton, 13000);
}

// ── wire up start button ───────────────────────────────

startButton.addEventListener('click', start);

// ── autostart hook (required) ─────────────────────────
if (window.location.search.includes('autostart=1')) start();
