import type { ReactNode } from "react";
import type { ScreenChip } from "./screenArtDirection";
import { UiGlyph } from "./UiGlyph";

type ScreenIntroProps = {
  kicker?: ReactNode;
  title: ReactNode;
  copy?: ReactNode;
  chips?: readonly ScreenChip[];
  className?: string;
  titleClassName?: string;
  chipsTestId?: string;
};

export function ScreenIntro({
  kicker,
  title,
  copy,
  chips,
  className = "screen-heading",
  titleClassName = "screen-title",
  chipsTestId
}: ScreenIntroProps) {
  return (
    <div className={className}>
      {kicker ? <p className="screen-kicker">{kicker}</p> : null}
      <h1 className={titleClassName}>{title}</h1>
      {copy ? <p className="screen-copy">{copy}</p> : null}
      {chips && chips.length > 0 ? (
        <div className="screen-chip-row" data-testid={chipsTestId}>
          {chips.map((chip) => (
            <div
              className={["screen-chip", chip.tone ? `screen-chip-${chip.tone}` : ""].join(" ").trim()}
              key={`${chip.label}-${chip.value}`}
              aria-label={`${chip.label}: ${chip.value}`}
            >
              <UiGlyph name={chip.icon} className="screen-chip-icon" />
              <div className="screen-chip-copy">
                <span className="sr-only">{chip.label}</span>
                <strong className="screen-chip-value">{chip.value}</strong>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
