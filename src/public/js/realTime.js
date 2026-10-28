const socket = io();

socket.on("match:created", () => {
  document.dispatchEvent(new Event("club:refresh"));
  sessionStorage.setItem(
    "pendingToast",
    JSON.stringify({ message: "✓ Partido guardado", type: "success" }),
  );

  if (window.location.pathname === "/matches") location.reload();
  if (window.location.pathname === "/stats") location.reload();
});

socket.on("match:updated", () => {
  document.dispatchEvent(new Event("club:refresh"));
  sessionStorage.setItem(
    "pendingToast",
    JSON.stringify({ message: "✓ Partido actualizado", type: "success" }),
  );

  if (window.location.pathname === "/matches") location.reload();
  if (window.location.pathname === "/stats") location.reload();
});

socket.on("match:deleted", () => {
  document.dispatchEvent(new Event("club:refresh"));
  sessionStorage.setItem(
    "pendingToast",
    JSON.stringify({ message: "✓ Partido eliminado", type: "error" }),
  );

  if (window.location.pathname === "/matches") location.reload();
  if (window.location.pathname === "/stats") location.reload();
});

socket.on("mvp:voted", (summary) => {
  document.dispatchEvent(new CustomEvent("match:mvp-voted", { detail: summary }));
});
