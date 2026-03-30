// ── Set max date = today on all date inputs ───────────────────────────────────
const today = new Date().toISOString().split("T")[0];
document.querySelectorAll("input[type='date']").forEach((el) => {
  el.setAttribute("max", today);
});

// ── Delete modal ──────────────────────────────────────────────────────────────
const deleteModalEl  = document.getElementById("deleteModal");
const deleteCancelEl = document.getElementById("deleteCancelBtn");
const deleteFormEl   = document.getElementById("deleteForm");

function openDeleteModal(url) {
  if (!deleteFormEl || !deleteModalEl) return;
  deleteFormEl.action = url;
  deleteModalEl.classList.add("active");
}

function closeDeleteModal() {
  if (deleteModalEl) deleteModalEl.classList.remove("active");
}

if (deleteCancelEl) deleteCancelEl.addEventListener("click", closeDeleteModal);
if (deleteModalEl)  deleteModalEl.addEventListener("click", (e) => { if (e.target === deleteModalEl) closeDeleteModal(); });

// Wire delete buttons via data attribute (avoids inline onclick blocked by CSP)
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-delete[data-delete-url]");
  if (btn) openDeleteModal(btn.dataset.deleteUrl);
});

// ── Error modal ───────────────────────────────────────────────────────────────
const errorModalEl  = document.getElementById("errorModal");
const errorModalBtn = document.getElementById("errorModalBtn");
const errorMsgEl    = document.getElementById("errorModalMsg");

function showError(message) {
  if (!errorModalEl || !errorMsgEl) return;
  errorMsgEl.textContent = message;
  errorModalEl.classList.add("active");
}

function closeErrorModal() {
  if (errorModalEl) errorModalEl.classList.remove("active");
}

if (errorModalBtn) errorModalBtn.addEventListener("click", closeErrorModal);
if (errorModalEl)  errorModalEl.addEventListener("click", (e) => { if (e.target === errorModalEl) closeErrorModal(); });

// ── Escape key ────────────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeDeleteModal(); closeErrorModal(); }
});

// ── Scroll button ─────────────────────────────────────────────────────────────
const scrollTopBtn = document.getElementById("scrollTop");
if (scrollTopBtn) {
  scrollTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener("scroll", () => {
    scrollTopBtn.classList.toggle("visible", window.scrollY > 300);
  });
}

// ── Nav active state ──────────────────────────────────────────────────────────
const currentPath = window.location.pathname;
document.querySelectorAll("nav a").forEach((link) => {
  link.classList.toggle("nav-active", link.getAttribute("href") === currentPath);
});

// ── Scroll restore on matches page ────────────────────────────────────────────
document.querySelectorAll(".btn-edit").forEach((btn) => {
  btn.addEventListener("click", () => sessionStorage.setItem("scrollPos", window.scrollY));
});

if (window.location.pathname === "/matches") {
  const pos = sessionStorage.getItem("scrollPos");
  if (pos) { window.scrollTo(0, parseInt(pos)); sessionStorage.removeItem("scrollPos"); }
}

// ── Player Search ─────────────────────────────────────────────────────────────
(function() {
  var searchInput = document.getElementById("playerSearchInput");
  var dropdown = document.getElementById("playerSearchDropdown");
  if (!searchInput || !dropdown) return;

  var timeout = null;
  var currentRequest = null;

  function doSearch(q) {
    if (currentRequest) {
      currentRequest.abort();
    }

    dropdown.classList.add("show");

    if (q.length < 1) {
      dropdown.classList.remove("show");
      return;
    }

    currentRequest = new AbortController();

    var url = q.length >= 1 ? "/api/users/search?q=" + encodeURIComponent(q) : "/api/users/search";

    fetch(url, { signal: currentRequest.signal })
      .then(function(r) { return r.json(); })
      .then(function(users) {
        if (users.length === 0) {
          dropdown.innerHTML = '<div class="nav-search-no-results">No se encontraron jugadores</div>';
        } else {
          dropdown.innerHTML = users.map(function(u) {
            var avatar = u.avatar
              ? '<img src="' + u.avatar + '" alt="avatar" class="nav-search-avatar" />'
              : '<div class="nav-search-avatar-placeholder">' + (u.displayName ? u.displayName[0] : "?") + '</div>';
            var href = u.playerId ? '/players/' + u.playerId : '/profile';
            return '<a href="' + href + '" class="nav-search-item">' + avatar + '<span class="nav-search-name">' + u.displayName + '</span></a>';
          }).join("");
        }
      })
      .catch(function(err) {
        if (err.name !== "AbortError") {
          dropdown.classList.remove("show");
        }
      });
  }

  searchInput.addEventListener("input", function() {
    var q = searchInput.value.trim();
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      doSearch(q);
    }, 80);
  });

  searchInput.addEventListener("focus", function() {
    var q = searchInput.value.trim();
    if (q.length >= 1) {
      doSearch(q);
    }
  });

  document.addEventListener("click", function(e) {
    if (!e.target.closest(".nav-search-wrap")) {
      dropdown.classList.remove("show");
    }
  });

  searchInput.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      dropdown.classList.remove("show");
      searchInput.blur();
    }
  });
})();
