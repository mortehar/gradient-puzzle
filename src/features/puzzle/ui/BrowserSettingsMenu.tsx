export function BrowserSettingsMenu() {
  return (
    <section
      className="browser-settings-menu status-card"
      data-testid="browser-settings-menu"
      role="dialog"
      aria-label="Settings"
    >
      <section className="option-block option-block-first">
        <p className="status-label option-title">Settings</p>
      </section>

      <p className="browser-settings-copy">
        The settings menu now lives in the browser flow again, so it is available before you enter a puzzle.
      </p>

      <div>
        <span className="status-label">Catalog</span>
        <strong>Published v1</strong>
      </div>
      <div>
        <span className="status-label">Progress</span>
        <strong>This browser only</strong>
      </div>
      <div>
        <span className="status-label">Puzzle flow</span>
        <strong>Unchanged</strong>
      </div>
    </section>
  );
}
