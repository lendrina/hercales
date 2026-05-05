/* ── Game 6 — Stymphalian Birds / Information Overload ── */

// DOM refs
const meterFill   = document.getElementById('meterFill');
const gameMessage = document.getElementById('gameMessage');
const startButton = document.getElementById('startButton');
const gameStart   = document.getElementById('gameStart');
const gameBoard   = document.getElementById('gameBoard');

// ── Interviewer data ──────────────────────────────────────
const INTERVIEWERS = [
  {
    id: 0,
    emoji: '👩‍💼',
    name: 'Sarah Chen',
    role: 'Hiring Manager',
    questions: [
      'Tell me about a challenge you overcame.',
      'Describe a time you led a project under pressure.',
      'What motivates you to do your best work?'
    ]
  },
  {
    id: 1,
    emoji: '🧑‍💻',
    name: 'Marcus Webb',
    role: 'Tech Lead',
    questions: [
      'Why our company specifically?',
      'How do you approach a problem you\'ve never seen before?',
      'Walk me through how you handle technical debt.'
    ]
  },
  {
    id: 2,
    emoji: '👨‍🏫',
    name: 'Priya Anand',
    role: 'Culture & People',
    questions: [
      'Where do you see yourself in five years?',
      'How do you handle feedback you disagree with?',
      'Tell me about a time you collaborated with a difficult colleague.'
    ]
  }
];

// ── Fill time per panel (ms) — finish in ~60 s total ──────
const FILL_PER_TICK_MS  = 80;   // tick interval
const FILL_PER_TICK_PCT = 1.5;  // % added per tick while active → ~5.3 s per panel

// ── Question rotation interval ────────────────────────────
const QUESTION_ROTATE_MS = 6000;

// ── State ─────────────────────────────────────────────────
let panels        = [];        // per-panel state: { progress, done, qIndex, el, barFill, barLabel }
let activePanel   = null;      // index of currently focused panel (null = none)
let loopHandle    = null;      // setInterval handle for progress tick
let questionTimer = null;      // setInterval handle for question rotation
let gameRunning   = false;

// ── Build the board ───────────────────────────────────────
function buildBoard() {
  gameBoard.innerHTML = '';
  panels = INTERVIEWERS.map((iv) => {
    const el = document.createElement('div');
    el.className = 'game6-panel game6-idle';
    el.innerHTML = `
      <div class="game6-active-dot"></div>
      <div class="game6-done-badge">✓</div>
      <div class="game6-avatar-row">
        <div class="game6-avatar">${iv.emoji}</div>
        <div>
          <div class="game6-name">${iv.name}</div>
          <div class="game6-role">${iv.role}</div>
        </div>
      </div>
      <div class="game6-question">${iv.questions[0]}</div>
      <div class="game6-bar-wrap">
        <div class="game6-bar-label">
          <span>Answer progress</span>
          <span class="game6-pct-label">0%</span>
        </div>
        <div class="game6-bar-track">
          <div class="game6-bar-fill"></div>
        </div>
      </div>
    `;
    gameBoard.appendChild(el);

    const state = {
      progress:   0,
      done:       false,
      qIndex:     0,
      el,
      barFill:    el.querySelector('.game6-bar-fill'),
      barLabel:   el.querySelector('.game6-pct-label'),
      questionEl: el.querySelector('.game6-question')
    };

    el.addEventListener('click', () => focusPanel(iv.id));
    return state;
  });
}

// ── Focus a panel ─────────────────────────────────────────
function focusPanel(id) {
  if (!gameRunning) return;
  const panel = panels[id];
  if (panel.done) return;      // already finished
  if (activePanel === id) return; // already active

  // Reset the previously active panel
  if (activePanel !== null && !panels[activePanel].done) {
    const prev = panels[activePanel];
    prev.progress = 0;
    prev.barFill.style.width = '0%';
    prev.barLabel.textContent = '0%';
    setClass(prev.el, 'game6-idle');
    gameMessage.textContent = `You lost your train of thought with ${INTERVIEWERS[activePanel].name}. Their answer reset.`;
  }

  activePanel = id;
  setClass(panel.el, 'game6-active');
  gameMessage.textContent = `Focusing on ${INTERVIEWERS[id].name}. Keep going — don't switch!`;
}

// ── Replace panel state class ─────────────────────────────
function setClass(el, state) {
  el.classList.remove('game6-idle', 'game6-active', 'game6-done');
  el.classList.add(state);
}

// ── Main progress tick ────────────────────────────────────
function tick() {
  if (!gameRunning) return;
  if (activePanel === null) return;

  const panel = panels[activePanel];
  if (panel.done) return;

  panel.progress = Math.min(100, panel.progress + FILL_PER_TICK_PCT);
  const pct = Math.round(panel.progress);
  panel.barFill.style.width = pct + '%';
  panel.barLabel.textContent = pct + '%';

  // Update global Composure meter
  updateComposure();

  if (panel.progress >= 100) {
    panel.done = true;
    setClass(panel.el, 'game6-done');
    activePanel = null;
    gameMessage.textContent = `Great answer to ${INTERVIEWERS[panels.indexOf(panel)].name}! Move on to the next interviewer.`;

    // Check win
    if (panels.every(p => p.done)) {
      win();
    }
  }
}

// ── Composure meter = average of all panel progress ───────
function updateComposure() {
  const total = panels.reduce((sum, p) => sum + p.progress, 0);
  const avg   = total / panels.length;
  meterFill.style.width = avg + '%';
}

// ── Rotate questions on idle/active panels ────────────────
function rotateQuestions() {
  panels.forEach((panel, i) => {
    if (panel.done) return;
    if (i === activePanel) return; // don't distract while active
    const iv = INTERVIEWERS[i];
    panel.qIndex = (panel.qIndex + 1) % iv.questions.length;
    panel.questionEl.textContent = iv.questions[panel.qIndex];
  });
}

// ── Win ───────────────────────────────────────────────────
function win() {
  gameRunning = false;
  clearInterval(loopHandle);
  clearInterval(questionTimer);
  loopHandle    = null;
  questionTimer = null;

  meterFill.style.width = '100%';
  gameMessage.textContent = 'You aced all three interviews by staying focused!';

  const overlay = document.createElement('div');
  overlay.className = 'game6-end';
  overlay.innerHTML = `
    <div>
      <h2>Interviews Complete!</h2>
      <p>By finishing one conversation before moving on, you kept your composure and delivered thoughtful answers. Focused attention makes even the most chaotic situations manageable.</p>
    </div>
  `;
  gameBoard.appendChild(overlay);
}

// ── Start ─────────────────────────────────────────────────
function start() {
  // Hide start panel, show board
  gameStart.classList.add('hidden');
  gameBoard.classList.remove('hidden');

  // Reset state
  clearInterval(loopHandle);
  clearInterval(questionTimer);
  activePanel  = null;
  gameRunning  = true;

  // Remove any lingering win overlay
  const existing = gameBoard.querySelector('.game6-end');
  if (existing) existing.remove();

  // Reset meter
  meterFill.style.width = '0%';
  gameMessage.textContent = 'Click a panel to focus on that interviewer. Finish one before switching!';

  buildBoard();

  loopHandle    = setInterval(tick, FILL_PER_TICK_MS);
  questionTimer = setInterval(rotateQuestions, QUESTION_ROTATE_MS);
}

// ── Wire start button ─────────────────────────────────────
startButton.addEventListener('click', start);

// ── Autostart hook ────────────────────────────────────────
if (window.location.search.includes('autostart=1')) start();
