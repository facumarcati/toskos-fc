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
    credentials: "include",
  });

  const data = await response.json();

  if (data.success) {
    window.location.href = "/";

    return;
  }

  const err = document.getElementById("loginError");

  err.textContent = data.message || "Error al iniciar sesión";
  err.style.display = "block";
});
