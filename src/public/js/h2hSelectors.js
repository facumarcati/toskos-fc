// Prevent choosing the same player on both sides of a comparison.
(() => {
  const form = document.getElementById("h2h-compare-form");
  if (!form) return;
  const a = form.elements.namedItem("playerA");
  const b = form.elements.namedItem("playerB");
  function syncPlayerOptions() {
    for (const [select, other] of [[a, b], [b, a]]) {
      for (const option of select.options) {
        option.disabled = Boolean(option.value && option.value === other.value);
      }
    }
  }
  form.addEventListener("change", syncPlayerOptions);
  syncPlayerOptions();
})();
