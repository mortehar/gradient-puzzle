import {
  DEFAULT_CONFIG,
  cssRgbToOklab,
  generateTrajectoryBoard,
  normalizeConfig,
  type BoardColorMetrics,
  type GameConfig,
  type Tile,
  type TrajectoryColorConfig
} from "../src/features/puzzle/domain";

type SliderKey = keyof TrajectoryColorConfig;

type SweepArgs = {
  sampleCount: number;
  delta: number;
  neighborhoodSampleCount: number;
  neighborhoodDelta: number;
  topCount: number;
};

type BoardSample = {
  metrics: BoardColorMetrics;
  flattenedBoard: number[];
  flattenedCorners: number[];
};

type ConfigStats = {
  label: string;
  constraints: TrajectoryColorConfig;
  sampleCount: number;
  meanScore: number;
  minScore: number;
  maxScore: number;
  goodRate: number;
  promisingOrBetterRate: number;
  muddyOrHarshRate: number;
  meanMedianNeighborDistance: number;
  meanNeighborVariability: number;
  meanCenterDrop: number;
  meanEdgeClarity: number;
  meanAxisBalance: number;
  scoreStandardDeviation: number;
  boardDispersion: number;
  cornerDispersion: number;
};

type NeighborhoodCandidate = ConfigStats & {
  qualityDeltaVsBaseline: number;
  varietyDeltaVsBaseline: number;
};

const SLIDER_KEYS: SliderKey[] = [
  "targetStepStrength",
  "axisBalance",
  "lightnessRange",
  "chromaRange",
  "centerPreservation",
  "edgeSmoothnessBias"
];

const DEFAULT_ARGS: SweepArgs = {
  sampleCount: 48,
  delta: 12,
  neighborhoodSampleCount: 10,
  neighborhoodDelta: 10,
  topCount: 8
};

function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseConfig = normalizeConfig(DEFAULT_CONFIG);
  const baselineStats = evaluateConfig("baseline", baseConfig, args.sampleCount);
  const sensitivityConfigs = buildSensitivityConfigs(baseConfig, args.delta);
  const sensitivityStats = sensitivityConfigs.map(({ label, config }) =>
    evaluateConfig(label, config, args.sampleCount)
  );
  const neighborhoodStats = buildNeighborhoodStats(baseConfig, args);
  const qualityLeaders = rankNeighborhoodByQuality(neighborhoodStats, args.topCount);
  const varietyLeaders = rankNeighborhoodByVariety(neighborhoodStats, baselineStats, args.topCount);
  const validatedLeaders = validateLeaders(baseConfig, qualityLeaders, varietyLeaders, args.sampleCount);

  printHeader(args, baselineStats.sampleCount);
  printBaseline(baselineStats);
  printSensitivityTable(sensitivityStats, baselineStats);
  printNeighborhoodTable("Best Nearby Configs By Quality", qualityLeaders);
  printNeighborhoodTable("Most Varied Nearby Configs That Stay Competitive", varietyLeaders);
  printValidatedTable(validatedLeaders, baselineStats);
  printRecommendation(baselineStats, validatedLeaders[0], varietyLeaders[0]);
}

function parseArgs(argv: string[]): SweepArgs {
  const parsed = { ...DEFAULT_ARGS };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (!next) {
      continue;
    }

    if (token === "--samples") {
      parsed.sampleCount = parsePositiveInteger(next, parsed.sampleCount);
      index += 1;
      continue;
    }

    if (token === "--delta") {
      parsed.delta = parsePositiveInteger(next, parsed.delta);
      index += 1;
      continue;
    }

    if (token === "--neighborhood-samples") {
      parsed.neighborhoodSampleCount = parsePositiveInteger(next, parsed.neighborhoodSampleCount);
      index += 1;
      continue;
    }

    if (token === "--neighborhood-delta") {
      parsed.neighborhoodDelta = parsePositiveInteger(next, parsed.neighborhoodDelta);
      index += 1;
      continue;
    }

    if (token === "--top") {
      parsed.topCount = parsePositiveInteger(next, parsed.topCount);
      index += 1;
    }
  }

  return parsed;
}

function parsePositiveInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildSensitivityConfigs(baseConfig: GameConfig, delta: number): Array<{ label: string; config: GameConfig }> {
  return SLIDER_KEYS.flatMap((key) => {
    const baseValue = baseConfig.colorConstraints[key];

    return [
      {
        label: `${getSliderLabel(key)} -${delta}`,
        config: withConstraint(baseConfig, key, baseValue - delta)
      },
      {
        label: `${getSliderLabel(key)} +${delta}`,
        config: withConstraint(baseConfig, key, baseValue + delta)
      }
    ];
  });
}

function buildNeighborhoodStats(baseConfig: GameConfig, args: SweepArgs): NeighborhoodCandidate[] {
  const combinations = buildNeighborhoodConstraints(baseConfig.colorConstraints, args.neighborhoodDelta);
  const baseline = evaluateConfig("baseline-neighborhood", baseConfig, args.neighborhoodSampleCount);

  return combinations.map((constraints) => {
    const label = compactConstraintLabel(constraints, baseConfig.colorConstraints);
    const stats = evaluateConfig(
      label,
      normalizeConfig({
        ...baseConfig,
        colorConstraints: constraints
      }),
      args.neighborhoodSampleCount
    );

    return {
      ...stats,
      qualityDeltaVsBaseline: stats.meanScore - baseline.meanScore,
      varietyDeltaVsBaseline: stats.boardDispersion - baseline.boardDispersion
    };
  });
}

function validateLeaders(
  baseConfig: GameConfig,
  qualityLeaders: NeighborhoodCandidate[],
  varietyLeaders: NeighborhoodCandidate[],
  sampleCount: number
): ConfigStats[] {
  const seen = new Set<string>();
  const candidates = [...qualityLeaders.slice(0, 3), ...varietyLeaders.slice(0, 3)];

  return candidates
    .filter((candidate) => {
      const key = JSON.stringify(candidate.constraints);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .map((candidate) =>
      evaluateConfig(
        candidate.label,
        normalizeConfig({
          ...baseConfig,
          colorConstraints: candidate.constraints
        }),
        sampleCount
      )
    )
    .sort((left, right) => {
      if (right.meanScore !== left.meanScore) {
        return right.meanScore - left.meanScore;
      }

      if (right.promisingOrBetterRate !== left.promisingOrBetterRate) {
        return right.promisingOrBetterRate - left.promisingOrBetterRate;
      }

      return right.boardDispersion - left.boardDispersion;
    });
}

function buildNeighborhoodConstraints(
  baseConstraints: TrajectoryColorConfig,
  delta: number
): TrajectoryColorConfig[] {
  const valueSets = SLIDER_KEYS.map((key) => {
    const baseValue = baseConstraints[key];
    const values = [baseValue - delta, baseValue, baseValue + delta]
      .map((value) => clamp(value, 0, 100))
      .filter((value, index, allValues) => allValues.indexOf(value) === index);

    return { key, values };
  });
  const combinations: TrajectoryColorConfig[] = [];

  function visit(index: number, current: TrajectoryColorConfig) {
    if (index >= valueSets.length) {
      combinations.push(current);
      return;
    }

    const { key, values } = valueSets[index];

    values.forEach((value) => {
      visit(index + 1, {
        ...current,
        [key]: value
      });
    });
  }

  visit(0, { ...baseConstraints });

  return combinations;
}

function evaluateConfig(label: string, config: GameConfig, sampleCount: number): ConfigStats {
  const samples = Array.from({ length: sampleCount }, () => buildBoardSample(config));
  const scores = samples.map((sample) => sample.metrics.readability.score);
  const goodRate = rate(
    samples,
    (sample) => sample.metrics.readability.label === "good"
  );
  const promisingOrBetterRate = rate(
    samples,
    (sample) => sample.metrics.readability.label === "good" || sample.metrics.readability.label === "promising"
  );
  const muddyOrHarshRate = rate(
    samples,
    (sample) => sample.metrics.readability.label === "muddy" || sample.metrics.readability.label === "harsh"
  );

  return {
    label,
    constraints: config.colorConstraints,
    sampleCount,
    meanScore: average(scores),
    minScore: Math.min(...scores),
    maxScore: Math.max(...scores),
    goodRate,
    promisingOrBetterRate,
    muddyOrHarshRate,
    meanMedianNeighborDistance: average(samples.map((sample) => sample.metrics.allNeighborDistances.median)),
    meanNeighborVariability: average(samples.map((sample) => sample.metrics.neighborDistanceVariability)),
    meanCenterDrop: average(samples.map((sample) => sample.metrics.centerChroma.normalizedDrop)),
    meanEdgeClarity: average(samples.map((sample) => sample.metrics.edgeMidpointClarity)),
    meanAxisBalance: average(samples.map((sample) => sample.metrics.axisStrengthBalance)),
    scoreStandardDeviation: standardDeviation(scores),
    boardDispersion: meanPairwiseDispersion(samples.map((sample) => sample.flattenedBoard)),
    cornerDispersion: meanPairwiseDispersion(samples.map((sample) => sample.flattenedCorners))
  };
}

function buildBoardSample(config: GameConfig): BoardSample {
  const board = generateTrajectoryBoard(config);
  const flattenedBoard = flattenTiles(board.tiles);
  const flattenedCorners = flattenTiles(
    board.tiles.filter((tile) => {
      const isTop = tile.solvedIndex < config.width;
      const isBottom = tile.solvedIndex >= config.width * (config.height - 1);
      const column = tile.solvedIndex % config.width;
      const isLeft = column === 0;
      const isRight = column === config.width - 1;

      return (isTop || isBottom) && (isLeft || isRight);
    })
  );

  return {
    metrics: board.metrics,
    flattenedBoard,
    flattenedCorners
  };
}

function flattenTiles(tiles: Tile[]): number[] {
  return [...tiles]
    .sort((left, right) => left.solvedIndex - right.solvedIndex)
    .flatMap((tile) => {
      const color = cssRgbToOklab(tile.color);
      return [color.l, color.a, color.b];
    });
}

function meanPairwiseDispersion(vectors: number[][]): number {
  if (vectors.length < 2) {
    return 0;
  }

  let totalDistance = 0;
  let pairCount = 0;

  for (let left = 0; left < vectors.length; left += 1) {
    for (let right = left + 1; right < vectors.length; right += 1) {
      totalDistance += rootMeanSquareDistance(vectors[left], vectors[right]);
      pairCount += 1;
    }
  }

  return pairCount === 0 ? 0 : totalDistance / pairCount;
}

function rootMeanSquareDistance(left: number[], right: number[]): number {
  const valueCount = Math.min(left.length, right.length);

  if (valueCount === 0) {
    return 0;
  }

  let sum = 0;

  for (let index = 0; index < valueCount; index += 1) {
    const delta = left[index] - right[index];
    sum += delta * delta;
  }

  return Math.sqrt(sum / (valueCount / 3));
}

function rankNeighborhoodByQuality(candidates: NeighborhoodCandidate[], topCount: number): NeighborhoodCandidate[] {
  return [...candidates]
    .sort((left, right) => {
      if (right.meanScore !== left.meanScore) {
        return right.meanScore - left.meanScore;
      }

      if (right.promisingOrBetterRate !== left.promisingOrBetterRate) {
        return right.promisingOrBetterRate - left.promisingOrBetterRate;
      }

      return right.boardDispersion - left.boardDispersion;
    })
    .slice(0, topCount);
}

function rankNeighborhoodByVariety(
  candidates: NeighborhoodCandidate[],
  baseline: ConfigStats,
  topCount: number
): NeighborhoodCandidate[] {
  return [...candidates]
    .filter(
      (candidate) =>
        candidate.meanScore >= baseline.meanScore - 1.5 &&
        candidate.promisingOrBetterRate >= baseline.promisingOrBetterRate - 0.05
    )
    .sort((left, right) => {
      if (right.boardDispersion !== left.boardDispersion) {
        return right.boardDispersion - left.boardDispersion;
      }

      if (right.cornerDispersion !== left.cornerDispersion) {
        return right.cornerDispersion - left.cornerDispersion;
      }

      return right.meanScore - left.meanScore;
    })
    .slice(0, topCount);
}

function printHeader(args: SweepArgs, sensitivitySampleCount: number) {
  console.log("Trajectory color sweep");
  console.log(
    `Sensitivity: ${sensitivitySampleCount} boards/config, +/-${args.delta} per slider. Neighborhood: 3^6 lattice with ${args.neighborhoodSampleCount} boards/config and +/-${args.neighborhoodDelta} around baseline.`
  );
  console.log("");
}

function printBaseline(stats: ConfigStats) {
  console.log("Baseline");
  console.log(`  sliders: ${formatConstraintValues(stats.constraints)}`);
  console.log(
    `  mean score ${formatNumber(stats.meanScore)} | good ${formatPercent(stats.goodRate)} | promising+ ${formatPercent(stats.promisingOrBetterRate)} | muddy/harsh ${formatPercent(stats.muddyOrHarshRate)}`
  );
  console.log(
    `  variety: board dispersion ${formatNumber(stats.boardDispersion, 3)}, corner dispersion ${formatNumber(stats.cornerDispersion, 3)}, score sd ${formatNumber(stats.scoreStandardDeviation, 2)}`
  );
  console.log(
    `  board shape: median step ${formatNumber(stats.meanMedianNeighborDistance, 3)}, step variability ${formatNumber(stats.meanNeighborVariability, 3)}, center drop ${formatNumber(stats.meanCenterDrop, 3)}, edge clarity ${formatNumber(stats.meanEdgeClarity, 3)}, axis balance ${formatNumber(stats.meanAxisBalance, 3)}`
  );
  console.log("");
}

function printSensitivityTable(stats: ConfigStats[], baseline: ConfigStats) {
  console.log("Single-Slider Sensitivity");
  console.log(
    "  label                               mean   dScore  prom+   dVar    muddy/harsh  boardDisp  centerDrop  edgeClarity"
  );

  stats
    .sort((left, right) => right.meanScore - left.meanScore)
    .forEach((entry) => {
      console.log(
        [
          padRight(entry.label, 34),
          padLeft(formatNumber(entry.meanScore), 6),
          padLeft(formatSigned(entry.meanScore - baseline.meanScore), 7),
          padLeft(formatPercent(entry.promisingOrBetterRate), 7),
          padLeft(formatSigned(entry.boardDispersion - baseline.boardDispersion, 3), 7),
          padLeft(formatPercent(entry.muddyOrHarshRate), 12),
          padLeft(formatNumber(entry.boardDispersion, 3), 10),
          padLeft(formatNumber(entry.meanCenterDrop, 3), 11),
          padLeft(formatNumber(entry.meanEdgeClarity, 3), 12)
        ].join(" ")
      );
    });

  console.log("");
}

function printNeighborhoodTable(title: string, stats: NeighborhoodCandidate[]) {
  console.log(title);
  console.log("  sliders                             mean   dScore  prom+   dVar    boardDisp  cornerDisp");

  stats.forEach((entry) => {
    console.log(
      [
        padRight(formatConstraintValues(entry.constraints), 34),
        padLeft(formatNumber(entry.meanScore), 6),
        padLeft(formatSigned(entry.qualityDeltaVsBaseline), 7),
        padLeft(formatPercent(entry.promisingOrBetterRate), 7),
        padLeft(formatSigned(entry.varietyDeltaVsBaseline, 3), 7),
        padLeft(formatNumber(entry.boardDispersion, 3), 10),
        padLeft(formatNumber(entry.cornerDispersion, 3), 10)
      ].join(" ")
    );
  });

  console.log("");
}

function printValidatedTable(stats: ConfigStats[], baseline: ConfigStats) {
  console.log("Validated Leaders");
  console.log("  sliders                             mean   dScore  prom+   dVar    muddy/harsh  boardDisp");

  stats.forEach((entry) => {
    console.log(
      [
        padRight(formatConstraintValues(entry.constraints), 34),
        padLeft(formatNumber(entry.meanScore), 6),
        padLeft(formatSigned(entry.meanScore - baseline.meanScore), 7),
        padLeft(formatPercent(entry.promisingOrBetterRate), 7),
        padLeft(formatSigned(entry.boardDispersion - baseline.boardDispersion, 3), 7),
        padLeft(formatPercent(entry.muddyOrHarshRate), 12),
        padLeft(formatNumber(entry.boardDispersion, 3), 10)
      ].join(" ")
    );
  });

  console.log("");
}

function printRecommendation(
  baseline: ConfigStats,
  qualityLeader: ConfigStats | undefined,
  varietyLeader: NeighborhoodCandidate | undefined
) {
  const qualityMessage = qualityLeader
    ? `Best raw quality nearby is ${formatConstraintValues(qualityLeader.constraints)} with ${formatNumber(qualityLeader.meanScore)} mean score and ${formatPercent(qualityLeader.promisingOrBetterRate)} promising-or-better boards.`
    : "No stronger-quality neighborhood config was found.";
  const varietyMessage = varietyLeader
    ? `Best variety-preserving nearby config is ${formatConstraintValues(varietyLeader.constraints)} with board dispersion ${formatNumber(varietyLeader.boardDispersion, 3)} versus baseline ${formatNumber(baseline.boardDispersion, 3)}.`
    : "No nearby config cleared the quality floor while increasing variety.";

  console.log("Takeaways");
  console.log(`  ${qualityMessage}`);
  console.log(`  ${varietyMessage}`);
}

function withConstraint(baseConfig: GameConfig, key: SliderKey, value: number): GameConfig {
  return normalizeConfig({
    ...baseConfig,
    colorConstraints: {
      ...baseConfig.colorConstraints,
      [key]: clamp(value, 0, 100)
    }
  });
}

function getSliderLabel(key: SliderKey): string {
  switch (key) {
    case "targetStepStrength":
      return "step";
    case "axisBalance":
      return "balance";
    case "lightnessRange":
      return "lightness";
    case "chromaRange":
      return "chroma";
    case "centerPreservation":
      return "center";
    case "edgeSmoothnessBias":
      return "edge";
  }
}

function compactConstraintLabel(
  constraints: TrajectoryColorConfig,
  baseline: TrajectoryColorConfig
): string {
  const deltas = SLIDER_KEYS.map((key) => constraints[key] - baseline[key]);

  if (deltas.every((value) => value === 0)) {
    return "baseline";
  }

  return SLIDER_KEYS.map((key) => `${getSliderLabel(key)} ${formatSigned(constraints[key] - baseline[key], 0)}`).join(", ");
}

function formatConstraintValues(constraints: TrajectoryColorConfig): string {
  return SLIDER_KEYS.map((key) => `${getSliderLabel(key)} ${constraints[key]}`).join(", ");
}

function rate<T>(values: T[], predicate: (value: T) => boolean): number {
  if (values.length === 0) {
    return 0;
  }

  return values.filter(predicate).length / values.length;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));

  return Math.sqrt(variance);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatSigned(value: number, digits = 1): string {
  const rounded = Number(value.toFixed(digits));
  return rounded >= 0 ? `+${rounded.toFixed(digits)}` : rounded.toFixed(digits);
}

function formatNumber(value: number, digits = 1): string {
  return value.toFixed(digits);
}

function padLeft(value: string, width: number): string {
  return value.padStart(width, " ");
}

function padRight(value: string, width: number): string {
  return value.padEnd(width, " ");
}

main();
