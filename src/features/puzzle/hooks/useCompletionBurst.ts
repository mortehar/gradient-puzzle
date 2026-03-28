import { useEffect, useRef, useState } from "react";
import type { GameState } from "../domain";
import {
  COMPLETION_BURST_DURATION_MS,
  buildCompletionParticles,
  drawCompletionBurst
} from "../ui/boardPresentation";

export function useCompletionBurst(status: GameState["status"]) {
  const [showCompletionBurst, setShowCompletionBurst] = useState(false);
  const previousStatusRef = useRef<GameState["status"]>(status);
  const completionFrameRef = useRef<number | null>(null);
  const completionTimeoutRef = useRef<number | null>(null);
  const completionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const completionParticlesRef = useRef(buildCompletionParticles());
  const completionStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (status !== "solved" || previousStatus === "solved") {
      if (status !== "solved") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- burst visibility is intentionally driven by status transitions.
        setShowCompletionBurst(false);
        completionParticlesRef.current = [];
      }

      return undefined;
    }

    completionParticlesRef.current = buildCompletionParticles();
    completionStartTimeRef.current = null;
    setShowCompletionBurst(true);

    return undefined;
  }, [status]);

  useEffect(() => {
    if (!showCompletionBurst) {
      if (completionFrameRef.current !== null) {
        window.cancelAnimationFrame(completionFrameRef.current);
        completionFrameRef.current = null;
      }

      if (completionTimeoutRef.current !== null) {
        window.clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }

      completionStartTimeRef.current = null;

      const canvas = completionCanvasRef.current;
      const context = canvas?.getContext("2d");

      if (canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }

      return undefined;
    }

    completionTimeoutRef.current = window.setTimeout(() => {
      setShowCompletionBurst(false);
    }, COMPLETION_BURST_DURATION_MS);

    const advance = (timestamp: number) => {
      if (completionStartTimeRef.current === null) {
        completionStartTimeRef.current = timestamp;
      }

      const elapsed = timestamp - completionStartTimeRef.current;
      const canvas = completionCanvasRef.current;

      if (!canvas) {
        completionFrameRef.current = null;
        return;
      }

      drawCompletionBurst(canvas, completionParticlesRef.current, elapsed);

      if (elapsed >= COMPLETION_BURST_DURATION_MS) {
        completionFrameRef.current = null;
        return;
      }

      completionFrameRef.current = window.requestAnimationFrame(advance);
    };

    completionFrameRef.current = window.requestAnimationFrame(advance);

    return () => {
      if (completionFrameRef.current !== null) {
        window.cancelAnimationFrame(completionFrameRef.current);
        completionFrameRef.current = null;
      }

      if (completionTimeoutRef.current !== null) {
        window.clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
    };
  }, [showCompletionBurst]);

  return {
    completionCanvasRef,
    showCompletionBurst
  };
}
