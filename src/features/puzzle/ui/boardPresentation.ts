import type { CSSProperties } from "react";
import type { AidMove, GameConfig, GameState, Tile } from "../domain";

export const PREVIEW_DURATION_MS = 2000;
export const SCRAMBLE_DURATION_MS = 1000;
export const MANUAL_MOVE_DURATION_MS = 180;
export const AID_ANIMATION_START_DELAY_MS = 20;
export const COMPLETION_BURST_DURATION_MS = 3000;
export const SCRAMBLE_FLIP_CARD_DURATION_MS = 700;
export const SCRAMBLE_STAGGER_SPREAD_MS = 220;
export const CINEMATIC_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
export const QUICK_EASING = "ease";
export const RESEARCH_SAMPLE_COUNT = 24;
export const DEFAULT_DIFFICULTY_TARGET = 50;

const COMPLETION_PARTICLE_COUNT = 260;
const GOLDEN_RATIO_CONJUGATE = 0.61803398875;

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

type CompletionParticle = {
  id: string;
  velocityX: number;
  velocityY: number;
  resistance: number;
  maxDistance: number;
  sizeStart: number;
  sizeEnd: number;
  opacityPeak: number;
  blurPx: number;
};

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function easeOutQuad(value: number): number {
  return 1 - (1 - value) * (1 - value);
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

function easeInCubic(value: number): number {
  return value * value * value;
}

export function buildCompletionParticles() {
  return Array.from({ length: COMPLETION_PARTICLE_COUNT }, (_, index): CompletionParticle => {
    const angleSeed = (index * GOLDEN_RATIO_CONJUGATE) % 1;
    const angleJitter = (pseudoRandom((index + 1) * 1.13) - 0.5) * 0.008;
    const angle = (angleSeed + angleJitter) * Math.PI * 2;
    const speed = 248 + pseudoRandom((index + 1) * 1.79) * 42;
    const sizeSeed = pseudoRandom((index + 1) * 2.41);
    const opacitySeed = pseudoRandom((index + 1) * 3.07);
    const blurSeed = pseudoRandom((index + 1) * 4.73);
    const resistance = 0.76 + pseudoRandom((index + 1) * 5.29) * 0.18;
    const durationSeconds = COMPLETION_BURST_DURATION_MS / 1000;
    const maxDistance = (speed / resistance) * (1 - Math.exp(-resistance * durationSeconds));

    return {
      id: `completion-particle-${index}`,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      resistance,
      maxDistance,
      sizeStart: 1.8 + sizeSeed * 0.9,
      sizeEnd: 8.2 + sizeSeed * 4.6,
      opacityPeak: 0.44 + opacitySeed * 0.18,
      blurPx: blurSeed > 0.8 ? 0.45 : blurSeed > 0.45 ? 0.18 : 0
    };
  });
}

export function drawCompletionBurst(canvas: HTMLCanvasElement, particles: ReturnType<typeof buildCompletionParticles>, elapsedMs: number) {
  let context: CanvasRenderingContext2D | null = null;

  try {
    context = canvas.getContext("2d");
  } catch {
    return;
  }

  if (!context) {
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const { width, height } = canvas.getBoundingClientRect();
  const nextCanvasWidth = Math.max(1, Math.round(width * dpr));
  const nextCanvasHeight = Math.max(1, Math.round(height * dpr));

  if (canvas.width !== nextCanvasWidth || canvas.height !== nextCanvasHeight) {
    canvas.width = nextCanvasWidth;
    canvas.height = nextCanvasHeight;
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2;
  const elapsedSeconds = elapsedMs / 1000;

  for (const particle of particles) {
    const resistedProgress =
      (1 - Math.exp(-particle.resistance * elapsedSeconds)) /
      (1 - Math.exp(-particle.resistance * (COMPLETION_BURST_DURATION_MS / 1000)));
    const progress = clamp01(resistedProgress);
    const x = particle.velocityX * progress;
    const y = particle.velocityY * progress;
    const distance = Math.hypot(x, y);
    const distanceProgress = clamp01(distance / particle.maxDistance);
    const growth = Math.pow(distanceProgress, 0.72);
    const size = lerp(particle.sizeStart, particle.sizeEnd, growth);
    const reveal = easeOutQuad(clamp01(elapsedMs / 170));
    const centerEscape = easeOutCubic(clamp01(distanceProgress / 0.18));
    const fade = 1 - easeInCubic(clamp01((distanceProgress - 0.62) / 0.38));
    const opacity = particle.opacityPeak * reveal * centerEscape * fade;

    if (opacity <= 0.002) {
      continue;
    }

    context.beginPath();
    context.globalAlpha = opacity;
    context.fillStyle = "#ffffff";
    context.shadowColor = "rgba(255, 255, 255, 0.7)";
    context.shadowBlur = size * 0.45 + particle.blurPx * 18;
    context.arc(centerX + x, centerY + y, size / 2, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 1;
  context.shadowBlur = 0;
}

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
    width: `calc((100% - (${config.width - 1} * var(--tile-gap))) / ${config.width})`,
    height: `calc((100% - (${config.height - 1} * var(--tile-gap))) / ${config.height})`,
    left: `calc(${column} * ((100% - (${config.width - 1} * var(--tile-gap))) / ${config.width} + var(--tile-gap)))`,
    top: `calc(${row} * ((100% - (${config.height - 1} * var(--tile-gap))) / ${config.height} + var(--tile-gap)))`
  };
}

export function getBoardStyle(gameState: GameState, previewConfig: GameConfig, transitionMode: TransitionMode): CSSProperties {
  return {
    "--board-columns": gameState.config.width,
    "--board-rows": gameState.config.height,
    "--tile-motion-duration":
      transitionMode === "cinematic" ? `${SCRAMBLE_DURATION_MS}ms` : `${MANUAL_MOVE_DURATION_MS}ms`,
    "--tile-motion-easing": transitionMode === "cinematic" ? CINEMATIC_EASING : QUICK_EASING,
    "--scramble-flip-duration": `${SCRAMBLE_FLIP_CARD_DURATION_MS}ms`,
    "--tile-gap": `${previewConfig.appearance.cellSpacing}px`,
    "--tile-radius": `${previewConfig.appearance.cellRounding}px`,
    "--tile-inner-radius": `${previewConfig.appearance.lockRounding}px`,
    "--tile-lock-width": `${previewConfig.appearance.lockThickness}px`,
    aspectRatio: `${gameState.config.width} / ${gameState.config.height}`
  } as CSSProperties;
}

export function formatMetricNumber(value: number): string {
  return value.toFixed(3);
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
