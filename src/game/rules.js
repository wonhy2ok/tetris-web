import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  EMPTY,
  PIECES,
  createPiece,
  getPieceShape,
  randomPieceKey,
} from "@/game/pieces";

export function createEmptyBoard() {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(EMPTY));
}

export function collides(board, piece) {
  const shape = getPieceShape(piece);

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

export function rotateWithKick(board, piece) {
  const rotated = { ...piece, rotation: (piece.rotation + 1) % 4 };
  const kicks = [0, -1, 1, -2, 2];

  for (const dx of kicks) {
    const candidate = { ...rotated, x: rotated.x + dx };
    if (!collides(board, candidate)) return candidate;
  }

  return piece;
}

export function hardDropY(board, piece) {
  let candidate = { ...piece };

  while (!collides(board, { ...candidate, y: candidate.y + 1 })) {
    candidate = { ...candidate, y: candidate.y + 1 };
  }

  return candidate;
}

export function mergePiece(board, piece) {
  const next = board.map((row) => [...row]);
  const shape = getPieceShape(piece);
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

export function clearLines(board) {
  const remaining = board.filter((row) => row.some((cell) => cell === EMPTY));
  const cleared = BOARD_HEIGHT - remaining.length;
  const refill = Array.from({ length: cleared }, () => Array(BOARD_WIDTH).fill(EMPTY));

  return {
    board: [...refill, ...remaining],
    cleared,
  };
}

export function lineScore(lines) {
  if (lines === 1) return 100;
  if (lines === 2) return 300;
  if (lines === 3) return 500;
  if (lines === 4) return 800;
  return 0;
}

export function attackLinesFromClear(lines) {
  if (lines <= 1) return 0;
  if (lines === 2) return 1;
  if (lines === 3) return 2;
  if (lines >= 4) return 4;
  return 0;
}

export function createSpawnState(nextQueue) {
  const [head, ...rest] = nextQueue;

  return {
    piece: createPiece(head),
    nextQueue: [...rest, randomPieceKey()],
  };
}

export function insertGarbageRows(board, amount, holeColumn = Math.floor(Math.random() * BOARD_WIDTH)) {
  if (amount <= 0) return board;

  const trimmed = board.slice(amount).map((row) => [...row]);
  const garbageRows = Array.from({ length: amount }, () =>
    Array.from({ length: BOARD_WIDTH }, (_, colIndex) => (colIndex === holeColumn ? EMPTY : 8))
  );

  return [...trimmed, ...garbageRows];
}
