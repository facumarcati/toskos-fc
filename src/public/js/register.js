document
  .getElementById("registerForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const playerId = document.getElementById("playerId").value;

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, playerId }),
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      window.location.href = "/matches";
    } else {
      const err = document.getElementById("registerError");

      err.textContent = data.message || "error";

      err.style.display = "block";
    }
  });
