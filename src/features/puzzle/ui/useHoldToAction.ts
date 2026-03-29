import { useEffect, useRef, useState } from "react";

const HOLD_TO_ACTION_MS = 2000;
const HOLD_PROGRESS_INTERVAL_MS = 50;
const HOLD_RELEASE_PREVIEW_MS = 1000;

export type HoldActionState = {
  isHolding: boolean;
  progress: number;
  isVisible: boolean;
};

type UseHoldToActionOptions = {
  onAction: () => void;
  requiresHold?: boolean;
  disabled?: boolean;
  onHoldStateChange?: (state: HoldActionState) => void;
};

export function useHoldToAction({
  onAction,
  requiresHold = true,
  disabled = false,
  onHoldStateChange
}: UseHoldToActionOptions) {
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

    return Math.min(1, (Date.now() - startedAt) / HOLD_TO_ACTION_MS);
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
    if (disabled) {
      return;
    }

    if (!requiresHold) {
      onAction();
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

      setProgress(Math.min(1, (Date.now() - startedAt) / HOLD_TO_ACTION_MS));
    }, HOLD_PROGRESS_INTERVAL_MS);

    holdTimeoutRef.current = window.setTimeout(() => {
      clearHoldImmediately();
      onAction();
    }, HOLD_TO_ACTION_MS);
  }

  function triggerInstantAction() {
    if (!disabled) {
      onAction();
    }
  }

  return {
    holdState: {
      isHolding,
      progress,
      isVisible
    },
    beginHold,
    endHoldEarly,
    triggerInstantAction
  };
}
