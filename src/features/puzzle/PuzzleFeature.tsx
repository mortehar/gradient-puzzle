import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { PuzzleBoard, PuzzleDragPreview } from "./ui/PuzzleBoard";
import { PuzzleSettingsPanel } from "./ui/PuzzleSettingsPanel";
import { PuzzleStatusFooter } from "./ui/PuzzleStatusFooter";
import { usePuzzleSession } from "./hooks/usePuzzleSession";
import type { Tile } from "./domain";

export function PuzzleFeature() {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const session = usePuzzleSession();

  function toggleAdvancedSettings() {
    setShowAdvancedSettings((isOpen) => !isOpen);
  }

  function handleSliderIndexChange(value: number) {
    session.actions.setSliderIndex(value);
  }

  function handleTilePointerDown(tile: Tile, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    session.actions.beginDrag(tile, event.pointerId, event.pointerType, event.clientX, event.clientY);
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
            dragPointerType={session.dragPointerType}
            isInteractive={session.isInteractive}
            onTilePointerDown={handleTilePointerDown}
          />

          <PuzzleStatusFooter
            swapCount={session.game.swapCount}
            hintCount={session.game.hintCount}
            bestMoveCount={session.bestCompletion?.moveCount ?? null}
            sliderIndex={session.sliderIndex}
            sliderCount={session.sliderCount}
            currentPuzzleLabel={session.currentPuzzleLabel}
            canUseAid={session.isInteractive}
            canAdvancePuzzle={session.canAdvancePuzzle}
            highlightNextPuzzle={session.highlightNextPuzzle}
            isScoreEligible={session.isScoreEligible}
            isAdvancedOpen={showAdvancedSettings}
            onSetSliderIndex={handleSliderIndexChange}
            onToggleAdvancedSettings={toggleAdvancedSettings}
            onUseAid={session.actions.useAid}
            onStartNextPuzzle={session.actions.startNextPuzzle}
          />
        </section>

        {showAdvancedSettings ? (
          <PuzzleSettingsPanel
            currentPuzzleLabel={session.currentPuzzleLabel}
            catalogVersion={session.activePuzzle.catalogVersion}
            currentGridLabel={`${session.game.config.width} x ${session.game.config.height}`}
            lockedCount={session.lockedCount}
            swapCount={session.game.swapCount}
            hintCount={session.game.hintCount}
          />
        ) : null}
      </section>

      <PuzzleDragPreview
        dragTile={session.dragTile}
        pointerPosition={session.pointerPosition}
        pointerType={session.dragPointerType ?? undefined}
      />
    </main>
  );
}
