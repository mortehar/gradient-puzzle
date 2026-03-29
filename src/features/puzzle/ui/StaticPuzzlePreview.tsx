import { useMemo } from "react";
import { createGameFromPublishedPuzzle, type PublishedPuzzle } from "../domain";
import { getBoardStyle, getTileLayoutStyle } from "./boardPresentation";
import { LockedTileAdornment, type LockedTileStyle } from "./lockedTileStyles";

type StaticPuzzlePreviewProps = {
  puzzle: PublishedPuzzle;
  lockedTileStyle: LockedTileStyle;
  size?: "small" | "large";
  testId?: string;
};

export function StaticPuzzlePreview({ puzzle, lockedTileStyle, size = "large", testId }: StaticPuzzlePreviewProps) {
  const game = useMemo(() => createGameFromPublishedPuzzle(puzzle), [puzzle]);
  const orderedTiles = useMemo(() => [...game.tiles].sort((left, right) => left.currentIndex - right.currentIndex), [game.tiles]);

  return (
    <div
      className={["board", "board-preview", size === "small" ? "board-preview-small" : "board-preview-large"].join(" ")}
      aria-hidden="true"
      data-locked-tile-style={lockedTileStyle}
      data-testid={testId}
      style={getBoardStyle(game, game.config, "none")}
    >
      {orderedTiles.map((tile) => (
        <div
          key={tile.id}
          className={["tile", "tile-static", tile.locked ? "tile-locked" : ""].join(" ")}
          style={{ backgroundColor: tile.color, ...getTileLayoutStyle(tile.currentIndex, game.config) }}
        >
          {tile.locked ? <LockedTileAdornment lockedTileStyle={lockedTileStyle} tileColor={tile.color} /> : null}
        </div>
      ))}
    </div>
  );
}
