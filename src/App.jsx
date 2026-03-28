import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCw, RefreshCw, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BOARD_HEIGHT, BOARD_WIDTH, PIECES } from "@/game/pieces";
import { toOpponentSnapshot } from "@/game/serialize";
import { useTetrisGame } from "@/hooks/useTetrisGame";
import { useRoomConnection } from "@/multiplayer/client";
import { getDefaultEndpointForProvider, REALTIME_PROVIDERS } from "@/multiplayer/providers";
import { OpponentBoard } from "@/components/OpponentBoard";
import "./App.css";

const BOARD_BEZEL_CHROME = 28;
const BOARD_CELL_MIN = 14;
const BOARD_CELL_MAX = 128;

const PIECE_COLOR_BY_ID = Object.values(PIECES).reduce((acc, piece) => {
  acc[piece.id] = piece.color;
  return acc;
}, {});

function PreviewPiece({ pieceKey }) {
  if (!pieceKey) return null;

  const piece = PIECES[pieceKey];
  const shape = piece.cells[0];
  const cols = shape[0].length;

  return (
    <div className="tetris-preview-grid" style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}>
      {shape.flatMap((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            className={`tetris-preview-cell ${cell ? piece.color : "tetris-preview-cell--empty"}`}
          />
        ))
      )}
    </div>
  );
}

export default function TetrisWebApp() {
  const {
    game,
    renderedBoard,
    isRunning,
    setIsRunning,
    resetGame,
    move,
    rotate,
    softDrop,
    hardDrop,
    hold,
    receiveGarbage,
    consumePendingGarbage,
  } = useTetrisGame();

  const boardSlotRef = useRef(null);
  const lastStartedAtRef = useRef(null);
  const lastGarbageAtRef = useRef(null);
  const [boardCellPx, setBoardCellPx] = useState(26);
  const [providerInput, setProviderInput] = useState(REALTIME_PROVIDERS.PARTYKIT);
  const [endpointInput, setEndpointInput] = useState(getDefaultEndpointForProvider(REALTIME_PROVIDERS.PARTYKIT));
  const [roomIdInput, setRoomIdInput] = useState("demo-room");
  const [playerNameInput, setPlayerNameInput] = useState("Player");
  const [joinedRoomId, setJoinedRoomId] = useState(null);
  const [joinedPlayerName, setJoinedPlayerName] = useState("");
  const [joinedEndpoint, setJoinedEndpoint] = useState("");
  const [joinedProvider, setJoinedProvider] = useState(REALTIME_PROVIDERS.PARTYKIT);

  const room = useRoomConnection({
    provider: joinedProvider,
    endpoint: joinedEndpoint,
    roomId: joinedRoomId,
    playerName: joinedPlayerName,
    enabled: Boolean(joinedEndpoint && joinedRoomId && joinedPlayerName),
  });

  useEffect(() => {
    setEndpointInput(getDefaultEndpointForProvider(providerInput));
  }, [providerInput]);

  useLayoutEffect(() => {
    const el = boardSlotRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr || cr.width < 40 || cr.height < 40) return;

      const innerW = cr.width - BOARD_BEZEL_CHROME;
      const innerH = cr.height - BOARD_BEZEL_CHROME;
      const byW = Math.floor(innerW / BOARD_WIDTH);
      const byH = Math.floor(innerH / BOARD_HEIGHT);
      const next = Math.min(byW, byH);
      const clamped = Math.max(BOARD_CELL_MIN, Math.min(next, BOARD_CELL_MAX));
      setBoardCellPx((prev) => (prev === clamped ? prev : clamped));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (
        ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "Shift"].includes(event.key) ||
        event.key.toLowerCase() === "c"
      ) {
        event.preventDefault();
      }

      if (event.key.toLowerCase() === "p") {
        setIsRunning((prev) => !prev);
        return;
      }

      if (event.key.toLowerCase() === "r") {
        resetGame();
        return;
      }

      if (!isRunning || game.isGameOver) return;

      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowDown") softDrop();
      if (event.key === "ArrowUp") rotate();
      if (event.key === " ") hardDrop();
      if (event.key === "Shift" || event.key.toLowerCase() === "c") hold();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game.isGameOver, hardDrop, hold, isRunning, move, resetGame, rotate, setIsRunning, softDrop]);

  useEffect(() => {
    if (!room.state.isConnected) return;
    room.sendState(toOpponentSnapshot(game));
  }, [game, room]);

  useEffect(() => {
    if (!game.pendingGarbage) return;

    const amount = consumePendingGarbage();
    if (!amount) return;
    if (room.state.isConnected && room.state.phase === "playing") {
      room.sendAttack(amount);
    }
  }, [consumePendingGarbage, game.pendingGarbage, room]);

  useEffect(() => {
    const lastGarbage = room.state.lastGarbage;
    if (!lastGarbage) return;
    if (lastGarbageAtRef.current === lastGarbage.receivedAt) return;

    lastGarbageAtRef.current = lastGarbage.receivedAt;
    receiveGarbage(lastGarbage.amount, lastGarbage.holeColumn ?? undefined);
  }, [receiveGarbage, room.state.lastGarbage]);

  useEffect(() => {
    if (room.state.phase !== "playing" || !room.state.startedAt) return;
    if (lastStartedAtRef.current === room.state.startedAt) return;

    lastStartedAtRef.current = room.state.startedAt;
    resetGame();
  }, [resetGame, room.state.phase, room.state.startedAt]);

  useEffect(() => {
    if (!room.state.isConnected || !game.isGameOver) return;
    room.sendGameOver();
  }, [game.isGameOver, room]);

  const opponentId = useMemo(
    () => room.state.players.find((player) => player.id !== room.state.selfId)?.id ?? null,
    [room.state.players, room.state.selfId]
  );

  const opponentPlayer = useMemo(
    () => room.state.players.find((player) => player.id === opponentId) ?? null,
    [opponentId, room.state.players]
  );

  const opponentSnapshot = opponentId ? room.state.opponentSnapshots[opponentId] : null;

  const connectToRoom = () => {
    const nextEndpoint = endpointInput.trim();
    const nextRoomId = roomIdInput.trim();
    const nextName = playerNameInput.trim();
    if (!nextEndpoint || !nextRoomId || !nextName) return;

    setJoinedProvider(providerInput);
    setJoinedEndpoint(nextEndpoint);
    setJoinedRoomId(nextRoomId);
    setJoinedPlayerName(nextName);
  };

  const disconnectFromRoom = () => {
    room.disconnect();
    setJoinedRoomId(null);
    setJoinedEndpoint("");
    setJoinedPlayerName("");
  };

  return (
    <div className="tetris-page">
      <div className="tetris-bg-gradient" aria-hidden />
      <div className="tetris-bg-noise" aria-hidden />
      <div className="tetris-bg-vignette" aria-hidden />

      <div className="tetris-main">
        <div className="tetris-grid-layout">
          <Card className="tetris-card-shell tetris-side-card">
            <CardHeader className="tetris-card-head">
              <CardTitle className="tetris-card-title-row">
                <span className="tetris-card-title-text">Stats</span>
                <Badge variant="secondary" className="tetris-level-badge">
                  Lv.{game.level}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="tetris-card-body">
              <div className="tetris-stat-grid">
                <div className="tetris-panel">
                  <div className="tetris-stat-label">Score</div>
                  <div className="tetris-stat-value">{game.score}</div>
                </div>
                <div className="tetris-panel">
                  <div className="tetris-stat-label">Lines</div>
                  <div className="tetris-stat-value">{game.lines}</div>
                </div>
              </div>

              <div className="tetris-panel tetris-next-block">
                <div className="tetris-stat-label">Hold</div>
                <div className="tetris-preview-frame">
                  <PreviewPiece pieceKey={game.holdKey} />
                </div>
                <div className="tetris-preview-hint">
                  {game.hasHeldThisTurn ? "Locked until piece lands" : "C / Shift"}
                </div>
              </div>

              <div className="tetris-panel tetris-next-block">
                <div className="tetris-stat-label">Next</div>
                <div className="tetris-preview-stack">
                  {game.nextQueue.map((pieceKey, index) => (
                    <div key={`${pieceKey}-${index}`} className="tetris-preview-slot">
                      <div className="tetris-preview-frame">
                        <PreviewPiece pieceKey={pieceKey} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tetris-btn-row">
                <Button
                  size="default"
                  className="tetris-btn-primary"
                  onClick={() => setIsRunning((prev) => !prev)}
                  disabled={game.isGameOver}
                >
                  {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {isRunning ? "Pause" : "Resume"}
                </Button>
                <Button size="default" className="tetris-btn-secondary" variant="secondary" onClick={resetGame}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Restart
                </Button>
              </div>

              <div className="tetris-panel tetris-controls">
                <div className="tetris-controls-heading">Controls</div>
                <div className="tetris-controls-list">
                  <div className="tetris-control-line">
                    <ArrowLeft className="tetris-control-icon" /> / <ArrowRight className="tetris-control-icon" /> Move
                  </div>
                  <div className="tetris-control-line">
                    <ArrowDown className="tetris-control-icon" /> Soft Drop
                  </div>
                  <div className="tetris-control-line">
                    <RotateCw className="tetris-control-icon" /> Rotate
                  </div>
                  <div>C / Shift Hold</div>
                  <div>Space Hard Drop</div>
                  <div className="tetris-controls-muted">P Pause, R Restart</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="tetris-card-shell tetris-board-card">
            <CardContent className="tetris-board-content">
              <div ref={boardSlotRef} className="tetris-board-slot">
                <div className="tetris-board-bezel">
                  <div
                    className="tetris-board-grid"
                    style={{
                      gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${boardCellPx}px)`,
                      gridAutoRows: `${boardCellPx}px`,
                    }}
                  >
                    {renderedBoard.flatMap((row, rowIndex) =>
                      row.map((cell, colIndex) => {
                        const isGhost = typeof cell === "object" && cell !== null && "ghostKey" in cell;
                        const absCell = typeof cell === "number" ? Math.abs(cell) : 0;
                        const pieceClass = isGhost
                          ? PIECES[cell.ghostKey].color
                          : absCell
                            ? PIECE_COLOR_BY_ID[absCell]
                            : "";
                        const ghostStyle = isGhost
                          ? {
                              borderColor: PIECES[cell.ghostKey].ghost,
                              boxShadow: `inset 0 0 0 1px ${PIECES[cell.ghostKey].ghost}`,
                            }
                          : undefined;

                        return (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className={`tetris-cell${isGhost ? " tetris-cell--ghost" : ""}${!isGhost && absCell ? ` tetris-cell--block ${pieceClass}` : ""}${!isGhost && !absCell ? " tetris-cell--hole" : ""}`}
                            style={{ width: boardCellPx, height: boardCellPx, ...ghostStyle }}
                          />
                        );
                      })
                    )}
                  </div>

                  {game.isGameOver && (
                    <div className="tetris-gameover-backdrop">
                      <div className="tetris-gameover-panel">
                        <div className="tetris-gameover-title">Game Over</div>
                        <div className="tetris-gameover-label">Final Score</div>
                        <div className="tetris-gameover-score">{game.score}</div>
                        <Button size="lg" className="tetris-gameover-btn" onClick={resetGame}>
                          Restart
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="tetris-card-shell tetris-side-card">
            <CardHeader className="tetris-card-head">
              <CardTitle className="tetris-aside-title">Multiplayer Draft</CardTitle>
            </CardHeader>
            <CardContent className="tetris-aside-body">
              <div className="tetris-panel tetris-room-panel">
                <div className="tetris-stat-label">Realtime Provider</div>
                <div className="tetris-provider-tabs">
                  <Button
                    variant={providerInput === REALTIME_PROVIDERS.PARTYKIT ? "default" : "secondary"}
                    onClick={() => setProviderInput(REALTIME_PROVIDERS.PARTYKIT)}
                  >
                    PartyKit
                  </Button>
                  <Button
                    variant={providerInput === REALTIME_PROVIDERS.WEBSOCKET ? "default" : "secondary"}
                    onClick={() => setProviderInput(REALTIME_PROVIDERS.WEBSOCKET)}
                  >
                    Custom WS
                  </Button>
                </div>
                <div className="tetris-stat-label">
                  {providerInput === REALTIME_PROVIDERS.PARTYKIT ? "PartyKit Host" : "WebSocket Endpoint"}
                </div>
                <Input
                  value={endpointInput}
                  onChange={(event) => setEndpointInput(event.target.value)}
                  placeholder={
                    providerInput === REALTIME_PROVIDERS.PARTYKIT
                      ? "your-project.your-name.partykit.dev"
                      : "ws://localhost:8787/rooms"
                  }
                />
                <div className="tetris-stat-label">Room ID</div>
                <Input
                  value={roomIdInput}
                  onChange={(event) => setRoomIdInput(event.target.value)}
                  placeholder="demo-room"
                />
                <div className="tetris-stat-label">Player Name</div>
                <Input
                  value={playerNameInput}
                  onChange={(event) => setPlayerNameInput(event.target.value)}
                  placeholder="Player"
                />
                <div className="tetris-room-btns">
                  <Button onClick={connectToRoom} disabled={!endpointInput.trim() || !roomIdInput.trim() || !playerNameInput.trim()}>
                    Join Room
                  </Button>
                  <Button variant="secondary" onClick={disconnectFromRoom} disabled={!joinedRoomId}>
                    Leave
                  </Button>
                </div>
                <div className="tetris-room-status">
                  <div>Status: {room.state.isConnected ? "Connected" : "Offline"}</div>
                  <div>Provider: {joinedRoomId ? joinedProvider : providerInput}</div>
                  <div>Phase: {room.state.phase}</div>
                  <div>Room: {joinedRoomId ?? "-"}</div>
                  {room.state.error ? <div className="tetris-room-error">{room.state.error}</div> : null}
                </div>
                <div className="tetris-room-btns">
                  <Button variant="secondary" onClick={() => room.setReady(true)} disabled={!room.state.isConnected}>
                    Ready
                  </Button>
                  <Button variant="secondary" onClick={() => room.setReady(false)} disabled={!room.state.isConnected}>
                    Unready
                  </Button>
                </div>
              </div>

              <div className="tetris-panel">
                <div className="tetris-stat-label">Players</div>
                <div className="tetris-room-players">
                  {room.state.players.length === 0 ? (
                    <div className="tetris-controls-muted">No room members yet</div>
                  ) : (
                    room.state.players.map((player) => (
                      <div key={player.id} className="tetris-room-player">
                        <span>{player.name}</span>
                        <Badge variant="secondary">
                          {room.state.readyMap[player.id] ? "Ready" : "Idle"}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="tetris-panel">
                <div className="tetris-stat-label">Opponent</div>
                <div className="tetris-opponent-title">{opponentPlayer?.name ?? "Waiting for opponent"}</div>
                <OpponentBoard snapshot={opponentSnapshot} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
