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

function initSeasonCountdown() {
  const elements = document.querySelectorAll(".season-countdown[data-end]");
  if (!elements.length) return;

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function tick() {
    elements.forEach((el) => {
      const endDate = new Date(el.dataset.end);
      const diff = endDate.getTime() - Date.now();

      const daysEl = el.querySelector('[data-unit="days"]');
      const hoursEl = el.querySelector('[data-unit="hours"]');
      const minutesEl = el.querySelector('[data-unit="minutes"]');
      const secondsEl = el.querySelector('[data-unit="seconds"]');

      if (diff <= 0) {
        daysEl.textContent = "00";
        hoursEl.textContent = "00";
        minutesEl.textContent = "00";
        secondsEl.textContent = "00";
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      daysEl.textContent = pad(days);
      hoursEl.textContent = pad(hours);
      minutesEl.textContent = pad(minutes);
      secondsEl.textContent = pad(seconds);
    });
  }

  tick();
  setInterval(tick, 1000);
}

document.addEventListener("DOMContentLoaded", initSeasonCountdown);
