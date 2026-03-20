async function fetchStats() {
  const season =
    document.querySelector('select[name="season"]')?.value || "2026";
  const sortBy =
    document.querySelector('select[name="sortBy"]')?.value || "goals";
  const orderDir =
    document.querySelector('input[name="orderDir"]')?.value || "desc";
  const guests = document.getElementById("toggleGuests")?.checked ? "1" : "";

  const params = new URLSearchParams({ season, sortBy, orderDir });
  if (guests) params.set("guests", "1");

  history.pushState({}, "", `/stats?${params}`);

  const res = await fetch(`/stats?${params}`, {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });

  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  document.querySelector("#stats-table").innerHTML =
    doc.querySelector("#stats-table").innerHTML;
}

document
  .querySelector('select[name="season"]')
  ?.addEventListener("change", fetchStats);
document
  .querySelector('select[name="sortBy"]')
  ?.addEventListener("change", fetchStats);
document.getElementById("toggleGuests")?.addEventListener("change", fetchStats);
