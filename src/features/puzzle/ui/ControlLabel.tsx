type ControlLabelProps = {
  label: string;
  helpId: string;
  helpText: string;
  activeHelpId: string | null;
  onToggle: (helpId: string) => void;
  htmlFor?: string;
};

export function ControlLabel({ label, helpId, helpText, activeHelpId, onToggle, htmlFor }: ControlLabelProps) {
  const isOpen = activeHelpId === helpId;

  return (
    <>
      <div className="control-label-row">
        {htmlFor ? (
          <label className="status-label control-label-main" htmlFor={htmlFor}>
            {label}
          </label>
        ) : (
          <span className="status-label control-label-main">{label}</span>
        )}
        <button
          type="button"
          className="info-button"
          aria-label={`Explain ${label}`}
          aria-expanded={isOpen}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggle(helpId);
          }}
        >
          i
        </button>
      </div>
      {isOpen ? <p className="control-help">{helpText}</p> : null}
    </>
  );
}
