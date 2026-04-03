# Gradient

Gradient is a browser-based color reconstruction puzzle built with React, TypeScript, and Vite. Players study a solved gradient, watch it scramble, then restore it by swapping movable tiles while fixed anchors stay locked in place.

## Product Snapshot

- The shipped game uses a fixed published `v1` catalog of 50 puzzles.
- Progress and best scores are stored locally in `localStorage`.
- The player-facing app is a single puzzle feature with three screens: home, tier, and puzzle.
- Catalog authoring and board generation stay in the pure domain package under `src/game/`.

## Quick Start

This repo expects Node 20 via `nvm`.

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20 >/dev/null
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
npm run feedback:capture
```

Verification details live in `docs/testing-and-verification.md`.

## Repo Map

- `src/App.tsx`: composition root only.
- `src/features/puzzle/`: shipped React feature.
- `src/game.ts`: stable barrel for the pure puzzle domain.
- `src/game/`: pure-domain modules.
  - `config-and-locks.ts`
  - `generation.ts`
  - `difficulty.ts`
  - `catalog-authoring.ts`
  - `catalog-runtime.ts`
  - `generated/`
- `src/styles/`: global stylesheet partials.
- `docs/architecture.md`: authoritative structure map.
- `docs/alto-theme-review.md`: Alto-inspired review rubric, audit, and refinement brief.
- `docs/testing-and-verification.md`: quality gates, coverage, and browser feedback workflow.
- `docs/color-research.md`: offline generator and readability notes.

## QA Launch States

QA bootstrap is available in dev, tests, and QA-enabled preview builds:

- `qaScreen=home|tier|puzzle`
- `qaTier=easy|medium|hard|expert|master`
- `qaPuzzle=1..10`
- `qaPhase=preview|playing|solved`
- `qaSettings=open|closed`
- `qaLockStyle=frame|mounted|frosted|texture|icon`
- `qaMotion=live|reduced|static`

Example:

```text
/?qaScreen=puzzle&qaTier=hard&qaPuzzle=2&qaPhase=playing&qaLockStyle=frosted&qaMotion=static
```

## Published Catalog

- Runtime catalog data lives in `src/game/generated/publishedCatalog.generated.ts`.
- Generated structural catalog data lives in `src/game/generated/structuralCatalog.generated.ts`.
- Rebuild both with `npm run catalog:generate` after changing authoring rules.

## Docs

- Read `docs/architecture.md` before structural refactors.
- Read `docs/testing-and-verification.md` before changing tests, CI, or Playwright flows.
- Update docs in the same change when gameplay, architecture, or verification behavior changes.
