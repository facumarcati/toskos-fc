const socket = io();

socket.on("match:created", () => {
  sessionStorage.setItem(
    "pendingToast",
    JSON.stringify({ message: "✓ Partido guardado", type: "success" }),
  );

  if (window.location.pathname === "/matches") location.reload();
  if (window.location.pathname === "/stats") location.reload();
});

socket.on("match:updated", () => {
  sessionStorage.setItem(
    "pendingToast",
    JSON.stringify({ message: "✓ Partido actualizado", type: "success" }),
  );

  if (window.location.pathname === "/matches") location.reload();
  if (window.location.pathname === "/stats") location.reload();
});

socket.on("match:deleted", () => {
  sessionStorage.setItem(
    "pendingToast",
    JSON.stringify({ message: "✓ Partido eliminado", type: "error" }),
  );

  if (window.location.pathname === "/matches") location.reload();
  if (window.location.pathname === "/stats") location.reload();
});
