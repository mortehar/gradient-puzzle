import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from "react";

type UseSnapCarouselOptions = {
  selectedIndex: number;
  itemCount: number;
  onSelectedIndexChange: (index: number) => void;
};

type DragState = {
  pointerId: number;
  startX: number;
  startScrollLeft: number;
  hasDragged: boolean;
};

const DESKTOP_DRAG_THRESHOLD_PX = 8;

export function useSnapCarousel({ selectedIndex, itemCount, onSelectedIndexChange }: UseSnapCarouselOptions) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const programmaticScrollRef = useRef<{ index: number; timeoutId: number } | null>(null);
  const [isPointerDragging, setIsPointerDragging] = useState(false);

  const clearProgrammaticScroll = useCallback(() => {
    if (programmaticScrollRef.current === null) {
      return;
    }

    window.clearTimeout(programmaticScrollRef.current.timeoutId);
    programmaticScrollRef.current = null;
  }, []);

  const beginProgrammaticScroll = useCallback(
    (index: number, behavior: ScrollBehavior) => {
      const carousel = carouselRef.current;

      if (!carousel) {
        return;
      }

      clearProgrammaticScroll();
      scrollCarouselToIndex(carousel, index, behavior);
      programmaticScrollRef.current = {
        index,
        timeoutId: window.setTimeout(() => {
          programmaticScrollRef.current = null;
        }, behavior === "smooth" ? 420 : 80)
      };
    },
    [clearProgrammaticScroll]
  );

  useLayoutEffect(() => {
    const carousel = carouselRef.current;

    if (!carousel || dragStateRef.current) {
      return;
    }

    if (programmaticScrollRef.current?.index === selectedIndex) {
      return;
    }

    beginProgrammaticScroll(selectedIndex, "auto");
  }, [beginProgrammaticScroll, selectedIndex]);

  useEffect(() => {
    return () => {
      clearProgrammaticScroll();
    };
  }, [clearProgrammaticScroll]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      const carousel = carouselRef.current;

      if (!dragState || !carousel || event.pointerId !== dragState.pointerId) {
        return;
      }

      const dragDelta = event.clientX - dragState.startX;

      if (!dragState.hasDragged) {
        if (Math.abs(dragDelta) < DESKTOP_DRAG_THRESHOLD_PX) {
          return;
        }

        dragState.hasDragged = true;
        setIsPointerDragging(true);
      }

      event.preventDefault();
      carousel.scrollLeft = dragState.startScrollLeft - dragDelta;
    };

    const finishPointerDrag = (pointerId: number) => {
      const dragState = dragStateRef.current;
      const carousel = carouselRef.current;

      if (!dragState || !carousel || pointerId !== dragState.pointerId) {
        return;
      }

      dragStateRef.current = null;
      setIsPointerDragging(false);

      if (!dragState.hasDragged) {
        return;
      }

      suppressClickRef.current = true;
      const nextIndex = getClosestSlideIndex(carousel, itemCount);

      onSelectedIndexChange(nextIndex);
      beginProgrammaticScroll(nextIndex, "smooth");
    };

    const handlePointerUp = (event: PointerEvent) => {
      finishPointerDrag(event.pointerId);
    };

    const handlePointerCancel = (event: PointerEvent) => {
      finishPointerDrag(event.pointerId);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [beginProgrammaticScroll, itemCount, onSelectedIndexChange]);

  function handleScroll() {
    const carousel = carouselRef.current;

    if (!carousel || dragStateRef.current?.hasDragged || programmaticScrollRef.current !== null) {
      return;
    }
    const nextIndex = getClosestSlideIndex(carousel, itemCount);

    if (nextIndex !== selectedIndex) {
      onSelectedIndexChange(nextIndex);
    }
  }

  function snapToIndex(index: number) {
    const nextIndex = clampIndex(index, itemCount);

    onSelectedIndexChange(nextIndex);
    beginProgrammaticScroll(nextIndex, "smooth");
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const carousel = carouselRef.current;

    if (!carousel || event.pointerType === "touch") {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (carousel.scrollWidth <= carousel.clientWidth) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: carousel.scrollLeft,
      hasDragged: false
    };
    suppressClickRef.current = false;
  }

  function handleClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) {
      return;
    }

    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return {
    carouselRef,
    handleScroll,
    snapToIndex,
    handlePointerDown,
    handleClickCapture,
    isPointerDragging
  };
}

function scrollCarouselToIndex(carousel: HTMLDivElement, index: number, behavior: ScrollBehavior) {
  const targetSlide = carousel.children[index] as HTMLElement | undefined;

  if (!targetSlide) {
    return;
  }

  const nextLeft = getCenteredScrollLeft(carousel, targetSlide);

  if (typeof carousel.scrollTo === "function") {
    carousel.scrollTo({
      left: nextLeft,
      behavior
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
