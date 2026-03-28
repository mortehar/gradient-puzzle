import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { PuzzleBoard, PuzzleDragPreview } from "./ui/PuzzleBoard";
import { PuzzleResearchPanel } from "./ui/PuzzleResearchPanel";
import { PuzzleSettingsPanel } from "./ui/PuzzleSettingsPanel";
import { PuzzleStatusFooter } from "./ui/PuzzleStatusFooter";
import { usePuzzleSession } from "./hooks/usePuzzleSession";
import type { Tile } from "./domain";

export function PuzzleFeature() {
  const [activeHelpId, setActiveHelpId] = useState<string | null>(null);
  const session = usePuzzleSession();

  function toggleHelp(helpId: string) {
    setActiveHelpId((currentHelpId) => (currentHelpId === helpId ? null : helpId));
  }

  function handleTilePointerDown(tile: Tile, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    session.actions.beginDrag(tile, event.pointerId, event.clientX, event.clientY);
  }

  return (
    <main className="app-shell">
      <section className="app-layout">
        <section className="board-panel">
          <PuzzleBoard
            game={session.game}
            previewConfig={session.previewConfig}
            orderedTiles={session.orderedTiles}
            transitionMode={session.transitionMode}
            activeAidAnimation={session.activeAidAnimation}
            activeScrambleFlip={session.activeScrambleFlip}
            showCompletionBurst={session.showCompletionBurst}
            completionCanvasRef={session.completionCanvasRef}
            dragTileId={session.dragTile?.id ?? null}
            isInteractive={session.isInteractive}
            onTilePointerDown={handleTilePointerDown}
          />

          <PuzzleStatusFooter
            status={session.game.status}
            swapCount={session.game.swapCount}
            hintCount={session.game.hintCount}
            canUseAid={session.isInteractive}
            canCreatePuzzle={session.canCreatePuzzle}
            onUseAid={session.actions.useAid}
            onStartNewPuzzle={session.actions.startNewPuzzle}
          />
        </section>

        <PuzzleSettingsPanel
          activeHelpId={activeHelpId}
          onToggleHelp={toggleHelp}
          setupMode={session.setupMode}
          setSetupMode={session.actions.setSetupMode}
          difficultyScore={session.difficultyScore}
          setDifficultyScore={session.actions.setDifficultyScore}
          selectedDifficultyTier={session.selectedDifficultyTier}
          currentGridLabel={`${session.game.config.width} x ${session.game.config.height}`}
          previewConfig={session.previewConfig}
          normalizedConfig={session.normalizedConfig}
          nextLockedCount={session.nextLockedCount}
          lockedCount={session.lockedCount}
          swapCount={session.game.swapCount}
          hintCount={session.game.hintCount}
          canCreatePuzzle={session.canCreatePuzzle}
          verticalCountOptions={session.verticalCountOptions}
          horizontalCountOptions={session.horizontalCountOptions}
          verticalDensityOptions={session.verticalDensityOptions}
          horizontalDensityOptions={session.horizontalDensityOptions}
          crossDensityOptions={session.crossDensityOptions}
          researchPanel={
            <PuzzleResearchPanel
              researchSweep={session.researchSweep}
              currentBoardMetrics={session.currentBoardMetrics}
              currentReversalRate={session.currentReversalRate}
              currentOrderedShare={session.currentOrderedShare}
            />
          }
          onWidthChange={session.actions.updateWidth}
          onHeightChange={session.actions.updateHeight}
          onLineValueChange={session.actions.updateLineValue}
          onCrossDensityChange={session.actions.updateCrossDensity}
          onAppearanceChange={session.actions.updateAppearance}
          onColorConstraintChange={session.actions.updateColorConstraint}
        />
      </section>

      <PuzzleDragPreview dragTile={session.dragTile} pointerPosition={session.pointerPosition} />
    </main>
  );
}
