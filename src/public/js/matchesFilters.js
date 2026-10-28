(() => {
  const content = document.getElementById("matchesContent");
  if (!content) return;
  const feedback = document.getElementById("matchesFilterFeedback");
  const status = document.getElementById("matchesFilterStatus");
  const retry = document.getElementById("matchesFilterRetry");
  let request;
  let retryUrl;
  let retryPushHistory;
  let animation;

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
    retryUrl = url;
    retryPushHistory = pushHistory;
    const focused = document.activeElement;
    const focusSelector = content.contains(focused)
      ? focused.matches("select[data-matches-filter]") ? `select[name="${focused.name}"]` : focused.closest(".btn-order") ? ".btn-order" : null
      : null;
    content.setAttribute("aria-busy", "true");
    message("Actualizando partidos…");
    const timeout = setTimeout(() => controller.abort(new Error("Request timed out")), 15000);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { "X-Requested-With": "XMLHttpRequest" }, cache: "no-store" });
      if (!response.ok) throw new Error("Matches request failed");
      const page = new DOMParser().parseFromString(await response.text(), "text/html");
      if (request !== controller) return;
      const next = page.getElementById("matchesContent");
      if (!next) throw new Error("Matches content missing");
      content.replaceChildren(...next.childNodes);
      window.initMatchesOverview?.();
      // Keep the URL aligned when the server clears an unavailable month or venue.
      ["venue", "month"].forEach((name) => {
        const selected = content.querySelector(`select[name="${name}"]`).value;
        if (selected) url.searchParams.set(name, selected);
        else url.searchParams.delete(name);
      });
      if (pushHistory) window.history.pushState({ ...window.history.state, matchesFilters: true }, "", url);
      if (focusSelector && document.activeElement === document.body) content.querySelector(focusSelector)?.focus({ preventScroll: true });
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        animation = content.animate([{ opacity: .45, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 180, easing: "ease-out" });
      }
      message("");
    } catch {
      if (request === controller) message("No se pudieron actualizar los partidos. Intentá de nuevo.", true);
    } finally {
      clearTimeout(timeout);
      if (request === controller) {
        request = null;
        content.removeAttribute("aria-busy");
      }
    }
  }

  content.addEventListener("change", (event) => {
    if (!event.target.matches("select[data-matches-filter]")) return;
    if (event.target.name === "season") content.querySelector('select[name="month"]').value = "";
    event.target.form.requestSubmit();
  });
  content.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form.closest(".matches-filters") || form.method.toLowerCase() !== "get") return;
    event.preventDefault();
    const url = new URL(form.action);
    url.search = new URLSearchParams(new FormData(form)).toString();
    // Read live controls so quick consecutive changes do not reuse stale hidden inputs.
    content.querySelectorAll("select[data-matches-filter]").forEach((select) => {
      url.searchParams.set(select.name, select.value);
    });
    load(url);
  });
  content.addEventListener("click", (event) => {
    const link = event.target.closest("[data-matches-filter-link]");
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    load(new URL(link.href));
  });
  retry.addEventListener("click", () => load(retryUrl, retryPushHistory));
  window.history.replaceState({ ...window.history.state, matchesFilters: true }, "");
  window.addEventListener("popstate", () => {
    if (window.location.pathname === "/matches") load(new URL(window.location.href), false);
  });
})();
