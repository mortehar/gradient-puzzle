import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

type MockCanvasContext = Pick<
  CanvasRenderingContext2D,
  | "setTransform"
  | "clearRect"
  | "beginPath"
  | "arc"
  | "fill"
  | "save"
  | "restore"
  | "scale"
  | "translate"
> & {
  fillStyle: string | CanvasGradient | CanvasPattern;
  shadowColor: string;
  shadowBlur: number;
  globalAlpha: number;
};

const mockContext2D: MockCanvasContext = {
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  fillStyle: "#000000",
  shadowColor: "#000000",
  shadowBlur: 0,
  globalAlpha: 1
};

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: vi.fn((contextId: string) => (contextId === "2d" ? mockContext2D : null))
});
