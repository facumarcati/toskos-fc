let index = 0;

function addPlayer(team) {
  const container =
    team === "A"
      ? document.getElementById("teamA")
      : document.getElementById("teamB");

  // Remove empty state message on first player added
  const emptyState = container.querySelector(".empty-state");
  if (emptyState) emptyState.remove();

  const html = `
    <div class="player-row">
      <span class="player-row-label">${container.children.length + 1}</span>

      <input
        type="text"
        name="players[${index}][name]"
        placeholder="Jugador"
        autocomplete="on"
      />

      <span class="player-row-label">⚽</span>
      <input
        type="number"
        name="players[${index}][goals]"
        value="0"
        min="0"
        oninput="updateScore()"
      />

      <span class="player-row-label">🎯</span>
      <input
        type="number"
        name="players[${index}][assists]"
        value="0"
        min="0"
      />

      <input type="hidden" name="players[${index}][team]" value="${team}" />

      <label class="btn-guest-player">
        <input type="checkbox" name="players[${index}][guest]" />
        👤
      </label>

      <button
        type="button"
        class="btn-remove-player"
        onclick="removePlayer(this)"
      >
        ✕
      </button>
    </div>`;

  container.insertAdjacentHTML("beforeend", html);
  index++;

  // Focus name input
  const newRow = container.lastElementChild;
  newRow.querySelector('input[type="text"]').focus();

  updateScore();
}

function removePlayer(btn) {
  const row = btn.closest(".player-row");
  const container = row.parentElement;

  row.remove();

  // Renumber rows
  container.querySelectorAll(".player-row").forEach((r, i) => {
    r.querySelector(".player-row-label").textContent = i + 1;
  });

  // Restore empty state if needed
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

  // Sum goals from Team A
  document
    .querySelectorAll("#teamA input[type='number'][name*='[goals]']")
    .forEach((input) => {
      scoreA += Number(input.value) || 0;
    });

  // Sum goals from Team B
  document
    .querySelectorAll("#teamB input[type='number'][name*='[goals]']")
    .forEach((input) => {
      scoreB += Number(input.value) || 0;
    });

  // Update visible scoreboard
  document.getElementById("scoreA").textContent = scoreA;
  document.getElementById("scoreB").textContent = scoreB;

  // Update hidden inputs sent to backend
  document.getElementById("teamA_score").value = scoreA;
  document.getElementById("teamB_score").value = scoreB;
}
