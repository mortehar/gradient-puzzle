import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.useFakeTimers();
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
    expect(screen.getByTestId("difficulty-slider-label")).toHaveTextContent("Puzzle: #1 (Very easy)");
    expect(screen.getByTestId("new-puzzle-button")).toHaveTextContent("Next");
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
    expect(screen.getByTestId("difficulty-slider-label")).toHaveTextContent("Puzzle: #2 (Very easy)");
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

    expect(screen.getByTestId("difficulty-slider-label")).toHaveTextContent("Puzzle: #1 (Easy)");
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

    fireEvent.change(screen.getByTestId("difficulty-slider"), { target: { value: "59" } });

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
    expect(screen.getByTestId("aid-primary-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("aid-secondary-overlay")).toBeInTheDocument();
  });
});
