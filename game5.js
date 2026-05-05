// Game 5 — Augean Dung / Inbox Burnout
// Lesson: Work smarter, not harder. Reorganize and focus on what matters.

// ── DOM refs ──────────────────────────────────────────────────────────────────
const startButton  = document.getElementById('startButton');
const gameStart    = document.getElementById('gameStart');
const gameBoard    = document.getElementById('gameBoard');
const emailList    = document.getElementById('emailList');
const emailCount   = document.getElementById('emailCount');
const filterBtn    = document.getElementById('filterBtn');
const meterFill    = document.getElementById('meterFill');
const gameMessage  = document.getElementById('gameMessage');

// ── Email pool ────────────────────────────────────────────────────────────────
const REAL_EMAILS = [
  { subject: 'Q3 review draft — please look over', sender: 'alex.morgan@company.com' },
  { subject: 'Lunch tomorrow?', sender: 'priya.k@company.com' },
  { subject: 'Project update: milestone reached', sender: 'sam.chen@company.com' },
  { subject: 'Team standup notes', sender: 'ops@company.com' },
  { subject: 'Your leave request approved', sender: 'hr@company.com' },
  { subject: 'Budget forecast — action needed', sender: 'finance@company.com' },
  { subject: 'Client call recap + next steps', sender: 'dana.r@company.com' },
  { subject: 'Feedback on your presentation', sender: 'boss@company.com' },
  { subject: 'Code review: PR #418', sender: 'github-noreply@company.com' },
  { subject: 'Design handoff ready', sender: 'ux.team@company.com' },
  { subject: 'Re: offsite planning', sender: 'jamie.l@company.com' },
  { subject: 'Your 1:1 notes from last week', sender: 'manager@company.com' },
];

const SPAM_EMAILS = [
  { subject: 'FREE iPhone — claim yours NOW!!!', sender: 'promo@win-instantly.biz' },
  { subject: 'Hot singles in your area', sender: 'noreply@datefast.net' },
  { subject: 'You have been selected for $5,000', sender: 'winner@cashgrant.co' },
  { subject: 'Lose 30 lbs in 3 days — guaranteed', sender: 'slim@fastresults.xyz' },
  { subject: 'Your account is SUSPENDED — act now', sender: 'security@bankk-alert.ru' },
  { subject: 'Make $9,000/week from home!!!', sender: 'income@workfromhome.biz' },
  { subject: 'URGENT: unclaimed package', sender: 'delivery@parcel-track.info' },
  { subject: 'Re: your inquiry (you never wrote)', sender: 'info@scam-corp.net' },
  { subject: 'Exclusive offer — limited time', sender: 'deals@super-savings.cc' },
  { subject: 'You are our lucky visitor #1000000', sender: 'prize@congratz.club' },
  { subject: 'Enlarge your productivity 😉', sender: 'tips@total-boost.biz' },
  { subject: 'Click to confirm your Netflix renewal', sender: 'billing@netfli-x.top' },
  { subject: 'Secret shopping opportunity inside', sender: 'survey@earncash.xyz' },
  { subject: 'IRS notice — respond in 24h', sender: 'irs-alert@irs-gov-notice.ru' },
];

// ── State ─────────────────────────────────────────────────────────────────────
let spawnInterval   = null;
let filterInterval  = null;
let timerInterval   = null;
let gameRunning     = false;
let filterActive    = false;
let filterShown     = false;
let elapsed         = 0;          // seconds since start
let sanity          = 100;        // 0-100
let emailIdCounter  = 0;
let emails          = [];         // { id, type:'spam'|'real', subject, sender, el }
let realKept        = 0;          // real emails that entered (never deleted by user)
let spawnDelay      = 2200;       // ms between spawns — decreases over time

const GAME_DURATION       = 30;   // seconds to survive
const FILTER_APPEAR_AT    = 10;   // seconds elapsed
const MAX_SPAM_TO_WIN     = 3;
const SANITY_DROP_PER_SPAM = 3;  // sanity lost per spam in inbox each tick
const SANITY_TICK_MS      = 800; // how often sanity recalculates
const SPAM_FILTER_CLEAR_MS = 1200; // how often filter sweeps spam

// ── Helpers ───────────────────────────────────────────────────────────────────
function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function initials(email) {
  const parts = email.split('@')[0].split(/[._-]/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : parts[0][1] || '')).toUpperCase();
}

function updateCountLabel() {
  const total = emails.length;
  const spamCount = emails.filter(e => e.type === 'spam').length;
  emailCount.textContent = `${total} message${total !== 1 ? 's' : ''} · ${spamCount} spam`;
}

function updateMeter() {
  sanity = Math.max(0, Math.min(100, sanity));
  meterFill.style.width = sanity + '%';
}

function setMessage(msg) {
  gameMessage.textContent = msg;
}

// ── Email rendering ───────────────────────────────────────────────────────────
function createEmailEl(emailObj) {
  const row = document.createElement('div');
  row.className = `game5-email game5-email-${emailObj.type}`;
  row.dataset.id = emailObj.id;

  const dot = document.createElement('div');
  dot.className = 'game5-dot';
  dot.textContent = initials(emailObj.sender);

  const body = document.createElement('div');
  body.className = 'game5-email-body';

  const subject = document.createElement('div');
  subject.className = 'game5-subject';
  subject.textContent = emailObj.subject;

  const sender = document.createElement('div');
  sender.className = 'game5-sender';
  sender.textContent = emailObj.sender;

  body.appendChild(subject);
  body.appendChild(sender);

  const badge = document.createElement('span');
  badge.className = 'game5-badge';
  badge.textContent = emailObj.type === 'spam' ? 'Spam' : 'Work';

  const deleteHint = document.createElement('span');
  deleteHint.className = 'game5-delete-hint';
  deleteHint.textContent = '✕';

  row.appendChild(dot);
  row.appendChild(body);
  row.appendChild(badge);
  row.appendChild(deleteHint);

  row.addEventListener('click', () => handleEmailClick(emailObj.id, emailObj.type, row));
  return row;
}

function spawnEmail() {
  if (!gameRunning) return;

  // Bias toward spam increasing with time: starts 50%, reaches ~80% by 25s
  const spamChance = Math.min(0.82, 0.50 + (elapsed / GAME_DURATION) * 0.38);
  const isSpam = Math.random() < spamChance;

  const pool = isSpam ? SPAM_EMAILS : REAL_EMAILS;
  const template = rand(pool);

  const emailObj = {
    id: ++emailIdCounter,
    type: isSpam ? 'spam' : 'real',
    subject: template.subject,
    sender: template.sender,
  };

  emails.unshift(emailObj); // prepend — newest at top
  const el = createEmailEl(emailObj);
  emailObj.el = el;
  emailList.prepend(el);

  updateCountLabel();

  // Cap inbox display size to avoid unbounded DOM growth
  while (emails.length > 40) {
    const oldest = emails.pop();
    oldest.el.remove();
  }
}

function handleEmailClick(id, type, rowEl) {
  if (!gameRunning) return;

  removeEmail(id, rowEl);

  if (type === 'spam') {
    sanity = Math.min(100, sanity + 6);
    setMessage('Good catch! Spam deleted.');
  } else {
    // Deleted a real email — small sanity penalty
    sanity = Math.max(0, sanity - 10);
    realKept = Math.max(0, realKept - 1);
    setMessage('Oops — that was a real email. Be careful!');
  }
  updateMeter();
}

function removeEmail(id, rowEl) {
  const idx = emails.findIndex(e => e.id === id);
  if (idx !== -1) emails.splice(idx, 1);
  rowEl.classList.add('game5-removing');
  setTimeout(() => rowEl.remove(), 280);
  updateCountLabel();
}

// ── Filter sweep ──────────────────────────────────────────────────────────────
function runFilterSweep() {
  if (!gameRunning || !filterActive) return;
  // Remove ~90% of spam currently in inbox
  const spamEmails = emails.filter(e => e.type === 'spam');
  const toRemove = spamEmails.filter(() => Math.random() < 0.90);
  toRemove.forEach(e => removeEmail(e.id, e.el));
  if (toRemove.length > 0) {
    sanity = Math.min(100, sanity + toRemove.length * 2);
    updateMeter();
  }
}

// ── Sanity tick ───────────────────────────────────────────────────────────────
function sanityTick() {
  if (!gameRunning) return;
  const spamCount = emails.filter(e => e.type === 'spam').length;
  // Each spam in inbox drains sanity; filter active = bonus buffer
  const drain = spamCount * SANITY_DROP_PER_SPAM * (filterActive ? 0.15 : 1);
  sanity = Math.max(0, sanity - drain);
  updateMeter();

  if (sanity <= 0) {
    endGame(false, 'Your inbox collapsed under the weight of unfiltered spam.');
  }
}

// ── Game timer ────────────────────────────────────────────────────────────────
function gameTick() {
  elapsed++;

  // Reveal Filter button at 10s
  if (elapsed === FILTER_APPEAR_AT && !filterShown) {
    filterShown = true;
    filterBtn.classList.remove('hidden');
    filterBtn.classList.add('appearing');
    setMessage('A Filter button appeared! Activate it to auto-clear spam.');
  }

  // Speed up spawn rate over time (floor at 600ms)
  if (elapsed % 4 === 0) {
    spawnDelay = Math.max(600, spawnDelay - 180);
    restartSpawnInterval();
  }

  // Win check at end of 30s
  if (elapsed >= GAME_DURATION) {
    const spamRemaining = emails.filter(e => e.type === 'spam').length;
    if (filterActive && spamRemaining <= MAX_SPAM_TO_WIN) {
      endGame(true);
    } else if (!filterActive) {
      endGame(false, 'You survived without using the Filter — but burned out! Smart tools exist for a reason.');
    } else {
      endGame(false, `Too much spam left (${spamRemaining}). Keep using the Filter!`);
    }
  }

  // Intermediate messages
  if (elapsed === 6) {
    setMessage('It\'s getting harder to keep up manually...');
  } else if (elapsed === 14 && filterActive) {
    setMessage('Filter is working! Focus on the real emails now.');
  } else if (elapsed === 20 && filterActive) {
    setMessage('Almost there — just a few more seconds!');
  }
}

function restartSpawnInterval() {
  clearInterval(spawnInterval);
  spawnInterval = setInterval(spawnEmail, spawnDelay);
}

// ── Filter activation ─────────────────────────────────────────────────────────
function activateFilter() {
  if (filterActive) return;
  filterActive = true;
  filterBtn.classList.add('active');
  filterBtn.textContent = '✓ Filter Active';
  filterBtn.disabled = true;
  setMessage('Filter activated! It\'s handling the spam automatically. Focus on what matters.');
  sanity = Math.min(100, sanity + 15);
  updateMeter();
  // Immediate sweep
  runFilterSweep();
  // Recurring sweep
  filterInterval = setInterval(runFilterSweep, SPAM_FILTER_CLEAR_MS);
}

// ── End game ──────────────────────────────────────────────────────────────────
function endGame(won, failMsg) {
  gameRunning = false;
  clearInterval(spawnInterval);
  clearInterval(filterInterval);
  clearInterval(timerInterval);

  const spamLeft = emails.filter(e => e.type === 'spam').length;

  const overlay = document.createElement('div');
  overlay.className = 'game5-end';

  const inner = document.createElement('div');
  inner.className = 'game5-end-inner';

  const h2 = document.createElement('h2');
  const p  = document.createElement('p');

  if (won) {
    h2.textContent = 'Inbox Tamed!';
    p.textContent = 'The Filter did the heavy lifting, leaving you to focus on what truly matters. Working smarter — not harder — is the real labor of the modern hero.';
    meterFill.style.width = '100%';
    setMessage('You won! The Filter changed everything.');
  } else {
    h2.textContent = 'Overwhelmed';
    p.textContent = failMsg || 'The flood of spam took over. Next time, activate the Filter early and redirect your energy where it counts.';
    setMessage('Try again — and remember the Filter!');
  }

  inner.appendChild(h2);
  inner.appendChild(p);
  overlay.appendChild(inner);
  gameBoard.appendChild(overlay);
}

// ── Start ─────────────────────────────────────────────────────────────────────
function start() {
  // Reset state
  emails          = [];
  emailIdCounter  = 0;
  elapsed         = 0;
  sanity          = 85;
  filterActive    = false;
  filterShown     = false;
  spawnDelay      = 2200;
  realKept        = 0;
  gameRunning     = true;

  // Reset DOM
  gameStart.classList.add('hidden');
  gameBoard.classList.remove('hidden');
  emailList.innerHTML = '';
  emailCount.textContent = '0 messages';
  filterBtn.classList.add('hidden');
  filterBtn.classList.remove('active', 'appearing');
  filterBtn.textContent = '⚡ Activate Filter';
  filterBtn.disabled = false;
  meterFill.style.width = sanity + '%';

  // Remove any previous end overlay
  const old = gameBoard.querySelector('.game5-end');
  if (old) old.remove();

  setMessage('Click spam emails to delete them before they pile up.');

  // Start intervals
  restartSpawnInterval();
  timerInterval = setInterval(() => {
    sanityTick();
    gameTick();
  }, 1000);
}

// ── Event listeners ───────────────────────────────────────────────────────────
startButton.addEventListener('click', start);
filterBtn.addEventListener('click', activateFilter);

if (window.location.search.includes('autostart=1')) start();
