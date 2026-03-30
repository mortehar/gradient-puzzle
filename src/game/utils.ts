import type { OklabColor } from "../colorAnalysis";
import type { RandomSource } from "./internal-types";

export function normalizeMetric(value: number, bounds: { min: number; max: number }): number {
  if (bounds.max <= bounds.min) {
    return 0;
  }

  return clamp((value - bounds.min) / (bounds.max - bounds.min), 0, 1);
}

export function getMean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getPercentileFromValues(values: number[], percentile: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * percentile;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  const remainder = position - lowerIndex;

  return sorted[lowerIndex] + (sorted[upperIndex] - sorted[lowerIndex]) * remainder;
}

export function roundToStep(value: number, step: number): number {
  return Number((Math.round(value / step) * step).toFixed(1));
}

export function pickNearestValidValue(values: number[], value: number): number {
  if (values.includes(value)) {
    return value;
  }

  return values.reduce((best, candidate) =>
    Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best
  );
}

export function getBounds(values: number[]) {
  return values.reduce(
    (bounds, value) => ({
      min: Math.min(bounds.min, value),
      max: Math.max(bounds.max, value)
    }),
    { min: Infinity, max: -Infinity }
  );
}

export function addOklab(left: OklabColor, right: OklabColor): OklabColor {
  return {
    l: left.l + right.l,
    a: left.a + right.a,
    b: left.b + right.b
  };
}

export function lerp(start: number, end: number, ratio: number): number {
  return start + (end - start) * ratio;
}

export function randomInRangeFloat(minimum: number, maximum: number, random: RandomSource): number {
  return minimum + random() * (maximum - minimum);
}

export function randomSignedFloat(minimum: number, maximum: number, random: RandomSource): number {
  const magnitude = randomInRangeFloat(minimum, maximum, random);
  return random() < 0.5 ? magnitude : -magnitude;
}

export function createSeededRandom(seed: number): RandomSource {
  let state = (seed >>> 0) || 0x6d2b79f5;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStringToSeed(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
