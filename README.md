# Gradient

Gradient is a browser-based color reconstruction puzzle built with React, TypeScript, and Vite. The player studies a solved gradient briefly, watches it scramble, and then restores the board by dragging movable tiles back into a perceptually smooth color field while locked anchor cells stay fixed in place.

## What The Game Is

- The board is a rectangular grid of colored tiles.
- Some tiles are locked based on vertical, horizontal, diagonal, and generator-selected island rules.
- Published puzzles use pre-generated lock layouts that stay symmetric across the board.
- The player can drag movable tiles to swap positions.
- An `Aid` action applies the best available corrective swap.
- A puzzle is solved when every tile returns to its original index.

The central design idea is that the board generator does not just choose random colors. Offline catalog generation searches for gradients that remain readable as a puzzle by scoring neighbor smoothness, midpoint clarity, axis balance, lightness ordering, and center muddiness in `Oklab`.
Those trajectory heuristics are now used to author the published puzzle catalog rather than exposed as live player controls.
The board now sits inside a fixed portrait frame so the footer controls and advanced panel stay visually stable while puzzle dimensions change.

## Play Loop

1. Move the footer puzzle slider to jump through the published `v1` catalog.
2. Read the current label as `Puzzle: #N (Tier)` to see where you are inside the current difficulty bin.
3. Use `Next` to advance through the catalog, crossing into the next difficulty tier when you reach the end of a bin.
4. Study the solved board during the preview phase.
5. Watch the scramble animation reveal the shuffled board.
6. Drag tiles to reconstruct the gradient.
7. Use `Aid` if needed.
8. Reach the solved state, watch the centered glowing checkmark animate in while the lock frames disappear, and use the warm emphasized `Next` button to continue.

## Local Score History

- Completed runs are stored locally in the browser with `localStorage`; nothing is synced to a server.
- Each completion records the published puzzle identity, move count, aid count, start time, completion time, and solve duration.
- Solve time starts only when the board becomes interactive after preview and scramble, and stops on the move or aid that solves the board.
- The footer shows `Best: X` for the current published puzzle only when there is at least one no-aid completion for that puzzle.
- `Best` is chosen by lowest move count, with solve time used only as a tiebreaker between equal-move runs.
- Using `Aid` still records the completion locally, but that attempt becomes score-ineligible and will not count toward `Best`.

## Architecture Snapshot

- [`src/App.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/App.tsx): composition root only.
- [`src/features/puzzle/PuzzleFeature.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/features/puzzle/PuzzleFeature.tsx): feature entrypoint that composes the board, published puzzle footer controls, and the on-demand appearance settings panel.
- [`src/features/puzzle/hooks/usePuzzleSession.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/features/puzzle/hooks/usePuzzleSession.ts): puzzle session orchestration, published-puzzle loading, transitions, drag state, aid flow, and derived view state.
- [`src/game.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/game.ts): pure puzzle-domain rules, structural catalog authoring, published catalog loading, scrambling, and aid logic.
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

## Published Catalog

- The current player-facing experience ships a fixed `v1` catalog of 60 puzzles.
- The catalog is grouped into six difficulty tiers with 10 published puzzles per tier.
- User-facing numbering is per tier, while the internal puzzle IDs stay globally unique and versioned.
- Run `npm run catalog:generate` under Node 20 to rebuild [`src/structuralCatalog.generated.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/structuralCatalog.generated.ts) and [`src/publishedCatalog.generated.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/publishedCatalog.generated.ts) after changing catalog-authoring rules.

## Quality Bar

- Keep `src/game.ts` and `src/colorAnalysis.ts` pure and React-free.
- Keep `src/App.tsx` as composition-only.
- Add feature-level tests when extracting orchestration logic.
- Update docs when gameplay, architecture, or AI workflow changes.
