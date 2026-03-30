import { describe, expect, it } from "vitest";
import { parsePuzzleQaBootstrap, parsePuzzleQaBootstrapFromSearch } from "./bootstrap";

describe("parsePuzzleQaBootstrap", () => {
  it("normalizes valid QA params into deterministic launch state", () => {
    expect(
      parsePuzzleQaBootstrap({
        qaScreen: "puzzle",
        qaTier: "expert",
        qaPuzzle: "7",
        qaPhase: "solved",
        qaSettings: "open",
        qaLockStyle: "icon",
        qaMotion: "static"
      })
    ).toEqual({
      screen: "puzzle",
      selectedTier: "Expert",
      selectedTierIndex: 3,
      selectedPuzzleIndex: 6,
      selectedPuzzleNumber: 7,
      phase: "solved",
      settings: "closed",
      lockStyle: "icon",
      motion: "static"
    });
  });

  it("falls back safely for invalid and partial QA params", () => {
    expect(
      parsePuzzleQaBootstrap({
        qaScreen: "unknown",
        qaTier: "legendary",
        qaPuzzle: "999",
        qaPhase: "broken",
        qaSettings: "sideways",
        qaLockStyle: "corners",
        qaMotion: "warp"
      })
    ).toEqual({
      screen: "home",
      selectedTier: "Easy",
      selectedTierIndex: 0,
      selectedPuzzleIndex: 9,
      selectedPuzzleNumber: 10,
      phase: "playing",
      settings: "closed",
      lockStyle: null,
      motion: "live"
    });
  });

  it("accepts any lock style supported by the feature source of truth", () => {
    expect(
      parsePuzzleQaBootstrap({
        qaLockStyle: "frame"
      }).lockStyle
    ).toBe("frame");
  });
});

describe("parsePuzzleQaBootstrapFromSearch", () => {
  it("returns null when no QA params are present", () => {
    expect(parsePuzzleQaBootstrapFromSearch("?tier=easy")).toBeNull();
  });
});
