let index = window.index ?? 0;

function addPlayer(team) {
  const container =
    team === "A"
      ? document.getElementById("teamA")
      : document.getElementById("teamB");

  const emptyState = container.querySelector(".empty-state");
  if (emptyState) emptyState.remove();

  const html = `
  <div class="player-row">
    <span class="player-row-label">${container.children.length + 1}</span>
    <input
      type="text"
      name="players[${index}][name]"
      placeholder="Jugador"
      autocomplete="off"
      list="playersList"
    />
    <span class="player-row-label">⚽</span>
    <input type="number" name="players[${index}][goals]" value="0" min="0" oninput="updateScore()" />
    <span class="player-row-label">🎯</span>
    <input type="number" name="players[${index}][assists]" value="0" min="0" />
    <input type="hidden" name="players[${index}][team]" value="${team}" />
    <button type="button" class="btn-remove-player" onclick="removePlayer(this)">✕</button>
  </div>`;

  container.insertAdjacentHTML("beforeend", html);
  index++;

  const newRow = container.lastElementChild;
  newRow.querySelector('input[type="text"]').focus();

  updateScore();
}

function removePlayer(btn) {
  const row = btn.closest(".player-row");
  const container = row.parentElement;

  row.remove();

  container.querySelectorAll(".player-row").forEach((r, i) => {
    r.querySelector(".player-row-label").textContent = i + 1;
  });

  if (container.querySelectorAll(".player-row").length === 0) {
    container.insertAdjacentHTML(
      "beforeend",
      `<p class="empty-state">Sin jugadores aún</p>`,
    );
  }

  updateScore();
}

function updateScore() {
  let scoreA = 0;
  let scoreB = 0;

  document
    .querySelectorAll("#teamA input[type='number'][name*='[goals]']")
    .forEach((input) => {
      scoreA += Number(input.value) || 0;
    });

  document
    .querySelectorAll("#teamB input[type='number'][name*='[goals]']")
    .forEach((input) => {
      scoreB += Number(input.value) || 0;
    });

  document.getElementById("scoreA").textContent = scoreA;
  document.getElementById("scoreB").textContent = scoreB;

  document.getElementById("teamA_score").value = scoreA;
  document.getElementById("teamB_score").value = scoreB;
}

function renumberPlayers() {
  ["teamA", "teamB"].forEach((teamId) => {
    const rows = document.querySelectorAll(`#${teamId} .player-row`);
    rows.forEach((row, i) => {
      row.querySelector(".player-row-label").textContent = i + 1;
    });
  });
}

document.addEventListener("DOMContentLoaded", renumberPlayers);
