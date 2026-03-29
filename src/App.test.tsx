import { act, cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGameFromPublishedPuzzle, findBestAidMove, getPublishedCatalog, isSolved, swapTiles } from "./features/puzzle/domain";
import App from "./App";

function buildAidSolvePlan(puzzle: ReturnType<typeof getPublishedCatalog>["puzzles"][number]) {
  const game = createGameFromPublishedPuzzle(puzzle);
  const plan = [];
  let tiles = game.scrambledTiles;

  while (!isSolved(tiles) && plan.length < tiles.length) {
    const aidMove = findBestAidMove(tiles, game.config);

    if (!aidMove) {
      return null;
    }

    plan.push(aidMove);
    tiles = swapTiles(tiles, aidMove.primaryFromIndex, aidMove.secondaryFromIndex);
  }

  return isSolved(tiles) ? plan : null;
}

function findShortestAidSolvePuzzle() {
  const catalog = getPublishedCatalog("v1");
  let bestMatch:
    | {
        puzzle: (typeof catalog.puzzles)[number];
        plan: NonNullable<ReturnType<typeof buildAidSolvePlan>>;
      }
    | null = null;

  for (const puzzle of catalog.puzzles) {
    const plan = buildAidSolvePlan(puzzle);

    if (plan && (!bestMatch || plan.length < bestMatch.plan.length)) {
      bestMatch = {
        puzzle,
        plan
      };
    }
  }

  if (!bestMatch) {
    throw new Error("Expected at least one published puzzle to be solvable with repeated aid moves.");
  }

  return bestMatch;
}

function openTierFromHome(tierName: string) {
  fireEvent.click(screen.getByTestId(`home-tier-card-${tierName.toLowerCase()}`));

  if (screen.queryByTestId("home-screen")) {
    fireEvent.click(screen.getByTestId(`home-tier-card-${tierName.toLowerCase()}`));
  }
}

function openPuzzleFromTier(puzzleNumber: number) {
  fireEvent.click(screen.getByTestId(`tier-puzzle-card-${puzzleNumber}`));

  if (screen.queryByTestId("tier-screen")) {
    fireEvent.click(screen.getByTestId(`tier-puzzle-card-${puzzleNumber}`));
  }
}

describe("App", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    window.localStorage.clear();
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => null)
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts on the home screen and removes the old puzzle controls", () => {
    render(<App />);

    expect(screen.getByTestId("home-screen")).toBeInTheDocument();
    expect(screen.getByTestId("home-tier-progress-easy")).toHaveTextContent("0/10");
    expect(screen.queryByTestId("difficulty-slider")).not.toBeInTheDocument();
    expect(screen.queryByTestId("advanced-settings-toggle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("aid-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("new-puzzle-button")).not.toBeInTheDocument();
  });

  it("opens a tier on its first incomplete puzzle and ignores aided runs in home progress", () => {
    const catalog = getPublishedCatalog("v1");
    const easyPuzzles = catalog.puzzles.filter((puzzle) => puzzle.tier === "Easy");

    window.localStorage.setItem(
      "gradient:puzzle-history:v1",
      JSON.stringify({
        version: 1,
        completions: [
          {
            puzzleId: easyPuzzles[0]!.id,
            catalogVersion: "v1",
            sliderIndex: easyPuzzles[0]!.sliderIndex,
            tier: "Easy",
            tierIndex: 1,
            moveCount: 7,
            aidCount: 0,
            startedAt: 1_000,
            completedAt: 8_000,
            solveDurationMs: 7_000
          },
          {
            puzzleId: easyPuzzles[1]!.id,
            catalogVersion: "v1",
            sliderIndex: easyPuzzles[1]!.sliderIndex,
            tier: "Easy",
            tierIndex: 2,
            moveCount: 8,
            aidCount: 0,
            startedAt: 2_000,
            completedAt: 9_000,
            solveDurationMs: 7_000
          },
          {
            puzzleId: easyPuzzles[2]!.id,
            catalogVersion: "v1",
            sliderIndex: easyPuzzles[2]!.sliderIndex,
            tier: "Easy",
            tierIndex: 3,
            moveCount: 9,
            aidCount: 1,
            startedAt: 3_000,
            completedAt: 11_000,
            solveDurationMs: 8_000
          }
        ]
      })
    );

    render(<App />);

    expect(screen.getByTestId("home-tier-progress-easy")).toHaveTextContent("2/10");

    openTierFromHome("easy");

    expect(screen.getByTestId("tier-screen")).toBeInTheDocument();
    expect(screen.getByTestId("tier-number-label-3")).toHaveClass("tier-number-label-active");
  });

  it("returns from a tier to the home screen and keeps the selected tier visible", () => {
    render(<App />);

    openTierFromHome("medium");

    expect(screen.getByText("Medium")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("tier-back-button"));

    expect(screen.getByTestId("home-screen")).toBeInTheDocument();
    expect(screen.getByTestId("home-tier-card-medium")).toHaveClass("tier-card-active");
  });

  it("opens a puzzle from the tier screen and aborts back to the same puzzle card after a two-second hold", () => {
    render(<App />);

    openTierFromHome("easy");
    openPuzzleFromTier(5);

    expect(screen.getByTestId("puzzle-screen")).toBeInTheDocument();
    expect(screen.getByTestId("abort-control")).toBeInTheDocument();
    expect(screen.queryByTestId("aid-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("new-puzzle-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("difficulty-slider")).not.toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId("abort-hold-hitbox"), { pointerId: 1 });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId("tier-screen")).toBeInTheDocument();
    expect(screen.getByTestId("tier-number-label-5")).toHaveClass("tier-number-label-active");
  });

  it("preserves the solve ceremony on the puzzle screen", () => {
    const { puzzle, plan } = findShortestAidSolvePuzzle();

    render(<App />);

    openTierFromHome(puzzle.tier);
    openPuzzleFromTier(puzzle.tierIndex);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    plan.forEach((aidMove) => {
      const fromTile = screen.getByTestId(`tile-${aidMove.primaryFromIndex}`);
      const toTile = screen.getByTestId(`tile-${aidMove.secondaryFromIndex}`);
      vi.mocked(document.elementFromPoint).mockReturnValue(toTile);

      fireEvent.pointerDown(fromTile, { pointerId: 1, pointerType: "mouse", clientX: 10, clientY: 10 });
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 20, clientY: 20 });
    });

    expect(screen.getByTestId("puzzle-board")).toHaveAttribute("data-ceremony-phase", "fading-locks");
    expect(screen.queryByTestId("completion-checkmark")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("puzzle-board")).toHaveAttribute("data-ceremony-phase", "checkmark");
    expect(screen.getByTestId("completion-checkmark")).toBeInTheDocument();
  });

  it("prevents native context-menu selection on the puzzle board", () => {
    render(<App />);

    openTierFromHome("easy");
    openPuzzleFromTier(1);

    const board = screen.getByTestId("puzzle-board");
    const event = createEvent.contextMenu(board);

    fireEvent(board, event);

    expect(event.defaultPrevented).toBe(true);
  });
});
