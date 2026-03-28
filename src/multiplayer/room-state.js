import { ROOM_PHASES } from "@/multiplayer/protocol";

export function createInitialRoomState() {
  return {
    roomId: null,
    selfId: null,
    phase: ROOM_PHASES.LOBBY,
    isConnected: false,
    players: [],
    readyMap: {},
    opponentSnapshots: {},
    lastGarbage: null,
    startedAt: null,
    error: null,
  };
}

export function reduceRoomMessage(state, message) {
  if (!message?.type) return state;

  switch (message.type) {
    case "connected":
      return {
        ...state,
        roomId: message.roomId ?? state.roomId,
        selfId: message.selfId ?? state.selfId,
        isConnected: true,
        error: null,
      };

    case "disconnected":
      return {
        ...state,
        isConnected: false,
      };

    case "room_state":
      return {
        ...state,
        phase: message.phase ?? state.phase,
        players: message.players ?? state.players,
        readyMap: message.readyMap ?? state.readyMap,
      };

    case "start":
      return {
        ...state,
        phase: ROOM_PHASES.PLAYING,
        startedAt: message.startedAt ?? Date.now(),
      };

    case "opponent_state":
      return {
        ...state,
        opponentSnapshots: {
          ...state.opponentSnapshots,
          [message.playerId]: message.payload,
        },
      };

    case "receive_garbage":
      return {
        ...state,
        lastGarbage: {
          amount: message.amount,
          holeColumn: message.holeColumn ?? null,
          receivedAt: Date.now(),
        },
      };

    case "player_left": {
      const nextSnapshots = { ...state.opponentSnapshots };
      delete nextSnapshots[message.playerId];

      return {
        ...state,
        players: state.players.filter((player) => player.id !== message.playerId),
        opponentSnapshots: nextSnapshots,
      };
    }

    case "error":
      return {
        ...state,
        error: message.message ?? "Unknown room error",
      };

    default:
      return state;
  }
}
