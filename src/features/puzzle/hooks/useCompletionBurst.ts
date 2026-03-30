import { useEffect, useRef, useState } from "react";
import type { GameState } from "../domain";
import { COMPLETION_CHECK_DURATION_MS, LOCK_FADE_DURATION_MS, type CompletionCeremonyPhase } from "../ui/boardPresentation";

type UseCompletionBurstOptions = {
  initialPhase?: CompletionCeremonyPhase;
  disableAutoAdvance?: boolean;
};

export function useCompletionBurst(status: GameState["status"], { initialPhase = "idle", disableAutoAdvance = false }: UseCompletionBurstOptions = {}) {
  const [ceremonyPhase, setCeremonyPhase] = useState<CompletionCeremonyPhase>(initialPhase);
  const previousStatusRef = useRef<GameState["status"]>(status);
  const checkmarkTimeoutRef = useRef<number | null>(null);
  const settledTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (status !== "solved" || previousStatus === "solved") {
      if (status !== "solved") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- ceremony state should reset immediately when leaving solved mode.
        setCeremonyPhase("idle");
      }

      return undefined;
    }

    if (disableAutoAdvance) {
      setCeremonyPhase(initialPhase === "idle" ? "checkmark" : initialPhase);
      return undefined;
    }

    setCeremonyPhase("fading-locks");
    checkmarkTimeoutRef.current = window.setTimeout(() => {
      setCeremonyPhase("checkmark");
    }, LOCK_FADE_DURATION_MS);
    settledTimeoutRef.current = window.setTimeout(() => {
      setCeremonyPhase("settled");
    }, LOCK_FADE_DURATION_MS + COMPLETION_CHECK_DURATION_MS);

    return () => {
      if (checkmarkTimeoutRef.current !== null) {
        window.clearTimeout(checkmarkTimeoutRef.current);
        checkmarkTimeoutRef.current = null;
      }
      if (settledTimeoutRef.current !== null) {
        window.clearTimeout(settledTimeoutRef.current);
        settledTimeoutRef.current = null;
      }
    };
  }, [disableAutoAdvance, initialPhase, status]);

  return {
    ceremonyPhase
  };
}
