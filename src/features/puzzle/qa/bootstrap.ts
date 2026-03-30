import { getPublishedCatalog, type DifficultyTier } from "../domain";
import type { BrowserPreferences } from "../hooks/browserPreferences";
import { isLockedTileStyle, type LockedTileStyle } from "../ui/lockedTileStyles";

const PUBLISHED_CATALOG = getPublishedCatalog("v1");

const QA_SCREEN_VALUES = ["home", "tier", "puzzle"] as const;
const QA_PHASE_VALUES = ["preview", "playing", "solved"] as const;
const QA_SETTINGS_VALUES = ["open", "closed"] as const;
const QA_MOTION_VALUES = ["live", "reduced", "static"] as const;
const QA_TIER_OPTIONS = [
  { slug: "easy", tier: "Easy" },
  { slug: "medium", tier: "Medium" },
  { slug: "hard", tier: "Hard" },
  { slug: "expert", tier: "Expert" },
  { slug: "master", tier: "Master" }
] as const satisfies readonly { slug: string; tier: DifficultyTier }[];

export type PuzzleQaScreen = (typeof QA_SCREEN_VALUES)[number];
export type PuzzleQaPhase = (typeof QA_PHASE_VALUES)[number];
export type PuzzleQaSettings = (typeof QA_SETTINGS_VALUES)[number];
export type PuzzleQaMotion = (typeof QA_MOTION_VALUES)[number];
export type PuzzleQaLockStyle = LockedTileStyle;
type PuzzleQaTier = (typeof QA_TIER_OPTIONS)[number]["tier"];

export type PuzzleQaBootstrap = {
  screen: PuzzleQaScreen;
  selectedTier: PuzzleQaTier;
  selectedTierIndex: number;
  selectedPuzzleIndex: number;
  selectedPuzzleNumber: number;
  phase: PuzzleQaPhase;
  settings: PuzzleQaSettings;
  lockStyle: PuzzleQaLockStyle | null;
  motion: PuzzleQaMotion;
};

export type PuzzleQaSessionBootstrap = Pick<PuzzleQaBootstrap, "phase" | "motion">;

type PuzzleQaParams = {
  qaScreen?: string | null;
  qaTier?: string | null;
  qaPuzzle?: string | null;
  qaPhase?: string | null;
  qaSettings?: string | null;
  qaLockStyle?: string | null;
  qaMotion?: string | null;
};

const DEFAULT_QA_SCREEN: PuzzleQaScreen = "home";
const DEFAULT_QA_PHASE: PuzzleQaPhase = "playing";
const DEFAULT_QA_SETTINGS: PuzzleQaSettings = "closed";
const DEFAULT_QA_MOTION: PuzzleQaMotion = "live";
const DEFAULT_QA_TIER = QA_TIER_OPTIONS[0];

const QA_TIER_INDEX_BY_NAME = new Map(
  QA_TIER_OPTIONS.map(({ tier }, index) => [tier, index] as const)
);

const QA_PUZZLE_COUNT_BY_TIER = QA_TIER_OPTIONS.reduce<Record<PuzzleQaTier, number>>((counts, option) => {
  counts[option.tier] = PUBLISHED_CATALOG.puzzles.filter((puzzle) => puzzle.tier === option.tier).length;
  return counts;
}, {} as Record<PuzzleQaTier, number>);

function hasQaParams(searchParams: URLSearchParams): boolean {
  return [...searchParams.keys()].some((key) => key.startsWith("qa"));
}

function normalizeEnumValue<TValue extends string>(value: string | null | undefined, allowedValues: readonly TValue[], fallback: TValue): TValue {
  return allowedValues.includes(value as TValue) ? (value as TValue) : fallback;
}

function normalizeTier(value: string | null | undefined) {
  return QA_TIER_OPTIONS.find((option) => option.slug === value) ?? DEFAULT_QA_TIER;
}

function normalizePuzzleNumber(value: string | null | undefined, tier: PuzzleQaTier): number {
  const parsedValue = Number(value);
  const puzzleCount = QA_PUZZLE_COUNT_BY_TIER[tier] ?? 1;

  if (!Number.isInteger(parsedValue)) {
    return 1;
  }

  return clamp(parsedValue, 1, puzzleCount);
}

function normalizeSettings(value: string | null | undefined, screen: PuzzleQaScreen): PuzzleQaSettings {
  if (screen === "puzzle") {
    return "closed";
  }

  return normalizeEnumValue(value, QA_SETTINGS_VALUES, DEFAULT_QA_SETTINGS);
}

function normalizeLockStyle(value: string | null | undefined): PuzzleQaLockStyle | null {
  return isLockedTileStyle(value) ? value : null;
}

export function parsePuzzleQaBootstrap(params: PuzzleQaParams): PuzzleQaBootstrap {
  const screen = normalizeEnumValue(params.qaScreen, QA_SCREEN_VALUES, DEFAULT_QA_SCREEN);
  const tier = normalizeTier(params.qaTier);
  const selectedPuzzleNumber = normalizePuzzleNumber(params.qaPuzzle, tier.tier);

  return {
    screen,
    selectedTier: tier.tier,
    selectedTierIndex: QA_TIER_INDEX_BY_NAME.get(tier.tier) ?? 0,
    selectedPuzzleIndex: selectedPuzzleNumber - 1,
    selectedPuzzleNumber,
    phase: normalizeEnumValue(params.qaPhase, QA_PHASE_VALUES, DEFAULT_QA_PHASE),
    settings: normalizeSettings(params.qaSettings, screen),
    lockStyle: normalizeLockStyle(params.qaLockStyle),
    motion: normalizeEnumValue(params.qaMotion, QA_MOTION_VALUES, DEFAULT_QA_MOTION)
  };
}

export function parsePuzzleQaBootstrapFromSearch(search: string): PuzzleQaBootstrap | null {
  const searchParams = new URLSearchParams(search);

  if (!hasQaParams(searchParams)) {
    return null;
  }

  return parsePuzzleQaBootstrap({
    qaScreen: searchParams.get("qaScreen"),
    qaTier: searchParams.get("qaTier"),
    qaPuzzle: searchParams.get("qaPuzzle"),
    qaPhase: searchParams.get("qaPhase"),
    qaSettings: searchParams.get("qaSettings"),
    qaLockStyle: searchParams.get("qaLockStyle"),
    qaMotion: searchParams.get("qaMotion")
  });
}

export function loadPuzzleQaBootstrap(): PuzzleQaBootstrap | null {
  if (typeof window === "undefined" || !isPuzzleQaEnabled()) {
    return null;
  }

  return parsePuzzleQaBootstrapFromSearch(window.location.search);
}

export function applyQaPreferenceOverride(
  preferences: BrowserPreferences,
  qaBootstrap: PuzzleQaBootstrap | null
): BrowserPreferences {
  if (!qaBootstrap?.lockStyle) {
    return preferences;
  }

  return {
    ...preferences,
    lockedTileStyle: qaBootstrap.lockStyle
  };
}

export function getPuzzleQaSessionBootstrap(qaBootstrap: PuzzleQaBootstrap | null): PuzzleQaSessionBootstrap | null {
  if (!qaBootstrap || qaBootstrap.screen !== "puzzle") {
    return null;
  }

  return {
    phase: qaBootstrap.phase,
    motion: qaBootstrap.motion
  };
}

export function isPuzzleQaEnabled(): boolean {
  return import.meta.env.DEV || import.meta.env.MODE === "test" || import.meta.env.VITE_ENABLE_QA_BOOTSTRAP === "1";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
