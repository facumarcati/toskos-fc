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

    const msg = document.getElementById("registerError");

    if (data.success) {
      msg.textContent = "Cuenta creada. Esperá que el admin la apruebe.";

      msg.className = "form-message success";
    } else {
      msg.textContent = data.message || "Error";

      msg.className = "form-message error";
    }

    msg.style.display = "block";
  });
