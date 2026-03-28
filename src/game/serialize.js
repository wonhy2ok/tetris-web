export function toOpponentSnapshot(gameState) {
  return {
    board: gameState.board,
    activeKey: gameState.current.key,
    holdKey: gameState.holdKey,
    nextQueue: gameState.nextQueue,
    lines: gameState.lines,
    score: gameState.score,
    level: gameState.level,
    isGameOver: gameState.isGameOver,
  };
}

export function isOpponentSnapshot(value) {
  return Boolean(
    value &&
      Array.isArray(value.board) &&
      typeof value.activeKey === "string" &&
      Array.isArray(value.nextQueue)
  );
}
