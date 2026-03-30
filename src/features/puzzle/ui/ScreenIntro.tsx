import type { ReactNode } from "react";
import type { ScreenChip } from "./screenArtDirection";

type ScreenIntroProps = {
  kicker: ReactNode;
  title: ReactNode;
  copy: ReactNode;
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
      <p className="screen-kicker">{kicker}</p>
      <h1 className={titleClassName}>{title}</h1>
      <p className="screen-copy">{copy}</p>
      {chips && chips.length > 0 ? (
        <div className="screen-chip-row" data-testid={chipsTestId}>
          {chips.map((chip) => (
            <div className="screen-chip" key={`${chip.label}-${chip.value}`}>
              <span className="screen-chip-label">{chip.label}</span>
              <strong className="screen-chip-value">{chip.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
