# Tetris Web

React + Vite single-player Tetris with a PartyKit multiplayer draft.

## Local Setup

1. Install packages.

```bash
npm install
```

2. Create a local env file.

```bash
copy .env.example .env.local
```

3. Put your realtime endpoint into `.env.local`.

```env
VITE_PARTYKIT_HOST=your-project.your-name.partykit.dev
VITE_WS_SERVER_URL=ws://localhost:8787/rooms
```

## Run

Frontend:

```bash
npm run dev
```

PartyKit room server:

```bash
npm run dev:party
```

Custom WebSocket server:

```bash
npm run dev:ws
```

## Deploy

Frontend goes to Vercel.

PartyKit server goes to PartyKit:

```bash
npm run deploy:party
```

Custom WebSocket server is also supported by the same client contract. Point the app at `VITE_WS_SERVER_URL` or switch the provider in the multiplayer panel.

## Current Multiplayer Scope

- 2-player room draft
- join / leave
- ready / unready
- room start event
- opponent board snapshot relay
- garbage attack relay

## Next Recommended Work

- seed-based piece sync
- proper lobby / room route
- reconnect handling
- battle result UX

## Provider Strategy

The multiplayer client is provider-agnostic.

- `PartyKit` uses `VITE_PARTYKIT_HOST`
- `Custom WS` uses `VITE_WS_SERVER_URL`

Both map to the same room protocol so the frontend can move from PartyKit to your own WebSocket server without changing game UI or message handling.
