import { describe, expect, it } from "vitest";
import { analyzeBoardTiles } from "./colorAnalysis";
import {
  DEFAULT_CONFIG,
  analyzeStructuralDifficulty,
  buildTilesFromColors,
  createGameFromPublishedPuzzle,
  createNewGame,
  findBestAidMove,
  generateTrajectoryBoard,
  generateTrajectoryBoardFromSeed,
  getPublishedCatalog,
  getPublishedPuzzleBySliderIndex,
  getDifficultyTier,
  getCornerIndexes,
  getLockedIndexes,
  getValidCrossDensities,
  getValidHorizontalLineCounts,
  getValidLineDensities,
  getValidVerticalLineCounts,
  isSolved,
  normalizeConfig,
  scrambleMovableTilesFromSeed,
  scrambleMovableTiles,
  swapTiles,
  type GameConfig
} from "./game";
import {
  buildDifficultyCatalog,
  buildPublishedCatalogPlan,
  createNewGameForDifficulty,
  pickConfigForDifficulty
} from "./gameCatalog";

function buildMockGradientColors(width: number, height: number): string[] {
  return Array.from({ length: width * height }, (_, index) => {
    const row = Math.floor(index / width);
    const column = index % width;
    const x = width === 1 ? 0 : column / (width - 1);
    const y = height === 1 ? 0 : row / (height - 1);
    const red = Math.round(245 - y * 90 - x * 24);
    const green = Math.round(136 + x * 88 - y * 16);
    const blue = Math.round(198 - x * 76 + y * 10);

    return `rgb(${red}, ${green}, ${blue})`;
  });
}

function isSymmetricLayout(lockedIndexes: number[], width: number, height: number): boolean {
  const lockedSet = new Set(lockedIndexes);

  return lockedIndexes.every((index) => {
    const row = Math.floor(index / width);
    const column = index % width;
    const verticalMirror = row * width + (width - 1 - column);
    const horizontalMirror = (height - 1 - row) * width + column;

    return lockedSet.has(verticalMirror) && lockedSet.has(horizontalMirror);
  });
}

describe("game utilities", () => {
  it("derives valid evenly spaced line counts and densities including zero-disabled options", () => {
    expect(getValidVerticalLineCounts(7)).toEqual([0, 1, 2, 3, 4, 7]);
    expect(getValidHorizontalLineCounts(6)).toEqual([0, 2, 6]);
    expect(getValidLineDensities(7)).toEqual([1, 2, 3, 6]);
    expect(getValidCrossDensities(5, 5)).toEqual([0, 1, 2, 4]);
  });

  it("normalizes invalid line settings to the nearest valid snapped value", () => {
    const config = normalizeConfig({
      ...DEFAULT_CONFIG,
      width: 7,
      height: 6,
      verticalLines: { count: 5, density: 4 },
      horizontalLines: { count: 3, density: 5 },
      crossLines: { density: 5 }
    });

    expect(config.verticalLines.count).toBe(4);
    expect(config.verticalLines.density).toBe(5);
    expect(config.horizontalLines.count).toBe(2);
    expect(config.horizontalLines.density).toBe(6);
    expect(config.crossLines.density).toBe(6);
    expect(config.colorConstraints.targetStepStrength).toBe(72);
    expect(config.colorConstraints.axisBalance).toBe(88);
    expect(config.colorConstraints.centerPreservation).toBe(92);
    expect(config.appearance.aidTimeSeconds).toBe(1);
  });

  it("normalizes island settings to portrait-safe valid values and resets disabled islands to a no-op footprint", () => {
    const normalizedIsland = normalizeConfig({
      ...DEFAULT_CONFIG,
      width: 7,
      height: 7,
      islands: {
        count: 1,
        width: 6,
        height: 4,
        density: 3
      }
    });

    expect(normalizedIsland.islands).toEqual({
      count: 1,
      width: 4,
      height: 6,
      density: 1
    });

    const disabledIsland = normalizeConfig({
      ...DEFAULT_CONFIG,
      width: 7,
      height: 7,
      islands: {
        count: 0,
        width: 6,
        height: 4,
        density: 3
      }
    });

    expect(disabledIsland.islands).toEqual({
      count: 0,
      width: 1,
      height: 1,
      density: 1
    });
  });

  it("always includes corners even when all line controls are disabled", () => {
    expect(
      getLockedIndexes({
        ...DEFAULT_CONFIG,
        verticalLines: { count: 0, density: 1 },
        horizontalLines: { count: 0, density: 1 },
        crossLines: { density: 0 }
      })
    ).toEqual(getCornerIndexes(5, 5));
  });

  it("builds solved tiles from explicit board colors for arbitrary sizes and lock unions", () => {
    const config: GameConfig = {
      ...DEFAULT_CONFIG,
      width: 5,
      height: 7,
      verticalLines: { count: 1, density: 2 }
    };
    const colors = buildMockGradientColors(config.width, config.height);
    const tiles = buildTilesFromColors(colors, config);

    expect(tiles).toHaveLength(35);
    expect(tiles.filter((tile) => tile.locked).map((tile) => tile.solvedIndex)).toEqual([0, 2, 4, 12, 22, 30, 32, 34]);
    expect(tiles[0].color).toBe(colors[0]);
    expect(tiles[34].color).toBe(colors[34]);
  });

  it("combines lines and diagonals by union", () => {
    const config: GameConfig = {
      ...DEFAULT_CONFIG,
      width: 5,
      height: 5,
      verticalLines: { count: 3, density: 2 },
      horizontalLines: { count: 1, density: 2 },
      crossLines: { density: 2 }
    };

    expect(getLockedIndexes(config)).toEqual([0, 2, 4, 10, 12, 14, 20, 22, 24]);
  });

  it("centers a single island on the board", () => {
    const config: GameConfig = {
      ...DEFAULT_CONFIG,
      width: 7,
      height: 7,
      verticalLines: { count: 0, density: 1 },
      horizontalLines: { count: 0, density: 1 },
      crossLines: { density: 0 },
      islands: {
        count: 1,
        width: 3,
        height: 5,
        density: 1
      }
    };

    expect(getLockedIndexes(config)).toEqual([0, 6, 9, 10, 11, 16, 17, 18, 23, 24, 25, 30, 31, 32, 37, 38, 39, 42, 48]);
  });

  it("snaps island counts away from asymmetric lattices", () => {
    const config: GameConfig = {
      ...DEFAULT_CONFIG,
      width: 6,
      height: 8,
      verticalLines: { count: 0, density: 1 },
      horizontalLines: { count: 0, density: 1 },
      crossLines: { density: 0 },
      islands: {
        count: 5,
        width: 2,
        height: 2,
        density: 1
      }
    };

    expect(normalizeConfig(config).islands.count).toBe(4);
    expect(getLockedIndexes(config)).toEqual([0, 1, 4, 5, 6, 7, 10, 11, 36, 37, 40, 41, 42, 43, 46, 47]);
  });

  it("samples island locks internally according to island density", () => {
    const config: GameConfig = {
      ...DEFAULT_CONFIG,
      width: 7,
      height: 7,
      verticalLines: { count: 0, density: 1 },
      horizontalLines: { count: 0, density: 1 },
      crossLines: { density: 0 },
      islands: {
        count: 1,
        width: 5,
        height: 5,
        density: 2
      }
    };

    expect(getLockedIndexes(config)).toEqual([0, 6, 8, 10, 12, 22, 24, 26, 36, 38, 40, 42, 48]);
  });

  it("unions island locks with existing line-based patterns", () => {
    const config: GameConfig = {
      ...DEFAULT_CONFIG,
      width: 5,
      height: 5,
      verticalLines: { count: 1, density: 2 },
      horizontalLines: { count: 0, density: 1 },
      crossLines: { density: 0 },
      islands: {
        count: 1,
        width: 3,
        height: 3,
        density: 2
      }
    };

    expect(getLockedIndexes(config)).toEqual([0, 2, 4, 6, 8, 12, 16, 18, 20, 22, 24]);
  });

  it("recreates the old square lock with two vertical and two horizontal lines at density one", () => {
    const config: GameConfig = {
      ...DEFAULT_CONFIG,
      width: 5,
      height: 4,
      verticalLines: { count: 2, density: 1 },
      horizontalLines: { count: 2, density: 1 }
    };

    expect(getLockedIndexes(config)).toEqual([0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 16, 17, 18, 19]);
  });

  it("scramble keeps movable tiles off locked cells and away from solved positions", () => {
    const config: GameConfig = {
      ...DEFAULT_CONFIG,
      width: 5,
      height: 5,
      verticalLines: { count: 2, density: 1 },
      horizontalLines: { count: 2, density: 1 }
    };
    const solvedTiles = buildTilesFromColors(buildMockGradientColors(config.width, config.height), config);
    const lockedIndexes = getLockedIndexes(config);
    const scrambledTiles = scrambleMovableTiles(solvedTiles, lockedIndexes);

    scrambledTiles.forEach((tile) => {
      if (tile.locked) {
        expect(tile.currentIndex).toBe(tile.solvedIndex);
      } else {
        expect(lockedIndexes.includes(tile.currentIndex)).toBe(false);
        expect(tile.currentIndex).not.toBe(tile.solvedIndex);
      }
    });
  });

  it("generates trajectory boards with both axes active across multiple scales", () => {
    [3, 5, 7, 10].forEach((size) => {
      const board = generateTrajectoryBoard({
        ...DEFAULT_CONFIG,
        width: size,
        height: size,
        verticalLines: { count: 0, density: 1 },
        horizontalLines: { count: 0, density: 1 },
        crossLines: { density: 0 }
      });

      expect(board.tiles).toHaveLength(size * size);
      expect(board.debugCornerColors).toHaveLength(4);
      expect(board.metrics.horizontalNeighborDistances.p10).toBeGreaterThan(0.012);
      expect(board.metrics.verticalNeighborDistances.p10).toBeGreaterThan(0.012);
      expect(board.metrics.axisStrengthBalance).toBeGreaterThan(0.25);
    });
  });

  it("keeps edge midpoint clarity, local jumps, and center chroma within readable bounds", () => {
    [3, 5, 7, 10].forEach((size) => {
      const board = generateTrajectoryBoard({
        ...DEFAULT_CONFIG,
        width: size,
        height: size,
        verticalLines: { count: 0, density: 1 },
        horizontalLines: { count: 0, density: 1 },
        crossLines: { density: 0 }
      });
      const jumpRatio = board.metrics.worstLocalJump / Math.max(board.metrics.allNeighborDistances.median, 0.0001);

      expect(board.metrics.edgeMidpointClarity).toBeGreaterThan(0.5);
      expect(board.metrics.centerChroma.normalizedDrop).toBeLessThan(0.5);
      expect(jumpRatio).toBeLessThan(2.8);
      expect(board.metrics.readability.label).not.toBe("harsh");
    });
  });

  it("creates a preview game with a queued scrambled layout", () => {
    const game = createNewGame(DEFAULT_CONFIG);

    expect(game.status).toBe("preview");
    expect(game.tiles.every((tile) => tile.currentIndex === tile.solvedIndex)).toBe(true);
    expect(game.scrambledTiles.some((tile) => !tile.locked && tile.currentIndex !== tile.solvedIndex)).toBe(true);
    expect(game.hintCount).toBe(0);
    expect(game.difficulty.tier).toBe(analyzeStructuralDifficulty(DEFAULT_CONFIG).tier);
  });

  it("scores identical lock layouts independently of color constraints", () => {
    const baseline = analyzeStructuralDifficulty(DEFAULT_CONFIG);
    const alteredColors = analyzeStructuralDifficulty({
      ...DEFAULT_CONFIG,
      colorConstraints: {
        ...DEFAULT_CONFIG.colorConstraints,
        targetStepStrength: 12,
        axisBalance: 24,
        lightnessRange: 91,
        chromaRange: 14,
        centerPreservation: 95,
        edgeSmoothnessBias: 31
      }
    });

    expect(alteredColors.score).toBe(baseline.score);
    expect(alteredColors.layoutSignature).toBe(baseline.layoutSignature);
  });

  it("builds a deduplicated difficulty catalog with valid scores and tiers", () => {
    const catalog = buildDifficultyCatalog();
    const signatures = new Set(catalog.map((entry) => entry.rating.layoutSignature));

    expect(catalog.length).toBe(signatures.size);
    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog.some((entry) => entry.config.islands.count > 0)).toBe(true);
    expect(catalog.every((entry) => entry.config.width <= entry.config.height)).toBe(true);
    expect(catalog.every((entry) => isSymmetricLayout(getLockedIndexes(entry.config), entry.config.width, entry.config.height))).toBe(true);
    expect(catalog[0].rating.score).toBeGreaterThanOrEqual(0);
    expect(catalog[catalog.length - 1].rating.score).toBeLessThanOrEqual(100);
    expect(getDifficultyTier(catalog[0].rating.score)).toBe(catalog[0].rating.tier);
  }, 90000);

  it("uses a very easy label below 10 before stepping into easy", () => {
    expect(getDifficultyTier(0)).toBe("Very easy");
    expect(getDifficultyTier(9)).toBe("Very easy");
    expect(getDifficultyTier(10)).toBe("Easy");
  });

  it("prefers structurally harder layouts for higher difficulty scores", () => {
    const easy = pickConfigForDifficulty(15);
    const hard = pickConfigForDifficulty(85);

    expect(easy.config.width).toBeLessThanOrEqual(easy.config.height);
    expect(hard.config.width).toBeLessThanOrEqual(hard.config.height);
    expect(hard.rating.score).toBeGreaterThanOrEqual(easy.rating.score);
    expect(hard.rating.metrics.boardArea).toBeGreaterThanOrEqual(easy.rating.metrics.boardArea);
    expect(hard.rating.metrics.lockedRatio).toBeLessThanOrEqual(easy.rating.metrics.lockedRatio);
  });

  it("creates difficulty-driven games with structural metadata", () => {
    const game = createNewGameForDifficulty(70, DEFAULT_CONFIG);

    expect(game.difficulty.score).toBeGreaterThanOrEqual(0);
    expect(game.difficulty.score).toBeLessThanOrEqual(100);
    expect(game.config.width).toBeGreaterThanOrEqual(3);
    expect(game.config.height).toBeGreaterThanOrEqual(3);
    expect(game.config.width).toBeLessThanOrEqual(game.config.height);
    expect(game.tiles).toHaveLength(game.config.width * game.config.height);
  });

  it("builds a v1 published catalog with exactly ten puzzles per published tier", () => {
    const catalog = getPublishedCatalog("v1");
    const tierCounts = catalog.puzzles.reduce<Record<string, number>>((counts, puzzle) => {
      counts[puzzle.tier] = (counts[puzzle.tier] || 0) + 1;
      return counts;
    }, {});

    expect(catalog.version).toBe("v1");
    expect(catalog.puzzles).toHaveLength(50);
    expect(tierCounts).toEqual({
      Easy: 10,
      Medium: 10,
      Hard: 10,
      Expert: 10,
      Master: 10
    });
  });

  it("selects the published tier entries by deterministic even spacing", () => {
    const fullCatalog = buildDifficultyCatalog();
    const publishedPlan = buildPublishedCatalogPlan();

    (["Easy", "Medium", "Hard", "Expert", "Master"] as const).forEach((tier) => {
      const tierEntries = fullCatalog.filter((entry) => entry.rating.tier === tier);
      const expectedIndexes = Array.from({ length: 10 }, (_, selectionIndex) => {
        const start = Math.floor((selectionIndex * tierEntries.length) / 10);
        const nextStart = Math.floor(((selectionIndex + 1) * tierEntries.length) / 10);
        const end = Math.max(start, nextStart - 1);

        return Math.round((start + end) / 2);
      });
      const plannedEntries = publishedPlan.filter((entry) => entry.tier === tier).map((entry) => entry.entry);

      expect(plannedEntries).toEqual(expectedIndexes.map((index) => tierEntries[index]));
      expect(plannedEntries.map((entry) => entry.rating.score)).toEqual(
        [...plannedEntries.map((entry) => entry.rating.score)].sort((left, right) => left - right)
      );
    });
  });

  it("uses deterministic seeds for canonical published boards and scrambles", () => {
    const config = {
      ...DEFAULT_CONFIG,
      width: 5,
      height: 5,
      verticalLines: { count: 0, density: 1 },
      horizontalLines: { count: 0, density: 1 },
      crossLines: { density: 0 }
    };
    const boardSeed = 123456;
    const boardA = generateTrajectoryBoardFromSeed(config, boardSeed);
    const boardB = generateTrajectoryBoardFromSeed(config, boardSeed);
    const scrambleA = scrambleMovableTilesFromSeed(boardA.tiles, 654321, getLockedIndexes(config));
    const scrambleB = scrambleMovableTilesFromSeed(boardA.tiles, 654321, getLockedIndexes(config));

    expect(boardA.tiles.map((tile) => tile.color)).toEqual(boardB.tiles.map((tile) => tile.color));
    expect(scrambleA.map((tile) => tile.currentIndex)).toEqual(scrambleB.map((tile) => tile.currentIndex));
  });

  it("creates games from published puzzles with fixed locked cells and fixed scramble order", () => {
    const puzzle = getPublishedPuzzleBySliderIndex("v1", 0);

    expect(puzzle).toBeDefined();

    const gameA = createGameFromPublishedPuzzle(puzzle!);
    const gameB = createGameFromPublishedPuzzle(puzzle!);

    expect(gameA.tiles.map((tile) => tile.color)).toEqual(gameB.tiles.map((tile) => tile.color));
    expect(gameA.scrambledTiles.map((tile) => tile.currentIndex)).toEqual(gameB.scrambledTiles.map((tile) => tile.currentIndex));
    expect(gameA.tiles.filter((tile) => tile.locked).map((tile) => tile.solvedIndex)).toEqual([...puzzle!.lockedIndexes]);
  });

  it("finds an aid move that places both tiles correctly when possible", () => {
    const solvedTiles = buildTilesFromColors(buildMockGradientColors(5, 5), DEFAULT_CONFIG);
    const puzzleTiles = swapTiles(solvedTiles, 1, 7);
    const aid = findBestAidMove(puzzleTiles, DEFAULT_CONFIG);

    expect(aid).not.toBeNull();

    const afterAid = swapTiles(puzzleTiles, aid!.primaryFromIndex, aid!.secondaryFromIndex);
    const primaryTile = afterAid.find((tile) => tile.id === aid!.primaryTileId);
    const secondaryTile = afterAid.find((tile) => tile.id === aid!.secondaryTileId);

    expect(primaryTile?.currentIndex).toBe(primaryTile?.solvedIndex);
    expect(secondaryTile?.currentIndex).toBe(secondaryTile?.solvedIndex);
  });

  it("chooses a secondary that ends as close as possible when a two-tile exact aid is not available", () => {
    const solvedTiles = buildTilesFromColors(buildMockGradientColors(5, 5), DEFAULT_CONFIG);
    const threeCycleTiles = swapTiles(swapTiles(solvedTiles, 1, 7), 7, 8);
    const aid = findBestAidMove(threeCycleTiles, DEFAULT_CONFIG);

    expect(aid).not.toBeNull();

    const afterAid = swapTiles(threeCycleTiles, aid!.primaryFromIndex, aid!.secondaryFromIndex);
    const primaryTile = afterAid.find((tile) => tile.id === aid!.primaryTileId);
    const secondaryTile = afterAid.find((tile) => tile.id === aid!.secondaryTileId);
    const secondaryDistance =
      secondaryTile && secondaryTile.solvedIndex >= 0
        ? Math.abs(Math.floor(secondaryTile.currentIndex / DEFAULT_CONFIG.width) - Math.floor(secondaryTile.solvedIndex / DEFAULT_CONFIG.width)) +
          Math.abs((secondaryTile.currentIndex % DEFAULT_CONFIG.width) - (secondaryTile.solvedIndex % DEFAULT_CONFIG.width))
        : Infinity;

    expect(primaryTile?.currentIndex).toBe(primaryTile?.solvedIndex);
    expect(secondaryDistance).toBe(1);
  });

  it("swaps only movable tiles and leaves locked tiles unchanged", () => {
    const solvedTiles = buildTilesFromColors(buildMockGradientColors(5, 5), DEFAULT_CONFIG);
    const swapped = swapTiles(solvedTiles, 1, 2);

    expect(swapped.find((tile) => tile.id === "tile-1")?.currentIndex).toBe(2);
    expect(swapped.find((tile) => tile.id === "tile-2")?.currentIndex).toBe(1);
    expect(swapped.find((tile) => tile.id === "tile-0")?.currentIndex).toBe(0);
    expect(swapTiles(solvedTiles, 0, 1)).toBe(solvedTiles);
  });

  it("detects only the solved arrangement", () => {
    const solvedTiles = buildTilesFromColors(buildMockGradientColors(5, 5), DEFAULT_CONFIG);
    const swapped = swapTiles(solvedTiles, 1, 2);

    expect(isSolved(solvedTiles)).toBe(true);
    expect(isSolved(swapped)).toBe(false);
  });

  it("produces boards whose metrics agree with the analyzer", () => {
    const board = generateTrajectoryBoard({
      ...DEFAULT_CONFIG,
      width: 7,
      height: 7,
      verticalLines: { count: 0, density: 1 },
      horizontalLines: { count: 0, density: 1 },
      crossLines: { density: 0 }
    });
    const analyzed = analyzeBoardTiles(board.tiles, 7, 7);

    expect(analyzed.edgeMidpointClarity).toBeCloseTo(board.metrics.edgeMidpointClarity, 6);
    expect(analyzed.axisStrengthBalance).toBeCloseTo(board.metrics.axisStrengthBalance, 6);
  });
});
