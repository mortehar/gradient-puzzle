import type { CatalogVersion, DifficultyTier, GameConfig, TrajectoryColorConfig } from "./types";
import type { StructuralDifficultyBounds } from "./types";

export const TRAJECTORY_CANDIDATE_COUNT = 48;
export const BASE_COLOR_ATTEMPTS = 10;
export const MIN_REVERSAL_RATE = 0.05;

export const DEFAULT_COLOR_CONSTRAINTS: TrajectoryColorConfig = {
  targetStepStrength: 72,
  axisBalance: 88,
  lightnessRange: 48,
  chromaRange: 62,
  centerPreservation: 92,
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
  islands: {
    count: 0,
    width: 1,
    height: 1,
    density: 1
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

export const DIFFICULTY_SCORE_WEIGHTS = {
  boardArea: 0.3,
  anchorScarcity: 0.2,
  nearestLockDistanceMean: 0.25,
  nearestLockDistanceP90: 0.15,
  largestUnlockedRegionRatio: 0.1
} as const;

export const PUBLISHED_PUZZLES_PER_TIER = 10;
export const PUBLISHED_CATALOG_VERSION: CatalogVersion = "v1";
export const PUBLISHED_TIER_ORDER: DifficultyTier[] = ["Easy", "Medium", "Hard", "Expert", "Master"];

export const STRUCTURAL_DIFFICULTY_BOUNDS: StructuralDifficultyBounds = {
  boardArea: { min: 9, max: 100 },
  lockedRatio: { min: 0.04, max: 0.9777777777777777 },
  nearestLockDistanceMean: { min: 1, max: 4.166666666666667 },
  nearestLockDistanceP90: { min: 1, max: 7 },
  largestUnlockedRegionRatio: { min: 0.01, max: 0.96 }
};

export const AREA_BUCKETS = [
  { maxArea: 12, label: "9-12" },
  { maxArea: 20, label: "13-20" },
  { maxArea: 30, label: "21-30" },
  { maxArea: 42, label: "31-42" },
  { maxArea: 56, label: "43-56" },
  { maxArea: 72, label: "57-72" },
  { maxArea: 100, label: "73-100" }
] as const;
