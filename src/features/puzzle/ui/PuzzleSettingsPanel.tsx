type PuzzleSettingsPanelProps = {
  currentPuzzleLabel: string;
  catalogVersion: string;
  currentGridLabel: string;
  lockedCount: number;
  swapCount: number;
  hintCount: number;
};

export function PuzzleSettingsPanel({
  currentPuzzleLabel,
  catalogVersion,
  currentGridLabel,
  lockedCount,
  swapCount,
  hintCount
}: PuzzleSettingsPanelProps) {
  return (
    <aside className="settings-panel" data-testid="advanced-settings-panel">
      <div className="status-card">
        <section className="option-block option-block-first">
          <p className="status-label option-title">Advanced settings</p>
        </section>

        <div>
          <span className="status-label">Catalog</span>
          <strong>{catalogVersion.toUpperCase()}</strong>
        </div>
        <div>
          <span className="status-label">Puzzle</span>
          <strong>{currentPuzzleLabel}</strong>
        </div>
        <div>
          <span className="status-label">Grid</span>
          <strong>{currentGridLabel}</strong>
        </div>
        <div>
          <span className="status-label">Locked</span>
          <strong>{lockedCount}</strong>
        </div>
        <div>
          <span className="status-label">Swaps</span>
          <strong>{swapCount}</strong>
        </div>
        <div>
          <span className="status-label">Aids used</span>
          <strong data-testid="aid-count">{hintCount}</strong>
        </div>
      </div>
    </aside>
  );
}
