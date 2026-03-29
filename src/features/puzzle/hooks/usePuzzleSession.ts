import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_CONFIG,
  createGameFromPublishedPuzzle,
  isSolved,
  normalizeConfig,
  swapTiles,
  type PublishedPuzzle,
  type Tile
} from "../domain";
import { getBestCompletionForPuzzle, type LocalPuzzleCompletionRecord } from "./puzzleCompletionHistory";
import { useCompletionBurst } from "./useCompletionBurst";
import {
  PREVIEW_DURATION_MS,
  SCRAMBLE_FLIP_CARD_DURATION_MS,
  SCRAMBLE_STAGGER_SPREAD_MS,
  buildScrambleFlipTiles,
  type CompletionCeremonyPhase,
  type DragState,
  type PointerPosition,
  type ScrambleFlipTile,
  type TransitionMode
} from "../ui/boardPresentation";

export type PuzzleSession = {
  game: ReturnType<typeof createGameFromPublishedPuzzle>;
  activePuzzle: PublishedPuzzle;
  previewConfig: ReturnType<typeof normalizeConfig>;
  transitionMode: TransitionMode;
  activeScrambleFlip: ScrambleFlipTile[] | null;
  dragTile: Tile | null;
  dragPointerType: string | null;
  pointerPosition: PointerPosition | null;
  orderedTiles: Tile[];
  isInteractive: boolean;
  currentPuzzleLabel: string;
  bestCompletion: LocalPuzzleCompletionRecord | null;
  completionCeremonyPhase: CompletionCeremonyPhase;
  actions: {
    beginDrag: (tile: Tile, pointerId: number, pointerType: string, clientX: number, clientY: number) => void;
  };
};

type UsePuzzleSessionOptions = {
  puzzle: PublishedPuzzle;
  completionHistory: readonly LocalPuzzleCompletionRecord[];
  onRecordCompletion: (record: LocalPuzzleCompletionRecord) => void;
};

function buildGame(puzzle: PublishedPuzzle) {
  return createGameFromPublishedPuzzle(puzzle, DEFAULT_CONFIG.appearance);
}

export function usePuzzleSession({
  puzzle,
  completionHistory,
  onRecordCompletion
}: UsePuzzleSessionOptions): PuzzleSession {
  const [game, setGame] = useState(() => buildGame(puzzle));
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [pointerPosition, setPointerPosition] = useState<PointerPosition | null>(null);
  const [transitionMode, setTransitionMode] = useState<TransitionMode>("none");
  const [activeScrambleFlip, setActiveScrambleFlip] = useState<ScrambleFlipTile[] | null>(null);
  const attemptStartedAtRef = useRef<number | null>(null);
  const completionBurst = useCompletionBurst(game.status);
  const previewConfig = useMemo(
    () =>
      normalizeConfig({
        ...puzzle.config,
        appearance: DEFAULT_CONFIG.appearance
      }),
    [puzzle]
  );
  const orderedTiles = useMemo(() => [...game.tiles].sort((left, right) => left.currentIndex - right.currentIndex), [game.tiles]);
  const dragTile = dragState ? game.tiles.find((tile) => tile.id === dragState.tileId) ?? null : null;
  const isInteractive = game.status === "playing";
  const currentPuzzleLabel = `#${puzzle.tierIndex} (${puzzle.tier})`;
  const bestCompletion = useMemo(
    () => getBestCompletionForPuzzle(completionHistory, puzzle.id, puzzle.catalogVersion),
    [completionHistory, puzzle.catalogVersion, puzzle.id]
  );

  useEffect(() => {
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
  }, [game.status]);

  useEffect(() => {
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
  }, [game.status]);

  useEffect(() => {
    if (!dragState) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) {
        return;
      }

      setPointerPosition({ x: event.clientX, y: event.clientY });
    };

    const clearDragState = () => {
      setDragState(null);
      setPointerPosition(null);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) {
        return;
      }

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const tileElement = element?.closest<HTMLElement>("[data-current-index]");
      const indexAttribute = tileElement?.dataset.currentIndex;
      const toIndex = indexAttribute ? Number(indexAttribute) : null;

      if (toIndex !== null && dragState.originIndex !== toIndex) {
        const nextTiles = swapTiles(game.tiles, dragState.originIndex, toIndex);

        if (nextTiles !== game.tiles) {
          const solved = isSolved(nextTiles);

          if (solved) {
            const completedAt = Date.now();
            const startedAt = attemptStartedAtRef.current ?? completedAt;

            onRecordCompletion({
              puzzleId: puzzle.id,
              catalogVersion: puzzle.catalogVersion,
              sliderIndex: puzzle.sliderIndex,
              tier: puzzle.tier,
              tierIndex: puzzle.tierIndex,
              moveCount: game.swapCount + 1,
              aidCount: 0,
              startedAt,
              completedAt,
              solveDurationMs: Math.max(0, completedAt - startedAt)
            });
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

    const handlePointerCancel = () => {
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

  return {
    game,
    activePuzzle: puzzle,
    previewConfig,
    transitionMode,
    activeScrambleFlip,
    dragTile,
    dragPointerType: dragState?.pointerType ?? null,
    pointerPosition,
    orderedTiles,
    isInteractive,
    currentPuzzleLabel,
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
        setPointerPosition({ x: clientX, y: clientY });
      }
    }
  };
}
