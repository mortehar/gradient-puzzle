import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_BROWSER_PREFERENCES,
  loadBrowserPreferences,
  saveBrowserPreferences
} from "./browserPreferences";

const STORAGE_KEY = "gradient:browser-preferences:v1";

describe("browserPreferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loads the default preferences when storage is empty or invalid", () => {
    expect(loadBrowserPreferences()).toEqual(DEFAULT_BROWSER_PREFERENCES);

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        lockedTileStyle: "corners"
      })
    );

    expect(loadBrowserPreferences()).toEqual(DEFAULT_BROWSER_PREFERENCES);
  });

  it("saves and reloads a supported locked-tile style", () => {
    saveBrowserPreferences({
      lockedTileStyle: "icon"
    });

    expect(loadBrowserPreferences()).toEqual({
      lockedTileStyle: "icon"
    });
  });

  it("ignores storage write failures so the feature stays usable", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    expect(() =>
      saveBrowserPreferences({
        lockedTileStyle: "texture"
      })
    ).not.toThrow();

    setItemSpy.mockRestore();
  });
});
