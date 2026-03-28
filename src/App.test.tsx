import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./game", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./game")>();

  function buildMockColors(width: number, height: number) {
    return Array.from({ length: width * height }, (_, index) => {
      const row = Math.floor(index / width);
      const column = index % width;
      const x = width === 1 ? 0 : column / (width - 1);
      const y = height === 1 ? 0 : row / (height - 1);
      const red = Math.round(242 - y * 80 - x * 20);
      const green = Math.round(124 + x * 95 - y * 18);
      const blue = Math.round(188 + y * 22 - x * 84);

      return `rgb(${red}, ${green}, ${blue})`;
    });
  }

  function buildMockGame(config: typeof actual.DEFAULT_CONFIG) {
    const normalizedConfig = actual.normalizeConfig(config);
    const solvedTiles = actual.buildTilesFromColors(
      buildMockColors(normalizedConfig.width, normalizedConfig.height),
      normalizedConfig
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
      config: normalizedConfig,
      difficulty: actual.analyzeStructuralDifficulty(normalizedConfig)
    };
  }

  const defaultDifficultyConfig = actual.normalizeConfig(actual.DEFAULT_CONFIG);
  const defaultDifficultyEntry = {
    config: defaultDifficultyConfig,
    rating: actual.analyzeStructuralDifficulty(defaultDifficultyConfig),
    areaBucket: "mock"
  };

  return {
    ...actual,
    pickConfigForDifficulty: () => defaultDifficultyEntry,
    createNewGame: (config: typeof actual.DEFAULT_CONFIG) => buildMockGame(config),
    createNewGameForDifficulty: (_targetScore: number, baseConfig: typeof actual.DEFAULT_CONFIG = actual.DEFAULT_CONFIG) =>
      buildMockGame(baseConfig)
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

  function switchToCustomLayout() {
    fireEvent.click(screen.getByTestId("setup-mode-custom"));
  }

  it("renders the puzzle first and settings second with no hero copy or bottom help text", () => {
    render(<App />);

    const layout = document.querySelector(".app-layout");
    const sections = layout ? Array.from(layout.children) : [];

    expect(sections[0]).toHaveClass("board-panel");
    expect(sections[1].tagName).toBe("ASIDE");
    expect(screen.queryByText(/Rebuild the color flow/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-copy")).not.toBeInTheDocument();
    expect(screen.getByText("Cell Appearance")).toBeInTheDocument();
    expect(screen.getByTestId("research-panel")).toBeInTheDocument();
    expect(screen.getByTestId("current-readability-label")).toBeInTheDocument();
    expect(screen.getByTestId("board-footer")).toBeInTheDocument();
    expect(screen.getByText("Current score")).toBeInTheDocument();
    expect(screen.queryByTestId("hue-distance-slider")).not.toBeInTheDocument();
    expect(screen.getByTestId("step-strength-slider")).toBeInTheDocument();
    expect(screen.getByTestId("difficulty-slider")).toBeInTheDocument();
    expect(screen.queryByTestId("width-slider")).not.toBeInTheDocument();
  });

  it("uses zero-disabled line settings for the next puzzle", () => {
    render(<App />);
    switchToCustomLayout();

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
    expect(screen.getByTestId("completion-burst")).toBeInTheDocument();
    expect(screen.queryByTestId("aid-primary-overlay")).not.toBeInTheDocument();
    expect(screen.queryByTestId("aid-secondary-overlay")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3800);
    });

    expect(screen.queryByTestId("completion-burst")).not.toBeInTheDocument();
  });

  it("updates cell appearance immediately from the settings sliders", () => {
    render(<App />);

    fireEvent.change(screen.getByTestId("cell-spacing-slider"), { target: { value: "12" } });
    fireEvent.change(screen.getByTestId("cell-rounding-slider"), { target: { value: "3" } });
    fireEvent.change(screen.getByTestId("lock-rounding-slider"), { target: { value: "5" } });
    fireEvent.change(screen.getByTestId("lock-thickness-slider"), { target: { value: "6" } });
    fireEvent.change(screen.getByTestId("aid-time-slider"), { target: { value: "2.3" } });

    const board = screen.getByTestId("puzzle-board");

    expect(board).toHaveStyle("--tile-gap: 12px");
    expect(board).toHaveStyle("--tile-radius: 3px");
    expect(board).toHaveStyle("--tile-inner-radius: 5px");
    expect(board).toHaveStyle("--tile-lock-width: 6px");
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

  it("does not swap tiles when they are clicked without dragging", () => {
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      vi.advanceTimersByTime(920);
    });

    fireEvent.click(screen.getByTestId("tile-1"));
    fireEvent.click(screen.getByTestId("tile-6"));

    expect(screen.getByText("0 swaps")).toBeInTheDocument();
    expect(screen.getByText("Current score")).toBeInTheDocument();
  });

  it("starts with zero spacing and rounding and keeps the footer actions below the board", () => {
    render(<App />);

    expect(screen.getByTestId("difficulty-slider")).toHaveValue("50");
    expect(screen.getByTestId("difficulty-tier-label")).toHaveTextContent("Medium");

    switchToCustomLayout();

    expect(screen.getByTestId("width-slider")).toHaveValue("5");
    expect(screen.getByTestId("height-slider")).toHaveValue("5");
    expect(screen.getByTestId("vertical-count-slider")).toHaveValue("2");
    expect(screen.getByTestId("vertical-density-slider")).toHaveValue("1");
    expect(screen.getByTestId("cell-spacing-slider")).toHaveValue("0");
    expect(screen.getByTestId("cell-rounding-slider")).toHaveValue("0");
    expect(screen.getByTestId("lock-rounding-slider")).toHaveValue("12");
    expect(screen.getByTestId("lock-thickness-slider")).toHaveValue("5");
    expect(screen.getByTestId("aid-time-slider")).toHaveValue("1");
    expect(screen.getByTestId("step-strength-slider")).toHaveValue("62");
    expect(screen.getByTestId("axis-balance-slider")).toHaveValue("78");
    expect(screen.getByTestId("lightness-range-slider")).toHaveValue("58");
    expect(screen.getByTestId("chroma-range-slider")).toHaveValue("52");
    expect(screen.getByTestId("center-preservation-slider")).toHaveValue("82");
    expect(screen.getByTestId("edge-smoothness-slider")).toHaveValue("76");

    const footerActions = screen.getByTestId("board-footer-actions");
    expect(footerActions.children[0]).toHaveTextContent("Aid");
    expect(footerActions.children[1]).toHaveTextContent("New");

    const settingsCard = document.querySelector(".status-card");
    expect(settingsCard).not.toHaveTextContent("New Puzzle");
    expect(screen.getByTestId("sample-average-score")).toBeInTheDocument();
  });

  it("disables starting a new puzzle when too many cells would be locked", () => {
    render(<App />);
    switchToCustomLayout();

    fireEvent.change(screen.getByTestId("width-slider"), { target: { value: "3" } });
    fireEvent.change(screen.getByTestId("height-slider"), { target: { value: "3" } });
    fireEvent.change(screen.getByTestId("vertical-count-slider"), { target: { value: "2" } });
    fireEvent.change(screen.getByTestId("vertical-density-slider"), { target: { value: "0" } });
    fireEvent.change(screen.getByTestId("horizontal-count-slider"), { target: { value: "2" } });
    fireEvent.change(screen.getByTestId("horizontal-density-slider"), { target: { value: "0" } });

    expect(screen.getByText("New")).toBeDisabled();
    expect(screen.getByTestId("settings-warning")).toBeInTheDocument();
  });

  it("updates the trajectory controls immediately", () => {
    render(<App />);

    fireEvent.change(screen.getByTestId("step-strength-slider"), { target: { value: "70" } });
    fireEvent.change(screen.getByTestId("axis-balance-slider"), { target: { value: "64" } });
    fireEvent.change(screen.getByTestId("center-preservation-slider"), { target: { value: "90" } });

    expect(screen.getByTestId("step-strength-slider")).toHaveValue("70");
    expect(screen.getByTestId("axis-balance-slider")).toHaveValue("64");
    expect(screen.getByTestId("center-preservation-slider")).toHaveValue("90");
  });

  it("shows inline help text when an info icon is clicked", () => {
    render(<App />);

    fireEvent.click(screen.getByLabelText("Explain Step strength"));

    expect(
      screen.getByText(
        "Targets how large the color difference should be between neighboring cells. Higher values make each local step easier to see, but can become harsh if pushed too far."
      )
    ).toBeInTheDocument();
  });

  it("switches between difficulty and custom layout controls without losing either state", () => {
    render(<App />);

    fireEvent.change(screen.getByTestId("difficulty-slider"), { target: { value: "72" } });
    expect(screen.getByTestId("difficulty-tier-label")).toHaveTextContent("Hard");
    expect(screen.queryByTestId("width-slider")).not.toBeInTheDocument();

    switchToCustomLayout();
    fireEvent.change(screen.getByTestId("width-slider"), { target: { value: "7" } });
    fireEvent.change(screen.getByTestId("height-slider"), { target: { value: "6" } });

    fireEvent.click(screen.getByTestId("setup-mode-difficulty"));
    expect(screen.getByTestId("difficulty-slider")).toHaveValue("72");
    expect(screen.queryByTestId("width-slider")).not.toBeInTheDocument();

    switchToCustomLayout();
    expect(screen.getByTestId("width-slider")).toHaveValue("7");
    expect(screen.getByTestId("height-slider")).toHaveValue("6");
  });
});
