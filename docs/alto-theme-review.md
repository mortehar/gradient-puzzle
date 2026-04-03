# Alto-Inspired Theme Review

This document is the source of truth for reviewing and refining the `codex/altolike-theme` direction.

The target is Alto-inspired atmosphere, not imitation. Gradient should borrow the calm, scene-first feeling from Alto's Adventure and Alto's Odyssey without copying their logo treatment, scenery silhouettes, menu layouts, or exact compositions.

## Canonical Alto Checklist

Score each captured screen from `1` to `5` on the dimensions below:

- `Scene-first composition`
  - The screen feels like an atmosphere with UI placed inside it, not a panel dropped on top of a background.
- `Restraint of UI chrome`
  - Buttons, borders, cards, and settings surfaces stay quiet and defer to the scene and board.
- `Typography hierarchy`
  - Kicker, title, copy, and metadata are clearly authored and never collapse into one another.
- `Material language consistency`
  - Shell, cards, controls, settings, and locked-cell treatments feel like one system.
- `Motion quality`
  - Transitions glide softly, while gameplay interactions stay crisp and readable.
- `Board legibility`
  - The puzzle board remains the visual hero in play and always reads clearly.
- `Mobile durability`
  - Composition, hierarchy, and selected state survive small screens without overlaps or drift.

## Reference Traits To Borrow

- Full-bleed atmosphere with layered horizon bands.
- Sparse interface chrome and generous negative space.
- Strong silhouette separation between content layers.
- Matte, quiet surfaces instead of glossy glass panels.
- Soft gliding motion and restrained highlight treatment.

## Traits To Avoid Copying

- Alto logos, title lockups, and wordmarks.
- Exact scenery silhouettes or foreground cutouts.
- Exact menu compositions or screen layouts.
- Alto-specific iconography or decorative motifs.

## Current Audit

### Home

- Current read: `panel-led`
- Strengths:
  - palette is calmer than `main`
  - the central preview card has more breathing room
  - shared title, copy, and chips now read as a designed system
- Problems:
  - shell still reads as a framed surface, not a true scene-first composition
  - tier cards are quieter than before, but they still feel more like cards than environmental selections

### Home Settings

- Current read: `docked utility surface`
- Strengths:
  - locked-cell options are useful and visually richer than before
  - the settings surface is now docked into flow and no longer obscures the home composition
- Problems:
  - settings still reads more like a tray than a scene-native game surface
  - the open state is calm and readable, but it remains visually denser than the rest of the browser screens

### Tier

- Current read: `board-led inside a framed shell`
- Strengths:
  - selected state is much clearer
  - the selected board preview is now the focal point
  - mobile selection state is stable enough for deterministic capture
- Problems:
  - the surrounding shell still feels like a panel more than an atmosphere
  - neighboring boards could recede a little more without harming context

### Puzzle Playing

- Current read: `board-led`
- Strengths:
  - this is the closest screen to the target
  - board contrast and restraint are stronger than the browser screens
  - footer controls are quieter and more coherent with the shell
- Problems:
  - hold overlay still reads slightly more modal than environmental
  - solve ceremony is calmer now, but still brighter than the rest of the visual system

## Prioritized Findings

### Priority 1

- Keep theme tokens as the source of truth and avoid new hardcoded drift.
- Push browser screens further from framed cards toward scene-first composition.
- Keep shared intro and chip semantics fully styled and resist regressions.

### Priority 2

- Polish motion, drag feedback, hold overlay tone, and solve ceremony after composition and hierarchy are stable.

## Source-Of-Truth Mapping

- `src/theme.css`
  - atmospheric tokens, palette, typography stacks, shell surface ramps, motion curves
- `src/styles/layout.css`
  - shell grammar, shared intro styling, chip styling, panel treatment
- `src/styles/browser.css`
  - home, tier, settings, carousels, cards, browser metadata, docked settings surface
- `src/styles/controls.css`
  - play footer, hold overlays, quiet control surfaces
- `src/styles/board.css`
  - board emphasis, drop target, drag preview, solve ceremony tone

## Refinement Brief

### Foundation Pass

- Ensure `src/theme.css` is the single source of truth for the atmosphere.
- Keep `src/styles/tokens.css` utility-only and remove visual defaults that conflict with the theme.
- Style shared intro semantics once in `src/styles/layout.css`.

### Browser Pass

- Make home and tier feel scene-led, not card-led.
- Keep settings docked in the screen flow and refine it from tray-like to scene-native.
- Make the active selection feel composed and intentional on desktop and mobile.

### Play Pass

- Keep the board as the hero.
- Quiet the footer controls and hold overlay.
- Reduce the solved ceremony glow so it feels celebratory but still calm.

## Review Protocol

Review every pass with the existing feedback harness:

- Static captures:
  - `home`
  - `home-settings`
  - `tier`
  - `puzzle-playing`
  - `puzzle-solved`
- Run both desktop and mobile.
- Follow with a live interaction pass:
  - settings open and close
  - carousel snap behavior
  - drag preview
  - hold-to-aid and hold-to-exit
  - solve ceremony

Do not update visual expectations or baselines until the pass meets all of these:

- no overlay obscures primary content
- tier selection remains visually and state-wise stable on mobile
- the board is the strongest focal point during play
- home and tier feel scene-led instead of generic web panels
- global visual decisions come from centralized tokens or shared semantic classes
