import {
  analyzeBoardTiles,
  cssRgbToOklab,
  oklabToCss,
  type BoardColorMetrics,
  type OklabColor
} from "./colorAnalysis";

export const MIN_BOARD_SIZE = 3;
export const MAX_BOARD_SIZE = 10;

const TRAJECTORY_CANDIDATE_COUNT = 48;
const BASE_COLOR_ATTEMPTS = 10;
const MIN_REVERSAL_RATE = 0.05;

export type LineLockConfig = {
  count: number;
  density: number;
};

export type CrossLockConfig = {
  density: number;
};

export type TrajectoryColorConfig = {
  targetStepStrength: number;
  axisBalance: number;
  lightnessRange: number;
  chromaRange: number;
  centerPreservation: number;
  edgeSmoothnessBias: number;
};

export type AppearanceConfig = {
  cellSpacing: number;
  cellRounding: number;
  lockRounding: number;
  lockThickness: number;
  aidTimeSeconds: number;
};

export type GameConfig = {
  width: number;
  height: number;
  verticalLines: LineLockConfig;
  horizontalLines: LineLockConfig;
  crossLines: CrossLockConfig;
  colorConstraints: TrajectoryColorConfig;
  appearance: AppearanceConfig;
};

export type CornerColor = {
  solvedIndex: number;
  color: string;
  oklab: OklabColor;
};

export type Tile = {
  id: string;
  solvedIndex: number;
  currentIndex: number;
  locked: boolean;
  color: string;
};

export type AidMove = {
  primaryTileId: string;
  secondaryTileId: string;
  primaryFromIndex: number;
  primaryToIndex: number;
  secondaryFromIndex: number;
  secondaryToIndex: number;
};

export type GameState = {
  tiles: Tile[];
  scrambledTiles: Tile[];
  swapCount: number;
  hintCount: number;
  status: "preview" | "scrambling" | "animating-hint" | "playing" | "solved";
  config: GameConfig;
  difficulty: DifficultyRating;
};

export type GeneratedBoard = {
  tiles: Tile[];
  metrics: BoardColorMetrics;
  debugCornerColors: CornerColor[];
  model: "trajectory";
  difficulty: DifficultyRating;
};

export type PuzzleSetupMode = "difficulty" | "custom";

export type DifficultyTier = "Very easy" | "Easy" | "Medium" | "Hard" | "Expert" | "Master";

export type StructuralDifficultyMetrics = {
  boardArea: number;
  lockedCount: number;
  lockedRatio: number;
  movableCount: number;
  nearestLockDistanceMean: number;
  nearestLockDistanceP90: number;
  largestUnlockedRegionRatio: number;
};

export type DifficultyRating = {
  score: number;
  tier: DifficultyTier;
  metrics: StructuralDifficultyMetrics;
  layoutSignature: string;
};

export type DifficultyCatalogEntry = {
  config: GameConfig;
  rating: DifficultyRating;
  areaBucket: string;
};

type AidCandidate = AidMove & {
  secondaryExact: boolean;
  secondaryDistance: number;
  totalDistance: number;
};

type TrajectoryPoint = OklabColor;

type RenderableCandidate = GeneratedBoard & {
  candidateScore: number;
  passesHardGuards: boolean;
};

type TrajectoryTuning = {
  targetNeighborDistance: number;
  minAxisStep: number;
  minAxisBalance: number;
  maxCenterDrop: number;
  minEdgeMidpointClarity: number;
  maxWorstJumpRatio: number;
  maxEdgeRoughness: number;
  maxAxisDeviation: number;
  maxAxisLightnessDelta: number;
  maxAxisChromaDelta: number;
  baseChromaBias: number;
  maxEase: number;
  maxJitter: number;
};

type StructuralDifficultyBounds = {
  boardArea: { min: number; max: number };
  lockedRatio: { min: number; max: number };
  nearestLockDistanceMean: { min: number; max: number };
  nearestLockDistanceP90: { min: number; max: number };
  largestUnlockedRegionRatio: { min: number; max: number };
};

type StructuralCandidate = {
  config: GameConfig;
  metrics: StructuralDifficultyMetrics;
  layoutSignature: string;
};

export const DEFAULT_COLOR_CONSTRAINTS: TrajectoryColorConfig = {
  targetStepStrength: 62,
  axisBalance: 78,
  lightnessRange: 58,
  chromaRange: 52,
  centerPreservation: 82,
  edgeSmoothnessBias: 76
};

export const DEFAULT_CONFIG: GameConfig = {
  width: 5,
  height: 5,
  verticalLines: {
    count: 2,
    density: 2
  },
  horizontalLines: {
    count: 0,
    density: 1
  },
  crossLines: {
    density: 0
  },
  colorConstraints: DEFAULT_COLOR_CONSTRAINTS,
  appearance: {
    cellSpacing: 0,
    cellRounding: 0,
    lockRounding: 12,
    lockThickness: 5,
    aidTimeSeconds: 1.0
  }
};

const DIFFICULTY_SCORE_WEIGHTS = {
  boardArea: 0.3,
  anchorScarcity: 0.2,
  nearestLockDistanceMean: 0.25,
  nearestLockDistanceP90: 0.15,
  largestUnlockedRegionRatio: 0.1
} as const;

const AREA_BUCKETS = [
  { maxArea: 12, label: "9-12" },
  { maxArea: 20, label: "13-20" },
  { maxArea: 30, label: "21-30" },
  { maxArea: 42, label: "31-42" },
  { maxArea: 56, label: "43-56" },
  { maxArea: 72, label: "57-72" },
  { maxArea: 100, label: "73-100" }
] as const;

export function getCellCount(config: GameConfig): number {
  return config.width * config.height;
}

export function getCornerIndexes(width: number, height: number): number[] {
  const cellCount = width * height;
  return [0, width - 1, cellCount - width, cellCount - 1];
}

export function getValidVerticalLineCounts(width: number): number[] {
  return [0, ...getValidLineCounts(width)];
}

export function getValidHorizontalLineCounts(height: number): number[] {
  return [0, ...getValidLineCounts(height)];
}

function getValidLineCounts(length: number): number[] {
  const counts: number[] = [];

  if (length % 2 === 1) {
    counts.push(1);
  }

  for (let count = 2; count <= length; count += 1) {
    if ((length - 1) % (count - 1) === 0) {
      counts.push(count);
    }
  }

  return counts;
}

export function getValidLineDensities(length: number): number[] {
  const densities: number[] = [];

  for (let density = 1; density <= Math.max(1, length - 1); density += 1) {
    if ((length - 1) % density === 0) {
      densities.push(density);
    }
  }

  return densities;
}

export function getValidCrossDensities(width: number, height: number): number[] {
  const diagonalLength = getDiagonalPath(0, 0, width - 1, height - 1, width).length;
  return [0, ...getValidLineDensities(diagonalLength)];
}

export function normalizeConfig(config: GameConfig): GameConfig {
  const verticalCounts = getValidVerticalLineCounts(config.width);
  const horizontalCounts = getValidHorizontalLineCounts(config.height);
  const verticalDensities = getValidLineDensities(config.height);
  const horizontalDensities = getValidLineDensities(config.width);
  const crossDensities = getValidCrossDensities(config.width, config.height);

  return {
    ...config,
    verticalLines: {
      count: pickNearestValidValue(verticalCounts, config.verticalLines.count),
      density: pickNearestValidValue(verticalDensities, config.verticalLines.density)
    },
    horizontalLines: {
      count: pickNearestValidValue(horizontalCounts, config.horizontalLines.count),
      density: pickNearestValidValue(horizontalDensities, config.horizontalLines.density)
    },
    crossLines: {
      density: pickNearestValidValue(crossDensities, config.crossLines.density)
    },
    colorConstraints: {
      targetStepStrength: clamp(config.colorConstraints.targetStepStrength, 0, 100),
      axisBalance: clamp(config.colorConstraints.axisBalance, 0, 100),
      lightnessRange: clamp(config.colorConstraints.lightnessRange, 0, 100),
      chromaRange: clamp(config.colorConstraints.chromaRange, 0, 100),
      centerPreservation: clamp(config.colorConstraints.centerPreservation, 0, 100),
      edgeSmoothnessBias: clamp(config.colorConstraints.edgeSmoothnessBias, 0, 100)
    },
    appearance: {
      cellSpacing: clamp(config.appearance.cellSpacing, 0, 16),
      cellRounding: clamp(config.appearance.cellRounding, 0, 16),
      lockRounding: clamp(config.appearance.lockRounding, 0, 16),
      lockThickness: clamp(config.appearance.lockThickness, 1, 8),
      aidTimeSeconds: roundToStep(clamp(config.appearance.aidTimeSeconds, 0, 3), 0.1)
    }
  };
}

export function getDifficultyTier(score: number): DifficultyTier {
  if (score < 10) {
    return "Very easy";
  }

  if (score < 20) {
    return "Easy";
  }

  if (score < 40) {
    return "Medium";
  }

  if (score < 60) {
    return "Hard";
  }

  if (score < 80) {
    return "Expert";
  }

  return "Master";
}

export function analyzeStructuralDifficulty(config: GameConfig): DifficultyRating {
  const normalizedConfig = normalizeConfig(config);
  const metrics = buildStructuralDifficultyMetrics(normalizedConfig);
  const layoutSignature = getLayoutSignature(normalizedConfig);

  return scoreStructuralDifficulty(metrics, getStructuralDifficultyBounds(), layoutSignature);
}

export function buildDifficultyCatalog(): DifficultyCatalogEntry[] {
  return DIFFICULTY_CATALOG;
}

export function pickConfigForDifficulty(targetScore: number, recentSignatures: string[] = []): DifficultyCatalogEntry {
  const normalizedTargetScore = clamp(targetScore, 0, 100);
  const recentSignatureSet = new Set(recentSignatures);
  const preferredEntries = DIFFICULTY_CATALOG.filter((entry) => !recentSignatureSet.has(entry.rating.layoutSignature));
  const candidates = preferredEntries.length > 0 ? preferredEntries : DIFFICULTY_CATALOG;

  return [...candidates].sort((left, right) => {
    const scoreDistance = Math.abs(left.rating.score - normalizedTargetScore) - Math.abs(right.rating.score - normalizedTargetScore);

    if (scoreDistance !== 0) {
      return scoreDistance;
    }

    if (left.rating.metrics.boardArea !== right.rating.metrics.boardArea) {
      return left.rating.metrics.boardArea - right.rating.metrics.boardArea;
    }

    return left.rating.layoutSignature.localeCompare(right.rating.layoutSignature);
  })[0];
}

function buildStructuralDifficultyMetrics(config: GameConfig): StructuralDifficultyMetrics {
  const lockedIndexes = getLockedIndexes(config);
  const lockedSet = new Set(lockedIndexes);
  const movableIndexes = Array.from({ length: config.width * config.height }, (_, index) => index).filter((index) => !lockedSet.has(index));
  const nearestLockDistances = movableIndexes.map((index) => getNearestLockedDistance(index, lockedIndexes, config.width));

  return {
    boardArea: config.width * config.height,
    lockedCount: lockedIndexes.length,
    lockedRatio: lockedIndexes.length / Math.max(1, config.width * config.height),
    movableCount: movableIndexes.length,
    nearestLockDistanceMean: getMean(nearestLockDistances),
    nearestLockDistanceP90: getPercentileFromValues(nearestLockDistances, 0.9),
    largestUnlockedRegionRatio: getLargestUnlockedRegionRatio(movableIndexes, config)
  };
}

function getNearestLockedDistance(index: number, lockedIndexes: number[], width: number): number {
  const row = Math.floor(index / width);
  const column = index % width;

  return lockedIndexes.reduce((bestDistance, lockedIndex) => {
    const lockedRow = Math.floor(lockedIndex / width);
    const lockedColumn = lockedIndex % width;
    const distance = Math.abs(row - lockedRow) + Math.abs(column - lockedColumn);

    return Math.min(bestDistance, distance);
  }, Infinity);
}

function getLargestUnlockedRegionRatio(movableIndexes: number[], config: GameConfig): number {
  if (movableIndexes.length === 0) {
    return 0;
  }

  const movableSet = new Set(movableIndexes);
  const visited = new Set<number>();
  let largestRegionSize = 0;

  for (const startIndex of movableIndexes) {
    if (visited.has(startIndex)) {
      continue;
    }

    const queue = [startIndex];
    let regionSize = 0;
    visited.add(startIndex);

    while (queue.length > 0) {
      const currentIndex = queue.shift();

      if (currentIndex === undefined) {
        continue;
      }

      regionSize += 1;

      getNeighborIndexes(currentIndex, config.width, config.height).forEach((neighborIndex) => {
        if (!movableSet.has(neighborIndex) || visited.has(neighborIndex)) {
          return;
        }

        visited.add(neighborIndex);
        queue.push(neighborIndex);
      });
    }

    largestRegionSize = Math.max(largestRegionSize, regionSize);
  }

  return largestRegionSize / Math.max(1, config.width * config.height);
}

function getNeighborIndexes(index: number, width: number, height: number): number[] {
  const row = Math.floor(index / width);
  const column = index % width;
  const neighbors: number[] = [];

  if (row > 0) {
    neighbors.push(index - width);
  }

  if (row < height - 1) {
    neighbors.push(index + width);
  }

  if (column > 0) {
    neighbors.push(index - 1);
  }

  if (column < width - 1) {
    neighbors.push(index + 1);
  }

  return neighbors;
}

function getLayoutSignature(config: GameConfig): string {
  return `${config.width}x${config.height}:${getLockedIndexes(config).join(",")}`;
}

function scoreStructuralDifficulty(
  metrics: StructuralDifficultyMetrics,
  bounds: StructuralDifficultyBounds,
  layoutSignature: string
): DifficultyRating {
  const boardAreaScore = normalizeMetric(metrics.boardArea, bounds.boardArea);
  const anchorScarcityScore = 1 - normalizeMetric(metrics.lockedRatio, bounds.lockedRatio);
  const nearestLockDistanceMeanScore = normalizeMetric(metrics.nearestLockDistanceMean, bounds.nearestLockDistanceMean);
  const nearestLockDistanceP90Score = normalizeMetric(metrics.nearestLockDistanceP90, bounds.nearestLockDistanceP90);
  const largestUnlockedRegionRatioScore = normalizeMetric(
    metrics.largestUnlockedRegionRatio,
    bounds.largestUnlockedRegionRatio
  );
  const score =
    (
      boardAreaScore * DIFFICULTY_SCORE_WEIGHTS.boardArea +
      anchorScarcityScore * DIFFICULTY_SCORE_WEIGHTS.anchorScarcity +
      nearestLockDistanceMeanScore * DIFFICULTY_SCORE_WEIGHTS.nearestLockDistanceMean +
      nearestLockDistanceP90Score * DIFFICULTY_SCORE_WEIGHTS.nearestLockDistanceP90 +
      largestUnlockedRegionRatioScore * DIFFICULTY_SCORE_WEIGHTS.largestUnlockedRegionRatio
    ) * 100;
  const roundedScore = Math.round(score);

  return {
    score: roundedScore,
    tier: getDifficultyTier(roundedScore),
    metrics,
    layoutSignature
  };
}

function normalizeMetric(value: number, bounds: { min: number; max: number }): number {
  if (bounds.max <= bounds.min) {
    return 0;
  }

  return clamp((value - bounds.min) / (bounds.max - bounds.min), 0, 1);
}

function getMean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getPercentileFromValues(values: number[], percentile: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * percentile;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  const remainder = position - lowerIndex;

  return sorted[lowerIndex] + (sorted[upperIndex] - sorted[lowerIndex]) * remainder;
}

function getStructuralDifficultyBounds(): StructuralDifficultyBounds {
  return STRUCTURAL_DIFFICULTY_BOUNDS;
}

function roundToStep(value: number, step: number): number {
  return Number((Math.round(value / step) * step).toFixed(1));
}

function pickNearestValidValue(values: number[], value: number): number {
  if (values.includes(value)) {
    return value;
  }

  return values.reduce((best, candidate) =>
    Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best
  );
}

export function getLockedIndexes(config: GameConfig): number[] {
  const normalizedConfig = normalizeConfig(config);
  const indexes = new Set<number>();

  getCornerIndexes(normalizedConfig.width, normalizedConfig.height).forEach((index) => indexes.add(index));

  if (normalizedConfig.verticalLines.count > 0) {
    const columns = getLinePositions(normalizedConfig.width, normalizedConfig.verticalLines.count);
    const rows = getDensityPositions(normalizedConfig.height, normalizedConfig.verticalLines.density);

    for (const column of columns) {
      for (const row of rows) {
        indexes.add(row * normalizedConfig.width + column);
      }
    }
  }

  if (normalizedConfig.horizontalLines.count > 0) {
    const rows = getLinePositions(normalizedConfig.height, normalizedConfig.horizontalLines.count);
    const columns = getDensityPositions(normalizedConfig.width, normalizedConfig.horizontalLines.density);

    for (const row of rows) {
      for (const column of columns) {
        indexes.add(row * normalizedConfig.width + column);
      }
    }
  }

  if (normalizedConfig.crossLines.density > 0) {
    const primary = getDiagonalPath(0, 0, normalizedConfig.width - 1, normalizedConfig.height - 1, normalizedConfig.width);
    const secondary = getDiagonalPath(
      normalizedConfig.width - 1,
      0,
      0,
      normalizedConfig.height - 1,
      normalizedConfig.width
    );
    const positions = getDensityPositions(primary.length, normalizedConfig.crossLines.density);

    positions.forEach((position) => {
      indexes.add(primary[position]);
      indexes.add(secondary[position]);
    });
  }

  return [...indexes].sort((left, right) => left - right);
}

function applyStructureToConfig(baseConfig: GameConfig, structuralConfig: GameConfig): GameConfig {
  return normalizeConfig({
    ...baseConfig,
    width: structuralConfig.width,
    height: structuralConfig.height,
    verticalLines: structuralConfig.verticalLines,
    horizontalLines: structuralConfig.horizontalLines,
    crossLines: structuralConfig.crossLines
  });
}

function getLinePositions(length: number, count: number): number[] {
  if (count === 1) {
    return [Math.floor(length / 2)];
  }

  const step = (length - 1) / (count - 1);
  return Array.from({ length: count }, (_, index) => Math.round(index * step));
}

function getDensityPositions(length: number, density: number): number[] {
  const positions: number[] = [];

  for (let position = 0; position < length; position += density) {
    positions.push(position);
  }

  return positions;
}

function getDiagonalPath(
  startColumn: number,
  startRow: number,
  endColumn: number,
  endRow: number,
  width: number
): number[] {
  const path: number[] = [];
  let column = startColumn;
  let row = startRow;
  const deltaColumn = Math.abs(endColumn - startColumn);
  const stepColumn = startColumn < endColumn ? 1 : -1;
  const deltaRow = -Math.abs(endRow - startRow);
  const stepRow = startRow < endRow ? 1 : -1;
  let error = deltaColumn + deltaRow;

  while (true) {
    path.push(row * width + column);

    if (column === endColumn && row === endRow) {
      break;
    }

    const doubledError = 2 * error;

    if (doubledError >= deltaRow) {
      error += deltaRow;
      column += stepColumn;
    }

    if (doubledError <= deltaColumn) {
      error += deltaColumn;
      row += stepRow;
    }
  }

  return path;
}

export function createNewGame(config: GameConfig): GameState {
  const normalizedConfig = normalizeConfig(config);
  const generatedBoard = generateTrajectoryBoard(normalizedConfig);
  const lockedIndexes = getLockedIndexes(normalizedConfig);
  const scrambledTiles = scrambleMovableTiles(generatedBoard.tiles, lockedIndexes);

  return {
    tiles: generatedBoard.tiles,
    scrambledTiles,
    swapCount: 0,
    hintCount: 0,
    status: "preview",
    config: normalizedConfig,
    difficulty: generatedBoard.difficulty
  };
}

export function createNewGameForDifficulty(
  targetScore: number,
  baseConfig: GameConfig = DEFAULT_CONFIG,
  recentSignatures: string[] = []
): GameState {
  const chosenEntry = pickConfigForDifficulty(targetScore, recentSignatures);
  const config = applyStructureToConfig(baseConfig, chosenEntry.config);

  return createNewGame(config);
}

export function generateTrajectoryBoard(config: GameConfig): GeneratedBoard {
  const normalizedConfig = normalizeConfig(config);
  let bestPassingCandidate: RenderableCandidate | null = null;
  let bestRenderableCandidate: RenderableCandidate | null = null;

  for (let attempt = 0; attempt < TRAJECTORY_CANDIDATE_COUNT; attempt += 1) {
    const candidate = buildRenderableTrajectoryCandidate(normalizedConfig, attempt);

    if (!candidate) {
      continue;
    }

    if (!bestRenderableCandidate || candidate.candidateScore > bestRenderableCandidate.candidateScore) {
      bestRenderableCandidate = candidate;
    }

    if (
      candidate.passesHardGuards &&
      (!bestPassingCandidate || candidate.candidateScore > bestPassingCandidate.candidateScore)
    ) {
      bestPassingCandidate = candidate;
    }
  }

  const chosenCandidate = bestPassingCandidate ?? bestRenderableCandidate ?? buildFallbackTrajectoryBoard(normalizedConfig);

  return {
    tiles: chosenCandidate.tiles,
    metrics: chosenCandidate.metrics,
    debugCornerColors: chosenCandidate.debugCornerColors,
    model: "trajectory",
    difficulty: analyzeStructuralDifficulty(normalizedConfig)
  };
}

function buildRenderableTrajectoryCandidate(config: GameConfig, attempt: number): RenderableCandidate | null {
  const tuning = getTrajectoryTuning(config);
  const xMeanStep = getAxisMeanStep(tuning, config.colorConstraints.axisBalance / 100, attempt % 2 === 0);
  const yMeanStep = getAxisMeanStep(tuning, config.colorConstraints.axisBalance / 100, attempt % 2 === 1);
  const xDelta = buildAxisDelta(config.width - 1, xMeanStep, tuning, attempt);
  const yDelta = buildAxisDelta(config.height - 1, yMeanStep, tuning, attempt + 11, xDelta.angle);
  const xTrajectory = buildTrajectory(config.width, xDelta, tuning);
  const yTrajectory = buildTrajectory(config.height, yDelta, tuning);
  const baseColor = pickBaseColor(xTrajectory, yTrajectory, tuning);

  if (!baseColor) {
    return null;
  }

  const colors = composeBoardColors(baseColor, xTrajectory, yTrajectory, config.width, config.height);

  if (!colors) {
    return null;
  }

  const tiles = buildTilesFromColors(colors, config);
  const metrics = analyzeBoardTiles(tiles, config.width, config.height);
  const candidateScore = scoreTrajectoryCandidate(metrics, tuning);

  return {
    tiles,
    metrics,
    debugCornerColors: buildDebugCornerColors(tiles, config.width, config.height),
    model: "trajectory",
    difficulty: analyzeStructuralDifficulty(config),
    candidateScore,
    passesHardGuards: candidatePassesHardGuards(metrics, tuning)
  };
}

function buildFallbackTrajectoryBoard(config: GameConfig): RenderableCandidate {
  const tuning = getTrajectoryTuning(config);
  const xTrajectory = buildTrajectory(
    config.width,
    {
      l: -Math.min(0.14, tuning.maxAxisLightnessDelta * 0.65),
      a: -Math.min(0.06, tuning.maxAxisChromaDelta * 0.55),
      b: 0.07
    },
    tuning
  );
  const yTrajectory = buildTrajectory(
    config.height,
    {
      l: -Math.min(0.14, tuning.maxAxisLightnessDelta * 0.65),
      a: 0.07,
      b: -Math.min(0.06, tuning.maxAxisChromaDelta * 0.55)
    },
    tuning
  );
  const baseColor = pickBaseColor(xTrajectory, yTrajectory, tuning) ?? { l: 0.78, a: -0.01, b: 0.04 };
  const colors = composeBoardColors(baseColor, xTrajectory, yTrajectory, config.width, config.height);

  if (!colors) {
    throw new Error("Unable to build fallback trajectory board.");
  }

  const tiles = buildTilesFromColors(colors, config);
  const metrics = analyzeBoardTiles(tiles, config.width, config.height);

  return {
    tiles,
    metrics,
    debugCornerColors: buildDebugCornerColors(tiles, config.width, config.height),
    model: "trajectory",
    difficulty: analyzeStructuralDifficulty(config),
    candidateScore: scoreTrajectoryCandidate(metrics, tuning),
    passesHardGuards: candidatePassesHardGuards(metrics, tuning)
  };
}

function getTrajectoryTuning(config: GameConfig): TrajectoryTuning {
  const largestIntervalCount = Math.max(config.width - 1, config.height - 1);
  const scaleProgress = clamp((largestIntervalCount - 2) / 7, 0, 1);
  const strength = config.colorConstraints.targetStepStrength / 100;
  const balance = config.colorConstraints.axisBalance / 100;
  const lightnessRange = config.colorConstraints.lightnessRange / 100;
  const chromaRange = config.colorConstraints.chromaRange / 100;
  const centerPreservation = config.colorConstraints.centerPreservation / 100;
  const edgeSmoothness = config.colorConstraints.edgeSmoothnessBias / 100;
  const baseTargetStep = lerp(0.074, 0.041, scaleProgress);
  const targetNeighborDistance = baseTargetStep * lerp(0.82, 1.22, strength);

  return {
    targetNeighborDistance,
    minAxisStep: clamp(targetNeighborDistance * 0.52, 0.015, 0.03),
    minAxisBalance: lerp(0.28, 0.9, balance),
    maxCenterDrop: lerp(0.35, 0.12, centerPreservation),
    minEdgeMidpointClarity: lerp(0.56, 0.86, (centerPreservation + edgeSmoothness) / 2),
    maxWorstJumpRatio: lerp(2.65, 1.75, edgeSmoothness),
    maxEdgeRoughness: lerp(0.028, 0.011, edgeSmoothness),
    maxAxisDeviation: targetNeighborDistance * lerp(0.36, 0.14, edgeSmoothness),
    maxAxisLightnessDelta: lerp(0.12, 0.3, lightnessRange),
    maxAxisChromaDelta: lerp(0.045, 0.18, chromaRange),
    baseChromaBias: lerp(0.015, 0.07, chromaRange),
    maxEase: lerp(0.22, 0.06, edgeSmoothness),
    maxJitter: lerp(0.08, 0.018, edgeSmoothness)
  };
}

function getAxisMeanStep(tuning: TrajectoryTuning, balance: number, preferStrongerAxis: boolean): number {
  const ratioFloor = lerp(tuning.minAxisBalance, 1, Math.random());
  const strongerStep = tuning.targetNeighborDistance * lerp(0.92, 1.1, Math.random());
  const weakerStep = strongerStep * ratioFloor;

  return preferStrongerAxis ? strongerStep : weakerStep;
}

function buildAxisDelta(
  intervalCount: number,
  meanStep: number,
  tuning: TrajectoryTuning,
  seed: number,
  referenceAngle?: number
): { l: number; a: number; b: number; angle: number } {
  if (intervalCount <= 0) {
    return { l: 0, a: 0, b: 0, angle: 0 };
  }

  const totalDistance = meanStep * intervalCount;
  const lightnessMagnitude = Math.min(
    totalDistance * lerp(0.3, 0.68, Math.random()),
    tuning.maxAxisLightnessDelta
  );
  const lightness = (seed % 3 === 0 ? 1 : -1) * lightnessMagnitude;
  const remainingDistance = Math.sqrt(Math.max(totalDistance ** 2 - lightnessMagnitude ** 2, 0));
  const chromaMagnitude = Math.min(remainingDistance, tuning.maxAxisChromaDelta);
  const baseAngle = referenceAngle === undefined
    ? Math.random() * Math.PI * 2
    : referenceAngle + (Math.random() < 0.5 ? -1 : 1) * lerp(Math.PI / 6, Math.PI * 0.62, Math.random());

  return {
    l: lightness,
    a: Math.cos(baseAngle) * chromaMagnitude,
    b: Math.sin(baseAngle) * chromaMagnitude,
    angle: baseAngle
  };
}

function buildTrajectory(
  length: number,
  totalDelta: { l: number; a: number; b: number },
  tuning: TrajectoryTuning
): TrajectoryPoint[] {
  if (length <= 1) {
    return [{ l: 0, a: 0, b: 0 }];
  }

  const intervalCount = length - 1;
  const ease = randomSignedFloat(0, tuning.maxEase);
  const weights = Array.from({ length: intervalCount }, (_, index) => {
    const progress = intervalCount === 1 ? 0.5 : index / (intervalCount - 1);
    const eased = (progress - 0.5) * 2;
    const jitter = randomSignedFloat(0, tuning.maxJitter);

    return Math.max(0.24, 1 + ease * eased + jitter);
  });
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const trajectory: TrajectoryPoint[] = [{ l: 0, a: 0, b: 0 }];
  let current = { l: 0, a: 0, b: 0 };

  weights.forEach((weight) => {
    const ratio = weight / totalWeight;
    current = {
      l: current.l + totalDelta.l * ratio,
      a: current.a + totalDelta.a * ratio,
      b: current.b + totalDelta.b * ratio
    };
    trajectory.push(current);
  });

  return trajectory;
}

function pickBaseColor(
  xTrajectory: TrajectoryPoint[],
  yTrajectory: TrajectoryPoint[],
  tuning: TrajectoryTuning
): OklabColor | null {
  const offsets = buildOffsets(xTrajectory, yTrajectory);
  const lBounds = getBounds(offsets.map((offset) => offset.l));
  const aBounds = getBounds(offsets.map((offset) => offset.a));
  const bBounds = getBounds(offsets.map((offset) => offset.b));
  const minL = Math.max(0.16 - lBounds.min, 0.16);
  const maxL = Math.min(0.9 - lBounds.max, 0.86);

  if (minL > maxL) {
    return null;
  }

  const centeredA = -(aBounds.min + aBounds.max) / 2;
  const centeredB = -(bBounds.min + bBounds.max) / 2;

  for (let attempt = 0; attempt < BASE_COLOR_ATTEMPTS; attempt += 1) {
    const candidate: OklabColor = {
      l: randomInRangeFloat(minL, maxL),
      a: clamp(centeredA + randomSignedFloat(0, tuning.baseChromaBias), -0.11, 0.11),
      b: clamp(centeredB + randomSignedFloat(0, tuning.baseChromaBias), -0.11, 0.11)
    };

    if (canRenderOffsets(candidate, offsets)) {
      return candidate;
    }
  }

  return null;
}

function buildOffsets(xTrajectory: TrajectoryPoint[], yTrajectory: TrajectoryPoint[]): TrajectoryPoint[] {
  const offsets: TrajectoryPoint[] = [];

  for (const yPoint of yTrajectory) {
    for (const xPoint of xTrajectory) {
      offsets.push({
        l: xPoint.l + yPoint.l,
        a: xPoint.a + yPoint.a,
        b: xPoint.b + yPoint.b
      });
    }
  }

  return offsets;
}

function canRenderOffsets(baseColor: OklabColor, offsets: TrajectoryPoint[]): boolean {
  return offsets.every((offset) => oklabToCss(addOklab(baseColor, offset)) !== null);
}

function composeBoardColors(
  baseColor: OklabColor,
  xTrajectory: TrajectoryPoint[],
  yTrajectory: TrajectoryPoint[],
  width: number,
  height: number
): string[] | null {
  const colors: string[] = [];

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const color = oklabToCss(addOklab(baseColor, addOklab(xTrajectory[column], yTrajectory[row])));

      if (!color) {
        return null;
      }

      colors.push(color);
    }
  }

  return colors;
}

function candidatePassesHardGuards(metrics: BoardColorMetrics, tuning: TrajectoryTuning): boolean {
  const medianDistance = Math.max(metrics.allNeighborDistances.median, 0.0001);
  const worstJumpRatio = metrics.worstLocalJump / medianDistance;

  return (
    metrics.horizontalNeighborDistances.p10 >= tuning.minAxisStep &&
    metrics.verticalNeighborDistances.p10 >= tuning.minAxisStep &&
    metrics.axisStrengthBalance >= tuning.minAxisBalance &&
    metrics.edgeMidpointClarity >= tuning.minEdgeMidpointClarity &&
    metrics.centerChroma.normalizedDrop <= tuning.maxCenterDrop &&
    metrics.edgeRampSmoothness.mean <= tuning.maxEdgeRoughness &&
    metrics.rowLightnessMonotonicity.reversalRate <= MIN_REVERSAL_RATE &&
    metrics.columnLightnessMonotonicity.reversalRate <= MIN_REVERSAL_RATE &&
    worstJumpRatio <= tuning.maxWorstJumpRatio &&
    Math.abs(metrics.horizontalNeighborDistances.mean - tuning.targetNeighborDistance) <= tuning.maxAxisDeviation &&
    Math.abs(metrics.verticalNeighborDistances.mean - tuning.targetNeighborDistance) <= tuning.maxAxisDeviation
  );
}

function scoreTrajectoryCandidate(metrics: BoardColorMetrics, tuning: TrajectoryTuning): number {
  const axisMeanGap = Math.abs(metrics.horizontalNeighborDistances.mean - metrics.verticalNeighborDistances.mean);
  const targetGap =
    Math.abs(metrics.horizontalNeighborDistances.mean - tuning.targetNeighborDistance) +
    Math.abs(metrics.verticalNeighborDistances.mean - tuning.targetNeighborDistance);
  const medianGap = Math.abs(metrics.allNeighborDistances.median - tuning.targetNeighborDistance);

  return (
    metrics.readability.score * 1.45 -
    targetGap * 420 -
    medianGap * 260 -
    axisMeanGap * 220 +
    metrics.edgeMidpointClarity * 22 +
    metrics.axisStrengthBalance * 18 -
    metrics.centerChroma.normalizedDrop * 54 -
    metrics.edgeRampSmoothness.mean * 880 -
    ((metrics.rowLightnessMonotonicity.reversalRate + metrics.columnLightnessMonotonicity.reversalRate) / 2) * 280
  );
}

function buildDebugCornerColors(tiles: Tile[], width: number, height: number): CornerColor[] {
  return getCornerIndexes(width, height).map((index) => {
    const tile = tiles[index];

    return {
      solvedIndex: tile.solvedIndex,
      color: tile.color,
      oklab: cssRgbToOklab(tile.color)
    };
  });
}

export function buildTilesFromColors(colors: string[], config: GameConfig): Tile[] {
  const normalizedConfig = normalizeConfig(config);
  const cellCount = getCellCount(normalizedConfig);

  if (colors.length !== cellCount) {
    throw new Error(`Expected ${cellCount} solved colors, received ${colors.length}.`);
  }

  const lockedIndexes = new Set(getLockedIndexes(normalizedConfig));

  return colors.map((color, solvedIndex) => ({
    id: `tile-${solvedIndex}`,
    solvedIndex,
    currentIndex: solvedIndex,
    locked: lockedIndexes.has(solvedIndex),
    color
  }));
}

export function scrambleMovableTiles(solvedTiles: Tile[], lockedIndexes?: number[]): Tile[] {
  const lockedIndexSet = new Set(
    lockedIndexes ?? solvedTiles.filter((tile) => tile.locked).map((tile) => tile.solvedIndex)
  );
  const movableIndexes = solvedTiles
    .map((tile) => tile.solvedIndex)
    .filter((index) => !lockedIndexSet.has(index));

  if (movableIndexes.length < 2) {
    throw new Error("Puzzle requires at least two movable tiles.");
  }

  const derangedIndexes = createDerangement(movableIndexes);
  const tileBySolvedIndex = new Map(solvedTiles.map((tile) => [tile.solvedIndex, tile]));

  return movableIndexes
    .map((index, position) => {
      const tile = tileBySolvedIndex.get(index);
      const nextIndex = derangedIndexes[position];

      if (!tile) {
        throw new Error(`Missing tile for solved index ${index}`);
      }

      return {
        ...tile,
        currentIndex: nextIndex
      };
    })
    .concat(
      solvedTiles
        .filter((tile) => tile.locked)
        .map((tile) => ({ ...tile }))
    )
    .sort((left, right) => left.currentIndex - right.currentIndex);
}

function createDerangement(indexes: number[]): number[] {
  let shuffled = [...indexes];

  do {
    shuffled = shuffle([...indexes]);
  } while (shuffled.some((value, position) => value === indexes[position]));

  return shuffled;
}

function shuffle<T>(values: T[]): T[] {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[randomIndex]] = [values[randomIndex], values[index]];
  }

  return values;
}

export function swapTiles(tiles: Tile[], fromIndex: number, toIndex: number): Tile[] {
  if (fromIndex === toIndex) {
    return tiles;
  }

  const fromTile = tiles.find((tile) => tile.currentIndex === fromIndex);
  const toTile = tiles.find((tile) => tile.currentIndex === toIndex);

  if (!fromTile || !toTile || fromTile.locked || toTile.locked) {
    return tiles;
  }

  return tiles
    .map((tile) => {
      if (tile.id === fromTile.id) {
        return { ...tile, currentIndex: toIndex };
      }

      if (tile.id === toTile.id) {
        return { ...tile, currentIndex: fromIndex };
      }

      return tile;
    })
    .sort((left, right) => left.currentIndex - right.currentIndex);
}

export function findBestAidMove(tiles: Tile[], config: GameConfig): AidMove | null {
  const movableTiles = tiles.filter((tile) => !tile.locked);

  if (movableTiles.length < 2) {
    return null;
  }

  let bestCandidate: AidCandidate | null = null;

  for (const primaryTile of movableTiles) {
    if (primaryTile.currentIndex === primaryTile.solvedIndex) {
      continue;
    }

    const secondaryTile = movableTiles.find((tile) => tile.currentIndex === primaryTile.solvedIndex);

    if (!secondaryTile || secondaryTile.id === primaryTile.id) {
      continue;
    }

    const swapped = swapTiles(tiles, primaryTile.currentIndex, secondaryTile.currentIndex);
    const candidate = buildAidCandidate(swapped, config, primaryTile, secondaryTile);

    bestCandidate = chooseBetterAidCandidate(bestCandidate, candidate);
  }

  return bestCandidate;
}

function buildAidCandidate(
  tiles: Tile[],
  config: GameConfig,
  primaryTile: Tile,
  secondaryTile: Tile
): AidCandidate {
  const nextSecondary = tiles.find((tile) => tile.id === secondaryTile.id);

  if (!nextSecondary) {
    throw new Error("Aid candidate is missing swapped tiles.");
  }

  return {
    primaryTileId: primaryTile.id,
    secondaryTileId: secondaryTile.id,
    primaryFromIndex: primaryTile.currentIndex,
    primaryToIndex: primaryTile.solvedIndex,
    secondaryFromIndex: secondaryTile.currentIndex,
    secondaryToIndex: primaryTile.currentIndex,
    secondaryExact: nextSecondary.currentIndex === nextSecondary.solvedIndex,
    secondaryDistance: getTileDistance(nextSecondary, config.width),
    totalDistance: getTotalDistance(tiles, config)
  };
}

function chooseBetterAidCandidate(current: AidCandidate | null, candidate: AidCandidate): AidCandidate {
  if (!current) {
    return candidate;
  }

  if (candidate.secondaryExact !== current.secondaryExact) {
    return candidate.secondaryExact ? candidate : current;
  }

  if (candidate.secondaryDistance !== current.secondaryDistance) {
    return candidate.secondaryDistance < current.secondaryDistance ? candidate : current;
  }

  if (candidate.totalDistance !== current.totalDistance) {
    return candidate.totalDistance < current.totalDistance ? candidate : current;
  }

  if (candidate.primaryFromIndex !== current.primaryFromIndex) {
    return candidate.primaryFromIndex < current.primaryFromIndex ? candidate : current;
  }

  return candidate.primaryToIndex < current.primaryToIndex ? candidate : current;
}

function getTotalDistance(tiles: Tile[], config: GameConfig): number {
  return tiles.filter((tile) => !tile.locked).reduce((total, tile) => total + getTileDistance(tile, config.width), 0);
}

function getTileDistance(tile: Tile, width: number): number {
  const currentRow = Math.floor(tile.currentIndex / width);
  const currentColumn = tile.currentIndex % width;
  const solvedRow = Math.floor(tile.solvedIndex / width);
  const solvedColumn = tile.solvedIndex % width;

  return Math.abs(currentRow - solvedRow) + Math.abs(currentColumn - solvedColumn);
}

export function isSolved(tiles: Tile[]): boolean {
  return tiles.every((tile) => tile.currentIndex === tile.solvedIndex);
}

function createDifficultyCatalog(): DifficultyCatalogEntry[] {
  const uniqueCandidates = new Map<string, StructuralCandidate>();

  for (let width = MIN_BOARD_SIZE; width <= MAX_BOARD_SIZE; width += 1) {
    const verticalCountOptions = getValidVerticalLineCounts(width);
    const horizontalDensityOptions = getValidLineDensities(width);

    for (let height = MIN_BOARD_SIZE; height <= MAX_BOARD_SIZE; height += 1) {
      if (width > height) {
        continue;
      }

      const verticalDensityOptions = getValidLineDensities(height);
      const horizontalCountOptions = getValidHorizontalLineCounts(height);
      const crossDensityOptions = getValidCrossDensities(width, height);

      for (const verticalCount of verticalCountOptions) {
        for (const verticalDensity of verticalDensityOptions) {
          for (const horizontalCount of horizontalCountOptions) {
            for (const horizontalDensity of horizontalDensityOptions) {
              for (const crossDensity of crossDensityOptions) {
                const config = normalizeConfig({
                  ...DEFAULT_CONFIG,
                  width,
                  height,
                  verticalLines: {
                    count: verticalCount,
                    density: verticalDensity
                  },
                  horizontalLines: {
                    count: horizontalCount,
                    density: horizontalDensity
                  },
                  crossLines: {
                    density: crossDensity
                  }
                });
                const metrics = buildStructuralDifficultyMetrics(config);

                if (metrics.movableCount < 2) {
                  continue;
                }

                const layoutSignature = getLayoutSignature(config);

                if (!uniqueCandidates.has(layoutSignature)) {
                  uniqueCandidates.set(layoutSignature, {
                    config,
                    metrics,
                    layoutSignature
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  const candidates = [...uniqueCandidates.values()];
  const bounds = buildStructuralDifficultyBounds(candidates);

  return candidates
    .map((candidate) => ({
      config: candidate.config,
      rating: scoreStructuralDifficulty(candidate.metrics, bounds, candidate.layoutSignature),
      areaBucket: getAreaBucketLabel(candidate.metrics.boardArea)
    }))
    .sort((left, right) => {
      if (left.rating.score !== right.rating.score) {
        return left.rating.score - right.rating.score;
      }

      if (left.rating.metrics.boardArea !== right.rating.metrics.boardArea) {
        return left.rating.metrics.boardArea - right.rating.metrics.boardArea;
      }

      if (left.rating.metrics.lockedCount !== right.rating.metrics.lockedCount) {
        return right.rating.metrics.lockedCount - left.rating.metrics.lockedCount;
      }

      return left.rating.layoutSignature.localeCompare(right.rating.layoutSignature);
    });
}

function buildStructuralDifficultyBounds(candidates: StructuralCandidate[]): StructuralDifficultyBounds {
  return {
    boardArea: getMetricBounds(candidates.map((candidate) => candidate.metrics.boardArea)),
    lockedRatio: getMetricBounds(candidates.map((candidate) => candidate.metrics.lockedRatio)),
    nearestLockDistanceMean: getMetricBounds(candidates.map((candidate) => candidate.metrics.nearestLockDistanceMean)),
    nearestLockDistanceP90: getMetricBounds(candidates.map((candidate) => candidate.metrics.nearestLockDistanceP90)),
    largestUnlockedRegionRatio: getMetricBounds(candidates.map((candidate) => candidate.metrics.largestUnlockedRegionRatio))
  };
}

function getMetricBounds(values: number[]): { min: number; max: number } {
  return values.reduce(
    (bounds, value) => ({
      min: Math.min(bounds.min, value),
      max: Math.max(bounds.max, value)
    }),
    { min: Infinity, max: -Infinity }
  );
}

function getAreaBucketLabel(boardArea: number): string {
  return AREA_BUCKETS.find((bucket) => boardArea <= bucket.maxArea)?.label ?? AREA_BUCKETS[AREA_BUCKETS.length - 1].label;
}

function getBounds(values: number[]) {
  return values.reduce(
    (bounds, value) => ({
      min: Math.min(bounds.min, value),
      max: Math.max(bounds.max, value)
    }),
    { min: Infinity, max: -Infinity }
  );
}

function addOklab(left: OklabColor, right: OklabColor): OklabColor {
  return {
    l: left.l + right.l,
    a: left.a + right.a,
    b: left.b + right.b
  };
}

function lerp(start: number, end: number, ratio: number): number {
  return start + (end - start) * ratio;
}

function randomInRangeFloat(minimum: number, maximum: number): number {
  return minimum + Math.random() * (maximum - minimum);
}

function randomSignedFloat(minimum: number, maximum: number): number {
  const magnitude = randomInRangeFloat(minimum, maximum);
  return Math.random() < 0.5 ? magnitude : -magnitude;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

const DIFFICULTY_CATALOG = createDifficultyCatalog();
const STRUCTURAL_DIFFICULTY_BOUNDS = buildStructuralDifficultyBounds(
  DIFFICULTY_CATALOG.map((entry) => ({
    config: entry.config,
    metrics: entry.rating.metrics,
    layoutSignature: entry.rating.layoutSignature
  }))
);
