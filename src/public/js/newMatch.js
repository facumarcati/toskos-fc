let index = window.index ?? 0;

// Track selected user IDs to prevent duplicates
const selectedUserIds = new Set();

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const btnA = document.getElementById("addPlayerA");
  const btnB = document.getElementById("addPlayerB");
  if (btnA) btnA.addEventListener("click", () => addPlayer("A"));
  if (btnB) btnB.addEventListener("click", () => addPlayer("B"));

  const scoreA = document.getElementById("teamA_score");
  const scoreB = document.getElementById("teamB_score");
  if (scoreA) scoreA.addEventListener("input", () => syncScore("A", scoreA.value));
  if (scoreB) scoreB.addEventListener("input", () => syncScore("B", scoreB.value));

  // Wire remove buttons for existing rows (editMatch)
  document.querySelectorAll(".btn-remove-player").forEach((btn) => {
    btn.addEventListener("click", () => removePlayer(btn));
  });

  const form = document.querySelector("form[action*='/matches']");
  if (form) {
    form.setAttribute("novalidate", "");
    form.addEventListener("submit", validateForm);
  }

  document.addEventListener("click", function(e) {
    var btn = e.target.closest(".stat-btn");
    if (!btn) return;
    var fieldId = btn.dataset.field;
    var input = document.getElementById(fieldId);
    if (!input) return;
    var val = parseInt(input.value) || 0;
    if (btn.dataset.action === "plus") {
      val = val + 1;
    } else {
      val = Math.max(0, val - 1);
    }
    input.value = val;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
});

// ── Add player row ────────────────────────────────────────────────────────────
function addPlayer(team) {
  const container = team === "A"
    ? document.getElementById("teamA")
    : document.getElementById("teamB");

  const emptyState = container.querySelector(".empty-state");
  if (emptyState) emptyState.remove();

  const idx = index++;
  const num = container.querySelectorAll(".player-row").length + 1;

  const html = `
    <div class="player-row" data-idx="${idx}" data-mode="empty">
      <div class="player-row-main">
        <span class="player-row-num">${num}</span>
        <div class="player-selected-avatar" id="pav_${idx}" style="display:none"></div>
        <div class="player-search-wrap">
          <input type="text" class="player-search-input" placeholder="Buscar jugador..." autocomplete="off" />
          <div class="player-search-dropdown" id="dropdown_${idx}"></div>
          <input type="hidden" name="players[${idx}][name]" />
          <input type="hidden" name="players[${idx}][userId]" value="" />
        </div>
        <button type="button" class="btn-remove-player" title="Quitar">✕</button>
      </div>
      <div class="player-row-stats">
        <span class="stat-icon">⚽</span>
        <button type="button" class="stat-btn stat-btn-minus" data-action="minus" data-field="goals-${idx}">−</button>
        <input type="number" name="players[${idx}][goals]"   value="0" min="0" class="stat-input" id="goals-${idx}" />
        <button type="button" class="stat-btn stat-btn-plus" data-action="plus" data-field="goals-${idx}">+</button>
        <span class="stat-icon">🎯</span>
        <button type="button" class="stat-btn stat-btn-minus" data-action="minus" data-field="assists-${idx}">−</button>
        <input type="number" name="players[${idx}][assists]" value="0" min="0" class="stat-input" id="assists-${idx}" />
        <button type="button" class="stat-btn stat-btn-plus" data-action="plus" data-field="assists-${idx}">+</button>
        <input type="hidden" name="players[${idx}][team]" value="${team}" />
        <label class="btn-guest-player" id="guestlabel_${idx}" title="Marcar como invitado">
          <input type="checkbox" name="players[${idx}][guest]" id="guest_${idx}" />
          <span>👤 Invitado</span>
        </label>
      </div>
    </div>`;

  container.insertAdjacentHTML("beforeend", html);

  const row      = container.lastElementChild;
  const input    = row.querySelector(".player-search-input");
  const rmBtn    = row.querySelector(".btn-remove-player");
  const dropdown = row.querySelector(`#dropdown_${idx}`);
  const guestCb  = row.querySelector(`#guest_${idx}`);

  // Move dropdown to body to escape overflow clipping
  document.body.appendChild(dropdown);

  input.addEventListener("focus", () => loadDropdown(idx, input.value.trim()));
  input.addEventListener("input", () => {
    clearTimeout(input._t);
    input._t = setTimeout(() => loadDropdown(idx, input.value.trim()), 150);
  });

  // If user types manually (not from dropdown), allow guest toggle + free prev selection
  input.addEventListener("input", () => {
    const userIdInput = row.querySelector(`input[name="players[${idx}][userId]"]`);
    if (userIdInput?.value) {
      selectedUserIds.delete(userIdInput.value);
      userIdInput.value = "";
      const avEl = document.getElementById(`pav_${idx}`);
      if (avEl) { avEl.style.display = "none"; avEl.innerHTML = ""; }
    }
    setGuestMode(idx, "manual");
  });

  rmBtn.addEventListener("click", () => removePlayer(rmBtn));

  // Goals → update live score + re-validate assists
  const goalsInput   = row.querySelector(`.stat-input[name="players[${idx}][goals]"]`);
  const assistsInput = row.querySelector(`.stat-input[name="players[${idx}][assists]"]`);
  const teamId       = team;

  if (goalsInput) {
    goalsInput.addEventListener("input", () => {
      updateLiveScore();
      validateAssists(row, teamId);
    });
  }
  if (assistsInput) {
    assistsInput.addEventListener("input", () => validateAssists(row, teamId));
  }

  // Reposition on scroll
  const reposition = () => {
    const d = document.getElementById(`dropdown_${idx}`);
    if (d?.classList.contains("open")) positionDropdown(idx, input);
  };
  window.addEventListener("scroll", reposition, { passive: true });
  document.querySelectorAll("#teamA, #teamB").forEach((el) =>
    el.addEventListener("scroll", reposition, { passive: true })
  );

  setTimeout(() => input.focus(), 20);
}

// ── Guest mode control ────────────────────────────────────────────────────────
// mode: "registered" = user selected from list → disable guest
//       "manual"     = typed manually → enable guest
//       "guest"      = selected as guest → check + disable
function setGuestMode(idx, mode) {
  const row      = document.querySelector(`.player-row[data-idx="${idx}"]`);
  const label    = document.getElementById(`guestlabel_${idx}`);
  const cb       = document.getElementById(`guest_${idx}`);
  if (!row || !label || !cb) return;

  if (mode === "registered") {
    cb.checked  = false;
    cb.disabled = true;
    label.style.opacity = "0.35";
    label.title = "Usuario registrado — no es invitado";
  } else if (mode === "guest") {
    cb.checked  = true;
    cb.disabled = true;
    label.style.opacity = "0.6";
    label.title = "Agregado como invitado";
  } else {
    // manual
    cb.disabled = false;
    label.style.opacity = "1";
    label.title = "Marcar como invitado";
  }
}

// ── Dropdown fetch & render ───────────────────────────────────────────────────
async function loadDropdown(idx, q) {
  const dropdown = document.getElementById(`dropdown_${idx}`);
  if (!dropdown) return;
  try {
    const url = q ? `/api/users/search?q=${encodeURIComponent(q)}` : `/api/users/search`;
    const res   = await fetch(url);
    const users = await res.json();
    renderDropdown(idx, users, q);
  } catch (err) {
    console.error("[search]", err);
    dropdown.innerHTML = `<div class="player-search-option player-search-guest" style="opacity:.5;cursor:default"><span>Error al cargar usuarios</span></div>`;
    const input = document.querySelector(`.player-row[data-idx="${idx}"] .player-search-input`);
    if (input) positionDropdown(idx, input);
    dropdown.classList.add("open");
  }
}

function renderDropdown(idx, users, q) {
  const dropdown = document.getElementById(`dropdown_${idx}`);
  if (!dropdown) return;

  let html = users
    .filter((u) => !selectedUserIds.has(u._id))  // hide already-selected users
    .map((u) => {
    const name   = esc(u.displayName || "");
    const pName  = esc(u.playerName  || u.displayName || "");
    const avatar = u.avatar
      ? `<img src="${u.avatar}" class="player-search-avatar" alt="" />`
      : `<div class="player-search-avatar-placeholder">${esc((u.displayName || "?")[0])}</div>`;
    const sub = pName !== name ? `<span class="player-search-sub">${pName}</span>` : "";
    return `<div class="player-search-option"
      data-idx="${idx}" data-id="${u._id}"
      data-player-name="${pName}" data-display-name="${name}"
      data-avatar="${u.avatar || ""}">
      ${avatar}<span>${name}</span>${sub}
    </div>`;
  }).join("");

  if (q) {
    html += `<div class="player-search-option player-search-guest"
      data-idx="${idx}" data-guest="1" data-name="${esc(q)}">
      <span>👤 Agregar "${esc(q)}" como invitado</span>
    </div>`;
  } else if (!users.length) {
    html += `<div class="player-search-option player-search-guest" style="opacity:.5;cursor:default">
      <span>No hay usuarios registrados</span>
    </div>`;
  }

  dropdown.innerHTML = html;

  const input = document.querySelector(`.player-row[data-idx="${idx}"] .player-search-input`);
  if (input) positionDropdown(idx, input);
  dropdown.classList.add("open");
}

function positionDropdown(idx, input) {
  const d = document.getElementById(`dropdown_${idx}`);
  if (!d) return;
  const rect = input.getBoundingClientRect();
  d.style.top   = `${rect.bottom + 4}px`;
  d.style.left  = `${rect.left}px`;
  d.style.width = `${rect.width}px`;
}

// ── Delegated click ───────────────────────────────────────────────────────────
document.addEventListener("click", (e) => {
  const opt = e.target.closest(".player-search-option[data-idx]");
  if (opt) {
    e.stopPropagation();
    const idx = opt.dataset.idx;
    if (opt.dataset.guest === "1") {
      selectGuest(idx, opt.dataset.name);
    } else if (opt.dataset.id) {
      selectUser(idx, opt.dataset.id, opt.dataset.playerName, opt.dataset.displayName, opt.dataset.avatar);
    }
    return;
  }
  if (!e.target.closest(".player-search-wrap")) {
    document.querySelectorAll(".player-search-dropdown.open").forEach((d) => d.classList.remove("open"));
  }
});

function selectUser(idx, userId, playerName, displayName, avatarUrl) {
  const row = document.querySelector(`.player-row[data-idx="${idx}"]`);
  if (!row) return;

  // Free previous selection if switching
  const prevId = row.querySelector(`input[name="players[${idx}][userId]"]`).value;
  if (prevId) selectedUserIds.delete(prevId);

  // Register new selection
  selectedUserIds.add(userId);

  row.querySelector(".player-search-input").value = displayName;
  row.querySelector(`input[name="players[${idx}][name]"]`).value = playerName;
  row.querySelector(`input[name="players[${idx}][userId]"]`).value = userId;

  // Show avatar next to the input
  const avEl = document.getElementById(`pav_${idx}`);
  if (avEl) {
    avEl.style.display = "flex";
    avEl.innerHTML = avatarUrl
      ? `<img src="${avatarUrl}" class="player-selected-img" alt="" />`
      : `<div class="player-selected-initial">${esc((displayName || "?")[0])}</div>`;
  }

  // Registered user → disable guest
  setGuestMode(idx, "registered");
  closeDropdown(idx);
}

function selectGuest(idx, name) {
  const row = document.querySelector(`.player-row[data-idx="${idx}"]`);
  if (!row) return;

  row.querySelector(".player-search-input").value = name;
  row.querySelector(`input[name="players[${idx}][name]"]`).value = name;
  row.querySelector(`input[name="players[${idx}][userId]"]`).value = "";

  // Hide avatar
  const avEl = document.getElementById(`pav_${idx}`);
  if (avEl) { avEl.style.display = "none"; avEl.innerHTML = ""; }

  setGuestMode(idx, "guest");
  closeDropdown(idx);
}

function closeDropdown(idx) {
  const d = document.getElementById(`dropdown_${idx}`);
  if (d) { d.innerHTML = ""; d.classList.remove("open"); }
}

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ── Remove player ─────────────────────────────────────────────────────────────
function removePlayer(btn) {
  const row = btn.closest(".player-row");
  const container = row.parentElement;
  const idx = row.dataset.idx;

  // Free the selected user ID
  const userId = row.querySelector(`input[name="players[${idx}][userId]"]`)?.value;
  if (userId) selectedUserIds.delete(userId);

  // Clean up the detached dropdown
  const d = document.getElementById(`dropdown_${idx}`);
  if (d) d.remove();
  row.remove();
  container.querySelectorAll(".player-row").forEach((r, i) => {
    r.querySelector(".player-row-num").textContent = i + 1;
  });
  if (!container.querySelector(".player-row")) {
    container.insertAdjacentHTML("beforeend", `<p class="empty-state">Sin jugadores aún</p>`);
  }
  // Re-validate after removal
  const team = container.id === "teamA" ? "A" : "B";
  validateAssists(null, team);
}

// ── Score ─────────────────────────────────────────────────────────────────────
function syncScore(team, val) {
  const n = Math.max(0, parseInt(val) || 0);
  const el = document.getElementById(team === "A" ? "teamA_score" : "teamB_score");
  if (el) el.value = n;
}

// ── Live score counter (sum of player goals per team) ─────────────────────────
function updateLiveScore() {
  ["A", "B"].forEach((team) => {
    const containerId = team === "A" ? "teamA" : "teamB";
    const scoreId     = team === "A" ? "teamA_score" : "teamB_score";
    const container   = document.getElementById(containerId);
    const scoreEl     = document.getElementById(scoreId);
    if (!container || !scoreEl) return;

    let total = 0;
    container.querySelectorAll(".stat-input[name*='[goals]']").forEach((inp) => {
      total += Math.max(0, parseInt(inp.value) || 0);
    });
    scoreEl.value = total;
  });
}

// ── Assists ≤ Goals validation per team ──────────────────────────────────────
function validateAssists(row, team) {
  const containerId = team === "A" ? "teamA" : "teamB";
  const errorId     = team === "A" ? "errorA" : "errorB";
  const container   = document.getElementById(containerId);
  const errorEl     = document.getElementById(errorId);
  if (!container || !errorEl) return;

  let totalGoals   = 0;
  let totalAssists = 0;

  container.querySelectorAll(".player-row").forEach((r) => {
    totalGoals   += Math.max(0, parseInt(r.querySelector(".stat-input[name*='[goals]']")?.value)   || 0);
    totalAssists += Math.max(0, parseInt(r.querySelector(".stat-input[name*='[assists]']")?.value) || 0);
  });

  if (totalAssists > totalGoals) {
    errorEl.textContent = `Las asistencias del equipo (${totalAssists}) no pueden superar los goles (${totalGoals}).`;
    errorEl.classList.add("visible");
  } else {
    errorEl.classList.remove("visible");
  }
}

// ── Form validation ───────────────────────────────────────────────────────────
function validateForm(e) {
  const form  = e.target;
  const date  = form.querySelector("input[name='date']");
  const venue = form.querySelector("input[name='venue']");

  if (!date?.value.trim())  { e.preventDefault(); showError("La fecha del partido es obligatoria."); return; }
  if (!venue?.value.trim()) { e.preventDefault(); showError("El nombre de la cancha es obligatorio."); return; }

  const pA = document.querySelectorAll("#teamA .player-row");
  const pB = document.querySelectorAll("#teamB .player-row");
  if (!pA.length && !pB.length) { e.preventDefault(); showError("Agregá al menos un jugador en cada equipo."); return; }
  if (!pA.length) { e.preventDefault(); showError("El Equipo Blanco no tiene jugadores."); return; }
  if (!pB.length) { e.preventDefault(); showError("El Equipo Negro no tiene jugadores."); return; }

  for (const row of form.querySelectorAll(".player-row")) {
    const n = row.querySelector("input[name*='[name]']");
    if (!n?.value.trim()) {
      e.preventDefault();
      showError("Hay jugadores sin nombre. Seleccioná un jugador o escribí un nombre.");
      return;
    }

    var goalsInput = row.querySelector("input[name*='[goals]']");
    var assistsInput = row.querySelector("input[name*='[assists]']");
    if (goalsInput && (goalsInput.value === "" || goalsInput.value === null)) {
      goalsInput.value = "0";
    }
    if (assistsInput && (assistsInput.value === "" || assistsInput.value === null)) {
      assistsInput.value = "0";
    }
  }

  // Validate assists ≤ goals per team
  for (const [team, containerId] of [["A", "teamA"], ["B", "teamB"]]) {
    const container = document.getElementById(containerId);
    if (!container) continue;
    let totalGoals = 0, totalAssists = 0;
    container.querySelectorAll(".player-row").forEach((r) => {
      totalGoals   += Math.max(0, parseInt(r.querySelector("input[name*='[goals]']")?.value)   || 0);
      totalAssists += Math.max(0, parseInt(r.querySelector("input[name*='[assists]']")?.value) || 0);
    });
    if (totalAssists > totalGoals) {
      e.preventDefault();
      const teamName = team === "A" ? "Equipo Blanco" : "Equipo Negro";
      showError(`${teamName}: las asistencias (${totalAssists}) no pueden superar los goles (${totalGoals}).`);
      return;
    }
  }
}

// ── Moments ───────────────────────────────────────────────────────────────────
let momentIndex = window.momentIndex ?? 0;

const MOMENT_TYPES = [
  { value: "goal",      label: "Gol",           icon: "⚽" },
  { value: "assist",    label: "Asistencia",     icon: "🎯" },
  { value: "yellow",    label: "Tarjeta amarilla", icon: "🟨" },
  { value: "highlight", label: "Highlight",      icon: "⭐" },
  { value: "robot",     label: "Robótico",       icon: "🤖" },
];

function bindMomentRow(row) {
  row.querySelectorAll(".moment-type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      row.querySelectorAll(".moment-type-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const idx = row.dataset.midx;
      const hiddenInput = document.getElementById(`mtype_${idx}`);
      if (hiddenInput) hiddenInput.value = btn.dataset.value;
    });
  });

  const removeBtn = row.querySelector(".moment-remove-btn");
  if (removeBtn) {
    removeBtn.addEventListener("click", () => row.remove());
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("addMomentBtn");
  if (addBtn) addBtn.addEventListener("click", addMoment);

  document.querySelectorAll(".moment-row").forEach((row) => bindMomentRow(row));
});

function addMoment() {
  const list = document.getElementById("momentsList");
  if (!list) return;

  const idx = momentIndex++;

  const typeOptions = MOMENT_TYPES.map((t) =>
    `<button type="button" class="moment-type-btn" data-value="${t.value}" data-idx="${idx}" title="${t.label}">
      ${t.icon}
    </button>`
  ).join("");

  const html = `
    <div class="moment-row" data-midx="${idx}">
    <div class="moment-fields">
        <div class="moment-minute-wrap">
          <span class="moment-minute-label">min.</span>
          <input type="number" name="moments[${idx}][minute]" class="moment-minute-input"
            min="0" max="999" placeholder="0" />
        </div>
      </div>
      <div class="moment-type-picker">
        ${typeOptions}
        <input type="hidden" name="moments[${idx}][type]" id="mtype_${idx}" />
      </div>
      <button type="button" class="btn-remove-player moment-remove-btn">✕</button>
    </div>`;

  list.insertAdjacentHTML("beforeend", html);

  const row = list.lastElementChild;
  bindMomentRow(row);

  row.querySelector(".moment-type-btn").click();
}
