(() => {
  const root = document.getElementById("clubTicker");
  if (!root) return;
  const viewport = document.getElementById("clubTickerViewport");
  const track = document.getElementById("clubTickerTrack");
  const pauseButton = document.getElementById("clubTickerPause");
  const cacheKey = "toskos-club-summary-v1";
  const yearFormatter = new Intl.DateTimeFormat("en", {
    timeZone: "America/Argentina/Buenos_Aires", year: "numeric",
  });
  const dateFormatter = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric",
  });
  let data;
  let items = [];
  let signature = "";
  let controller;

  function makeBatch() {
    const batch = document.createElement("div");
    batch.className = "club-ticker-batch";
    items.forEach((item) => {
      const link = document.createElement("a");
      link.className = "club-ticker-item";
      link.href = item.href;
      const label = document.createElement("span");
      label.className = "club-ticker-heading";
      label.textContent = item.label;
      const value = document.createElement("strong");
      value.textContent = item.value;
      link.append(label, value);
      batch.append(link);
    });
    return batch;
  }

  function hideCopy(element) {
    element.setAttribute("aria-hidden", "true");
    element.querySelectorAll("a").forEach((link) => { link.tabIndex = -1; });
    return element;
  }

  function rebuild() {
    if (!items.length) return;
    const cycle = document.createElement("div");
    cycle.className = "club-ticker-cycle";
    const batch = makeBatch();
    cycle.append(batch);
    track.replaceChildren(cycle);
    let repeats = 0;
    while (cycle.scrollWidth < viewport.clientWidth && repeats++ < 8) {
      const extra = hideCopy(batch.cloneNode(true));
      extra.classList.add("club-ticker-extra");
      cycle.append(extra);
    }
    const copy = hideCopy(cycle.cloneNode(true));
    copy.classList.add("club-ticker-copy");
    track.append(copy);
    track.style.setProperty("--ticker-duration", `${Math.max(24, cycle.scrollWidth / 38)}s`);
  }

  function render() {
    const now = new Date();
    const season = Number(yearFormatter.format(now));
    const validData = data?.season === season ? data : null;
    const end = new Date(validData?.seasonEndISO ?? `${season + 1}-01-01T00:00:00-03:00`);
    const days = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
    const next = [];
    const match = validData?.latestMatch;
    if (match && !Number.isNaN(new Date(match.date).getTime())) {
      next.push({
        label: `Último partido · ${dateFormatter.format(new Date(match.date))}${match.matchType === "friendly" ? " · Amistoso" : ""}`,
        value: `Blanco ${match.teamA} — ${match.teamB} Negro`,
        href: `/matches/${encodeURIComponent(match._id)}`,
      });
    }
    next.push({ label: `Cierre de temporada ${season}`, value: `Falta${days === 1 ? "" : "n"} ${days} día${days === 1 ? "" : "s"}`, href: `/trophies?season=${season}` });
    for (const [key, label, sort] of [["scorers", "Goleadores", "goals"], ["assists", "Asistidores", "assists"]]) {
      const ranking = Array.isArray(validData?.[key]) ? validData[key].slice(0, 3) : [];
      next.push({
        label: `${label} ${season}`,
        value: ranking.length
          ? ranking.map((player, index) => `${index + 1}. ${player.name} ${player.value}`).join("  ·  ")
          : validData ? "Todavía sin registros" : "Ver estadísticas de la temporada",
        href: `/stats?season=${season}&sortBy=${sort}&orderDir=desc`,
      });
    }
    const nextSignature = JSON.stringify(next);
    if (nextSignature === signature) return;
    signature = nextSignature;
    items = next;
    rebuild();
  }

  async function refresh() {
    if (document.hidden) return;
    controller?.abort();
    const request = new AbortController();
    controller = request;
    const timeout = setTimeout(() => request.abort(), 8000);
    try {
      const response = await fetch("/api/club-summary", { signal: request.signal });
      if (!response.ok) return;
      const result = await response.json();
      if (request.signal.aborted) return;
      data = result;
      try { sessionStorage.setItem(cacheKey, JSON.stringify(result)); } catch { /* Storage is optional. */ }
      render();
    } catch { /* Keep the last summary or the navigation fallback available. */ }
    finally { clearTimeout(timeout); }
  }

  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey));
    if (cached && Date.now() - Date.parse(cached.updatedAt) < 60_000) data = cached;
  } catch { /* Continue without a cached summary. */ }
  render();
  refresh();
  pauseButton.addEventListener("click", () => {
    const paused = root.dataset.paused !== "true";
    root.dataset.paused = String(paused);
    pauseButton.setAttribute("aria-pressed", String(paused));
    pauseButton.setAttribute("aria-label", paused ? "Reanudar novedades" : "Pausar novedades");
  });
  root.addEventListener("focusin", (event) => {
    if (event.target.closest("a") && event.target.matches(":focus-visible")) root.dataset.keyboard = "true";
  });
  root.addEventListener("focusout", (event) => {
    if (!root.contains(event.relatedTarget)) delete root.dataset.keyboard;
  });
  let lastWidth = viewport.clientWidth;
  new ResizeObserver(([entry]) => {
    if (Math.abs(entry.contentRect.width - lastWidth) > 1) {
      lastWidth = entry.contentRect.width;
      rebuild();
    }
  }).observe(viewport);
  document.fonts?.ready.then(rebuild);
  document.addEventListener("club:refresh", refresh);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  setInterval(() => { if (!document.hidden) { render(); refresh(); } }, 60_000);
})();
