import { BOARD_WIDTH, PIECE_KEYS, PIECES } from "@/game/pieces";

const PIECE_COLOR_BY_ID = Object.values(PIECES).reduce((acc, piece) => {
  acc[piece.id] = piece.color;
  return acc;
}, {});

export function OpponentBoard({ snapshot }) {
  if (!snapshot) {
    return <div className="tetris-opponent-empty">Waiting for opponent state</div>;
  }

  return (
    <div className="tetris-opponent-wrap">
      <div
        className="tetris-opponent-grid"
        style={{ gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)` }}
      >
        {snapshot.board.flatMap((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const pieceClass = cell ? PIECE_COLOR_BY_ID[cell] ?? "" : "";
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`tetris-opponent-cell${cell ? ` tetris-cell--block ${pieceClass}` : " tetris-cell--hole"}`}
              />
            );
          })
        )}
      </div>

      <div className="tetris-opponent-meta">
        <div>Piece: {PIECE_KEYS.includes(snapshot.activeKey) ? snapshot.activeKey : "-"}</div>
        <div>Hold: {snapshot.holdKey ?? "-"}</div>
        <div>Lines: {snapshot.lines}</div>
        <div>Score: {snapshot.score}</div>
      </div>
    </div>
  );
}
