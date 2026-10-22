// Account markup comes from the session, avoiding a navigation flash.
function initHeaderAccount() {
  const wrapper = document.getElementById("profileWrapper");
  if (!wrapper || wrapper.dataset.initialized) return;
  wrapper.dataset.initialized = "true";
  const button = document.getElementById("profileBtn");
  const menu = document.getElementById("profileMenu");
  function closeAccount() {
    menu.classList.remove("show");
    button.setAttribute("aria-expanded", "false");
  }
  button.addEventListener("click", () => {
    const open = menu.classList.toggle("show");
    button.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) closeAccount();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.classList.contains("show")) {
      closeAccount();
      button.focus();
    }
  });
  document.getElementById("logoutBtn").addEventListener("click", async (event) => {
    const logoutButton = event.currentTarget;
    logoutButton.disabled = true;
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      window.location.href = "/";
    } catch {
      logoutButton.disabled = false;
      if (typeof showToast === "function") showToast("No se pudo cerrar sesión. Intentá de nuevo.", "error");
    }
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHeaderAccount, { once: true });
} else {
  initHeaderAccount();
}
