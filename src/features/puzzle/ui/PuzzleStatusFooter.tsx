type PuzzleStatusFooterProps = {
  swapCount: number;
  hintCount: number;
  sliderIndex: number;
  sliderCount: number;
  currentPuzzleLabel: string;
  canUseAid: boolean;
  canAdvancePuzzle: boolean;
  highlightNextPuzzle: boolean;
  isAdvancedOpen: boolean;
  onSetSliderIndex: (value: number) => void;
  onToggleAdvancedSettings: () => void;
  onUseAid: () => void;
  onStartNextPuzzle: () => void;
};

export function PuzzleStatusFooter({
  swapCount,
  hintCount,
  sliderIndex,
  sliderCount,
  currentPuzzleLabel,
  canUseAid,
  canAdvancePuzzle,
  highlightNextPuzzle,
  isAdvancedOpen,
  onSetSliderIndex,
  onToggleAdvancedSettings,
  onUseAid,
  onStartNextPuzzle
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
            className={["action-button", "new-button", highlightNextPuzzle ? "new-button-celebrating" : ""].join(" ")}
            type="button"
            onClick={onStartNextPuzzle}
            disabled={!canAdvancePuzzle}
            data-testid="new-puzzle-button"
          >
            Next
          </button>
        </div>
      </div>

      <div className="board-footer-difficulty" data-testid="board-footer-difficulty">
        <label className="board-footer-difficulty-label" htmlFor="difficulty-slider" data-testid="difficulty-slider-label">
          Puzzle: {currentPuzzleLabel}
        </label>
        <input
          id="difficulty-slider"
          data-testid="difficulty-slider"
          type="range"
          min={0}
          max={Math.max(0, sliderCount - 1)}
          step={1}
          value={sliderIndex}
          onChange={(event) => onSetSliderIndex(Number(event.target.value))}
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
