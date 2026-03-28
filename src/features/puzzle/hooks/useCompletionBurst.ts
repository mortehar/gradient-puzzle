import { useEffect, useRef, useState } from "react";
import type { GameState } from "../domain";
import { COMPLETION_CHECK_DURATION_MS, type CompletionCeremonyPhase } from "../ui/boardPresentation";

export function useCompletionBurst(status: GameState["status"]) {
  const [ceremonyPhase, setCeremonyPhase] = useState<CompletionCeremonyPhase>("idle");
  const [highlightNewPuzzle, setHighlightNewPuzzle] = useState(false);
  const previousStatusRef = useRef<GameState["status"]>(status);
  const settledTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (status !== "solved" || previousStatus === "solved") {
      if (status !== "solved") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- ceremony state should reset immediately when leaving solved mode.
        setCeremonyPhase("idle");
        setHighlightNewPuzzle(false);
      }

      return undefined;
    }

    setCeremonyPhase("checkmark");
    setHighlightNewPuzzle(true);
    settledTimeoutRef.current = window.setTimeout(() => {
      setCeremonyPhase("settled");
    }, COMPLETION_CHECK_DURATION_MS);

    return () => {
      if (settledTimeoutRef.current !== null) {
        window.clearTimeout(settledTimeoutRef.current);
        settledTimeoutRef.current = null;
      }
    };
  }, [status]);

  return {
    ceremonyPhase,
    highlightNewPuzzle
  };
}
