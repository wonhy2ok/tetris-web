import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCw, RefreshCw, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const EMPTY = 0;
const BASE_DROP_MS = 700;
const MIN_DROP_MS = 120;

const PIECES = {
  I: {
    id: 1,
    color: "bg-cyan-400",
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
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${shape[0].length}, minmax(0, 1fr))` }}>
      {shape.flatMap((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            className={`h-4 w-4 rounded-sm border border-white/10 ${cell ? piece.color : "bg-white/5"}`}
          />
        ))
      )}
    </div>
  );
}

export default function TetrisWebApp() {
  const [board, setBoard] = useState(createEmptyBoard);
  const [current, setCurrent] = useState(() => makePiece());
  const [nextKey, setNextKey] = useState(() => randomPieceKey());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [isRunning, setIsRunning] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const boardRef = useRef(board);
  const currentRef = useRef(current);
  const isRunningRef = useRef(isRunning);
  const isGameOverRef = useRef(isGameOver);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    isGameOverRef.current = isGameOver;
  }, [isGameOver]);

  const spawnNextPiece = useCallback((activeBoard) => {
    const fresh = makePiece(nextKey);
    setNextKey(randomPieceKey());
    if (collides(activeBoard, fresh)) {
      setIsGameOver(true);
      setIsRunning(false);
      return null;
    }
    return fresh;
  }, [nextKey]);

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
    if (fresh) setCurrent(fresh);
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
    setNextKey(randomPieceKey());
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

  useEffect(() => {
    const onKeyDown = (event) => {
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(event.key)) {
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
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hardDrop, move, resetGame, rotate, softDrop]);

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
          canvas[y][x] = -PIECES[current.key].id;
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
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_260px] gap-6 items-start">
        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-2xl">
              <span>Tetris</span>
              <Badge variant="secondary" className="rounded-full">Level {level}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-black/30 p-4">
                <div className="text-sm text-zinc-400">Score</div>
                <div className="text-2xl font-bold">{score}</div>
              </div>
              <div className="rounded-2xl bg-black/30 p-4">
                <div className="text-sm text-zinc-400">Lines</div>
                <div className="text-2xl font-bold">{lines}</div>
              </div>
            </div>

            <div className="rounded-2xl bg-black/30 p-4 space-y-2">
              <div className="text-sm text-zinc-400">Next</div>
              <PreviewPiece pieceKey={nextKey} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button className="rounded-2xl" onClick={() => setIsRunning((prev) => !prev)} disabled={isGameOver}>
                {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                {isRunning ? "Pause" : "Resume"}
              </Button>
              <Button className="rounded-2xl" variant="secondary" onClick={resetGame}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Restart
              </Button>
            </div>

            <div className="rounded-2xl bg-black/30 p-4 text-sm text-zinc-300 space-y-2">
              <div className="font-medium">Controls</div>
              <div className="grid gap-2">
                <div className="flex items-center gap-2"><ArrowLeft className="h-4 w-4" /> / <ArrowRight className="h-4 w-4" /> 이동</div>
                <div className="flex items-center gap-2"><ArrowDown className="h-4 w-4" /> 소프트 드롭</div>
                <div className="flex items-center gap-2"><RotateCw className="h-4 w-4" /> ↑ 회전</div>
                <div>Space 하드 드롭</div>
                <div>P 일시정지 / R 재시작</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur overflow-hidden">
          <CardContent className="p-4 md:p-6">
            <div className="relative mx-auto w-fit">
              <div
                className="grid gap-1 rounded-2xl bg-black/60 p-3 shadow-2xl"
                style={{ gridTemplateColumns: `repeat(${BOARD_WIDTH}, minmax(0, 1fr))` }}
              >
                {renderedBoard.flatMap((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    const isGhost = cell < 0;
                    const absCell = Math.abs(cell);
                    const colorClass = absCell ? PIECE_COLOR_BY_ID[absCell] : "bg-zinc-900";
                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`h-6 w-6 md:h-7 md:w-7 rounded-sm border ${
                          isGhost
                            ? "border-white/20 bg-transparent"
                            : absCell
                              ? `${colorClass} border-white/10`
                              : "border-white/5"
                        }`}
                      />
                    );
                  })
                )}
              </div>

              {isGameOver && (
                <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/70 backdrop-blur-sm">
                  <div className="text-center space-y-3">
                    <div className="text-3xl font-bold">Game Over</div>
                    <div className="text-zinc-300">최종 점수 {score}</div>
                    <Button className="rounded-2xl" onClick={resetGame}>다시 시작</Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-white/5 backdrop-blur lg:sticky lg:top-8">
          <CardHeader>
            <CardTitle className="text-xl">서비스 확장 포인트</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-300">
            <div className="rounded-2xl bg-black/30 p-4">
              현재 구현: 싱글 플레이, 점수, 레벨, 고스트 피스, 키보드/버튼 조작
            </div>
            <div className="rounded-2xl bg-black/30 p-4">
              다음 단계 추천: 랭킹 저장, 모바일 터치 UX, 사운드, 홀드 기능, 7-bag 랜덤, 서버 연동
            </div>
            <div className="rounded-2xl bg-black/30 p-4">
              배포 대상 예시: Vercel, Netlify, Cloudflare Pages
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
