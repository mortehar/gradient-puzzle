import { describe, expect, it } from "vitest";
import { analyzeBoardTiles } from "./colorAnalysis";
import {
  DEFAULT_CONFIG,
  analyzeStructuralDifficulty,
  buildDifficultyCatalog,
  buildTilesFromColors,
  createNewGame,
  createNewGameForDifficulty,
  findBestAidMove,
  generateTrajectoryBoard,
  getDifficultyTier,
  getCornerIndexes,
  getLockedIndexes,
  getValidCrossDensities,
  getValidHorizontalLineCounts,
  getValidLineDensities,
  getValidVerticalLineCounts,
  isSolved,
  normalizeConfig,
  pickConfigForDifficulty,
  scrambleMovableTiles,
  swapTiles,
  type GameConfig
} from "./game";

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
    expect(config.colorConstraints.targetStepStrength).toBe(62);
    expect(config.colorConstraints.axisBalance).toBe(78);
    expect(config.colorConstraints.centerPreservation).toBe(82);
    expect(config.appearance.aidTimeSeconds).toBe(1);
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
    expect(catalog[0].rating.score).toBeGreaterThanOrEqual(0);
    expect(catalog[catalog.length - 1].rating.score).toBeLessThanOrEqual(100);
    expect(getDifficultyTier(catalog[0].rating.score)).toBe(catalog[0].rating.tier);
  });

  it("prefers structurally harder layouts for higher difficulty scores", () => {
    const easy = pickConfigForDifficulty(15);
    const hard = pickConfigForDifficulty(85);

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
    expect(game.tiles).toHaveLength(game.config.width * game.config.height);
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
