# Gradient Architecture

This document explains what the game does at runtime and how the current codebase is organized after the professionalization pass.

## Runtime Flow

1. [`src/main.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/main.tsx) bootstraps React and renders [`src/App.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/App.tsx).
2. [`src/App.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/App.tsx) mounts the puzzle feature only.
3. [`src/features/puzzle/PuzzleFeature.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/features/puzzle/PuzzleFeature.tsx) composes:
   - the home screen tier carousel
   - the tier screen puzzle carousel
   - the shared browser-screen top row and settings menu state
   - the puzzle play screen with the hold-to-abort back control
4. [`src/features/puzzle/hooks/usePublishedPuzzleBrowser.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/features/puzzle/hooks/usePublishedPuzzleBrowser.ts) owns the browser state:
   - selected tier and selected puzzle per tier
   - completion-history-backed tier progress
   - tier and puzzle summaries for the screen components
5. [`src/features/puzzle/hooks/usePuzzleSession.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/features/puzzle/hooks/usePuzzleSession.ts) owns the single-puzzle session state:
   - preview -> scrambling -> playing -> solved transitions
   - drag interactions
   - local completion-history persistence and best-score derivation
   - local completion recording
6. UI components render the browser and session state and call back into the hook actions.

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

1. The home screen groups the published `v1` catalog into five difficulty tiers.
2. The home and tier screens share a static top row with an icon-only settings button in the upper right.
3. The home screen previews the first six puzzles in each tier and shows tier completion progress.
4. The tier screen previews puzzles in order and opens the selected puzzle into the play flow.
5. The puzzle screen builds tiles from the stored artifact and runs the normal preview -> scramble -> play flow.

Catalog authoring still happens from the pure domain:

1. [`src/game.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/game.ts) builds the full structural difficulty catalog.
2. The authoring pipeline selects 10 evenly spaced structural entries per published difficulty tier, skipping `Very easy` for `v1`.
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

## Move Selection

The pure domain still contains the swap-selection logic that identifies the best corrective move for a board:

- prefer swaps that place both tiles correctly
- otherwise place the primary tile correctly and minimize the remaining secondary distance

That logic stays in the pure domain layer, so UI animation only visualizes the chosen move.

## Completion Ceremony

When the board is solved:

- locked frames fade away
- a centered animated checkmark appears

This ceremony state is tracked in the puzzle session hook and exposed to the board as presentation state.

## Local Score History

The player feature now keeps a browser-local completion history for published puzzles:

- persistence lives in a feature-local storage helper, not in the pure domain layer
- each stored record includes puzzle identity, move count, aid count, start time, completion time, and solve duration
- solve timing starts when session state first reaches `playing`
- solve timing stops on the action that changes the board into `solved`, before the completion ceremony finishes
- score-eligible runs are the ones with no aid usage, and those are the runs that count toward `Best`

## Catalog UX

The current player-facing catalog behavior is:

- 50 published puzzles in `v1`
- 10 puzzles per published tier
- user-facing numbering is bin-local (`#1` to `#10`)
- the home screen uses tier-level progress counts, while the tier screen uses per-puzzle best scores

## Frontend Structure

The React-side feature is intentionally split by responsibility:

- `hooks/`: orchestration and side effects
- `ui/`: rendering and small presentation helpers
- `domain/`: the feature-facing exports of the pure engine

This keeps `App.tsx` small, makes feature-level tests easier to write, and gives AI agents clear boundaries for safe edits.
