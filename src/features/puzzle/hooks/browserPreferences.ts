import type { LockedTileStyle } from "../ui/lockedTileStyles";
import { DEFAULT_LOCKED_TILE_STYLE, isLockedTileStyle } from "../ui/lockedTileStyles";

const STORAGE_KEY = "gradient:browser-preferences:v1";
const STORAGE_VERSION = 1;

export type BrowserPreferences = {
  lockedTileStyle: LockedTileStyle;
};

type BrowserPreferencesDocument = {
  version: typeof STORAGE_VERSION;
  lockedTileStyle: LockedTileStyle;
};

export const DEFAULT_BROWSER_PREFERENCES: BrowserPreferences = {
  lockedTileStyle: DEFAULT_LOCKED_TILE_STYLE
};

function readBrowserPreferencesDocument(): BrowserPreferencesDocument | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<BrowserPreferencesDocument>;

    if (parsed.version !== STORAGE_VERSION || !isLockedTileStyle(parsed.lockedTileStyle)) {
      return null;
    }

    return {
      version: STORAGE_VERSION,
      lockedTileStyle: parsed.lockedTileStyle
    };
  } catch {
    return null;
  }
}

function writeBrowserPreferencesDocument(preferences: BrowserPreferences): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const document: BrowserPreferencesDocument = {
      version: STORAGE_VERSION,
      lockedTileStyle: preferences.lockedTileStyle
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
  } catch {
    // Ignore storage failures so the browser stays usable.
  }
}

export function loadBrowserPreferences(): BrowserPreferences {
  const document = readBrowserPreferencesDocument();

  if (!document) {
    return DEFAULT_BROWSER_PREFERENCES;
  }

  return {
    lockedTileStyle: document.lockedTileStyle
  };
}

export function saveBrowserPreferences(preferences: BrowserPreferences): void {
  writeBrowserPreferencesDocument(preferences);
}
