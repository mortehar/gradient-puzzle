import { AidSymbolButton } from "./AidSymbolButton";
import { useHoldToAction, type HoldActionState } from "./useHoldToAction";

type HoldToAidButtonProps = {
  onAid: () => void;
  requiresHold?: boolean;
  disabled?: boolean;
  onHoldStateChange?: (state: HoldActionState) => void;
};

export function HoldToAidButton({
  onAid,
  requiresHold = true,
  disabled = false,
  onHoldStateChange
}: HoldToAidButtonProps) {
  const { holdState, beginHold, endHoldEarly, triggerInstantAction } = useHoldToAction({
    onAction: onAid,
    requiresHold,
    disabled,
    onHoldStateChange
  });

  if (!requiresHold) {
    return (
      <div className="aid-control aid-control-instant" data-testid="aid-control">
        <AidSymbolButton testId="aid-button" disabled={disabled} onClick={triggerInstantAction} />
      </div>
    );
  }

  return (
    <div className="aid-control" data-testid="aid-control">
      <AidSymbolButton
        className={[
          holdState.isHolding ? "aid-symbol-button-holding" : "",
          disabled ? "aid-symbol-button-disabled" : ""
        ]
          .join(" ")
          .trim()}
        testId="aid-button"
        disabled={disabled}
        onClick={() => undefined}
      />
      <button
        className="aid-control-hitbox"
        type="button"
        aria-label="Hold to use aid"
        data-testid="aid-hold-hitbox"
        disabled={disabled}
        onPointerDown={beginHold}
        onPointerUp={endHoldEarly}
        onPointerLeave={endHoldEarly}
        onPointerCancel={endHoldEarly}
        onBlur={endHoldEarly}
        onKeyDown={(event) => {
          if (event.repeat) {
            return;
          }

          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            beginHold();
          }
        }}
        onKeyUp={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            endHoldEarly();
          }
        }}
      >
        <span className="sr-only">Hold to use aid</span>
      </button>
    </div>
  );
}
