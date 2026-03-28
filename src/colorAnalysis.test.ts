import { describe, expect, it } from "vitest";
import { analyzeBoardTiles, cssRgbToOklab, summarizeResearchSamples, type BoardResearchSample } from "./colorAnalysis";
import { DEFAULT_CONFIG, buildTilesFromColors, createNewGame } from "./game";

function buildVerticalRampColors(width: number, height: number): string[] {
  return Array.from({ length: width * height }, (_, index) => {
    const row = Math.floor(index / width);
    const progress = height === 1 ? 0 : row / (height - 1);
    const red = Math.round(255 - progress * 35);
    const green = Math.round(238 - progress * 96);
    const blue = Math.round(118 + progress * 62);

    return `rgb(${red}, ${green}, ${blue})`;
  });
}

describe("color analysis", () => {
  it("converts CSS rgb strings into Oklab coordinates", () => {
    const white = cssRgbToOklab("rgb(255, 255, 255)");
    const black = cssRgbToOklab("rgb(0, 0, 0)");

    expect(white.l).toBeCloseTo(1, 5);
    expect(white.a).toBeCloseTo(0, 4);
    expect(white.b).toBeCloseTo(0, 4);
    expect(black.l).toBeCloseTo(0, 5);
  });

  it("treats a single-axis ramp as smooth and ordered", () => {
    const tiles = buildTilesFromColors(buildVerticalRampColors(DEFAULT_CONFIG.width, DEFAULT_CONFIG.height), DEFAULT_CONFIG);
    const metrics = analyzeBoardTiles(tiles, DEFAULT_CONFIG.width, DEFAULT_CONFIG.height);

    expect(metrics.horizontalNeighborDistances.max).toBeCloseTo(0, 6);
    expect(metrics.verticalNeighborDistances.mean).toBeGreaterThan(0);
    expect(metrics.rowLightnessMonotonicity.reversalCount).toBe(0);
    expect(metrics.columnLightnessMonotonicity.reversalCount).toBe(0);
    expect(metrics.edgeRampSmoothness.mean).toBeLessThan(0.025);
    expect(metrics.edgeMidpointClarity).toBe(0);
    expect(metrics.axisStrengthBalance).toBeLessThan(0.1);
    expect(metrics.readability.label).not.toBe("harsh");
  });

  it("summarizes generated samples into score and sweet-spot ranges", () => {
    const samples: BoardResearchSample[] = Array.from({ length: 6 }, () => {
      const game = createNewGame(DEFAULT_CONFIG);

      return {
        metrics: analyzeBoardTiles(game.tiles, game.config.width, game.config.height)
      };
    });
    const summary = summarizeResearchSamples(samples);
    const labelTotal = Object.values(summary.labelCounts).reduce((total, count) => total + count, 0);

    expect(samples).toHaveLength(6);
    expect(summary.sampleCount).toBe(6);
    expect(summary.score.count).toBe(6);
    expect(labelTotal).toBe(6);
    expect(summary.sweetSpot.medianNeighborDistance.min).toBeLessThanOrEqual(
      summary.sweetSpot.medianNeighborDistance.max
    );
    expect(summary.sweetSpot.centerChromaDrop.min).toBeLessThanOrEqual(
      summary.sweetSpot.centerChromaDrop.max
    );
    expect(summary.sweetSpot.edgeMidpointClarity.min).toBeLessThanOrEqual(
      summary.sweetSpot.edgeMidpointClarity.max
    );
  });
});
