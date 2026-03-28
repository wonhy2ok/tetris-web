export const ROOM_PHASES = {
  LOBBY: "lobby",
  PLAYING: "playing",
  FINISHED: "finished",
};

export const CLIENT_EVENTS = {
  JOIN: "join",
  READY: "ready",
  STATE: "state",
  ATTACK: "attack",
  GAME_OVER: "game_over",
  PING: "ping",
};

export const SERVER_EVENTS = {
  ROOM_STATE: "room_state",
  START: "start",
  OPPONENT_STATE: "opponent_state",
  RECEIVE_GARBAGE: "receive_garbage",
  PLAYER_LEFT: "player_left",
  ERROR: "error",
  PONG: "pong",
};

export function encodeMessage(message) {
  return JSON.stringify(message);
}

export function decodeMessage(raw) {
  if (typeof raw !== "string") return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function createJoinMessage(name) {
  return {
    type: CLIENT_EVENTS.JOIN,
    name,
  };
}

export function createReadyMessage(ready) {
  return {
    type: CLIENT_EVENTS.READY,
    ready,
  };
}

export function createStateMessage(payload) {
  return {
    type: CLIENT_EVENTS.STATE,
    payload,
  };
}

export function createAttackMessage(lines) {
  return {
    type: CLIENT_EVENTS.ATTACK,
    lines,
  };
}

export function createGameOverMessage() {
  return {
    type: CLIENT_EVENTS.GAME_OVER,
  };
}
