const gameTitle = document.querySelector('[data-game-title]');
if (gameTitle) {
  const gameNumber = new URLSearchParams(window.location.search).get('level');
  if (gameNumber) {
    gameTitle.textContent = `Level ${gameNumber}`;
  }
}
