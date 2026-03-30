import type { PublishedPuzzle } from "../domain";
import type { TierPuzzleSummary, TierSummary } from "../hooks/usePublishedPuzzleBrowser";

export type ScreenChip = {
  label: string;
  value: string;
};

export type ScreenArtDirection = {
  sectionClassName: string;
  kicker: string;
  title: string;
  copy: string;
  chips?: ScreenChip[];
};

export function getHomeScreenArtDirection(activeTier: TierSummary | undefined): ScreenArtDirection {
  return {
    sectionClassName: "screen-scene screen-scene-dawn home-screen-panel",
    kicker: "A quiet color puzzle",
    title: "Gradient",
    copy: "Arrange each board into a smooth color path. Browse by tier, settle into the atmosphere, and solve at your own pace.",
    chips: activeTier
      ? [
          { label: "Tier", value: activeTier.tier },
          { label: "Progress", value: `${activeTier.completedCount}/${activeTier.totalCount}` }
        ]
      : undefined
  };
}

export function getTierScreenArtDirection(tier: TierSummary, activePuzzle: TierPuzzleSummary | undefined): ScreenArtDirection {
  return {
    sectionClassName: "screen-scene screen-scene-dusk tier-screen-panel",
    kicker: tier.tier,
    title: "Choose a puzzle",
    copy: `${tier.completedCount} of ${tier.totalCount} completed`,
    chips: activePuzzle
      ? [
          { label: "Selected", value: `Puzzle ${activePuzzle.puzzle.tierIndex}` },
          {
            label: "Best",
            value: activePuzzle.bestCompletion ? `${activePuzzle.bestCompletion.moveCount} moves` : "Unplayed"
          }
        ]
      : undefined
  };
}

export function getPlayScreenArtDirection(puzzle: PublishedPuzzle): ScreenArtDirection {
  return {
    sectionClassName: "screen-scene screen-scene-night",
    kicker: puzzle.tier,
    title: `Puzzle ${puzzle.tierIndex}`,
    copy: "Shape the board back into one calm, continuous gradient."
  };
}

export const SETTINGS_MENU_ART_DIRECTION = {
  kicker: "Locked cells",
  title: "Board treatment",
  copy: "Pick the material language for fixed cells. The choice is visual only and carries through previews and live play."
} as const;
