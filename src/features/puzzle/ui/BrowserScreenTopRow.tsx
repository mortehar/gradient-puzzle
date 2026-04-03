import { useEffect, useRef } from "react";
import { BrowserSettingsMenu } from "./BrowserSettingsMenu";
import type { LockedTileStyle } from "./lockedTileStyles";

type BrowserScreenTopRowProps = {
  isSettingsOpen: boolean;
  lockedTileStyle: LockedTileStyle;
  onToggleSettings: () => void;
  onLockedTileStyleChange: (value: LockedTileStyle) => void;
  onCloseSettings: () => void;
};

export function BrowserScreenTopRow({
  isSettingsOpen,
  lockedTileStyle,
  onToggleSettings,
  onLockedTileStyleChange,
  onCloseSettings
}: BrowserScreenTopRowProps) {
  const topRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSettingsOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (topRowRef.current?.contains(event.target as Node)) {
        return;
      }

      onCloseSettings();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseSettings();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSettingsOpen, onCloseSettings]);

  return (
    <div className="browser-top-row-stack" ref={topRowRef} data-testid="browser-top-row">
      <div className="browser-top-row">
        <button
          className={["browser-settings-button", isSettingsOpen ? "browser-settings-button-active" : ""].join(" ")}
          type="button"
          aria-label={isSettingsOpen ? "Close settings" : "Open settings"}
          aria-expanded={isSettingsOpen}
          aria-haspopup="dialog"
          onClick={onToggleSettings}
          data-testid="browser-settings-button"
        >
          <svg className="browser-settings-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 7h16" />
            <path d="M7 12h13" />
            <path d="M10 17h10" />
          </svg>
        </button>
      </div>

      {isSettingsOpen ? (
        <BrowserSettingsMenu lockedTileStyle={lockedTileStyle} onLockedTileStyleChange={onLockedTileStyleChange} />
      ) : null}
    </div>
  );
}
