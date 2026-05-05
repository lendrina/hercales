/* ── Game 9: Belt of Hippolyta / External Validation ── */

const meterFill    = document.getElementById('meterFill');
const gameMessage  = document.getElementById('gameMessage');
const startButton  = document.getElementById('startButton');
const gameStart    = document.getElementById('gameStart');
const gameBoard    = document.getElementById('gameBoard');

// ── Data ────────────────────────────────────────────────

const VALUES = [
  {
    id: 'honesty',
    label: 'Honesty',
    emoji: '🗣️',
    valueAction: 'Speak your truth clearly',
    pleaseActions: ['Agree to keep the peace', 'Stay silent to avoid drama'],
  },
  {
    id: 'courage',
    label: 'Courage',
    emoji: '⚔️',
    valueAction: 'Take the bold step forward',
    pleaseActions: ['Hesitate to avoid criticism', 'Change your plan to please them'],
  },
  {
    id: 'kindness',
    label: 'Kindness',
    emoji: '🌿',
    valueAction: 'Offer genuine care to someone',
    pleaseActions: ['Overextend to earn approval', 'Do favors to win their vote'],
  },
];

const NPC_DEFS = [
  { id: 'a', name: 'The Critic',    cssClass: 'npc-a', emoji: '😤' },
  { id: 'b', name: 'The Crowd',     cssClass: 'npc-b', emoji: '📣' },
  { id: 'c', name: 'The Flatterer', cssClass: 'npc-c', emoji: '😇' },
];

const NPC_DEMANDS = [
  ['Do more!', 'Be louder!', 'Try harder!'],
  ["Don't be so bold!", 'Tone it down!', 'Nobody asked you!'],
  ['Just agree with us!', 'Give us what we want!', 'Stop thinking so much!'],
  ['Be more like them!', 'Change yourself!', 'Start over!'],
  ['Prove yourself!', 'Show some results!', 'Where is the belt?!'],
  ['You call that an effort?', 'Not good enough!', 'Disappoint…'],
];

// ── State ────────────────────────────────────────────────

let integrity   = 0;   // 0–100 (win meter)
let approval    = 50;  // 0–100 (decoy meter)
let chosenValue = null;
let demandTimer = null;
let gameOver    = false;

// DOM refs created at runtime
let approvalFillEl = null;
let npcBubbles     = {};

// ── Helpers ──────────────────────────────────────────────

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function setMeter(pct) {
  meterFill.style.width = clamp(pct, 0, 100) + '%';
}

function setApproval(pct) {
  approval = clamp(pct, 0, 100);
  if (approvalFillEl) approvalFillEl.style.width = approval + '%';
}

// ── Build the board DOM ───────────────────────────────────

function buildBoard(value) {
  gameBoard.innerHTML = '';

  // ── NPC row ──
  const npcRow = document.createElement('div');
  npcRow.className = 'game9-npc-row';

  NPC_DEFS.forEach(npc => {
    const col = document.createElement('div');
    col.className = 'game9-npc';

    const avatar = document.createElement('div');
    avatar.className = `game9-npc-avatar ${npc.cssClass}`;
    avatar.textContent = npc.emoji;

    const name = document.createElement('div');
    name.className = 'game9-npc-name';
    name.textContent = npc.name;

    const bubble = document.createElement('div');
    bubble.className = 'game9-bubble';
    bubble.textContent = '…';
    npcBubbles[npc.id] = bubble;

    col.appendChild(avatar);
    col.appendChild(name);
    col.appendChild(bubble);
    npcRow.appendChild(col);
  });

  gameBoard.appendChild(npcRow);

  // ── Approval meter (decoy) ──
  const approvalArea = document.createElement('div');
  approvalArea.className = 'game9-approval-area';

  const approvalLabel = document.createElement('div');
  approvalLabel.className = 'game9-approval-label';
  approvalLabel.textContent = 'Crowd Approval (decoy)';

  const approvalBar = document.createElement('div');
  approvalBar.className = 'game9-approval-bar';

  approvalFillEl = document.createElement('div');
  approvalFillEl.className = 'game9-approval-fill';
  approvalFillEl.style.width = approval + '%';

  approvalBar.appendChild(approvalFillEl);
  approvalArea.appendChild(approvalLabel);
  approvalArea.appendChild(approvalBar);
  gameBoard.appendChild(approvalArea);

  // ── Action buttons ──
  const actionRow = document.createElement('div');
  actionRow.className = 'game9-action-row';

  // Value-aligned action (always first)
  const valueBtn = document.createElement('button');
  valueBtn.type = 'button';
  valueBtn.className = 'game9-action-btn game9-value-action';
  valueBtn.textContent = `${value.emoji} ${value.label}: ${value.valueAction}`;
  valueBtn.addEventListener('click', () => handleAction('value'));
  actionRow.appendChild(valueBtn);

  // Please-the-crowd actions
  value.pleaseActions.forEach((label, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'game9-action-btn game9-please-action';
    btn.textContent = label;
    btn.addEventListener('click', () => handleAction('please', i));
    actionRow.appendChild(btn);
  });

  gameBoard.appendChild(actionRow);
}

// ── NPC demand rotation ───────────────────────────────────

function rotateDemands() {
  if (gameOver) return;

  // Assign a fresh random demand to each NPC
  NPC_DEFS.forEach(npc => {
    const set = pickRandom(NPC_DEMANDS);
    npcBubbles[npc.id].textContent = pickRandom(set);
  });

  // Wiggle approval to feel alive even when player does nothing
  const wiggle = (Math.random() - 0.5) * 20;
  setApproval(approval + wiggle);
}

// ── Action handler ────────────────────────────────────────

function handleAction(type) {
  if (gameOver) return;

  if (type === 'value') {
    integrity = clamp(integrity + 14, 0, 100);
    // Approval drops a bit — crowds don't love authenticity
    setApproval(approval - 12 + Math.random() * 8);
    setMeter(integrity);
    gameMessage.textContent = 'Your Integrity grows. The crowd grumbles — that is the price.';
    if (integrity >= 100) { win(); return; }
  } else {
    // Pleasing someone: approval spikes, integrity stalls or falls
    const approvalGain = 18 + Math.random() * 14;
    setApproval(approval + approvalGain);
    integrity = clamp(integrity - 6, 0, 100);
    setMeter(integrity);
    gameMessage.textContent = 'The crowd cheers briefly… but your Integrity slips. Who are you doing this for?';
  }

  // Refresh NPC bubbles after each action for immediate feedback
  rotateDemands();
}

// ── Win ───────────────────────────────────────────────────

function win() {
  gameOver = true;
  clearInterval(demandTimer);
  setMeter(100);

  const overlay = document.createElement('div');
  overlay.className = 'game9-end';
  overlay.innerHTML = `
    <strong>You earned the Belt of Hippolyta!</strong>
    The crowd never agreed — but your Integrity held.<br>
    Acting on your values, not others' approval, is what moves you forward.
  `;
  gameBoard.appendChild(overlay);
  gameMessage.textContent = 'Victory! The belt belongs to those who stay true to themselves.';
}

// ── Value selection screen ────────────────────────────────

function showValuePicker() {
  gameBoard.innerHTML = '';

  const heading = document.createElement('p');
  heading.className = 'game9-pick-heading';
  heading.textContent = 'Choose your core value to carry into battle:';
  gameBoard.appendChild(heading);

  const picker = document.createElement('div');
  picker.className = 'game9-value-picker';

  VALUES.forEach(v => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'game9-value-btn';
    btn.textContent = `${v.emoji} ${v.label}`;
    btn.addEventListener('click', () => beginWithValue(v));
    picker.appendChild(btn);
  });

  gameBoard.appendChild(picker);
}

// ── Begin after value chosen ──────────────────────────────

function beginWithValue(value) {
  chosenValue = value;
  integrity   = 0;
  approval    = 50;
  gameOver    = false;
  npcBubbles  = {};

  setMeter(0);
  buildBoard(value);
  rotateDemands();

  gameMessage.textContent = `You carry ${value.label}. The judges are watching — stay the course.`;

  clearInterval(demandTimer);
  demandTimer = setInterval(rotateDemands, 3000);
}

// ── start() — entry point required by spec ────────────────

function start() {
  gameStart.classList.add('hidden');
  gameBoard.classList.remove('hidden');
  showValuePicker();
  gameMessage.textContent = 'Pick a core value to begin.';
}

// ── Boot ──────────────────────────────────────────────────

startButton.addEventListener('click', start);

if (window.location.search.includes('autostart=1')) start();
