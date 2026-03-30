import { describe, expect, it } from "vitest";
import { getPublishedCatalog } from "../domain";
import { buildPuzzleCompletionRecord } from "./puzzleSessionCompletion";

describe("puzzleSessionCompletion", () => {
  it("builds a completion record with stable puzzle identity fields", () => {
    const puzzle = getPublishedCatalog("v1").puzzles[0]!;

    expect(buildPuzzleCompletionRecord(puzzle, 1_000, 12, 1, 6_000)).toEqual({
      puzzleId: puzzle.id,
      catalogVersion: puzzle.catalogVersion,
      sliderIndex: puzzle.sliderIndex,
      tier: puzzle.tier,
      tierIndex: puzzle.tierIndex,
      moveCount: 12,
      aidCount: 1,
      startedAt: 1_000,
      completedAt: 6_000,
      solveDurationMs: 5_000
    });
  });

  it("clamps negative solve durations to zero", () => {
    const puzzle = getPublishedCatalog("v1").puzzles[0]!;

    expect(buildPuzzleCompletionRecord(puzzle, 5_000, 8, 0, 4_000).solveDurationMs).toBe(0);
  });
});
