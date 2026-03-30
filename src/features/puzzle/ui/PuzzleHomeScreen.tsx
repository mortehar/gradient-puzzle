import { useCallback, useEffect, useRef } from "react";
import { useSnapCarousel } from "../hooks/useSnapCarousel";
import type { TierSummary } from "../hooks/usePublishedPuzzleBrowser";
import { BrowserScreenTopRow } from "./BrowserScreenTopRow";
import { ScreenIntro } from "./ScreenIntro";
import { StaticPuzzlePreview } from "./StaticPuzzlePreview";
import type { LockedTileStyle } from "./lockedTileStyles";
import { getHomeScreenArtDirection } from "./screenArtDirection";

type PuzzleHomeScreenProps = {
  tiers: readonly TierSummary[];
  selectedTierIndex: number;
  isSettingsOpen: boolean;
  lockedTileStyle: LockedTileStyle;
  onSelectTier: (index: number) => void;
  onLockedTileStyleChange: (value: LockedTileStyle) => void;
  onToggleSettings: () => void;
  onCloseSettings: () => void;
  onOpenTier: (index: number) => void;
};

export function PuzzleHomeScreen({
  tiers,
  selectedTierIndex,
  isSettingsOpen,
  lockedTileStyle,
  onSelectTier,
  onLockedTileStyleChange,
  onToggleSettings,
  onCloseSettings,
  onOpenTier
}: PuzzleHomeScreenProps) {
  const titleRowRef = useRef<HTMLDivElement | null>(null);
  const activeTier = tiers[selectedTierIndex] ?? tiers[0];
  const artDirection = getHomeScreenArtDirection(activeTier);
  const { carouselRef, handleScroll, snapToIndex, handlePointerDown, handleClickCapture, isPointerDragging } = useSnapCarousel({
    selectedIndex: selectedTierIndex,
    itemCount: tiers.length,
    onSelectedIndexChange: onSelectTier
  });

  const syncTitleRowScroll = useCallback(() => {
    const carousel = carouselRef.current;
    const titleRow = titleRowRef.current;

    if (!carousel || !titleRow) {
      return;
    }

    const maxCarouselScroll = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
    const maxTitleScroll = Math.max(0, titleRow.scrollWidth - titleRow.clientWidth);
    const progress = maxCarouselScroll === 0 ? 0 : carousel.scrollLeft / maxCarouselScroll;

    titleRow.scrollLeft = progress * maxTitleScroll;
  }, [carouselRef]);

  useEffect(() => {
    syncTitleRowScroll();
  }, [selectedTierIndex, syncTitleRowScroll]);

  useEffect(() => {
    const handleResize = () => {
      syncTitleRowScroll();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [syncTitleRowScroll]);

  return (
    <section className={["browser-screen", "screen-panel", artDirection.sectionClassName].join(" ")} data-testid="home-screen">
      <BrowserScreenTopRow
        isSettingsOpen={isSettingsOpen}
        lockedTileStyle={lockedTileStyle}
        onToggleSettings={onToggleSettings}
        onLockedTileStyleChange={onLockedTileStyleChange}
        onCloseSettings={onCloseSettings}
      />

      <ScreenIntro
        className="screen-heading home-screen-heading"
        kicker={artDirection.kicker}
        title={artDirection.title}
        copy={artDirection.copy}
        chips={artDirection.chips}
        chipsTestId="home-screen-chips"
      />

      <div className="home-tier-title-row" ref={titleRowRef} data-testid="home-tier-title-row">
        <div className="home-tier-title-track">
          {tiers.map((tier, index) => (
            <div className="home-tier-title-slot" key={tier.tier}>
              <button
                className={["home-tier-title", index === selectedTierIndex ? "home-tier-title-active" : ""].join(" ")}
                type="button"
                data-testid={`home-tier-title-${tier.tier.toLowerCase()}`}
                onClick={() => {
                  if (index === selectedTierIndex) {
                    onOpenTier(index);
                    return;
                  }

                  snapToIndex(index);
                }}
              >
                {tier.tier}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div
        className={["snap-carousel", "home-carousel", isPointerDragging ? "snap-carousel-dragging" : ""].join(" ")}
        ref={carouselRef}
        onScroll={handleCarouselScroll}
        onPointerDown={handlePointerDown}
        onClickCapture={handleClickCapture}
        data-testid="home-carousel"
      >
        {tiers.map((tier, index) => (
          <div className="snap-slide home-carousel-slide" key={tier.tier}>
            <button
              className={["tier-card", index === selectedTierIndex ? "tier-card-active" : ""].join(" ")}
              type="button"
              data-testid={`home-tier-card-${tier.tier.toLowerCase()}`}
              onClick={() => {
                if (index === selectedTierIndex) {
                  onOpenTier(index);
                  return;
                }

                snapToIndex(index);
              }}
            >
              <div className="tier-preview-grid" data-testid={`home-tier-preview-${tier.tier.toLowerCase()}`}>
                {tier.previewPuzzles.map(({ puzzle }) => (
                  <StaticPuzzlePreview key={puzzle.id} puzzle={puzzle} size="small" lockedTileStyle={lockedTileStyle} />
                ))}
              </div>
              <p className="browser-meta" data-testid={`home-tier-progress-${tier.tier.toLowerCase()}`}>
                {tier.completedCount}/{tier.totalCount}
              </p>
            </button>
          </div>
        ))}
      </div>
    </section>
  );

  function handleCarouselScroll() {
    handleScroll();
    syncTitleRowScroll();
  }
}
