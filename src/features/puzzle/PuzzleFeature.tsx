import { PuzzleHomeScreen } from "./ui/PuzzleHomeScreen";
import { PuzzlePlayScreen } from "./ui/PuzzlePlayScreen";
import { PuzzleTierScreen } from "./ui/PuzzleTierScreen";
import { usePublishedPuzzleBrowser } from "./hooks/usePublishedPuzzleBrowser";

export function PuzzleFeature() {
  const browser = usePublishedPuzzleBrowser();

  return (
    <main className="app-shell">
      {browser.screen === "home" ? (
        <PuzzleHomeScreen
          tiers={browser.tiers}
          selectedTierIndex={browser.selectedTierIndex}
          onSelectTier={browser.actions.setHomeTierIndex}
          onOpenTier={browser.actions.openTier}
        />
      ) : null}

      {browser.screen === "tier" && browser.activeTier ? (
        <PuzzleTierScreen
          tier={browser.activeTier}
          onSelectPuzzle={browser.actions.setTierPuzzleIndex}
          onOpenPuzzle={browser.actions.openPuzzle}
          onBack={browser.actions.returnToHome}
        />
      ) : null}

      {browser.screen === "puzzle" && browser.activePuzzle ? (
        <PuzzlePlayScreen
          key={browser.activePuzzle.id}
          puzzle={browser.activePuzzle}
          completionHistory={browser.completionHistory}
          onRecordCompletion={browser.actions.recordCompletion}
          onAbort={browser.actions.returnToTier}
        />
      ) : null}
    </main>
  );
}
