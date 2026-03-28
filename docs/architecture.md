# Gradient Architecture

This document explains what the game does at runtime and how the current codebase is organized after the professionalization pass.

## Runtime Flow

1. [`src/main.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/main.tsx) bootstraps React and renders [`src/App.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/App.tsx).
2. [`src/App.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/App.tsx) mounts the puzzle feature only.
3. [`src/features/puzzle/PuzzleFeature.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/features/puzzle/PuzzleFeature.tsx) composes:
   - board rendering
   - footer/status actions
   - settings sidebar
   - perceptual research panel
4. [`src/features/puzzle/hooks/usePuzzleSession.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/features/puzzle/hooks/usePuzzleSession.ts) owns the puzzle session state:
   - preview -> scrambling -> playing -> solved transitions
   - setup mode and difficulty state
   - drag interactions
   - aid application
   - derived research and presentation values
5. UI components render the session state and call back into the hook actions.

## Domain Model

The core game logic intentionally remains outside React.

### Puzzle domain

[`src/game.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/game.ts) is the main source of truth for:

- puzzle configuration
- lock placement rules
- difficulty catalog selection
- board generation
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

1. Difficulty mode chooses a structural layout from the catalog in `src/game.ts`.
2. The generator creates a solved board using a trajectory-based color model.
3. Candidate boards are scored against perceptual heuristics from `src/colorAnalysis.ts`.
4. The selected solved board is converted into tiles with locked and movable positions.
5. Movable tiles are deranged into a scramble that avoids solved positions.

The important design choice is that readability is evaluated from the final solved board, not from abstract corner inputs alone.

## Lock Rules

Locks are defined by unions of:

- corner anchors
- vertical lines
- horizontal lines
- diagonal cross lines

The config is normalized so only valid counts and spacings are used for a given board size.

## Aid Strategy

The `Aid` action chooses a swap that improves the board as efficiently as possible:

- prefer swaps that place both tiles correctly
- otherwise place the primary tile correctly and minimize the remaining secondary distance

That logic stays in the pure domain layer, so UI animation only visualizes the chosen move.

## Research Panel

The sidebar research panel samples multiple generated boards for the current preview config and summarizes:

- score distribution
- label counts
- sweet-spot ranges for key readability metrics

This is not scientific validation. It is a practical design feedback loop that helps tune the generator toward better-looking, better-readable puzzles. Background theory and references live in [`docs/color-research.md`](/mnt/c/Users/Morten/Documents/Codex/Gradient/docs/color-research.md).

## Frontend Structure

The React-side feature is intentionally split by responsibility:

- `hooks/`: orchestration and side effects
- `ui/`: rendering and small presentation helpers
- `domain/`: the feature-facing exports of the pure engine

This keeps `App.tsx` small, makes feature-level tests easier to write, and gives AI agents clear boundaries for safe edits.
