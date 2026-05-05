const actionItems = [
  'Take a deep breath',
  'Write down one small goal',
  'Choose a next healthy step',
  'Notice one strength',
  'Reach out for support',
  'Focus on what you can control',
  'Practice one kind word',
  'Celebrate a small win',
  'Pause and stay grounded',
  'Keep doing the work'
];

const thoughtItems = [
  'you’re not good enough',
  'you’ll fail',
  'it’s pointless',
  'nobody cares',
  'you can’t change',
  'give up now',
  'you don’t deserve it',
  'you should stop',
  'what’s the use',
  'this is too much'
];

const clarityFill = document.getElementById('clarityFill');
const fogLayer = document.getElementById('fogLayer');
const tileGrid = document.getElementById('tileGrid');
const gameMessage = document.getElementById('gameMessage');
const startButton = document.getElementById('startButton');
const gameStart = document.getElementById('gameStart');
const gameBoard = document.getElementById('gameBoard');

let clarity = 0.22;
let actionsCompleted = 0;
const totalActions = 8;
let boardItems = [];
let remainingActions = [];
let availableThoughts = [];
let gameStarted = false;

function shuffle(array) {
  return array
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function initializeGame() {
  clarity = 0.22;
  actionsCompleted = 0;
  remainingActions = shuffle(actionItems).slice(5);
  const initialActions = shuffle(actionItems).slice(0, 5).map(text => ({ type: 'action', text }));
  availableThoughts = shuffle(thoughtItems).slice(5);
  boardItems = shuffle([
    ...initialActions,
    ...shuffle(thoughtItems).slice(0, 5).map(text => ({ type: 'thought', text }))
  ]);
  gameStarted = true;
  gameStart.classList.add('hidden');
  updateFog();
  updateMeter();
  renderBoard();
  updateMessage('Focus on meaningful actions; the thoughts only make the glass messier.');
}

function updateFog() {
  const fogOpacity = Math.max(0, Math.min(1, 1 - clarity));
  fogLayer.style.opacity = fogOpacity * 0.9;
}

function updateMeter() {
  clarityFill.style.width = `${Math.round(clarity * 100)}%`;
}

function updateMessage(message) {
  gameMessage.textContent = message;
}

function renderBoard() {
  tileGrid.innerHTML = '';
  boardItems.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tile-card ${item.type}`;
    button.textContent = item.text;
    button.addEventListener('click', () => handleTileClick(index));
    tileGrid.appendChild(button);
  });
}

function handleTileClick(index) {
  const item = boardItems[index];
  if (!item) {
    return;
  }

  if (item.type === 'action') {
    actionsCompleted += 1;
    clarity = Math.min(1, clarity + 0.1);
    boardItems.splice(index, 1);
    if (remainingActions.length > 0) {
      boardItems.push({ type: 'action', text: remainingActions.shift() });
    }
    updateMessage('Great choice! The view gets clearer when you act on real intentions.');
  } else {
    clarity = Math.max(0, clarity - 0.08);
    updateMessage('The negative thought spreads when you touch it. Keep focusing on actions instead.');
    multiplyThoughts();
  }

  if (clarity >= 1) {
    clarity = 1;
    updateMessage('You cleared the window! Real actions make the path visible.');
    tileGrid.innerHTML = '<div class="tile-card action" style="grid-column: span 2;">You did it! The glass is clean.</div>';
  } else {
    updateFog();
    updateMeter();
    renderBoard();
  }
}

function multiplyThoughts() {
  const maxThoughts = 14;
  const existingThoughts = boardItems.filter(item => item.type === 'thought').length;
  const nextThoughts = availableThoughts.splice(0, 2).map(text => ({ type: 'thought', text }));

  if (existingThoughts + nextThoughts.length <= maxThoughts) {
    boardItems.push(...nextThoughts);
  } else if (existingThoughts < maxThoughts) {
    boardItems.push(...nextThoughts.slice(0, maxThoughts - existingThoughts));
  }
}

if (startButton) {
  startButton.addEventListener('click', initializeGame);
} else {
  console.warn('Game 1 start button was not found.');
}
