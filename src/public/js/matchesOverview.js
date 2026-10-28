window.initMatchesOverview = function initMatchesOverview() {
  const overview = document.querySelector(".matches-overview");
  if (!overview) return;
  const number = (key) => Math.max(0, Number(overview.dataset[key]) || 0);
  const results = [
    { label: "Blanco", value: number("winsA"), color: "#f2f3f5" },
    { label: "Empates", value: number("draws"), color: "#f5c518" },
    { label: "Negro", value: number("winsB"), color: "#828b97" },
  ];
  const total = results.reduce((sum, result) => sum + result.value, 0);
  const center = overview.querySelector(".matches-ring-center");
  const rows = [...overview.querySelectorAll("[data-result]")];
  const segments = [];
  const percent = (value) => total ? Math.round(value / total * 100) : 0;
  let pinned = null;

  function show(index = pinned) {
    const result = results[index];
    overview.classList.toggle("has-detail", Boolean(result));
    center.querySelector("strong").textContent = result ? result.value : total;
    center.querySelector("span").textContent = result ? `${result.label} · ${percent(result.value)}%` : "Partidos";
    rows.forEach((row, i) => {
      row.classList.toggle("is-highlighted", i === index);
      row.setAttribute("aria-pressed", String(i === pinned));
    });
    segments.forEach(({ circle, index: i }) => circle.classList.toggle("is-highlighted", i === index));
  }

  let offset = 0;
  const nonzero = results.filter((result) => result.value > 0).length;
  results.forEach((result, index) => {
    const share = total ? result.value / total * 100 : 0;
    const row = rows[index];
    row.querySelector(".matches-balance-percent").textContent = `${percent(result.value)}%`;
    row.setAttribute("aria-label", `${result.label}: ${result.value} ${index === 1 ? "empates" : "victorias"}, ${percent(result.value)}%`);
    row.addEventListener("pointerenter", () => show(index));
    row.addEventListener("pointerleave", () => show());
    row.addEventListener("focus", () => show(index));
    row.addEventListener("blur", () => show());
    const toggle = () => { pinned = pinned === index ? null : index; show(); };
    row.addEventListener("click", toggle);

    if (share > 0) {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      Object.entries({ cx: 60, cy: 60, r: 50, fill: "none", "stroke-width": 10, pathLength: 100, stroke: result.color, "stroke-dashoffset": -offset }).forEach(([key, value]) => circle.setAttribute(key, value));
      circle.classList.add("matches-ring-segment");
      circle.style.setProperty("--segment", Math.max(share * .65, share - (nonzero > 1 ? 1 : 0)));
      circle.addEventListener("pointerenter", () => show(index));
      circle.addEventListener("pointerleave", () => show());
      circle.addEventListener("click", toggle);
      overview.querySelector(".matches-ring-segments").append(circle);
      segments.push({ circle, index });
    }
    offset += share;
  });
  const goalsA = number("goalsA");
  const goalsB = number("goalsB");
  const goalsTotal = goalsA + goalsB;
  overview.querySelectorAll(".matches-goals-bar span").forEach((bar, index) => {
    const goals = index === 0 ? goalsA : goalsB;
    bar.style.flex = `${goals} 1 0%`;
    bar.hidden = !goalsTotal || !goals;
  });
  overview.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { pinned = null; show(); }
  });
  show();
};
window.initMatchesOverview();
