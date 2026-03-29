import type { CatalogVersion } from "../domain";

const STORAGE_KEY = "gradient:puzzle-history:v1";
const STORAGE_VERSION = 1;

export type LocalPuzzleCompletionRecord = {
  puzzleId: string;
  catalogVersion: CatalogVersion;
  sliderIndex: number;
  tier: string;
  tierIndex: number;
  moveCount: number;
  aidCount: number;
  startedAt: number;
  completedAt: number;
  solveDurationMs: number;
};

type LocalPuzzleCompletionHistoryDocument = {
  version: typeof STORAGE_VERSION;
  completions: LocalPuzzleCompletionRecord[];
};

function readHistoryDocument(): LocalPuzzleCompletionHistoryDocument | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<LocalPuzzleCompletionHistoryDocument>;

    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.completions)) {
      return null;
    }

    return {
      version: STORAGE_VERSION,
      completions: parsed.completions.filter(isValidCompletionRecord)
    };
  } catch {
    return null;
  }
}

function writeHistoryDocument(completions: LocalPuzzleCompletionRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const document: LocalPuzzleCompletionHistoryDocument = {
      version: STORAGE_VERSION,
      completions
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
  } catch {
    // Ignore storage failures so the puzzle remains playable.
  }
}

function isValidCompletionRecord(value: unknown): value is LocalPuzzleCompletionRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<LocalPuzzleCompletionRecord>;

  return (
    typeof record.puzzleId === "string" &&
    typeof record.catalogVersion === "string" &&
    typeof record.sliderIndex === "number" &&
    typeof record.tier === "string" &&
    typeof record.tierIndex === "number" &&
    typeof record.moveCount === "number" &&
    typeof record.aidCount === "number" &&
    typeof record.startedAt === "number" &&
    typeof record.completedAt === "number" &&
    typeof record.solveDurationMs === "number"
  );
}

function compareCompletions(left: LocalPuzzleCompletionRecord, right: LocalPuzzleCompletionRecord): number {
  if (left.moveCount !== right.moveCount) {
    return left.moveCount - right.moveCount;
  }

  if (left.solveDurationMs !== right.solveDurationMs) {
    return left.solveDurationMs - right.solveDurationMs;
  }

  return left.completedAt - right.completedAt;
}

export function loadCompletionHistory(): LocalPuzzleCompletionRecord[] {
  return readHistoryDocument()?.completions ?? [];
}

export function saveCompletion(record: LocalPuzzleCompletionRecord): void {
  const existingCompletions = loadCompletionHistory();
  writeHistoryDocument([...existingCompletions, record]);
}

export function getBestCompletionForPuzzle(
  records: readonly LocalPuzzleCompletionRecord[],
  puzzleId: string,
  catalogVersion: CatalogVersion
): LocalPuzzleCompletionRecord | null {
  const eligibleCompletions = records.filter(
    (record) => record.puzzleId === puzzleId && record.catalogVersion === catalogVersion && record.aidCount === 0
  );

  if (eligibleCompletions.length === 0) {
    return null;
  }

  return [...eligibleCompletions].sort(compareCompletions)[0] ?? null;
}
