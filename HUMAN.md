# HUMAN Guide

This file is for the human operator of this repo: how to get the best results from Codex and other modern AI tooling without losing clarity or control.

## Default Working Style

- Treat Codex like a staff engineer pair, not like autocomplete.
- Ask for outcomes, acceptance criteria, and verification, not just code generation.
- Prefer one cohesive task per turn.
- Keep the assistant grounded in the actual repo before asking for architecture or refactor work.

## Best Bleeding-Edge AI Habits

- Start broad tasks with repo-grounding: ask Codex to inspect the current state first.
- Ask for a plan before implementation when the change touches architecture, workflow, or many files.
- For implementation, ask for end-to-end completion: code, tests, verification, and docs.
- Ask for the riskiest assumptions and failure modes explicitly.
- Ask for a review pass after implementation, even if Codex wrote the code.
- Keep the model honest: ask what was verified versus inferred.

## Using Codex Well On This Repo

- Keep the project on Node 20 via `nvm` before any `npm`, `vite`, `tsc`, or `vitest` command.
- Point Codex at the architecture boundary:
  - pure domain in `src/game.ts` and `src/colorAnalysis.ts`
  - feature orchestration in `src/features/puzzle/hooks`
  - rendering in `src/features/puzzle/ui`
- Encourage narrow write scopes. Good ask: “Own `src/features/puzzle/ui` only and don’t touch domain logic.”
- Ask for verification using `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

## Main Agent vs Sub-Agents

Use the main agent for:

- architecture work
- cross-cutting refactors
- changes that touch both domain and UI
- final integration and verification

Use sub-agents only for bounded sidecar work with disjoint ownership, for example:

- one worker owns docs updates
- one worker owns a new test file
- one worker owns a single UI component extraction

When delegating:

- assign one clear file or module area
- tell the worker not to revert other edits
- ask for changed file paths in the result
- review and integrate rather than blindly trusting

## Skills, Plugins, And GitHub

- Use Codex skills when the task matches an available workflow exactly.
- Use plugins or connected tools when they remove manual copy-paste or let Codex inspect first-party data directly.
- Use GitHub for durable review, not as the first place you think through the solution.

Recommended GitHub flow:

1. Ask Codex to inspect and plan.
2. Create a `codex/...` branch.
3. Implement in small reviewable commits.
4. Ask Codex for a review pass focused on regressions and missing tests.
5. Open a PR with a short problem/solution/verification summary.

## Prompt Patterns That Work

- “Inspect the repo and tell me the real architecture pressure points before changing anything.”
- “Implement this and keep the gameplay unchanged; refactor structure only.”
- “Give me findings first, then a brief summary.”
- “Use small modules, preserve tests, and verify with Node 20.”
- “If you need sub-agents, give them disjoint write scopes.”

## Anti-Patterns

- Asking for a giant rewrite without constraints.
- Mixing feature invention with architecture cleanup.
- Letting the agent choose broad scope silently.
- Skipping verification because the diff “looks right.”
- Delegating overlapping code areas to multiple agents.
