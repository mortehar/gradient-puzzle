import type { PublishedPuzzle } from "../domain";
import type { LocalPuzzleCompletionRecord } from "./puzzleCompletionHistory";

export function buildPuzzleCompletionRecord(
  puzzle: PublishedPuzzle,
  startedAt: number,
  nextMoveCount: number,
  nextAidCount: number,
  completedAt: number
): LocalPuzzleCompletionRecord {
  return {
    puzzleId: puzzle.id,
    catalogVersion: puzzle.catalogVersion,
    sliderIndex: puzzle.sliderIndex,
    tier: puzzle.tier,
    tierIndex: puzzle.tierIndex,
    moveCount: nextMoveCount,
    aidCount: nextAidCount,
    startedAt,
    completedAt,
    solveDurationMs: Math.max(0, completedAt - startedAt)
  };
}
