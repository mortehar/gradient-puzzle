import { useState } from "react";
import { PuzzleHomeScreen } from "./ui/PuzzleHomeScreen";
import { PuzzlePlayScreen } from "./ui/PuzzlePlayScreen";
import { PuzzleTierScreen } from "./ui/PuzzleTierScreen";
import { usePublishedPuzzleBrowser } from "./hooks/usePublishedPuzzleBrowser";

export function PuzzleFeature() {
  const browser = usePublishedPuzzleBrowser();
  const [openSettingsScreen, setOpenSettingsScreen] = useState<"home" | "tier" | null>(null);

  return (
    <main className="app-shell">
      {browser.screen === "home" ? (
        <PuzzleHomeScreen
          tiers={browser.tiers}
          selectedTierIndex={browser.selectedTierIndex}
          isSettingsOpen={openSettingsScreen === "home"}
          lockedTileStyle={browser.preferences.lockedTileStyle}
          onSelectTier={browser.actions.setHomeTierIndex}
          onLockedTileStyleChange={browser.actions.setLockedTileStyle}
          onToggleSettings={() => setOpenSettingsScreen((currentValue) => (currentValue === "home" ? null : "home"))}
          onCloseSettings={() => setOpenSettingsScreen(null)}
          onOpenTier={browser.actions.openTier}
        />
      ) : null}

      {browser.screen === "tier" && browser.activeTier ? (
        <PuzzleTierScreen
          tier={browser.activeTier}
          isSettingsOpen={openSettingsScreen === "tier"}
          lockedTileStyle={browser.preferences.lockedTileStyle}
          onSelectPuzzle={browser.actions.setTierPuzzleIndex}
          onLockedTileStyleChange={browser.actions.setLockedTileStyle}
          onToggleSettings={() => setOpenSettingsScreen((currentValue) => (currentValue === "tier" ? null : "tier"))}
          onCloseSettings={() => setOpenSettingsScreen(null)}
          onOpenPuzzle={browser.actions.openPuzzle}
          onBack={browser.actions.returnToHome}
        />
      ) : null}

      {browser.screen === "puzzle" && browser.activePuzzle ? (
        <PuzzlePlayScreen
          key={browser.activePuzzle.id}
          puzzle={browser.activePuzzle}
          completionHistory={browser.completionHistory}
          lockedTileStyle={browser.preferences.lockedTileStyle}
          onRecordCompletion={browser.actions.recordCompletion}
          onAbort={browser.actions.returnToTier}
        />
      ) : null}
    </main>
  );
}
