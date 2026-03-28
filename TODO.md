# TODO

## Now

- Keep the new feature boundary clean: domain logic in `src/game.ts` and `src/colorAnalysis.ts`, orchestration in `src/features/puzzle/hooks`, rendering in `src/features/puzzle/ui`.
- Finish adopting the lint/typecheck/CI guardrails across local and GitHub workflows.
- Maintain docs discipline: update `README.md`, `docs/architecture.md`, `AGENTS.md`, and `HUMAN.md` when behavior or structure changes.
- Add a few more targeted tests around extracted feature hooks and presentation helpers.

## Next

- Improve accessibility with richer keyboard interaction and stronger ARIA/state announcements.
- Add deterministic seed/debug support so specific generated boards can be reproduced during testing and tuning.
- Expand lint rules carefully once the baseline is stable.
- Consider a small design token pass so visual controls and board effects are easier to tune intentionally.

## Later

- Consider `tsParticles` if the current custom completion burst becomes limiting.
- Add optional persistence for settings and preferred setup mode.
- Explore richer difficulty progression or daily challenge style modes without introducing backend complexity.
- Add server side high scores
