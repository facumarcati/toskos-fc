// ── Auth ─────────────────────────────────────
const token = localStorage.getItem("token");

function isAdmin() {
  return !!token;
}

// ── Guest toggle ─────────────────────────────
async function updateGuestStatus(playerId, guest) {
  try {
    await fetch(`/players/${playerId}/guest`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest }),
    });
  } catch (error) {
    console.error(error);
    alert("Error actualizando estado de invitado");
  }
}

function initGuestToggle() {
  const toggleGuest = document.getElementById("toggleGuest");
  if (toggleGuest && !isAdmin()) {
    toggleGuest.closest("label").style.display = "none";
  }
}

// ── Edit name ────────────────────────────────
function initEditName() {
  const editBtn = document.getElementById("editNameBtn");
  const nameText = document.getElementById("playerNameText");

  if (!editBtn) return;

  if (!isAdmin()) {
    editBtn.style.display = "none";
    return;
  }

  editBtn.addEventListener("click", () => {
    const currentName = nameText.textContent.trim();
    const input = document.createElement("input");
    input.value = currentName;
    input.className = "player-name-input";
    nameText.replaceWith(input);
    input.focus();
    input.select();

    const save = async () => {
      const newName = input.value.trim();
      if (!newName || newName === currentName) {
        input.replaceWith(nameText);
        return;
      }
      try {
        await fetch(`/players/${editBtn.dataset.player}/name`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        });
        nameText.textContent = newName;
      } catch (error) {
        console.error(error);
        alert("Error actualizando nombre");
      }
      input.replaceWith(nameText);
    };

    input.addEventListener("blur", save);
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        await save();
      }
      if (e.key === "Escape") input.replaceWith(nameText);
    });
  });
}

// ── Match card builder ───────────────────────
function buildMatchCard(match, playerId, season) {
  const playerStats = match.players.find(
    (p) => p.player.toString() === playerId,
  );
  const goals = playerStats?.goals ?? 0;
  const assists = playerStats?.assists ?? 0;
  const isWinA = match.teamA > match.teamB;
  const isWinB = match.teamB > match.teamA;
  const isDraw = match.teamA === match.teamB;
  const playerTeam = playerStats?.team;
  const playerWon =
    (playerTeam === "A" && isWinA) || (playerTeam === "B" && isWinB);
  const playerLost =
    (playerTeam === "A" && isWinB) || (playerTeam === "B" && isWinA);

  const resultBadge = playerWon
    ? `<span class="match-badge badge-win">Victoria</span>`
    : playerLost
      ? `<span class="match-badge badge-loss">Derrota</span>`
      : `<span class="match-badge badge-draw">Empate</span>`;

  const date = new Date(match.date).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `
    <div class="match-card match-card-compact">
      <div class="match-scoreboard">
        <div class="match-team">
          <span class="match-team-label">Equipo</span>
          <span class="match-team-name">Blanco</span>
          ${isWinA ? `<span class="match-badge badge-win">Ganador</span>` : isDraw ? `<span class="match-badge badge-draw">Empate</span>` : ""}
        </div>
        <div class="match-score">
          <div class="match-date">${date}</div>
          <span class="match-score-number">${match.teamA} — ${match.teamB}</span>
          ${match.venue ? `<span class="match-score-meta">${match.venue}</span>` : ""}
        </div>
        <div class="match-team match-team-right">
          <span class="match-team-label">Equipo</span>
          <span class="match-team-name">Negro</span>
          ${isWinB ? `<span class="match-badge badge-win">Ganador</span>` : isDraw ? `<span class="match-badge badge-draw">Empate</span>` : ""}
        </div>
      </div>
      <div class="match-card-footer match-card-footer-compact">
        <div class="footer-left">
          ${resultBadge}
          <span class="player-stat ${goals > 0 ? "stat-active" : ""}">⚽ ${goals}</span>
          <span class="player-stat ${assists > 0 ? "stat-active" : ""}">🎯 ${assists}</span>
        </div>
        <div class="footer-right">
          <a href="/matches?season=${season}#match-${match._id}" class="btn-match-action btn-edit">Ver</a>
        </div>
      </div>
    </div>`;
}

// ── Load more matches ────────────────────────
function initLoadMore() {
  const btn = document.getElementById("loadMoreMatches");
  const container = document.getElementById("matchesContainer");
  const title = document.getElementById("matchesTitle");
  if (!btn || !container) return;

  const originalHTML = container.innerHTML;
  let expanded = false;

  btn.addEventListener("click", async () => {
    const { player: playerId, season } = btn.dataset;

    if (expanded) {
      container.innerHTML = originalHTML;
      btn.textContent = "Ver más";
      title.textContent = "Partidos recientes";
      expanded = false;
      return;
    }

    const res = await fetch(
      `/players/${playerId}/matches?page=1&limit=999&season=${season}`,
    );
    const matches = await res.json();

    container.querySelectorAll(".match-card").forEach((c) => c.remove());
    matches.forEach((m) =>
      container.insertAdjacentHTML(
        "beforeend",
        buildMatchCard(m, playerId, season),
      ),
    );

    title.textContent = `Partidos totales — ${matches.length}`;
    btn.textContent = "Ver menos";
    expanded = true;
  });
}

// ── Init ─────────────────────────────────────
initGuestToggle();
initEditName();
initLoadMore();
