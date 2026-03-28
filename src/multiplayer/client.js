import { useEffect, useMemo, useReducer, useRef } from "react";
import { createInitialRoomState, reduceRoomMessage } from "@/multiplayer/room-state";
import { buildRealtimeUrl, REALTIME_PROVIDERS } from "@/multiplayer/providers";
import {
  createAttackMessage,
  createGameOverMessage,
  createJoinMessage,
  createReadyMessage,
  createStateMessage,
  decodeMessage,
  encodeMessage,
} from "@/multiplayer/protocol";

export function createRoomClient({
  provider = REALTIME_PROVIDERS.PARTYKIT,
  endpoint,
  roomId,
  onMessage,
  onOpen,
  onClose,
  onError,
}) {
  let socket = null;
  let messageHandler = null;

  return {
    connect() {
      socket = new WebSocket(buildRealtimeUrl({ provider, endpoint, roomId }));
      socket.addEventListener("open", onOpen);
      socket.addEventListener("close", onClose);
      socket.addEventListener("error", onError);
      messageHandler = (event) => {
        const message = decodeMessage(event.data);
        if (message) onMessage(message);
      };
      socket.addEventListener("message", messageHandler);
    },

    disconnect() {
      if (socket && messageHandler) {
        socket.removeEventListener("message", messageHandler);
      }
      socket?.close();
      socket = null;
      messageHandler = null;
    },

    send(message) {
      if (!socket || socket.readyState !== WebSocket.OPEN) return false;
      socket.send(encodeMessage(message));
      return true;
    },
  };
}

export function useRoomConnection({
  provider = REALTIME_PROVIDERS.PARTYKIT,
  endpoint,
  roomId,
  playerName,
  enabled = true,
}) {
  const [state, dispatch] = useReducer(reduceRoomMessage, undefined, createInitialRoomState);
  const clientRef = useRef(null);

  const callbacks = useMemo(
    () => ({
      onMessage(message) {
        dispatch(message);
      },
      onOpen() {
        dispatch({ type: "connected", roomId });
      },
      onClose() {
        dispatch({ type: "disconnected" });
      },
      onError() {
        dispatch({ type: "error", message: "Room connection failed" });
      },
    }),
    [roomId]
  );

  useEffect(() => {
    if (!enabled || !endpoint || !roomId) return undefined;

    const client = createRoomClient({
      provider,
      endpoint,
      roomId,
      ...callbacks,
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [callbacks, enabled, endpoint, provider, roomId]);

  useEffect(() => {
    if (!state.isConnected || !playerName) return;
    clientRef.current?.send(createJoinMessage(playerName));
  }, [playerName, state.isConnected]);

  return {
    state,
    provider,
    setReady(ready) {
      clientRef.current?.send(createReadyMessage(ready));
    },
    sendState(payload) {
      clientRef.current?.send(createStateMessage(payload));
    },
    sendAttack(lines) {
      clientRef.current?.send(createAttackMessage(lines));
    },
    sendGameOver() {
      clientRef.current?.send(createGameOverMessage());
    },
    disconnect() {
      clientRef.current?.disconnect();
    },
  };
}
