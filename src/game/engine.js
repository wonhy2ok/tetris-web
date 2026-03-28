import { createNextQueue, createPiece } from "@/game/pieces";
import {
  attackLinesFromClear,
  clearLines,
  collides,
  createEmptyBoard,
  createSpawnState,
  hardDropY,
  insertGarbageRows,
  lineScore,
  mergePiece,
  rotateWithKick,
} from "@/game/rules";

export function createInitialGameState() {
  return {
    board: createEmptyBoard(),
    current: createPiece(),
    nextQueue: createNextQueue(),
    holdKey: null,
    hasHeldThisTurn: false,
    score: 0,
    lines: 0,
    level: 1,
    isGameOver: false,
    pendingGarbage: 0,
  };
}

function spawnFromQueue(state, boardOverride = state.board) {
  const { piece, nextQueue } = createSpawnState(state.nextQueue);

  if (collides(boardOverride, piece)) {
    return {
      ...state,
      board: boardOverride,
      nextQueue,
      isGameOver: true,
    };
  }

  return {
    ...state,
    board: boardOverride,
    current: piece,
    nextQueue,
    hasHeldThisTurn: false,
  };
}

export function moveGame(state, dx) {
  if (state.isGameOver) return state;

  const candidate = { ...state.current, x: state.current.x + dx };
  if (collides(state.board, candidate)) return state;

  return { ...state, current: candidate };
}

export function rotateGame(state) {
  if (state.isGameOver) return state;
  return { ...state, current: rotateWithKick(state.board, state.current) };
}

export function softDropGame(state) {
  if (state.isGameOver) return state;

  const candidate = { ...state.current, y: state.current.y + 1 };
  if (!collides(state.board, candidate)) {
    return {
      ...state,
      current: candidate,
      score: state.score + 1,
    };
  }

  return lockCurrentPiece(state);
}

export function hardDropGame(state) {
  if (state.isGameOver) return state;

  const dropped = hardDropY(state.board, state.current);
  const distance = dropped.y - state.current.y;

  return lockCurrentPiece({
    ...state,
    current: dropped,
    score: state.score + distance * 2,
  });
}

export function stepGame(state) {
  if (state.isGameOver) return state;

  const candidate = { ...state.current, y: state.current.y + 1 };
  if (!collides(state.board, candidate)) {
    return { ...state, current: candidate };
  }

  return lockCurrentPiece(state);
}

export function holdGame(state) {
  if (state.isGameOver || state.hasHeldThisTurn) return state;

  if (!state.holdKey) {
    return spawnFromQueue({
      ...state,
      holdKey: state.current.key,
      hasHeldThisTurn: true,
    });
  }

  const swapped = createPiece(state.holdKey);
  if (collides(state.board, swapped)) {
    return {
      ...state,
      holdKey: state.current.key,
      hasHeldThisTurn: true,
      isGameOver: true,
    };
  }

  return {
    ...state,
    current: swapped,
    holdKey: state.current.key,
    hasHeldThisTurn: true,
  };
}

export function applyGarbage(state, amount, holeColumn) {
  if (state.isGameOver || amount <= 0) return state;

  const board = insertGarbageRows(state.board, amount, holeColumn);
  const shiftedCurrent = { ...state.current, y: state.current.y - amount };

  return {
    ...state,
    board,
    current: shiftedCurrent,
  };
}

export function lockCurrentPiece(state) {
  const merged = mergePiece(state.board, state.current);
  const { board: clearedBoard, cleared } = clearLines(merged);
  const nextLines = state.lines + cleared;
  const nextScore = state.score + lineScore(cleared) * state.level;
  const nextState = spawnFromQueue(
    {
      ...state,
      board: clearedBoard,
      lines: nextLines,
      level: Math.floor(nextLines / 10) + 1,
      score: nextScore,
      pendingGarbage: attackLinesFromClear(cleared),
    },
    clearedBoard
  );

  return nextState;
}
