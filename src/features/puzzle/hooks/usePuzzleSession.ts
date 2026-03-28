import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_CONFIG,
  analyzeBoardTiles,
  createNewGame,
  createNewGameForDifficulty,
  findBestAidMove,
  getDifficultyTier,
  getLockedIndexes,
  getValidCrossDensities,
  getValidHorizontalLineCounts,
  getValidLineDensities,
  getValidVerticalLineCounts,
  isSolved,
  normalizeConfig,
  pickConfigForDifficulty,
  swapTiles,
  type BoardResearchSweep,
  type GameConfig,
  type PuzzleSetupMode,
  type Tile,
  type TrajectoryColorConfig
} from "../domain";
import { buildResearchSweep, mergeStructuralConfig } from "../domain/research";
import { useCompletionBurst } from "./useCompletionBurst";
import {
  AID_ANIMATION_START_DELAY_MS,
  DEFAULT_DIFFICULTY_TARGET,
  PREVIEW_DURATION_MS,
  RESEARCH_SAMPLE_COUNT,
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
  game: ReturnType<typeof createNewGameForDifficulty>;
  setupMode: PuzzleSetupMode;
  difficultyScore: number;
  normalizedConfig: GameConfig;
  previewConfig: GameConfig;
  researchSweep: BoardResearchSweep;
  transitionMode: TransitionMode;
  activeAidAnimation: AidAnimationState | null;
  activeScrambleFlip: ScrambleFlipTile[] | null;
  dragTile: Tile | null;
  pointerPosition: PointerPosition | null;
  orderedTiles: Tile[];
  nextLockedCount: number;
  canCreatePuzzle: boolean;
  isInteractive: boolean;
  lockedCount: number;
  verticalCountOptions: number[];
  horizontalCountOptions: number[];
  verticalDensityOptions: number[];
  horizontalDensityOptions: number[];
  crossDensityOptions: number[];
  currentBoardMetrics: ReturnType<typeof analyzeBoardTiles>;
  currentReversalRate: number;
  currentOrderedShare: number;
  selectedDifficultyTier: string;
  completionCeremonyPhase: CompletionCeremonyPhase;
  highlightNewPuzzle: boolean;
  actions: {
    setSetupMode: (mode: PuzzleSetupMode) => void;
    setDifficultyScore: (value: number) => void;
    beginDrag: (tile: Tile, pointerId: number, clientX: number, clientY: number) => void;
    updateWidth: (value: number) => void;
    updateHeight: (value: number) => void;
    updateLineValue: (lineKey: "verticalLines" | "horizontalLines", field: "count" | "density", value: number) => void;
    updateCrossDensity: (value: number) => void;
    updateAppearance: <K extends keyof GameConfig["appearance"]>(key: K, value: GameConfig["appearance"][K]) => void;
    updateColorConstraint: <K extends keyof TrajectoryColorConfig>(key: K, value: TrajectoryColorConfig[K]) => void;
    startNewPuzzle: () => void;
    useAid: () => void;
  };
};

export function usePuzzleSession(): PuzzleSession {
  const defaultDifficultyEntry = pickConfigForDifficulty(DEFAULT_DIFFICULTY_TARGET);
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [setupMode, setSetupMode] = useState<PuzzleSetupMode>("difficulty");
  const [difficultyScore, setDifficultyScore] = useState(DEFAULT_DIFFICULTY_TARGET);
  const [game, setGame] = useState(() => createNewGameForDifficulty(DEFAULT_DIFFICULTY_TARGET, DEFAULT_CONFIG));
  const [researchSweep, setResearchSweep] = useState<BoardResearchSweep>(() =>
    buildResearchSweep(mergeStructuralConfig(DEFAULT_CONFIG, defaultDifficultyEntry), RESEARCH_SAMPLE_COUNT)
  );
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [pointerPosition, setPointerPosition] = useState<PointerPosition | null>(null);
  const [transitionMode, setTransitionMode] = useState<TransitionMode>("none");
  const [activeAidAnimation, setActiveAidAnimation] = useState<AidAnimationState | null>(null);
  const [activeScrambleFlip, setActiveScrambleFlip] = useState<ScrambleFlipTile[] | null>(null);
  const difficultyHistoryRef = useRef<string[]>([defaultDifficultyEntry.rating.layoutSignature]);
  const normalizedConfig = useMemo(() => normalizeConfig(config), [config]);
  const selectedDifficultyEntry = useMemo(() => pickConfigForDifficulty(difficultyScore), [difficultyScore]);
  const previewConfig = useMemo(
    () => (setupMode === "difficulty" ? mergeStructuralConfig(normalizedConfig, selectedDifficultyEntry) : normalizedConfig),
    [normalizedConfig, selectedDifficultyEntry, setupMode]
  );
  const researchConfigKey = useMemo(
    () =>
      JSON.stringify({
        width: previewConfig.width,
        height: previewConfig.height,
        verticalLines: previewConfig.verticalLines,
        horizontalLines: previewConfig.horizontalLines,
        crossLines: previewConfig.crossLines,
        colorConstraints: previewConfig.colorConstraints
      }),
    [previewConfig]
  );
  const completionBurst = useCompletionBurst(game.status);

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

  useEffect(() => {
    startTransition(() => {
      setResearchSweep(buildResearchSweep(previewConfig, RESEARCH_SAMPLE_COUNT));
    });
  }, [previewConfig, researchConfigKey]);

  const orderedTiles = useMemo(() => [...game.tiles].sort((left, right) => left.currentIndex - right.currentIndex), [game.tiles]);
  const nextLockedCount = getLockedIndexes(previewConfig).length;
  const nextMovableCount = previewConfig.width * previewConfig.height - nextLockedCount;
  const canCreatePuzzle = setupMode === "difficulty" ? true : nextMovableCount >= 2;
  const isInteractive = game.status === "playing";
  const lockedCount = getLockedIndexes(game.config).length;
  const verticalCountOptions = getValidVerticalLineCounts(normalizedConfig.width);
  const horizontalCountOptions = getValidHorizontalLineCounts(normalizedConfig.height);
  const verticalDensityOptions = getValidLineDensities(normalizedConfig.height);
  const horizontalDensityOptions = getValidLineDensities(normalizedConfig.width);
  const crossDensityOptions = getValidCrossDensities(normalizedConfig.width, normalizedConfig.height);
  const currentBoardMetrics = useMemo(
    () => analyzeBoardTiles(game.tiles, game.config.width, game.config.height),
    [game.config.height, game.config.width, game.tiles]
  );
  const currentReversalRate =
    (currentBoardMetrics.rowLightnessMonotonicity.reversalRate +
      currentBoardMetrics.columnLightnessMonotonicity.reversalRate) /
    2;
  const currentOrderedShare =
    (currentBoardMetrics.rowLightnessMonotonicity.consistency +
      currentBoardMetrics.columnLightnessMonotonicity.consistency) /
    2;
  const selectedDifficultyTier = getDifficultyTier(difficultyScore);
  const dragTile = dragState ? game.tiles.find((tile) => tile.id === dragState.tileId) ?? null : null;

  function updateConfig(updater: (currentConfig: GameConfig) => GameConfig) {
    setConfig((currentConfig) => normalizeConfig(updater(currentConfig)));
  }

  function clampPortraitWidth(nextWidth: number, currentHeight: number) {
    return Math.min(nextWidth, currentHeight);
  }

  function clampPortraitHeight(currentWidth: number, nextHeight: number) {
    return Math.max(currentWidth, nextHeight);
  }

  function commitLoadedGame(nextGame: ReturnType<typeof createNewGameForDifficulty>, nextSetupMode: PuzzleSetupMode) {
    setGame(nextGame);

    if (nextSetupMode === "difficulty") {
      difficultyHistoryRef.current = [
        nextGame.difficulty.layoutSignature,
        ...difficultyHistoryRef.current.filter((signature) => signature !== nextGame.difficulty.layoutSignature)
      ].slice(0, 3);
    }

    setActiveAidAnimation(null);
    setActiveScrambleFlip(null);
    setTransitionMode("none");
    clearDragState();

    window.setTimeout(() => {
      setTransitionMode("quick");
    }, 0);
  }

  function handleNewPuzzle() {
    if (!canCreatePuzzle) {
      return;
    }

    const nextGame =
      setupMode === "difficulty"
        ? createNewGameForDifficulty(difficultyScore, normalizedConfig, difficultyHistoryRef.current)
        : createNewGame(normalizedConfig);

    commitLoadedGame(nextGame, setupMode);
  }

  function handleDifficultyScoreChange(nextDifficultyScore: number) {
    const nextGame = createNewGameForDifficulty(nextDifficultyScore, normalizedConfig, difficultyHistoryRef.current);

    setSetupMode("difficulty");
    setDifficultyScore(nextDifficultyScore);
    commitLoadedGame(nextGame, "difficulty");
  }

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

    const aidDurationMs = getAidDurationMs(normalizedConfig.appearance.aidTimeSeconds);
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
    setupMode,
    difficultyScore,
    normalizedConfig,
    previewConfig,
    researchSweep,
    transitionMode,
    activeAidAnimation,
    activeScrambleFlip,
    dragTile,
    pointerPosition,
    orderedTiles,
    nextLockedCount,
    canCreatePuzzle,
    isInteractive,
    lockedCount,
    verticalCountOptions,
    horizontalCountOptions,
    verticalDensityOptions,
    horizontalDensityOptions,
    crossDensityOptions,
    currentBoardMetrics,
    currentReversalRate,
    currentOrderedShare,
    selectedDifficultyTier,
    completionCeremonyPhase: completionBurst.ceremonyPhase,
    highlightNewPuzzle: completionBurst.highlightNewPuzzle,
    actions: {
      setSetupMode,
      setDifficultyScore: handleDifficultyScoreChange,
      beginDrag: (tile, pointerId, clientX, clientY) => {
        if (tile.locked || !isInteractive) {
          return;
        }

        setDragState({
          tileId: tile.id,
          originIndex: tile.currentIndex,
          pointerId
        });
        setPointerPosition({ x: clientX, y: clientY });
      },
      updateWidth: (value) => {
        updateConfig((currentConfig) => ({
          ...currentConfig,
          width: clampPortraitWidth(value, currentConfig.height)
        }));
      },
      updateHeight: (value) => {
        updateConfig((currentConfig) => ({
          ...currentConfig,
          height: clampPortraitHeight(currentConfig.width, value)
        }));
      },
      updateLineValue: (lineKey, field, value) => {
        updateConfig((currentConfig) => ({
          ...currentConfig,
          [lineKey]: {
            ...currentConfig[lineKey],
            [field]: value
          }
        }));
      },
      updateCrossDensity: (value) => {
        updateConfig((currentConfig) => ({
          ...currentConfig,
          crossLines: {
            ...currentConfig.crossLines,
            density: value
          }
        }));
      },
      updateAppearance: (key, value) => {
        updateConfig((currentConfig) => ({
          ...currentConfig,
          appearance: {
            ...currentConfig.appearance,
            [key]: value
          }
        }));
      },
      updateColorConstraint: (key, value) => {
        updateConfig((currentConfig) => ({
          ...currentConfig,
          colorConstraints: {
            ...currentConfig.colorConstraints,
            [key]: value
          }
        }));
      },
      startNewPuzzle: handleNewPuzzle,
      useAid: handleAid
    }
  };
}
