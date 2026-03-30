import { DEFAULT_CONFIG, PUBLISHED_CATALOG_VERSION } from "./constants";
import { normalizeConfig } from "./config-and-locks";
import { buildStructuralDifficultyMetrics } from "./difficulty";
import { GENERATED_PUBLISHED_CATALOG } from "./generated/publishedCatalog.generated";
import type { AppearanceConfig, CatalogVersion, GameState, PublishedPuzzle, PublishedPuzzleCatalog, PuzzleId, Tile } from "./types";

const PUBLISHED_CATALOGS: Record<CatalogVersion, PublishedPuzzleCatalog> = {
  v1: GENERATED_PUBLISHED_CATALOG as PublishedPuzzleCatalog
};

const PUBLISHED_PUZZLE_BY_ID: Record<CatalogVersion, Map<PuzzleId, PublishedPuzzle>> = {
  v1: new Map(PUBLISHED_CATALOGS.v1.puzzles.map((puzzle) => [puzzle.id, puzzle]))
};

export function getPublishedCatalog(version: CatalogVersion = PUBLISHED_CATALOG_VERSION): PublishedPuzzleCatalog {
  const catalog = PUBLISHED_CATALOGS[version];

  if (!catalog) {
    throw new Error(`Unknown catalog version: ${version}`);
  }

  return catalog;
}

export function getPublishedPuzzle(version: CatalogVersion, id: PuzzleId): PublishedPuzzle | undefined {
  return PUBLISHED_PUZZLE_BY_ID[version].get(id);
}

export function getPublishedPuzzleBySliderIndex(
  version: CatalogVersion,
  sliderIndex: number
): PublishedPuzzle | undefined {
  return getPublishedCatalog(version).puzzles[sliderIndex];
}

export function getPublishedPuzzleCount(version: CatalogVersion = PUBLISHED_CATALOG_VERSION): number {
  return getPublishedCatalog(version).puzzles.length;
}

export function createGameFromPublishedPuzzle(
  puzzle: PublishedPuzzle,
  appearance: AppearanceConfig = DEFAULT_CONFIG.appearance
): GameState {
  const config = normalizeConfig({
    ...puzzle.config,
    appearance
  });
  const tiles = buildTilesFromPublishedData(puzzle.solvedColors, puzzle.lockedIndexes);
  const scrambledTiles = buildScrambledTilesFromPublishedData(tiles, puzzle.scrambledCurrentIndexes);

  return {
    tiles,
    scrambledTiles,
    swapCount: 0,
    hintCount: 0,
    status: "preview",
    config,
    difficulty: {
      score: puzzle.score,
      tier: puzzle.tier,
      metrics: buildStructuralDifficultyMetrics(config),
      layoutSignature: puzzle.layoutSignature
    }
  };
}

function buildTilesFromPublishedData(colors: readonly string[], lockedIndexes: readonly number[]): Tile[] {
  const lockedSet = new Set(lockedIndexes);

  return colors.map((color, solvedIndex) => ({
    id: `tile-${solvedIndex}`,
    solvedIndex,
    currentIndex: solvedIndex,
    locked: lockedSet.has(solvedIndex),
    color
  }));
}

function buildScrambledTilesFromPublishedData(
  solvedTiles: Tile[],
  scrambledCurrentIndexes: readonly number[]
): Tile[] {
  if (scrambledCurrentIndexes.length !== solvedTiles.length) {
    throw new Error("Published scramble length does not match tile count.");
  }

  const usedIndexes = new Set<number>();

  const scrambledTiles = solvedTiles.map((tile, solvedIndex) => {
    const currentIndex = scrambledCurrentIndexes[solvedIndex];

    if (currentIndex === undefined || currentIndex < 0 || currentIndex >= solvedTiles.length || usedIndexes.has(currentIndex)) {
      throw new Error(`Invalid published scramble index at tile ${solvedIndex}.`);
    }

    usedIndexes.add(currentIndex);

    return {
      ...tile,
      currentIndex
    };
  });

  return scrambledTiles.sort((left, right) => left.currentIndex - right.currentIndex);
}
