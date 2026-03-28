import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { PuzzleBoard, PuzzleDragPreview } from "./ui/PuzzleBoard";
import { PuzzleResearchPanel } from "./ui/PuzzleResearchPanel";
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

  function handleDifficultyScoreChange(value: number) {
    session.actions.setDifficultyScore(value);
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
            difficultyScore={session.difficultyScore}
            selectedDifficultyTier={session.selectedDifficultyTier}
            canUseAid={session.isInteractive}
            canCreatePuzzle={session.canCreatePuzzle}
            highlightNewPuzzle={session.highlightNewPuzzle}
            isAdvancedOpen={showAdvancedSettings}
            onSetDifficultyScore={handleDifficultyScoreChange}
            onToggleAdvancedSettings={toggleAdvancedSettings}
            onUseAid={session.actions.useAid}
            onStartNewPuzzle={session.actions.startNewPuzzle}
          />
        </section>

        {showAdvancedSettings ? (
          <PuzzleSettingsPanel
            activeHelpId={activeHelpId}
            onToggleHelp={toggleHelp}
            setupMode={session.setupMode}
            setSetupMode={session.actions.setSetupMode}
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
        ) : null}
      </section>

      <PuzzleDragPreview dragTile={session.dragTile} pointerPosition={session.pointerPosition} />
    </main>
  );
}
