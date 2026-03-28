# Tetris Web Handoff

## Project State

- Repo: `tetris-web`
- Frontend: React + Vite
- Current branch: `main`
- Multiplayer foundation has been added but is still a draft
- Latest pushed multiplayer/layout commits:
  - `ddfdf06` `Add extensible realtime multiplayer foundation`
  - `0851f08` `Adjust opponent preview layout`

## What Was Implemented

### Single Player

- `hold` feature added
- `next` preview expanded to 3 pieces
- preview layout stabilized so piece shape changes do not shift panel height
- ghost piece border color now matches active piece color

### Multiplayer Foundation

- game logic split out of `App.jsx`
- provider-agnostic realtime layer added
- PartyKit room server draft added
- custom Node WebSocket server draft added
- right-side multiplayer control panel added
- opponent preview moved to a small dock on the right side of the main board

## Important Files

### Frontend

- `src/App.jsx`
  - main page layout
  - multiplayer controls
  - board rendering
- `src/App.css`
  - full layout and multiplayer UI styles
- `src/hooks/useTetrisGame.js`
  - local game loop and actions
- `src/components/OpponentBoard.jsx`
  - opponent mini board
- `src/components/ui/input.jsx`
  - simple input wrapper for room controls

### Game Logic

- `src/game/pieces.js`
- `src/game/rules.js`
- `src/game/engine.js`
- `src/game/serialize.js`

### Multiplayer

- `src/multiplayer/protocol.js`
  - shared message contract
- `src/multiplayer/providers.js`
  - PartyKit vs custom websocket URL building
- `src/multiplayer/client.js`
  - provider-agnostic room client hook
- `src/multiplayer/room-state.js`
  - room reducer/state

### Server Options

- `partykit/server.ts`
  - PartyKit room draft
- `server/custom-ws-server.mjs`
  - standalone Node WebSocket server draft

## Realtime Architecture

The frontend is no longer hardcoded to PartyKit.

Supported providers:

- `partykit`
- `websocket`

The frontend always talks the same protocol:

- `join`
- `ready`
- `state`
- `attack`
- `game_over`
- `ping`

Expected server messages:

- `connected`
- `room_state`
- `start`
- `opponent_state`
- `receive_garbage`
- `player_left`
- `error`
- `pong`

This means PartyKit can be replaced later by a custom backend without rewriting game UI.

## Current UI Behavior

- left card: local stats, hold, next, controls
- center card: local board
- opponent preview: small dock to the right of the board
- right card: provider select, endpoint input, room join/leave, ready/unready, players list

## Environment Variables

Use `.env.local`.

Available vars:

- `VITE_PARTYKIT_HOST=your-project.your-name.partykit.dev`
- `VITE_WS_SERVER_URL=ws://localhost:8787/rooms`

Example source file:

- `.env.example`

## Scripts

- `npm run dev`
  - Vite frontend
- `npm run build`
  - production build
- `npm run dev:party`
  - local PartyKit dev server
- `npm run deploy:party`
  - deploy PartyKit server
- `npm run tail:party`
  - PartyKit logs
- `npm run dev:ws`
  - local custom websocket server

## Verified Working

- `npm.cmd run build` passed after latest layout and multiplayer changes
- `node server/custom-ws-server.mjs` started successfully and listened on:
  - `ws://localhost:8787/rooms/<roomId>`

## Known Issues / Incomplete Areas

### PartyKit

- PartyKit login page returned:
  - `500: INTERNAL_SERVER_ERROR`
  - `Code: MIDDLEWARE_INVOCATION_FAILED`
- Because of that, PartyKit cloud deployment was blocked during this session
- PartyKit code remains in repo, but actual login/deploy was not completed

### Multiplayer Logic

- no seed-based piece synchronization yet
- both clients currently run local simulation independently
- `start` message resets game, but does not yet use a shared deterministic piece seed
- no reconnect handling
- no match result screen
- no auth/user identity
- no persistence
- no anti-cheat or server-authoritative simulation

### Custom WS Server

- minimal in-memory room server only
- no database
- no horizontal scaling
- no production auth/security hardening
- good for prototype only

## Recommended Next Steps

### If PartyKit Recovers

1. Run `npx partykit login`
2. Run `npm run dev:party`
3. Run `npm run deploy:party`
4. Put deployed host into `.env.local`
5. Test frontend with provider `PartyKit`

### If Moving To Custom Backend

1. Run `npm run dev:ws`
2. Run `npm run dev`
3. In UI choose provider `Custom WS`
4. Use endpoint `ws://localhost:8787/rooms`
5. Join same room in two browser windows

### Most Valuable Engineering Work Next

1. Add deterministic seeded piece queue shared across players
2. Move room state UI into dedicated components
3. Add route-based lobby and room pages
4. Add reconnect and resume behavior
5. Add Railway deployment path for `server/custom-ws-server.mjs`

## Notes For Future Assistant

- Do not collapse the provider abstraction back into PartyKit-specific code
- Keep frontend talking only to the shared room protocol
- If replacing backend, update `src/multiplayer/providers.js` and server implementation, not the game UI
- User wanted extensibility specifically so PartyKit can be swapped out later
- User also prefers pragmatic progress over theoretical planning
