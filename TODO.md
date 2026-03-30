# TODO

## Next
- allow narrower puzzles, to 1 wide
- beautify puzzle colors and prefer tidier lock layouts
- Run through the handling of visual theme(s). Make sure it is centrally defined and possibly support multiple selectable themes.
- Run through a a visual pro, use sources like what we did for the color research. Define some tasteful thmes, psosibly using some reference material. (now lives in branch altolike-theme)
- Checkmark more like hand written both in anim and look
- Possibly add number of moves to checkmark, add checkmark in tier list (possibly best number on it there)
- Move from github to vercel. consider web app codex plugin.

## Later
- Better completion - show moves, say if new best
- Add server-side high scores and stats on no-aid runs. See [`docs/score-persistence.md`](/mnt/c/Users/Morten/Documents/Codex/Gradient/docs/score-persistence.md) for backend, identity, and anti-cheat tradeoffs. When pressing aid, the first time you need to hold it for 5 seconds. A clock spinner will count down and a text popup will warn you that aid will make your score 0.
- Start of with a super simple high score with local uuid and a nick name that need not be unique. an "among friends" feature during development.
