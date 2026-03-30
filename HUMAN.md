# HUMAN Guide

Use this repo with AI like a paired engineer, not autocomplete.

## Best Default Pattern

1. Ask for repo grounding first on broad tasks.
2. Ask for a plan before architecture, workflow, or multi-file refactors.
3. For implementation, ask for code, tests, verification, and docs in one pass.
4. Ask what was verified versus inferred.

## Repo-Specific Pointers

- Architecture map: `docs/architecture.md`
- Verification workflow: `docs/testing-and-verification.md`
- Color/generator research: `docs/color-research.md`

## Good Constraints To Give

- Preserve gameplay unless explicitly changing it.
- Keep `src/App.tsx` tiny.
- Keep `src/game/` pure and feature code under `src/features/puzzle/`.
- Prefer narrow write scopes and explicit verification.

## Good Review Prompts

- “Inspect the repo and tell me the real pressure points before changing anything.”
- “Implement this without changing gameplay; refactor structure only.”
- “Give me findings first, then a short summary.”
- “Run the relevant checks and tell me what you actually verified.”
