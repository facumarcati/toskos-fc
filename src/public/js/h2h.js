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
      row.querySelector(".col-num").textContent = `${index + 1}`;

      list.appendChild(row);
    });
  });
});
