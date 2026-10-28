const sortableHeaders = document.querySelectorAll(".sortable-header");

sortableHeaders.forEach((header) => {
  header.addEventListener("click", () => {
    const sortKey = header.dataset.sort;

    const section = header.closest(".product-list-section");

    const list = section.querySelector(".product-list");

    const rows = Array.from(list.querySelectorAll(".h2h-history-row"));

    const currentOrder = header.dataset.order || "desc";

    const newOrder = currentOrder === "desc" ? "asc" : "desc";

    sortableHeaders.forEach((h) => {
      h.dataset.order = "";
      h.classList.remove("active-sort");
    });

    header.dataset.order = newOrder;
    header.classList.add("active-sort");

    rows.sort((a, b) => {
      const aVal = Number(a.dataset[sortKey]);
      const bVal = Number(b.dataset[sortKey]);

      return newOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    rows.forEach((row, index) => {
      list.appendChild(row);
    });

    if (window.renumberVisibleHistoryRows) {
      window.renumberVisibleHistoryRows();
    }
  });
});

function renderH2HChart() {
  const chart = document.getElementById("h2hChart");
  if (!chart) return;
  const chartData = {
    mode: chart.dataset.mode,
    playerA: chart.dataset.playerA,
    playerB: chart.dataset.playerB,
    matches: JSON.parse(chart.dataset.matches || "[]"),
  };

  if (chartData && chartData.matches && chartData.matches.length) {
    const canvas = document.getElementById("h2hChart");

    if (canvas) {
      const ctx = canvas.getContext("2d");

      const ratio = window.devicePixelRatio || 1;

      const width = canvas.offsetWidth;
      const height = 180;

      canvas.width = width * ratio;
      canvas.height = height * ratio;

      ctx.scale(ratio, ratio);

      const paddingTop = 25;
      const paddingBottom = 35;
      const paddingLeft = 55;
      const paddingRight = 20;

      let progression = [0];
      const outcomes = [0];
      let current = 0;

      chartData.matches
        .slice()
        .reverse()
        .forEach((match) => {
          const isWhite = match.teamOfA === "A";

          const goalsA = isWhite ? match.teamA : match.teamB;
          const goalsB = isWhite ? match.teamB : match.teamA;

          const outcome = Math.sign(goalsA - goalsB);
          current += outcome;
          outcomes.push(outcome);

          progression.push(current);
        });

      const maxValue = Math.max(...progression, 2);
      const minValue = Math.min(...progression, -2);

      const chartWidth = width - paddingLeft - paddingRight;
      const chartHeight = height - paddingTop - paddingBottom;

      function getX(i) {
        return paddingLeft + (i / (progression.length - 1)) * chartWidth;
      }

      function getY(v) {
        return (
          paddingTop + ((maxValue - v) / (maxValue - minValue)) * chartHeight
        );
      }

      ctx.strokeStyle = "rgba(255,255,255,.08)";

      ctx.lineWidth = 1;

      for (let i = minValue; i <= maxValue; i++) {
        const y = getY(i);

        ctx.beginPath();

        ctx.moveTo(paddingLeft, y);

        ctx.lineTo(width - paddingRight, y);

        ctx.stroke();
      }

      ctx.font = '12px "Josefin Sans", sans-serif';

      ctx.textAlign = "left";

      ctx.fillStyle = "#ffffff";
      ctx.fillText(chartData.mode === "duo" ? `+${maxValue}` : chartData.playerA, 8, getY(maxValue) + 4);

      ctx.fillStyle = "#ffffff";
      ctx.fillText(chartData.mode === "duo" ? `${minValue}` : chartData.playerB, 8, getY(minValue) + 4);

      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.fillText(chartData.mode === "duo" ? "0" : "E", 8, getY(0) + 4);

      ctx.strokeStyle = "rgba(255,255,255,.18)";

      ctx.beginPath();

      ctx.moveTo(paddingLeft, getY(0));

      ctx.lineTo(width - paddingRight, getY(0));

      ctx.stroke();

      ctx.beginPath();

      progression.forEach((value, index) => {
        const x = getX(index);
        const y = getY(value);

        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.strokeStyle = "#facc15";

      ctx.lineWidth = 3;

      ctx.stroke();

      progression.forEach((value, index) => {
        const x = getX(index);
        const y = getY(value);

        ctx.beginPath();

        ctx.arc(x, y, 5, 0, Math.PI * 2);

        const colorValue = chartData.mode === "duo" ? outcomes[index] : value;
        ctx.fillStyle = colorValue > 0 ? "#22c55e" : colorValue < 0 ? "#ef4444" : "#facc15";

        ctx.fill();

        ctx.font = '10px "Josefin Sans", sans-serif';

        ctx.textAlign = "center";

        ctx.fillStyle = "white";

        const label = chartData.mode === "duo"
          ? (value > 0 ? `+${value}` : `${value}`)
          : `${Math.abs(value)}`;

        ctx.fillText(label, x, y - 12);
      });

      ctx.strokeStyle = "rgba(255,255,255,.15)";

      ctx.lineWidth = 1;

      const axisY = height - paddingBottom + 8;

      ctx.beginPath();

      ctx.moveTo(paddingLeft, axisY);

      ctx.lineTo(width - paddingRight, axisY);

      ctx.stroke();

      ctx.font = '12px "Josefin Sans", sans-serif';

      ctx.fillStyle = "rgba(255,255,255,.55)";

      ctx.textAlign = "center";

      progression.forEach((_, index) => {
        const x = getX(index);

        ctx.beginPath();

        ctx.moveTo(x, axisY - 4);

        ctx.lineTo(x, axisY + 4);

        ctx.stroke();

        if (index >= 0) {
          ctx.fillText(index.toString(), x, axisY + 16);
        }
      });
    }
  }

}

renderH2HChart();

// Both rankings arrive with the records page; switch the existing tables in place.
(function initRecordsCategories() {
  const section = document.querySelector('#records-section[data-loaded="true"]');
  if (!section) return;
  const links = section.querySelectorAll("[data-records-category]");
  const panels = section.querySelectorAll(".records-category");
  const categoryInput = section.querySelector('[name="recordsCategory"]');
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let animation;

  function selectCategory(category, animate = false) {
    animation?.cancel();
    links.forEach((link) => {
      const active = link.dataset.recordsCategory === category;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    panels.forEach((panel) => {
      const active = panel.dataset.category === (category === "duos" ? "duo-records" : "h2h-records");
      panel.classList.toggle("active", active);
      panel.style.display = active ? "" : "none";
      if (active && animate && !reducedMotion.matches) {
        animation = panel.animate([
          { opacity: 0, transform: "translateY(6px)" },
          { opacity: 1, transform: "translateY(0)" },
        ], { duration: 200, easing: "ease-out" });
      }
    });
    categoryInput.value = category;
  }

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const category = link.dataset.recordsCategory;
      if (categoryInput.value === category) return;
      selectCategory(category, true);
      const url = new URL(window.location.href);
      url.searchParams.set("view", "records");
      url.searchParams.set("recordsCategory", category);
      window.history.replaceState(null, "", url);
    });
  });
  selectCategory(categoryInput.value === "duos" ? "duos" : "h2h");
})();

(function () {
  const h2hHeader = document.querySelector(".h2h-list-header");
  if (!h2hHeader) return;

  const h2hList = document.querySelector(".h2h-list");
  if (!h2hList) return;

  let currentSort = "diff";
  let currentDir = "desc";

  function sortH2H(key, dir) {
    const items = Array.from(
      h2hList.querySelectorAll("li:not(.list-empty-state)"),
    );

    const isText = key === "player" || key === "rival";

    items.sort((a, b) => {
      const rowA = a.querySelector(".h2h-list-row");
      const rowB = b.querySelector(".h2h-list-row");

      if (isText) {
        const valA = (rowA?.dataset[key] ?? "").toLowerCase();
        const valB = (rowB?.dataset[key] ?? "").toLowerCase();

        const nameCompare =
          dir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);

        if (nameCompare !== 0) return nameCompare;

        const diffA = parseFloat(rowA?.dataset.diff ?? 0);
        const diffB = parseFloat(rowB?.dataset.diff ?? 0);

        return diffB - diffA;
      }

      const valA = parseFloat(rowA?.dataset[key] ?? 0);
      const valB = parseFloat(rowB?.dataset[key] ?? 0);

      return dir === "desc" ? valB - valA : valA - valB;
    });

    items.forEach((item, i) => {
      const numEl = item.querySelector(".col-num");
      if (numEl) numEl.textContent = `${i + 1}`;
      h2hList.appendChild(item);
    });
  }

  function updateH2HHeaders(activeKey, dir) {
    h2hHeader.querySelectorAll(".h2h-sortable").forEach((el) => {
      el.classList.remove("h2h-sort-active", "h2h-sort-asc");
      if (el.dataset.sort === activeKey) {
        el.classList.add("h2h-sort-active");
        if (dir === "asc") el.classList.add("h2h-sort-asc");
      }
    });
  }

  h2hHeader.querySelectorAll(".h2h-sortable").forEach((el) => {
    el.addEventListener("click", () => {
      const key = el.dataset.sort;
      const isText = key === "player" || key === "rival";

      if (key === currentSort) {
        currentDir = currentDir === "desc" ? "asc" : "desc";
      } else {
        currentSort = key;
        currentDir = isText ? "asc" : "desc";
      }

      sortH2H(currentSort, currentDir);
      updateH2HHeaders(currentSort, currentDir);
    });
  });
})();

(function () {
  const duoHeader = document.querySelector(".duo-list-header");
  if (!duoHeader) return;

  const duoList = document.querySelector(".duo-list");
  if (!duoList) return;

  let currentSort = "wr";
  let currentDir = "desc";

  function sortDuos(key, dir) {
    const items = Array.from(
      duoList.querySelectorAll("li:not(.list-empty-state)"),
    );

    items.sort((a, b) => {
      const rowA = a.querySelector(".duo-list-row");
      const rowB = b.querySelector(".duo-list-row");
      const valA = parseFloat(rowA?.dataset[key] ?? 0);
      const valB = parseFloat(rowB?.dataset[key] ?? 0);
      return dir === "desc" ? valB - valA : valA - valB;
    });

    items.forEach((item, i) => {
      const numEl = item.querySelector(".col-num");
      if (numEl) numEl.textContent = `${i + 1}`;
      duoList.appendChild(item);
    });
  }

  function updateDuoHeaders(activeKey, dir) {
    duoHeader.querySelectorAll(".h2h-sortable").forEach((el) => {
      el.classList.remove("h2h-sort-active", "h2h-sort-asc");
      if (el.dataset.sort === activeKey) {
        el.classList.add("h2h-sort-active");
        if (dir === "asc") el.classList.add("h2h-sort-asc");
      }
    });
  }

  duoHeader.querySelectorAll(".h2h-sortable").forEach((el) => {
    el.addEventListener("click", () => {
      const key = el.dataset.sort;
      if (key === currentSort) {
        currentDir = currentDir === "desc" ? "asc" : "desc";
      } else {
        currentSort = key;
        currentDir = "desc";
      }
      sortDuos(currentSort, currentDir);
      updateDuoHeaders(currentSort, currentDir);
    });
  });
})();

(function () {
  const btn = document.getElementById("rivalFilterBtn");
  const panel = document.getElementById("rivalFilterPanel");
  const clearBtn = document.getElementById("rivalFilterClear");
  const countEl = document.getElementById("rivalFilterCount");

  if (!btn || !panel) return;

  const checkboxes = Array.from(
    panel.querySelectorAll(".rival-filter-checkbox"),
  );

  function getRows() {
    return Array.from(document.querySelectorAll(".h2h-history-row"));
  }

  function renumberVisibleRows() {
    let i = 1;
    getRows().forEach((row) => {
      if (row.style.display !== "none") {
        const numEl = row.querySelector(".col-num");
        if (numEl) numEl.textContent = `${i}`;
        i++;
      }
    });
  }

  function applyFilter() {
    const selected = checkboxes.filter((c) => c.checked).map((c) => c.value);

    getRows().forEach((row) => {
      const oppId = row.dataset.opponentId;
      const visible = selected.length === 0 || selected.includes(oppId);
      row.style.display = visible ? "" : "none";
    });

    renumberVisibleRows();
    countEl.textContent = "- " + selected.length || "";
    countEl.style.display = selected.length ? "inline-flex" : "none";
  }

  btn.addEventListener("click", () => {
    panel.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && e.target !== btn) {
      panel.classList.remove("open");
    }
  });

  checkboxes.forEach((c) => c.addEventListener("change", applyFilter));

  clearBtn.addEventListener("click", () => {
    checkboxes.forEach((c) => (c.checked = false));
    applyFilter();
  });

  window.renumberVisibleHistoryRows = renumberVisibleRows;
})();

// Update only comparison results; the selected players remain in the same form.
(function initComparison() {
  const form = document.getElementById("h2h-compare-form");
  if (!form) return;

  const results = document.getElementById("h2h-compare-results");
  const status = document.getElementById("h2h-compare-status");
  const mode = form.elements.namedItem("mode");
  const playerA = form.elements.namedItem("playerA");
  const playerB = form.elements.namedItem("playerB");
  const modeButtons = form.querySelectorAll("[data-compare-mode]");
  let currentRequest = null;

  function showStatus(message) {
    status.textContent = message;
    status.hidden = !message;
  }

  function resetResults() {
    currentRequest?.abort();
    currentRequest = null;
    results.replaceChildren();
    results.removeAttribute("aria-busy");
    showStatus("");
  }

  async function updateComparison() {
    resetResults();
    if (!playerA.value || !playerB.value) {
      showStatus("Seleccioná los dos jugadores para ver la comparación.");
      return;
    }
    if (playerA.value === playerB.value) {
      showStatus("Seleccioná dos jugadores diferentes.");
      return;
    }

    const controller = new AbortController();
    currentRequest = controller;
    const url = new URL(form.action);
    url.search = new URLSearchParams(new FormData(form)).toString();
    results.setAttribute("aria-busy", "true");
    showStatus("Cargando comparación…");

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      if (!response.ok) throw new Error("Comparison request failed");
      const html = await response.text();
      if (controller.signal.aborted) return;
      const page = new DOMParser().parseFromString(html, "text/html");
      const nextResults = page.getElementById("h2h-compare-results");
      if (!nextResults) throw new Error("Comparison results missing");
      results.replaceChildren(...nextResults.childNodes);
      renderH2HChart();
      window.history.replaceState(null, "", url);
      showStatus("");
    } catch (error) {
      if (controller.signal.aborted) return;
      showStatus("No se pudo cargar la comparación. Intentá de nuevo con Comparar.");
    } finally {
      if (currentRequest === controller) {
        currentRequest = null;
        results.removeAttribute("aria-busy");
      }
    }
  }

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (mode.value === button.dataset.compareMode) return;
      mode.value = button.dataset.compareMode;
      modeButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      document.getElementById("h2h-comparison-separator").textContent = mode.value === "duo" ? "&" : "VS";
      resetResults();
      if (playerA.value && playerB.value) updateComparison();
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    updateComparison();
  });
  form.addEventListener("change", resetResults);
})();
