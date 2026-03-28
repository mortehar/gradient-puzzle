import type { BoardColorMetrics, BoardResearchSweep } from "../domain";
import { MetricRangeRow } from "./MetricRangeRow";
import { MetricStat } from "./MetricStat";
import { formatPercent, formatMetricNumber } from "./boardPresentation";

type PuzzleResearchPanelProps = {
  researchSweep: BoardResearchSweep;
  currentBoardMetrics: BoardColorMetrics;
  currentReversalRate: number;
  currentOrderedShare: number;
};

export function PuzzleResearchPanel({
  researchSweep,
  currentBoardMetrics,
  currentReversalRate,
  currentOrderedShare
}: PuzzleResearchPanelProps) {
  return (
    <section className="option-block research-block" data-testid="research-panel">
      <div className="option-heading">
        <p className="status-label option-title">Perceptual Research</p>
        <strong data-testid="current-readability-label">{currentBoardMetrics.readability.label}</strong>
      </div>

      <p className="research-copy">
        Scores use Oklab distances from the final solved cell colors, so the readout tracks local readability,
        midpoint clarity, and smoothness across the whole board.
      </p>

      <div className="research-grid">
        <MetricStat
          label="Current board score"
          value={`${Math.round(currentBoardMetrics.readability.score)}/100`}
          testId="current-board-score"
        />
        <MetricStat
          label="Sample average"
          value={`${Math.round(researchSweep.summary.score.mean)}/100`}
          testId="sample-average-score"
        />
        <MetricStat
          label="Good or promising"
          value={`${researchSweep.summary.labelCounts.good + researchSweep.summary.labelCounts.promising}/${researchSweep.summary.sampleCount}`}
        />
        <MetricStat label="Edge midpoint clarity" value={formatPercent(currentBoardMetrics.edgeMidpointClarity)} />
      </div>

      {currentBoardMetrics.readability.reasons.length > 0 ? (
        <p className="research-copy" data-testid="current-board-reasons">
          {currentBoardMetrics.readability.reasons[0]}
        </p>
      ) : (
        <p className="research-copy" data-testid="current-board-reasons">
          The board currently stays within the smooth-step guardrails.
        </p>
      )}

      <div className="research-grid research-grid-tight">
        <MetricStat label="Median neighbor step" value={formatMetricNumber(currentBoardMetrics.allNeighborDistances.median)} />
        <MetricStat label="Step variability" value={formatPercent(currentBoardMetrics.neighborDistanceVariability)} />
        <MetricStat label="Lightness reversals" value={formatPercent(currentReversalRate)} />
        <MetricStat label="Ordered lightness" value={formatPercent(currentOrderedShare)} />
        <MetricStat label="Center chroma drop" value={formatPercent(currentBoardMetrics.centerChroma.normalizedDrop)} />
        <MetricStat label="Axis balance" value={formatPercent(currentBoardMetrics.axisStrengthBalance)} />
      </div>

      <div className="research-range-list">
        <MetricRangeRow label="Median step sweet spot" range={researchSweep.summary.sweetSpot.medianNeighborDistance} />
        <MetricRangeRow
          label="Step variability guardrail"
          range={researchSweep.summary.sweetSpot.neighborDistanceVariability}
          formatter={formatPercent}
        />
        <MetricRangeRow
          label="Row reversal guardrail"
          range={researchSweep.summary.sweetSpot.rowReversalRate}
          formatter={formatPercent}
        />
        <MetricRangeRow
          label="Column reversal guardrail"
          range={researchSweep.summary.sweetSpot.columnReversalRate}
          formatter={formatPercent}
        />
        <MetricRangeRow
          label="Center muddiness guardrail"
          range={researchSweep.summary.sweetSpot.centerChromaDrop}
          formatter={formatPercent}
        />
        <MetricRangeRow
          label="Midpoint clarity sweet spot"
          range={researchSweep.summary.sweetSpot.edgeMidpointClarity}
          formatter={formatPercent}
        />
        <MetricRangeRow
          label="Axis balance sweet spot"
          range={researchSweep.summary.sweetSpot.axisStrengthBalance}
          formatter={formatPercent}
        />
      </div>
    </section>
  );
}
