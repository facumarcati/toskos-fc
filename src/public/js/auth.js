document.addEventListener("DOMContentLoaded", async () => {
  const navAuth = document.getElementById("navAuth");
  if (!navAuth) return;

  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    const data = await res.json();

    if (!data.success) {
      // Usuario no logueado: mostramos login y registro
      navAuth.innerHTML = `
        <a href="/login">Login</a>
        <a href="/register" class="btn-register">Registrarse</a>
      `;
      return;
    }

    const username = data.username;

    navAuth.innerHTML = `
      <div class="profile-wrapper" id="profileWrapper">
        <span class="profile-username">${username}</span>
        <div class="profile-circle" id="profileBtn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" > <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/> </svg>
        </div>
        <div id="profileMenu" class="profile-menu">
          <button id="logoutBtn">Cerrar sesión</button>
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
      if (!wrapper.contains(e.target)) profileMenu.classList.remove("show");
    });

    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      window.location.href = "/";
    });
  } catch (err) {
    console.error(err);
    navAuth.innerHTML = `
      <a href="/login">Login</a>
      <a href="/register" class="btn-register">Registrarse</a>
    `;
  }
});
