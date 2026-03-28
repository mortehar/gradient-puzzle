import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { AidAnimationState, PointerPosition, ScrambleFlipTile, TransitionMode } from "./boardPresentation";
import { getBoardStyle, getTileLayoutStyle } from "./boardPresentation";
import type { GameConfig, GameState, Tile } from "../domain";

type PuzzleBoardProps = {
  game: GameState;
  previewConfig: GameConfig;
  orderedTiles: Tile[];
  transitionMode: TransitionMode;
  activeAidAnimation: AidAnimationState | null;
  activeScrambleFlip: ScrambleFlipTile[] | null;
  showCompletionBurst: boolean;
  completionCanvasRef: RefObject<HTMLCanvasElement | null>;
  dragTileId: string | null;
  isInteractive: boolean;
  onTilePointerDown: (tile: Tile, event: ReactPointerEvent<HTMLButtonElement>) => void;
};

export function PuzzleBoard({
  game,
  previewConfig,
  orderedTiles,
  transitionMode,
  activeAidAnimation,
  activeScrambleFlip,
  showCompletionBurst,
  completionCanvasRef,
  dragTileId,
  isInteractive,
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
      style={getBoardStyle(game, previewConfig, transitionMode)}
    >
      {orderedTiles.map((tile) => {
        const isDragging = dragTileId === tile.id;
        const isHiddenForAid =
          activeAidAnimation !== null &&
          (tile.id === activeAidAnimation.primaryTileId || tile.id === activeAidAnimation.secondaryTileId);
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
              isDragging ? "tile-dragging" : "",
              isHiddenForScramble ? "tile-hidden-for-scramble" : "",
              isHiddenForAid ? "tile-hidden-for-aid" : "",
              !isInteractive ? "tile-static" : ""
            ].join(" ")}
            style={{ backgroundColor: tile.color, ...getTileLayoutStyle(tile.currentIndex, game.config) }}
            data-current-index={tile.currentIndex}
            data-testid={`tile-${tile.currentIndex}`}
            onPointerDown={(event) => onTilePointerDown(tile, event)}
          >
            <span className="sr-only">{tile.locked ? "Locked tile" : "Movable tile"}</span>
          </button>
        );
      })}

      {activeAidAnimation ? (
        <>
          <div
            className={[
              "aid-overlay",
              "aid-overlay-primary",
              activeAidAnimation.moving ? "aid-overlay-primary-moving" : ""
            ].join(" ")}
            data-testid="aid-primary-overlay"
            style={
              {
                backgroundColor: activeAidAnimation.primaryColor,
                ...getTileLayoutStyle(
                  activeAidAnimation.moving ? activeAidAnimation.primaryToIndex : activeAidAnimation.primaryFromIndex,
                  game.config
                ),
                "--aid-motion-duration": `${activeAidAnimation.durationMs}ms`
              } as CSSProperties
            }
          />
          <div
            className="aid-overlay aid-overlay-secondary"
            data-testid="aid-secondary-overlay"
            style={
              {
                backgroundColor: activeAidAnimation.secondaryColor,
                ...getTileLayoutStyle(activeAidAnimation.secondaryFromIndex, game.config)
              } as CSSProperties
            }
          />
        </>
      ) : null}

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

      {showCompletionBurst ? (
        <div className="completion-burst" data-testid="completion-burst" aria-hidden="true">
          <canvas ref={completionCanvasRef as RefObject<HTMLCanvasElement>} className="completion-canvas" />
        </div>
      ) : null}
    </div>
  );
}

type DragPreviewProps = {
  dragTile: Tile | null;
  pointerPosition: PointerPosition | null;
};

export function PuzzleDragPreview({ dragTile, pointerPosition }: DragPreviewProps) {
  if (!dragTile || !pointerPosition) {
    return null;
  }

  return (
    <div
      className="drag-preview"
      aria-hidden="true"
      style={{
        backgroundColor: dragTile.color,
        left: pointerPosition.x,
        top: pointerPosition.y
      }}
    />
  );
}
