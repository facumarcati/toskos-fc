async function updateGuestStatus(playerId, guest) {
  try {
    await fetch(`/players/${playerId}/guest`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({ guest }),
    });
  } catch (error) {
    console.error(error);
    alert("Error actualizando estado de invitado");
  }
}

const btn = document.getElementById("loadMoreMatches");

if (btn) {
  btn.addEventListener("click", async () => {
    const playerId = btn.dataset.player;
    const season = btn.dataset.season;

    let page = parseInt(btn.dataset.page) + 1;

    const res = await fetch(
      `/players/${playerId}/matches?page=${page}&season=${season}`,
    );

    const matches = await res.json();

    const container = document.getElementById("matchesContainer");

    matches.forEach((match) => {
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

      const html = `
      <div class="match-card match-card-compact">
        <div class="match-scoreboard">
          <div class="match-team">
            <span class="match-team-label">Equipo</span>
            <span class="match-team-name">Blanco</span>
            ${
              isWinA
                ? `<span class="match-badge badge-win">Ganador</span>`
                : isDraw
                  ? `<span class="match-badge badge-draw">Empate</span>`
                  : ``
            }
          </div>
          <div class="match-score">
            <div class="match-date">
              ${new Date(match.date).toLocaleDateString()}
            </div>
            <span class="match-score-number">
              ${match.teamA} — ${match.teamB}
            </span>
          </div>
          <div class="match-team match-team-right">
            <span class="match-team-label">Equipo</span>
            <span class="match-team-name">Negro</span>
            ${
              isWinB
                ? `<span class="match-badge badge-win">Ganador</span>`
                : isDraw
                  ? `<span class="match-badge badge-draw">Empate</span>`
                  : ``
            }
          </div>
        </div>
        <div class="match-card-footer match-card-footer-compact">
          <div class="footer-left">
            ${resultBadge}
            <span class="player-stat ${goals > 0 ? "stat-active" : ""}">⚽ ${goals}</span>
            <span class="player-stat ${assists > 0 ? "stat-active" : ""}">🎯 ${assists}</span>
          </div>
          <div class="footer-right">
            <a
              href="/matches?season=${season}#match-${match._id}"
              class="btn-match-action btn-edit"
            >
              Ver
            </a>
          </div>
        </div>
      </div>
      `;

      container.insertAdjacentHTML("beforeend", html);
    });

    btn.dataset.page = page;

    if (matches.length < 3) {
      btn.remove();
    }
  });
}
