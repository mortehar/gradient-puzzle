import { describe, expect, it } from "vitest";
import { getPublishedCatalog } from "../domain";
import { buildPuzzleSessionGame, buildPuzzleSessionGameForPhase } from "./puzzleSessionGame";

const puzzle = getPublishedCatalog("v1").puzzles[0]!;

describe("puzzleSessionGame", () => {
  it("builds the default preview session state when no QA bootstrap is provided", () => {
    const game = buildPuzzleSessionGame(puzzle);

    expect(game.status).toBe("preview");
    expect(game.tiles.every((tile) => tile.currentIndex === tile.solvedIndex)).toBe(true);
    expect(game.scrambledTiles.some((tile) => !tile.locked && tile.currentIndex !== tile.solvedIndex)).toBe(true);
  });

  it("hydrates deterministic QA phases without changing puzzle identity", () => {
    const playing = buildPuzzleSessionGameForPhase(puzzle, "playing");
    const solved = buildPuzzleSessionGameForPhase(puzzle, "solved");

    expect(playing.status).toBe("playing");
    expect(playing.tiles).toEqual(playing.scrambledTiles);
    expect(solved.status).toBe("solved");
    expect(solved.tiles.every((tile) => tile.currentIndex === tile.solvedIndex)).toBe(true);
    expect([...solved.tiles].map((tile) => tile.id).sort()).toEqual([...playing.tiles].map((tile) => tile.id).sort());
  });
});
