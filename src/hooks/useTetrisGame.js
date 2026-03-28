import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BOARD_HEIGHT, BOARD_WIDTH, PIECES } from "@/game/pieces";
import { hardDropY } from "@/game/rules";
import {
  applyGarbage,
  createInitialGameState,
  hardDropGame,
  holdGame,
  moveGame,
  rotateGame,
  softDropGame,
  stepGame,
} from "@/game/engine";

const BASE_DROP_MS = 700;
const MIN_DROP_MS = 120;

export function useTetrisGame() {
  const [game, setGame] = useState(createInitialGameState);
  const [isRunning, setIsRunning] = useState(true);
  const gameRef = useRef(game);
  const isRunningRef = useRef(isRunning);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const resetGame = useCallback(() => {
    setGame(createInitialGameState());
    setIsRunning(true);
  }, []);

  const move = useCallback((dx) => {
    if (!isRunningRef.current || gameRef.current.isGameOver) return;
    setGame((prev) => moveGame(prev, dx));
  }, []);

  const rotate = useCallback(() => {
    if (!isRunningRef.current || gameRef.current.isGameOver) return;
    setGame((prev) => rotateGame(prev));
  }, []);

  const softDrop = useCallback(() => {
    if (!isRunningRef.current || gameRef.current.isGameOver) return;
    setGame((prev) => softDropGame(prev));
  }, []);

  const hardDrop = useCallback(() => {
    if (!isRunningRef.current || gameRef.current.isGameOver) return;
    setGame((prev) => hardDropGame(prev));
  }, []);

  const hold = useCallback(() => {
    if (!isRunningRef.current || gameRef.current.isGameOver) return;
    setGame((prev) => holdGame(prev));
  }, []);

  const stepDown = useCallback(() => {
    if (!isRunningRef.current || gameRef.current.isGameOver) return;
    setGame((prev) => stepGame(prev));
  }, []);

  const consumePendingGarbage = useCallback(() => {
    const amount = gameRef.current.pendingGarbage;
    if (!amount) return 0;

    setGame((prev) => ({ ...prev, pendingGarbage: 0 }));
    return amount;
  }, []);

  const receiveGarbage = useCallback((amount, holeColumn) => {
    if (!amount) return;
    setGame((prev) => applyGarbage(prev, amount, holeColumn));
  }, []);

  useEffect(() => {
    const dropMs = Math.max(MIN_DROP_MS, BASE_DROP_MS - (game.level - 1) * 60);
    const timer = window.setInterval(stepDown, dropMs);
    return () => window.clearInterval(timer);
  }, [game.level, stepDown]);

  const ghostPiece = useMemo(() => hardDropY(game.board, game.current), [game.board, game.current]);

  const renderedBoard = useMemo(() => {
    const canvas = game.board.map((row) => [...row]);

    const ghostShape = PIECES[ghostPiece.key].cells[ghostPiece.rotation];
    for (let row = 0; row < ghostShape.length; row += 1) {
      for (let col = 0; col < ghostShape[row].length; col += 1) {
        if (!ghostShape[row][col]) continue;
        const x = ghostPiece.x + col;
        const y = ghostPiece.y + row;
        if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH && canvas[y][x] === 0) {
          canvas[y][x] = { ghostKey: game.current.key };
        }
      }
    }

    const currentShape = PIECES[game.current.key].cells[game.current.rotation];
    for (let row = 0; row < currentShape.length; row += 1) {
      for (let col = 0; col < currentShape[row].length; col += 1) {
        if (!currentShape[row][col]) continue;
        const x = game.current.x + col;
        const y = game.current.y + row;
        if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
          canvas[y][x] = PIECES[game.current.key].id;
        }
      }
    }

    return canvas;
  }, [game.board, game.current, ghostPiece]);

  return {
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
  };
}
