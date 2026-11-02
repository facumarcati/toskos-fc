let index = window.index ?? 0;
let goalIndex = window.goalIndex ?? 0;

function addPlayer(team, { focus = true } = {}) {
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
    <button type="button" class="btn-og" onclick="toggleOwnGoalPlayer(this)">EC</button>
    <input type="hidden" name="players[${index}][isOwnGoal]" value="false" />
    <button type="button" class="btn-remove-player" onclick="removePlayer(this)">✕</button>
  </div>`;

  container.insertAdjacentHTML("beforeend", html);
  index++;

  const newRow = container.lastElementChild;
  if (focus) newRow.querySelector('input[type="text"]').focus();

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

function toggleOwnGoalPlayer(btn) {
  const isActive = btn.classList.toggle("btn-og-active");
  btn.nextElementSibling.value = isActive ? "true" : "false";
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

// Drafts contain values only. Rebuild rows with the regular controls, never saved HTML.
window.matchEditorData = {
  capture(form) {
    function rowValues(row) {
      return Object.fromEntries([...row.querySelectorAll("input[name]")].map((input) => [
        input.name.match(/\[([^\]]+)\]$/)[1],
        input.type === "checkbox" ? input.checked : input.value,
      ]));
    }
    return {
      fields: Object.fromEntries(["date", "venue", "youtubeUrl", "youtubeHlUrl", "matchType"].map((name) => [name, form.elements.namedItem(name)?.value || ""])),
      players: ["A", "B"].flatMap((team) => [...document.querySelectorAll(`#team${team} .player-row`)].map((row) => ({ ...rowValues(row), team }))),
      goals: [...document.querySelectorAll("#goal-timeline-list .player-row")].map(rowValues),
    };
  },
  restore(form, snapshot) {
    if (!snapshot?.fields || !Array.isArray(snapshot.players) || !Array.isArray(snapshot.goals) || snapshot.players.length > 200 || snapshot.goals.length > 1000) {
      throw new Error("Invalid draft");
    }
    for (const name of ["date", "venue", "youtubeUrl", "youtubeHlUrl", "matchType"]) {
      const field = form.elements.namedItem(name);
      if (field) field.value = String(snapshot.fields[name] || "");
    }
    for (const id of ["teamA", "teamB", "goal-timeline-list"]) {
      const container = document.getElementById(id);
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = id === "goal-timeline-list" ? "Sin goles cargados" : "Sin jugadores aún";
      if (id === "goal-timeline-list") empty.id = "goals-empty";
      container.replaceChildren(empty);
    }
    index = 0;
    goalIndex = 0;
    function fill(row, values) {
      for (const input of row.querySelectorAll("input[name]")) {
        const key = input.name.match(/\[([^\]]+)\]$/)[1];
        if (input.type === "checkbox") input.checked = values[key] === true;
        else input.value = String(values[key] ?? "");
      }
      const flag = row.querySelector('input[name$="[isOwnGoal]"], input[name$="[ownGoal]"]');
      row.querySelector(".btn-og")?.classList.toggle("btn-og-active", flag?.value === "true");
    }
    for (const player of snapshot.players) {
      if (!["A", "B"].includes(player.team)) continue;
      addPlayer(player.team, { focus: false });
      fill(document.getElementById(`team${player.team}`).lastElementChild, player);
    }
    for (const goal of snapshot.goals) {
      addGoalRow();
      fill(document.getElementById("goal-timeline-list").lastElementChild, goal);
    }
    renumberPlayers();
    reindexGoals();
    updateScore();
  },
};
