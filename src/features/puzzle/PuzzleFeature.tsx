import { useState } from "react";
import { PuzzleHomeScreen } from "./ui/PuzzleHomeScreen";
import { PuzzlePlayScreen } from "./ui/PuzzlePlayScreen";
import { PuzzleTierScreen } from "./ui/PuzzleTierScreen";
import { usePublishedPuzzleBrowser } from "./hooks/usePublishedPuzzleBrowser";
import { getPuzzleQaSessionBootstrap, loadPuzzleQaBootstrap } from "./qa/bootstrap";

export function PuzzleFeature() {
  const [qaBootstrap] = useState(() => loadPuzzleQaBootstrap());
  const browser = usePublishedPuzzleBrowser({
    qaBootstrap
  });
  const [openSettingsScreen, setOpenSettingsScreen] = useState<"home" | "tier" | null>(() => {
    if (!qaBootstrap || qaBootstrap.settings !== "open" || qaBootstrap.screen === "puzzle") {
      return null;
    }

    return qaBootstrap.screen;
  });
  const qaSessionBootstrap = getPuzzleQaSessionBootstrap(qaBootstrap);

  return (
    <main className="app-shell" data-qa-motion={qaBootstrap?.motion ?? "live"}>
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
          qaBootstrap={qaSessionBootstrap}
          onRecordCompletion={browser.actions.recordCompletion}
          onAbort={browser.actions.returnToTier}
        />
      ) : null}
    </main>
  );
}
