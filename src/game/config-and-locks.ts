import type { IslandPlacement } from "./internal-types";
import type { GameConfig, IslandLockConfig } from "./types";
import { clamp, pickNearestValidValue, roundToStep } from "./utils";

export function getCellCount(config: GameConfig): number {
  return config.width * config.height;
}

export function getCornerIndexes(width: number, height: number): number[] {
  const cellCount = width * height;
  return [0, width - 1, cellCount - width, cellCount - 1];
}

export function getValidVerticalLineCounts(width: number): number[] {
  return [0, ...getValidLineCounts(width)];
}

export function getValidHorizontalLineCounts(height: number): number[] {
  return [0, ...getValidLineCounts(height)];
}

function getValidLineCounts(length: number): number[] {
  const counts: number[] = [];

  if (length % 2 === 1) {
    counts.push(1);
  }

  for (let count = 2; count <= length; count += 1) {
    if ((length - 1) % (count - 1) === 0) {
      counts.push(count);
    }
  }

  return counts;
}

export function getValidLineDensities(length: number): number[] {
  const densities: number[] = [];

  for (let density = 1; density <= Math.max(1, length - 1); density += 1) {
    if ((length - 1) % density === 0) {
      densities.push(density);
    }
  }

  return densities;
}

export function getValidCrossDensities(width: number, height: number): number[] {
  const diagonalLength = getDiagonalPath(0, 0, width - 1, height - 1, width).length;
  return [0, ...getValidLineDensities(diagonalLength)];
}

export function getValidIslandDensities(width: number, height: number): number[] {
  const verticalDensities = new Set(getValidLineDensities(height));

  return getValidLineDensities(width).filter((density) => verticalDensities.has(density));
}

export function getValidIslandCounts(width: number, height: number, islandWidth: number, islandHeight: number): number[] {
  const maxCount = Math.floor(width / islandWidth) * Math.floor(height / islandHeight);
  const counts = [0];

  for (let count = 1; count <= maxCount; count += 1) {
    if (buildIslandPlacements(width, height, { count, width: islandWidth, height: islandHeight, density: 1 })) {
      counts.push(count);
    }
  }

  return counts;
}

export function normalizeConfig(config: GameConfig): GameConfig {
  const verticalCounts = getValidVerticalLineCounts(config.width);
  const horizontalCounts = getValidHorizontalLineCounts(config.height);
  const verticalDensities = getValidLineDensities(config.height);
  const horizontalDensities = getValidLineDensities(config.width);
  const crossDensities = getValidCrossDensities(config.width, config.height);
  const normalizedIslandDimensions = normalizeIslandDimensions(
    config.width,
    config.height,
    config.islands.width,
    config.islands.height
  );
  const islandCountOptions = getValidIslandCounts(
    config.width,
    config.height,
    normalizedIslandDimensions.width,
    normalizedIslandDimensions.height
  );
  const normalizedIslandCount = pickNearestValidValue(islandCountOptions, Math.max(0, Math.round(config.islands.count)));
  const islandDensityOptions = getValidIslandDensities(normalizedIslandDimensions.width, normalizedIslandDimensions.height);

  return {
    ...config,
    verticalLines: {
      count: pickNearestValidValue(verticalCounts, config.verticalLines.count),
      density: pickNearestValidValue(verticalDensities, config.verticalLines.density)
    },
    horizontalLines: {
      count: pickNearestValidValue(horizontalCounts, config.horizontalLines.count),
      density: pickNearestValidValue(horizontalDensities, config.horizontalLines.density)
    },
    crossLines: {
      density: pickNearestValidValue(crossDensities, config.crossLines.density)
    },
    islands:
      normalizedIslandCount === 0
        ? {
            count: 0,
            width: 1,
            height: 1,
            density: 1
          }
        : {
            count: normalizedIslandCount,
            width: normalizedIslandDimensions.width,
            height: normalizedIslandDimensions.height,
            density: pickNearestValidValue(islandDensityOptions, Math.round(config.islands.density))
          },
    colorConstraints: {
      targetStepStrength: clamp(config.colorConstraints.targetStepStrength, 0, 100),
      axisBalance: clamp(config.colorConstraints.axisBalance, 0, 100),
      lightnessRange: clamp(config.colorConstraints.lightnessRange, 0, 100),
      chromaRange: clamp(config.colorConstraints.chromaRange, 0, 100),
      centerPreservation: clamp(config.colorConstraints.centerPreservation, 0, 100),
      edgeSmoothnessBias: clamp(config.colorConstraints.edgeSmoothnessBias, 0, 100)
    },
    appearance: {
      cellSpacing: clamp(config.appearance.cellSpacing, 0, 16),
      cellRounding: clamp(config.appearance.cellRounding, 0, 16),
      lockRounding: clamp(config.appearance.lockRounding, 0, 16),
      lockThickness: clamp(config.appearance.lockThickness, 1, 8),
      aidTimeSeconds: roundToStep(clamp(config.appearance.aidTimeSeconds, 0, 3), 0.1)
    }
  };
}

export function getLockedIndexes(config: GameConfig): number[] {
  const normalizedConfig = normalizeConfig(config);
  const indexes = new Set<number>();

  getCornerIndexes(normalizedConfig.width, normalizedConfig.height).forEach((index) => indexes.add(index));

  if (normalizedConfig.verticalLines.count > 0) {
    const columns = getLinePositions(normalizedConfig.width, normalizedConfig.verticalLines.count);
    const rows = getDensityPositions(normalizedConfig.height, normalizedConfig.verticalLines.density);

    for (const column of columns) {
      for (const row of rows) {
        indexes.add(row * normalizedConfig.width + column);
      }
    }
  }

  if (normalizedConfig.horizontalLines.count > 0) {
    const rows = getLinePositions(normalizedConfig.height, normalizedConfig.horizontalLines.count);
    const columns = getDensityPositions(normalizedConfig.width, normalizedConfig.horizontalLines.density);

    for (const row of rows) {
      for (const column of columns) {
        indexes.add(row * normalizedConfig.width + column);
      }
    }
  }

  if (normalizedConfig.crossLines.density > 0) {
    const primary = getDiagonalPath(0, 0, normalizedConfig.width - 1, normalizedConfig.height - 1, normalizedConfig.width);
    const secondary = getDiagonalPath(
      normalizedConfig.width - 1,
      0,
      0,
      normalizedConfig.height - 1,
      normalizedConfig.width
    );
    const positions = getDensityPositions(primary.length, normalizedConfig.crossLines.density);

    positions.forEach((position) => {
      indexes.add(primary[position]);
      indexes.add(secondary[position]);
    });
  }

  if (normalizedConfig.islands.count > 0) {
    const islandPlacements = buildIslandPlacements(normalizedConfig.width, normalizedConfig.height, normalizedConfig.islands);
    const islandRows = getDensityPositions(normalizedConfig.islands.height, normalizedConfig.islands.density);
    const islandColumns = getDensityPositions(normalizedConfig.islands.width, normalizedConfig.islands.density);

    islandPlacements?.forEach((placement) => {
      islandRows.forEach((rowOffset) => {
        islandColumns.forEach((columnOffset) => {
          indexes.add((placement.startRow + rowOffset) * normalizedConfig.width + placement.startColumn + columnOffset);
        });
      });
    });
  }

  return [...indexes].sort((left, right) => left - right);
}

export function applyStructureToConfig(baseConfig: GameConfig, structuralConfig: GameConfig): GameConfig {
  return normalizeConfig({
    ...baseConfig,
    width: structuralConfig.width,
    height: structuralConfig.height,
    verticalLines: structuralConfig.verticalLines,
    horizontalLines: structuralConfig.horizontalLines,
    crossLines: structuralConfig.crossLines,
    islands: structuralConfig.islands
  });
}

function normalizeIslandDimensions(boardWidth: number, boardHeight: number, width: number, height: number) {
  const snappedWidth = Math.max(1, Math.round(width));
  const snappedHeight = Math.max(1, Math.round(height));
  const shorterSide = Math.min(snappedWidth, snappedHeight);
  const longerSide = Math.max(snappedWidth, snappedHeight);
  const normalizedHeight = clamp(longerSide, 1, boardHeight);
  const normalizedWidth = clamp(shorterSide, 1, Math.min(boardWidth, normalizedHeight));

  return {
    width: normalizedWidth,
    height: normalizedHeight
  };
}

function getLinePositions(length: number, count: number): number[] {
  if (count === 1) {
    return [Math.floor(length / 2)];
  }

  const step = (length - 1) / (count - 1);
  return Array.from({ length: count }, (_, index) => Math.round(index * step));
}

function getDensityPositions(length: number, density: number): number[] {
  const positions: number[] = [];

  for (let position = 0; position < length; position += density) {
    positions.push(position);
  }

  return positions;
}

function getEvenStartPositions(slack: number, count: number): number[] {
  if (count <= 0) {
    return [];
  }

  if (count === 1) {
    return [Math.floor(slack / 2)];
  }

  const step = slack / (count - 1);

  return Array.from({ length: count }, (_, index) => Math.round(index * step));
}

function getEvenSlotIndexes(length: number, count: number): number[] {
  if (count <= 0) {
    return [];
  }

  if (count === 1) {
    return [Math.floor((length - 1) / 2)];
  }

  const step = (length - 1) / (count - 1);

  return Array.from({ length: count }, (_, index) => Math.round(index * step));
}

function buildIslandPlacements(width: number, height: number, islands: IslandLockConfig): IslandPlacement[] | null {
  if (islands.count <= 0) {
    return [];
  }

  if (islands.width > width || islands.height > height) {
    return null;
  }

  const grid = getBalancedIslandGrid(islands.count);
  const columnStarts = getEvenStartPositions(width - islands.width, grid.columns);
  const rowStarts = getEvenStartPositions(height - islands.height, grid.rows);
  const rowCounts = getBalancedIslandRowCounts(islands.count, grid.rows, grid.columns);

  if (!rowCounts) {
    return null;
  }

  const placements: IslandPlacement[] = [];

  rowCounts.forEach((rowCount, rowIndex) => {
    getEvenSlotIndexes(grid.columns, rowCount).forEach((columnIndex) => {
      placements.push({
        startColumn: columnStarts[columnIndex],
        startRow: rowStarts[rowIndex]
      });
    });
  });

  if (placements.length !== islands.count || hasOverlappingIslandPlacements(placements, islands.width, islands.height)) {
    return null;
  }

  return placements;
}

function getBalancedIslandGrid(count: number) {
  if (count <= 1) {
    return { columns: 1, rows: 1 };
  }

  const firstSide = Math.ceil(Math.sqrt(count));
  const secondSide = Math.ceil(count / firstSide);

  return firstSide <= secondSide ? { columns: firstSide, rows: secondSide } : { columns: secondSide, rows: firstSide };
}

function getBalancedIslandRowCounts(count: number, rows: number, columns: number): number[] | null {
  const validRowCounts = Array.from({ length: columns + 1 }, (_, candidate) => candidate).filter((candidate) =>
    canPlaceSymmetricSlotCount(columns, candidate)
  );
  const averageCount = count / rows;
  const pairCount = Math.floor(rows / 2);
  const centerRowIndex = Math.floor(rows / 2);
  const hasCenterRow = rows % 2 === 1;
  let bestCounts: number[] | null = null;
  let bestScore: [number, number, number] | null = null;

  function evaluate(pairValues: number[], centerValue: number) {
    const counts = Array.from({ length: rows }, () => 0);

    pairValues.forEach((value, index) => {
      counts[index] = value;
      counts[rows - 1 - index] = value;
    });

    if (hasCenterRow) {
      counts[centerRowIndex] = centerValue;
    }

    const deviationScore = counts.reduce((sum, rowCount) => sum + (rowCount - averageCount) ** 2, 0);
    const roughnessScore = counts.slice(1).reduce((sum, rowCount, index) => sum + Math.abs(rowCount - counts[index]), 0);
    const centerDistanceScore = hasCenterRow ? Math.abs(counts[centerRowIndex] - averageCount) : 0;
    const nextScore: [number, number, number] = [deviationScore, roughnessScore, centerDistanceScore];

    if (!bestScore || compareScoreTriples(nextScore, bestScore) < 0) {
      bestCounts = counts;
      bestScore = nextScore;
    }
  }

  function getRemainingPairCapacity(remainingPairs: number) {
    return remainingPairs * 2 * columns;
  }

  function search(pairIndex: number, usedCount: number, pairValues: number[]) {
    const remainingPairs = pairCount - pairIndex;
    const centerCapacity = hasCenterRow ? columns : 0;

    if (usedCount > count || usedCount + getRemainingPairCapacity(remainingPairs) + centerCapacity < count) {
      return;
    }

    if (pairIndex === pairCount) {
      const centerOptions = hasCenterRow ? validRowCounts : [0];

      centerOptions.forEach((centerValue) => {
        if (usedCount + centerValue === count) {
          evaluate(pairValues, centerValue);
        }
      });

      return;
    }

    validRowCounts.forEach((rowValue) => {
      search(pairIndex + 1, usedCount + rowValue * 2, [...pairValues, rowValue]);
    });
  }

  search(0, 0, []);

  return bestCounts;
}

function canPlaceSymmetricSlotCount(length: number, count: number): boolean {
  return count >= 0 && count <= length && (length % 2 === 1 || count % 2 === 0);
}

function compareScoreTriples(left: [number, number, number], right: [number, number, number]): number {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }

  return 0;
}

function hasOverlappingIslandPlacements(placements: IslandPlacement[], islandWidth: number, islandHeight: number): boolean {
  for (let index = 0; index < placements.length; index += 1) {
    for (let candidateIndex = index + 1; candidateIndex < placements.length; candidateIndex += 1) {
      if (
        rangesOverlap(
          placements[index].startColumn,
          placements[index].startColumn + islandWidth,
          placements[candidateIndex].startColumn,
          placements[candidateIndex].startColumn + islandWidth
        ) &&
        rangesOverlap(
          placements[index].startRow,
          placements[index].startRow + islandHeight,
          placements[candidateIndex].startRow,
          placements[candidateIndex].startRow + islandHeight
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

function getDiagonalPath(
  startColumn: number,
  startRow: number,
  endColumn: number,
  endRow: number,
  width: number
): number[] {
  const path: number[] = [];
  let column = startColumn;
  let row = startRow;
  const deltaColumn = Math.abs(endColumn - startColumn);
  const stepColumn = startColumn < endColumn ? 1 : -1;
  const deltaRow = -Math.abs(endRow - startRow);
  const stepRow = startRow < endRow ? 1 : -1;
  let error = deltaColumn + deltaRow;

  while (true) {
    path.push(row * width + column);

    if (column === endColumn && row === endRow) {
      break;
    }

    const doubledError = 2 * error;

    if (doubledError >= deltaRow) {
      error += deltaRow;
      column += stepColumn;
    }

    if (doubledError <= deltaColumn) {
      error += deltaColumn;
      row += stepRow;
    }
  }

  return path;
}
