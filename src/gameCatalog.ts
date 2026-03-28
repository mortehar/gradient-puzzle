import {
  DEFAULT_CONFIG,
  buildPublishedCatalogManifest as buildPublishedCatalogManifestFromGame,
  buildPublishedCatalogPlan as buildPublishedCatalogPlanFromGame,
  createNewGame,
  getDifficultyTier,
  normalizeConfig,
  type CatalogVersion,
  type DifficultyCatalogEntry,
  type GameConfig,
  type PublishedPuzzleCatalog,
  type PublishedPuzzlePlanEntry,
} from "./game";
import {
  GENERATED_STRUCTURAL_CATALOG,
  GENERATED_STRUCTURAL_DIFFICULTY_BOUNDS
} from "./structuralCatalog.generated";

const STRUCTURAL_CATALOG = GENERATED_STRUCTURAL_CATALOG as unknown as DifficultyCatalogEntry[];
export const STRUCTURAL_DIFFICULTY_BOUNDS = GENERATED_STRUCTURAL_DIFFICULTY_BOUNDS as {
  boardArea: { min: number; max: number };
  lockedRatio: { min: number; max: number };
  nearestLockDistanceMean: { min: number; max: number };
  nearestLockDistanceP90: { min: number; max: number };
  largestUnlockedRegionRatio: { min: number; max: number };
};

export function buildDifficultyCatalog(): DifficultyCatalogEntry[] {
  return STRUCTURAL_CATALOG;
}

export function pickConfigForDifficulty(targetScore: number, recentSignatures: string[] = []): DifficultyCatalogEntry {
  const normalizedTargetScore = clamp(targetScore, 0, 100);
  const recentSignatureSet = new Set(recentSignatures);
  const preferredEntries = STRUCTURAL_CATALOG.filter((entry) => !recentSignatureSet.has(entry.rating.layoutSignature));
  const candidates = preferredEntries.length > 0 ? preferredEntries : STRUCTURAL_CATALOG;

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

export function createNewGameForDifficulty(
  targetScore: number,
  baseConfig: GameConfig = DEFAULT_CONFIG,
  recentSignatures: string[] = []
) {
  const chosenEntry = pickConfigForDifficulty(targetScore, recentSignatures);
  const config = normalizeConfig({
    ...baseConfig,
    width: chosenEntry.config.width,
    height: chosenEntry.config.height,
    verticalLines: chosenEntry.config.verticalLines,
    horizontalLines: chosenEntry.config.horizontalLines,
    crossLines: chosenEntry.config.crossLines,
    islands: chosenEntry.config.islands
  });

  return createNewGame(config);
}

export function buildPublishedCatalogPlan(
  version?: CatalogVersion,
  difficultyCatalog: readonly DifficultyCatalogEntry[] = STRUCTURAL_CATALOG
): PublishedPuzzlePlanEntry[] {
  return buildPublishedCatalogPlanFromGame(version, difficultyCatalog);
}

export function buildPublishedCatalogManifest(
  version?: CatalogVersion,
  difficultyCatalog: readonly DifficultyCatalogEntry[] = STRUCTURAL_CATALOG
): PublishedPuzzleCatalog {
  return buildPublishedCatalogManifestFromGame(version, difficultyCatalog);
}

export { getDifficultyTier };

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
