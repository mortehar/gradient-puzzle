import { AREA_BUCKETS, DIFFICULTY_SCORE_WEIGHTS, STRUCTURAL_DIFFICULTY_BOUNDS } from "./constants";
import { getLockedIndexes, normalizeConfig } from "./config-and-locks";
import type { StructuralCandidate } from "./internal-types";
import type { DifficultyRating, DifficultyTier, GameConfig, StructuralDifficultyBounds, StructuralDifficultyMetrics } from "./types";
import { clamp, getMean, getPercentileFromValues, normalizeMetric } from "./utils";

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

export function buildStructuralDifficultyMetrics(config: GameConfig): StructuralDifficultyMetrics {
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

export function getLayoutSignature(config: GameConfig): string {
  return `${config.width}x${config.height}:${getLockedIndexes(config).join(",")}`;
}

export function scoreStructuralDifficulty(
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

export function buildStructuralDifficultyBounds(candidates: StructuralCandidate[]): StructuralDifficultyBounds {
  return {
    boardArea: getMetricBounds(candidates.map((candidate) => candidate.metrics.boardArea)),
    lockedRatio: getMetricBounds(candidates.map((candidate) => candidate.metrics.lockedRatio)),
    nearestLockDistanceMean: getMetricBounds(candidates.map((candidate) => candidate.metrics.nearestLockDistanceMean)),
    nearestLockDistanceP90: getMetricBounds(candidates.map((candidate) => candidate.metrics.nearestLockDistanceP90)),
    largestUnlockedRegionRatio: getMetricBounds(candidates.map((candidate) => candidate.metrics.largestUnlockedRegionRatio))
  };
}

export function getAreaBucketLabel(boardArea: number): string {
  return AREA_BUCKETS.find((bucket) => boardArea <= bucket.maxArea)?.label ?? AREA_BUCKETS[AREA_BUCKETS.length - 1].label;
}

export function hasSymmetricLockedLayout(lockedIndexes: number[], width: number, height: number): boolean {
  const lockedSet = new Set(lockedIndexes);

  return lockedIndexes.every((index) => {
    const row = Math.floor(index / width);
    const column = index % width;
    const verticalMirror = row * width + (width - 1 - column);
    const horizontalMirror = (height - 1 - row) * width + column;

    return lockedSet.has(verticalMirror) && lockedSet.has(horizontalMirror);
  });
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

function getMetricBounds(values: number[]): { min: number; max: number } {
  return values.reduce(
    (bounds, value) => ({
      min: Math.min(bounds.min, value),
      max: Math.max(bounds.max, value)
    }),
    { min: Infinity, max: -Infinity }
  );
}

function getStructuralDifficultyBounds(): StructuralDifficultyBounds {
  return STRUCTURAL_DIFFICULTY_BOUNDS;
}

export function clampDifficultyScore(value: number): number {
  return clamp(value, 0, 100);
}
