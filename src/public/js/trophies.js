document.addEventListener("DOMContentLoaded", () => {
  const checkboxes = document.querySelectorAll(".js-trophy-toggle");
  const rowContainers = document.querySelectorAll(".js-trophy-table-rows");

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderRows(leaderboard) {
    if (!leaderboard.length) {
      return `<div class="trophy-table-empty">Sin datos todavía</div>`;
    }
    return leaderboard
      .map((p, i) => {
        const rank = i + 1;
        return `
          <div class="trophy-table-row" data-rank="${rank}">
            <span class="trophy-table-rank">${rank}</span>
            <span class="trophy-table-name">${escapeHtml(p.name)}</span>
            <span class="trophy-table-count">${p.titles}</span>
          </div>`;
      })
      .join("");
  }

  async function updateLeaderboard(includeCurrent) {
    try {
      const res = await fetch(
        `/trophies/leaderboard?includeCurrent=${includeCurrent ? "1" : "0"}`,
      );
      if (!res.ok) throw new Error("Error al obtener leaderboard");
      const data = await res.json();
      const html = renderRows(data.leaderboard);
      rowContainers.forEach((el) => (el.innerHTML = html));
    } catch (err) {
      console.error(err);
    }
  }

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const checked = e.target.checked;
      checkboxes.forEach((cb) => (cb.checked = checked));
      updateLeaderboard(checked);
    });
  });
});
