import { useEffect, useRef } from "react";

type UseSnapCarouselOptions = {
  selectedIndex: number;
  itemCount: number;
  onSelectedIndexChange: (index: number) => void;
};

export function useSnapCarousel({ selectedIndex, itemCount, onSelectedIndexChange }: UseSnapCarouselOptions) {
  const carouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const carousel = carouselRef.current;

    if (!carousel) {
      return;
    }

    scrollCarouselToIndex(carousel, selectedIndex);
  }, [selectedIndex]);

  function handleScroll() {
    const carousel = carouselRef.current;

    if (!carousel) {
      return;
    }
    const nextIndex = getClosestSlideIndex(carousel, itemCount);

    if (nextIndex !== selectedIndex) {
      onSelectedIndexChange(nextIndex);
    }
  }

  function snapToIndex(index: number) {
    const carousel = carouselRef.current;
    const nextIndex = clampIndex(index, itemCount);

    onSelectedIndexChange(nextIndex);

    if (!carousel) {
      return;
    }

    scrollCarouselToIndex(carousel, nextIndex);
  }

  return {
    carouselRef,
    handleScroll,
    snapToIndex
  };
}

function scrollCarouselToIndex(carousel: HTMLDivElement, index: number) {
  const targetSlide = carousel.children[index] as HTMLElement | undefined;

  if (!targetSlide) {
    return;
  }

  const nextLeft = getCenteredScrollLeft(carousel, targetSlide);

  if (typeof carousel.scrollTo === "function") {
    carousel.scrollTo({
      left: nextLeft,
      behavior: "smooth"
    });
    return;
  }

  carousel.scrollLeft = nextLeft;
}

function clampIndex(index: number, itemCount: number): number {
  if (itemCount <= 0) {
    return 0;
  }

  return Math.min(itemCount - 1, Math.max(0, index));
}

function getClosestSlideIndex(carousel: HTMLDivElement, itemCount: number): number {
  const slides = Array.from(carousel.children).slice(0, itemCount) as HTMLElement[];

  if (slides.length === 0) {
    return 0;
  }

  const viewportCenter = carousel.scrollLeft + carousel.clientWidth / 2;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  slides.forEach((slide, index) => {
    const distance = Math.abs(getSlideCenter(slide) - viewportCenter);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function getCenteredScrollLeft(carousel: HTMLDivElement, slide: HTMLElement): number {
  const maxScrollLeft = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
  const centeredLeft = getSlideCenter(slide) - carousel.clientWidth / 2;

  return Math.min(maxScrollLeft, Math.max(0, centeredLeft));
}

function getSlideCenter(slide: HTMLElement): number {
  return slide.offsetLeft + slide.clientWidth / 2;
}
