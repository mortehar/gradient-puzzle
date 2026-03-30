export {
  DEFAULT_COLOR_CONSTRAINTS,
  DEFAULT_CONFIG
} from "./game/constants";
export {
  getCellCount,
  getCornerIndexes,
  getLockedIndexes,
  getValidCrossDensities,
  getValidHorizontalLineCounts,
  getValidLineDensities,
  getValidVerticalLineCounts,
  normalizeConfig
} from "./game/config-and-locks";
export {
  analyzeStructuralDifficulty,
  getDifficultyTier
} from "./game/difficulty";
export {
  buildDifficultyCatalog,
  buildPublishedCatalogManifest,
  buildPublishedCatalogPlan,
  buildStructuralCatalogManifest,
  createNewGameForDifficulty,
  pickConfigForDifficulty
} from "./game/catalog-authoring";
export {
  buildTilesFromColors,
  createNewGame,
  findBestAidMove,
  generateTrajectoryBoard,
  generateTrajectoryBoardFromSeed,
  isSolved,
  scrambleMovableTiles,
  scrambleMovableTilesFromSeed,
  swapTiles
} from "./game/generation";
export {
  createGameFromPublishedPuzzle,
  getPublishedCatalog,
  getPublishedPuzzle,
  getPublishedPuzzleBySliderIndex,
  getPublishedPuzzleCount
} from "./game/catalog-runtime";
export {
  MAX_BOARD_SIZE,
  MIN_BOARD_SIZE,
  type AidMove,
  type AppearanceConfig,
  type CatalogVersion,
  type CornerColor,
  type CrossLockConfig,
  type DifficultyCatalogEntry,
  type DifficultyRating,
  type DifficultyTier,
  type GameConfig,
  type GameState,
  type GeneratedBoard,
  type IslandLockConfig,
  type LineLockConfig,
  type PublishedPuzzle,
  type PublishedPuzzleCatalog,
  type PublishedPuzzlePlanEntry,
  type PuzzleId,
  type PuzzleSetupMode,
  type StructuralCatalogManifest,
  type StructuralDifficultyMetrics,
  type Tile,
  type TrajectoryColorConfig
} from "./game/types";
