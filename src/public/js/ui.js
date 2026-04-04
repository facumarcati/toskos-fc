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

// Nav active state basado en URL actual
const path = window.location.pathname;
document.querySelectorAll("nav a").forEach((link) => {
  link.classList.remove("nav-active");
  if (link.getAttribute("href") === path) {
    link.classList.add("nav-active");
  }
});

// Guardar scroll al clickear editar
document.querySelectorAll(".btn-edit").forEach((btn) => {
  btn.addEventListener("click", () => {
    sessionStorage.setItem("scrollPos", window.scrollY);
  });
});

// Restaurar scroll al cargar matches
if (window.location.pathname === "/matches") {
  const scrollPos = sessionStorage.getItem("scrollPos");
  if (scrollPos) {
    window.scrollTo(0, parseInt(scrollPos));
    sessionStorage.removeItem("scrollPos");
  }
}

// Donut chart
const donutCanvas = document.getElementById("matchDonut");
if (donutCanvas && typeof donutData !== "undefined") {
  const ctx = donutCanvas.getContext("2d");
  const { winsA, winsB, draws } = donutData;
  const total = winsA + winsB + draws;
  const cx = 55,
    cy = 55,
    r = 48;

  if (total > 0) {
    document.querySelectorAll(".donut-legend-item").forEach((item, i) => {
      const values = [winsA, draws, winsB];
      const pct = Math.round((values[i] / total) * 100);
      item.innerHTML =
        item.innerHTML +
        ` - <span style="color:var(--text-secondary); font-weight:400">(${pct}%)</span>`;
    });
  }

  const segments = [
    { value: winsA, color: "#ffffff" },
    { value: draws, color: "#f5c518" },
    { value: winsB, color: "#828b97" },
  ];

  let startAngle = -Math.PI / 2;
  const gap = 0.03;

  segments.forEach((seg) => {
    if (seg.value === 0) return;
    const slice = (seg.value / total) * (Math.PI * 2) - gap;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    startAngle += slice + gap;
  });
}

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

// En el init:
initPendingToast();
