# Agent Notes

## Runtime Setup

- This repo must use Node 20 via `nvm`. The system `node` on PATH is Node 12 and is too old for the project toolchain.
- Before running `npm`, `npx`, `vitest`, `tsc`, or `vite`, load `nvm` first:

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20 >/dev/null
node -v
```

- Installed version confirmed in this environment: `v20.20.2`.

## Architecture Map

- [`src/App.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/App.tsx): composition root only.
- [`src/features/puzzle/PuzzleFeature.tsx`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/features/puzzle/PuzzleFeature.tsx): feature assembly.
- [`src/features/puzzle/hooks`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/features/puzzle/hooks): React orchestration and session state.
- [`src/features/puzzle/ui`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/features/puzzle/ui): rendering and presentation helpers.
- [`src/game.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/game.ts): pure puzzle engine and difficulty/layout logic.
- [`src/colorAnalysis.ts`](/mnt/c/Users/Morten/Documents/Codex/Gradient/src/colorAnalysis.ts): pure perceptual analysis.

## Editing Rules

- Keep `src/game.ts` and `src/colorAnalysis.ts` pure and framework-agnostic.
- Keep `src/App.tsx` tiny. Do not move orchestration back into it.
- Prefer adding feature behavior to `usePuzzleSession` and presentation changes to `ui/` components.
- Preserve current gameplay unless the task explicitly changes behavior.
- When changing gameplay, generator behavior, difficulty logic, or research heuristics, update docs as part of the same task.

## Workflow Expectations

- Start by inspecting the relevant files before proposing or making changes.
- For substantial work, explain the plan before editing.
- Prefer narrow diffs over broad rewrites.
- If extracting logic, add or update targeted tests for the extracted module.
- Before handoff, run the relevant checks with Node 20:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`

## AI Delegation Guidance

- Use sub-agents only for bounded, non-overlapping work.
- Give each worker explicit ownership of files or folders.
- Tell workers they are not alone in the codebase and must not revert others’ edits.
- Good delegation examples:
  - one worker updates docs only
  - one worker adds tests in one file
  - one worker refactors one UI component
- Bad delegation examples:
  - multiple workers editing the same hook
  - one worker refactoring domain while another edits the same types

## Documentation Contract

- Update [`README.md`](/mnt/c/Users/Morten/Documents/Codex/Gradient/README.md) for product-level behavior or setup changes.
- Update [`docs/architecture.md`](/mnt/c/Users/Morten/Documents/Codex/Gradient/docs/architecture.md) for structural changes.
- Keep [`docs/color-research.md`](/mnt/c/Users/Morten/Documents/Codex/Gradient/docs/color-research.md) aligned with generator/readability heuristics when those change.
- Keep [`HUMAN.md`](/mnt/c/Users/Morten/Documents/Codex/Gradient/HUMAN.md) and this file aligned with the intended Codex workflow.
