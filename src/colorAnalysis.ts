export type Rgb = {
  r: number;
  g: number;
  b: number;
};

export type OklabColor = {
  l: number;
  a: number;
  b: number;
};

export type DistanceStats = {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p10: number;
  p90: number;
  standardDeviation: number;
  coefficientOfVariation: number;
};

export type AxisMonotonicity = {
  lineCount: number;
  monotonicLineCount: number;
  reversalCount: number;
  reversalRate: number;
  consistency: number;
  dominantDirectionShare: number;
};

export type EdgeRampSmoothness = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  mean: number;
};

export type CenterChromaMetrics = {
  centerMean: number;
  edgeMean: number;
  drop: number;
  normalizedDrop: number;
};

export type ReadabilityHeuristic = {
  score: number;
  label: "good" | "promising" | "mixed" | "too flat" | "muddy" | "harsh";
  reasons: string[];
};

export type BoardColorMetrics = {
  horizontalNeighborDistances: DistanceStats;
  verticalNeighborDistances: DistanceStats;
  allNeighborDistances: DistanceStats;
  rowLightnessMonotonicity: AxisMonotonicity;
  columnLightnessMonotonicity: AxisMonotonicity;
  neighborDistanceVariability: number;
  edgeRampSmoothness: EdgeRampSmoothness;
  centerChroma: CenterChromaMetrics;
  cornerSpan: DistanceStats;
  edgeMidpointClarity: number;
  worstLocalJump: number;
  axisStrengthBalance: number;
  readability: ReadabilityHeuristic;
};

export type MetricRange = {
  min: number;
  max: number;
};

export type BoardResearchSample = {
  metrics: BoardColorMetrics;
};

export type BoardResearchSummary = {
  sampleCount: number;
  score: DistanceStats;
  medianNeighborDistance: DistanceStats;
  neighborDistanceVariability: DistanceStats;
  rowReversalRate: DistanceStats;
  columnReversalRate: DistanceStats;
  centerChromaDrop: DistanceStats;
  edgeRampSmoothness: DistanceStats;
  edgeMidpointClarity: DistanceStats;
  axisStrengthBalance: DistanceStats;
  labelCounts: Record<ReadabilityHeuristic["label"], number>;
  sweetSpot: {
    medianNeighborDistance: MetricRange;
    neighborDistanceVariability: MetricRange;
    rowReversalRate: MetricRange;
    columnReversalRate: MetricRange;
    centerChromaDrop: MetricRange;
    edgeRampSmoothness: MetricRange;
    edgeMidpointClarity: MetricRange;
    axisStrengthBalance: MetricRange;
  };
};

export type BoardResearchSweep = {
  samples: BoardResearchSample[];
  summary: BoardResearchSummary;
};

type BoardColorSample = {
  solvedIndex: number;
  color: string;
};

const LIGHTNESS_EPSILON = 0.0015;
const FLAT_MEDIAN_DISTANCE = 0.028;
const TARGET_MEDIAN_DISTANCE = 0.055;
const HARSH_MEDIAN_DISTANCE = 0.12;
const MIN_VISIBLE_STEP = 0.015;
const MAX_STEP_VARIABILITY = 0.33;
const MAX_REVERSAL_RATE = 0.1;
const MAX_CENTER_DROP = 0.28;
const MAX_EDGE_ROUGHNESS = 0.018;
const MIN_EDGE_MIDPOINT_CLARITY = 0.7;
const MIN_AXIS_STRENGTH_BALANCE = 0.45;
const MAX_WORST_JUMP_RATIO = 2.15;

export function analyzeBoardTiles(tiles: BoardColorSample[], width: number, height: number): BoardColorMetrics {
  const orderedTiles = [...tiles].sort((left, right) => left.solvedIndex - right.solvedIndex);
  const colors = orderedTiles.map((tile) => cssRgbToOklab(tile.color));
  const rows = buildAxisLines(colors, width, height, "row");
  const columns = buildAxisLines(colors, width, height, "column");
  const horizontalNeighborDistances = summarizeDistances(buildNeighborDistances(colors, width, height, "horizontal"));
  const verticalNeighborDistances = summarizeDistances(buildNeighborDistances(colors, width, height, "vertical"));
  const allNeighborValues = [
    ...buildNeighborDistances(colors, width, height, "horizontal"),
    ...buildNeighborDistances(colors, width, height, "vertical")
  ];
  const allNeighborDistances = summarizeDistances(allNeighborValues);
  const rowLightnessMonotonicity = analyzeAxisMonotonicity(rows.map((line) => line.map((color) => color.l)));
  const columnLightnessMonotonicity = analyzeAxisMonotonicity(columns.map((line) => line.map((color) => color.l)));
  const edgeRampSmoothness = analyzeEdgeRampSmoothness(rows, columns);
  const centerChroma = analyzeCenterChroma(colors, width, height);
  const cornerSpan = summarizeDistances(buildCornerDistances(colors, width, height));
  const edgeMidpointClarity = analyzeEdgeMidpointClarity(rows, columns);
  const worstLocalJump = allNeighborDistances.max;
  const axisStrengthBalance = getAxisStrengthBalance(horizontalNeighborDistances.mean, verticalNeighborDistances.mean);

  const metrics: BoardColorMetrics = {
    horizontalNeighborDistances,
    verticalNeighborDistances,
    allNeighborDistances,
    rowLightnessMonotonicity,
    columnLightnessMonotonicity,
    neighborDistanceVariability: allNeighborDistances.coefficientOfVariation,
    edgeRampSmoothness,
    centerChroma,
    cornerSpan,
    edgeMidpointClarity,
    worstLocalJump,
    axisStrengthBalance,
    readability: {
      score: 0,
      label: "mixed",
      reasons: []
    }
  };

  metrics.readability = scoreBoardReadability(metrics);

  return metrics;
}

export function cssRgbToOklab(color: string): OklabColor {
  return rgbToOklab(parseCssRgb(color));
}

export function parseCssRgb(color: string): Rgb {
  const matches = color.match(/\d+/g);

  if (!matches || matches.length !== 3) {
    throw new Error(`Unexpected color format: ${color}`);
  }

  const [r, g, b] = matches.map(Number);

  return { r, g, b };
}

export function rgbToCss(color: Rgb): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export function rgbToOklab(color: Rgb): OklabColor {
  const red = srgbChannelToLinear(color.r / 255);
  const green = srgbChannelToLinear(color.g / 255);
  const blue = srgbChannelToLinear(color.b / 255);

  const l = 0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue;
  const m = 0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue;
  const s = 0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  return {
    l: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot
  };
}

export function oklabToRgb(color: OklabColor): Rgb | null {
  const lPrime = color.l + 0.3963377774 * color.a + 0.2158037573 * color.b;
  const mPrime = color.l - 0.1055613458 * color.a - 0.0638541728 * color.b;
  const sPrime = color.l - 0.0894841775 * color.a - 1.291485548 * color.b;

  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  const red = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const green = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const blue = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  if (red < -0.0005 || red > 1.0005 || green < -0.0005 || green > 1.0005 || blue < -0.0005 || blue > 1.0005) {
    return null;
  }

  return {
    r: Math.round(linearToSrgb(clamp(red, 0, 1)) * 255),
    g: Math.round(linearToSrgb(clamp(green, 0, 1)) * 255),
    b: Math.round(linearToSrgb(clamp(blue, 0, 1)) * 255)
  };
}

export function oklabToCss(color: OklabColor): string | null {
  const rgb = oklabToRgb(color);
  return rgb ? rgbToCss(rgb) : null;
}

export function getOklabDistance(left: OklabColor, right: OklabColor): number {
  return Math.hypot(left.l - right.l, left.a - right.a, left.b - right.b);
}

export function summarizeResearchSamples(samples: BoardResearchSample[]): BoardResearchSummary {
  const scoredSamples = [...samples].sort((left, right) => right.metrics.readability.score - left.metrics.readability.score);
  const topSampleCount = Math.max(3, Math.ceil(scoredSamples.length / 3));
  const sweetSpotSamples = scoredSamples.slice(0, topSampleCount);

  return {
    sampleCount: samples.length,
    score: summarizeDistances(samples.map((sample) => sample.metrics.readability.score)),
    medianNeighborDistance: summarizeDistances(samples.map((sample) => sample.metrics.allNeighborDistances.median)),
    neighborDistanceVariability: summarizeDistances(samples.map((sample) => sample.metrics.neighborDistanceVariability)),
    rowReversalRate: summarizeDistances(samples.map((sample) => sample.metrics.rowLightnessMonotonicity.reversalRate)),
    columnReversalRate: summarizeDistances(samples.map((sample) => sample.metrics.columnLightnessMonotonicity.reversalRate)),
    centerChromaDrop: summarizeDistances(samples.map((sample) => sample.metrics.centerChroma.normalizedDrop)),
    edgeRampSmoothness: summarizeDistances(samples.map((sample) => sample.metrics.edgeRampSmoothness.mean)),
    edgeMidpointClarity: summarizeDistances(samples.map((sample) => sample.metrics.edgeMidpointClarity)),
    axisStrengthBalance: summarizeDistances(samples.map((sample) => sample.metrics.axisStrengthBalance)),
    labelCounts: countLabels(samples),
    sweetSpot: {
      medianNeighborDistance: summarizeRange(sweetSpotSamples.map((sample) => sample.metrics.allNeighborDistances.median)),
      neighborDistanceVariability: summarizeRange(sweetSpotSamples.map((sample) => sample.metrics.neighborDistanceVariability)),
      rowReversalRate: summarizeRange(sweetSpotSamples.map((sample) => sample.metrics.rowLightnessMonotonicity.reversalRate)),
      columnReversalRate: summarizeRange(sweetSpotSamples.map((sample) => sample.metrics.columnLightnessMonotonicity.reversalRate)),
      centerChromaDrop: summarizeRange(sweetSpotSamples.map((sample) => sample.metrics.centerChroma.normalizedDrop)),
      edgeRampSmoothness: summarizeRange(sweetSpotSamples.map((sample) => sample.metrics.edgeRampSmoothness.mean)),
      edgeMidpointClarity: summarizeRange(sweetSpotSamples.map((sample) => sample.metrics.edgeMidpointClarity)),
      axisStrengthBalance: summarizeRange(sweetSpotSamples.map((sample) => sample.metrics.axisStrengthBalance))
    }
  };
}

function srgbChannelToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(channel: number): number {
  return channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
}

function getChroma(color: OklabColor): number {
  return Math.hypot(color.a, color.b);
}

function buildNeighborDistances(
  colors: OklabColor[],
  width: number,
  height: number,
  axis: "horizontal" | "vertical"
): number[] {
  const distances: number[] = [];

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const index = row * width + column;

      if (axis === "horizontal" && column < width - 1) {
        distances.push(getOklabDistance(colors[index], colors[index + 1]));
      }

      if (axis === "vertical" && row < height - 1) {
        distances.push(getOklabDistance(colors[index], colors[index + width]));
      }
    }
  }

  return distances;
}

function buildAxisLines(
  colors: OklabColor[],
  width: number,
  height: number,
  axis: "row" | "column"
): OklabColor[][] {
  if (axis === "row") {
    return Array.from({ length: height }, (_, row) =>
      Array.from({ length: width }, (_, column) => colors[row * width + column])
    );
  }

  return Array.from({ length: width }, (_, column) =>
    Array.from({ length: height }, (_, row) => colors[row * width + column])
  );
}

function buildCornerDistances(colors: OklabColor[], width: number, height: number): number[] {
  const cornerIndexes = [0, width - 1, width * (height - 1), width * height - 1];
  const distances: number[] = [];

  for (let left = 0; left < cornerIndexes.length; left += 1) {
    for (let right = left + 1; right < cornerIndexes.length; right += 1) {
      distances.push(getOklabDistance(colors[cornerIndexes[left]], colors[cornerIndexes[right]]));
    }
  }

  return distances;
}

function summarizeDistances(values: number[]): DistanceStats {
  if (values.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p10: 0,
      p90: 0,
      standardDeviation: 0,
      coefficientOfVariation: 0
    };
  }

  const sorted = [...values].sort((left, right) => left - right);
  const mean = sorted.reduce((total, value) => total + value, 0) / sorted.length;
  const variance = sorted.reduce((total, value) => total + (value - mean) ** 2, 0) / sorted.length;
  const standardDeviation = Math.sqrt(variance);

  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    median: getPercentile(sorted, 0.5),
    p10: getPercentile(sorted, 0.1),
    p90: getPercentile(sorted, 0.9),
    standardDeviation,
    coefficientOfVariation: mean === 0 ? 0 : standardDeviation / mean
  };
}

function getPercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  if (sortedValues.length === 1) {
    return sortedValues[0];
  }

  const position = (sortedValues.length - 1) * percentile;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const ratio = position - lowerIndex;

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  return sortedValues[lowerIndex] + (sortedValues[upperIndex] - sortedValues[lowerIndex]) * ratio;
}

function analyzeAxisMonotonicity(lines: number[][]): AxisMonotonicity {
  let reversalCount = 0;
  let transitionCount = 0;
  let monotonicLineCount = 0;
  let consistencyTotal = 0;
  let increasingLines = 0;
  let decreasingLines = 0;
  let flatLines = 0;

  lines.forEach((line) => {
    const diffs = [];

    for (let index = 0; index < line.length - 1; index += 1) {
      const delta = line[index + 1] - line[index];

      if (Math.abs(delta) > LIGHTNESS_EPSILON) {
        diffs.push(delta);
      }
    }

    transitionCount += diffs.length;

    if (diffs.length === 0) {
      monotonicLineCount += 1;
      consistencyTotal += 1;
      flatLines += 1;
      return;
    }

    const positiveCount = diffs.filter((delta) => delta > 0).length;
    const negativeCount = diffs.length - positiveCount;
    const dominantSign = positiveCount >= negativeCount ? 1 : -1;
    const lineReversals = diffs.filter((delta) => Math.sign(delta) !== dominantSign).length;

    reversalCount += lineReversals;
    consistencyTotal += (diffs.length - lineReversals) / diffs.length;

    if (lineReversals === 0) {
      monotonicLineCount += 1;
    }

    if (dominantSign > 0) {
      increasingLines += 1;
    } else {
      decreasingLines += 1;
    }
  });

  const dominantDirectionShare =
    lines.length === 0 ? 1 : Math.max(increasingLines, decreasingLines, flatLines) / lines.length;

  return {
    lineCount: lines.length,
    monotonicLineCount,
    reversalCount,
    reversalRate: transitionCount === 0 ? 0 : reversalCount / transitionCount,
    consistency: lines.length === 0 ? 1 : consistencyTotal / lines.length,
    dominantDirectionShare
  };
}

function analyzeEdgeRampSmoothness(rows: OklabColor[][], columns: OklabColor[][]): EdgeRampSmoothness {
  const top = getLineSmoothness(rows[0] ?? []);
  const bottom = getLineSmoothness(rows[rows.length - 1] ?? []);
  const left = getLineSmoothness(columns[0] ?? []);
  const right = getLineSmoothness(columns[columns.length - 1] ?? []);

  return {
    top,
    bottom,
    left,
    right,
    mean: (top + bottom + left + right) / 4
  };
}

function getLineSmoothness(line: OklabColor[]): number {
  if (line.length < 3) {
    return 0;
  }

  const stepSizes: number[] = [];

  for (let index = 0; index < line.length - 1; index += 1) {
    stepSizes.push(getOklabDistance(line[index], line[index + 1]));
  }

  if (stepSizes.length < 2) {
    return 0;
  }

  const stepChanges = [];

  for (let index = 0; index < stepSizes.length - 1; index += 1) {
    stepChanges.push(Math.abs(stepSizes[index + 1] - stepSizes[index]));
  }

  return stepChanges.reduce((total, value) => total + value, 0) / stepChanges.length;
}

function analyzeCenterChroma(colors: OklabColor[], width: number, height: number): CenterChromaMetrics {
  const centerRowInset = Math.max(1, Math.floor(height / 4));
  const centerColumnInset = Math.max(1, Math.floor(width / 4));
  const centerChromas: number[] = [];
  const edgeChromas: number[] = [];

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const chroma = getChroma(colors[row * width + column]);
      const isEdge = row === 0 || column === 0 || row === height - 1 || column === width - 1;
      const isCenter =
        row >= centerRowInset &&
        row < height - centerRowInset &&
        column >= centerColumnInset &&
        column < width - centerColumnInset;

      if (isEdge) {
        edgeChromas.push(chroma);
      }

      if (isCenter) {
        centerChromas.push(chroma);
      }
    }
  }

  const centerMean = centerChromas.length === 0 ? 0 : average(centerChromas);
  const edgeMean = edgeChromas.length === 0 ? 0 : average(edgeChromas);
  const drop = Math.max(0, edgeMean - centerMean);

  return {
    centerMean,
    edgeMean,
    drop,
    normalizedDrop: edgeMean === 0 ? 0 : drop / edgeMean
  };
}

function analyzeEdgeMidpointClarity(rows: OklabColor[][], columns: OklabColor[][]): number {
  const clarityValues = [
    ...getEdgeClarityValues(rows[0] ?? []),
    ...getEdgeClarityValues(rows[rows.length - 1] ?? []),
    ...getEdgeClarityValues(columns[0] ?? []),
    ...getEdgeClarityValues(columns[columns.length - 1] ?? [])
  ];

  if (clarityValues.length === 0) {
    return 1;
  }

  return Math.min(...clarityValues);
}

function getEdgeClarityValues(line: OklabColor[]): number[] {
  if (line.length < 3) {
    return [1];
  }

  const start = line[0];
  const end = line[line.length - 1];
  const endpointDistance = getOklabDistance(start, end);

  if (endpointDistance < 0.0001) {
    return [0];
  }

  return line.slice(1, -1).map((color, index) => {
    const position = (index + 1) / (line.length - 1);
    const ideal = lerpColor(start, end, position);
    const deviation = getOklabDistance(color, ideal);
    const projectedPosition = getProjectedPosition(start, end, color);
    const betweenPenalty = projectedPosition >= -0.05 && projectedPosition <= 1.05 ? 1 : 0.6;

    return clamp(1 - deviation / (endpointDistance * 0.38 + 0.0001), 0, 1) * betweenPenalty;
  });
}

function lerpColor(start: OklabColor, end: OklabColor, ratio: number): OklabColor {
  return {
    l: start.l + (end.l - start.l) * ratio,
    a: start.a + (end.a - start.a) * ratio,
    b: start.b + (end.b - start.b) * ratio
  };
}

function getProjectedPosition(start: OklabColor, end: OklabColor, value: OklabColor): number {
  const delta = {
    l: end.l - start.l,
    a: end.a - start.a,
    b: end.b - start.b
  };
  const numerator =
    (value.l - start.l) * delta.l +
    (value.a - start.a) * delta.a +
    (value.b - start.b) * delta.b;
  const denominator = delta.l ** 2 + delta.a ** 2 + delta.b ** 2;

  return denominator === 0 ? 0 : numerator / denominator;
}

function getAxisStrengthBalance(horizontalMean: number, verticalMean: number): number {
  const stronger = Math.max(horizontalMean, verticalMean);
  const weaker = Math.min(horizontalMean, verticalMean);

  return stronger === 0 ? 1 : weaker / stronger;
}

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function scoreBoardReadability(metrics: BoardColorMetrics): ReadabilityHeuristic {
  const reasons: string[] = [];
  let score = 100;
  const medianDistance = metrics.allNeighborDistances.median;
  const p10Distance = metrics.allNeighborDistances.p10;
  const variability = metrics.neighborDistanceVariability;
  const reversalRate = (metrics.rowLightnessMonotonicity.reversalRate + metrics.columnLightnessMonotonicity.reversalRate) / 2;
  const centerDrop = metrics.centerChroma.normalizedDrop;
  const edgeRoughness = metrics.edgeRampSmoothness.mean;
  const worstJumpRatio = medianDistance === 0 ? 0 : metrics.worstLocalJump / medianDistance;

  if (medianDistance < TARGET_MEDIAN_DISTANCE) {
    score -= scalePenalty(medianDistance, FLAT_MEDIAN_DISTANCE, TARGET_MEDIAN_DISTANCE, 28, true);
  }

  if (medianDistance > TARGET_MEDIAN_DISTANCE) {
    score -= scalePenalty(medianDistance, TARGET_MEDIAN_DISTANCE, HARSH_MEDIAN_DISTANCE, 24, false);
  }

  if (p10Distance < MIN_VISIBLE_STEP) {
    score -= scalePenalty(p10Distance, 0, MIN_VISIBLE_STEP, 18, true);
    reasons.push("Some adjacent cells are close enough to blur together.");
  }

  if (variability > MAX_STEP_VARIABILITY) {
    score -= scalePenalty(variability, MAX_STEP_VARIABILITY, 0.75, 18, false);
    reasons.push("Neighbor step sizes vary a lot across the board.");
  }

  if (reversalRate > MAX_REVERSAL_RATE) {
    score -= scalePenalty(reversalRate, MAX_REVERSAL_RATE, 0.4, 18, false);
    reasons.push("Lightness order reverses too often across rows and columns.");
  }

  if (centerDrop > MAX_CENTER_DROP) {
    score -= scalePenalty(centerDrop, MAX_CENTER_DROP, 0.75, 18, false);
    reasons.push("The center loses too much chroma compared with the edges.");
  }

  if (edgeRoughness > MAX_EDGE_ROUGHNESS) {
    score -= scalePenalty(edgeRoughness, MAX_EDGE_ROUGHNESS, 0.06, 12, false);
    reasons.push("Edge ramps change pace instead of stepping smoothly.");
  }

  if (metrics.edgeMidpointClarity < MIN_EDGE_MIDPOINT_CLARITY) {
    score -= scalePenalty(metrics.edgeMidpointClarity, 0.3, MIN_EDGE_MIDPOINT_CLARITY, 22, true);
    reasons.push("At least one edge midpoint stops reading as a clear between-color.");
  }

  if (metrics.axisStrengthBalance < MIN_AXIS_STRENGTH_BALANCE) {
    score -= scalePenalty(metrics.axisStrengthBalance, 0.15, MIN_AXIS_STRENGTH_BALANCE, 20, true);
    reasons.push("One axis contributes much less than the other.");
  }

  if (worstJumpRatio > MAX_WORST_JUMP_RATIO) {
    score -= scalePenalty(worstJumpRatio, MAX_WORST_JUMP_RATIO, 4.2, 18, false);
    reasons.push("One local jump is much harsher than the surrounding steps.");
  }

  if (medianDistance < FLAT_MEDIAN_DISTANCE && !reasons.includes("Some adjacent cells are close enough to blur together.")) {
    reasons.push("The board may read as too flat overall.");
  }

  if (centerDrop > 0.38 || metrics.edgeMidpointClarity < 0.48) {
    reasons.push("The interior loses too much of the edge color story.");
  }

  if (medianDistance > HARSH_MEDIAN_DISTANCE || worstJumpRatio > 2.8) {
    reasons.push("Adjacent jumps are large enough to feel categorical instead of gradual.");
  }

  const finalScore = clamp(score, 0, 100);

  return {
    score: finalScore,
    label: getReadabilityLabel(finalScore, metrics),
    reasons
  };
}

function scalePenalty(value: number, start: number, end: number, maxPenalty: number, invert: boolean): number {
  if (invert) {
    if (value >= end) {
      return 0;
    }

    if (value <= start) {
      return maxPenalty;
    }

    return ((end - value) / (end - start)) * maxPenalty;
  }

  if (value <= start) {
    return 0;
  }

  if (value >= end) {
    return maxPenalty;
  }

  return ((value - start) / (end - start)) * maxPenalty;
}

function getReadabilityLabel(score: number, metrics: BoardColorMetrics): ReadabilityHeuristic["label"] {
  const worstJumpRatio =
    metrics.allNeighborDistances.median === 0 ? 0 : metrics.worstLocalJump / metrics.allNeighborDistances.median;

  if (metrics.allNeighborDistances.median < FLAT_MEDIAN_DISTANCE) {
    return "too flat";
  }

  if (metrics.centerChroma.normalizedDrop > 0.4 || metrics.edgeMidpointClarity < 0.45) {
    return "muddy";
  }

  if (metrics.allNeighborDistances.median > HARSH_MEDIAN_DISTANCE || worstJumpRatio > 2.8) {
    return "harsh";
  }

  if (score >= 84) {
    return "good";
  }

  if (score >= 68) {
    return "promising";
  }

  return "mixed";
}

function countLabels(samples: BoardResearchSample[]): Record<ReadabilityHeuristic["label"], number> {
  return samples.reduce<Record<ReadabilityHeuristic["label"], number>>(
    (counts, sample) => {
      counts[sample.metrics.readability.label] += 1;
      return counts;
    },
    {
      good: 0,
      promising: 0,
      mixed: 0,
      "too flat": 0,
      muddy: 0,
      harsh: 0
    }
  );
}

function summarizeRange(values: number[]): MetricRange {
  const sorted = [...values].sort((left, right) => left - right);

  return {
    min: getPercentile(sorted, 0.15),
    max: getPercentile(sorted, 0.85)
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
