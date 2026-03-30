import type { BoardColorMetrics, OklabColor } from "../colorAnalysis";

export const MIN_BOARD_SIZE = 3;
export const MAX_BOARD_SIZE = 10;

export type LineLockConfig = {
  count: number;
  density: number;
};

export type CrossLockConfig = {
  density: number;
};

export type IslandLockConfig = {
  count: number;
  width: number;
  height: number;
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
  islands: IslandLockConfig;
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

export type CatalogVersion = "v1";

export type PuzzleId = string;

export type PublishedPuzzle = {
  id: PuzzleId;
  catalogVersion: CatalogVersion;
  sliderIndex: number;
  tier: DifficultyTier;
  tierIndex: number;
  score: number;
  areaBucket: string;
  layoutSignature: string;
  boardSeed: number;
  scrambleSeed: number;
  config: GameConfig;
  lockedIndexes: readonly number[];
  solvedColors: readonly string[];
  scrambledCurrentIndexes: readonly number[];
};

export type PublishedPuzzleCatalog = {
  version: CatalogVersion;
  puzzles: readonly PublishedPuzzle[];
};

export type PublishedPuzzlePlanEntry = {
  id: PuzzleId;
  catalogVersion: CatalogVersion;
  sliderIndex: number;
  tier: DifficultyTier;
  tierIndex: number;
  boardSeed: number;
  scrambleSeed: number;
  entry: DifficultyCatalogEntry;
};

export type StructuralCatalogManifest = {
  catalog: DifficultyCatalogEntry[];
  bounds: StructuralDifficultyBounds;
};

export type StructuralDifficultyBounds = {
  boardArea: { min: number; max: number };
  lockedRatio: { min: number; max: number };
  nearestLockDistanceMean: { min: number; max: number };
  nearestLockDistanceP90: { min: number; max: number };
  largestUnlockedRegionRatio: { min: number; max: number };
};
