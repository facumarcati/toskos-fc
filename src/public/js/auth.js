document.addEventListener("DOMContentLoaded", () => {
  const navAuth = document.getElementById("navAuth");

  if (!navAuth) return;

  const token = localStorage.getItem("token");

  if (!token) {
    navAuth.innerHTML = `
      <a href="/login">
        Login
      </a>
    `;
  } else {
    navAuth.innerHTML = `
      <div class="profile-wrapper" id="profileWrapper">
        <div
          class="profile-circle"
          id="profileBtn"
        >
          👤
        </div>
        <div
          id="profileMenu"
          class="profile-menu"
        >
          <button id="logoutBtn">
            Cerrar sesión
          </button>
        </div>
      </div>
    `;

    const profileBtn = document.getElementById("profileBtn");
    const profileMenu = document.getElementById("profileMenu");
    const wrapper = document.getElementById("profileWrapper");

    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      profileMenu.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target)) {
        profileMenu.classList.remove("show");
      }
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.removeItem("token");

      location.reload();
    });
  }

  const newMatchLink = document.querySelector('a[href="/matches/new"]');

  if (!token && newMatchLink) {
    newMatchLink.style.display = "none";
  }

  const editButton = document.querySelectorAll(".btn-edit");
  const deleteButton = document.querySelectorAll(".btn-delete");

  if (!token) {
    editButton.forEach((btn) => {
      btn.style.display = "none";
    });

    deleteButton.forEach((btn) => {
      btn.style.display = "none";
    });
  }
});
