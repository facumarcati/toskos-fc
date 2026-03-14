const socket = io();

socket.on("match:created", () => {
  if (window.location.pathname === "/matches") location.reload();
  if (window.location.pathname === "/stats") location.reload();
});

socket.on("match:updated", () => {
  if (window.location.pathname === "/matches") location.reload();
  if (window.location.pathname === "/stats") location.reload();
});

socket.on("match:deleted", () => {
  if (window.location.pathname === "/matches") location.reload();
  if (window.location.pathname === "/stats") location.reload();
});
