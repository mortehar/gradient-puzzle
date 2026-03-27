import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  DEFAULT_CONFIG,
  MAX_BOARD_SIZE,
  MIN_BOARD_SIZE,
  createNewGame,
  findBestAidMove,
  getLockedIndexes,
  getValidCrossDensities,
  getValidHorizontalLineCounts,
  getValidLineDensities,
  getValidVerticalLineCounts,
  isSolved,
  normalizeConfig,
  swapTiles,
  type AidMove,
  type ColorConstraints,
  type GameConfig,
  type GameState,
  type Tile
} from "./game";

const PREVIEW_DURATION_MS = 2000;
const SCRAMBLE_DURATION_MS = 1000;
const MANUAL_MOVE_DURATION_MS = 180;
const AID_ANIMATION_START_DELAY_MS = 20;
const SCRAMBLE_FLIP_CARD_DURATION_MS = 700;
const SCRAMBLE_STAGGER_SPREAD_MS = 220;
const CINEMATIC_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const QUICK_EASING = "ease";

type DragState = {
  tileId: string;
  originIndex: number;
  pointerId: number;
};

type PointerPosition = {
  x: number;
  y: number;
};

type AidAnimationState = AidMove & {
  primaryColor: string;
  secondaryColor: string;
  durationMs: number;
  moving: boolean;
};

type ScrambleFlipTile = {
  index: number;
  frontColor: string;
  backColor: string;
  locked: boolean;
  delayMs: number;
};

function App() {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [game, setGame] = useState<GameState>(() => createNewGame(DEFAULT_CONFIG));
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [pointerPosition, setPointerPosition] = useState<PointerPosition | null>(null);
  const [transitionMode, setTransitionMode] = useState<"none" | "quick" | "cinematic">("none");
  const [activeAidAnimation, setActiveAidAnimation] = useState<AidAnimationState | null>(null);
  const [activeScrambleFlip, setActiveScrambleFlip] = useState<ScrambleFlipTile[] | null>(null);
  const suppressClickRef = useRef(false);
  const dragMovedRef = useRef(false);

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
      const targetIndex = getDropIndex(event.clientX, event.clientY);
      setHoverIndex(targetIndex);
      dragMovedRef.current = dragMovedRef.current || targetIndex !== null;
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) {
        return;
      }

      const targetIndex = getDropIndex(event.clientX, event.clientY);
      suppressClickRef.current = dragMovedRef.current && targetIndex !== null && targetIndex !== dragState.originIndex;
      commitSwap(dragState.originIndex, targetIndex);
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

    setSelectedTileId(null);
    clearDragState();
  }, [game.status]);

  const normalizedConfig = normalizeConfig(config);
  const nextLockedCount = getLockedIndexes(normalizedConfig).length;
  const nextMovableCount = normalizedConfig.width * normalizedConfig.height - nextLockedCount;
  const canCreatePuzzle = nextMovableCount >= 2;
  const isInteractive = game.status === "playing";
  const orderedTiles = [...game.tiles].sort((left, right) => left.currentIndex - right.currentIndex);
  const lockedCount = getLockedIndexes(game.config).length;
  const verticalCountOptions = getValidVerticalLineCounts(normalizedConfig.width);
  const horizontalCountOptions = getValidHorizontalLineCounts(normalizedConfig.height);
  const verticalDensityOptions = getValidLineDensities(normalizedConfig.height);
  const horizontalDensityOptions = getValidLineDensities(normalizedConfig.width);
  const crossDensityOptions = getValidCrossDensities(normalizedConfig.width, normalizedConfig.height);

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
    setHoverIndex(null);
    setPointerPosition(null);
    dragMovedRef.current = false;
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

  function handleTilePointerDown(tile: Tile, event: ReactPointerEvent<HTMLButtonElement>) {
    if (tile.locked || !isInteractive) {
      return;
    }

    event.preventDefault();
    setDragState({
      tileId: tile.id,
      originIndex: tile.currentIndex,
      pointerId: event.pointerId
    });
    setPointerPosition({ x: event.clientX, y: event.clientY });
  }

  function handleTileClick(tile: Tile) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    if (tile.locked || !isInteractive) {
      return;
    }

    if (!selectedTileId) {
      setSelectedTileId(tile.id);
      return;
    }

    if (selectedTileId === tile.id) {
      setSelectedTileId(null);
      return;
    }

    const selectedTile = game.tiles.find((candidate) => candidate.id === selectedTileId);

    if (!selectedTile || selectedTile.locked) {
      setSelectedTileId(null);
      return;
    }

    commitSwap(selectedTile.currentIndex, tile.currentIndex);
    setSelectedTileId(null);
  }

  function updateConfig(updater: (currentConfig: GameConfig) => GameConfig) {
    setConfig((currentConfig) => normalizeConfig(updater(currentConfig)));
  }

  function handleConfigChange<K extends keyof GameConfig>(key: K, value: GameConfig[K]) {
    updateConfig((currentConfig) => ({
      ...currentConfig,
      [key]: value
    }));
  }

  function handleLineValueChange(
    lineKey: "verticalLines" | "horizontalLines",
    field: "count" | "density",
    value: number
  ) {
    updateConfig((currentConfig) => ({
      ...currentConfig,
      [lineKey]: {
        ...currentConfig[lineKey],
        [field]: value
      }
    }));
  }

  function handleCrossDensityChange(value: number) {
    updateConfig((currentConfig) => ({
      ...currentConfig,
      crossLines: {
        ...currentConfig.crossLines,
        density: value
      }
    }));
  }

  function handleColorConstraintChange<K extends keyof ColorConstraints>(key: K, value: ColorConstraints[K]) {
    updateConfig((currentConfig) => ({
      ...currentConfig,
      colorConstraints: {
        ...currentConfig.colorConstraints,
        [key]: value
      }
    }));
  }

  function handleLuminosityMinChange(value: number) {
    updateConfig((currentConfig) => ({
      ...currentConfig,
      colorConstraints: {
        ...currentConfig.colorConstraints,
        minLuminosityValue: value,
        maxLuminosityValue: Math.max(value, currentConfig.colorConstraints.maxLuminosityValue)
      }
    }));
  }

  function handleLuminosityMaxChange(value: number) {
    updateConfig((currentConfig) => ({
      ...currentConfig,
      colorConstraints: {
        ...currentConfig.colorConstraints,
        minLuminosityValue: Math.min(currentConfig.colorConstraints.minLuminosityValue, value),
        maxLuminosityValue: value
      }
    }));
  }

  function handleNewPuzzle() {
    if (!canCreatePuzzle) {
      return;
    }

    setGame(createNewGame(normalizedConfig));
    setActiveAidAnimation(null);
    setActiveScrambleFlip(null);
    setTransitionMode("none");
    setSelectedTileId(null);
    clearDragState();

    window.setTimeout(() => {
      setTransitionMode("quick");
    }, 0);
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
    setSelectedTileId(null);
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

  const dragTile = dragState ? game.tiles.find((tile) => tile.id === dragState.tileId) ?? null : null;

  return (
    <main className="app-shell">
      <section className="app-layout">
        <section className="board-panel">
          <div
            className={[
              "board",
              game.status === "solved" ? "board-solved" : "",
              game.status === "scrambling" ? "board-scramble-flip" : "",
              transitionMode === "none" ? "board-no-motion" : "",
              transitionMode === "cinematic" ? "board-cinematic-motion" : "board-quick-motion"
            ].join(" ")}
            aria-label="Gradient puzzle board"
            role="grid"
            data-testid="puzzle-board"
            style={
              {
                "--board-columns": game.config.width,
                "--board-rows": game.config.height,
                "--tile-motion-duration":
                  transitionMode === "cinematic" ? `${SCRAMBLE_DURATION_MS}ms` : `${MANUAL_MOVE_DURATION_MS}ms`,
                "--tile-motion-easing": transitionMode === "cinematic" ? CINEMATIC_EASING : QUICK_EASING,
                "--scramble-flip-duration": `${SCRAMBLE_FLIP_CARD_DURATION_MS}ms`,
                "--tile-gap": `${normalizedConfig.appearance.cellSpacing}px`,
                "--tile-radius": `${normalizedConfig.appearance.cellRounding}px`,
                "--tile-inner-radius": `${Math.max(0, normalizedConfig.appearance.cellRounding - 2)}px`,
                aspectRatio: `${game.config.width} / ${game.config.height}`
              } as CSSProperties
            }
          >
            {orderedTiles.map((tile) => {
              const isDragging = dragState?.tileId === tile.id;
              const isSelected = selectedTileId === tile.id;
              const isDropTarget = hoverIndex === tile.currentIndex && !tile.locked && isInteractive;
              const isHiddenForAid =
                activeAidAnimation !== null &&
                (tile.id === activeAidAnimation.primaryTileId || tile.id === activeAidAnimation.secondaryTileId);
              const isHiddenForScramble = activeScrambleFlip !== null && !tile.locked;

              return (
                <button
                  key={tile.id}
                  type="button"
                  role="gridcell"
                  aria-label={`Tile ${tile.currentIndex + 1}${tile.locked ? ", locked tile" : ""}`}
                  className={[
                    "tile",
                    tile.locked ? "tile-locked" : "",
                    isDragging ? "tile-dragging" : "",
                    isSelected ? "tile-selected" : "",
                    isDropTarget ? "tile-drop-target" : "",
                    isHiddenForScramble ? "tile-hidden-for-scramble" : "",
                    isHiddenForAid ? "tile-hidden-for-aid" : "",
                    !isInteractive ? "tile-static" : ""
                  ].join(" ")}
                  style={{ backgroundColor: tile.color, ...getTileLayoutStyle(tile.currentIndex, game.config) }}
                  data-current-index={tile.currentIndex}
                  data-testid={`tile-${tile.currentIndex}`}
                  onPointerDown={(event) => handleTilePointerDown(tile, event)}
                  onClick={() => handleTileClick(tile)}
                >
                  <span className="sr-only">{tile.locked ? "Locked tile" : "Movable tile"}</span>
                </button>
              );
            })}

            {activeAidAnimation ? (
              <>
                <div
                  className={[
                    "aid-overlay",
                    "aid-overlay-primary",
                    activeAidAnimation.moving ? "aid-overlay-primary-moving" : ""
                  ].join(" ")}
                  data-testid="aid-primary-overlay"
                  style={
                    {
                      backgroundColor: activeAidAnimation.primaryColor,
                      ...getTileLayoutStyle(
                        activeAidAnimation.moving ? activeAidAnimation.primaryToIndex : activeAidAnimation.primaryFromIndex,
                        game.config
                      ),
                      "--aid-motion-duration": `${activeAidAnimation.durationMs}ms`
                    } as CSSProperties
                  }
                />
                <div
                  className="aid-overlay aid-overlay-secondary"
                  data-testid="aid-secondary-overlay"
                  style={
                    {
                      backgroundColor: activeAidAnimation.secondaryColor,
                      ...getTileLayoutStyle(activeAidAnimation.secondaryFromIndex, game.config)
                    } as CSSProperties
                  }
                />
              </>
            ) : null}

            {activeScrambleFlip ? (
              <div className="scramble-overlay" data-testid="scramble-overlay" aria-hidden="true">
                {activeScrambleFlip.map((tile) =>
                  tile.locked ? null : (
                    <div
                      key={tile.index}
                      className="scramble-flip-card"
                      data-testid={`scramble-flip-${tile.index}`}
                      style={
                        {
                          ...getTileLayoutStyle(tile.index, game.config),
                          "--scramble-flip-delay": `${tile.delayMs}ms`
                        } as CSSProperties
                      }
                    >
                      <div className="scramble-flip-inner">
                        <div className="scramble-face scramble-face-front" style={{ backgroundColor: tile.frontColor }} />
                        <div className="scramble-face scramble-face-back" style={{ backgroundColor: tile.backColor }} />
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : null}
          </div>

          <div className="board-footer" data-testid="board-footer">
            <div className="completion-summary" data-testid="completion-summary">
              {game.status === "solved" ? (
                <>
                  <p className="completion-title">Puzzle complete</p>
                  <p className="completion-score">Final score: {game.swapCount} swaps</p>
                  <p className="completion-score-secondary">Aids used: {game.hintCount}</p>
                </>
              ) : (
                <>
                  <p className="completion-title">Current score</p>
                  <p className="completion-score">{game.swapCount} swaps</p>
                  <p className="completion-score-secondary">Aids used: {game.hintCount}</p>
                </>
              )}
            </div>

            <div className="board-footer-actions" data-testid="board-footer-actions">
              <button
                className="action-button aid-button"
                type="button"
                onClick={handleAid}
                disabled={!isInteractive}
                data-testid="aid-button"
              >
                Aid
              </button>
              <button
                className="action-button new-button"
                type="button"
                onClick={handleNewPuzzle}
                disabled={!canCreatePuzzle}
              >
                New
              </button>
            </div>
          </div>
        </section>

        <aside className="settings-panel">
          <div className="status-card">
            <label className="control-group" htmlFor="width-slider">
              <span className="status-label">Width</span>
              <div className="control-row">
                <input
                  id="width-slider"
                  data-testid="width-slider"
                  type="range"
                  min={MIN_BOARD_SIZE}
                  max={MAX_BOARD_SIZE}
                  value={normalizedConfig.width}
                  onChange={(event) => handleConfigChange("width", Number(event.target.value))}
                />
                <strong>{normalizedConfig.width}</strong>
              </div>
            </label>

            <label className="control-group" htmlFor="height-slider">
              <span className="status-label">Height</span>
              <div className="control-row">
                <input
                  id="height-slider"
                  data-testid="height-slider"
                  type="range"
                  min={MIN_BOARD_SIZE}
                  max={MAX_BOARD_SIZE}
                  value={normalizedConfig.height}
                  onChange={(event) => handleConfigChange("height", Number(event.target.value))}
                />
                <strong>{normalizedConfig.height}</strong>
              </div>
            </label>

            <LineControl
              title="Vertical lines"
              count={normalizedConfig.verticalLines.count}
              density={normalizedConfig.verticalLines.density}
              countOptions={verticalCountOptions}
              densityOptions={verticalDensityOptions}
              onCountChange={(value) => handleLineValueChange("verticalLines", "count", value)}
              onDensityChange={(value) => handleLineValueChange("verticalLines", "density", value)}
              countTestId="vertical-count-slider"
              densityTestId="vertical-density-slider"
            />

            <LineControl
              title="Horizontal lines"
              count={normalizedConfig.horizontalLines.count}
              density={normalizedConfig.horizontalLines.density}
              countOptions={horizontalCountOptions}
              densityOptions={horizontalDensityOptions}
              onCountChange={(value) => handleLineValueChange("horizontalLines", "count", value)}
              onDensityChange={(value) => handleLineValueChange("horizontalLines", "density", value)}
              countTestId="horizontal-count-slider"
              densityTestId="horizontal-density-slider"
            />

            <section className="option-block">
              <p className="status-label option-title">Cross lines</p>
              <SnappedSlider
                label="Spacing"
                options={crossDensityOptions}
                value={normalizedConfig.crossLines.density}
                disabled={false}
                onChange={handleCrossDensityChange}
                testId="cross-density-slider"
              />
            </section>

            <section className="option-block">
              <p className="status-label option-title">Cell Appearance</p>
              <label className="control-group" htmlFor="cell-spacing-slider">
                <span className="status-label">Cell spacing</span>
                <div className="control-row">
                  <input
                    id="cell-spacing-slider"
                    data-testid="cell-spacing-slider"
                    type="range"
                    min={0}
                    max={16}
                    value={normalizedConfig.appearance.cellSpacing}
                    onChange={(event) =>
                      handleConfigChange("appearance", {
                        ...normalizedConfig.appearance,
                        cellSpacing: Number(event.target.value)
                      })
                    }
                  />
                  <strong>{normalizedConfig.appearance.cellSpacing}</strong>
                </div>
              </label>
              <label className="control-group" htmlFor="cell-rounding-slider">
                <span className="status-label">Cell rounding</span>
                <div className="control-row">
                  <input
                    id="cell-rounding-slider"
                    data-testid="cell-rounding-slider"
                    type="range"
                    min={0}
                    max={16}
                    value={normalizedConfig.appearance.cellRounding}
                    onChange={(event) =>
                      handleConfigChange("appearance", {
                        ...normalizedConfig.appearance,
                        cellRounding: Number(event.target.value)
                      })
                    }
                  />
                  <strong>{normalizedConfig.appearance.cellRounding}</strong>
                </div>
              </label>
              <label className="control-group" htmlFor="aid-time-slider">
                <span className="status-label">Aid time</span>
                <div className="control-row">
                  <input
                    id="aid-time-slider"
                    data-testid="aid-time-slider"
                    type="range"
                    min={0}
                    max={3}
                    step={0.1}
                    value={normalizedConfig.appearance.aidTimeSeconds}
                    onChange={(event) =>
                      handleConfigChange("appearance", {
                        ...normalizedConfig.appearance,
                        aidTimeSeconds: Number(event.target.value)
                      })
                    }
                  />
                  <strong>{normalizedConfig.appearance.aidTimeSeconds.toFixed(1)}</strong>
                </div>
              </label>
            </section>

            <section className="option-block">
              <p className="status-label option-title">Corner Color Rules</p>
              <label className="control-group" htmlFor="hue-distance-slider">
                <span className="status-label">Minimum hue distance</span>
                <div className="control-row">
                  <input
                    id="hue-distance-slider"
                    data-testid="hue-distance-slider"
                    type="range"
                    min={0}
                    max={180}
                    value={normalizedConfig.colorConstraints.minHueDistance}
                    onChange={(event) => handleColorConstraintChange("minHueDistance", Number(event.target.value))}
                  />
                  <strong>{normalizedConfig.colorConstraints.minHueDistance}</strong>
                </div>
              </label>
              <label className="control-group" htmlFor="sat-value-slider">
                <span className="status-label">Minimum saturation value</span>
                <div className="control-row">
                  <input
                    id="sat-value-slider"
                    data-testid="sat-value-slider"
                    type="range"
                    min={0}
                    max={100}
                    value={normalizedConfig.colorConstraints.minSaturationValue}
                    onChange={(event) => handleColorConstraintChange("minSaturationValue", Number(event.target.value))}
                  />
                  <strong>{normalizedConfig.colorConstraints.minSaturationValue}</strong>
                </div>
              </label>
              <label className="control-group" htmlFor="lum-value-slider">
                <span className="status-label">Minimum luminosity</span>
                <div className="control-row">
                  <input
                    id="lum-value-slider"
                    data-testid="lum-value-slider"
                    type="range"
                    min={0}
                    max={100}
                    value={normalizedConfig.colorConstraints.minLuminosityValue}
                    onChange={(event) => handleLuminosityMinChange(Number(event.target.value))}
                  />
                  <strong>{normalizedConfig.colorConstraints.minLuminosityValue}</strong>
                </div>
              </label>
              <label className="control-group" htmlFor="lum-max-slider">
                <span className="status-label">Maximum luminosity</span>
                <div className="control-row">
                  <input
                    id="lum-max-slider"
                    data-testid="lum-max-slider"
                    type="range"
                    min={0}
                    max={100}
                    value={normalizedConfig.colorConstraints.maxLuminosityValue}
                    onChange={(event) => handleLuminosityMaxChange(Number(event.target.value))}
                  />
                  <strong>{normalizedConfig.colorConstraints.maxLuminosityValue}</strong>
                </div>
              </label>
              <label className="control-group" htmlFor="lum-distance-slider">
                <span className="status-label">Minimum luminosity distance</span>
                <div className="control-row">
                  <input
                    id="lum-distance-slider"
                    data-testid="lum-distance-slider"
                    type="range"
                    min={0}
                    max={100}
                    value={normalizedConfig.colorConstraints.minLuminosityDistance}
                    onChange={(event) => handleColorConstraintChange("minLuminosityDistance", Number(event.target.value))}
                  />
                  <strong>{normalizedConfig.colorConstraints.minLuminosityDistance}</strong>
                </div>
              </label>
            </section>

            <div>
              <span className="status-label">Grid</span>
              <strong>
                {game.config.width} x {game.config.height}
              </strong>
            </div>
            <div>
              <span className="status-label">Locked</span>
              <strong>{lockedCount}</strong>
            </div>
            <div>
              <span className="status-label">Next puzzle locks</span>
              <strong data-testid="next-locked-count">{nextLockedCount}</strong>
            </div>
            <div>
              <span className="status-label">Swaps</span>
              <strong>{game.swapCount}</strong>
            </div>
            <div>
              <span className="status-label">Aids used</span>
              <strong data-testid="aid-count">{game.hintCount}</strong>
            </div>

            {!canCreatePuzzle ? (
              <p className="settings-note" data-testid="settings-warning">
                Current settings lock too many cells. Reduce the line patterns before starting a new puzzle.
              </p>
            ) : null}

          </div>
        </aside>
      </section>

      {dragTile && pointerPosition ? (
        <div
          className="drag-preview"
          aria-hidden="true"
          style={{
            backgroundColor: dragTile.color,
            left: pointerPosition.x,
            top: pointerPosition.y
          }}
        />
      ) : null}
    </main>
  );
}

function getAidDurationMs(aidTimeSeconds: number): number {
  return Math.round(aidTimeSeconds * 1000);
}

function buildScrambleFlipTiles(tiles: Tile[], scrambledTiles: Tile[], config: GameConfig): ScrambleFlipTile[] {
  const solvedTiles = [...tiles].sort((left, right) => left.solvedIndex - right.solvedIndex);
  const movableTiles = solvedTiles.filter((tile) => !tile.locked);
  const maxWaveScore = movableTiles.reduce((highest, tile) => {
    const row = Math.floor(tile.solvedIndex / config.width);
    const column = tile.solvedIndex % config.width;
    return Math.max(highest, row + column);
  }, 0);

  return solvedTiles.map((tile) => ({
    index: tile.solvedIndex,
    frontColor: tile.color,
    backColor: scrambledTiles.find((candidate) => candidate.currentIndex === tile.solvedIndex)?.color ?? tile.color,
    locked: tile.locked,
    delayMs: getScrambleFlipDelay(tile, config, maxWaveScore)
  }));
}

function getScrambleFlipDelay(tile: Tile, config: GameConfig, maxWaveScore: number): number {
  if (tile.locked) {
    return 0;
  }

  const row = Math.floor(tile.solvedIndex / config.width);
  const column = tile.solvedIndex % config.width;
  const waveScore = row + column;
  const normalizedWave = maxWaveScore === 0 ? 0 : waveScore / maxWaveScore;

  return Math.round(normalizedWave * SCRAMBLE_STAGGER_SPREAD_MS);
}

function getTileLayoutStyle(index: number, config: GameConfig): CSSProperties {
  const row = Math.floor(index / config.width);
  const column = index % config.width;

  return {
    width: `calc((100% - (${config.width - 1} * var(--tile-gap))) / ${config.width})`,
    height: `calc((100% - (${config.height - 1} * var(--tile-gap))) / ${config.height})`,
    left: `calc(${column} * ((100% - (${config.width - 1} * var(--tile-gap))) / ${config.width} + var(--tile-gap)))`,
    top: `calc(${row} * ((100% - (${config.height - 1} * var(--tile-gap))) / ${config.height} + var(--tile-gap)))`
  };
}

type LineControlProps = {
  title: string;
  count: number;
  density: number;
  countOptions: number[];
  densityOptions: number[];
  onCountChange: (value: number) => void;
  onDensityChange: (value: number) => void;
  countTestId: string;
  densityTestId: string;
};

function LineControl({
  title,
  count,
  density,
  countOptions,
  densityOptions,
  onCountChange,
  onDensityChange,
  countTestId,
  densityTestId
}: LineControlProps) {
  return (
    <section className="option-block">
      <p className="status-label option-title">{title}</p>
      <SnappedSlider
        label="Number"
        options={countOptions}
        value={count}
        disabled={false}
        onChange={onCountChange}
        testId={countTestId}
      />
      <SnappedSlider
        label="Spacing"
        options={densityOptions}
        value={density}
        disabled={count === 0}
        onChange={onDensityChange}
        testId={densityTestId}
      />
    </section>
  );
}

type SnappedSliderProps = {
  label: string;
  options: number[];
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
  testId: string;
};

function SnappedSlider({ label, options, value, disabled, onChange, testId }: SnappedSliderProps) {
  const currentIndex = Math.max(0, options.indexOf(value));

  return (
    <label className="control-group snapped-group">
      <span className="status-label">{label}</span>
      <div className="control-row">
        <input
          data-testid={testId}
          type="range"
          min={0}
          max={Math.max(0, options.length - 1)}
          step={1}
          disabled={disabled}
          value={currentIndex}
          onChange={(event) => onChange(options[Number(event.target.value)] ?? options[0])}
        />
        <strong>{options[currentIndex]}</strong>
      </div>
    </label>
  );
}

export default App;
