let index = window.index ?? 0;
let goalIndex = window.goalIndex ?? 0;

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

function addGoalRow() {
  const container = document.getElementById("goal-timeline-list");
  document.getElementById("goals-empty")?.remove();

  const html = `
    <div class="player-row" draggable="true">
      <span class="drag-handle" title="Mover">⠿</span>
      <span class="player-row-label">${container.children.length + 1}</span>
      <input type="text" name="goalTimeline[${goalIndex}][scorer]"
        placeholder="Gol" list="playersList" autocomplete="off" />
      <span class="player-row-label">🎯</span>
      <input type="text" name="goalTimeline[${goalIndex}][assist]"
        placeholder="Asistencia (opcional)" list="playersList" autocomplete="off" />
      <button type="button" class="btn-og" onclick="toggleOwnGoal(this)">EC</button>
      <input type="hidden" name="goalTimeline[${goalIndex}][ownGoal]" value="false" />
      <button type="button" class="btn-remove-player" onclick="removeGoalRow(this)">✕</button>
    </div>`;

  container.insertAdjacentHTML("beforeend", html);
  goalIndex++;
}

function removeGoalRow(btn) {
  const row = btn.closest(".player-row");
  const container = row.parentElement;
  row.remove();

  container.querySelectorAll(".player-row").forEach((r, i) => {
    r.querySelector(".player-row-label").textContent = i + 1;
  });

  if (!container.querySelector(".player-row")) {
    container.insertAdjacentHTML(
      "beforeend",
      `<p class="empty-state" id="goals-empty">Sin goles cargados</p>`,
    );
  }
}

function initGoalDragAndDrop() {
  const container = document.getElementById("goal-timeline-list");
  let dragging = null;

  container.addEventListener("dragstart", (e) => {
    const row = e.target.closest(".player-row");
    if (!row) return;
    dragging = row;
    setTimeout(() => row.classList.add("dragging"), 0);
  });

  container.addEventListener("dragend", () => {
    if (dragging) dragging.classList.remove("dragging");
    dragging = null;
    reindexGoals();
  });

  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    const row = e.target.closest(".player-row");
    if (!row || row === dragging) return;

    const rect = row.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    container.insertBefore(dragging, after ? row.nextSibling : row);
  });
}

function reindexGoals() {
  const container = document.getElementById("goal-timeline-list");
  container.querySelectorAll(".player-row").forEach((row, i) => {
    row.querySelectorAll("input, label input").forEach((input) => {
      if (input.name) {
        input.name = input.name.replace(
          /goalTimeline\[\d+\]/,
          `goalTimeline[${i}]`,
        );
      }
    });
    const label = row.querySelector(".player-row-label");
    if (label) label.textContent = i + 1;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renumberPlayers();
  initGoalDragAndDrop();
});

function toggleOwnGoal(btn) {
  const isActive = btn.classList.toggle("btn-og-active");
  btn.nextElementSibling.value = isActive ? "true" : "false";
}

document.addEventListener("DOMContentLoaded", renumberPlayers);
