import { useCallback, useEffect, useRef } from "react";
import { useSnapCarousel } from "../hooks/useSnapCarousel";
import type { TierSummary } from "../hooks/usePublishedPuzzleBrowser";
import { StaticPuzzlePreview } from "./StaticPuzzlePreview";

type PuzzleHomeScreenProps = {
  tiers: readonly TierSummary[];
  selectedTierIndex: number;
  onSelectTier: (index: number) => void;
  onOpenTier: (index: number) => void;
};

export function PuzzleHomeScreen({ tiers, selectedTierIndex, onSelectTier, onOpenTier }: PuzzleHomeScreenProps) {
  const titleRowRef = useRef<HTMLDivElement | null>(null);
  const { carouselRef, handleScroll, snapToIndex } = useSnapCarousel({
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
    <section className="browser-screen screen-panel" data-testid="home-screen">
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

      <div className="snap-carousel home-carousel" ref={carouselRef} onScroll={handleCarouselScroll} data-testid="home-carousel">
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
                  <StaticPuzzlePreview key={puzzle.id} puzzle={puzzle} size="small" />
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
