# Agent Notes

## Setup

- Use Node 20 via `nvm` before any `npm`, `vite`, `vitest`, or `tsc` command.

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20 >/dev/null
```

## Read First

- `README.md`
- `docs/architecture.md`
- `docs/testing-and-verification.md`

## Guardrails

- Keep `src/App.tsx` composition-only.
- Keep `src/game/` pure and React-free.
- Keep feature orchestration in `src/features/puzzle/hooks/`.
- Keep rendering logic in `src/features/puzzle/ui/`.
- Keep QA bootstrap logic inside `src/features/puzzle/qa/`.
- Prefer narrow, behavior-preserving refactors over broad rewrites.

## Verification

- Run the smallest relevant checks while working.
- Before handoff for substantial work, aim to run:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
- For UI or interaction work, also run the browser feedback loop described in `docs/testing-and-verification.md`.

## Docs

- Update `README.md` for entrypoint/setup changes.
- Update `docs/architecture.md` for structural changes.
- Update `docs/testing-and-verification.md` for test, CI, or Playwright workflow changes.
- Update `docs/color-research.md` when generator or readability heuristics change.
