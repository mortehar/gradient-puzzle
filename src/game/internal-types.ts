import type { OklabColor } from "../colorAnalysis";
import type {
  AidMove,
  GameConfig,
  GeneratedBoard,
  StructuralDifficultyMetrics
} from "./types";

export type AidCandidate = AidMove & {
  secondaryExact: boolean;
  secondaryDistance: number;
  totalDistance: number;
};

export type TrajectoryPoint = OklabColor;

export type RenderableCandidate = GeneratedBoard & {
  candidateScore: number;
  passesHardGuards: boolean;
};

export type TrajectoryTuning = {
  targetNeighborDistance: number;
  minAxisStep: number;
  minAxisBalance: number;
  maxCenterDrop: number;
  minEdgeMidpointClarity: number;
  maxWorstJumpRatio: number;
  maxEdgeRoughness: number;
  maxAxisDeviation: number;
  maxAxisLightnessDelta: number;
  maxAxisChromaDelta: number;
  baseChromaBias: number;
  maxEase: number;
  maxJitter: number;
};

export type StructuralCandidate = {
  config: GameConfig;
  metrics: StructuralDifficultyMetrics;
  layoutSignature: string;
};

export type RandomSource = () => number;

export type IslandPlacement = {
  startColumn: number;
  startRow: number;
};

export type GeneratedCatalogBounds = {
  boardArea: { min: number; max: number };
  lockedRatio: { min: number; max: number };
  nearestLockDistanceMean: { min: number; max: number };
  nearestLockDistanceP90: { min: number; max: number };
  largestUnlockedRegionRatio: { min: number; max: number };
};
