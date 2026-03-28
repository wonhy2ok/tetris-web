import http from "node:http";
import { WebSocketServer } from "ws";
import { decodeMessage, encodeMessage } from "../src/multiplayer/protocol.js";

const PORT = Number(process.env.PORT ?? 8787);
const ROOM_PREFIX = "/rooms/";

function createRoom(roomId) {
  return {
    id: roomId,
    phase: "lobby",
    players: new Map(),
    readyMap: new Map(),
  };
}

const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, createRoom(roomId));
  }

  return rooms.get(roomId);
}

function roomPayload(room) {
  return {
    type: "room_state",
    phase: room.phase,
    players: Array.from(room.players.values()).map(({ id, name }) => ({ id, name })),
    readyMap: Object.fromEntries(room.readyMap.entries()),
  };
}

function broadcast(room, payload, exceptId = null) {
  const raw = encodeMessage(payload);

  for (const [playerId, player] of room.players.entries()) {
    if (playerId === exceptId) continue;
    if (player.socket.readyState === 1) {
      player.socket.send(raw);
    }
  }
}

function removePlayer(roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.players.delete(playerId);
  room.readyMap.delete(playerId);
  if (room.players.size < 2) {
    room.phase = "lobby";
  }

  broadcast(room, { type: "player_left", playerId });
  broadcast(room, roomPayload(room));

  if (room.players.size === 0) {
    rooms.delete(roomId);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (!url.pathname.startsWith(ROOM_PREFIX)) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }

  const roomId = url.pathname.slice(ROOM_PREFIX.length).trim();
  if (!roomId) {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request, roomId);
  });
});

wss.on("connection", (ws, _request, roomId) => {
  const room = getRoom(roomId);
  const playerId = crypto.randomUUID();

  if (room.players.size >= 2) {
    ws.send(encodeMessage({ type: "error", message: "Room is full" }));
    ws.close();
    return;
  }

  room.players.set(playerId, {
    id: playerId,
    name: `Player-${playerId.slice(0, 4)}`,
    socket: ws,
  });
  room.readyMap.set(playerId, false);

  ws.send(encodeMessage({ type: "connected", roomId, selfId: playerId }));
  ws.send(encodeMessage(roomPayload(room)));
  broadcast(room, roomPayload(room), playerId);

  ws.on("message", (raw) => {
    const message = decodeMessage(raw.toString());
    if (!message?.type) {
      ws.send(encodeMessage({ type: "error", message: "Invalid message" }));
      return;
    }

    switch (message.type) {
      case "join": {
        const player = room.players.get(playerId);
        if (!player) return;

        player.name = message.name?.trim() || player.name;
        broadcast(room, roomPayload(room));
        return;
      }

      case "ready": {
        room.readyMap.set(playerId, Boolean(message.ready));
        broadcast(room, roomPayload(room));

        const everyoneReady =
          room.players.size === 2 && Array.from(room.readyMap.values()).every(Boolean);

        if (everyoneReady) {
          room.phase = "playing";
          broadcast(room, {
            type: "start",
            seed: Math.floor(Math.random() * 1_000_000_000),
            startedAt: Date.now(),
          });
          broadcast(room, roomPayload(room));
        }
        return;
      }

      case "state":
        broadcast(
          room,
          {
            type: "opponent_state",
            playerId,
            payload: message.payload,
          },
          playerId
        );
        return;

      case "attack":
        broadcast(
          room,
          {
            type: "receive_garbage",
            amount: message.lines ?? 0,
          },
          playerId
        );
        return;

      case "game_over":
        room.phase = "finished";
        broadcast(room, roomPayload(room));
        return;

      case "ping":
        ws.send(encodeMessage({ type: "pong", now: Date.now() }));
        return;

      default:
        ws.send(encodeMessage({ type: "error", message: "Unsupported message type" }));
    }
  });

  ws.on("close", () => {
    removePlayer(roomId, playerId);
  });
});

server.listen(PORT, () => {
  console.log(`Custom WS server listening on ws://localhost:${PORT}/rooms/<roomId>`);
});
