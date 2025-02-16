export function createWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  const socket = new WebSocket(wsUrl);

  // Add connection timeout
  const connectionTimeout = setTimeout(() => {
    if (socket.readyState !== WebSocket.OPEN) {
      socket.close();
    }
  }, 5000);

  socket.onopen = () => {
    clearTimeout(connectionTimeout);
  };

  return socket;
}