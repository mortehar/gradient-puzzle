import { useState, type PointerEvent as ReactPointerEvent } from "react";
import type { PublishedPuzzle } from "../domain";
import { PuzzleBoard, PuzzleDragPreview } from "./PuzzleBoard";
import { HoldToAbortButton } from "./HoldToAbortButton";
import { HoldToAidButton } from "./HoldToAidButton";
import { ScreenIntro } from "./ScreenIntro";
import { usePuzzleSession } from "../hooks/usePuzzleSession";
import type { LocalPuzzleCompletionRecord } from "../hooks/puzzleCompletionHistory";
import type { Tile } from "../domain";
import type { LockedTileStyle } from "./lockedTileStyles";
import { getPlayScreenArtDirection } from "./screenArtDirection";
import type { HoldActionState } from "./useHoldToAction";
import type { PuzzleQaSessionBootstrap } from "../qa/bootstrap";

type PuzzlePlayScreenProps = {
  puzzle: PublishedPuzzle;
  completionHistory: readonly LocalPuzzleCompletionRecord[];
  lockedTileStyle: LockedTileStyle;
  qaBootstrap?: PuzzleQaSessionBootstrap | null;
  onRecordCompletion: (record: LocalPuzzleCompletionRecord) => void;
  onAbort: () => void;
};

export function PuzzlePlayScreen({
  puzzle,
  completionHistory,
  lockedTileStyle,
  qaBootstrap = null,
  onRecordCompletion,
  onAbort
}: PuzzlePlayScreenProps) {
  const session = usePuzzleSession({
    puzzle,
    completionHistory,
    qaBootstrap,
    onRecordCompletion
  });
  const artDirection = getPlayScreenArtDirection(puzzle);
  const [abortHoldState, setAbortHoldState] = useState<HoldActionState>({
    isHolding: false,
    progress: 0,
    isVisible: false
  });
  const [aidHoldState, setAidHoldState] = useState<HoldActionState>({
    isHolding: false,
    progress: 0,
    isVisible: false
  });

  const activeHoldOverlay = aidHoldState.isHolding
    ? {
        ...aidHoldState,
        label: (
          <>
            Hold to get help
            <br />
            but no score
          </>
        ),
        testId: "aid-progress"
      }
    : abortHoldState.isHolding
      ? { ...abortHoldState, label: "Hold to exit", testId: "abort-progress" }
      : aidHoldState.isVisible
        ? {
            ...aidHoldState,
            label: (
              <>
                Hold to get help
                <br />
                but no score
              </>
            ),
            testId: "aid-progress"
          }
        : abortHoldState.isVisible
          ? { ...abortHoldState, label: "Hold to exit", testId: "abort-progress" }
          : null;

  function handleTilePointerDown(tile: Tile, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    session.actions.beginDrag(tile, event.pointerId, event.pointerType, event.clientX, event.clientY);
  }

  return (
    <>
      <section
        className={["board-panel", "play-panel", artDirection.sectionClassName].join(" ")}
        data-testid="puzzle-screen"
        data-game-status={session.game.status}
      >
        <ScreenIntro
          className="screen-heading play-screen-heading"
          titleClassName="screen-title screen-title-compact"
          kicker={artDirection.kicker}
          title={artDirection.title}
          copy={artDirection.copy}
        />
        <div className="play-board-shell">
          <PuzzleBoard
            game={session.game}
            orderedTiles={session.orderedTiles}
            lockedTileStyle={lockedTileStyle}
            transitionMode={session.transitionMode}
            activeAidAnimation={session.activeAidAnimation}
            activeScrambleFlip={session.activeScrambleFlip}
            completionCeremonyPhase={session.completionCeremonyPhase}
            qaMotion={qaBootstrap?.motion ?? "live"}
            dragTileId={session.dragTile?.id ?? null}
            dragTargetIndex={session.dragTargetIndex}
            dragPointerType={session.dragPointerType}
            isInteractive={session.isInteractive}
            overlay={
              activeHoldOverlay ? (
                <div className="abort-progress-overlay" data-testid={activeHoldOverlay.testId} aria-live="polite">
                  <div className="abort-progress">
                    <p className="abort-progress-label">{activeHoldOverlay.label}</p>
                    <div className="abort-progress-track" aria-hidden="true">
                      <div
                        className="abort-progress-fill"
                        data-testid={`${activeHoldOverlay.testId}-fill`}
                        style={{ transform: `scaleX(${activeHoldOverlay.progress})` }}
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
          <HoldToAbortButton
            onAbort={onAbort}
            requiresHold={session.game.status !== "solved"}
            onHoldStateChange={setAbortHoldState}
          />

          <div className="completion-summary" data-testid="completion-summary">
            <div className="completion-summary-line">
              <p className="completion-title">Moves: {session.game.swapCount}</p>
              <p className="completion-best">{session.bestCompletion ? `Best: ${session.bestCompletion.moveCount}` : "\u00A0"}</p>
            </div>
          </div>

          <HoldToAidButton
            onAid={session.actions.useAid}
            requiresHold={session.game.hintCount === 0}
            disabled={!session.canUseAid}
            onHoldStateChange={setAidHoldState}
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
