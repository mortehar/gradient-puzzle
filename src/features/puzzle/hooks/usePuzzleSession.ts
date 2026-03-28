import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CONFIG,
  analyzeBoardTiles,
  createGameFromPublishedPuzzle,
  findBestAidMove,
  getPublishedCatalog,
  getPublishedPuzzleBySliderIndex,
  isSolved,
  normalizeConfig,
  swapTiles,
  type AppearanceConfig,
  type PublishedPuzzle,
  type Tile
} from "../domain";
import { useCompletionBurst } from "./useCompletionBurst";
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

export type PuzzleSession = {
  game: ReturnType<typeof createGameFromPublishedPuzzle>;
  activePuzzle: PublishedPuzzle;
  sliderIndex: number;
  sliderCount: number;
  previewConfig: ReturnType<typeof normalizeConfig>;
  transitionMode: TransitionMode;
  activeAidAnimation: AidAnimationState | null;
  activeScrambleFlip: ScrambleFlipTile[] | null;
  dragTile: Tile | null;
  dragPointerType: string | null;
  pointerPosition: PointerPosition | null;
  orderedTiles: Tile[];
  isInteractive: boolean;
  lockedCount: number;
  currentBoardMetrics: ReturnType<typeof analyzeBoardTiles>;
  currentPuzzleLabel: string;
  canAdvancePuzzle: boolean;
  completionCeremonyPhase: CompletionCeremonyPhase;
  highlightNextPuzzle: boolean;
  actions: {
    setSliderIndex: (value: number) => void;
    beginDrag: (tile: Tile, pointerId: number, pointerType: string, clientX: number, clientY: number) => void;
    updateAppearance: <K extends keyof AppearanceConfig>(key: K, value: AppearanceConfig[K]) => void;
    startNextPuzzle: () => void;
    useAid: () => void;
  };
};

const PUBLISHED_CATALOG = getPublishedCatalog("v1");

export function usePuzzleSession(): PuzzleSession {
  const [appearance, setAppearance] = useState<AppearanceConfig>(DEFAULT_CONFIG.appearance);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [game, setGame] = useState(() => createGameFromPublishedPuzzle(PUBLISHED_CATALOG.puzzles[0], DEFAULT_CONFIG.appearance));
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [pointerPosition, setPointerPosition] = useState<PointerPosition | null>(null);
  const [transitionMode, setTransitionMode] = useState<TransitionMode>("none");
  const [activeAidAnimation, setActiveAidAnimation] = useState<AidAnimationState | null>(null);
  const [activeScrambleFlip, setActiveScrambleFlip] = useState<ScrambleFlipTile[] | null>(null);
  const completionBurst = useCompletionBurst(game.status);
  const activePuzzle = useMemo(() => PUBLISHED_CATALOG.puzzles[sliderIndex], [sliderIndex]);
  const previewConfig = useMemo(
    () =>
      normalizeConfig({
        ...activePuzzle.config,
        appearance
      }),
    [activePuzzle, appearance]
  );
  const currentBoardMetrics = useMemo(
    () => analyzeBoardTiles(game.tiles, game.config.width, game.config.height),
    [game.config.height, game.config.width, game.tiles]
  );
  const orderedTiles = useMemo(() => [...game.tiles].sort((left, right) => left.currentIndex - right.currentIndex), [game.tiles]);
  const dragTile = dragState ? game.tiles.find((tile) => tile.id === dragState.tileId) ?? null : null;
  const isInteractive = game.status === "playing";
  const lockedCount = game.tiles.filter((tile) => tile.locked).length;
  const currentPuzzleLabel = `#${activePuzzle.tierIndex} (${activePuzzle.tier})`;
  const canAdvancePuzzle = sliderIndex < PUBLISHED_CATALOG.puzzles.length - 1;

  function getDropIndex(clientX: number, clientY: number): number | null {
    const element = document.elementFromPoint(clientX, clientY);
    const tileElement = element?.closest<HTMLElement>("[data-current-index]");
    const indexAttribute = tileElement?.dataset.currentIndex;

    if (!indexAttribute) {
      return null;
    }

    return Number(indexAttribute);
  }

  function clearDragState() {
    setDragState(null);
    setPointerPosition(null);
  }

  function commitLoadedGame(nextSliderIndex: number) {
    const nextPuzzle = getPublishedPuzzleBySliderIndex("v1", nextSliderIndex);

    if (!nextPuzzle) {
      return;
    }

    setSliderIndex(nextSliderIndex);
    setGame(createGameFromPublishedPuzzle(nextPuzzle, appearance));
    setActiveAidAnimation(null);
    setActiveScrambleFlip(null);
    setTransitionMode("none");
    clearDragState();

    window.setTimeout(() => {
      setTransitionMode("quick");
    }, 0);
  }

  function commitSwap(fromIndex: number, toIndex: number | null) {
    if (toIndex === null || fromIndex === toIndex) {
      return;
    }

    setGame((currentGame) => {
      const nextTiles = swapTiles(currentGame.tiles, fromIndex, toIndex);

      if (nextTiles === currentGame.tiles) {
        return currentGame;
      }

      const solved = isSolved(nextTiles);

      setTransitionMode("quick");

      return {
        ...currentGame,
        tiles: nextTiles,
        swapCount: currentGame.swapCount + 1,
        status: solved ? "solved" : "playing"
      };
    });
  }

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
  }, [activeAidAnimation, game.status]);

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
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) {
        return;
      }

      commitSwap(dragState.originIndex, getDropIndex(event.clientX, event.clientY));
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
  }, [dragState]);

  useEffect(() => {
    if (game.status === "playing") {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- leaving play mode should immediately clear any drag interaction state.
    clearDragState();
  }, [game.status]);

  function handleAid() {
    if (!isInteractive) {
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

    setGame((currentGame) => {
      const nextTiles = swapTiles(currentGame.tiles, aidMove.primaryFromIndex, aidMove.secondaryFromIndex);
      const solved = isSolved(nextTiles);

      return {
        ...currentGame,
        tiles: nextTiles,
        swapCount: currentGame.swapCount + 1,
        hintCount: currentGame.hintCount + 1,
        status: aidDurationMs > 0 ? "animating-hint" : solved ? "solved" : "playing"
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
    activePuzzle,
    sliderIndex,
    sliderCount: PUBLISHED_CATALOG.puzzles.length,
    previewConfig,
    transitionMode,
    activeAidAnimation,
    activeScrambleFlip,
    dragTile,
    dragPointerType: dragState?.pointerType ?? null,
    pointerPosition,
    orderedTiles,
    isInteractive,
    lockedCount,
    currentBoardMetrics,
    currentPuzzleLabel,
    canAdvancePuzzle,
    completionCeremonyPhase: completionBurst.ceremonyPhase,
    highlightNextPuzzle: completionBurst.highlightNewPuzzle,
    actions: {
      setSliderIndex: commitLoadedGame,
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
      },
      updateAppearance: (key, value) => {
        setAppearance((currentAppearance) => {
          const nextAppearance = {
            ...currentAppearance,
            [key]: value
          };

          setGame((currentGame) => ({
            ...currentGame,
            config: normalizeConfig({
              ...currentGame.config,
              appearance: nextAppearance
            })
          }));

          return nextAppearance;
        });
      },
      startNextPuzzle: () => {
        if (!canAdvancePuzzle) {
          return;
        }

        commitLoadedGame(sliderIndex + 1);
      },
      useAid: handleAid
    }
  };
}
