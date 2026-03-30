# Gradient Architecture

This document is the source of truth for how the current repo is structured.

## Runtime Flow

1. `src/main.tsx` mounts `src/App.tsx`.
2. `src/App.tsx` renders `src/features/puzzle/PuzzleFeature.tsx` only.
3. `PuzzleFeature` owns top-level screen switching and QA bootstrap wiring.
4. `usePublishedPuzzleBrowser` owns browser-level state:
   selected tier, selected puzzle per tier, preferences, and completion-backed progress.
5. `usePuzzleSession` owns one active puzzle session:
   preview, scramble, play, aid, drag state, completion recording, and ceremony state.
6. UI components under `src/features/puzzle/ui/` stay presentation-focused and receive state/actions from the hooks.

## Main Boundaries

### App Root

- `src/App.tsx` is composition-only.
- Root tests should stay tiny and avoid owning feature behavior.

### Feature Layer

- `src/features/puzzle/hooks/`: React orchestration and storage adapters.
- `src/features/puzzle/ui/`: rendering and presentation helpers.
- `src/features/puzzle/qa/`: automation-only bootstrap parsing.
- `src/features/puzzle/domain/`: narrow feature-facing barrel over runtime domain APIs.

### Pure Domain Package

`src/game.ts` is a thin stable barrel over `src/game/`.

- `config-and-locks.ts`: config normalization, valid lock options, locked-index calculation.
- `generation.ts`: board generation, scrambling, swapping, aid selection, solved checks.
- `difficulty.ts`: structural difficulty metrics, scoring, tier mapping.
- `catalog-authoring.ts`: structural catalog creation and published catalog authoring.
- `catalog-runtime.ts`: published catalog reads and puzzle-to-game hydration.
- `generated/`: checked-in generated catalog artifacts used by runtime and generated-catalog accessors.
- `generated-catalog.ts`: explicit accessors for the checked-in generated structural catalog.

The pure domain must remain React-free and framework-free.

## Generated Artifacts

- `scripts/generatePublishedCatalog.ts` rebuilds:
  - `src/game/generated/structuralCatalog.generated.ts`
  - `src/game/generated/publishedCatalog.generated.ts`
- Runtime reads the published catalog artifact directly.
- Authoring code can still rebuild catalogs from first principles when the generation rules change.

## Styling

- `src/styles.css` is the entrypoint only.
- Global styles are split into:
  - `src/styles/tokens.css`
  - `src/styles/layout.css`
  - `src/styles/browser.css`
  - `src/styles/board.css`
  - `src/styles/controls.css`

Keep class names stable unless behavior or markup changes require otherwise.

## Verification Sources Of Truth

- Unit, integration, coverage, CI, and Playwright workflow rules live in `docs/testing-and-verification.md`.
- Color and generator heuristics live in `docs/color-research.md`.
