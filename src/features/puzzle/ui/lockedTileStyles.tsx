import type { CSSProperties } from "react";
import { cssRgbToOklab } from "../domain";

export const LOCKED_TILE_STYLES = ["frame", "mounted", "frosted", "texture", "icon"] as const;

export type LockedTileStyle = (typeof LOCKED_TILE_STYLES)[number];

export const DEFAULT_LOCKED_TILE_STYLE: LockedTileStyle = "frame";

export type LockedTileStyleOption = {
  value: LockedTileStyle;
  label: string;
  description: string;
};

export const LOCKED_TILE_STYLE_OPTIONS: readonly LockedTileStyleOption[] = [
  {
    value: "frame",
    label: "Original frame",
    description: "The current white inset square for baseline comparison."
  },
  {
    value: "mounted",
    label: "Mounted inset",
    description: "Makes locked tiles feel slightly seated into the board."
  },
  {
    value: "frosted",
    label: "Frosted pane",
    description: "A soft translucent plate that reads polished and premium."
  },
  {
    value: "texture",
    label: "Microtexture",
    description: "A satin texture overlay that suggests a different material."
  },
  {
    value: "icon",
    label: "Adaptive icon",
    description: "A simple filled lock with contrast-aware ink for maximum explicitness."
  }
] as const;

export function isLockedTileStyle(value: unknown): value is LockedTileStyle {
  return typeof value === "string" && LOCKED_TILE_STYLES.includes(value as LockedTileStyle);
}

export function getLockedTileDecorationStyle(tileColor: string): CSSProperties {
  try {
    const lightness = cssRgbToOklab(tileColor).l;
    const toneProgress = smoothstep(clamp((lightness - 0.18) / 0.64, 0, 1));

    return {
      "--tile-lock-ink": mixRgba([25, 31, 42, 0.48], [248, 242, 235, 0.68], toneProgress),
      "--tile-lock-soft-ink": mixRgba([25, 31, 42, 0.2], [248, 242, 235, 0.28], toneProgress),
      "--tile-lock-fill": mixRgba([255, 250, 244, 0.42], [28, 34, 45, 0.48], toneProgress),
      "--tile-lock-icon-stroke": mixRgba([255, 251, 246, 0.54], [20, 26, 36, 0.62], toneProgress),
      "--tile-lock-strong-ink": mixRgba([16, 21, 31, 0.72], [255, 250, 244, 0.84], toneProgress),
      "--tile-lock-shadow": mixRgba([6, 10, 18, 0.14], [10, 14, 22, 0.22], toneProgress),
      "--tile-lock-gloss": mixRgba([255, 255, 255, 0.2], [255, 255, 255, 0.12], toneProgress),
      "--tile-lock-frost": mixRgba([255, 255, 255, 0.14], [255, 255, 255, 0.1], toneProgress),
      "--tile-lock-frost-edge": mixRgba([255, 255, 255, 0.34], [255, 255, 255, 0.18], toneProgress)
    } as CSSProperties;
  } catch {
    return {
      "--tile-lock-ink": "rgba(255, 255, 255, 0.72)",
      "--tile-lock-soft-ink": "rgba(255, 255, 255, 0.34)",
      "--tile-lock-fill": "rgba(255, 255, 255, 0.44)",
      "--tile-lock-icon-stroke": "rgba(255, 255, 255, 0.58)",
      "--tile-lock-strong-ink": "rgba(255, 255, 255, 0.92)",
      "--tile-lock-shadow": "rgba(10, 14, 22, 0.24)",
      "--tile-lock-gloss": "rgba(255, 255, 255, 0.16)",
      "--tile-lock-frost": "rgba(255, 255, 255, 0.12)",
      "--tile-lock-frost-edge": "rgba(255, 255, 255, 0.28)"
    } as CSSProperties;
  }
}

type Rgba = [red: number, green: number, blue: number, alpha: number];

function mixRgba(from: Rgba, to: Rgba, progress: number): string {
  return `rgba(${Math.round(lerp(from[0], to[0], progress))}, ${Math.round(lerp(from[1], to[1], progress))}, ${Math.round(lerp(from[2], to[2], progress))}, ${lerp(from[3], to[3], progress).toFixed(3)})`;
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}

type LockedTileAdornmentProps = {
  lockedTileStyle: LockedTileStyle;
  tileColor: string;
};

export function LockedTileAdornment({ lockedTileStyle, tileColor }: LockedTileAdornmentProps) {
  return (
    <span
      className={["tile-lock-art", `tile-lock-art-${lockedTileStyle}`].join(" ")}
      data-lock-style={lockedTileStyle}
      style={getLockedTileDecorationStyle(tileColor)}
      aria-hidden="true"
    >
      {lockedTileStyle === "icon" ? (
        <span className="tile-lock-glyph">
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M12 2a4 4 0 0 0-4 4v3H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V6a4 4 0 0 0-4-4Zm-2 7V6a2 2 0 1 1 4 0v3h-4Z" />
          </svg>
        </span>
      ) : null}
    </span>
  );
}
