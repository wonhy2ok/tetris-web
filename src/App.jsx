import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCw, RefreshCw, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import "./App.css";

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
/** Padding around the cell grid inside the bezel (Tailwind p-1 outer + p-2 inner, rounded). */
const BOARD_BEZEL_CHROME = 28;
const BOARD_CELL_MIN = 14;
const BOARD_CELL_MAX = 128;
const EMPTY = 0;
const BASE_DROP_MS = 700;
const MIN_DROP_MS = 120;

const PIECES = {
  I: {
    id: 1,
    color: "bg-cyan-400",
    ghost: "rgba(34, 211, 238, 0.55)",
    cells: [
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
      ],
      [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
      ],
      [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
      ],
    ],
  },
  O: {
    id: 2,
    color: "bg-yellow-400",
    ghost: "rgba(250, 204, 21, 0.55)",
    cells: [
      [
        [1, 1],
        [1, 1],
      ],
      [
        [1, 1],
        [1, 1],
      ],
      [
        [1, 1],
        [1, 1],
      ],
      [
        [1, 1],
        [1, 1],
      ],
    ],
  },
  T: {
    id: 3,
    color: "bg-violet-500",
    ghost: "rgba(139, 92, 246, 0.55)",
    cells: [
      [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 1, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
    ],
  },
  S: {
    id: 4,
    color: "bg-green-500",
    ghost: "rgba(34, 197, 94, 0.55)",
    cells: [
      [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 0, 1],
      ],
      [
        [0, 0, 0],
        [0, 1, 1],
        [1, 1, 0],
      ],
      [
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
    ],
  },
  Z: {
    id: 5,
    color: "bg-red-500",
    ghost: "rgba(239, 68, 68, 0.55)",
    cells: [
      [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 0],
        [0, 1, 1],
      ],
      [
        [0, 1, 0],
        [1, 1, 0],
        [1, 0, 0],
      ],
    ],
  },
  J: {
    id: 6,
    color: "bg-blue-500",
    ghost: "rgba(59, 130, 246, 0.55)",
    cells: [
      [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 1],
        [0, 1, 0],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 0, 1],
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [1, 1, 0],
      ],
    ],
  },
  L: {
    id: 7,
    color: "bg-orange-500",
    ghost: "rgba(249, 115, 22, 0.55)",
    cells: [
      [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 1],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [1, 0, 0],
      ],
      [
        [1, 1, 0],
        [0, 1, 0],
        [0, 1, 0],
      ],
    ],
  },
};

const PIECE_KEYS = Object.keys(PIECES);
const PIECE_COLOR_BY_ID = Object.values(PIECES).reduce((acc, piece) => {
  acc[piece.id] = piece.color;
  return acc;
}, {});

function createEmptyBoard() {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(EMPTY));
}

function randomPieceKey() {
  return PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
}

function createNextQueue(size = 3) {
  return Array.from({ length: size }, () => randomPieceKey());
}

function makePiece(key = randomPieceKey()) {
  return {
    key,
    rotation: 0,
    x: Math.floor(BOARD_WIDTH / 2) - 2,
    y: -1,
  };
}

function getShape(piece) {
  return PIECES[piece.key].cells[piece.rotation];
}

function collides(board, piece) {
  const shape = getShape(piece);
  for (let row = 0; row < shape.length; row += 1) {
    for (let col = 0; col < shape[row].length; col += 1) {
      if (!shape[row][col]) continue;
      const x = piece.x + col;
      const y = piece.y + row;
      if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) return true;
      if (y >= 0 && board[y][x] !== EMPTY) return true;
    }
  }
  return false;
}

function mergePiece(board, piece) {
  const next = board.map((row) => [...row]);
  const shape = getShape(piece);
  const id = PIECES[piece.key].id;
  for (let row = 0; row < shape.length; row += 1) {
    for (let col = 0; col < shape[row].length; col += 1) {
      if (!shape[row][col]) continue;
      const x = piece.x + col;
      const y = piece.y + row;
      if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
        next[y][x] = id;
      }
    }
  }
  return next;
}

function clearLines(board) {
  const remaining = board.filter((row) => row.some((cell) => cell === EMPTY));
  const cleared = BOARD_HEIGHT - remaining.length;
  const refill = Array.from({ length: cleared }, () => Array(BOARD_WIDTH).fill(EMPTY));
  return {
    board: [...refill, ...remaining],
    cleared,
  };
}

function lineScore(lines) {
  if (lines === 1) return 100;
  if (lines === 2) return 300;
  if (lines === 3) return 500;
  if (lines === 4) return 800;
  return 0;
}

function rotateWithKick(board, piece) {
  const rotated = { ...piece, rotation: (piece.rotation + 1) % 4 };
  const kicks = [0, -1, 1, -2, 2];
  for (const dx of kicks) {
    const candidate = { ...rotated, x: rotated.x + dx };
    if (!collides(board, candidate)) return candidate;
  }
  return piece;
}

function hardDropY(board, piece) {
  let candidate = { ...piece };
  while (!collides(board, { ...candidate, y: candidate.y + 1 })) {
    candidate.y += 1;
  }
  return candidate;
}

function PreviewPiece({ pieceKey }) {
  if (!pieceKey) return null;

  const piece = PIECES[pieceKey];
  const shape = piece.cells[0];
  const cols = shape[0].length;

  return (
    <div
      className="tetris-preview-grid"
      style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}
    >
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
  const [board, setBoard] = useState(createEmptyBoard);
  const [current, setCurrent] = useState(() => makePiece());
  const [nextQueue, setNextQueue] = useState(() => createNextQueue());
  const [holdKey, setHoldKey] = useState(null);
  const [hasHeldThisTurn, setHasHeldThisTurn] = useState(false);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [isRunning, setIsRunning] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const boardRef = useRef(board);
  const currentRef = useRef(current);
  const nextQueueRef = useRef(nextQueue);
  const isRunningRef = useRef(isRunning);
  const isGameOverRef = useRef(isGameOver);
  const boardSlotRef = useRef(null);
  /** Square cells; size from min(slotW/10, slotH/20) so board aspect stays 1:2. */
  const [boardCellPx, setBoardCellPx] = useState(26);

  useLayoutEffect(() => {
    const el = boardSlotRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
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
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    nextQueueRef.current = nextQueue;
  }, [nextQueue]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    isGameOverRef.current = isGameOver;
  }, [isGameOver]);

  const spawnNextPiece = useCallback((activeBoard) => {
    const [nextKey, ...restQueue] = nextQueueRef.current;
    const fresh = makePiece(nextKey);
    setNextQueue([...restQueue, randomPieceKey()]);
    if (collides(activeBoard, fresh)) {
      setIsGameOver(true);
      setIsRunning(false);
      return null;
    }
    return fresh;
  }, []);

  const lockPiece = useCallback((lockedPiece) => {
    const merged = mergePiece(boardRef.current, lockedPiece);
    const { board: clearedBoard, cleared } = clearLines(merged);
    setBoard(clearedBoard);
    if (cleared > 0) {
      setLines((prev) => {
        const nextLines = prev + cleared;
        setLevel(Math.floor(nextLines / 10) + 1);
        return nextLines;
      });
      setScore((prev) => prev + lineScore(cleared) * level);
    }
    const fresh = spawnNextPiece(clearedBoard);
    if (fresh) {
      setHasHeldThisTurn(false);
      setCurrent(fresh);
    }
  }, [level, spawnNextPiece]);

  const stepDown = useCallback(() => {
    if (!isRunningRef.current || isGameOverRef.current) return;
    const piece = currentRef.current;
    const candidate = { ...piece, y: piece.y + 1 };
    if (!collides(boardRef.current, candidate)) {
      setCurrent(candidate);
      return;
    }
    lockPiece(piece);
  }, [lockPiece]);

  const resetGame = useCallback(() => {
    const freshBoard = createEmptyBoard();
    const first = makePiece();
    setBoard(freshBoard);
    setCurrent(first);
    setNextQueue(createNextQueue());
    setHoldKey(null);
    setHasHeldThisTurn(false);
    setScore(0);
    setLines(0);
    setLevel(1);
    setIsGameOver(false);
    setIsRunning(true);
  }, []);

  useEffect(() => {
    const dropMs = Math.max(MIN_DROP_MS, BASE_DROP_MS - (level - 1) * 60);
    const timer = window.setInterval(() => {
      stepDown();
    }, dropMs);
    return () => window.clearInterval(timer);
  }, [level, stepDown]);

  const move = useCallback((dx) => {
    if (!isRunningRef.current || isGameOverRef.current) return;
    const piece = currentRef.current;
    const candidate = { ...piece, x: piece.x + dx };
    if (!collides(boardRef.current, candidate)) setCurrent(candidate);
  }, []);

  const softDrop = useCallback(() => {
    if (!isRunningRef.current || isGameOverRef.current) return;
    const piece = currentRef.current;
    const candidate = { ...piece, y: piece.y + 1 };
    if (!collides(boardRef.current, candidate)) {
      setCurrent(candidate);
      setScore((prev) => prev + 1);
    } else {
      lockPiece(piece);
    }
  }, [lockPiece]);

  const hardDrop = useCallback(() => {
    if (!isRunningRef.current || isGameOverRef.current) return;
    const dropped = hardDropY(boardRef.current, currentRef.current);
    const distance = dropped.y - currentRef.current.y;
    setScore((prev) => prev + distance * 2);
    setCurrent(dropped);
    lockPiece(dropped);
  }, [lockPiece]);

  const rotate = useCallback(() => {
    if (!isRunningRef.current || isGameOverRef.current) return;
    setCurrent((prev) => rotateWithKick(boardRef.current, prev));
  }, []);

  const hold = useCallback(() => {
    if (!isRunningRef.current || isGameOverRef.current || hasHeldThisTurn) return;

    const activePiece = currentRef.current;
    setHasHeldThisTurn(true);

    if (!holdKey) {
      setHoldKey(activePiece.key);
      const fresh = spawnNextPiece(boardRef.current);
      if (fresh) setCurrent(fresh);
      return;
    }

    const swapped = makePiece(holdKey);
    setHoldKey(activePiece.key);
    if (collides(boardRef.current, swapped)) {
      setIsGameOver(true);
      setIsRunning(false);
      return;
    }
    setCurrent(swapped);
  }, [hasHeldThisTurn, holdKey, spawnNextPiece]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "Shift"].includes(event.key) || event.key.toLowerCase() === "c") {
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
      if (!isRunningRef.current || isGameOverRef.current) return;
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowDown") softDrop();
      if (event.key === "ArrowUp") rotate();
      if (event.key === " ") hardDrop();
      if (event.key === "Shift" || event.key.toLowerCase() === "c") hold();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hardDrop, hold, move, resetGame, rotate, softDrop]);

  const ghostPiece = useMemo(() => hardDropY(board, current), [board, current]);

  const renderedBoard = useMemo(() => {
    const canvas = board.map((row) => [...row]);

    const ghostShape = getShape(ghostPiece);
    for (let row = 0; row < ghostShape.length; row += 1) {
      for (let col = 0; col < ghostShape[row].length; col += 1) {
        if (!ghostShape[row][col]) continue;
        const x = ghostPiece.x + col;
        const y = ghostPiece.y + row;
        if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH && canvas[y][x] === EMPTY) {
          canvas[y][x] = { ghostKey: current.key };
        }
      }
    }

    const shape = getShape(current);
    for (let row = 0; row < shape.length; row += 1) {
      for (let col = 0; col < shape[row].length; col += 1) {
        if (!shape[row][col]) continue;
        const x = current.x + col;
        const y = current.y + row;
        if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
          canvas[y][x] = PIECES[current.key].id;
        }
      }
    }

    return canvas;
  }, [board, current, ghostPiece]);

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
                <span className="tetris-card-title-text">플레이 정보</span>
                <Badge variant="secondary" className="tetris-level-badge">
                  Lv.{level}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="tetris-card-body">
              <div className="tetris-stat-grid">
                <div className="tetris-panel">
                  <div className="tetris-stat-label">Score</div>
                  <div className="tetris-stat-value">{score}</div>
                </div>
                <div className="tetris-panel">
                  <div className="tetris-stat-label">Lines</div>
                  <div className="tetris-stat-value">{lines}</div>
                </div>
              </div>

              <div className="tetris-panel tetris-next-block">
                <div className="tetris-stat-label">Hold</div>
                <div className="tetris-preview-frame">
                  <PreviewPiece pieceKey={holdKey} />
                </div>
                <div className="tetris-preview-hint">{hasHeldThisTurn ? "Locked until piece lands" : "C / Shift"}</div>
              </div>

              <div className="tetris-panel tetris-next-block">
                <div className="tetris-stat-label">Next</div>
                <div className="tetris-preview-stack">
                  {nextQueue.map((pieceKey, index) => (
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
                  disabled={isGameOver}
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
                <div className="tetris-controls-heading">조작 방법</div>
                <div className="tetris-controls-list">
                  <div className="tetris-control-line">
                    <ArrowLeft className="tetris-control-icon" /> / <ArrowRight className="tetris-control-icon" /> 이동
                  </div>
                  <div className="tetris-control-line">
                    <ArrowDown className="tetris-control-icon" /> 소프트 드롭
                  </div>
                  <div className="tetris-control-line">
                    <RotateCw className="tetris-control-icon" /> 회전
                  </div>
                  <div>Space 하드 드롭</div>
                  <div className="tetris-controls-muted">P 일시정지, R 다시 시작</div>
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

                  {isGameOver && (
                    <div className="tetris-gameover-backdrop">
                      <div className="tetris-gameover-panel">
                        <div className="tetris-gameover-title">Game Over</div>
                        <div className="tetris-gameover-label">최종 점수</div>
                        <div className="tetris-gameover-score">{score}</div>
                        <Button size="lg" className="tetris-gameover-btn" onClick={resetGame}>
                          다시 시작
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
              <CardTitle className="tetris-aside-title">확장 아이디어</CardTitle>
            </CardHeader>
            <CardContent className="tetris-aside-body">
              <div className="tetris-panel">현재: 싱글 플레이, 점수 집계, 고스트 피스, 키보드 조작</div>
              <div className="tetris-panel">다음: 랭킹, 터치 UX, 사운드, 7-bag, 서버 연동</div>
              <div className="tetris-panel">배포: Vercel, Netlify, Cloudflare Pages</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
