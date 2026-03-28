import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { PuzzleBoard, PuzzleDragPreview } from "./ui/PuzzleBoard";
import { PuzzleSettingsPanel } from "./ui/PuzzleSettingsPanel";
import { PuzzleStatusFooter } from "./ui/PuzzleStatusFooter";
import { usePuzzleSession } from "./hooks/usePuzzleSession";
import type { Tile } from "./domain";

export function PuzzleFeature() {
  const [activeHelpId, setActiveHelpId] = useState<string | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const session = usePuzzleSession();

  function toggleHelp(helpId: string) {
    setActiveHelpId((currentHelpId) => (currentHelpId === helpId ? null : helpId));
  }

  function toggleAdvancedSettings() {
    setShowAdvancedSettings((isOpen) => {
      if (isOpen) {
        setActiveHelpId(null);
      }

      return !isOpen;
    });
  }

  function handleSliderIndexChange(value: number) {
    session.actions.setSliderIndex(value);
  }

  function handleTilePointerDown(tile: Tile, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    session.actions.beginDrag(tile, event.pointerId, event.clientX, event.clientY);
  }

  return (
    <main className="app-shell">
      <section className={["app-layout", showAdvancedSettings ? "app-layout-advanced-open" : "app-layout-focused"].join(" ")}>
        <section className="board-panel">
          <PuzzleBoard
            game={session.game}
            previewConfig={session.previewConfig}
            orderedTiles={session.orderedTiles}
            transitionMode={session.transitionMode}
            activeAidAnimation={session.activeAidAnimation}
            activeScrambleFlip={session.activeScrambleFlip}
            completionCeremonyPhase={session.completionCeremonyPhase}
            dragTileId={session.dragTile?.id ?? null}
            isInteractive={session.isInteractive}
            onTilePointerDown={handleTilePointerDown}
          />

          <PuzzleStatusFooter
            swapCount={session.game.swapCount}
            hintCount={session.game.hintCount}
            sliderIndex={session.sliderIndex}
            sliderCount={session.sliderCount}
            currentPuzzleLabel={session.currentPuzzleLabel}
            canUseAid={session.isInteractive}
            canAdvancePuzzle={session.canAdvancePuzzle}
            highlightNextPuzzle={session.highlightNextPuzzle}
            isAdvancedOpen={showAdvancedSettings}
            onSetSliderIndex={handleSliderIndexChange}
            onToggleAdvancedSettings={toggleAdvancedSettings}
            onUseAid={session.actions.useAid}
            onStartNextPuzzle={session.actions.startNextPuzzle}
          />
        </section>

        {showAdvancedSettings ? (
          <PuzzleSettingsPanel
            activeHelpId={activeHelpId}
            onToggleHelp={toggleHelp}
            currentPuzzleLabel={session.currentPuzzleLabel}
            catalogVersion={session.activePuzzle.catalogVersion}
            currentGridLabel={`${session.game.config.width} x ${session.game.config.height}`}
            lockedCount={session.lockedCount}
            swapCount={session.game.swapCount}
            hintCount={session.game.hintCount}
            appearance={session.previewConfig.appearance}
            onAppearanceChange={session.actions.updateAppearance}
          />
        ) : null}
      </section>

      <PuzzleDragPreview dragTile={session.dragTile} pointerPosition={session.pointerPosition} />
    </main>
  );
}
