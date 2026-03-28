export const REALTIME_PROVIDERS = {
  PARTYKIT: "partykit",
  WEBSOCKET: "websocket",
};

export function normalizeEndpoint(endpoint) {
  return endpoint.replace(/\/+$/, "");
}

export function buildRealtimeUrl({ provider, endpoint, roomId }) {
  const normalizedEndpoint = normalizeEndpoint(endpoint);

  if (provider === REALTIME_PROVIDERS.PARTYKIT) {
    const host = normalizedEndpoint.replace(/^https?:\/\//, "").replace(/^wss?:\/\//, "");
    return `wss://${host}/party/tetris/${roomId}`;
  }

  if (provider === REALTIME_PROVIDERS.WEBSOCKET) {
    if (/^wss?:\/\//.test(normalizedEndpoint)) {
      return `${normalizedEndpoint}/${roomId}`;
    }

    if (/^https?:\/\//.test(normalizedEndpoint)) {
      return `${normalizedEndpoint.replace(/^http/, "ws")}/${roomId}`;
    }

    return `ws://${normalizedEndpoint}/${roomId}`;
  }

  throw new Error(`Unsupported realtime provider: ${provider}`);
}

export function getDefaultEndpointForProvider(provider) {
  if (provider === REALTIME_PROVIDERS.PARTYKIT) {
    return import.meta.env.VITE_PARTYKIT_HOST ?? "";
  }

  if (provider === REALTIME_PROVIDERS.WEBSOCKET) {
    return import.meta.env.VITE_WS_SERVER_URL ?? "";
  }

  return "";
}
