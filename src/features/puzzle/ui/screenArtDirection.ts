import type { PublishedPuzzle } from "../domain";
import type { TierPuzzleSummary, TierSummary } from "../hooks/usePublishedPuzzleBrowser";

export type ScreenSceneVariant = "dawn" | "dusk" | "night";

export type ScreenChipIcon = "tier" | "progress" | "board" | "best";

export type ScreenChip = {
  label: string;
  value: string;
  icon: ScreenChipIcon;
  tone?: "warm" | "cool" | "neutral";
};

export type ScreenArtDirection = {
  sectionClassName: string;
  sceneVariant: ScreenSceneVariant;
  kicker?: string;
  title: string;
  copy?: string;
  chips?: ScreenChip[];
};

export function getHomeScreenArtDirection(activeTier: TierSummary | undefined): ScreenArtDirection {
  return {
    sectionClassName: "screen-scene screen-scene-dawn home-screen-panel",
    sceneVariant: "dawn",
    title: "Gradient",
    chips: activeTier
      ? [
          { label: "Tier", value: activeTier.tier, icon: "tier", tone: "warm" },
          { label: "Progress", value: `${activeTier.completedCount}/${activeTier.totalCount}`, icon: "progress" }
        ]
      : undefined
  };
}

export function getTierScreenArtDirection(tier: TierSummary, activePuzzle: TierPuzzleSummary | undefined): ScreenArtDirection {
  return {
    sectionClassName: "screen-scene screen-scene-dusk tier-screen-panel",
    sceneVariant: "dusk",
    kicker: tier.tier,
    title: "Choose a board",
    chips: activePuzzle
      ? [
          { label: "Selected", value: `Puzzle ${activePuzzle.puzzle.tierIndex}`, icon: "board", tone: "warm" },
          {
            label: "Best",
            value: activePuzzle.bestCompletion ? `${activePuzzle.bestCompletion.moveCount}` : "—",
            icon: "best"
          }
        ]
      : undefined
  };
}

export function getPlayScreenArtDirection(puzzle: PublishedPuzzle): ScreenArtDirection {
  return {
    sectionClassName: "screen-scene screen-scene-night",
    sceneVariant: "night",
    kicker: puzzle.tier,
    title: `Puzzle ${puzzle.tierIndex}`
  };
}

export const SETTINGS_MENU_ART_DIRECTION = {
  kicker: "Locked cells",
  title: "Board treatment",
  copy: "Choose the locked-cell finish."
} as const;
