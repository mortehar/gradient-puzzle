import { useEffect, useRef, useState } from "react";
import { BackSymbolButton } from "./BackSymbolButton";

const HOLD_TO_ABORT_MS = 2000;
const HOLD_PROGRESS_INTERVAL_MS = 50;
const HOLD_RELEASE_PREVIEW_MS = 1000;

export type AbortHoldState = {
  isHolding: boolean;
  progress: number;
  isVisible: boolean;
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
  const [isVisible, setIsVisible] = useState(false);
  const holdStartedAtRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const releaseStartedAtRef = useRef<number | null>(null);
  const releaseStartedProgressRef = useRef(0);
  const releasePreviewTimeoutRef = useRef<number | null>(null);
  const releaseIntervalRef = useRef<number | null>(null);

  function getHoldProgress() {
    const startedAt = holdStartedAtRef.current;

    if (startedAt === null) {
      return progress;
    }

    return Math.min(1, (Date.now() - startedAt) / HOLD_TO_ABORT_MS);
  }

  function clearReleasePreview() {
    if (releasePreviewTimeoutRef.current !== null) {
      window.clearTimeout(releasePreviewTimeoutRef.current);
      releasePreviewTimeoutRef.current = null;
    }

    if (releaseIntervalRef.current !== null) {
      window.clearInterval(releaseIntervalRef.current);
      releaseIntervalRef.current = null;
    }

    releaseStartedAtRef.current = null;
    releaseStartedProgressRef.current = 0;
  }

  function clearHoldTracking() {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }

    holdStartedAtRef.current = null;
  }

  function clearHoldImmediately() {
    clearReleasePreview();
    clearHoldTracking();
    setIsHolding(false);
    setProgress(0);
    setIsVisible(false);
  }

  function endHoldEarly() {
    if (holdTimeoutRef.current === null) {
      if (releasePreviewTimeoutRef.current !== null) {
        return;
      }

      clearHoldImmediately();
      return;
    }

    const releasedProgress = getHoldProgress();

    clearHoldTracking();
    clearReleasePreview();
    setIsHolding(false);
    setIsVisible(true);

    releaseStartedAtRef.current = Date.now();
    releaseStartedProgressRef.current = releasedProgress;
    setProgress(releasedProgress);

    releaseIntervalRef.current = window.setInterval(() => {
      const releaseStartedAt = releaseStartedAtRef.current;

      if (releaseStartedAt === null) {
        return;
      }

      const releaseElapsed = Date.now() - releaseStartedAt;
      const remainingProgress = Math.max(0, 1 - releaseElapsed / HOLD_RELEASE_PREVIEW_MS);
      setProgress(releaseStartedProgressRef.current * remainingProgress);
    }, HOLD_PROGRESS_INTERVAL_MS);

    releasePreviewTimeoutRef.current = window.setTimeout(() => {
      clearReleasePreview();
      setProgress(0);
      setIsVisible(false);
    }, HOLD_RELEASE_PREVIEW_MS);
  }

  useEffect(() => {
    return () => {
      if (releasePreviewTimeoutRef.current !== null) {
        window.clearTimeout(releasePreviewTimeoutRef.current);
      }

      if (holdTimeoutRef.current !== null) {
        window.clearTimeout(holdTimeoutRef.current);
      }

      if (holdIntervalRef.current !== null) {
        window.clearInterval(holdIntervalRef.current);
      }

      if (releaseIntervalRef.current !== null) {
        window.clearInterval(releaseIntervalRef.current);
      }

      holdStartedAtRef.current = null;
      releaseStartedAtRef.current = null;
      releaseStartedProgressRef.current = 0;
    };
  }, []);

  useEffect(() => {
    onHoldStateChange?.({ isHolding, progress, isVisible });
  }, [isHolding, progress, isVisible, onHoldStateChange]);

  function beginHold() {
    if (!requiresHold) {
      onAbort();
      return;
    }

    if (holdTimeoutRef.current !== null) {
      return;
    }

    clearReleasePreview();
    holdStartedAtRef.current = Date.now();
    setIsHolding(true);
    setProgress(0);
    setIsVisible(true);

    holdIntervalRef.current = window.setInterval(() => {
      const startedAt = holdStartedAtRef.current;

      if (startedAt === null) {
        return;
      }

      setProgress(Math.min(1, (Date.now() - startedAt) / HOLD_TO_ABORT_MS));
    }, HOLD_PROGRESS_INTERVAL_MS);

    holdTimeoutRef.current = window.setTimeout(() => {
      clearHoldImmediately();
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
        <span className="sr-only">Hold to abort puzzle</span>
      </button>
    </div>
  );
}
