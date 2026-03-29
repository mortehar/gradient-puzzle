import { beforeEach, describe, expect, it } from "vitest";
import {
  getBestCompletionForPuzzle,
  loadCompletionHistory,
  saveCompletion,
  type LocalPuzzleCompletionRecord
} from "./puzzleCompletionHistory";

const STORAGE_KEY = "gradient:puzzle-history:v1";

function buildRecord(overrides: Partial<LocalPuzzleCompletionRecord> = {}): LocalPuzzleCompletionRecord {
  return {
    puzzleId: "v1-puzzle-1",
    catalogVersion: "v1",
    sliderIndex: 0,
    tier: "Very easy",
    tierIndex: 1,
    moveCount: 12,
    aidCount: 0,
    startedAt: 1_000,
    completedAt: 5_000,
    solveDurationMs: 4_000,
    ...overrides
  };
}

describe("puzzleCompletionHistory", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loads an empty history when nothing is stored", () => {
    expect(loadCompletionHistory()).toEqual([]);
  });

  it("ignores malformed storage and returns an empty history", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not-json");

    expect(loadCompletionHistory()).toEqual([]);
  });

  it("appends completions and reloads them from storage", () => {
    const first = buildRecord();
    const second = buildRecord({
      puzzleId: "v1-puzzle-2",
      sliderIndex: 1,
      tierIndex: 2,
      moveCount: 9,
      completedAt: 7_000
    });

    saveCompletion(first);
    saveCompletion(second);

    expect(loadCompletionHistory()).toEqual([first, second]);
  });

  it("prefers fewer moves, then faster time, then earlier completion for best score", () => {
    const records = [
      buildRecord({ completedAt: 10_000, moveCount: 8, solveDurationMs: 3_000 }),
      buildRecord({ completedAt: 9_000, moveCount: 8, solveDurationMs: 2_900 }),
      buildRecord({ completedAt: 8_000, moveCount: 8, solveDurationMs: 2_900 }),
      buildRecord({ completedAt: 11_000, moveCount: 7, aidCount: 1 }),
      buildRecord({ puzzleId: "v1-puzzle-2", moveCount: 1 })
    ];

    expect(getBestCompletionForPuzzle(records, "v1-puzzle-1", "v1")).toEqual(records[2]);
  });
});
