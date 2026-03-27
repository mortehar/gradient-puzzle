export const MIN_BOARD_SIZE = 3;
export const MAX_BOARD_SIZE = 10;
const MAX_CORNER_ATTEMPTS = 500;

export type LineLockConfig = {
  count: number;
  density: number;
};

export type CrossLockConfig = {
  density: number;
};

export type ColorConstraints = {
  minHueDistance: number;
  minSaturationValue: number;
  minLuminosityValue: number;
  maxLuminosityValue: number;
  minLuminosityDistance: number;
};

export type AppearanceConfig = {
  cellSpacing: number;
  cellRounding: number;
  aidTimeSeconds: number;
};

export type GameConfig = {
  width: number;
  height: number;
  verticalLines: LineLockConfig;
  horizontalLines: LineLockConfig;
  crossLines: CrossLockConfig;
  colorConstraints: ColorConstraints;
  appearance: AppearanceConfig;
};

export type CornerColor = {
  h: number;
  s: number;
  l: number;
};

export type Tile = {
  id: string;
  solvedIndex: number;
  currentIndex: number;
  locked: boolean;
  color: string;
};

export type AidMove = {
  primaryTileId: string;
  secondaryTileId: string;
  primaryFromIndex: number;
  primaryToIndex: number;
  secondaryFromIndex: number;
  secondaryToIndex: number;
};

export type GameState = {
  tiles: Tile[];
  scrambledTiles: Tile[];
  swapCount: number;
  hintCount: number;
  status: "preview" | "scrambling" | "animating-hint" | "playing" | "solved";
  config: GameConfig;
};

type Rgb = {
  r: number;
  g: number;
  b: number;
};

type AidCandidate = AidMove & {
  secondaryExact: boolean;
  secondaryDistance: number;
  totalDistance: number;
};

export const DEFAULT_COLOR_CONSTRAINTS: ColorConstraints = {
  minHueDistance: 60,
  minSaturationValue: 25,
  minLuminosityValue: 10,
  maxLuminosityValue: 85,
  minLuminosityDistance: 0
};

export const DEFAULT_CONFIG: GameConfig = {
  width: 5,
  height: 5,
  verticalLines: {
    count: 2,
    density: 2
  },
  horizontalLines: {
    count: 0,
    density: 1
  },
  crossLines: {
    density: 0
  },
  colorConstraints: DEFAULT_COLOR_CONSTRAINTS,
  appearance: {
    cellSpacing: 0,
    cellRounding: 0,
    aidTimeSeconds: 1.0
  }
};

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

export function normalizeConfig(config: GameConfig): GameConfig {
  const verticalCounts = getValidVerticalLineCounts(config.width);
  const horizontalCounts = getValidHorizontalLineCounts(config.height);
  const verticalDensities = getValidLineDensities(config.height);
  const horizontalDensities = getValidLineDensities(config.width);
  const crossDensities = getValidCrossDensities(config.width, config.height);
  const rawMinLuminosityValue = clamp(config.colorConstraints.minLuminosityValue, 0, 100);
  const rawMaxLuminosityValue = clamp(config.colorConstraints.maxLuminosityValue, 0, 100);
  const luminosityValues = normalizeLuminosityRange(rawMinLuminosityValue, rawMaxLuminosityValue);

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
    colorConstraints: {
      minHueDistance: clamp(config.colorConstraints.minHueDistance, 0, 180),
      minSaturationValue: clamp(config.colorConstraints.minSaturationValue, 0, 100),
      minLuminosityValue: luminosityValues.minLuminosityValue,
      maxLuminosityValue: luminosityValues.maxLuminosityValue,
      minLuminosityDistance: clamp(config.colorConstraints.minLuminosityDistance, 0, 100)
    },
    appearance: {
      cellSpacing: clamp(config.appearance.cellSpacing, 0, 16),
      cellRounding: clamp(config.appearance.cellRounding, 0, 16),
      aidTimeSeconds: roundToStep(clamp(config.appearance.aidTimeSeconds, 0, 3), 0.1)
    }
  };
}

function normalizeLuminosityRange(
  nextMinLuminosityValue: number,
  nextMaxLuminosityValue: number
) {
  if (nextMinLuminosityValue <= nextMaxLuminosityValue) {
    return {
      minLuminosityValue: nextMinLuminosityValue,
      maxLuminosityValue: nextMaxLuminosityValue
    };
  }

  return {
    minLuminosityValue: nextMinLuminosityValue,
    maxLuminosityValue: nextMinLuminosityValue
  };
}

function roundToStep(value: number, step: number): number {
  return Number((Math.round(value / step) * step).toFixed(1));
}

function pickNearestValidValue(values: number[], value: number): number {
  if (values.includes(value)) {
    return value;
  }

  return values.reduce((best, candidate) =>
    Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best
  );
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

  return [...indexes].sort((left, right) => left - right);
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

export function createNewGame(config: GameConfig): GameState {
  const normalizedConfig = normalizeConfig(config);
  const lockedIndexes = getLockedIndexes(normalizedConfig);
  const cornerColors = generateCornerColors(normalizedConfig.colorConstraints);
  const solvedTiles = buildSolvedTiles(cornerColors, normalizedConfig);
  const scrambledTiles = scrambleMovableTiles(solvedTiles, lockedIndexes);

  return {
    tiles: solvedTiles,
    scrambledTiles,
    swapCount: 0,
    hintCount: 0,
    status: "preview",
    config: normalizedConfig
  };
}

export function generateCornerColors(colorConstraints: ColorConstraints): CornerColor[] {
  for (let attempt = 0; attempt < MAX_CORNER_ATTEMPTS; attempt += 1) {
    const colors = Array.from({ length: 4 }, () => ({
      h: Math.floor(Math.random() * 360),
      s: randomInRange(colorConstraints.minSaturationValue, 100),
      l: randomInRange(colorConstraints.minLuminosityValue, colorConstraints.maxLuminosityValue)
    }));

    if (cornerColorsAreValid(colors, colorConstraints)) {
      return colors;
    }
  }

  return generateCornerColors(colorConstraints);
}

function randomInRange(minimum: number, maximum: number): number {
  return Math.round(minimum + Math.random() * (maximum - minimum));
}

function cornerColorsAreValid(colors: CornerColor[], constraints: ColorConstraints): boolean {
  return colors.every((color, leftIndex) => {
    if (
      color.s < constraints.minSaturationValue ||
      color.l < constraints.minLuminosityValue ||
      color.l > constraints.maxLuminosityValue
    ) {
      return false;
    }

    return colors.slice(leftIndex + 1).every((other) => {
      const hueDistance = getCircularHueDistance(color.h, other.h);
      const luminosityDistance = Math.abs(color.l - other.l);

      return (
        hueDistance >= constraints.minHueDistance &&
        luminosityDistance >= constraints.minLuminosityDistance
      );
    });
  });
}

function getCircularHueDistance(left: number, right: number): number {
  const delta = Math.abs(left - right);
  return Math.min(delta, 360 - delta);
}

export function buildSolvedTiles(cornerColors: CornerColor[], config: GameConfig): Tile[] {
  const lockedIndexes = new Set(getLockedIndexes(config));
  const corners = cornerColors.map((color) => hslToRgb(color.h, color.s, color.l));
  const cellCount = getCellCount(config);

  return Array.from({ length: cellCount }, (_, solvedIndex) => {
    const row = Math.floor(solvedIndex / config.width);
    const column = solvedIndex % config.width;
    const rowRatio = config.height === 1 ? 0 : row / (config.height - 1);
    const columnRatio = config.width === 1 ? 0 : column / (config.width - 1);
    const color = bilinearInterpolate(corners, rowRatio, columnRatio);

    return {
      id: `tile-${solvedIndex}`,
      solvedIndex,
      currentIndex: solvedIndex,
      locked: lockedIndexes.has(solvedIndex),
      color: rgbToCss(color)
    };
  });
}

function bilinearInterpolate(corners: Rgb[], rowRatio: number, columnRatio: number): Rgb {
  const [topLeft, topRight, bottomLeft, bottomRight] = corners;
  const top = mixColor(topLeft, topRight, columnRatio);
  const bottom = mixColor(bottomLeft, bottomRight, columnRatio);
  return mixColor(top, bottom, rowRatio);
}

function mixColor(start: Rgb, end: Rgb, ratio: number): Rgb {
  return {
    r: Math.round(start.r + (end.r - start.r) * ratio),
    g: Math.round(start.g + (end.g - start.g) * ratio),
    b: Math.round(start.b + (end.b - start.b) * ratio)
  };
}

export function scrambleMovableTiles(solvedTiles: Tile[], lockedIndexes?: number[]): Tile[] {
  const lockedIndexSet = new Set(
    lockedIndexes ?? solvedTiles.filter((tile) => tile.locked).map((tile) => tile.solvedIndex)
  );
  const movableIndexes = solvedTiles
    .map((tile) => tile.solvedIndex)
    .filter((index) => !lockedIndexSet.has(index));

  if (movableIndexes.length < 2) {
    throw new Error("Puzzle requires at least two movable tiles.");
  }

  const derangedIndexes = createDerangement(movableIndexes);
  const tileBySolvedIndex = new Map(solvedTiles.map((tile) => [tile.solvedIndex, tile]));

  return movableIndexes
    .map((index, position) => {
      const tile = tileBySolvedIndex.get(index);
      const nextIndex = derangedIndexes[position];

      if (!tile) {
        throw new Error(`Missing tile for solved index ${index}`);
      }

      return {
        ...tile,
        currentIndex: nextIndex
      };
    })
    .concat(
      solvedTiles
        .filter((tile) => tile.locked)
        .map((tile) => ({ ...tile }))
    )
    .sort((left, right) => left.currentIndex - right.currentIndex);
}

function createDerangement(indexes: number[]): number[] {
  let shuffled = [...indexes];

  do {
    shuffled = shuffle([...indexes]);
  } while (shuffled.some((value, position) => value === indexes[position]));

  return shuffled;
}

function shuffle<T>(values: T[]): T[] {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[randomIndex]] = [values[randomIndex], values[index]];
  }

  return values;
}

export function swapTiles(tiles: Tile[], fromIndex: number, toIndex: number): Tile[] {
  if (fromIndex === toIndex) {
    return tiles;
  }

  const fromTile = tiles.find((tile) => tile.currentIndex === fromIndex);
  const toTile = tiles.find((tile) => tile.currentIndex === toIndex);

  if (!fromTile || !toTile || fromTile.locked || toTile.locked) {
    return tiles;
  }

  return tiles
    .map((tile) => {
      if (tile.id === fromTile.id) {
        return { ...tile, currentIndex: toIndex };
      }

      if (tile.id === toTile.id) {
        return { ...tile, currentIndex: fromIndex };
      }

      return tile;
    })
    .sort((left, right) => left.currentIndex - right.currentIndex);
}

export function findBestAidMove(tiles: Tile[], config: GameConfig): AidMove | null {
  const movableTiles = tiles.filter((tile) => !tile.locked);

  if (movableTiles.length < 2) {
    return null;
  }

  let bestCandidate: AidCandidate | null = null;

  for (const primaryTile of movableTiles) {
    if (primaryTile.currentIndex === primaryTile.solvedIndex) {
      continue;
    }

    const secondaryTile = movableTiles.find((tile) => tile.currentIndex === primaryTile.solvedIndex);

    if (!secondaryTile || secondaryTile.id === primaryTile.id) {
      continue;
    }

    const swapped = swapTiles(tiles, primaryTile.currentIndex, secondaryTile.currentIndex);
    const candidate = buildAidCandidate(swapped, config, primaryTile, secondaryTile);

    bestCandidate = chooseBetterAidCandidate(bestCandidate, candidate);
  }

  return bestCandidate;
}

function buildAidCandidate(
  tiles: Tile[],
  config: GameConfig,
  primaryTile: Tile,
  secondaryTile: Tile
): AidCandidate {
  const nextSecondary = tiles.find((tile) => tile.id === secondaryTile.id);

  if (!nextSecondary) {
    throw new Error("Aid candidate is missing swapped tiles.");
  }

  return {
    primaryTileId: primaryTile.id,
    secondaryTileId: secondaryTile.id,
    primaryFromIndex: primaryTile.currentIndex,
    primaryToIndex: primaryTile.solvedIndex,
    secondaryFromIndex: secondaryTile.currentIndex,
    secondaryToIndex: primaryTile.currentIndex,
    secondaryExact: nextSecondary.currentIndex === nextSecondary.solvedIndex,
    secondaryDistance: getTileDistance(nextSecondary, config.width),
    totalDistance: getTotalDistance(tiles, config)
  };
}

function chooseBetterAidCandidate(current: AidCandidate | null, candidate: AidCandidate): AidCandidate {
  if (!current) {
    return candidate;
  }

  if (candidate.secondaryExact !== current.secondaryExact) {
    return candidate.secondaryExact ? candidate : current;
  }

  if (candidate.secondaryDistance !== current.secondaryDistance) {
    return candidate.secondaryDistance < current.secondaryDistance ? candidate : current;
  }

  if (candidate.totalDistance !== current.totalDistance) {
    return candidate.totalDistance < current.totalDistance ? candidate : current;
  }

  if (candidate.primaryFromIndex !== current.primaryFromIndex) {
    return candidate.primaryFromIndex < current.primaryFromIndex ? candidate : current;
  }

  return candidate.primaryToIndex < current.primaryToIndex ? candidate : current;
}

function getTotalDistance(tiles: Tile[], config: GameConfig): number {
  return tiles.filter((tile) => !tile.locked).reduce((total, tile) => total + getTileDistance(tile, config.width), 0);
}

function getTileDistance(tile: Tile, width: number): number {
  const currentRow = Math.floor(tile.currentIndex / width);
  const currentColumn = tile.currentIndex % width;
  const solvedRow = Math.floor(tile.solvedIndex / width);
  const solvedColumn = tile.solvedIndex % width;

  return Math.abs(currentRow - solvedRow) + Math.abs(currentColumn - solvedColumn);
}

export function isSolved(tiles: Tile[]): boolean {
  return tiles.every((tile) => tile.currentIndex === tile.solvedIndex);
}

function hslToRgb(hue: number, saturation: number, luminosity: number): Rgb {
  const normalizedSaturation = saturation / 100;
  const normalizedLuminosity = luminosity / 100;
  const chroma = (1 - Math.abs(2 * normalizedLuminosity - 1)) * normalizedSaturation;
  const huePrime = hue / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = x;
  } else if (huePrime < 2) {
    red = x;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = x;
  } else if (huePrime < 4) {
    green = x;
    blue = chroma;
  } else if (huePrime < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const match = normalizedLuminosity - chroma / 2;

  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255)
  };
}

function rgbToCss(color: Rgb): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
