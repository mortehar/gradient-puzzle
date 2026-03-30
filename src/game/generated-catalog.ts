import { DEFAULT_CONFIG } from "./constants";
import { applyStructureToConfig } from "./config-and-locks";
import { buildPublishedCatalogManifest, buildPublishedCatalogPlan } from "./catalog-authoring";
import { getDifficultyTier } from "./difficulty";
import { createNewGame } from "./generation";
import { GENERATED_STRUCTURAL_CATALOG, GENERATED_STRUCTURAL_DIFFICULTY_BOUNDS } from "./generated/structuralCatalog.generated";
import type {
  CatalogVersion,
  DifficultyCatalogEntry,
  GameConfig,
  PublishedPuzzleCatalog,
  PublishedPuzzlePlanEntry,
  StructuralDifficultyBounds
} from "./types";

const GENERATED_DIFFICULTY_CATALOG = GENERATED_STRUCTURAL_CATALOG as unknown as DifficultyCatalogEntry[];

export const GENERATED_DIFFICULTY_BOUNDS = GENERATED_STRUCTURAL_DIFFICULTY_BOUNDS as StructuralDifficultyBounds;

export function getGeneratedDifficultyCatalog(): DifficultyCatalogEntry[] {
  return GENERATED_DIFFICULTY_CATALOG;
}

export function pickGeneratedConfigForDifficulty(
  targetScore: number,
  recentSignatures: string[] = []
): DifficultyCatalogEntry {
  const normalizedTargetScore = Math.min(100, Math.max(0, targetScore));
  const recentSignatureSet = new Set(recentSignatures);
  const preferredEntries = GENERATED_DIFFICULTY_CATALOG.filter((entry) => !recentSignatureSet.has(entry.rating.layoutSignature));
  const candidates = preferredEntries.length > 0 ? preferredEntries : GENERATED_DIFFICULTY_CATALOG;

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

export function createNewGameForGeneratedDifficulty(
  targetScore: number,
  baseConfig: GameConfig = DEFAULT_CONFIG,
  recentSignatures: string[] = []
) {
  const chosenEntry = pickGeneratedConfigForDifficulty(targetScore, recentSignatures);
  const config = applyStructureToConfig(baseConfig, chosenEntry.config);

  return createNewGame(config);
}

export function buildGeneratedPublishedCatalogPlan(
  version?: CatalogVersion,
  difficultyCatalog: readonly DifficultyCatalogEntry[] = GENERATED_DIFFICULTY_CATALOG
): PublishedPuzzlePlanEntry[] {
  return buildPublishedCatalogPlan(version, difficultyCatalog);
}

export function buildGeneratedPublishedCatalogManifest(
  version?: CatalogVersion,
  difficultyCatalog: readonly DifficultyCatalogEntry[] = GENERATED_DIFFICULTY_CATALOG
): PublishedPuzzleCatalog {
  return buildPublishedCatalogManifest(version, difficultyCatalog);
}

export { getDifficultyTier };
