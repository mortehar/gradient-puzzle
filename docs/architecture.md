# Gradient Architecture

This document explains what the game does at runtime and how the current codebase is organized after the professionalization pass.

## Runtime Flow

1. [`src/main.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/main.tsx) bootstraps React and renders [`src/App.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/App.tsx).
2. [`src/App.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/App.tsx) mounts the puzzle feature only.
3. [`src/features/puzzle/PuzzleFeature.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/features/puzzle/PuzzleFeature.tsx) composes:
   - board rendering
   - footer/status actions plus the primary published-puzzle slider
   - an advanced settings panel that appears on demand for appearance controls and catalog metadata
4. [`src/features/puzzle/hooks/usePuzzleSession.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/features/puzzle/hooks/usePuzzleSession.ts) owns the puzzle session state:
   - preview -> scrambling -> playing -> solved transitions
   - published puzzle selection state
   - drag interactions
   - aid application
   - derived selection and presentation values
5. UI components render the session state and call back into the hook actions.

Two current UX constraints are intentional:

- published boards stay portrait-oriented (`width <= height`)
- the rendered board sits inside a fixed portrait frame so surrounding controls do not reflow wildly as difficulty changes

## Domain Model

The core game logic intentionally remains outside React.

### Puzzle domain

[`src/game.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/game.ts) is the main source of truth for:

- structural catalog authoring
- published puzzle loading
- lock placement rules
- offline board generation
- scrambling
- tile swapping
- solved-state checks
- aid move selection

Important types:

- `GameConfig`
- `GameState`
- `Tile`
- `AidMove`
- `DifficultyCatalogEntry`

### Perceptual analysis

[`src/colorAnalysis.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/colorAnalysis.ts) evaluates the solved board using `Oklab` and computes metrics such as:

- neighbor distance distributions
- lightness monotonicity and reversal rates
- edge smoothness
- center chroma drop
- midpoint clarity
- axis balance
- readability score and label

The feature-level domain entrypoint at [`src/features/puzzle/domain/index.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/features/puzzle/domain/index.ts) re-exports these pure modules so the React feature depends on one internal boundary instead of importing unrelated root files directly.

## Board Generation Pipeline

Player runtime now loads from a published catalog rather than generating a fresh puzzle on demand:

1. The footer slider resolves to one published puzzle in the `v1` catalog.
2. The catalog record provides the solved colors, fixed locked cells, and fixed scramble for that puzzle.
3. The session builds tiles from the stored artifact and runs the normal preview -> scramble -> play flow.

Catalog authoring still happens from the pure domain:

1. [`src/game.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/game.ts) builds the full structural difficulty catalog.
2. The authoring pipeline selects 10 evenly spaced structural entries per difficulty tier.
3. A seeded trajectory search generates one canonical solved board per selected entry.
4. A seeded derangement produces one canonical scramble per selected entry.
5. [`scripts/generatePublishedCatalog.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/scripts/generatePublishedCatalog.ts) writes the structural artifact to [`src/structuralCatalog.generated.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/structuralCatalog.generated.ts) and the player-facing artifact to [`src/publishedCatalog.generated.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/publishedCatalog.generated.ts).

The important design choice is that published puzzle identity is now fixed by the catalog artifact, not by rerunning the generator at play time.

## Lock Rules

Published lock layouts still originate from unions of:

- corner anchors
- vertical lines
- horizontal lines
- diagonal cross lines
- generator-only rectangular islands

Island layouts are part of the internal difficulty catalog only, not the player-facing UI. A single island is centered, while multiple islands are distributed across a balanced portrait-safe lattice of centers.
All generated lock layouts are kept mirror-symmetric across both board axes.
The config is normalized so only valid counts, footprints, and spacings are used for a given board size.

## Aid Strategy

The `Aid` action chooses a swap that improves the board as efficiently as possible:

- prefer swaps that place both tiles correctly
- otherwise place the primary tile correctly and minimize the remaining secondary distance

That logic stays in the pure domain layer, so UI animation only visualizes the chosen move.

## Completion Ceremony

When the board is solved:

- locked frames fade away
- a centered animated checkmark appears
- the `Next` button stays visually highlighted until the next puzzle loads

This ceremony state is tracked in the puzzle session hook and exposed to the board and footer as presentation state.

## Catalog UX

The current player-facing catalog behavior is:

- 60 published puzzles in `v1`
- 10 puzzles per tier
- user-facing numbering is bin-local (`#1` to `#10`)
- `Next` advances through the catalog and disables on `Master #10`

This is an interim browsing model until a later home screen can present the published puzzle set more directly.

## Frontend Structure

The React-side feature is intentionally split by responsibility:

- `hooks/`: orchestration and side effects
- `ui/`: rendering and small presentation helpers
- `domain/`: the feature-facing exports of the pure engine

This keeps `App.tsx` small, makes feature-level tests easier to write, and gives AI agents clear boundaries for safe edits.
