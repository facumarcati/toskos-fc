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
