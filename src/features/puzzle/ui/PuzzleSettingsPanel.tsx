import type { AppearanceConfig } from "../domain";
import { ControlLabel } from "./ControlLabel";

type PuzzleSettingsPanelProps = {
  activeHelpId: string | null;
  onToggleHelp: (helpId: string) => void;
  currentPuzzleLabel: string;
  catalogVersion: string;
  currentGridLabel: string;
  lockedCount: number;
  swapCount: number;
  hintCount: number;
  appearance: AppearanceConfig;
  onAppearanceChange: <K extends keyof AppearanceConfig>(key: K, value: AppearanceConfig[K]) => void;
};

export function PuzzleSettingsPanel({
  activeHelpId,
  onToggleHelp,
  currentPuzzleLabel,
  catalogVersion,
  currentGridLabel,
  lockedCount,
  swapCount,
  hintCount,
  appearance,
  onAppearanceChange
}: PuzzleSettingsPanelProps) {
  return (
    <aside className="settings-panel" data-testid="advanced-settings-panel">
      <div className="status-card">
        <section className="option-block option-block-first">
          <p className="status-label option-title">Advanced settings</p>
        </section>

        <section className="option-block">
          <p className="status-label option-title">Aid</p>
          <SliderRow
            id="aid-time-slider"
            label="Aid time"
            helpId="aid-time"
            helpText="Controls how long the aid animation lasts. Set it to zero to apply the aid instantly."
            min={0}
            max={3}
            step={0.1}
            displayValue={appearance.aidTimeSeconds.toFixed(1)}
            value={appearance.aidTimeSeconds}
            activeHelpId={activeHelpId}
            onToggleHelp={onToggleHelp}
            onChange={(value) => onAppearanceChange("aidTimeSeconds", value)}
          />
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

type SliderRowProps = {
  id: string;
  label: string;
  helpId: string;
  helpText: string;
  min: number;
  max: number;
  value: number;
  step?: number;
  displayValue?: string;
  activeHelpId: string | null;
  onToggleHelp: (helpId: string) => void;
  onChange: (value: number) => void;
};

function SliderRow({
  id,
  label,
  helpId,
  helpText,
  min,
  max,
  value,
  step,
  displayValue,
  activeHelpId,
  onToggleHelp,
  onChange
}: SliderRowProps) {
  return (
    <div className="control-group">
      <ControlLabel
        htmlFor={id}
        label={label}
        helpId={helpId}
        helpText={helpText}
        activeHelpId={activeHelpId}
        onToggle={onToggleHelp}
      />
      <div className="control-row">
        <input
          id={id}
          data-testid={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <strong>{displayValue ?? value}</strong>
      </div>
    </div>
  );
}
