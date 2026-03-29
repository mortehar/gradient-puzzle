import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGameFromPublishedPuzzle, findBestAidMove, getPublishedCatalog, isSolved, swapTiles } from "../domain";
import { PuzzleBoard } from "../ui/PuzzleBoard";
import { usePuzzleSession } from "./usePuzzleSession";

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

function SessionHarness({ targetSliderIndex }: { targetSliderIndex?: number } = {}) {
  const session = usePuzzleSession();

  function handleTilePointerDown(tile: (typeof session.orderedTiles)[number], event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    session.actions.beginDrag(tile, event.pointerId, event.pointerType, event.clientX, event.clientY);
  }

  return (
    <>
      <PuzzleBoard
        game={session.game}
        previewConfig={session.previewConfig}
        orderedTiles={session.orderedTiles}
        transitionMode={session.transitionMode}
        activeAidAnimation={session.activeAidAnimation}
        activeScrambleFlip={session.activeScrambleFlip}
        completionCeremonyPhase={session.completionCeremonyPhase}
        dragTileId={session.dragTile?.id ?? null}
        dragPointerType={session.dragPointerType}
        isInteractive={session.isInteractive}
        onTilePointerDown={handleTilePointerDown}
      />
      <p data-testid="session-status">{session.game.status}</p>
      <p data-testid="session-puzzle-label">{session.currentPuzzleLabel}</p>
      <p data-testid="session-slider-index">{session.sliderIndex}</p>
      <p data-testid="session-grid">
        {session.game.config.width} x {session.game.config.height}
      </p>
      <p data-testid="session-can-advance">{String(session.canAdvancePuzzle)}</p>
      <p data-testid="session-score-eligible">{String(session.isScoreEligible)}</p>
      <p data-testid="session-best-moves">{session.bestCompletion?.moveCount ?? "none"}</p>
      <button type="button" onClick={() => session.actions.setSliderIndex(1)}>
        Puzzle 2
      </button>
      <button
        type="button"
        onClick={() => {
          if (targetSliderIndex !== undefined) {
            session.actions.setSliderIndex(targetSliderIndex);
          }
        }}
      >
        Target Puzzle
      </button>
      <button type="button" onClick={() => session.actions.setSliderIndex(session.sliderCount - 1)}>
        Last Puzzle
      </button>
      <button type="button" onClick={session.actions.startNextPuzzle}>
        Next Puzzle
      </button>
      <button type="button" onClick={() => session.actions.updateAppearance("aidTimeSeconds", 0)}>
        Aid Time Zero
      </button>
      <button type="button" onClick={session.actions.useAid}>
        Use Aid
      </button>
    </>
  );
}

describe("usePuzzleSession", () => {
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

  it("moves through preview, scramble, and playing states", () => {
    render(<SessionHarness />);

    expect(screen.getByTestId("session-status")).toHaveTextContent("preview");

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId("session-status")).toHaveTextContent("scrambling");

    act(() => {
      vi.advanceTimersByTime(920);
    });

    expect(screen.getByTestId("session-status")).toHaveTextContent("playing");
  });

  it("loads a deterministic published puzzle when the slider index changes", () => {
    const catalog = getPublishedCatalog("v1");
    render(<SessionHarness />);

    fireEvent.click(screen.getByText("Puzzle 2"));

    expect(screen.getByTestId("session-slider-index")).toHaveTextContent("1");
    expect(screen.getByTestId("session-puzzle-label")).toHaveTextContent(
      `#${catalog.puzzles[1].tierIndex} (${catalog.puzzles[1].tier})`
    );
    expect(screen.getByTestId("session-grid")).toHaveTextContent(
      `${catalog.puzzles[1].config.width} x ${catalog.puzzles[1].config.height}`
    );
    expect(screen.getByTestId("session-status")).toHaveTextContent("preview");
  });

  it("advances to the next published puzzle and disables progression on the last puzzle", () => {
    render(<SessionHarness />);

    fireEvent.click(screen.getByText("Next Puzzle"));
    expect(screen.getByTestId("session-slider-index")).toHaveTextContent("1");

    fireEvent.click(screen.getByText("Last Puzzle"));
    expect(screen.getByTestId("session-can-advance")).toHaveTextContent("false");

    fireEvent.click(screen.getByText("Next Puzzle"));
    expect(screen.getByTestId("session-slider-index")).toHaveTextContent("49");
  });

  it("starts the timer when play begins, records a manual solve, and exposes the new best", () => {
    const { puzzle, plan } = findShortestAidSolvePuzzle();

    render(<SessionHarness targetSliderIndex={puzzle.sliderIndex} />);

    fireEvent.click(screen.getByText("Target Puzzle"));

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      vi.advanceTimersByTime(920);
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    plan.forEach((aidMove) => {
      const fromTile = screen.getByTestId(`tile-${aidMove.primaryFromIndex}`);
      const toTile = screen.getByTestId(`tile-${aidMove.secondaryFromIndex}`);
      vi.mocked(document.elementFromPoint).mockReturnValue(toTile);

      fireEvent.pointerDown(fromTile, { pointerId: 1, pointerType: "mouse", clientX: 10, clientY: 10 });
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 20, clientY: 20 });
    });

    const stored = JSON.parse(window.localStorage.getItem("gradient:puzzle-history:v1") ?? "{}") as {
      completions?: Array<{ moveCount: number; aidCount: number; solveDurationMs: number }>;
    };

    expect(stored.completions).toHaveLength(1);
    expect(stored.completions?.[0]).toMatchObject({
      moveCount: plan.length,
      aidCount: 0,
      solveDurationMs: 5000
    });
    expect(screen.getByTestId("session-best-moves")).toHaveTextContent(String(plan.length));
  });

  it("marks the attempt ineligible after aid and resets that state on the next puzzle", () => {
    render(<SessionHarness />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("session-score-eligible")).toHaveTextContent("true");

    fireEvent.click(screen.getByText("Aid Time Zero"));
    fireEvent.click(screen.getByText("Use Aid"));

    expect(screen.getByTestId("session-score-eligible")).toHaveTextContent("false");

    fireEvent.click(screen.getByText("Next Puzzle"));

    expect(screen.getByTestId("session-score-eligible")).toHaveTextContent("true");
  });
});
