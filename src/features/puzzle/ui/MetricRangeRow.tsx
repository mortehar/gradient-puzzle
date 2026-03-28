import type { MetricRange } from "../domain";
import { formatMetricNumber } from "./boardPresentation";

type MetricRangeRowProps = {
  label: string;
  range: MetricRange;
  formatter?: (value: number) => string;
};

export function MetricRangeRow({ label, range, formatter = formatMetricNumber }: MetricRangeRowProps) {
  return (
    <div className="research-range-row">
      <span className="status-label">{label}</span>
      <strong>
        {formatter(range.min)} to {formatter(range.max)}
      </strong>
    </div>
  );
}
