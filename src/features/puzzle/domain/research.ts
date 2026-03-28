import {
  analyzeBoardTiles,
  createNewGame,
  normalizeConfig,
  summarizeResearchSamples,
  type BoardResearchSweep,
  type DifficultyCatalogEntry,
  type GameConfig
} from "./index";

export function mergeStructuralConfig(baseConfig: GameConfig, entry: DifficultyCatalogEntry): GameConfig {
  return normalizeConfig({
    ...baseConfig,
    width: entry.config.width,
    height: entry.config.height,
    verticalLines: entry.config.verticalLines,
    horizontalLines: entry.config.horizontalLines,
    crossLines: entry.config.crossLines,
    islands: entry.config.islands
  });
}

export function buildResearchSweep(config: GameConfig, sampleCount: number): BoardResearchSweep {
  const samples = Array.from({ length: sampleCount }, () => {
    const game = createNewGame(config);

    return {
      metrics: analyzeBoardTiles(game.tiles, game.config.width, game.config.height)
    };
  });

  return {
    samples,
    summary: summarizeResearchSamples(samples)
  };
}
