import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./game", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./game")>();

  return {
    ...actual,
    createNewGame: (config: typeof actual.DEFAULT_CONFIG) => {
      const solvedTiles = actual.buildSolvedTiles(
        [
          { h: 0, s: 100, l: 50 },
          { h: 90, s: 100, l: 50 },
          { h: 180, s: 100, l: 50 },
          { h: 270, s: 100, l: 50 }
        ],
        actual.normalizeConfig(config)
      );
      const movableIndexes = solvedTiles.filter((tile) => !tile.locked).map((tile) => tile.currentIndex);
      const [firstIndex, secondIndex] = movableIndexes;
      const scrambledTiles = actual.swapTiles(solvedTiles, firstIndex, secondIndex);

      return {
        tiles: solvedTiles,
        scrambledTiles,
        swapCount: 0,
        hintCount: 0,
        status: "preview" as const,
        config: actual.normalizeConfig(config)
      };
    }
  };
});

describe("App", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders the puzzle first and settings second with no hero copy or bottom help text", () => {
    render(<App />);

    const layout = document.querySelector(".app-layout");
    const sections = layout ? Array.from(layout.children) : [];

    expect(sections[0]).toHaveClass("board-panel");
    expect(sections[1].tagName).toBe("ASIDE");
    expect(screen.queryByText(/Rebuild the color flow/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-copy")).not.toBeInTheDocument();
    expect(screen.getByText("Cell Appearance")).toBeInTheDocument();
    expect(screen.getByTestId("board-footer")).toBeInTheDocument();
    expect(screen.getByText("Current score")).toBeInTheDocument();
    expect(screen.queryByTestId("sat-distance-slider")).not.toBeInTheDocument();
    expect(screen.getByTestId("lum-max-slider")).toBeInTheDocument();
  });

  it("uses zero-disabled line settings for the next puzzle", () => {
    render(<App />);

    fireEvent.change(screen.getByTestId("width-slider"), { target: { value: "7" } });
    fireEvent.change(screen.getByTestId("height-slider"), { target: { value: "5" } });
    fireEvent.change(screen.getByTestId("vertical-count-slider"), { target: { value: "3" } });
    fireEvent.change(screen.getByTestId("vertical-density-slider"), { target: { value: "1" } });
    expect(screen.getAllByText("Spacing").length).toBeGreaterThan(0);
    expect(screen.queryByText("Density")).not.toBeInTheDocument();

    expect(screen.getByTestId("next-locked-count")).toHaveTextContent("9");

    fireEvent.click(screen.getByText("New"));

    expect(screen.getByText("7 x 5")).toBeInTheDocument();
    expect(screen.getByText("Locked").parentElement?.querySelector("strong")?.textContent).toBe("9");
    expect(screen.getByTestId("puzzle-board")).toHaveClass("board-no-motion");

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId("puzzle-board")).toHaveClass("board-scramble-flip");
    expect(screen.getByTestId("scramble-overlay")).toBeInTheDocument();
  });

  it("counts aids toward swaps and shows the staged aid overlays in the persistent footer layout", () => {
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
    expect(screen.getByTestId("aid-count")).toHaveTextContent("1");
    expect(screen.getByText("Swaps").parentElement?.querySelector("strong")?.textContent).toBe("1");
    expect(screen.getByText("1 swaps")).toBeInTheDocument();
    expect(screen.getByText("Current score")).toBeInTheDocument();
    expect(screen.getByTestId("aid-primary-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("aid-secondary-overlay")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByTestId("completion-summary")).toBeInTheDocument();
    expect(screen.getByText("Puzzle complete")).toBeInTheDocument();
    expect(screen.getByText("Aids used: 1")).toBeInTheDocument();
    expect(screen.queryByText(/^Hint$/i)).not.toBeInTheDocument();
  });

  it("applies an aid instantly when aid time is set to zero", () => {
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    fireEvent.change(screen.getByTestId("aid-time-slider"), { target: { value: "0" } });
    fireEvent.click(screen.getByTestId("aid-button"));

    expect(screen.getByTestId("completion-summary")).toBeInTheDocument();
    expect(screen.queryByTestId("aid-primary-overlay")).not.toBeInTheDocument();
    expect(screen.queryByTestId("aid-secondary-overlay")).not.toBeInTheDocument();
  });

  it("updates cell appearance immediately from the settings sliders", () => {
    render(<App />);

    fireEvent.change(screen.getByTestId("cell-spacing-slider"), { target: { value: "12" } });
    fireEvent.change(screen.getByTestId("cell-rounding-slider"), { target: { value: "3" } });
    fireEvent.change(screen.getByTestId("aid-time-slider"), { target: { value: "2.3" } });

    const board = screen.getByTestId("puzzle-board");

    expect(board).toHaveStyle("--tile-gap: 12px");
    expect(board).toHaveStyle("--tile-radius: 3px");
    expect(screen.getByText("2.3")).toBeInTheDocument();
  });

  it("shows movable-only flip cards during scramble and clears them when play begins", () => {
    render(<App />);

    expect(screen.queryByTestId("scramble-overlay")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId("scramble-overlay")).toBeInTheDocument();
    expect(screen.getAllByTestId(/scramble-flip-/).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("scramble-flip-0")).not.toBeInTheDocument();
    expect(screen.getByTestId("scramble-flip-1")).toHaveStyle("--scramble-flip-delay: 31ms");
    expect(screen.getByTestId("scramble-flip-23")).toHaveStyle("--scramble-flip-delay: 220ms");
    expect(screen.getByTestId("aid-button")).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(920);
    });

    expect(screen.queryByTestId("scramble-overlay")).not.toBeInTheDocument();
    expect(screen.getByTestId("aid-button")).not.toBeDisabled();
  });

  it("starts with zero spacing and rounding and keeps the footer actions below the board", () => {
    render(<App />);

    expect(screen.getByTestId("width-slider")).toHaveValue("5");
    expect(screen.getByTestId("height-slider")).toHaveValue("5");
    expect(screen.getByTestId("vertical-count-slider")).toHaveValue("2");
    expect(screen.getByTestId("vertical-density-slider")).toHaveValue("1");
    expect(screen.getByTestId("cell-spacing-slider")).toHaveValue("0");
    expect(screen.getByTestId("cell-rounding-slider")).toHaveValue("0");
    expect(screen.getByTestId("aid-time-slider")).toHaveValue("1");
    expect(screen.getByTestId("sat-value-slider")).toHaveValue("25");
    expect(screen.getByTestId("lum-value-slider")).toHaveValue("10");
    expect(screen.getByTestId("lum-max-slider")).toHaveValue("85");

    const footerActions = screen.getByTestId("board-footer-actions");
    expect(footerActions.children[0]).toHaveTextContent("Aid");
    expect(footerActions.children[1]).toHaveTextContent("New");

    const settingsCard = document.querySelector(".status-card");
    expect(settingsCard).not.toHaveTextContent("New Puzzle");
  });

  it("disables starting a new puzzle when too many cells would be locked", () => {
    render(<App />);

    fireEvent.change(screen.getByTestId("width-slider"), { target: { value: "3" } });
    fireEvent.change(screen.getByTestId("height-slider"), { target: { value: "3" } });
    fireEvent.change(screen.getByTestId("vertical-count-slider"), { target: { value: "2" } });
    fireEvent.change(screen.getByTestId("vertical-density-slider"), { target: { value: "0" } });
    fireEvent.change(screen.getByTestId("horizontal-count-slider"), { target: { value: "2" } });
    fireEvent.change(screen.getByTestId("horizontal-density-slider"), { target: { value: "0" } });

    expect(screen.getByText("New")).toBeDisabled();
    expect(screen.getByTestId("settings-warning")).toBeInTheDocument();
  });

  it("lets the edited luminosity slider win when min and max overlap", () => {
    render(<App />);

    fireEvent.change(screen.getByTestId("lum-max-slider"), { target: { value: "5" } });
    expect(screen.getByTestId("lum-value-slider")).toHaveValue("5");
    expect(screen.getByTestId("lum-max-slider")).toHaveValue("5");

    fireEvent.change(screen.getByTestId("lum-value-slider"), { target: { value: "80" } });
    expect(screen.getByTestId("lum-value-slider")).toHaveValue("80");
    expect(screen.getByTestId("lum-max-slider")).toHaveValue("80");
  });
});
