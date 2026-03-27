import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  buildSolvedTiles,
  createNewGame,
  findBestAidMove,
  generateCornerColors,
  getCornerIndexes,
  getLockedIndexes,
  getValidCrossDensities,
  getValidHorizontalLineCounts,
  getValidLineDensities,
  getValidVerticalLineCounts,
  isSolved,
  normalizeConfig,
  scrambleMovableTiles,
  swapTiles,
  type CornerColor,
  type GameConfig
} from "./game";

function parseRgb(color: string): [number, number, number] {
  const matches = color.match(/\d+/g);

  if (!matches || matches.length !== 3) {
    throw new Error(`Unexpected color format: ${color}`);
  }

  return matches.map(Number) as [number, number, number];
}

const fixedCorners: CornerColor[] = [
  { h: 0, s: 100, l: 50 },
  { h: 90, s: 100, l: 50 },
  { h: 180, s: 100, l: 50 },
  { h: 270, s: 100, l: 50 }
];

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
    expect(config.appearance.aidTimeSeconds).toBe(1);
    expect(config.width).toBe(7);
    expect(config.height).toBe(6);
    expect(config.appearance.cellSpacing).toBe(0);
    expect(config.appearance.cellRounding).toBe(0);
    expect(config.colorConstraints.minSaturationValue).toBe(25);
    expect(config.colorConstraints.minLuminosityValue).toBe(10);
    expect(config.colorConstraints.maxLuminosityValue).toBe(85);
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

  it("builds solved tiles for arbitrary sizes and lock unions", () => {
    const config: GameConfig = {
      ...DEFAULT_CONFIG,
      width: 5,
      height: 7,
      verticalLines: { count: 1, density: 2 }
    };
    const tiles = buildSolvedTiles(fixedCorners, config);

    expect(tiles).toHaveLength(35);
    expect(tiles.filter((tile) => tile.locked).map((tile) => tile.solvedIndex)).toEqual([0, 2, 4, 12, 22, 30, 32, 34]);
    expect(parseRgb(tiles[0].color)).toEqual([255, 0, 0]);
    expect(parseRgb(tiles[4].color)).toEqual([128, 255, 0]);
    expect(parseRgb(tiles[30].color)).toEqual([0, 255, 255]);
    expect(parseRgb(tiles[34].color)).toEqual([128, 0, 255]);
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
    const solvedTiles = buildSolvedTiles(fixedCorners, config);
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

  it("generates corner colors that satisfy the configured distances", () => {
    const colors = generateCornerColors({
      minHueDistance: 60,
      minSaturationValue: 75,
      minLuminosityValue: 40,
      maxLuminosityValue: 60,
      minLuminosityDistance: 5
    });

    expect(colors).toHaveLength(4);
    expect(colors.every((color) => color.s >= 75 && color.l >= 40 && color.l <= 60)).toBe(true);

    for (let left = 0; left < colors.length; left += 1) {
      for (let right = left + 1; right < colors.length; right += 1) {
        const hueDistance = Math.min(
          Math.abs(colors[left].h - colors[right].h),
          360 - Math.abs(colors[left].h - colors[right].h)
        );

        expect(hueDistance).toBeGreaterThanOrEqual(60);
        expect(Math.abs(colors[left].l - colors[right].l)).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it("normalizes luminosity bounds so they never invert", () => {
    const config = normalizeConfig({
      ...DEFAULT_CONFIG,
      colorConstraints: {
        ...DEFAULT_CONFIG.colorConstraints,
        minLuminosityValue: 80,
        maxLuminosityValue: 20
      }
    });

    expect(config.colorConstraints.minLuminosityValue).toBe(80);
    expect(config.colorConstraints.maxLuminosityValue).toBe(80);
  });

  it("finds an aid move that places both tiles correctly when possible", () => {
    const solvedTiles = buildSolvedTiles(fixedCorners, DEFAULT_CONFIG);
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
    const solvedTiles = buildSolvedTiles(fixedCorners, DEFAULT_CONFIG);
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
    const solvedTiles = buildSolvedTiles(fixedCorners, DEFAULT_CONFIG);
    const swapped = swapTiles(solvedTiles, 1, 2);

    expect(swapped.find((tile) => tile.id === "tile-1")?.currentIndex).toBe(2);
    expect(swapped.find((tile) => tile.id === "tile-2")?.currentIndex).toBe(1);
    expect(swapped.find((tile) => tile.id === "tile-0")?.currentIndex).toBe(0);
    expect(swapTiles(solvedTiles, 0, 1)).toBe(solvedTiles);
  });

  it("creates a preview game with a queued scrambled layout", () => {
    const game = createNewGame(DEFAULT_CONFIG);

    expect(game.status).toBe("preview");
    expect(game.tiles.every((tile) => tile.currentIndex === tile.solvedIndex)).toBe(true);
    expect(game.scrambledTiles.some((tile) => !tile.locked && tile.currentIndex !== tile.solvedIndex)).toBe(true);
    expect(game.hintCount).toBe(0);
  });

  it("detects only the solved arrangement", () => {
    const solvedTiles = buildSolvedTiles(fixedCorners, DEFAULT_CONFIG);
    const swapped = swapTiles(solvedTiles, 1, 2);

    expect(isSolved(solvedTiles)).toBe(true);
    expect(isSolved(swapped)).toBe(false);
  });
});
