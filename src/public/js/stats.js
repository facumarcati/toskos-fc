const checkbox = document.getElementById("toggleGuests");

if (checkbox) {
  checkbox.addEventListener("change", async () => {
    const season = document.querySelector('select[name="season"]').value;
    const guests = checkbox.checked ? 1 : 0;

    const res = await fetch(`/stats?season=${season}&guests=${guests}`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    const html = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const newTable = doc.querySelector("#stats-table").innerHTML;

    document.querySelector("#stats-table").innerHTML = newTable;
  });
}
