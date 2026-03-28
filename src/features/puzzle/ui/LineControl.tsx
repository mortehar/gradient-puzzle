import { SnappedSlider } from "./SnappedSlider";

type LineControlProps = {
  title: string;
  count: number;
  density: number;
  countOptions: number[];
  densityOptions: number[];
  onCountChange: (value: number) => void;
  onDensityChange: (value: number) => void;
  countTestId: string;
  densityTestId: string;
  activeHelpId: string | null;
  onToggleHelp: (helpId: string) => void;
};

export function LineControl({
  title,
  count,
  density,
  countOptions,
  densityOptions,
  onCountChange,
  onDensityChange,
  countTestId,
  densityTestId,
  activeHelpId,
  onToggleHelp
}: LineControlProps) {
  return (
    <section className="option-block">
      <p className="status-label option-title">{title}</p>
      <SnappedSlider
        label="Number"
        helpId={`${title}-count`}
        helpText={`Chooses how many ${title.toLowerCase()} are locked into place. Higher numbers reveal more fixed anchors along that direction.`}
        options={countOptions}
        value={count}
        disabled={false}
        onChange={onCountChange}
        testId={countTestId}
        activeHelpId={activeHelpId}
        onToggleHelp={onToggleHelp}
      />
      <SnappedSlider
        label="Spacing"
        helpId={`${title}-spacing`}
        helpText={`Sets how frequently locks appear along each ${title.toLowerCase().replace(" lines", "")}. Smaller spacing values place those locked cells more densely.`}
        options={densityOptions}
        value={density}
        disabled={count === 0}
        onChange={onDensityChange}
        testId={densityTestId}
        activeHelpId={activeHelpId}
        onToggleHelp={onToggleHelp}
      />
    </section>
  );
}
