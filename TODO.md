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
- Add islands as a lock pattern, with number, xy-size, and possibly density?
- Explore richer difficulty progression:
 - Ensure stored seeding so that puzzles will remain the same until seed is changed
 - Possibly store each puzzle as its own seed ID
 - Bin puzzles into the difficulty categories
 - Have a home screen where you select difficulty and then swipe to select each puzzle
- Add server-side high scores and stats on no-aid runs. See [`docs/score_persitance.md`](/mnt/c/Users/Morten/Documents/Codex/Gradient/docs/score_persitance.md) for backend, identity, and anti-cheat tradeoffs. When pressing aid, the first time you need to hold it for 5 seconds. A clock spinner will count down and a text popup will warn you that aid will make your score 0.
- Daily challenge style modes without introducing backend complexity.
