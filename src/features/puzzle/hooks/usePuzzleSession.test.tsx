import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePuzzleSession } from "./usePuzzleSession";

function SessionHarness() {
  const session = usePuzzleSession();

  return (
    <>
      <p data-testid="session-status">{session.game.status}</p>
      <p data-testid="session-grid">
        {session.game.config.width} x {session.game.config.height}
      </p>
      <p data-testid="preview-grid">
        {session.previewConfig.width} x {session.previewConfig.height}
      </p>
      <button type="button" onClick={() => session.actions.setSetupMode("custom")}>
        Custom Mode
      </button>
      <button type="button" onClick={() => session.actions.updateWidth(7)}>
        Width 7
      </button>
      <button type="button" onClick={() => session.actions.updateHeight(4)}>
        Height 4
      </button>
      <button type="button" onClick={() => session.actions.updateHeight(7)}>
        Height 7
      </button>
      <button type="button" onClick={session.actions.startNewPuzzle}>
        New Puzzle
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

  it("restarts back into preview when a new puzzle is requested", () => {
    render(<SessionHarness />);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByTestId("session-status")).not.toHaveTextContent("preview");

    fireEvent.click(screen.getByText("New Puzzle"));

    expect(screen.getByTestId("session-status")).toHaveTextContent("preview");
  });

  it("keeps custom preview dimensions portrait-safe through session actions", () => {
    render(<SessionHarness />);

    fireEvent.click(screen.getByText("Custom Mode"));
    fireEvent.click(screen.getByText("Width 7"));

    expect(screen.getByTestId("preview-grid")).toHaveTextContent("5 x 5");

    fireEvent.click(screen.getByText("Height 7"));
    fireEvent.click(screen.getByText("Width 7"));

    expect(screen.getByTestId("preview-grid")).toHaveTextContent("7 x 7");

    fireEvent.click(screen.getByText("Height 4"));

    expect(screen.getByTestId("preview-grid")).toHaveTextContent("7 x 7");
  });
});
