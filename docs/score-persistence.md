# Score Persistence Options

This note captures the current server-side score storage options for Gradient so the topic can be resumed later without rebuilding the tradeoff analysis from scratch.

## Current Baseline

- The game currently stores completion history only in browser `localStorage`.
- Each completion includes puzzle identity, move count, aid count, start time, completion time, and solve duration.
- `Best` is derived locally per puzzle from no-aid runs only.
- GitHub Pages is static hosting, so any global score or stats system requires an external backend.

## What A Server-Side Score System Needs

At minimum, the client would submit a completion record to a backend after a run finishes. That backend would:

- store raw runs
- derive per-player bests
- expose leaderboard and stats endpoints
- optionally validate runs before accepting them

Because the game runs in the browser, no option can perfectly prove that a score came from a unique human or that a client did not fake a request unless stronger auth and server-side validation are added.

## Options That Work With GitHub Pages

### Firebase Auth + Firestore

This works well with a static frontend and keeps infrastructure overhead low.

Pros:

- works fine from GitHub Pages
- anonymous auth is built in
- low operational overhead
- realtime leaderboard updates are easy

Cons:

- query patterns for leaderboards and aggregates are less natural than SQL
- analytics and admin reporting can get awkward as the product grows
- cheat resistance still needs extra design

Good fit when:

- speed of implementation matters more than relational querying

### Supabase Auth + Postgres

This is a strong fit if we want SQL-backed leaderboards and statistics while keeping the current static frontend.

Pros:

- works well with GitHub Pages
- Postgres is a good fit for leaderboard and stats queries
- anonymous users are supported
- Row Level Security is strong
- easy path to optional accounts later

Cons:

- more schema and policy design up front than Firebase
- direct browser writes need careful policy design

Good fit when:

- we want a practical balance of low ops, SQL flexibility, and future growth

### Cloudflare Workers + D1

This keeps the frontend static while adding an edge API and SQL-style storage.

Pros:

- good fit for a browser game with global traffic
- low-latency API at the edge
- simple deployment model
- can later host the frontend on Cloudflare too

Cons:

- more backend code for us to own
- D1 is good for app data, but richer analytics may eventually fit Postgres better

Good fit when:

- we want a lightweight custom backend and may later move off GitHub Pages

### Serverless Functions On Another Platform + External Database

Examples: Netlify Functions, Vercel Functions, or similar paired with Postgres or another database.

Pros:

- straightforward path to a custom API
- flexible database choices
- good if we already prefer one of those platforms

Cons:

- still split hosting if the frontend stays on GitHub Pages
- not clearly simpler than Supabase or Cloudflare for this project shape

Good fit when:

- hosting preference is driven by existing platform familiarity

## Stronger Options If We Change Platform

### Cloudflare Pages + Workers + D1 or Postgres

Pros:

- static frontend and API can live together
- good global performance
- clean upgrade path from the current Vite app

Cons:

- still requires anti-cheat design if leaderboard trust matters

### Vercel + Functions + Neon or Supabase

Pros:

- strong developer experience
- good if the app later becomes more full-stack
- flexible storage options

Cons:

- more platform than we likely need if the app remains a simple static SPA

### Netlify + Functions + Postgres or Supabase

Pros:

- convenient all-in-one hosting and serverless deployment
- good previews and deployment workflow

Cons:

- not obviously a better fit than Cloudflare for this exact app

### Traditional Backend + Postgres

Examples: Render, Fly.io, Railway, or another hosted runtime.

Pros:

- most control
- best place to add admin tools, moderation, scheduled jobs, or stronger validation
- easiest to evolve into a richer service

Cons:

- highest maintenance and operational overhead

## Player Identity Options

### Local Anonymous Device ID

Generate a UUID in the browser and store it in `localStorage`.

Pros:

- no signup friction
- privacy-friendly
- enough for casual global leaderboards

Cons:

- lost when storage is cleared
- does not persist across browsers or devices
- easy to spoof

### Anonymous Backend Account

Use backend-issued anonymous auth, such as Firebase anonymous auth or Supabase anonymous sign-in.

Pros:

- better access control than a raw client-generated UUID
- easier to evolve into full accounts later
- backend can track a stable anonymous user within that browser context

Cons:

- still effectively browser- or device-bound unless linked to a real account
- clearing browser data can strand the identity

### Optional Real Account

Examples: email magic link, GitHub login, Google login, or passkeys.

Pros:

- real cross-device identity
- stable player history and profile
- good foundation for community features

Cons:

- adds user friction
- adds privacy and account-management expectations

### Required Real Account

Pros:

- cleanest identity model
- strongest basis for persistent rankings and community features

Cons:

- highest friction
- likely too heavy for a casual puzzle game unless competition is central

## Should Identity Persist Across Browsers And Devices?

Probably as an optional feature, not a requirement.

Reasons to avoid requiring it:

- lowest-friction onboarding
- keeps the game lightweight and casual
- avoids turning a puzzle game into an account product too early

Reasons to support it optionally:

- serious players get stable profiles
- history and leaderboards follow the player
- supports future social or competitive features

Recommended stance:

- default to anonymous play
- let players upgrade to a real account if they want durable identity across browsers and devices

## Score Integrity And Anti-Cheat

If global high scores matter, the backend should do more than trust a browser-submitted summary.

Possible levels of trust:

### Casual Trust

Accept summary data such as puzzle ID, move count, aid count, and solve duration.

Pros:

- easiest to build

Cons:

- easy to fake

### Basic Validation

Validate puzzle ID, catalog version, field ranges, and impossible values before storing.

Pros:

- blocks obvious bad data

Cons:

- still does not prove the run was actually played

### Stronger Validation

Submit a move log and have the server replay the solve against the published puzzle definition before accepting the score.

Pros:

- much stronger leaderboard integrity
- especially feasible here because puzzle identity is fixed by the published catalog

Cons:

- more backend logic
- larger payloads
- more implementation time

## Recommended Direction

If work resumes later, the most practical first implementation is:

1. Keep the frontend static for now.
2. Add a backend service instead of changing hosting immediately.
3. Prefer Supabase as the first serious option.
4. Use anonymous auth by default.
5. Add optional real accounts later for cross-device identity.
6. Store raw runs, derived best runs, and aggregate stats separately.
7. If leaderboard trust matters, submit move logs and validate them server-side.

## Rough Data Model

Tables or equivalent collections to consider:

- `players`
- `runs`
- `best_runs`
- `puzzle_stats`

Useful fields include:

- player ID
- puzzle ID
- catalog version
- move count
- aid count
- started at
- completed at
- solve duration
- whether the run was validated by the server

## Deferred Product Decisions

Questions still worth answering before implementation:

- Is the leaderboard per puzzle only, or also per tier and global?
- Do aided runs count in stats even if they do not count in rankings?
- Do we want usernames, or anonymous IDs only at first?
- Should cross-device identity be optional or required?
- How much cheating risk is acceptable for the first release?
