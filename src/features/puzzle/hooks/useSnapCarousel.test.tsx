import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useSnapCarousel } from "./useSnapCarousel";

function TestCarousel() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { carouselRef, handleScroll, snapToIndex, handlePointerDown, handleClickCapture, isPointerDragging } = useSnapCarousel({
    selectedIndex,
    itemCount: 3,
    onSelectedIndexChange: setSelectedIndex
  });

  return (
    <>
      <output data-testid="selected-index">{selectedIndex}</output>
      <output data-testid="open-index">{openIndex ?? "none"}</output>
      <div
        className={["snap-carousel", isPointerDragging ? "snap-carousel-dragging" : ""].join(" ")}
        ref={carouselRef}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onClickCapture={handleClickCapture}
        data-testid="carousel"
      >
        {[0, 1, 2].map((index) => (
          <button
            key={index}
            className="snap-slide"
            type="button"
            data-testid={`slide-${index}`}
            onClick={() => setOpenIndex(index)}
            onDoubleClick={() => snapToIndex(index)}
          >
            Slide {index}
          </button>
        ))}
      </div>
    </>
  );
}

describe("useSnapCarousel", () => {
  afterEach(() => {
    cleanup();
  });

  it("lets desktop pointer drags change the selected slide", async () => {
    render(<TestCarousel />);

    const carousel = screen.getByTestId("carousel") as HTMLDivElement;
    configureCarouselLayout(carousel);

    fireEvent.pointerDown(carousel, {
      button: 0,
      clientX: 220,
      pointerId: 1,
      pointerType: "mouse"
    });
    fireEvent.pointerMove(window, {
      clientX: 20,
      pointerId: 1,
      pointerType: "mouse"
    });
    carousel.scrollLeft = 200;
    fireEvent.pointerUp(window, {
      clientX: 20,
      pointerId: 1,
      pointerType: "mouse"
    });

    await waitFor(() => {
      expect(screen.getByTestId("selected-index")).toHaveTextContent("1");
      expect(carousel.scrollLeft).toBe(300);
    });
  });

  it("suppresses card clicks after a desktop drag gesture", () => {
    render(<TestCarousel />);

    const carousel = screen.getByTestId("carousel") as HTMLDivElement;
    configureCarouselLayout(carousel);

    fireEvent.pointerDown(carousel, {
      button: 0,
      clientX: 220,
      pointerId: 1,
      pointerType: "mouse"
    });
    fireEvent.pointerMove(window, {
      clientX: 20,
      pointerId: 1,
      pointerType: "mouse"
    });
    carousel.scrollLeft = 200;
    fireEvent.pointerUp(window, {
      clientX: 20,
      pointerId: 1,
      pointerType: "mouse"
    });
    fireEvent.click(screen.getByTestId("slide-1"));

    expect(screen.getByTestId("open-index")).toHaveTextContent("none");
  });

  it("preserves the intended selection while a programmatic scroll is settling", async () => {
    render(<TestCarousel />);

    const carousel = screen.getByTestId("carousel") as HTMLDivElement;
    configureCarouselLayout(carousel);

    fireEvent.doubleClick(screen.getByTestId("slide-2"));
    carousel.scrollLeft = 120;
    fireEvent.scroll(carousel);

    await waitFor(() => {
      expect(screen.getByTestId("selected-index")).toHaveTextContent("2");
    });
  });
});

function configureCarouselLayout(carousel: HTMLDivElement) {
  let scrollLeft = 0;

  Object.defineProperty(carousel, "clientWidth", {
    configurable: true,
    get: () => 300
  });
  Object.defineProperty(carousel, "scrollWidth", {
    configurable: true,
    get: () => 900
  });
  Object.defineProperty(carousel, "scrollLeft", {
    configurable: true,
    get: () => scrollLeft,
    set: (value: number) => {
      scrollLeft = value;
    }
  });
  Object.defineProperty(carousel, "scrollTo", {
    configurable: true,
    value: ({ left }: { left: number }) => {
      scrollLeft = left;
    }
  });

  Array.from(carousel.children).forEach((slide, index) => {
    Object.defineProperty(slide, "offsetLeft", {
      configurable: true,
      get: () => index * 300
    });
    Object.defineProperty(slide, "clientWidth", {
      configurable: true,
      get: () => 300
    });
  });
}
