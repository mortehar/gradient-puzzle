import {
  DEFAULT_CONFIG,
  PUBLISHED_CATALOG_VERSION,
  PUBLISHED_PUZZLES_PER_TIER,
  PUBLISHED_TIER_ORDER
} from "./constants";
import {
  applyStructureToConfig,
  getLockedIndexes,
  getValidCrossDensities,
  getValidHorizontalLineCounts,
  getValidIslandCounts,
  getValidIslandDensities,
  getValidLineDensities,
  getValidVerticalLineCounts,
  normalizeConfig
} from "./config-and-locks";
import {
  buildStructuralDifficultyBounds,
  buildStructuralDifficultyMetrics,
  clampDifficultyScore,
  getAreaBucketLabel,
  getLayoutSignature,
  hasSymmetricLockedLayout,
  scoreStructuralDifficulty
} from "./difficulty";
import type { StructuralCandidate } from "./internal-types";
import type {
  CatalogVersion,
  DifficultyCatalogEntry,
  DifficultyTier,
  GameConfig,
  GameState,
  PublishedPuzzleCatalog,
  PublishedPuzzlePlanEntry,
  StructuralCatalogManifest
} from "./types";
import { hashStringToSeed } from "./utils";
import { createNewGame, generateTrajectoryBoardFromSeed, scrambleMovableTilesFromSeed } from "./generation";
import { MAX_BOARD_SIZE, MIN_BOARD_SIZE } from "./types";

let difficultyCatalogCache: DifficultyCatalogEntry[] | null = null;

export function buildDifficultyCatalog(): DifficultyCatalogEntry[] {
  return getDifficultyCatalogCache();
}

export function pickConfigForDifficulty(targetScore: number, recentSignatures: string[] = []): DifficultyCatalogEntry {
  const normalizedTargetScore = clampDifficultyScore(targetScore);
  const recentSignatureSet = new Set(recentSignatures);
  const difficultyCatalog = buildDifficultyCatalog();
  const preferredEntries = difficultyCatalog.filter((entry) => !recentSignatureSet.has(entry.rating.layoutSignature));
  const candidates = preferredEntries.length > 0 ? preferredEntries : difficultyCatalog;

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
): GameState {
  const chosenEntry = pickConfigForDifficulty(targetScore, recentSignatures);
  const config = applyStructureToConfig(baseConfig, chosenEntry.config);

  return createNewGame(config);
}

export function buildStructuralCatalogManifest(): StructuralCatalogManifest {
  const catalog = createDifficultyCatalog();

  return {
    catalog,
    bounds: buildStructuralDifficultyBounds(
      catalog.map((entry) => ({
        config: entry.config,
        metrics: entry.rating.metrics,
        layoutSignature: entry.rating.layoutSignature
      }))
    )
  };
}

export function buildPublishedCatalogPlan(
  version: CatalogVersion = PUBLISHED_CATALOG_VERSION,
  difficultyCatalog: readonly DifficultyCatalogEntry[] = buildDifficultyCatalog()
): PublishedPuzzlePlanEntry[] {
  if (version !== PUBLISHED_CATALOG_VERSION) {
    throw new Error(`Unknown catalog version: ${version}`);
  }

  const tierEntries = PUBLISHED_TIER_ORDER.map((tier) => {
    const entries = difficultyCatalog.filter((entry) => entry.rating.tier === tier);

    if (entries.length < PUBLISHED_PUZZLES_PER_TIER) {
      throw new Error(`Tier ${tier} only has ${entries.length} candidates.`);
    }

    return {
      tier,
      entries: selectTierEntries(entries, PUBLISHED_PUZZLES_PER_TIER)
    };
  });

  return tierEntries.flatMap(({ tier, entries }, tierOffset) =>
    entries.map((entry, index) => {
      const tierIndex = index + 1;
      const id = `${version}/${slugifyTier(tier)}/${tierIndex}`;

      return {
        id,
        catalogVersion: version,
        sliderIndex: tierOffset * PUBLISHED_PUZZLES_PER_TIER + index,
        tier,
        tierIndex,
        boardSeed: hashStringToSeed(`${id}:board`),
        scrambleSeed: hashStringToSeed(`${id}:scramble`),
        entry
      };
    })
  );
}

export function buildPublishedCatalogManifest(
  version: CatalogVersion = PUBLISHED_CATALOG_VERSION,
  difficultyCatalog: readonly DifficultyCatalogEntry[] = buildDifficultyCatalog()
): PublishedPuzzleCatalog {
  return {
    version,
    puzzles: buildPublishedCatalogPlan(version, difficultyCatalog).map((planEntry) => {
      const generatedBoard = generateTrajectoryBoardFromSeed(planEntry.entry.config, planEntry.boardSeed);
      const lockedIndexes = getLockedIndexes(planEntry.entry.config);
      const scrambledTiles = scrambleMovableTilesFromSeed(generatedBoard.tiles, planEntry.scrambleSeed, lockedIndexes);

      return {
        id: planEntry.id,
        catalogVersion: version,
        sliderIndex: planEntry.sliderIndex,
        tier: planEntry.tier,
        tierIndex: planEntry.tierIndex,
        score: planEntry.entry.rating.score,
        areaBucket: planEntry.entry.areaBucket,
        layoutSignature: planEntry.entry.rating.layoutSignature,
        boardSeed: planEntry.boardSeed,
        scrambleSeed: planEntry.scrambleSeed,
        config: planEntry.entry.config,
        lockedIndexes,
        solvedColors: generatedBoard.tiles.map((tile) => tile.color),
        scrambledCurrentIndexes: buildGeneratedScrambleIndexes(scrambledTiles)
      };
    })
  };
}

function createDifficultyCatalog(): DifficultyCatalogEntry[] {
  const uniqueCandidates = new Map<string, StructuralCandidate>();
  const addCandidate = (config: GameConfig) => {
    const lockedIndexes = getLockedIndexes(config);

    if (!hasSymmetricLockedLayout(lockedIndexes, config.width, config.height)) {
      return;
    }

    const metrics = buildStructuralDifficultyMetrics(config);

    if (metrics.movableCount < 2) {
      return;
    }

    const layoutSignature = getLayoutSignature(config);

    if (!uniqueCandidates.has(layoutSignature)) {
      uniqueCandidates.set(layoutSignature, {
        config,
        metrics,
        layoutSignature
      });
    }
  };

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
                addCandidate(config);
              }
            }
          }
        }
      }

      for (let islandWidth = 1; islandWidth <= width; islandWidth += 1) {
        for (let islandHeight = islandWidth; islandHeight <= height; islandHeight += 1) {
          const islandCounts = getValidIslandCounts(width, height, islandWidth, islandHeight).filter((count) => count > 0);
          const islandDensities = getValidIslandDensities(islandWidth, islandHeight);

          for (const islandCount of islandCounts) {
            for (const islandDensity of islandDensities) {
              addCandidate(
                normalizeConfig({
                  ...DEFAULT_CONFIG,
                  width,
                  height,
                  verticalLines: {
                    count: 0,
                    density: 1
                  },
                  horizontalLines: {
                    count: 0,
                    density: 1
                  },
                  crossLines: {
                    density: 0
                  },
                  islands: {
                    count: islandCount,
                    width: islandWidth,
                    height: islandHeight,
                    density: islandDensity
                  }
                })
              );
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

function buildGeneratedScrambleIndexes(scrambledTiles: GameState["tiles"]): number[] {
  return [...scrambledTiles]
    .sort((left, right) => left.solvedIndex - right.solvedIndex)
    .map((tile) => tile.currentIndex);
}

function selectTierEntries(entries: DifficultyCatalogEntry[], selectionCount: number): DifficultyCatalogEntry[] {
  const selectedIndexes = Array.from({ length: selectionCount }, (_, selectionIndex) => {
    const start = Math.floor((selectionIndex * entries.length) / selectionCount);
    const nextStart = Math.floor(((selectionIndex + 1) * entries.length) / selectionCount);
    const end = Math.max(start, nextStart - 1);

    return Math.round((start + end) / 2);
  });

  return selectedIndexes.map((index) => entries[index]);
}

function slugifyTier(tier: DifficultyTier): string {
  return tier.toLowerCase().replace(/\s+/g, "-");
}

function getDifficultyCatalogCache(): DifficultyCatalogEntry[] {
  if (!difficultyCatalogCache) {
    difficultyCatalogCache = createDifficultyCatalog();
  }

  return difficultyCatalogCache;
}
