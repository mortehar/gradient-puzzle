import type { CSSProperties } from "react";
import {
  LOCK_FRAME_INSET,
  LOCK_FRAME_RADIUS,
  LOCK_FRAME_SECONDARY_INSET
} from "./boardPresentation";
import { LOCKED_TILE_STYLE_OPTIONS, LockedTileAdornment, type LockedTileStyle } from "./lockedTileStyles";
import { SETTINGS_MENU_ART_DIRECTION } from "./screenArtDirection";

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
        <p className="screen-kicker">{SETTINGS_MENU_ART_DIRECTION.kicker}</p>
        <h2 className="browser-label browser-label-large">{SETTINGS_MENU_ART_DIRECTION.title}</h2>
        {SETTINGS_MENU_ART_DIRECTION.copy ? <p className="browser-settings-copy">{SETTINGS_MENU_ART_DIRECTION.copy}</p> : null}
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
              {option.description ? <span className="lock-style-option-copy">{option.description}</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
