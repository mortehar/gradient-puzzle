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

describe("App", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function openAdvancedSettings() {
    if (!screen.queryByTestId("advanced-settings-panel")) {
      fireEvent.click(screen.getByTestId("advanced-settings-toggle"));
    }
  }

  it("renders the published-puzzle footer and keeps custom controls out of the player UI", () => {
    render(<App />);

    expect(screen.getByTestId("board-footer")).toBeInTheDocument();
    expect(screen.getByTestId("difficulty-slider")).toHaveValue("0");
    expect(screen.getByTestId("difficulty-slider-label")).toHaveTextContent("Puzzle: #1 (Easy)");
    expect(screen.getByTestId("new-puzzle-button")).toHaveTextContent("Next");
    expect(screen.queryByText(/Best:/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("advanced-settings-panel")).not.toBeInTheDocument();

    openAdvancedSettings();

    expect(screen.getByTestId("advanced-settings-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("cell-spacing-slider")).not.toBeInTheDocument();
    expect(screen.queryByTestId("cell-rounding-slider")).not.toBeInTheDocument();
    expect(screen.queryByTestId("lock-rounding-slider")).not.toBeInTheDocument();
    expect(screen.queryByTestId("lock-thickness-slider")).not.toBeInTheDocument();
    expect(screen.queryByTestId("aid-time-slider")).not.toBeInTheDocument();
    expect(screen.getByText("Catalog")).toBeInTheDocument();
    expect(screen.getByText("V1")).toBeInTheDocument();
    expect(screen.queryByTestId("setup-mode-custom")).not.toBeInTheDocument();
    expect(screen.queryByTestId("width-slider")).not.toBeInTheDocument();
    expect(screen.queryByTestId("research-panel")).not.toBeInTheDocument();
  });

  it("advances to the next published puzzle and updates the slider label", () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("new-puzzle-button"));

    expect(screen.getByTestId("difficulty-slider")).toHaveValue("1");
    expect(screen.getByTestId("difficulty-slider-label")).toHaveTextContent("Puzzle: #2 (Easy)");
  });

  it("loads a new published puzzle immediately when the slider moves", () => {
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      vi.advanceTimersByTime(920);
    });

    expect(screen.getByTestId("aid-button")).not.toBeDisabled();

    fireEvent.change(screen.getByTestId("difficulty-slider"), { target: { value: "10" } });

    expect(screen.getByTestId("difficulty-slider-label")).toHaveTextContent("Puzzle: #1 (Medium)");
    expect(screen.getByTestId("aid-button")).toBeDisabled();
    expect(screen.queryByTestId("scramble-overlay")).not.toBeInTheDocument();
    expect(screen.getByTestId("puzzle-board")).toHaveClass("board-no-motion");
  });

  it("keeps the board flush and removes all cell appearance controls from advanced settings", () => {
    render(<App />);

    openAdvancedSettings();

    const board = screen.getByTestId("puzzle-board");

    expect(board).not.toHaveStyle("--tile-gap: 12px");
    expect(board).not.toHaveStyle("--tile-radius: 3px");
    expect(board).not.toHaveStyle("--tile-inner-radius: 5px");
    expect(board).not.toHaveStyle("--tile-lock-width: 6px");
    expect(screen.queryByTestId("aid-time-slider")).not.toBeInTheDocument();
  });

  it("disables Next on the final published puzzle", () => {
    render(<App />);

    fireEvent.change(screen.getByTestId("difficulty-slider"), { target: { value: "49" } });

    expect(screen.getByTestId("difficulty-slider-label")).toHaveTextContent("Puzzle: #10 (Master)");
    expect(screen.getByTestId("new-puzzle-button")).toBeDisabled();
  });

  it("counts aids toward swaps and shows the staged aid overlays", () => {
    render(<App />);

    expect(screen.getByTestId("aid-button")).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    fireEvent.click(screen.getByTestId("aid-button"));

    expect(screen.getByTestId("aid-button")).toBeDisabled();
    expect(screen.getByText("MOVES: 1")).toBeInTheDocument();
    expect(screen.getByText("(1 aids used)")).toBeInTheDocument();
    expect(screen.getByText("Score ineligible")).toBeInTheDocument();
    expect(screen.queryByText("Best: 1")).not.toBeInTheDocument();
    expect(screen.getByTestId("aid-primary-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("aid-secondary-overlay")).toBeInTheDocument();
  });

  it("shows the stored best move count for the active puzzle when an eligible score exists", () => {
    window.localStorage.setItem(
      "gradient:puzzle-history:v1",
      JSON.stringify({
        version: 1,
        completions: [
          {
            puzzleId: "v1/easy/1",
            catalogVersion: "v1",
            sliderIndex: 0,
            tier: "Easy",
            tierIndex: 1,
            moveCount: 7,
            aidCount: 0,
            startedAt: 1_000,
            completedAt: 8_000,
            solveDurationMs: 7_000
          }
        ]
      })
    );

    render(<App />);

    expect(screen.getByText("Best: 7")).toBeInTheDocument();
  });

  it("fades the lock squares for one second before showing the completion checkmark", () => {
    const { puzzle, plan } = findShortestAidSolvePuzzle();

    render(<App />);

    fireEvent.change(screen.getByTestId("difficulty-slider"), { target: { value: String(puzzle.sliderIndex) } });

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    plan.forEach(() => {
      fireEvent.click(screen.getByTestId("aid-button"));

      act(() => {
        vi.advanceTimersByTime(1000);
      });
    });

    expect(screen.getByTestId("puzzle-board")).toHaveAttribute("data-ceremony-phase", "fading-locks");
    expect(screen.queryByTestId("completion-checkmark")).not.toBeInTheDocument();
    expect(screen.getByTestId("new-puzzle-button")).toHaveClass("new-button-celebrating");

    act(() => {
      vi.advanceTimersByTime(999);
    });

    expect(screen.queryByTestId("completion-checkmark")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByTestId("puzzle-board")).toHaveAttribute("data-ceremony-phase", "checkmark");
    expect(screen.getByTestId("completion-checkmark")).toBeInTheDocument();
  });

  it("prevents native context-menu selection on the puzzle board", () => {
    render(<App />);

    const board = screen.getByTestId("puzzle-board");
    const event = createEvent.contextMenu(board);

    fireEvent(board, event);

    expect(event.defaultPrevented).toBe(true);
  });
});
