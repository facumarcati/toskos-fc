let index = window.index ?? 0;
const registeredUsers = window.registeredUsers || [];

function buildPlayerSelect(idx) {
  if (!registeredUsers.length) return "";
  const options = registeredUsers
    .map((u) => `<option value="${u._id}" data-name="${u.playerName}">${u.displayName || u.username}</option>`)
    .join("");
  return `
    <select class="player-user-select" data-idx="${idx}" onchange="onUserSelect(this, ${idx})">
      <option value="">— Invitado —</option>
      ${options}
    </select>`;
}

function onUserSelect(select, idx) {
  const option = select.options[select.selectedIndex];
  const nameInput = document.querySelector(`input[name="players[${idx}][name]"]`);
  const userIdInput = document.querySelector(`input[name="players[${idx}][userId]"]`);

  if (option.value) {
    nameInput.value = option.dataset.name || option.text;
    nameInput.readOnly = true;
    userIdInput.value = option.value;
  } else {
    nameInput.value = "";
    nameInput.readOnly = false;
    userIdInput.value = "";
  }
}

function addPlayer(team) {
  const container = team === "A"
    ? document.getElementById("teamA")
    : document.getElementById("teamB");

  const emptyState = container.querySelector(".empty-state");
  if (emptyState) emptyState.remove();

  const userSelectHtml = buildPlayerSelect(index);

  const html = `
    <div class="player-row">
      <span class="player-row-label">${container.querySelectorAll(".player-row").length + 1}</span>

      ${userSelectHtml}

      <input
        type="text"
        name="players[${index}][name]"
        placeholder="Jugador"
        autocomplete="on"
        ${registeredUsers.length ? "" : ""}
      />
      <input type="hidden" name="players[${index}][userId]" value="" />

      <span class="player-row-label">⚽</span>
      <input type="number" name="players[${index}][goals]" value="0" min="0" oninput="updateScore()" />

      <span class="player-row-label">🎯</span>
      <input type="number" name="players[${index}][assists]" value="0" min="0" />

      <input type="hidden" name="players[${index}][team]" value="${team}" />

      <label class="btn-guest-player" title="Invitado">
        <input type="checkbox" name="players[${index}][guest]" />
        👤
      </label>

      <button type="button" class="btn-remove-player" onclick="removePlayer(this)">✕</button>
    </div>`;

  container.insertAdjacentHTML("beforeend", html);
  index++;

  const newRow = container.lastElementChild;
  // Focus name input if no user selector, otherwise focus selector
  const sel = newRow.querySelector(".player-user-select");
  if (sel) sel.focus();
  else newRow.querySelector('input[type="text"]').focus();

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
    container.insertAdjacentHTML("beforeend", `<p class="empty-state">Sin jugadores aún</p>`);
  }

  updateScore();
}

function updateScore() {
  let scoreA = 0;
  let scoreB = 0;

  document.querySelectorAll("#teamA input[type='number'][name*='[goals]']").forEach((input) => {
    scoreA += Number(input.value) || 0;
  });
  document.querySelectorAll("#teamB input[type='number'][name*='[goals]']").forEach((input) => {
    scoreB += Number(input.value) || 0;
  });

  document.getElementById("scoreA").textContent = scoreA;
  document.getElementById("scoreB").textContent = scoreB;
  document.getElementById("teamA_score").value = scoreA;
  document.getElementById("teamB_score").value = scoreB;
}

function renumberPlayers() {
  ["teamA", "teamB"].forEach((teamId) => {
    document.querySelectorAll(`#${teamId} .player-row`).forEach((row, i) => {
      row.querySelector(".player-row-label").textContent = i + 1;
    });
  });
}

document.addEventListener("DOMContentLoaded", renumberPlayers);
