import type { ReactNode } from "react";
import { MAX_BOARD_SIZE, MIN_BOARD_SIZE, type GameConfig, type PuzzleSetupMode } from "../domain";
import { ControlLabel } from "./ControlLabel";
import { LineControl } from "./LineControl";
import { SnappedSlider } from "./SnappedSlider";

type PuzzleSettingsPanelProps = {
  activeHelpId: string | null;
  onToggleHelp: (helpId: string) => void;
  setupMode: PuzzleSetupMode;
  setSetupMode: (mode: PuzzleSetupMode) => void;
  selectedDifficultyTier: string;
  currentGridLabel: string;
  previewConfig: GameConfig;
  normalizedConfig: GameConfig;
  nextLockedCount: number;
  lockedCount: number;
  swapCount: number;
  hintCount: number;
  canCreatePuzzle: boolean;
  verticalCountOptions: number[];
  horizontalCountOptions: number[];
  verticalDensityOptions: number[];
  horizontalDensityOptions: number[];
  crossDensityOptions: number[];
  researchPanel: ReactNode;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onLineValueChange: (lineKey: "verticalLines" | "horizontalLines", field: "count" | "density", value: number) => void;
  onCrossDensityChange: (value: number) => void;
  onAppearanceChange: <K extends keyof GameConfig["appearance"]>(key: K, value: GameConfig["appearance"][K]) => void;
  onColorConstraintChange: (key: keyof GameConfig["colorConstraints"], value: number) => void;
};

export function PuzzleSettingsPanel({
  activeHelpId,
  onToggleHelp,
  setupMode,
  setSetupMode,
  selectedDifficultyTier,
  currentGridLabel,
  previewConfig,
  normalizedConfig,
  nextLockedCount,
  lockedCount,
  swapCount,
  hintCount,
  canCreatePuzzle,
  verticalCountOptions,
  horizontalCountOptions,
  verticalDensityOptions,
  horizontalDensityOptions,
  crossDensityOptions,
  researchPanel,
  onWidthChange,
  onHeightChange,
  onLineValueChange,
  onCrossDensityChange,
  onAppearanceChange,
  onColorConstraintChange
}: PuzzleSettingsPanelProps) {
  return (
    <aside className="settings-panel" data-testid="advanced-settings-panel">
      <div className="status-card">
        <section className="option-block option-block-first">
          <p className="status-label option-title">Advanced settings</p>
        </section>

        <section className="option-block">
          <div className="control-group">
            <ControlLabel
              label="Puzzle setup"
              helpId="setup-mode"
              helpText="Choose whether the next puzzle should come from a single difficulty slider or from the explicit board-size and lock controls."
              activeHelpId={activeHelpId}
              onToggle={onToggleHelp}
            />
            <div className="setup-mode-toggle" role="radiogroup" aria-label="Puzzle setup mode">
              <label className={["setup-mode-option", setupMode === "difficulty" ? "setup-mode-option-active" : ""].join(" ")}>
                <input
                  type="radio"
                  name="setup-mode"
                  value="difficulty"
                  checked={setupMode === "difficulty"}
                  onChange={() => setSetupMode("difficulty")}
                  data-testid="setup-mode-difficulty"
                />
                <span>Difficulty</span>
              </label>
              <label className={["setup-mode-option", setupMode === "custom" ? "setup-mode-option-active" : ""].join(" ")}>
                <input
                  type="radio"
                  name="setup-mode"
                  value="custom"
                  checked={setupMode === "custom"}
                  onChange={() => setSetupMode("custom")}
                  data-testid="setup-mode-custom"
                />
                <span>Custom layout</span>
              </label>
            </div>
            {setupMode === "difficulty" ? (
              <p className="control-help">Use the footer difficulty slider to choose the next catalog layout.</p>
            ) : null}
          </div>
        </section>

        {setupMode === "custom" ? (
          <>
            <div className="control-group" data-testid="custom-layout-panel">
              <ControlLabel
                htmlFor="width-slider"
                label="Width"
                helpId="width"
                helpText="Sets how many columns the puzzle has. Custom boards stay portrait, so width can never exceed the current height."
                activeHelpId={activeHelpId}
                onToggle={onToggleHelp}
              />
              <div className="control-row">
                <input
                  id="width-slider"
                  data-testid="width-slider"
                  type="range"
                  min={MIN_BOARD_SIZE}
                  max={normalizedConfig.height}
                  value={normalizedConfig.width}
                  onChange={(event) => onWidthChange(Number(event.target.value))}
                />
                <strong>{normalizedConfig.width}</strong>
              </div>
            </div>

            <div className="control-group">
              <ControlLabel
                htmlFor="height-slider"
                label="Height"
                helpId="height"
                helpText="Sets how many rows the puzzle has. Custom boards stay portrait, so height can never drop below the current width."
                activeHelpId={activeHelpId}
                onToggle={onToggleHelp}
              />
              <div className="control-row">
                <input
                  id="height-slider"
                  data-testid="height-slider"
                  type="range"
                  min={normalizedConfig.width}
                  max={MAX_BOARD_SIZE}
                  value={normalizedConfig.height}
                  onChange={(event) => onHeightChange(Number(event.target.value))}
                />
                <strong>{normalizedConfig.height}</strong>
              </div>
            </div>

            <LineControl
              title="Vertical lines"
              count={normalizedConfig.verticalLines.count}
              density={normalizedConfig.verticalLines.density}
              countOptions={verticalCountOptions}
              densityOptions={verticalDensityOptions}
              onCountChange={(value) => onLineValueChange("verticalLines", "count", value)}
              onDensityChange={(value) => onLineValueChange("verticalLines", "density", value)}
              countTestId="vertical-count-slider"
              densityTestId="vertical-density-slider"
              activeHelpId={activeHelpId}
              onToggleHelp={onToggleHelp}
            />

            <LineControl
              title="Horizontal lines"
              count={normalizedConfig.horizontalLines.count}
              density={normalizedConfig.horizontalLines.density}
              countOptions={horizontalCountOptions}
              densityOptions={horizontalDensityOptions}
              onCountChange={(value) => onLineValueChange("horizontalLines", "count", value)}
              onDensityChange={(value) => onLineValueChange("horizontalLines", "density", value)}
              countTestId="horizontal-count-slider"
              densityTestId="horizontal-density-slider"
              activeHelpId={activeHelpId}
              onToggleHelp={onToggleHelp}
            />

            <section className="option-block">
              <p className="status-label option-title">Cross lines</p>
              <SnappedSlider
                label="Spacing"
                helpId="cross-density"
                helpText="Controls how densely the diagonal cross locks are placed. Lower spacing values place locks more often along each diagonal."
                options={crossDensityOptions}
                value={normalizedConfig.crossLines.density}
                disabled={false}
                onChange={onCrossDensityChange}
                testId="cross-density-slider"
                activeHelpId={activeHelpId}
                onToggleHelp={onToggleHelp}
              />
            </section>
          </>
        ) : null}

        <section className="option-block">
          <p className="status-label option-title">Cell Appearance</p>
          <SliderRow
            id="cell-spacing-slider"
            label="Cell spacing"
            helpId="cell-spacing"
            helpText="Adds or removes the gap between cells. This only affects presentation, not the generated colors or puzzle logic."
            min={0}
            max={16}
            value={normalizedConfig.appearance.cellSpacing}
            activeHelpId={activeHelpId}
            onToggleHelp={onToggleHelp}
            onChange={(value) => onAppearanceChange("cellSpacing", value)}
          />
          <SliderRow
            id="cell-rounding-slider"
            label="Cell rounding"
            helpId="cell-rounding"
            helpText="Rounds the outer corners of every tile. This is purely visual and does not change the board generation."
            min={0}
            max={16}
            value={normalizedConfig.appearance.cellRounding}
            activeHelpId={activeHelpId}
            onToggleHelp={onToggleHelp}
            onChange={(value) => onAppearanceChange("cellRounding", value)}
          />
          <SliderRow
            id="lock-rounding-slider"
            label="Lock square rounding"
            helpId="lock-rounding"
            helpText="Adjusts the shape of the white inner frame shown on locked cells. It only changes the look of the lock indicator."
            min={0}
            max={16}
            value={normalizedConfig.appearance.lockRounding}
            activeHelpId={activeHelpId}
            onToggleHelp={onToggleHelp}
            onChange={(value) => onAppearanceChange("lockRounding", value)}
          />
          <SliderRow
            id="lock-thickness-slider"
            label="Lock square thickness"
            helpId="lock-thickness"
            helpText="Changes how bold the lock outline appears on locked cells. It has no effect on gameplay or color generation."
            min={1}
            max={8}
            value={normalizedConfig.appearance.lockThickness}
            activeHelpId={activeHelpId}
            onToggleHelp={onToggleHelp}
            onChange={(value) => onAppearanceChange("lockThickness", value)}
          />
          <SliderRow
            id="aid-time-slider"
            label="Aid time"
            helpId="aid-time"
            helpText="Controls how long the aid animation lasts. Set it to zero to apply the aid instantly."
            min={0}
            max={3}
            step={0.1}
            displayValue={normalizedConfig.appearance.aidTimeSeconds.toFixed(1)}
            value={normalizedConfig.appearance.aidTimeSeconds}
            activeHelpId={activeHelpId}
            onToggleHelp={onToggleHelp}
            onChange={(value) => onAppearanceChange("aidTimeSeconds", value)}
          />
        </section>

        <section className="option-block">
          <p className="status-label option-title">Trajectory Color Rules</p>
          <SliderRow
            id="step-strength-slider"
            label="Step strength"
            helpId="step-strength"
            helpText="Targets how large the color difference should be between neighboring cells. Higher values make each local step easier to see, but can become harsh if pushed too far."
            min={0}
            max={100}
            value={normalizedConfig.colorConstraints.targetStepStrength}
            activeHelpId={activeHelpId}
            onToggleHelp={onToggleHelp}
            onChange={(value) => onColorConstraintChange("targetStepStrength", value)}
          />
          <SliderRow
            id="axis-balance-slider"
            label="Axis balance"
            helpId="axis-balance"
            helpText="Keeps the horizontal and vertical gradients similarly strong. Higher values avoid boards where one direction feels readable and the other feels flat."
            min={0}
            max={100}
            value={normalizedConfig.colorConstraints.axisBalance}
            activeHelpId={activeHelpId}
            onToggleHelp={onToggleHelp}
            onChange={(value) => onColorConstraintChange("axisBalance", value)}
          />
          <SliderRow
            id="lightness-range-slider"
            label="Lightness range"
            helpId="lightness-range"
            helpText="Limits how much the board is allowed to travel from light to dark. Higher values allow more contrast, while lower values keep the board more even."
            min={0}
            max={100}
            value={normalizedConfig.colorConstraints.lightnessRange}
            activeHelpId={activeHelpId}
            onToggleHelp={onToggleHelp}
            onChange={(value) => onColorConstraintChange("lightnessRange", value)}
          />
          <SliderRow
            id="chroma-range-slider"
            label="Chroma range"
            helpId="chroma-range"
            helpText="Controls how colorful or muted the generated gradients may become. Higher values allow richer color drift, while lower values keep the palette calmer."
            min={0}
            max={100}
            value={normalizedConfig.colorConstraints.chromaRange}
            activeHelpId={activeHelpId}
            onToggleHelp={onToggleHelp}
            onChange={(value) => onColorConstraintChange("chromaRange", value)}
          />
          <SliderRow
            id="center-preservation-slider"
            label="Center preservation"
            helpId="center-preservation"
            helpText="Penalizes boards whose middle cells collapse into muddy grayish blends. Higher values push the generator to keep the interior readable and colorful."
            min={0}
            max={100}
            value={normalizedConfig.colorConstraints.centerPreservation}
            activeHelpId={activeHelpId}
            onToggleHelp={onToggleHelp}
            onChange={(value) => onColorConstraintChange("centerPreservation", value)}
          />
          <SliderRow
            id="edge-smoothness-slider"
            label="Edge smoothness"
            helpId="edge-smoothness"
            helpText="Prefers edge ramps that change evenly from one corner to the other. Higher values reject sudden jumps that make a midpoint hard to read as an in-between color."
            min={0}
            max={100}
            value={normalizedConfig.colorConstraints.edgeSmoothnessBias}
            activeHelpId={activeHelpId}
            onToggleHelp={onToggleHelp}
            onChange={(value) => onColorConstraintChange("edgeSmoothnessBias", value)}
          />
        </section>

        {researchPanel}

        {setupMode === "difficulty" ? (
          <div>
            <span className="status-label">Difficulty</span>
            <strong data-testid="selected-difficulty-summary">{selectedDifficultyTier}</strong>
          </div>
        ) : null}
        <div>
          <span className="status-label">{setupMode === "difficulty" ? "Next grid" : "Grid"}</span>
          <strong>{setupMode === "difficulty" ? `${previewConfig.width} x ${previewConfig.height}` : currentGridLabel}</strong>
        </div>
        <div>
          <span className="status-label">Locked</span>
          <strong>{lockedCount}</strong>
        </div>
        <div>
          <span className="status-label">{setupMode === "difficulty" ? "Next layout locks" : "Next puzzle locks"}</span>
          <strong data-testid="next-locked-count">{nextLockedCount}</strong>
        </div>
        <div>
          <span className="status-label">Swaps</span>
          <strong>{swapCount}</strong>
        </div>
        <div>
          <span className="status-label">Aids used</span>
          <strong data-testid="aid-count">{hintCount}</strong>
        </div>

        {!canCreatePuzzle && setupMode === "custom" ? (
          <p className="settings-note" data-testid="settings-warning">
            Current settings lock too many cells. Reduce the line patterns before starting a new puzzle.
          </p>
        ) : null}
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
