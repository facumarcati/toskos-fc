const modal = document.getElementById("deleteModal");

if (modal) {
  modal.addEventListener("click", function (e) {
    if (e.target === this) closeDeleteModal();
  });
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") closeDeleteModal();
});

function openDeleteModal(action) {
  document.getElementById("deleteForm").action = action;
  document.getElementById("deleteModal").classList.add("active");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.remove("active");
}

// Scroll button
const scrollTopBtn = document.getElementById("scrollTop");

window.addEventListener("scroll", () => {
  scrollTopBtn.classList.toggle("visible", window.scrollY > 300);
});

// Keep section navigation active on detail pages, ignoring query parameters.
const path = window.location.pathname;
document.querySelectorAll("[data-nav-link]").forEach((link) => {
  const href = link.getAttribute("href");
  const active = href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
  link.classList.toggle("nav-active", active);
  if (active) link.setAttribute("aria-current", "page");
});

// Guardar scroll al clickear editar
document.addEventListener("click", (event) => {
  if (event.target.closest(".btn-edit")) sessionStorage.setItem("scrollPos", window.scrollY);
});

// Restaurar scroll al cargar matches
if (window.location.pathname === "/matches") {
  const scrollPos = sessionStorage.getItem("scrollPos");
  if (scrollPos) {
    window.scrollTo(0, parseInt(scrollPos));
    sessionStorage.removeItem("scrollPos");
  }
}

function setMenuOpen(open) {
  const menu = document.getElementById("navMenu");
  const button = document.getElementById("navHamburger");
  menu.classList.toggle("open", open);
  button.classList.toggle("open", open);
  button.setAttribute("aria-expanded", String(open));
  button.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  // Hidden mobile links must also be removed from keyboard navigation.
  menu.inert = window.matchMedia("(max-width: 1150px)").matches && !open;
}
function toggleMenu() {
  setMenuOpen(!document.getElementById("navMenu").classList.contains("open"));
}
const navBreakpoint = window.matchMedia("(max-width: 1150px)");
setMenuOpen(false);
navBreakpoint.addEventListener("change", () => setMenuOpen(false));
document.addEventListener("click", (event) => {
  if (!event.target.closest(".site-header")) setMenuOpen(false);
  if (event.target.closest(".nav-menu a")) setMenuOpen(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !document.getElementById("profileMenu")?.classList.contains("show") && document.getElementById("navMenu").classList.contains("open")) {
    setMenuOpen(false);
    document.getElementById("navHamburger").focus();
  }
});

function showToast(message, type = "success", duration = 3000) {
  let toast = document.getElementById("appToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "appToast";
    toast.className = "toast";

    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `toast toast-${type} show`;

  clearTimeout(toast._timeout);

  toast._timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

function initPendingToast() {
  const pending = sessionStorage.getItem("pendingToast");
  if (!pending) return;
  sessionStorage.removeItem("pendingToast");
  const { message, type } = JSON.parse(pending);
  setTimeout(() => showToast(message, type), 300);
}

initPendingToast();

// Registro del Service Worker (PWA)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("Service Worker registrado"))
      .catch((err) => console.error("Error registrando SW:", err));
  });
}
