# Testing And Verification

This document is the source of truth for how we verify changes in this repo.

## Baseline Commands

Run under Node 20:

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
```

## Coverage

- Coverage runs through `@vitest/coverage-v8`.
- Command: `npm run test:coverage`
- Thresholds:
  - statements `>= 80%`
  - lines `>= 80%`
  - functions `>= 80%`
  - branches `>= 70%`
- Generated catalog artifacts are excluded from lint and coverage so the reports stay useful.

## Unit And Integration Tests

- Test files live under `src/`.
- Keep composition-only coverage at the app root.
- Put feature behavior tests near the feature, especially for browser state, puzzle session flow, and storage adapters.
- Prefer direct tests for extracted helpers instead of relying only on large integration tests.

## Browser Feedback

Playwright lives under `tests/feedback/`.

- `npm run feedback:capture`
  - runs deterministic capture states
  - writes screenshots and `artifacts/feedback/latest/manifest.json`
- `npm run feedback:ci`
  - runs the smoke flow plus captures against a QA-enabled preview build

The smoke suite should cover real interaction risk:

- browser settings flow
- pointer drag/swap on the puzzle board
- pointer-based long-press controls
- abort/navigation behavior

## CI

- `npm run test:coverage` is the CI test gate.
- Browser feedback runs in a separate CI job.
- Playwright artifacts are uploaded from `artifacts/feedback/latest`.

## When To Update This Doc

Update this document when changing:

- test commands
- coverage policy
- CI verification steps
- Playwright scope or artifact layout
