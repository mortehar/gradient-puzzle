# Gradient

Gradient is a browser-based color reconstruction puzzle built with React, TypeScript, and Vite. The player studies a solved gradient briefly, watches it scramble, and then restores the board by dragging movable tiles back into a perceptually smooth color field while locked anchor cells stay fixed in place.

## What The Game Is

- The board is a rectangular grid of colored tiles.
- Some tiles are locked based on vertical, horizontal, and diagonal line rules.
- The player can drag movable tiles to swap positions.
- An `Aid` action applies the best available corrective swap.
- A puzzle is solved when every tile returns to its original index.

The central design idea is that the board generator does not just choose random colors. It searches for gradients that remain readable as a puzzle by scoring neighbor smoothness, midpoint clarity, axis balance, lightness ordering, and center muddiness in `Oklab`.

## Play Loop

1. Start a new puzzle from either the difficulty slider or custom layout controls.
2. Study the solved board during the preview phase.
3. Watch the scramble animation reveal the shuffled board.
4. Drag tiles to reconstruct the gradient.
5. Use `Aid` if needed.
6. Reach the solved state and review your swap count and aid count.

## Architecture Snapshot

- [`src/App.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/App.tsx): composition root only.
- [`src/features/puzzle/PuzzleFeature.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/features/puzzle/PuzzleFeature.tsx): feature entrypoint that composes board, footer, settings, and research UI.
- [`src/features/puzzle/hooks/usePuzzleSession.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/features/puzzle/hooks/usePuzzleSession.ts): puzzle session orchestration, transitions, drag state, aid flow, and derived view state.
- [`src/game.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/game.ts): pure puzzle-domain rules, generation, lock calculation, scrambling, difficulty catalog, and aid logic.
- [`src/colorAnalysis.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/colorAnalysis.ts): perceptual metrics and readability heuristics in `Oklab`.

More detail lives in [`docs/architecture.md`](/mnt/c/Users/Morten/Documents/Codex/Gradient/docs/architecture.md) and [`docs/color-research.md`](/mnt/c/Users/Morten/Documents/Codex/Gradient/docs/color-research.md).

## Local Development

This repo requires Node 20 through `nvm`.

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20 >/dev/null
node -v
```

Then use:

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Project Layout

```text
src/
  App.tsx
  game.ts
  colorAnalysis.ts
  features/puzzle/
    PuzzleFeature.tsx
    domain/
    hooks/
    ui/
docs/
  architecture.md
  color-research.md
```

The root domain modules stay framework-agnostic. The `features/puzzle` folder is the React-facing feature boundary that consumes those pure modules.

## Quality Bar

- Keep `src/game.ts` and `src/colorAnalysis.ts` pure and React-free.
- Keep `src/App.tsx` as composition-only.
- Add feature-level tests when extracting orchestration logic.
- Update docs when gameplay, architecture, or AI workflow changes.
