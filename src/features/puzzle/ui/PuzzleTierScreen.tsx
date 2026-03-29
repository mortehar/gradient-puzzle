import { useCallback, useEffect, useRef } from "react";
import { useSnapCarousel } from "../hooks/useSnapCarousel";
import type { TierSummary } from "../hooks/usePublishedPuzzleBrowser";
import { BackSymbolButton } from "./BackSymbolButton";
import { StaticPuzzlePreview } from "./StaticPuzzlePreview";

type PuzzleTierScreenProps = {
  tier: TierSummary;
  onSelectPuzzle: (index: number) => void;
  onOpenPuzzle: (index: number) => void;
  onBack: () => void;
};

export function PuzzleTierScreen({ tier, onSelectPuzzle, onOpenPuzzle, onBack }: PuzzleTierScreenProps) {
  const numberRowRef = useRef<HTMLDivElement | null>(null);
  const activePuzzle = tier.puzzles[tier.selectedPuzzleIndex] ?? tier.puzzles[0];
  const { carouselRef, handleScroll, snapToIndex } = useSnapCarousel({
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
    <section className="browser-screen screen-panel" data-testid="tier-screen">
      <div className="screen-heading">
        <p className="screen-kicker">{tier.tier}</p>
      </div>

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

      <div className="snap-carousel tier-carousel" ref={carouselRef} onScroll={handleCarouselScroll} data-testid="tier-carousel">
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
                testId={index === tier.selectedPuzzleIndex ? "tier-active-preview" : undefined}
              />
            </button>
          </div>
        ))}
      </div>

      <p className="browser-meta browser-meta-spacious" data-testid="tier-best-score">
        {activePuzzle?.bestCompletion ? `Best: ${activePuzzle.bestCompletion.moveCount}` : "\u00A0"}
      </p>

      <BackSymbolButton onClick={onBack} testId="tier-back-button" />
    </section>
  );

  function handleCarouselScroll() {
    handleScroll();
    syncNumberRowScroll();
  }
}
