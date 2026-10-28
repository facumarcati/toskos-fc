(() => {
  const starMarkup = '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L2.9 9.6l6.3-.9Z"/></svg>';
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function animateChange(element) {
    if (!reducedMotion.matches) element.animate([
      { opacity: 0, transform: "translateY(3px)" },
      { opacity: 1, transform: "translateY(0)" },
    ], { duration: 220, easing: "ease-out" });
  }

  function applyVotes(summary) {
    const card = document.getElementById(`match-${summary.matchId}`);
    if (!card || !summary.voteCountByPlayer || !Array.isArray(summary.mvpPlayers)) return;
    const rows = [...card.querySelectorAll(".player-item[data-player-id]")];
    rows.forEach((row) => {
      const id = row.dataset.playerId;
      const count = summary.voteCountByPlayer[id] || 0;
      const winner = summary.mvpPlayers.includes(id);
      const oldBadge = row.querySelector(".mvp-badge");
      const oldCount = Number(oldBadge?.textContent.trim() || 0);
      const wasWinner = row.classList.contains("player-mvp");
      // The same update can arrive by socket and POST; animate it only once.
      if (oldCount === count && wasWinner === winner) return;
      row.classList.toggle("player-mvp", winner);
      oldBadge?.remove();
      if (count > 0) {
        const badge = document.createElement("span");
        badge.className = `mvp-badge${winner ? " mvp-badge-leader" : ""}`;
        badge.setAttribute("aria-label", `${count} ${count === 1 ? "voto" : "votos"}${winner ? ", MVP" : ""}`);
        if (winner) badge.innerHTML = starMarkup;
        badge.append(document.createTextNode(String(count)));
        row.querySelector(".player-item-name").append(badge);
        animateChange(badge);
      }
    });
    // A broadcast updates public counts; only the POST response changes your vote label.
    if (Object.hasOwn(summary, "userVotePlayerId")) {
      const ownVote = card.querySelector(".match-user-vote");
      const selected = rows.find((row) => row.dataset.playerId === summary.userVotePlayerId);
      if (ownVote && selected) {
        const text = `MVP: ${selected.dataset.playerName}`;
        if (ownVote.textContent.trim() === text) return;
        ownVote.replaceChildren();
        ownVote.innerHTML = starMarkup;
        const name = document.createElement("span");
        name.textContent = text;
        ownVote.append(name);
        ownVote.classList.add("match-user-vote-active");
        animateChange(ownVote);
      }
    }
  }

  window.voteMVP = async (matchId, playerId) => {
    const card = document.getElementById(`match-${matchId}`);
    if (!card || card.dataset.voting === "true") return;
    card.dataset.voting = "true";
    card.setAttribute("aria-busy", "true");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`/matches/${matchId}/vote-mvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Vote failed");
      applyVotes(await response.json());
    } catch {
      window.showToast?.("No se pudo guardar el voto. Intentá de nuevo.", "error");
    } finally {
      clearTimeout(timeout);
      delete card.dataset.voting;
      card.removeAttribute("aria-busy");
    }
  };

  document.addEventListener("match:mvp-voted", (event) => applyVotes(event.detail));
})();
