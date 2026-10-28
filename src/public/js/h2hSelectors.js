// Keep native selects as the form values and as a fallback without JavaScript.
(() => {
  const pickers = [];
  const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
  const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toLocaleUpperCase("es");

  document.querySelectorAll("[data-h2h-player]").forEach((select) => {
    const wrapper = document.createElement("div");
    wrapper.className = "h2h-picker";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "h2h-picker-trigger";
    trigger.id = `${select.id}-trigger`;
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", `${select.id}-panel`);
    trigger.innerHTML = '<span class="h2h-picker-avatar" aria-hidden="true"></span><span class="h2h-picker-text"><strong></strong><small></small></span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m7 10 5 5 5-5"/></svg>';
    const panel = document.createElement("div");
    panel.className = "h2h-picker-panel";
    panel.id = `${select.id}-panel`;
    panel.hidden = true;
    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Buscar jugador…";
    search.setAttribute("aria-label", "Buscar jugador por nombre");
    search.autocomplete = "off";
    const list = document.createElement("div");
    list.className = "h2h-picker-list";
    const empty = document.createElement("p");
    empty.className = "h2h-picker-empty";
    empty.setAttribute("role", "status");
    empty.textContent = "No hay jugadores con ese nombre.";
    panel.append(search, list, empty);
    wrapper.append(trigger, panel);
    select.after(wrapper);
    select.hidden = true;
    const label = document.querySelector(`label[for="${select.id}"]`);
    if (label) label.htmlFor = trigger.id;

    function close(restoreFocus = false) {
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    }

    function render() {
      const opponentName = select.name === "playerA" ? "playerB" : select.name === "playerB" ? "playerA" : null;
      const opponent = opponentName ? select.form.elements.namedItem(opponentName)?.value : null;
      list.replaceChildren();
      for (const option of select.options) {
        if (!option.value || !normalize(option.text).includes(normalize(search.value))) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "h2h-picker-option";
        button.textContent = option.text.trim();
        button.disabled = option.value === opponent;
        button.setAttribute("aria-pressed", String(option.selected));
        if (button.disabled) button.title = "Ya seleccionado en el otro lado";
        button.addEventListener("click", () => {
          select.value = option.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          close(true);
        });
        list.append(button);
      }
      empty.hidden = list.children.length > 0;
    }

    function sync() {
      const name = select.value ? select.selectedOptions[0].text.trim() : "Elegí un jugador";
      trigger.querySelector("strong").textContent = name;
      trigger.querySelector("small").textContent = select.value ? "Cambiar jugador" : "Buscá por nombre";
      trigger.querySelector(".h2h-picker-avatar").textContent = select.value ? initials(name) : "+";
      trigger.classList.toggle("has-player", Boolean(select.value));
      trigger.setAttribute("aria-label", `${label?.textContent.trim() || "Jugador"}: ${name}`);
      if (!panel.hidden) render();
    }

    trigger.addEventListener("click", () => {
      const open = panel.hidden;
      pickers.forEach((picker) => picker.close());
      if (!open) return;
      search.value = "";
      render();
      panel.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      search.focus();
    });
    search.addEventListener("input", render);
    // A search change fires on blur, before the clicked option receives its click.
    // Only selecting a player should notify the form and refresh its controls.
    search.addEventListener("change", (event) => event.stopPropagation());
    wrapper.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        event.preventDefault();
        close(true);
      }
      if (panel.hidden || !["ArrowDown", "ArrowUp"].includes(event.key)) return;
      event.preventDefault();
      const options = [...list.querySelectorAll("button:not(:disabled)")];
      const index = options.indexOf(document.activeElement);
      const next = event.key === "ArrowDown" ? index + 1 : index < 0 ? options.length - 1 : index - 1;
      options[(next + options.length) % options.length]?.focus();
    });
    search.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        list.querySelector("button:not(:disabled)")?.click();
      }
    });
    wrapper.addEventListener("focusout", (event) => {
      if (!wrapper.contains(event.relatedTarget)) close();
    });
    document.addEventListener("click", (event) => {
      if (!wrapper.contains(event.target)) close();
    });
    pickers.push({ close, sync });
    sync();
  });

  document.querySelectorAll(".h2h-form").forEach((form) => {
    form.addEventListener("change", (event) => {
      if (event.target.matches("[data-h2h-player]")) {
        pickers.forEach((picker) => picker.sync());
      }
    });
  });
  const swap = document.getElementById("h2h-swap");
  if (swap) {
    swap.hidden = false;
    swap.addEventListener("click", () => {
      const form = document.getElementById("h2h-compare-form");
      const a = form.elements.namedItem("playerA");
      const b = form.elements.namedItem("playerB");
      [a.value, b.value] = [b.value, a.value];
      a.dispatchEvent(new Event("change", { bubbles: true }));
      if (a.value && b.value) form.requestSubmit();
    });
  }
})();
