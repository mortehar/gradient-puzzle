import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGameFromPublishedPuzzle,
  findBestAidMove,
  getPublishedCatalog,
  isSolved,
  swapTiles,
  type PublishedPuzzle
} from "../domain";
import { PuzzleBoard } from "../ui/PuzzleBoard";
import { PuzzlePlayScreen } from "../ui/PuzzlePlayScreen";
import { DEFAULT_LOCKED_TILE_STYLE } from "../ui/lockedTileStyles";
import { usePuzzleSession } from "./usePuzzleSession";
import type { LocalPuzzleCompletionRecord } from "./puzzleCompletionHistory";

function buildAidSolvePlan(puzzle: PublishedPuzzle) {
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

type SessionHarnessProps = {
  puzzle?: PublishedPuzzle;
  completionHistory?: LocalPuzzleCompletionRecord[];
  onRecordCompletion?: (record: LocalPuzzleCompletionRecord) => void;
};

function SessionHarness({
  puzzle = getPublishedCatalog("v1").puzzles[0]!,
  completionHistory = [],
  onRecordCompletion = vi.fn()
}: SessionHarnessProps) {
  const session = usePuzzleSession({
    puzzle,
    completionHistory,
    onRecordCompletion
  });

  function handleTilePointerDown(tile: (typeof session.orderedTiles)[number], event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    session.actions.beginDrag(tile, event.pointerId, event.pointerType, event.clientX, event.clientY);
  }

  return (
    <>
      <PuzzleBoard
        game={session.game}
        orderedTiles={session.orderedTiles}
        lockedTileStyle={DEFAULT_LOCKED_TILE_STYLE}
        transitionMode={session.transitionMode}
        activeAidAnimation={session.activeAidAnimation}
        activeScrambleFlip={session.activeScrambleFlip}
        completionCeremonyPhase={session.completionCeremonyPhase}
        dragTileId={session.dragTile?.id ?? null}
        dragTargetIndex={session.dragTargetIndex}
        dragPointerType={session.dragPointerType}
        isInteractive={session.isInteractive}
        onTilePointerDown={handleTilePointerDown}
      />
      <p data-testid="session-status">{session.game.status}</p>
      <p data-testid="session-swap-count">{session.game.swapCount}</p>
      <p data-testid="session-aid-count">{session.game.hintCount}</p>
      <p data-testid="session-drag-target-index">{session.dragTargetIndex ?? "none"}</p>
      <p data-testid="session-score-eligible">{String(session.isScoreEligible)}</p>
      <p data-testid="session-best-moves">{session.bestCompletion?.moveCount ?? "none"}</p>
      <button type="button" onClick={session.actions.useAid}>
        Use Aid
      </button>
    </>
  );
}

function SessionHarnessWithHistory({ puzzle }: { puzzle: PublishedPuzzle }) {
  const [history, setHistory] = useState<LocalPuzzleCompletionRecord[]>([]);

  return (
    <SessionHarness
      puzzle={puzzle}
      completionHistory={history}
      onRecordCompletion={(record) => {
        setHistory((currentHistory) => [...currentHistory, record]);
      }}
    />
  );
}

function advanceSessionToPlaying() {
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  act(() => {
    vi.advanceTimersByTime(920);
  });
}

function getBoardTiles() {
  const boardTiles = screen.getAllByRole("gridcell") as HTMLButtonElement[];
  const movableTiles = boardTiles.filter((tile) => !tile.getAttribute("aria-label")?.includes("locked tile"));
  const lockedTile = boardTiles.find((tile) => tile.getAttribute("aria-label")?.includes("locked tile")) ?? null;

  if (movableTiles.length < 2) {
    throw new Error("Expected at least two movable tiles on the board.");
  }

  return {
    fromTile: movableTiles[0]!,
    toTile: movableTiles[1]!,
    lockedTile
  };
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

  it("moves through preview, scramble, and playing states for an injected puzzle", () => {
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

  it("records a manual solve and updates the current best score for the puzzle", () => {
    const { puzzle, plan } = findShortestAidSolvePuzzle();

    render(<SessionHarnessWithHistory puzzle={puzzle} />);

    advanceSessionToPlaying();
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

    expect(screen.getByTestId("session-best-moves")).toHaveTextContent(String(plan.length));
  });

  it("records aided solves without updating the score-eligible best", () => {
    const { puzzle, plan } = findShortestAidSolvePuzzle();

    render(<SessionHarnessWithHistory puzzle={puzzle} />);

    advanceSessionToPlaying();

    plan.forEach(() => {
      fireEvent.click(screen.getByText("Use Aid"));

      act(() => {
        vi.advanceTimersByTime(1000);
      });
    });

    expect(screen.getByTestId("session-status")).toHaveTextContent("solved");
    expect(screen.getByTestId("session-aid-count")).toHaveTextContent(String(plan.length));
    expect(screen.getByTestId("session-score-eligible")).toHaveTextContent("false");
    expect(screen.getByTestId("session-best-moves")).toHaveTextContent("none");
  });

  it("highlights the current movable drop target and clears invalid targets during drag", () => {
    render(<SessionHarness />);

    advanceSessionToPlaying();

    const { fromTile, toTile, lockedTile } = getBoardTiles();

    fireEvent.pointerDown(fromTile, { pointerId: 1, pointerType: "touch", clientX: 10, clientY: 10 });

    vi.mocked(document.elementFromPoint).mockReturnValue(toTile);
    fireEvent.pointerMove(window, { pointerId: 1, pointerType: "touch", clientX: 20, clientY: 20 });

    expect(screen.getByTestId("session-drag-target-index")).toHaveTextContent(toTile.dataset.currentIndex!);
    expect(toTile).toHaveClass("tile-drop-target");

    vi.mocked(document.elementFromPoint).mockReturnValue(fromTile);
    fireEvent.pointerMove(window, { pointerId: 1, pointerType: "touch", clientX: 18, clientY: 18 });

    expect(screen.getByTestId("session-drag-target-index")).toHaveTextContent("none");
    expect(fromTile).not.toHaveClass("tile-drop-target");
    expect(toTile).not.toHaveClass("tile-drop-target");

    if (lockedTile) {
      vi.mocked(document.elementFromPoint).mockReturnValue(lockedTile);
      fireEvent.pointerMove(window, { pointerId: 1, pointerType: "touch", clientX: 16, clientY: 16 });

      expect(screen.getByTestId("session-drag-target-index")).toHaveTextContent("none");
      expect(lockedTile).not.toHaveClass("tile-drop-target");
    }

    vi.mocked(document.elementFromPoint).mockReturnValue(null);
    fireEvent.pointerMove(window, { pointerId: 1, pointerType: "touch", clientX: 14, clientY: 14 });

    expect(screen.getByTestId("session-drag-target-index")).toHaveTextContent("none");
  });

  it("clears the live drop target when the drag is cancelled", () => {
    render(<SessionHarness />);

    advanceSessionToPlaying();

    const { fromTile, toTile } = getBoardTiles();

    fireEvent.pointerDown(fromTile, { pointerId: 1, pointerType: "touch", clientX: 10, clientY: 10 });

    vi.mocked(document.elementFromPoint).mockReturnValue(toTile);
    fireEvent.pointerMove(window, { pointerId: 1, pointerType: "touch", clientX: 20, clientY: 20 });

    expect(screen.getByTestId("session-drag-target-index")).toHaveTextContent(toTile.dataset.currentIndex!);
    expect(toTile).toHaveClass("tile-drop-target");

    fireEvent.pointerCancel(window, { pointerId: 1, pointerType: "touch" });

    expect(screen.getByTestId("session-drag-target-index")).toHaveTextContent("none");
    expect(toTile).not.toHaveClass("tile-drop-target");
  });

  it("uses the final pointer location for drop validation instead of a stale hover target", () => {
    render(<SessionHarness />);

    advanceSessionToPlaying();

    const { fromTile, toTile } = getBoardTiles();

    fireEvent.pointerDown(fromTile, { pointerId: 1, pointerType: "touch", clientX: 10, clientY: 10 });

    vi.mocked(document.elementFromPoint).mockReturnValue(toTile);
    fireEvent.pointerMove(window, { pointerId: 1, pointerType: "touch", clientX: 20, clientY: 20 });

    expect(screen.getByTestId("session-drag-target-index")).toHaveTextContent(toTile.dataset.currentIndex!);
    expect(toTile).toHaveClass("tile-drop-target");

    vi.mocked(document.elementFromPoint).mockReturnValue(null);
    fireEvent.pointerUp(window, { pointerId: 1, pointerType: "touch", clientX: 30, clientY: 30 });

    expect(screen.getByTestId("session-swap-count")).toHaveTextContent("0");
    expect(screen.getByTestId("session-drag-target-index")).toHaveTextContent("none");
    expect(toTile).not.toHaveClass("tile-drop-target");
  });

  it("reads an existing personal best from the provided completion history", () => {
    const puzzle = getPublishedCatalog("v1").puzzles[0]!;

    render(
      <SessionHarness
        puzzle={puzzle}
        completionHistory={[
          {
            puzzleId: puzzle.id,
            catalogVersion: puzzle.catalogVersion,
            sliderIndex: puzzle.sliderIndex,
            tier: puzzle.tier,
            tierIndex: puzzle.tierIndex,
            moveCount: 7,
            aidCount: 0,
            startedAt: 1_000,
            completedAt: 8_000,
            solveDurationMs: 7_000
          }
        ]}
      />
    );

    expect(screen.getByTestId("session-best-moves")).toHaveTextContent("7");
  });

  it("keeps the abort hold progress visible briefly after an early release", () => {
    const onAbort = vi.fn();

    render(
      <PuzzlePlayScreen
        puzzle={getPublishedCatalog("v1").puzzles[0]!}
        completionHistory={[]}
        lockedTileStyle={DEFAULT_LOCKED_TILE_STYLE}
        onRecordCompletion={vi.fn()}
        onAbort={onAbort}
      />
    );

    fireEvent.pointerDown(screen.getByTestId("abort-hold-hitbox"), { pointerId: 1 });

    act(() => {
      vi.advanceTimersByTime(1125);
    });

    expect(screen.getByTestId("abort-progress")).toBeInTheDocument();
    expect(onAbort).not.toHaveBeenCalled();

    fireEvent.pointerUp(screen.getByTestId("abort-hold-hitbox"), { pointerId: 1 });
    fireEvent.pointerLeave(screen.getByTestId("abort-hold-hitbox"), { pointerId: 1 });

    expect(screen.getByTestId("abort-progress")).toBeInTheDocument();
    expect(screen.getByTestId("abort-progress-fill")).toHaveStyle({ transform: "scaleX(0.75)" });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("abort-progress")).toBeInTheDocument();
    expect(screen.getByTestId("abort-progress-fill")).toHaveStyle({ transform: "scaleX(0.375)" });

    act(() => {
      vi.advanceTimersByTime(499);
    });

    expect(screen.getByTestId("abort-progress")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.queryByTestId("abort-progress")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onAbort).not.toHaveBeenCalled();
  });

  it("requires a hold for the first aid and then makes later aids instant", () => {
    render(
      <PuzzlePlayScreen
        puzzle={getPublishedCatalog("v1").puzzles[0]!}
        completionHistory={[]}
        lockedTileStyle={DEFAULT_LOCKED_TILE_STYLE}
        onRecordCompletion={vi.fn()}
        onAbort={vi.fn()}
      />
    );

    advanceSessionToPlaying();

    expect(screen.getByText("Moves: 0")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId("aid-hold-hitbox"), { pointerId: 1 });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("aid-progress")).toBeInTheDocument();
    expect(screen.getByText("Hold to get help", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("but no score", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Moves: 0")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText("Moves: 1")).toBeInTheDocument();
    expect(screen.queryByTestId("aid-hold-hitbox")).not.toBeInTheDocument();
    expect(screen.getByTestId("aid-button")).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("aid-button")).not.toBeDisabled();

    fireEvent.click(screen.getByTestId("aid-button"));

    expect(screen.getByText("Moves: 2")).toBeInTheDocument();
  });

  it("aborts the puzzle after a full 1.5-second hold", () => {
    const onAbort = vi.fn();

    render(
      <PuzzlePlayScreen
        puzzle={getPublishedCatalog("v1").puzzles[0]!}
        completionHistory={[]}
        lockedTileStyle={DEFAULT_LOCKED_TILE_STYLE}
        onRecordCompletion={vi.fn()}
        onAbort={onAbort}
      />
    );

    fireEvent.pointerDown(screen.getByTestId("abort-hold-hitbox"), { pointerId: 1 });

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onAbort).toHaveBeenCalledTimes(1);
  });

  it("lets the back button abort immediately after the puzzle is solved", () => {
    const { puzzle, plan } = findShortestAidSolvePuzzle();
    const onAbort = vi.fn();

    render(
      <PuzzlePlayScreen
        puzzle={puzzle}
        completionHistory={[]}
        lockedTileStyle={DEFAULT_LOCKED_TILE_STYLE}
        onRecordCompletion={vi.fn()}
        onAbort={onAbort}
      />
    );

    advanceSessionToPlaying();

    plan.forEach((aidMove) => {
      const fromTile = screen.getByTestId(`tile-${aidMove.primaryFromIndex}`);
      const toTile = screen.getByTestId(`tile-${aidMove.secondaryFromIndex}`);
      vi.mocked(document.elementFromPoint).mockReturnValue(toTile);

      fireEvent.pointerDown(fromTile, { pointerId: 1, pointerType: "mouse", clientX: 10, clientY: 10 });
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 20, clientY: 20 });
    });

    fireEvent.click(screen.getByTestId("abort-button"));

    expect(onAbort).toHaveBeenCalledTimes(1);
  });
});
