document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");

  if (token) {
    window.location.href = "/";

    return;
  }

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem("token", data.token);
      window.location.href = "/";
    } else {
      const err = document.getElementById("loginError");
      err.textContent = "Usuario o contraseña incorrectos";
      err.style.display = "block";
    }
  });
});
