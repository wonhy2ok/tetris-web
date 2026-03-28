import type * as Party from "partykit/server";

type Player = {
  id: string;
  name: string;
};

type RoomPhase = "lobby" | "playing" | "finished";

type RoomState = {
  players: Map<string, Player>;
  readyMap: Map<string, boolean>;
  phase: RoomPhase;
};

function createRoomState(): RoomState {
  return {
    players: new Map(),
    readyMap: new Map(),
    phase: "lobby",
  };
}

function toRoomPayload(state: RoomState) {
  return {
    type: "room_state",
    phase: state.phase,
    players: Array.from(state.players.values()),
    readyMap: Object.fromEntries(state.readyMap.entries()),
  };
}

export default class TetrisPartyServer implements Party.Server {
  state = createRoomState();

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    conn.send(
      JSON.stringify({
        type: "connected",
        roomId: this.room.id,
        selfId: conn.id,
      })
    );
    conn.send(JSON.stringify(toRoomPayload(this.state)));
  }

  onClose(conn: Party.Connection) {
    this.state.players.delete(conn.id);
    this.state.readyMap.delete(conn.id);

    this.room.broadcast(JSON.stringify({ type: "player_left", playerId: conn.id }));
    this.room.broadcast(JSON.stringify(toRoomPayload(this.state)));

    if (this.state.players.size < 2) {
      this.state.phase = "lobby";
    }
  }

  onMessage(raw: string, sender: Party.Connection) {
    let message: any = null;

    try {
      message = JSON.parse(raw);
    } catch {
      sender.send(JSON.stringify({ type: "error", message: "Invalid JSON message" }));
      return;
    }

    switch (message?.type) {
      case "join":
        this.handleJoin(sender, message);
        return;

      case "ready":
        this.handleReady(sender, message);
        return;

      case "state":
        this.broadcastToOthers(sender.id, {
          type: "opponent_state",
          playerId: sender.id,
          payload: message.payload,
        });
        return;

      case "attack":
        this.broadcastToOthers(sender.id, {
          type: "receive_garbage",
          amount: message.lines ?? 0,
        });
        return;

      case "game_over":
        this.state.phase = "finished";
        this.room.broadcast(JSON.stringify(toRoomPayload(this.state)));
        return;

      case "ping":
        sender.send(JSON.stringify({ type: "pong", now: Date.now() }));
        return;

      default:
        sender.send(JSON.stringify({ type: "error", message: "Unsupported message type" }));
    }
  }

  handleJoin(sender: Party.Connection, message: { name?: string }) {
    if (this.state.players.size >= 2 && !this.state.players.has(sender.id)) {
      sender.send(JSON.stringify({ type: "error", message: "Room is full" }));
      return;
    }

    this.state.players.set(sender.id, {
      id: sender.id,
      name: message.name?.trim() || `Player-${sender.id.slice(0, 4)}`,
    });
    this.state.readyMap.set(sender.id, false);
    this.room.broadcast(JSON.stringify(toRoomPayload(this.state)));
  }

  handleReady(sender: Party.Connection, message: { ready?: boolean }) {
    if (!this.state.players.has(sender.id)) {
      sender.send(JSON.stringify({ type: "error", message: "Join room before readying up" }));
      return;
    }

    this.state.readyMap.set(sender.id, Boolean(message.ready));
    this.room.broadcast(JSON.stringify(toRoomPayload(this.state)));

    const everyoneReady =
      this.state.players.size === 2 &&
      Array.from(this.state.readyMap.values()).every(Boolean);

    if (!everyoneReady) return;

    this.state.phase = "playing";
    this.room.broadcast(
      JSON.stringify({
        type: "start",
        seed: Math.floor(Math.random() * 1_000_000_000),
        startedAt: Date.now(),
      })
    );
    this.room.broadcast(JSON.stringify(toRoomPayload(this.state)));
  }

  broadcastToOthers(senderId: string, payload: unknown) {
    const raw = JSON.stringify(payload);

    for (const connection of this.room.getConnections()) {
      if (connection.id === senderId) continue;
      connection.send(raw);
    }
  }
}
