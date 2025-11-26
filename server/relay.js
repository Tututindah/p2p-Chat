import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 9000 });
console.log(`[${new Date().toISOString()}] Signaling server running on ws://localhost:9000`);

// offline message queue per room
const offlineMessages = {};

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.isAuthenticated = false;
  ws.roomId = null;
  ws.address = null;

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      // --- AUTH ---
      if (msg.type === "auth") {
        const { roomId, address } = msg;
        const participants = roomId.split("_");
        if (!participants.includes(address)) {
          ws.send(JSON.stringify({ type: "error", message: "Unauthorized" }));
          return;
        }

        ws.isAuthenticated = true;
        ws.roomId = roomId;
        ws.address = address;

        ws.send(JSON.stringify({ type: "auth-success" }));

        // send pending offline messages
        if (offlineMessages[roomId]) {
          offlineMessages[roomId].forEach(m => ws.send(JSON.stringify(m)));
          offlineMessages[roomId] = [];
        }

        notifyPeerStatus(ws, true);
        return;
      }

      if (!ws.isAuthenticated) return;

      // --- Route messages ---
      let delivered = false;
      wss.clients.forEach((client) => {
        if (
          client !== ws &&
          client.readyState === 1 &&
          client.isAuthenticated &&
          client.roomId === ws.roomId
        ) {
          client.send(raw.toString());
          delivered = true;
        }
      });

      // queue if recipient offline
      if (!delivered && msg.type === "message") {
        if (!offlineMessages[ws.roomId]) offlineMessages[ws.roomId] = [];
        offlineMessages[ws.roomId].push(msg);
      }

    } catch (err) {
      console.error("WS Error:", err);
    }
  });

  ws.on("close", () => {
    if (ws.isAuthenticated) notifyPeerStatus(ws, false);
  });
});

function notifyPeerStatus(senderWs, isOnline) {
  wss.clients.forEach((client) => {
    if (client !== senderWs && client.roomId === senderWs.roomId && client.readyState === 1) {
      client.send(JSON.stringify({ type: "peer-status", status: isOnline ? "online" : "offline" }));
    }
  });
}
