import { useCallback, useEffect, useRef } from "react";
import { useSnapCarousel } from "../hooks/useSnapCarousel";
import type { TierSummary } from "../hooks/usePublishedPuzzleBrowser";
import { BackSymbolButton } from "./BackSymbolButton";
import { BrowserScreenTopRow } from "./BrowserScreenTopRow";
import { ScreenIntro } from "./ScreenIntro";
import { ScreenScenery } from "./ScreenScenery";
import { StaticPuzzlePreview } from "./StaticPuzzlePreview";
import { UiGlyph } from "./UiGlyph";
import type { LockedTileStyle } from "./lockedTileStyles";
import { getTierScreenArtDirection } from "./screenArtDirection";

type PuzzleTierScreenProps = {
  tier: TierSummary;
  isSettingsOpen: boolean;
  lockedTileStyle: LockedTileStyle;
  onSelectPuzzle: (index: number) => void;
  onLockedTileStyleChange: (value: LockedTileStyle) => void;
  onToggleSettings: () => void;
  onCloseSettings: () => void;
  onOpenPuzzle: (index: number) => void;
  onBack: () => void;
};

export function PuzzleTierScreen({
  tier,
  isSettingsOpen,
  lockedTileStyle,
  onSelectPuzzle,
  onLockedTileStyleChange,
  onToggleSettings,
  onCloseSettings,
  onOpenPuzzle,
  onBack
}: PuzzleTierScreenProps) {
  const numberRowRef = useRef<HTMLDivElement | null>(null);
  const activePuzzle = tier.puzzles[tier.selectedPuzzleIndex] ?? tier.puzzles[0];
  const artDirection = getTierScreenArtDirection(tier, activePuzzle);
  const { carouselRef, handleScroll, snapToIndex, handlePointerDown, handleClickCapture, isPointerDragging } = useSnapCarousel({
    selectedIndex: tier.selectedPuzzleIndex,
    itemCount: tier.puzzles.length,
    onSelectedIndexChange: onSelectPuzzle
  });
  const syncNumberRowScroll = useCallback(() => {
    const carousel = carouselRef.current;
    const numberRow = numberRowRef.current;

    if (!carousel || !numberRow) {
      return;
    }

    const maxCarouselScroll = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
    const maxNumberScroll = Math.max(0, numberRow.scrollWidth - numberRow.clientWidth);
    const progress = maxCarouselScroll === 0 ? 0 : carousel.scrollLeft / maxCarouselScroll;

    numberRow.scrollLeft = progress * maxNumberScroll;
  }, [carouselRef]);

  useEffect(() => {
    syncNumberRowScroll();
  }, [syncNumberRowScroll, tier.selectedPuzzleIndex]);

  useEffect(() => {
    const handleResize = () => {
      syncNumberRowScroll();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [syncNumberRowScroll]);

  return (
    <section className={["browser-screen", "screen-panel", artDirection.sectionClassName].join(" ")} data-testid="tier-screen">
      <ScreenScenery variant={artDirection.sceneVariant} />

      <BrowserScreenTopRow
        isSettingsOpen={isSettingsOpen}
        lockedTileStyle={lockedTileStyle}
        onToggleSettings={onToggleSettings}
        onLockedTileStyleChange={onLockedTileStyleChange}
        onCloseSettings={onCloseSettings}
      />

      <ScreenIntro
        kicker={artDirection.kicker}
        title={artDirection.title}
        copy={artDirection.copy}
        chips={artDirection.chips}
        chipsTestId="tier-screen-chips"
      />

      <div className="tier-number-row" ref={numberRowRef} data-testid="tier-number-row">
        <div className="tier-number-track">
          {tier.puzzles.map(({ puzzle }, index) => (
            <div className="tier-number-slot" key={puzzle.id}>
              <button
                className={["tier-number-label", index === tier.selectedPuzzleIndex ? "tier-number-label-active" : ""].join(" ")}
                type="button"
                data-testid={`tier-number-label-${puzzle.tierIndex}`}
                onClick={() => {
                  if (index === tier.selectedPuzzleIndex) {
                    onOpenPuzzle(index);
                    return;
                  }

                  snapToIndex(index);
                }}
              >
                {puzzle.tierIndex}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div
        className={["snap-carousel", "tier-carousel", isPointerDragging ? "snap-carousel-dragging" : ""].join(" ")}
        ref={carouselRef}
        onScroll={handleCarouselScroll}
        onPointerDown={handlePointerDown}
        onClickCapture={handleClickCapture}
        data-testid="tier-carousel"
      >
        {tier.puzzles.map(({ puzzle }, index) => (
          <div className="snap-slide tier-carousel-slide" key={puzzle.id}>
            <button
              className={["puzzle-preview-card", index === tier.selectedPuzzleIndex ? "puzzle-preview-card-active" : ""].join(" ")}
              type="button"
              data-testid={`tier-puzzle-card-${puzzle.tierIndex}`}
              onClick={() => {
                if (index === tier.selectedPuzzleIndex) {
                  onOpenPuzzle(index);
                  return;
                }

                snapToIndex(index);
              }}
            >
              <StaticPuzzlePreview
                puzzle={puzzle}
                size="large"
                lockedTileStyle={lockedTileStyle}
                testId={index === tier.selectedPuzzleIndex ? "tier-active-preview" : undefined}
              />
            </button>
          </div>
        ))}
      </div>

      <p className="browser-meta browser-meta-spacious" data-testid="tier-best-score">
        {activePuzzle ? <UiGlyph name="start" className="browser-meta-icon" /> : "\u00A0"}
      </p>

      <div className="screen-footer-actions">
        <BackSymbolButton onClick={onBack} testId="tier-back-button" />
      </div>
    </section>
  );

  function handleCarouselScroll() {
    handleScroll();
    syncNumberRowScroll();
  }
}
