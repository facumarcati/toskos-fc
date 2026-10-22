// ── Auth ─────────────────────────────────────
function isAdmin() {
  return window.currentUser?.role === "admin";
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
function escapeMatchText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function buildMatchCard(match, playerId) {
  const playerStats = match.players.find(
    (player) => String(player.player?._id ?? player.player) === String(playerId),
  );
  const playerTeam = playerStats?.team;
  const goalsFor = playerTeam === "A" ? match.teamA : match.teamB;
  const goalsAgainst = playerTeam === "A" ? match.teamB : match.teamA;
  const result = goalsFor === goalsAgainst ? "draw" : goalsFor > goalsAgainst ? "win" : "loss";
  const date = new Date(match.date).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  function team(side, name) {
    const ownTeam = playerTeam === side;
    return `
      <div class="match-team ${side === "B" ? "match-team-right" : ""} ${ownTeam ? "player-match-team--own" : ""}">
        <span class="match-team-label">Equipo</span>
        <span class="match-team-name">${name}</span>
        ${ownTeam ? `
          <div class="player-match-performance">
            <span><span aria-hidden="true">⚽</span> ${escapeMatchText(playerStats.goals ?? 0)} G</span>
            <span><span aria-hidden="true">🎯</span> ${escapeMatchText(playerStats.assists ?? 0)} A</span>
          </div>` : ""}
      </div>`;
  }

  return `
    <a href="/matches/${encodeURIComponent(match._id)}" class="match-card match-card-compact player-match-card player-match-card--${result} player-match-card--side-${escapeMatchText(playerTeam)}">
      <div class="match-scoreboard">
        ${team("A", "Blanco")}
        <div class="match-score">
          <div class="match-date">${date}</div>
          <span class="match-score-number">${escapeMatchText(match.teamA)} — ${escapeMatchText(match.teamB)}</span>
          ${match.venue ? `<span class="match-score-meta">${escapeMatchText(match.venue)}</span>` : ""}
          ${match.matchType === "friendly" ? '<span class="badge-friendly">Amistoso</span>' : ""}
        </div>
        ${team("B", "Negro")}
      </div>
    </a>`;
}

// ── Load more matches ────────────────────────
function initLoadMore() {
  const btn = document.getElementById("loadMoreMatches");
  const container = document.getElementById("matchesContainer");
  const title = document.getElementById("matchesTitle");
  if (!btn || !container) return;

  let allMatches = null;
  let expanded = false;

  btn.addEventListener("click", async () => {
    const { player: playerId, season } = btn.dataset;

    if (!allMatches) {
      const res = await fetch(
        `/players/${playerId}/matches?page=1&limit=999&season=${season}`,
      );
      allMatches = await res.json();
    }

    expanded = !expanded;

    const toShow = expanded ? allMatches : allMatches.slice(0, 3);

    container.innerHTML = toShow
      .map((m) => buildMatchCard(m, playerId))
      .join("");

    title.textContent = expanded
      ? `Partidos totales — ${allMatches.length}`
      : "Partidos recientes";
    btn.textContent = expanded ? "Ver menos" : "Ver más";
  });
}

function initEditUsername() {
  const btn = document.getElementById("editUsernameBtn");

  if (!btn) return;

  const container = btn.parentElement;
  const textNode = container.childNodes[0];

  btn.addEventListener("click", () => {
    const current = textNode.textContent.replace("@", "").trim();

    const input = document.createElement("input");
    input.value = current;
    input.className = "player-name-input";

    textNode.replaceWith(input);

    input.focus();
    input.select();

    const save = async () => {
      const newUsername = input.value.trim();

      if (!newUsername || newUsername === current) {
        input.replaceWith(textNode);

        return;
      }

      try {
        const res = await fetch(`/players/${btn.dataset.player}/username`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: newUsername }),
        });

        if (!res.ok) {
          alert("Username no disponible");
          input.replaceWith(textNode);
          return;
        }

        textNode.textContent = "@" + newUsername;
      } catch (error) {
        console.error(error);
        alert("Error actualizando username");
      }

      input.replaceWith(textNode);
    };

    input.addEventListener("blur", save);

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") save();

      if (e.key === "Escape") input.replaceWith(textNode);
    });
  });
}

// ── Init ─────────────────────────────────────
initGuestToggle();
initEditName();
initLoadMore();
initEditUsername();
