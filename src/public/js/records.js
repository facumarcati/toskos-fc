document.querySelectorAll(".records-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const category = tab.dataset.category;

    document.querySelectorAll(".records-tab").forEach((item) => {
      item.classList.toggle("active", item === tab);
    });
    document.querySelectorAll(".records-category").forEach((section) => {
      section.classList.toggle("active", section.dataset.category === category);
    });
  });
});

document.querySelectorAll(".records-toggle").forEach((button) => {
  let animation;

  button.addEventListener("click", () => {
    const list = document.getElementById(button.getAttribute("aria-controls"));
    const expanded = button.getAttribute("aria-expanded") !== "true";
    const startHeight = list.getBoundingClientRect().height;
    animation?.cancel();

    list.querySelectorAll(".record-card").forEach((card, index) => {
      card.hidden = !expanded && index >= 3;
    });
    button.setAttribute("aria-expanded", String(expanded));
    button.textContent = expanded ? "Mostrar menos" : "Mostrar más";

    const endHeight = list.getBoundingClientRect().height;
    if (startHeight && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      animation = list.animate(
        [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
        { duration: 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }
  });
});
