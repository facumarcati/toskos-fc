async function fetchStats() {
  const season =
    document.querySelector('select[name="season"]')?.value || "2026";

  const sortBy = document.getElementById("selectedSort")?.value || "goals";

  const orderDir = document.getElementById("selectedOrderDir")?.value || "desc";

  const guests = document.getElementById("toggleGuests")?.checked ? "1" : "";

  const params = new URLSearchParams({
    season,
    sortBy,
    orderDir,
  });

  if (guests) {
    params.set("guests", "1");
  }

  history.pushState({}, "", `/stats?${params}`);

  const res = await fetch(`/stats?${params}`, {
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");

  document.querySelector("#stats-table").innerHTML =
    doc.querySelector("#stats-table").innerHTML;

  attachSortEvents();
}

function attachSortEvents() {
  document.querySelectorAll(".sortable-header").forEach((header) => {
    header.addEventListener("click", () => {
      const selectedSort = document.getElementById("selectedSort");
      const selectedOrderDir = document.getElementById("selectedOrderDir");
      const clickedSort = header.dataset.sort;

      if (selectedSort.value === clickedSort) {
        selectedOrderDir.value =
          selectedOrderDir.value === "desc" ? "asc" : "desc";
      } else {
        selectedSort.value = clickedSort;
        selectedOrderDir.value = "desc";
      }

      fetchStats();
    });
  });
}

document
  .querySelector('select[name="season"]')
  ?.addEventListener("change", fetchStats);

document.getElementById("toggleGuests")?.addEventListener("change", fetchStats);

attachSortEvents();
