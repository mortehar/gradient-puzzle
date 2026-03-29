import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { CompletionCeremonyPhase, PointerPosition, ScrambleFlipTile, TransitionMode } from "./boardPresentation";
import { getBoardStyle, getTileLayoutStyle } from "./boardPresentation";
import type { GameConfig, GameState, Tile } from "../domain";

type PuzzleBoardProps = {
  game: GameState;
  previewConfig: GameConfig;
  orderedTiles: Tile[];
  transitionMode: TransitionMode;
  activeScrambleFlip: ScrambleFlipTile[] | null;
  completionCeremonyPhase: CompletionCeremonyPhase;
  dragTileId: string | null;
  dragPointerType: string | null;
  isInteractive: boolean;
  overlay?: ReactNode;
  onTilePointerDown: (tile: Tile, event: ReactPointerEvent<HTMLButtonElement>) => void;
};

export function PuzzleBoard({
  game,
  previewConfig,
  orderedTiles,
  transitionMode,
  activeScrambleFlip,
  completionCeremonyPhase,
  dragTileId,
  dragPointerType,
  isInteractive,
  overlay,
  onTilePointerDown
}: PuzzleBoardProps) {
  return (
    <div
      className={[
        "board",
        game.status === "scrambling" ? "board-scramble-flip" : "",
        transitionMode === "none" ? "board-no-motion" : "",
        transitionMode === "cinematic" ? "board-cinematic-motion" : "board-quick-motion"
      ].join(" ")}
      aria-label="Gradient puzzle board"
      role="grid"
      data-testid="puzzle-board"
      data-ceremony-phase={completionCeremonyPhase}
      style={getBoardStyle(game, previewConfig, transitionMode)}
      onContextMenu={(event) => event.preventDefault()}
    >
      {orderedTiles.map((tile) => {
        const isDragging = dragTileId === tile.id;
        const isTouchDragging = isDragging && dragPointerType === "touch";
        const isHiddenForScramble = activeScrambleFlip !== null && !tile.locked;

        return (
          <button
            key={tile.id}
            type="button"
            role="gridcell"
            aria-label={`Tile ${tile.currentIndex + 1}${tile.locked ? ", locked tile" : ""}`}
            className={[
              "tile",
              tile.locked ? "tile-locked" : "",
              tile.locked && completionCeremonyPhase !== "idle" ? "tile-lock-frame-hidden" : "",
              isDragging ? "tile-dragging" : "",
              isTouchDragging ? "tile-dragging-touch" : "",
              isHiddenForScramble ? "tile-hidden-for-scramble" : "",
              !isInteractive ? "tile-static" : ""
            ].join(" ")}
            style={{ backgroundColor: tile.color, ...getTileLayoutStyle(tile.currentIndex, game.config) }}
            data-current-index={tile.currentIndex}
            data-testid={`tile-${tile.currentIndex}`}
            onPointerDown={(event) => onTilePointerDown(tile, event)}
          />
        );
      })}

      {activeScrambleFlip ? (
        <div className="scramble-overlay" data-testid="scramble-overlay" aria-hidden="true">
          {activeScrambleFlip.map((tile) =>
            tile.locked ? null : (
              <div
                key={tile.index}
                className="scramble-flip-card"
                data-testid={`scramble-flip-${tile.index}`}
                style={
                  {
                    ...getTileLayoutStyle(tile.index, game.config),
                    "--scramble-flip-delay": `${tile.delayMs}ms`
                  } as CSSProperties
                }
              >
                <div className="scramble-flip-inner">
                  <div className="scramble-face scramble-face-front" style={{ backgroundColor: tile.frontColor }} />
                  <div className="scramble-face scramble-face-back" style={{ backgroundColor: tile.backColor }} />
                </div>
              </div>
            )
          )}
        </div>
      ) : null}

      {completionCeremonyPhase === "checkmark" ? (
        <div className="completion-checkmark" data-testid="completion-checkmark" aria-hidden="true">
          <svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid meet" focusable="false">
            <circle className="completion-checkmark-ring" cx="60" cy="60" r="34" pathLength={100} />
            <path className="completion-checkmark-path" d="M 44 61 L 56 73 L 80 49" pathLength={100} />
          </svg>
        </div>
      ) : null}

      {overlay}
    </div>
  );
}

type DragPreviewProps = {
  dragTile: Tile | null;
  pointerPosition: PointerPosition | null;
  pointerType?: string;
};

export function PuzzleDragPreview({ dragTile, pointerPosition, pointerType }: DragPreviewProps) {
  if (!dragTile || !pointerPosition) {
    return null;
  }

  return (
    <div
      className={["drag-preview", pointerType === "touch" ? "drag-preview-touch" : ""].join(" ")}
      aria-hidden="true"
      style={{
        backgroundColor: dragTile.color,
        left: pointerPosition.x,
        top: pointerPosition.y
      }}
    />
  );
}
