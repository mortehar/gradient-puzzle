import {
  analyzeBoardTiles,
  cssRgbToOklab,
  oklabToCss,
  type BoardColorMetrics,
  type OklabColor
} from "../colorAnalysis";
import { BASE_COLOR_ATTEMPTS, MIN_REVERSAL_RATE, TRAJECTORY_CANDIDATE_COUNT } from "./constants";
import { getCellCount, getCornerIndexes, getLockedIndexes, normalizeConfig } from "./config-and-locks";
import { analyzeStructuralDifficulty } from "./difficulty";
import type { AidCandidate, RandomSource, RenderableCandidate, TrajectoryPoint, TrajectoryTuning } from "./internal-types";
import type { AidMove, CornerColor, GameConfig, GameState, GeneratedBoard, Tile } from "./types";
import {
  addOklab,
  clamp,
  createSeededRandom,
  getBounds,
  lerp,
  randomInRangeFloat,
  randomSignedFloat
} from "./utils";

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

export function generateTrajectoryBoard(config: GameConfig): GeneratedBoard {
  return generateTrajectoryBoardWithRandom(config, Math.random);
}

export function generateTrajectoryBoardFromSeed(config: GameConfig, seed: number): GeneratedBoard {
  return generateTrajectoryBoardWithRandom(config, createSeededRandom(seed));
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
  return scrambleMovableTilesWithRandom(solvedTiles, Math.random, lockedIndexes);
}

export function scrambleMovableTilesFromSeed(solvedTiles: Tile[], seed: number, lockedIndexes?: number[]): Tile[] {
  return scrambleMovableTilesWithRandom(solvedTiles, createSeededRandom(seed), lockedIndexes);
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

export function isSolved(tiles: Tile[]): boolean {
  return tiles.every((tile) => tile.currentIndex === tile.solvedIndex);
}

function generateTrajectoryBoardWithRandom(config: GameConfig, random: RandomSource): GeneratedBoard {
  const normalizedConfig = normalizeConfig(config);
  let bestPassingCandidate: RenderableCandidate | null = null;
  let bestRenderableCandidate: RenderableCandidate | null = null;

  for (let attempt = 0; attempt < TRAJECTORY_CANDIDATE_COUNT; attempt += 1) {
    const candidate = buildRenderableTrajectoryCandidate(normalizedConfig, attempt, random);

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

  const chosenCandidate =
    bestPassingCandidate ?? bestRenderableCandidate ?? buildFallbackTrajectoryBoard(normalizedConfig, random);

  return {
    tiles: chosenCandidate.tiles,
    metrics: chosenCandidate.metrics,
    debugCornerColors: chosenCandidate.debugCornerColors,
    model: "trajectory",
    difficulty: analyzeStructuralDifficulty(normalizedConfig)
  };
}

function buildRenderableTrajectoryCandidate(
  config: GameConfig,
  attempt: number,
  random: RandomSource
): RenderableCandidate | null {
  const tuning = getTrajectoryTuning(config);
  const xMeanStep = getAxisMeanStep(tuning, config.colorConstraints.axisBalance / 100, attempt % 2 === 0, random);
  const yMeanStep = getAxisMeanStep(tuning, config.colorConstraints.axisBalance / 100, attempt % 2 === 1, random);
  const xDelta = buildAxisDelta(config.width - 1, xMeanStep, tuning, attempt, random);
  const yDelta = buildAxisDelta(config.height - 1, yMeanStep, tuning, attempt + 11, random, xDelta.angle);
  const xTrajectory = buildTrajectory(config.width, xDelta, tuning, random);
  const yTrajectory = buildTrajectory(config.height, yDelta, tuning, random);
  const baseColor = pickBaseColor(xTrajectory, yTrajectory, tuning, random);

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

function buildFallbackTrajectoryBoard(config: GameConfig, random: RandomSource): RenderableCandidate {
  const tuning = getTrajectoryTuning(config);
  const xTrajectory = buildTrajectory(
    config.width,
    {
      l: -Math.min(0.14, tuning.maxAxisLightnessDelta * 0.65),
      a: -Math.min(0.06, tuning.maxAxisChromaDelta * 0.55),
      b: 0.07
    },
    tuning,
    random
  );
  const yTrajectory = buildTrajectory(
    config.height,
    {
      l: -Math.min(0.14, tuning.maxAxisLightnessDelta * 0.65),
      a: 0.07,
      b: -Math.min(0.06, tuning.maxAxisChromaDelta * 0.55)
    },
    tuning,
    random
  );
  const baseColor = pickBaseColor(xTrajectory, yTrajectory, tuning, random) ?? { l: 0.78, a: -0.01, b: 0.04 };
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

function getAxisMeanStep(
  tuning: TrajectoryTuning,
  balance: number,
  preferStrongerAxis: boolean,
  random: RandomSource
): number {
  const ratioFloor = lerp(tuning.minAxisBalance, 1, random());
  const strongerStep = tuning.targetNeighborDistance * lerp(0.92, 1.1, random());
  const weakerStep = strongerStep * ratioFloor;

  return preferStrongerAxis ? strongerStep : weakerStep;
}

function buildAxisDelta(
  intervalCount: number,
  meanStep: number,
  tuning: TrajectoryTuning,
  seed: number,
  random: RandomSource,
  referenceAngle?: number
): { l: number; a: number; b: number; angle: number } {
  if (intervalCount <= 0) {
    return { l: 0, a: 0, b: 0, angle: 0 };
  }

  const totalDistance = meanStep * intervalCount;
  const lightnessMagnitude = Math.min(
    totalDistance * lerp(0.3, 0.68, random()),
    tuning.maxAxisLightnessDelta
  );
  const lightness = (seed % 3 === 0 ? 1 : -1) * lightnessMagnitude;
  const remainingDistance = Math.sqrt(Math.max(totalDistance ** 2 - lightnessMagnitude ** 2, 0));
  const chromaMagnitude = Math.min(remainingDistance, tuning.maxAxisChromaDelta);
  const baseAngle = referenceAngle === undefined
    ? random() * Math.PI * 2
    : referenceAngle + (random() < 0.5 ? -1 : 1) * lerp(Math.PI / 6, Math.PI * 0.62, random());

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
  tuning: TrajectoryTuning,
  random: RandomSource
): TrajectoryPoint[] {
  if (length <= 1) {
    return [{ l: 0, a: 0, b: 0 }];
  }

  const intervalCount = length - 1;
  const ease = randomSignedFloat(0, tuning.maxEase, random);
  const weights = Array.from({ length: intervalCount }, (_, index) => {
    const progress = intervalCount === 1 ? 0.5 : index / (intervalCount - 1);
    const eased = (progress - 0.5) * 2;
    const jitter = randomSignedFloat(0, tuning.maxJitter, random);

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
  tuning: TrajectoryTuning,
  random: RandomSource
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
      l: randomInRangeFloat(minL, maxL, random),
      a: clamp(centeredA + randomSignedFloat(0, tuning.baseChromaBias, random), -0.11, 0.11),
      b: clamp(centeredB + randomSignedFloat(0, tuning.baseChromaBias, random), -0.11, 0.11)
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

function scrambleMovableTilesWithRandom(solvedTiles: Tile[], random: RandomSource, lockedIndexes?: number[]): Tile[] {
  const lockedIndexSet = new Set(
    lockedIndexes ?? solvedTiles.filter((tile) => tile.locked).map((tile) => tile.solvedIndex)
  );
  const movableIndexes = solvedTiles
    .map((tile) => tile.solvedIndex)
    .filter((index) => !lockedIndexSet.has(index));

  if (movableIndexes.length < 2) {
    throw new Error("Puzzle requires at least two movable tiles.");
  }

  const derangedIndexes = createDerangement(movableIndexes, random);
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

function createDerangement(indexes: number[], random: RandomSource): number[] {
  let shuffled = [...indexes];

  do {
    shuffled = shuffle([...indexes], random);
  } while (shuffled.some((value, position) => value === indexes[position]));

  return shuffled;
}

function shuffle<T>(values: T[], random: RandomSource): T[] {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [values[index], values[randomIndex]] = [values[randomIndex], values[index]];
  }

  return values;
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
