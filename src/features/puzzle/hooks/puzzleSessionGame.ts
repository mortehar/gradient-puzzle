import { DEFAULT_CONFIG, createGameFromPublishedPuzzle, type PublishedPuzzle } from "../domain";
import type { PuzzleQaSessionBootstrap } from "../qa/bootstrap";

export function buildPuzzleSessionGame(
  puzzle: PublishedPuzzle,
  qaBootstrap: PuzzleQaSessionBootstrap | null = null
) {
  if (!qaBootstrap) {
    return createGameFromPublishedPuzzle(puzzle, DEFAULT_CONFIG.appearance);
  }

  return buildPuzzleSessionGameForPhase(puzzle, qaBootstrap.phase);
}

export function buildPuzzleSessionGameForPhase(
  puzzle: PublishedPuzzle,
  phase: PuzzleQaSessionBootstrap["phase"]
) {
  const game = createGameFromPublishedPuzzle(puzzle, DEFAULT_CONFIG.appearance);

  if (phase === "preview") {
    return game;
  }

  if (phase === "solved") {
    return {
      ...game,
      status: "solved" as const
    };
  }

  return {
    ...game,
    tiles: game.scrambledTiles,
    status: "playing" as const
  };
}
