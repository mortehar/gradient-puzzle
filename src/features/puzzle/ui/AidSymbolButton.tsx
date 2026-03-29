type AidSymbolButtonProps = {
  onClick?: () => void;
  className?: string;
  testId?: string;
  disabled?: boolean;
};

export function AidSymbolButton({ onClick, className = "", testId, disabled = false }: AidSymbolButtonProps) {
  return (
    <button
      className={["aid-symbol-button", className].join(" ").trim()}
      type="button"
      aria-label="Aid"
      onClick={onClick}
      data-testid={testId}
      disabled={disabled}
    >
      <svg className="aid-symbol-button-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M5.4 2.5h5.2v3.4h3.4v5.2h-3.4v3.4H5.4v-3.4H2v-5.2h3.4z" fill="currentColor" />
      </svg>
    </button>
  );
}
