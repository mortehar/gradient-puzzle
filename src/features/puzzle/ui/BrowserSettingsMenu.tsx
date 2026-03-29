import type { CSSProperties } from "react";
import {
  LOCK_FRAME_INSET,
  LOCK_FRAME_RADIUS,
  LOCK_FRAME_SECONDARY_INSET
} from "./boardPresentation";
import { LOCKED_TILE_STYLE_OPTIONS, LockedTileAdornment, type LockedTileStyle } from "./lockedTileStyles";

type BrowserSettingsMenuProps = {
  lockedTileStyle: LockedTileStyle;
  onLockedTileStyleChange: (value: LockedTileStyle) => void;
};

const PREVIEW_SWATCHES = ["rgb(110, 139, 169)", "rgb(157, 84, 138)"] as const;

export function BrowserSettingsMenu({ lockedTileStyle, onLockedTileStyleChange }: BrowserSettingsMenuProps) {
  return (
    <section
      className="browser-settings-menu status-card"
      data-testid="browser-settings-menu"
      role="dialog"
      aria-label="Locked cell themes"
    >
      <div className="browser-settings-header">
        <p className="screen-kicker">Locked cells</p>
        <p className="browser-label browser-label-large">Board treatment</p>
        <p className="browser-settings-copy">
          Pick the material language for fixed cells. The choice is visual only and carries through previews and live
          play.
        </p>
      </div>

      <div className="lock-style-grid" role="radiogroup" aria-label="Locked cell themes">
        {LOCKED_TILE_STYLE_OPTIONS.map((option) => {
          const isSelected = option.value === lockedTileStyle;

          return (
            <button
              key={option.value}
              className={["lock-style-option", isSelected ? "lock-style-option-active" : ""].join(" ")}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-testid={`lock-style-option-${option.value}`}
              onClick={() => onLockedTileStyleChange(option.value)}
            >
              <div className="lock-style-preview" aria-hidden="true">
                {PREVIEW_SWATCHES.map((color, index) => (
                  <div
                    key={`${option.value}-${color}`}
                    className={[
                      "lock-style-preview-swatch",
                      index === 0 ? "lock-style-preview-swatch-cool" : "lock-style-preview-swatch-warm"
                    ].join(" ")}
                    style={{
                      backgroundColor: color,
                      "--tile-lock-inset": LOCK_FRAME_INSET,
                      "--tile-lock-secondary-inset": LOCK_FRAME_SECONDARY_INSET,
                      "--tile-lock-radius": LOCK_FRAME_RADIUS
                    } as CSSProperties}
                  >
                    <LockedTileAdornment lockedTileStyle={option.value} tileColor={color} />
                  </div>
                ))}
              </div>

              <span className="lock-style-option-label">{option.label}</span>
              <span className="lock-style-option-copy">{option.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
