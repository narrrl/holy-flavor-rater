# Dashboard Redesign — Audit & Plan

Scope: the authenticated user dashboard (`frontend/src/pages/Dashboard.tsx`, backend
`GET /api/users/dashboard/` in `backend-rs/src/routes/users.rs:1311`). Goal: cleaner,
more intuitive, more robust UX, plus algorithmic recommendations ("tasters like you
also liked X").

Data scale (current, `backend/db.sqlite3`): **13 users · 219 flavors · 331 ratings ·
~25 ratings/user**. Sparse and small — everything fits in memory; recommendations can
be computed in-process per request. No Redis/precompute needed yet.

---

## Part 1 — Audit of the current dashboard

### Architecture / code quality
- **A1. 1039-line monolith.** `Dashboard.tsx` is one component holding the profile
  header, stats, two tabs, two filter toolbars, two card lists, and inline
  rating-edit + reply editors. Nothing is extracted, nothing is unit-testable in
  isolation.
- **A2. Duplicated rating-edit/reply logic.** The edit-score, edit-comment, reply
  submit, delete-reply handlers (`Dashboard.tsx:148-185`) re-implement what
  `FlavorDetail.tsx` already does. Same bug surface in two places (the Q1 notif-menu
  dedup pattern applies here too).
- **A3. ColorThief on every load.** `Dashboard.tsx:109-146` fetches the avatar as a
  CORS `Image`, runs `colorthief.getPalette(...,10)` on the main thread, and derives
  HSL just to tint a decorative header gradient. Extra dependency, main-thread work,
  CORS dependency — all for cosmetics. Already skipped on mobile (`isXs`).

### Backend / performance
- **A4. Loads every unrated flavor, every hit.** The dashboard handler builds
  `missing_flavors` from *all* flavors the user hasn't rated (~200 rows), with
  per-flavor aggregate rollups, on every dashboard request
  (`users.rs:1340-1378`). No pagination. (P1 already trimmed the *per-rating* payload
  here via `include_ratings=false`, but the row count itself is unbounded.)
- **A5. All filter/sort is client-side** over the full arrays (`Dashboard.tsx:187-237`).
  Fine at 200 items; breaks down as the catalog grows and blocks server-side
  pagination.

### UX / product
- **A6. Thin stats.** Only two numbers surfaced: `rated_count`, `missing_count`
  (`Dashboard.tsx:405-408`). No average score the user gives, no rating distribution,
  no favorite category, no recent-activity sense.
- **A7. "Explore" is an undifferentiated dump.** Tab 2 is the full unrated list sorted
  by community or circle average. No curation, no "for you", overwhelming, no
  pagination, no recommendations.
- **A8. Flat two-tab IA** (My Reviews / Explore New). No personalized landing; the
  user's *taste* is never reflected back to them.
- **A9. Rough edges.** `"Please login to view dashboard."` is a hardcoded,
  untranslated string (`Dashboard.tsx:255`); several toast messages are hardcoded
  English (`'Failed to update review'`, etc.) instead of i18n keys.
- **A10. No recommendations exist** anywhere in the product today.

---

## Part 2 — Recommendation engine (the headline feature)

"Users with the same taste also like X" = **user-based collaborative filtering (CF)**,
with a popularity/quality fallback for cold-start users.

### Algorithm (user-based CF)
1. Load the full rating matrix (331 cells — trivial) into memory: `user → {flavor: score}`.
2. For the target user `u`, compute similarity to every other user `v` over their
   **co-rated** flavors using **Pearson correlation** (mean-centred, so it cancels out
   the fact that some users rate high and some low).
3. **Min-overlap guard:** ignore any `v` sharing fewer than ~3 co-rated flavors —
   correlation over 1–2 points is noise. Apply **significance weighting**
   `sim *= min(overlap, K)/K` (K≈5) to down-weight thin overlaps.
4. For each candidate flavor `f` the target hasn't rated, predict:
   `pred(u,f) = mean_u + Σ_v sim(u,v)·(r_vf − mean_v) / Σ |sim(u,v)|`
   over neighbours `v` who rated `f`. Require ≥2 contributing neighbours for confidence.
5. Rank candidates by `pred`, return top-N with metadata: `predicted_score`,
   `contributing_neighbours` (the "based on N tasters like you" count), and the
   neighbour usernames (optional, for "because Alice & Bob loved it").

### Cold-start fallback (user with < ~5 ratings, or no confident neighbours)
Rank unrated flavors by a **Bayesian average** to stop a single 10/10 from topping the
chart: `score = (C·m + Σr) / (C + n)` where `m` = global mean score, `n` = that
flavor's rating count, `C` ≈ 5 (confidence prior). Optionally bias toward categories the
user has already engaged with.

### Why in-process, on-demand
At 13 users / 331 ratings the whole computation is sub-millisecond. Compute it inside
the recommendations endpoint; add a short per-user cache only if profiling says so.
If the dataset grows orders of magnitude, promote it to a **background job**
(`src/jobs/` already exists) that precomputes per-user recommendations into a table on a
schedule — the engine code stays the same, only the trigger changes.

### Optional companion: item-based CF
Flavor↔flavor cosine over rating vectors powers "people who liked *this* flavor also
liked…" — useful on `FlavorDetail` too, not just the dashboard. Separate, later phase.

---

## Part 3 — Phased implementation plan

Each phase is independently shippable and verified (`tsc` + ESLint + vitest on the
frontend; `cargo fmt`/`clippy`/`test` on the backend).

### Phase 0 — Decompose (no behaviour change) — ✅ DONE
Split the 1039-line `Dashboard.tsx` (now ~115 lines, thin orchestrator) into
`src/pages/dashboard/`:
- `DashboardHeader.tsx` — action bar + profile + stats.
- `MyReviewsTab.tsx` — filter toolbar + list; owns its filter/sort/category state.
- `MyReviewCard.tsx` — one own-review card; **owns its own** edit/reply/expand state
  + mutation calls (replaces the Dashboard-level state maps keyed by rating id).
- `ExploreTab.tsx` — filter toolbar + grid; owns its own filter state.
- `usePalette.ts` — the ColorThief effect, isolated (deleted in Phase 3).

Also fixed A9's hardcoded login string → `t('dashboard.loginRequired')` (EN+DE).
`tsc` clean, ESLint 0 errors (1 pre-existing setState-in-effect warning in the
soon-to-be-deleted `usePalette`), 27 tests pass, `vite build` clean.

**Deviation from original plan:** did *not* force a single shared `ReviewCard`
across Dashboard + `FlavorDetail`. On inspection the two cards are structurally
different — the dashboard card is flavor-centric (one user, many flavors), the
detail card is user-centric (one flavor, many users). Unifying would over-couple two
genuinely different layouts. The cross-file A2 dedup is reduced to a possible future
extraction of just the shared reply-thread atom, tracked but not forced.

### Phase 1 — Enrich the backend payload — ✅ DONE (stats); payload-slim deferred
- Added a **`stats` block** to `DashboardOut` (`dto.rs`): `average_score`,
  `score_distribution` (1–10 histogram, always all 10 keys), `favorite_category`
  (`{name, slug, count}`, deterministic tie-break by slug), `ratings_this_month`
  (current UTC month), `category_count`. Computed in the `dashboard` handler
  (`users.rs`) by a pure `dashboard_stats()` helper over the already-loaded ratings —
  **no new queries**. 3 unit tests (empty / aggregate / tie-break). `cargo fmt` +
  `clippy` clean, 23 backend tests pass.
- Frontend: extended `DashboardData` with `DashboardStats`/`FavoriteCategory`;
  `DashboardHeader` now shows Avg Score + This Month tiles and a "Top category" line
  (i18n EN+DE). `tsc` + ESLint (0 errors) clean, 27 tests, build clean.

**Sequencing change (deliberate):** the planned payload slim — dropping the
all-unrated `missing_flavors` dump (A4) — is **deferred to Phase 3**, where the
Explore tab that still consumes it is removed. Dropping it now would break a live UI
mid-refactor. Phase 1 stayed purely additive.

### Phase 2 — Recommendations engine — ✅ DONE
- New pure module `backend-rs/src/recommend.rs` (no DB → unit-testable): user-based CF
  with Pearson similarity (mean-centred), `MIN_OVERLAP=3`, significance weighting
  `min(overlap,5)/5`, positive-correlation-only neighbours, `MIN_NEIGHBOURS=2`,
  prediction clamped to 1–10. Cold start (`<5` own ratings, or no confident CF
  candidates) → Bayesian-popularity fallback (`C=5`). Deterministic ordering (score →
  neighbours → id). 3 unit tests: cold-start, CF-finds-shared-pick (with opposite-taste
  decoy filtered), exclude-already-rated + limit.
- New endpoint `GET /api/users/recommendations/` (`users.rs`) → `Vec<RecommendationOut>`
  (`dto.rs`): card fields + `predicted_score`, `contributing_neighbours`, `reason`
  (`"cf"`/`"popular"`). **Count only — no neighbour names** (locked decision). Loads
  the full rating matrix once, scores in-process, resolves ids via `build_flavors`
  (`include_ratings=false`). `cargo fmt`/`clippy` clean, 26 backend tests pass.
- Frontend plumbing: `Recommendation` type + `useRecommendations()` query hook
  (key `recommendations`, 5 min staleTime) + `queryKeys.recommendations()`. UI wiring
  is Phase 3. `tsc` + ESLint (0 errors) clean, 27 tests pass.

### Phase 3 — UI redesign ("For You" first) — ✅ DONE
- **Backend payload slim (the deferred A4):** `DashboardOut` no longer ships
  `missing_flavors` (the full unrated `Vec<FlavorOut>` with per-flavor aggregates).
  The handler now computes `missing_count` from flavor ids alone — no `build_flavors`
  pass over ~200 rows, no extra category/rating/user queries. `cargo fmt`/`clippy`
  clean, 26 backend tests pass.
- **Frontend IA:** removed the two-tab layout. Dashboard is now a single page —
  `DashboardHeader` (hero stats) → `RecommendationsSection` ("Tasters like you
  loved", count-only reason chips, skeleton while loading, hidden when empty) → "My
  Reviews" list. Deleted `ExploreTab.tsx`.
- **Dropped ColorThief from the dashboard (A3):** `DashboardHeader` uses a
  theme-derived gradient; deleted `usePalette.ts`. (The npm dep stays — `PublicProfile`
  still uses ColorThief; that's out of dashboard scope.)
- New components: `RecommendationCard.tsx` (image + predicted-score badge + reason
  chip), `RecommendationsSection.tsx` (wraps `useRecommendations`).
- i18n EN+DE: `recHeading`, `recReasonCf`, `recReasonPopular`, `predictedForYou` (plus
  the earlier `loginRequired`/`avgScore`/`thisMonth`/`favoriteCategory`).
- `tsc` + ESLint (0 warnings — the old `usePalette` setState-in-effect warning is gone
  with the file), 27 tests, `vite build` clean.

**Scope note:** the plan's separate "curated rows" (top community / newest) are
covered by the recommendation engine's popularity fallback — a cold or
rated-everything user still gets popularity-ranked picks in the same carousel — so a
distinct curated row was not added. Browsing the full catalog now lives on the main
flavor list, as decided. Leftover unused i18n keys from the old Explore tab
(`searchMissing`, `communityRating`, `circleRating`, `allRated`, `exploreNew`) were
left in place (harmless); can be swept later.

### Phase 4 — Item-based "similar flavors" — ✅ DONE
- **Engine:** added `similar_flavors()` to `backend-rs/src/recommend.rs` — **adjusted
  cosine** over the rating matrix (each user's scores mean-centred to cancel rater
  bias), positive-correlation-only, `MIN_CORATERS=2`, deterministic ordering
  (similarity → co-raters → id). Returns `SimilarFlavor { flavor_id, similarity,
  co_raters }`. 3 unit tests (co-liked / min-coraters guard / unknown target).
- **Endpoint:** `GET /api/flavors/{id}/similar/` (`routes/flavors.rs`, `SIMILAR_LIMIT=8`)
  → `Vec<SimilarFlavorOut>` (`dto.rs`: card fields + `similarity` + `co_raters`).
  404 if the flavor doesn't exist; **empty list** (not 404) when too few co-ratings to
  compute. Loads the matrix once, resolves ids via `build_flavors` (no nested
  ratings/replies). `cargo fmt`/`clippy` clean, **29 backend tests pass**.
- **Frontend:** `SimilarFlavor` type + `queryKeys.similarFlavors(id)` +
  `useSimilarFlavors()` hook (public, 5 min staleTime). New
  `pages/flavors/components/SimilarFlavorsSection.tsx` — "People who liked this also
  liked" grid (compact cards: image + avg-rating badge + status + "N rated both"
  chip), skeleton while loading, **hidden when empty**. Wired into `FlavorDetail.tsx`
  below the ratings grid. i18n EN+DE (`similarHeading`, `similarCoRaters`,
  `similarTooltip`). `tsc` + ESLint (0 warnings), 27 tests, `vite build` clean.

**Deferred (not built):** promoting recommendations to a scheduled precompute job —
unnecessary at current scale (sub-ms in-process); the engine code is unchanged when
that day comes, only the trigger moves. Tracked, not done.

---

## Resolved decisions (user)
- **Recommendation reason = count only.** Show "N tasters like you loved this"; do not
  name neighbours (no privacy exposure). The endpoint still returns
  `contributing_neighbours` as a number; neighbour usernames are not surfaced.
- **Drop ColorThief.** The avatar-derived header gradient is replaced by a
  theme-derived gradient — removes the dependency and the main-thread work (A3). No
  Web Worker needed.
- **Collapse "Explore".** The dashboard no longer hosts a full browsable unrated
  catalog. Dashboard = "For You" (recommendations) + curated rows + My Reviews.
  General browsing lives on the main flavor list. This drops the all-unrated-flavors
  load (A4) entirely from the dashboard payload — a large simplification.

### Plan adjustments from these decisions
- **Phase 1** no longer needs a paginated "browse unrated" view in the dashboard; it
  just adds the stats block and the bounded curated rows. The `missing_flavors` dump
  is removed from the dashboard response outright.
- **Phase 2** endpoint shape: `[{ ...flavor fields, predicted_score,
  contributing_neighbours, reason_key }]` — no neighbour usernames.
- **Phase 3** IA becomes: hero stats → "Tasters like you loved…" carousel → curated
  rows → My Reviews. The second tab ("Explore New") is removed.
