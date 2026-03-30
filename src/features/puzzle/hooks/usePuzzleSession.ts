import { useEffect, useMemo, useRef, useState } from "react";
import {
  createGameFromPublishedPuzzle,
  findBestAidMove,
  isSolved,
  swapTiles,
  type PublishedPuzzle,
  type Tile
} from "../domain";
import { getBestCompletionForPuzzle, type LocalPuzzleCompletionRecord } from "./puzzleCompletionHistory";
import { useCompletionBurst } from "./useCompletionBurst";
import { buildPuzzleCompletionRecord } from "./puzzleSessionCompletion";
import { resolveDragTargetIndex } from "./puzzleSessionDrag";
import { buildPuzzleSessionGame } from "./puzzleSessionGame";
import {
  AID_ANIMATION_START_DELAY_MS,
  PREVIEW_DURATION_MS,
  SCRAMBLE_FLIP_CARD_DURATION_MS,
  SCRAMBLE_STAGGER_SPREAD_MS,
  buildScrambleFlipTiles,
  getAidDurationMs,
  type AidAnimationState,
  type CompletionCeremonyPhase,
  type DragState,
  type PointerPosition,
  type ScrambleFlipTile,
  type TransitionMode
} from "../ui/boardPresentation";
import type { PuzzleQaSessionBootstrap } from "../qa/bootstrap";

export type PuzzleSession = {
  game: ReturnType<typeof createGameFromPublishedPuzzle>;
  transitionMode: TransitionMode;
  activeAidAnimation: AidAnimationState | null;
  activeScrambleFlip: ScrambleFlipTile[] | null;
  dragTile: Tile | null;
  dragTargetIndex: number | null;
  dragPointerType: string | null;
  pointerPosition: PointerPosition | null;
  orderedTiles: Tile[];
  isInteractive: boolean;
  canUseAid: boolean;
  isScoreEligible: boolean;
  bestCompletion: LocalPuzzleCompletionRecord | null;
  completionCeremonyPhase: CompletionCeremonyPhase;
  actions: {
    beginDrag: (tile: Tile, pointerId: number, pointerType: string, clientX: number, clientY: number) => void;
    useAid: () => void;
  };
};

type UsePuzzleSessionOptions = {
  puzzle: PublishedPuzzle;
  completionHistory: readonly LocalPuzzleCompletionRecord[];
  onRecordCompletion: (record: LocalPuzzleCompletionRecord) => void;
  qaBootstrap?: PuzzleQaSessionBootstrap | null;
};

export function usePuzzleSession({
  puzzle,
  completionHistory,
  onRecordCompletion,
  qaBootstrap = null
}: UsePuzzleSessionOptions): PuzzleSession {
  const [game, setGame] = useState(() => buildPuzzleSessionGame(puzzle, qaBootstrap));
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [pointerPosition, setPointerPosition] = useState<PointerPosition | null>(null);
  const [transitionMode, setTransitionMode] = useState<TransitionMode>("none");
  const [activeAidAnimation, setActiveAidAnimation] = useState<AidAnimationState | null>(null);
  const [activeScrambleFlip, setActiveScrambleFlip] = useState<ScrambleFlipTile[] | null>(null);
  const attemptStartedAtRef = useRef<number | null>(null);
  const disableAutomaticTransitions = qaBootstrap?.motion === "static";
  const completionBurst = useCompletionBurst(game.status, {
    initialPhase: qaBootstrap?.phase === "solved" ? "checkmark" : "idle",
    disableAutoAdvance: disableAutomaticTransitions
  });
  const orderedTiles = useMemo(() => [...game.tiles].sort((left, right) => left.currentIndex - right.currentIndex), [game.tiles]);
  const dragTile = dragState ? game.tiles.find((tile) => tile.id === dragState.tileId) ?? null : null;
  const isInteractive = game.status === "playing";
  const canUseAid = useMemo(
    () => isInteractive && findBestAidMove(game.tiles, game.config) !== null,
    [game.config, game.tiles, isInteractive]
  );
  const isScoreEligible = game.hintCount === 0;
  const bestCompletion = useMemo(
    () => getBestCompletionForPuzzle(completionHistory, puzzle.id, puzzle.catalogVersion),
    [completionHistory, puzzle.catalogVersion, puzzle.id]
  );

  function clearDragState() {
    setDragState(null);
    setDragTargetIndex(null);
    setPointerPosition(null);
  }

  useEffect(() => {
    if (disableAutomaticTransitions) {
      return undefined;
    }

    if (game.status !== "preview") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setGame((currentGame) => {
        if (currentGame.status !== "preview") {
          return currentGame;
        }

        setActiveScrambleFlip(buildScrambleFlipTiles(currentGame.tiles, currentGame.scrambledTiles, currentGame.config));
        return {
          ...currentGame,
          status: "scrambling"
        };
      });
      setTransitionMode("none");
    }, PREVIEW_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [disableAutomaticTransitions, game.status]);

  useEffect(() => {
    if (disableAutomaticTransitions) {
      return undefined;
    }

    if (game.status !== "scrambling") {
      return undefined;
    }

    let restoreMotionTimeoutId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      setGame((currentGame) => {
        if (currentGame.status !== "scrambling") {
          return currentGame;
        }

        return {
          ...currentGame,
          tiles: currentGame.scrambledTiles,
          status: isSolved(currentGame.scrambledTiles) ? "solved" : "playing"
        };
      });
      setActiveScrambleFlip(null);
      setTransitionMode("none");
      restoreMotionTimeoutId = window.setTimeout(() => {
        setTransitionMode("quick");
      }, 0);
    }, SCRAMBLE_FLIP_CARD_DURATION_MS + SCRAMBLE_STAGGER_SPREAD_MS);

    return () => {
      window.clearTimeout(timeoutId);
      if (restoreMotionTimeoutId !== undefined) {
        window.clearTimeout(restoreMotionTimeoutId);
      }
    };
  }, [disableAutomaticTransitions, game.status]);

  useEffect(() => {
    if (disableAutomaticTransitions) {
      return undefined;
    }

    if (game.status !== "animating-hint" || !activeAidAnimation) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setGame((currentGame) =>
        currentGame.status !== "animating-hint"
          ? currentGame
          : {
              ...currentGame,
              status: isSolved(currentGame.tiles) ? "solved" : "playing"
            }
      );
      setActiveAidAnimation(null);
      setTransitionMode("quick");
    }, activeAidAnimation.durationMs);

    return () => window.clearTimeout(timeoutId);
  }, [activeAidAnimation, disableAutomaticTransitions, game.status]);

  useEffect(() => {
    if (!activeAidAnimation || activeAidAnimation.moving || activeAidAnimation.durationMs === 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveAidAnimation((currentAnimation) =>
        currentAnimation ? { ...currentAnimation, moving: true } : currentAnimation
      );
    }, AID_ANIMATION_START_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [activeAidAnimation]);

  useEffect(() => {
    if (!dragState) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) {
        return;
      }

      setPointerPosition({ x: event.clientX, y: event.clientY });
      setDragTargetIndex(resolveDragTargetIndex(event.clientX, event.clientY, game.tiles, dragState.originIndex));
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) {
        return;
      }

      const toIndex = resolveDragTargetIndex(event.clientX, event.clientY, game.tiles, dragState.originIndex);

      if (toIndex !== null && dragState.originIndex !== toIndex) {
        const nextTiles = swapTiles(game.tiles, dragState.originIndex, toIndex);

        if (nextTiles !== game.tiles) {
          const solved = isSolved(nextTiles);

          if (solved) {
            const completedAt = Date.now();
            const startedAt = attemptStartedAtRef.current ?? completedAt;

            onRecordCompletion(buildPuzzleCompletionRecord(puzzle, startedAt, game.swapCount + 1, game.hintCount, completedAt));
          }

          setGame((currentGame) => {
            const swappedTiles = swapTiles(currentGame.tiles, dragState.originIndex, toIndex);

            if (swappedTiles === currentGame.tiles) {
              return currentGame;
            }

            setTransitionMode("quick");

            return {
              ...currentGame,
              tiles: swappedTiles,
              swapCount: currentGame.swapCount + 1,
              status: isSolved(swappedTiles) ? "solved" : "playing"
            };
          });
        }
      }

      clearDragState();
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) {
        return;
      }

      clearDragState();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [dragState, game, onRecordCompletion, puzzle]);

  useEffect(() => {
    if (game.status === "playing" && attemptStartedAtRef.current === null) {
      attemptStartedAtRef.current = Date.now();
    }
  }, [game.status]);

  function handleAid() {
    if (!canUseAid) {
      return;
    }

    const aidMove = findBestAidMove(game.tiles, game.config);

    if (!aidMove) {
      return;
    }

    const primaryTile = game.tiles.find((tile) => tile.id === aidMove.primaryTileId);
    const secondaryTile = game.tiles.find((tile) => tile.id === aidMove.secondaryTileId);

    if (!primaryTile || !secondaryTile) {
      return;
    }

    const aidDurationMs = getAidDurationMs(game.config.appearance.aidTimeSeconds);
    const nextTiles = swapTiles(game.tiles, aidMove.primaryFromIndex, aidMove.secondaryFromIndex);
    const solved = isSolved(nextTiles);

    clearDragState();
    setTransitionMode("none");

    if (aidDurationMs > 0) {
      setActiveAidAnimation({
        ...aidMove,
        primaryColor: primaryTile.color,
        secondaryColor: secondaryTile.color,
        durationMs: aidDurationMs,
        moving: false
      });
    } else {
      setActiveAidAnimation(null);
    }

    if (solved) {
      const completedAt = Date.now();
      const startedAt = attemptStartedAtRef.current ?? completedAt;

      onRecordCompletion(buildPuzzleCompletionRecord(puzzle, startedAt, game.swapCount + 1, game.hintCount + 1, completedAt));
    }

    setGame((currentGame) => {
      const swappedTiles = swapTiles(currentGame.tiles, aidMove.primaryFromIndex, aidMove.secondaryFromIndex);
      const isAidSolve = isSolved(swappedTiles);

      return {
        ...currentGame,
        tiles: swappedTiles,
        swapCount: currentGame.swapCount + 1,
        hintCount: currentGame.hintCount + 1,
        status: aidDurationMs > 0 ? "animating-hint" : isAidSolve ? "solved" : "playing"
      };
    });

    if (aidDurationMs === 0) {
      window.setTimeout(() => {
        setTransitionMode("quick");
      }, 0);
    }
  }

  return {
    game,
    transitionMode,
    activeAidAnimation,
    activeScrambleFlip,
    dragTile,
    dragTargetIndex,
    dragPointerType: dragState?.pointerType ?? null,
    pointerPosition,
    orderedTiles,
    isInteractive,
    canUseAid,
    isScoreEligible,
    bestCompletion,
    completionCeremonyPhase: completionBurst.ceremonyPhase,
    actions: {
      beginDrag: (tile, pointerId, pointerType, clientX, clientY) => {
        if (tile.locked || !isInteractive) {
          return;
        }

        setDragState({
          tileId: tile.id,
          originIndex: tile.currentIndex,
          pointerId,
          pointerType
        });
        setDragTargetIndex(null);
        setPointerPosition({ x: clientX, y: clientY });
      },
      useAid: handleAid
    }
  };
}
