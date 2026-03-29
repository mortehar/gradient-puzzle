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
        previewConfig={session.previewConfig}
        orderedTiles={session.orderedTiles}
        lockedTileStyle={DEFAULT_LOCKED_TILE_STYLE}
        transitionMode={session.transitionMode}
        activeScrambleFlip={session.activeScrambleFlip}
        completionCeremonyPhase={session.completionCeremonyPhase}
        dragTileId={session.dragTile?.id ?? null}
        dragPointerType={session.dragPointerType}
        isInteractive={session.isInteractive}
        onTilePointerDown={handleTilePointerDown}
      />
      <p data-testid="session-status">{session.game.status}</p>
      <p data-testid="session-puzzle-label">{session.currentPuzzleLabel}</p>
      <p data-testid="session-best-moves">{session.bestCompletion?.moveCount ?? "none"}</p>
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

    expect(screen.getByTestId("session-best-moves")).toHaveTextContent(String(plan.length));
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

  it("cancels the abort hold if released early", () => {
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

    expect(screen.getByTestId("abort-progress")).toBeInTheDocument();
    expect(onAbort).not.toHaveBeenCalled();

    fireEvent.pointerUp(screen.getByTestId("abort-hold-hitbox"), { pointerId: 1 });

    expect(screen.queryByTestId("abort-progress")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onAbort).not.toHaveBeenCalled();
  });

  it("aborts the puzzle after a full two-second hold", () => {
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
      vi.advanceTimersByTime(2000);
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

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      vi.advanceTimersByTime(920);
    });

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
