import { useState, type PointerEvent as ReactPointerEvent } from "react";
import type { PublishedPuzzle } from "../domain";
import { PuzzleBoard, PuzzleDragPreview } from "./PuzzleBoard";
import { HoldToAbortButton, type AbortHoldState } from "./HoldToAbortButton";
import { usePuzzleSession } from "../hooks/usePuzzleSession";
import type { LocalPuzzleCompletionRecord } from "../hooks/puzzleCompletionHistory";
import type { Tile } from "../domain";

type PuzzlePlayScreenProps = {
  puzzle: PublishedPuzzle;
  completionHistory: readonly LocalPuzzleCompletionRecord[];
  onRecordCompletion: (record: LocalPuzzleCompletionRecord) => void;
  onAbort: () => void;
};

export function PuzzlePlayScreen({ puzzle, completionHistory, onRecordCompletion, onAbort }: PuzzlePlayScreenProps) {
  const session = usePuzzleSession({
    puzzle,
    completionHistory,
    onRecordCompletion
  });
  const [abortHoldState, setAbortHoldState] = useState<AbortHoldState>({
    isHolding: false,
    progress: 0
  });

  function handleTilePointerDown(tile: Tile, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    session.actions.beginDrag(tile, event.pointerId, event.pointerType, event.clientX, event.clientY);
  }

  return (
    <>
      <section className="board-panel play-panel" data-testid="puzzle-screen">
        <div className="play-board-shell">
          <PuzzleBoard
            game={session.game}
            previewConfig={session.previewConfig}
            orderedTiles={session.orderedTiles}
            transitionMode={session.transitionMode}
            activeScrambleFlip={session.activeScrambleFlip}
            completionCeremonyPhase={session.completionCeremonyPhase}
            dragTileId={session.dragTile?.id ?? null}
            dragPointerType={session.dragPointerType}
            isInteractive={session.isInteractive}
            overlay={
                  abortHoldState.isHolding ? (
                <div className="abort-progress-overlay" data-testid="abort-progress" aria-live="polite">
                  <div className="abort-progress">
                    <p className="abort-progress-label">Hold to exit</p>
                    <div className="abort-progress-track" aria-hidden="true">
                      <div
                        className="abort-progress-fill"
                        style={{ transform: `scaleX(${abortHoldState.progress})` }}
                      />
                    </div>
                  </div>
                </div>
              ) : null
            }
            onTilePointerDown={handleTilePointerDown}
          />
        </div>

        <div className="play-footer" data-testid="play-footer">
          <div className="completion-summary" data-testid="completion-summary">
            <div className="completion-summary-line">
              <p className="completion-title">Moves: {session.game.swapCount}</p>
              <p className="completion-best">{session.bestCompletion ? `Best: ${session.bestCompletion.moveCount}` : "\u00A0"}</p>
            </div>
          </div>

          <HoldToAbortButton
            onAbort={onAbort}
            requiresHold={session.game.status !== "solved"}
            onHoldStateChange={setAbortHoldState}
          />
        </div>
      </section>

      <PuzzleDragPreview
        dragTile={session.dragTile}
        pointerPosition={session.pointerPosition}
        pointerType={session.dragPointerType ?? undefined}
      />
    </>
  );
}
