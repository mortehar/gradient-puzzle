type PuzzleStatusFooterProps = {
  status: "preview" | "scrambling" | "animating-hint" | "playing" | "solved";
  swapCount: number;
  hintCount: number;
  canUseAid: boolean;
  canCreatePuzzle: boolean;
  onUseAid: () => void;
  onStartNewPuzzle: () => void;
};

export function PuzzleStatusFooter({
  status,
  swapCount,
  hintCount,
  canUseAid,
  canCreatePuzzle,
  onUseAid,
  onStartNewPuzzle
}: PuzzleStatusFooterProps) {
  return (
    <div className="board-footer" data-testid="board-footer">
      <div className="completion-summary" data-testid="completion-summary">
        {status === "solved" ? (
          <>
            <p className="completion-title">Puzzle complete</p>
            <p className="completion-score">Final score: {swapCount} swaps</p>
            <p className="completion-score-secondary">Aids used: {hintCount}</p>
          </>
        ) : (
          <>
            <p className="completion-title">Current score</p>
            <p className="completion-score">{swapCount} swaps</p>
            <p className="completion-score-secondary">Aids used: {hintCount}</p>
          </>
        )}
      </div>

      <div className="board-footer-actions" data-testid="board-footer-actions">
        <button
          className="action-button aid-button"
          type="button"
          onClick={onUseAid}
          disabled={!canUseAid}
          data-testid="aid-button"
        >
          Aid
        </button>
        <button className="action-button new-button" type="button" onClick={onStartNewPuzzle} disabled={!canCreatePuzzle}>
          New
        </button>
      </div>
    </div>
  );
}
