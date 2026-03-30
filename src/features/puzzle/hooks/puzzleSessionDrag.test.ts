import { describe, expect, it } from "vitest";
import { resolveDragTargetIndex } from "./puzzleSessionDrag";
import type { Tile } from "../domain";

const tiles: Tile[] = [
  {
    id: "tile-0",
    solvedIndex: 0,
    currentIndex: 0,
    locked: false,
    color: "rgb(1, 2, 3)"
  },
  {
    id: "tile-1",
    solvedIndex: 1,
    currentIndex: 1,
    locked: true,
    color: "rgb(4, 5, 6)"
  },
  {
    id: "tile-2",
    solvedIndex: 2,
    currentIndex: 2,
    locked: false,
    color: "rgb(7, 8, 9)"
  }
];

function buildTileElement(currentIndex: number | null) {
  const element = document.createElement("button");

  if (currentIndex !== null) {
    element.dataset.currentIndex = String(currentIndex);
  }

  return element;
}

describe("puzzleSessionDrag", () => {
  it("returns the movable target index under the pointer", () => {
    const target = buildTileElement(2);

    expect(resolveDragTargetIndex(10, 10, tiles, 0, () => target)).toBe(2);
  });

  it("ignores the origin tile, locked tiles, and non-tile elements", () => {
    expect(resolveDragTargetIndex(10, 10, tiles, 0, () => buildTileElement(0))).toBeNull();
    expect(resolveDragTargetIndex(10, 10, tiles, 0, () => buildTileElement(1))).toBeNull();
    expect(resolveDragTargetIndex(10, 10, tiles, 0, () => buildTileElement(null))).toBeNull();
  });
});
