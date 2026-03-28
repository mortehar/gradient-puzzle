import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPublishedCatalog } from "../domain";
import { usePuzzleSession } from "./usePuzzleSession";

function SessionHarness() {
  const session = usePuzzleSession();

  return (
    <>
      <p data-testid="session-status">{session.game.status}</p>
      <p data-testid="session-puzzle-label">{session.currentPuzzleLabel}</p>
      <p data-testid="session-slider-index">{session.sliderIndex}</p>
      <p data-testid="session-grid">
        {session.game.config.width} x {session.game.config.height}
      </p>
      <p data-testid="session-can-advance">{String(session.canAdvancePuzzle)}</p>
      <button type="button" onClick={() => session.actions.setSliderIndex(1)}>
        Puzzle 2
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
    </>
  );
}

describe("usePuzzleSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
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
    expect(screen.getByTestId("session-slider-index")).toHaveTextContent("59");
  });
});
