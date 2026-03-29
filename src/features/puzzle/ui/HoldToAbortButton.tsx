import { useEffect, useRef, useState } from "react";
import { BackSymbolButton } from "./BackSymbolButton";

const HOLD_TO_ABORT_MS = 2000;
const HOLD_PROGRESS_INTERVAL_MS = 50;

export type AbortHoldState = {
  isHolding: boolean;
  progress: number;
};

type HoldToAbortButtonProps = {
  onAbort: () => void;
  requiresHold?: boolean;
  onHoldStateChange?: (state: AbortHoldState) => void;
};

export function HoldToAbortButton({
  onAbort,
  requiresHold = true,
  onHoldStateChange
}: HoldToAbortButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdStartedAtRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);

  function clearHold() {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }

    holdStartedAtRef.current = null;
    setIsHolding(false);
    setProgress(0);
  }

  useEffect(() => clearHold, []);
  useEffect(() => {
    onHoldStateChange?.({ isHolding, progress });
  }, [isHolding, progress, onHoldStateChange]);

  function beginHold() {
    if (!requiresHold) {
      onAbort();
      return;
    }

    if (holdTimeoutRef.current !== null) {
      return;
    }

    holdStartedAtRef.current = Date.now();
    setIsHolding(true);
    setProgress(0);

    holdIntervalRef.current = window.setInterval(() => {
      const startedAt = holdStartedAtRef.current;

      if (startedAt === null) {
        return;
      }

      setProgress(Math.min(1, (Date.now() - startedAt) / HOLD_TO_ABORT_MS));
    }, HOLD_PROGRESS_INTERVAL_MS);

    holdTimeoutRef.current = window.setTimeout(() => {
      clearHold();
      onAbort();
    }, HOLD_TO_ABORT_MS);
  }

  if (!requiresHold) {
    return (
      <div className="abort-control abort-control-instant" data-testid="abort-control">
        <BackSymbolButton testId="abort-button" onClick={onAbort} />
      </div>
    );
  }

  return (
    <div className="abort-control" data-testid="abort-control">
      <BackSymbolButton
        className={isHolding ? "back-symbol-button-holding" : ""}
        testId="abort-button"
        onClick={() => undefined}
      />
      <button
        className="abort-control-hitbox"
        type="button"
        aria-label="Hold to abort puzzle"
        data-testid="abort-hold-hitbox"
        onPointerDown={beginHold}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={clearHold}
        onBlur={clearHold}
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
            clearHold();
          }
        }}
      >
        <span className="sr-only">Hold to abort puzzle</span>
      </button>
    </div>
  );
}
