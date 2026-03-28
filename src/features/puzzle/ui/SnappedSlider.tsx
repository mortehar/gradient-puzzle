import { ControlLabel } from "./ControlLabel";

type SnappedSliderProps = {
  label: string;
  helpId: string;
  helpText: string;
  options: number[];
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
  testId: string;
  activeHelpId: string | null;
  onToggleHelp: (helpId: string) => void;
};

export function SnappedSlider({
  label,
  helpId,
  helpText,
  options,
  value,
  disabled,
  onChange,
  testId,
  activeHelpId,
  onToggleHelp
}: SnappedSliderProps) {
  const currentIndex = Math.max(0, options.indexOf(value));

  return (
    <div className="control-group snapped-group">
      <ControlLabel
        label={label}
        helpId={helpId}
        helpText={helpText}
        activeHelpId={activeHelpId}
        onToggle={onToggleHelp}
      />
      <div className="control-row">
        <input
          data-testid={testId}
          type="range"
          min={0}
          max={Math.max(0, options.length - 1)}
          step={1}
          disabled={disabled}
          value={currentIndex}
          onChange={(event) => onChange(options[Number(event.target.value)] ?? options[0])}
        />
        <strong>{options[currentIndex]}</strong>
      </div>
    </div>
  );
}
