import type { Tile } from "../domain";

type ElementAtPoint = (clientX: number, clientY: number) => Element | null;

export function resolveDragTargetIndex(
  clientX: number,
  clientY: number,
  tiles: Tile[],
  originIndex: number,
  elementAtPoint: ElementAtPoint = (x, y) => document.elementFromPoint(x, y)
): number | null {
  const element = elementAtPoint(clientX, clientY);
  const tileElement = element?.closest<HTMLElement>("[data-current-index]");
  const indexAttribute = tileElement?.dataset.currentIndex;

  if (!indexAttribute) {
    return null;
  }

  const targetIndex = Number(indexAttribute);

  if (Number.isNaN(targetIndex) || targetIndex === originIndex) {
    return null;
  }

  const targetTile = tiles.find((tile) => tile.currentIndex === targetIndex);

  if (!targetTile || targetTile.locked) {
    return null;
  }

  return targetIndex;
}
