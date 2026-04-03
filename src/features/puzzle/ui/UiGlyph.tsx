type UiGlyphName = "tier" | "progress" | "board" | "best" | "start";

type UiGlyphProps = {
  name: UiGlyphName;
  className?: string;
};

export function UiGlyph({ name, className = "" }: UiGlyphProps) {
  return (
    <svg
      className={["ui-glyph", className].join(" ").trim()}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {getGlyphPath(name)}
    </svg>
  );
}

function getGlyphPath(name: UiGlyphName) {
  switch (name) {
    case "tier":
      return <path d="M12 2.8 14.7 9.3 21.2 12l-6.5 2.7L12 21.2l-2.7-6.5L2.8 12l6.5-2.7Z" fill="currentColor" />;
    case "progress":
      return (
        <>
          <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12 5a7 7 0 0 1 7 7h-7Z" fill="currentColor" opacity="0.85" />
        </>
      );
    case "board":
      return (
        <>
          <rect x="4.5" y="4.5" width="6.2" height="6.2" rx="1.2" fill="currentColor" />
          <rect x="13.3" y="4.5" width="6.2" height="6.2" rx="1.2" fill="currentColor" opacity="0.82" />
          <rect x="4.5" y="13.3" width="6.2" height="6.2" rx="1.2" fill="currentColor" opacity="0.82" />
          <rect x="13.3" y="13.3" width="6.2" height="6.2" rx="1.2" fill="currentColor" />
        </>
      );
    case "best":
      return (
        <path
          d="M12 3.2 14.1 8l5.3.5-4 3.5 1.2 5.1L12 14.4 7.4 17.1 8.6 12l-4-3.5 5.3-.5Z"
          fill="currentColor"
        />
      );
    case "start":
      return (
        <>
          <circle cx="12" cy="12" r="8.3" fill="none" stroke="currentColor" strokeWidth="1.7" opacity="0.72" />
          <path d="M10 8.3 16 12l-6 3.7Z" fill="currentColor" />
        </>
      );
  }
}
