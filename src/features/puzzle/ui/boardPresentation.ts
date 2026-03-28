import type { CSSProperties } from "react";
import type { AidMove, GameConfig, GameState, Tile } from "../domain";

export const PREVIEW_DURATION_MS = 2000;
export const SCRAMBLE_DURATION_MS = 1000;
export const MANUAL_MOVE_DURATION_MS = 180;
export const AID_ANIMATION_START_DELAY_MS = 20;
export const COMPLETION_CHECK_DURATION_MS = 4400;
export const SCRAMBLE_FLIP_CARD_DURATION_MS = 700;
export const SCRAMBLE_STAGGER_SPREAD_MS = 220;
export const CINEMATIC_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
export const QUICK_EASING = "ease";
export const RESEARCH_SAMPLE_COUNT = 24;
export const DEFAULT_DIFFICULTY_TARGET = 10;
export const FIXED_BOARD_FRAME_ASPECT_RATIO = "5 / 7";
export const TILE_OVERDRAW_PX = 1;

export type TransitionMode = "none" | "quick" | "cinematic";

export type DragState = {
  tileId: string;
  originIndex: number;
  pointerId: number;
};

export type PointerPosition = {
  x: number;
  y: number;
};

export type AidAnimationState = AidMove & {
  primaryColor: string;
  secondaryColor: string;
  durationMs: number;
  moving: boolean;
};

export type ScrambleFlipTile = {
  index: number;
  frontColor: string;
  backColor: string;
  locked: boolean;
  delayMs: number;
};

export type CompletionCeremonyPhase = "idle" | "checkmark" | "settled";

export function getAidDurationMs(aidTimeSeconds: number): number {
  return Math.round(aidTimeSeconds * 1000);
}

export function buildScrambleFlipTiles(tiles: Tile[], scrambledTiles: Tile[], config: GameConfig): ScrambleFlipTile[] {
  const solvedTiles = [...tiles].sort((left, right) => left.solvedIndex - right.solvedIndex);
  const movableTiles = solvedTiles.filter((tile) => !tile.locked);
  const maxWaveScore = movableTiles.reduce((highest, tile) => {
    const row = Math.floor(tile.solvedIndex / config.width);
    const column = tile.solvedIndex % config.width;
    return Math.max(highest, row + column);
  }, 0);

  return solvedTiles.map((tile) => ({
    index: tile.solvedIndex,
    frontColor: tile.color,
    backColor: scrambledTiles.find((candidate) => candidate.currentIndex === tile.solvedIndex)?.color ?? tile.color,
    locked: tile.locked,
    delayMs: getScrambleFlipDelay(tile, config, maxWaveScore)
  }));
}

function getScrambleFlipDelay(tile: Tile, config: GameConfig, maxWaveScore: number): number {
  if (tile.locked) {
    return 0;
  }

  const row = Math.floor(tile.solvedIndex / config.width);
  const column = tile.solvedIndex % config.width;
  const waveScore = row + column;
  const normalizedWave = maxWaveScore === 0 ? 0 : waveScore / maxWaveScore;

  return Math.round(normalizedWave * SCRAMBLE_STAGGER_SPREAD_MS);
}

export function getTileLayoutStyle(index: number, config: GameConfig): CSSProperties {
  const row = Math.floor(index / config.width);
  const column = index % config.width;

  return {
    width: `calc(100% / ${config.width} + ${TILE_OVERDRAW_PX}px)`,
    height: `calc(100% / ${config.height} + ${TILE_OVERDRAW_PX}px)`,
    left: `calc(${column} * 100% / ${config.width} - ${TILE_OVERDRAW_PX / 2}px)`,
    top: `calc(${row} * 100% / ${config.height} - ${TILE_OVERDRAW_PX / 2}px)`
  };
}

export function getBoardStyle(gameState: GameState, _previewConfig: GameConfig, transitionMode: TransitionMode): CSSProperties {
  return {
    "--board-columns": gameState.config.width,
    "--board-rows": gameState.config.height,
    "--tile-motion-duration":
      transitionMode === "cinematic" ? `${SCRAMBLE_DURATION_MS}ms` : `${MANUAL_MOVE_DURATION_MS}ms`,
    "--tile-motion-easing": transitionMode === "cinematic" ? CINEMATIC_EASING : QUICK_EASING,
    "--scramble-flip-duration": `${SCRAMBLE_FLIP_CARD_DURATION_MS}ms`,
    aspectRatio: FIXED_BOARD_FRAME_ASPECT_RATIO
  } as CSSProperties;
}

export function formatMetricNumber(value: number): string {
  return value.toFixed(3);
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
