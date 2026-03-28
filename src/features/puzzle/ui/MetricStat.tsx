type MetricStatProps = {
  label: string;
  value: string;
  testId?: string;
};

export function MetricStat({ label, value, testId }: MetricStatProps) {
  return (
    <div className="research-stat" data-testid={testId}>
      <span className="status-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
