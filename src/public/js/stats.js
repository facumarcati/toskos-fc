(() => {
  const table = document.getElementById("stats-table");
  if (!table) return;
  const season = document.querySelector('select[name="season"]');
  const guests = document.getElementById("toggleGuests");
  const sort = document.getElementById("selectedSort");
  const direction = document.getElementById("selectedOrderDir");
  const label = document.getElementById("statsSeasonLabel");
  const feedback = document.getElementById("statsFeedback");
  const status = document.getElementById("statsStatus");
  const retry = document.getElementById("statsRetry");
  let request;
  let animation;
  let retryRequest;

  function message(text, failed = false) {
    feedback.hidden = !text;
    status.textContent = text;
    retry.hidden = !failed;
  }

  async function load(url, pushHistory = true) {
    request?.abort();
    animation?.cancel();
    const controller = new AbortController();
    request = controller;
    retryRequest = { url, pushHistory };
    table.setAttribute("aria-busy", "true");
    message("");
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "X-Requested-With": "XMLHttpRequest" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Stats request failed");
      const page = new DOMParser().parseFromString(await response.text(), "text/html");
      if (request !== controller) return;
      const nextTable = page.getElementById("stats-table");
      const nextLabel = page.getElementById("statsSeasonLabel");
      if (!nextTable || !nextLabel) throw new Error("Stats content missing");
      table.replaceChildren(...nextTable.childNodes);
      label.textContent = nextLabel.textContent;
      season.value = page.querySelector('select[name="season"]').value;
      guests.checked = page.getElementById("toggleGuests").checked;
      sort.value = page.getElementById("selectedSort").value;
      direction.value = page.getElementById("selectedOrderDir").value;
      if (pushHistory) window.history.pushState({ ...window.history.state, statsFilters: true }, "", url);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        animation = table.animate([
          { opacity: .75 },
          { opacity: 1 },
        ], { duration: 120, easing: "ease-out" });
      }
      message("");
    } catch {
      if (request === controller) message("No se pudieron actualizar las estadísticas. Intentá de nuevo.", true);
    } finally {
      clearTimeout(timeout);
      if (request === controller) {
        request = null;
        table.removeAttribute("aria-busy");
      }
    }
  }

  function fetchStats() {
    const url = new URL("/stats", window.location.href);
    url.search = new URLSearchParams({ season: season.value, sortBy: sort.value, orderDir: direction.value }).toString();
    if (guests.checked) url.searchParams.set("guests", "1");
    load(url);
  }

  season.addEventListener("change", fetchStats);
  guests.addEventListener("change", fetchStats);
  document.querySelectorAll("[data-stats-filter-form]").forEach((form) => {
    form.addEventListener("submit", (event) => { event.preventDefault(); fetchStats(); });
  });
  // Delegation keeps sorting active after replacing the table.
  table.addEventListener("click", (event) => {
    const header = event.target.closest(".sortable-header");
    if (!header || !table.contains(header)) return;
    direction.value = sort.value === header.dataset.sort && direction.value === "desc" ? "asc" : "desc";
    sort.value = header.dataset.sort;
    fetchStats();
  });
  retry.addEventListener("click", () => load(retryRequest.url, retryRequest.pushHistory));
  window.history.replaceState({ ...window.history.state, statsFilters: true }, "");
  window.addEventListener("popstate", () => {
    if (window.location.pathname === "/stats") load(new URL(window.location.href), false);
  });
})();
