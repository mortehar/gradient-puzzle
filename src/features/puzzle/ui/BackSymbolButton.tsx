type BackSymbolButtonProps = {
  onClick?: () => void;
  className?: string;
  testId?: string;
};

export function BackSymbolButton({ onClick, className = "", testId }: BackSymbolButtonProps) {
  return (
    <button
      className={["back-symbol-button", className].join(" ").trim()}
      type="button"
      aria-label="Back"
      onClick={onClick}
      data-testid={testId}
    >
      <svg className="back-symbol-button-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M11.5 2.5 4.5 8l7 5.5Z" fill="currentColor" />
      </svg>
    </button>
  );
}
