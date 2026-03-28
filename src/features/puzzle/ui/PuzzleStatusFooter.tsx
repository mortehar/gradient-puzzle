type PuzzleStatusFooterProps = {
  swapCount: number;
  hintCount: number;
  difficultyScore: number;
  selectedDifficultyTier: string;
  canUseAid: boolean;
  canCreatePuzzle: boolean;
  highlightNewPuzzle: boolean;
  isAdvancedOpen: boolean;
  onSetDifficultyScore: (value: number) => void;
  onToggleAdvancedSettings: () => void;
  onUseAid: () => void;
  onStartNewPuzzle: () => void;
};

export function PuzzleStatusFooter({
  swapCount,
  hintCount,
  difficultyScore,
  selectedDifficultyTier,
  canUseAid,
  canCreatePuzzle,
  highlightNewPuzzle,
  isAdvancedOpen,
  onSetDifficultyScore,
  onToggleAdvancedSettings,
  onUseAid,
  onStartNewPuzzle
}: PuzzleStatusFooterProps) {
  return (
    <div className="board-footer" data-testid="board-footer">
      <div className="board-footer-top">
        <div className="completion-summary" data-testid="completion-summary">
          <p className="completion-title">
            MOVES: {swapCount}
            {hintCount > 0 ? <span className="completion-inline-note"> ({hintCount} aids used)</span> : null}
          </p>
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
          <button
            className={["action-button", "new-button", highlightNewPuzzle ? "new-button-celebrating" : ""].join(" ")}
            type="button"
            onClick={onStartNewPuzzle}
            disabled={!canCreatePuzzle}
            data-testid="new-puzzle-button"
          >
            New
          </button>
        </div>
      </div>

      <div className="board-footer-difficulty" data-testid="board-footer-difficulty">
        <label className="board-footer-difficulty-label" htmlFor="difficulty-slider" data-testid="difficulty-slider-label">
          Difficulty: {selectedDifficultyTier} ({difficultyScore})
        </label>
        <input
          id="difficulty-slider"
          data-testid="difficulty-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={difficultyScore}
          onChange={(event) => onSetDifficultyScore(Number(event.target.value))}
        />
      </div>

      <button
        className={["action-button", "secondary-button", "advanced-settings-button", isAdvancedOpen ? "secondary-button-active" : ""].join(
          " "
        )}
        type="button"
        aria-expanded={isAdvancedOpen}
        onClick={onToggleAdvancedSettings}
        data-testid="advanced-settings-toggle"
      >
        Advanced settings
      </button>
    </div>
  );
}
