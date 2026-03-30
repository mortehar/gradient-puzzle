import { useMemo, useState } from "react";
import { getPublishedCatalog, type DifficultyTier, type PublishedPuzzle } from "../domain";
import { loadBrowserPreferences, saveBrowserPreferences, type BrowserPreferences } from "./browserPreferences";
import {
  getBestCompletionForPuzzle,
  getCompletedPuzzleCountForTier,
  getFirstIncompletePuzzleIndex,
  loadCompletionHistory,
  saveCompletion,
  type LocalPuzzleCompletionRecord
} from "./puzzleCompletionHistory";
import { applyQaPreferenceOverride, type PuzzleQaBootstrap } from "../qa/bootstrap";

export type TierPuzzleSummary = {
  puzzle: PublishedPuzzle;
  bestCompletion: LocalPuzzleCompletionRecord | null;
  isCompleted: boolean;
};

export type TierSummary = {
  tier: DifficultyTier;
  puzzles: readonly TierPuzzleSummary[];
  previewPuzzles: readonly TierPuzzleSummary[];
  completedCount: number;
  totalCount: number;
  selectedPuzzleIndex: number;
};

type BrowserScreen = "home" | "tier" | "puzzle";

type TierCatalog = {
  tier: DifficultyTier;
  puzzles: readonly PublishedPuzzle[];
};

const PUBLISHED_CATALOG = getPublishedCatalog("v1");

function buildTierCatalog(): TierCatalog[] {
  const tiers: TierCatalog[] = [];

  for (const puzzle of PUBLISHED_CATALOG.puzzles) {
    const existingTier = tiers[tiers.length - 1];

    if (!existingTier || existingTier.tier !== puzzle.tier) {
      tiers.push({
        tier: puzzle.tier,
        puzzles: [puzzle]
      });
      continue;
    }

    tiers[tiers.length - 1] = {
      ...existingTier,
      puzzles: [...existingTier.puzzles, puzzle]
    };
  }

  return tiers;
}

const TIER_CATALOG = buildTierCatalog();

type UsePublishedPuzzleBrowserOptions = {
  qaBootstrap?: PuzzleQaBootstrap | null;
};

export function usePublishedPuzzleBrowser({ qaBootstrap = null }: UsePublishedPuzzleBrowserOptions = {}) {
  const [screen, setScreen] = useState<BrowserScreen>(() => qaBootstrap?.screen ?? "home");
  const [selectedTierIndex, setSelectedTierIndex] = useState(() => qaBootstrap?.selectedTierIndex ?? 0);
  const [preferences, setPreferences] = useState<BrowserPreferences>(() =>
    applyQaPreferenceOverride(loadBrowserPreferences(), qaBootstrap)
  );
  const [completionHistory, setCompletionHistory] = useState<LocalPuzzleCompletionRecord[]>(() => loadCompletionHistory());
  const [selectedPuzzleIndexByTier, setSelectedPuzzleIndexByTier] = useState(() => {
    const nextIndexes = TIER_CATALOG.map((tier) => getFirstIncompletePuzzleIndex(completionHistory, tier.puzzles));

    if (qaBootstrap) {
      nextIndexes[qaBootstrap.selectedTierIndex] = clampIndex(
        qaBootstrap.selectedPuzzleIndex,
        TIER_CATALOG[qaBootstrap.selectedTierIndex]?.puzzles.length ?? 0
      );
    }

    return nextIndexes;
  });

  const tiers = useMemo<TierSummary[]>(
    () =>
      TIER_CATALOG.map((tier, tierIndex) => {
        const puzzles = tier.puzzles.map((puzzle) => {
          const bestCompletion = getBestCompletionForPuzzle(completionHistory, puzzle.id, puzzle.catalogVersion);

          return {
            puzzle,
            bestCompletion,
            isCompleted: bestCompletion !== null
          };
        });

        return {
          tier: tier.tier,
          puzzles,
          previewPuzzles: puzzles.slice(0, 6),
          completedCount: getCompletedPuzzleCountForTier(completionHistory, tier.puzzles),
          totalCount: tier.puzzles.length,
          selectedPuzzleIndex: clampIndex(selectedPuzzleIndexByTier[tierIndex] ?? 0, tier.puzzles.length)
        };
      }),
    [completionHistory, selectedPuzzleIndexByTier]
  );

  const activeTier = tiers[selectedTierIndex] ?? tiers[0];
  const activePuzzle = activeTier?.puzzles[activeTier.selectedPuzzleIndex]?.puzzle ?? null;

  function setHomeTierIndex(index: number) {
    setSelectedTierIndex(clampIndex(index, tiers.length));
  }

  function setTierPuzzleIndex(index: number) {
    setSelectedPuzzleIndexByTier((currentIndexes) => {
      const nextIndexes = [...currentIndexes];
      nextIndexes[selectedTierIndex] = clampIndex(index, activeTier.puzzles.length);
      return nextIndexes;
    });
  }

  function openTier(index = selectedTierIndex) {
    const nextTierIndex = clampIndex(index, tiers.length);
    const nextTierCatalog = TIER_CATALOG[nextTierIndex];

    if (!nextTierCatalog) {
      return;
    }

    setSelectedTierIndex(nextTierIndex);
    setSelectedPuzzleIndexByTier((currentIndexes) => {
      const nextIndexes = [...currentIndexes];
      nextIndexes[nextTierIndex] = getFirstIncompletePuzzleIndex(completionHistory, nextTierCatalog.puzzles);
      return nextIndexes;
    });
    setScreen("tier");
  }

  function openPuzzle(index = activeTier.selectedPuzzleIndex) {
    if (!activeTier) {
      return;
    }

    setTierPuzzleIndex(index);
    setScreen("puzzle");
  }

  function returnToHome() {
    setScreen("home");
  }

  function returnToTier() {
    setScreen("tier");
  }

  function recordCompletion(record: LocalPuzzleCompletionRecord) {
    saveCompletion(record);
    setCompletionHistory((currentHistory) => [...currentHistory, record]);
  }

  function setLockedTileStyle(lockedTileStyle: BrowserPreferences["lockedTileStyle"]) {
    setPreferences((currentPreferences) => {
      const nextPreferences = {
        ...currentPreferences,
        lockedTileStyle
      };

      saveBrowserPreferences(nextPreferences);
      return nextPreferences;
    });
  }

  return {
    screen,
    tiers,
    activeTier,
    activePuzzle,
    preferences,
    selectedTierIndex,
    completionHistory,
    actions: {
      setHomeTierIndex,
      setTierPuzzleIndex,
      openTier,
      openPuzzle,
      returnToHome,
      returnToTier,
      recordCompletion,
      setLockedTileStyle
    }
  };
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }

  return Math.min(length - 1, Math.max(0, index));
}
