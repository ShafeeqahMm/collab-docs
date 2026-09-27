import { WebSocketServer, WebSocket } from "ws";

/**
 * A deliberately simple real-time sync server: last-write-wins broadcast,
 * no conflict resolution. Every client editing document X is in the same
 * "room"; when one sends a content update, everyone else in that room gets
 * it immediately. Two people typing in the exact same spot at the exact same
 * moment can still clobber each other - that's the known limitation this
 * phase accepts. A CRDT library like Yjs is the fix for that, and is a
 * natural "next phase" once this simpler version is working end to end.
 *
 * This runs as its own Node process (separate from `next dev`) because
 * Next.js's dev server doesn't keep a WebSocket connection alive the way a
 * dedicated server does.
 */

const PORT = Number(process.env.WS_PORT ?? 4000);
const wss = new WebSocketServer({ port: PORT });

// documentId -> set of connected clients viewing that document
const rooms = new Map<string, Set<WebSocket>>();

interface IncomingMessage {
  type: "join" | "update";
  documentId: string;
  content?: string;
  senderId?: string;
}

function joinRoom(documentId: string, ws: WebSocket) {
  if (!rooms.has(documentId)) rooms.set(documentId, new Set());
  rooms.get(documentId)!.add(ws);
}

function leaveAllRooms(ws: WebSocket) {
  for (const clients of rooms.values()) {
    clients.delete(ws);
  }
}

function broadcastToRoom(documentId: string, message: unknown, exclude: WebSocket) {
  const clients = rooms.get(documentId);
  if (!clients) return;
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

wss.on("connection", (ws) => {
  let currentDocumentId: string | null = null;

  ws.on("message", (raw) => {
    let msg: IncomingMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return; // ignore malformed messages rather than crashing the connection
    }

    if (msg.type === "join") {
      currentDocumentId = msg.documentId;
      joinRoom(msg.documentId, ws);
      return;
    }

    if (msg.type === "update" && currentDocumentId) {
      broadcastToRoom(
        currentDocumentId,
        { type: "update", content: msg.content, senderId: msg.senderId },
        ws
      );
    }
  });

  ws.on("close", () => {
    leaveAllRooms(ws);
  });
});

// eslint-disable-next-line no-console
console.log(`[sync-server] listening on ws://localhost:${PORT}`);
