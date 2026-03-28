export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const EMPTY = 0;

export const PIECES = {
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

export const PIECE_KEYS = Object.keys(PIECES);

export function randomPieceKey() {
  return PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
}

export function createNextQueue(size = 3) {
  return Array.from({ length: size }, () => randomPieceKey());
}

export function createPiece(key = randomPieceKey()) {
  return {
    key,
    rotation: 0,
    x: Math.floor(BOARD_WIDTH / 2) - 2,
    y: -1,
  };
}

export function getPieceShape(piece) {
  return PIECES[piece.key].cells[piece.rotation];
}
