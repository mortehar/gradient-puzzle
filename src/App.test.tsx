import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./features/puzzle/PuzzleFeature", () => ({
  PuzzleFeature: () => <div data-testid="puzzle-feature" />
}));

describe("App", () => {
  it("renders the puzzle feature composition root", () => {
    render(<App />);

    expect(screen.getByTestId("puzzle-feature")).toBeInTheDocument();
  });
});
