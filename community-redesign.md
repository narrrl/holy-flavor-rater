# Community Tab Redesign

The Community tab is the oldest part of the site and doesn't fit the robust,
professional design of the rest. This document tracks the redesign.

## Starting state

`frontend/src/pages/CommunityFeed.tsx` — a paginated feed of ratings **from
followed users only**, with a single sidebar card ("Circle's Top Rated"). Replies
are hidden behind a per-card collapse. Loading is a bare center spinner.

### Core problems

- **Cold start is dead.** No follows → empty feed → no reason to return. The
  backend `ratings/feed/` is gated on the follow graph and returns nothing for
  users who follow no one.
- **Single content type.** Only ratings. No new-flavor drops, profile comments,
  follow events, or milestones.
- **No engagement loop.** No reactions/likes. Replies buried in a collapse. The
  feed is a read-only wall.
- **No filtering/sort.** Can't sort recent/top or filter by category, even though
  the payload already carries `category_name`/`category_slug`.
- **Sparse sidebar.** One card wastes the 4-column rail.

---

## Phase 1 — frontend-only (DONE)

No backend changes. Reuses the existing `GET /api/ratings/recent/` endpoint
(global, AllowAny, 10 newest ratings with a comment).

- **Following | Discover tabs.** Discover surfaces the whole community's newest
  ratings, so the page is useful even when you follow nobody — fixes the
  cold-start hole. Discover is fetched lazily (`enabled: tab === 'discover'`).
- **Skeleton loader** (`FeedSkeleton`) replaces the center spinner — matches the
  professional look of the rest of the app.
- **Inline reply preview.** The latest reply shows compact under each card; click
  expands the full thread + compose box. Replies feel like conversation, not
  archive.
- **Smarter empty states.** Empty Following nudges to Discover (button switches
  tab); empty Discover nudges to explore flavors.
- **i18n** EN + DE keys added under `community.*`.

### Files touched

- `frontend/src/api/queries/useCommunityFeed.ts` — added `useRecentRatings`.
- `frontend/src/pages/CommunityFeed.tsx` — tabs, skeleton, inline reply preview,
  empty-state logic.
- `frontend/src/i18n.ts` — `tabFollowing`, `tabDiscover`, `discoverSubtitle`,
  `discoverEmpty`, `discoverEmptyHint`, `browseDiscover` (EN + DE).

---

## Phase 2 — needs backend

### 1. Reactions (highest engagement lever) — DONE

Lightweight 👍 / emoji on ratings. Social proof, drives return visits.

- New `rating_reaction` table (`user_id`, `rating_id`, `kind`, `created_at`;
  unique on `user_id + rating_id + kind`). Created in `db.rs::ensure_schema`
  (idempotent `CREATE TABLE IF NOT EXISTS` + index on `rating_id`).
- Endpoints: `POST /api/ratings/{id}/react/`, `DELETE /api/ratings/{id}/react/`.
  Allow-listed `kind`, rate-limited (60/min/user), idempotent on the unique index.
- `RatingOut` carries `reactions` (kind → count) + `my_reactions` (caller's own).
  Threaded through `build_ratings(viewer_id)` via the `OptionalUser` extractor.
- Frontend: `ReactionBar` on each feed card; optimistic toggle, server-reconciled.

#### Files touched

- `backend-rs/src/entities/rating_reaction.rs` (new), `entities/mod.rs`.
- `backend-rs/src/db.rs` (table + index), `throttle.rs` (`REACTION` rate),
  `dto.rs` (`reactions`/`my_reactions`), `service.rs` (`load_reactions`,
  `build_ratings` viewer param), `routes/ratings.rs` (`react`/`unreact`),
  plus call-site updates in `routes/users.rs`, `routes/admin.rs`.
- `frontend/src/components/ReactionBar.tsx` (new),
  `frontend/src/pages/CommunityFeed.tsx`, `api/queries/useCommunityFeed.ts`,
  `frontend/src/i18n.ts`.

### 2. Discover feed with sort + pagination — DONE

`recent/` is fixed at 10 and unpaginated. Discover is now a real feed.

- New `GET /api/ratings/discover/` (AllowAny) accepts `?sort=recent|top`,
  `?category=<slug>`, `?page=`. Quality bar kept (non-empty comment only).
  `top` orders by score desc then recency; category resolves slug → flavor ids.
- Frontend: sticky filter bar — `Recent | Top rated` sort chips + `All` plus a
  chip per category (reuses `useCategories`). Discover now paginates like
  Following; page resets on tab/sort/category change.

#### Files touched

- `backend-rs/src/routes/ratings.rs` (`discover` handler + route).
- `frontend/src/api/queries/useCommunityFeed.ts` (`useDiscoverFeed`),
  `frontend/src/api/keys.ts` (`communityDiscover`),
  `frontend/src/pages/CommunityFeed.tsx` (filter bar, discover pagination),
  `frontend/src/i18n.ts` (`sortRecent`, `sortTop`, `allCategories`).

### 3. Who-to-follow — DONE

Sidebar card suggesting active raters the user doesn't follow yet.

- `GET /api/users/suggested/` — up to 5 most-active raters (by rating count),
  excluding self + already-followed. Returns `UserOut` (reuses `build_users`),
  re-sorted to the activity ranking after the id-ordered load.
- Frontend: `SuggestedFollows` card (avatar + name + follower count + Follow
  button), optimistic — drops the user from the list on follow, reverts on error.

#### Files touched

- `backend-rs/src/routes/users.rs` (`suggested` handler + route).
- `frontend/src/api/queries/useCommunityFeed.ts` (`useSuggestedUsers`),
  `frontend/src/pages/CommunityFeed.tsx` (`SuggestedFollows` sidebar card),
  `frontend/src/i18n.ts` (`whoToFollow`, `follow`, `followFailed`,
  `followerCount`).

### 4. Richer activity types — DONE

Make the feed alive when friends are quiet.

- New `GET /api/activity/` (AllowAny, paginated): a unified, newest-first stream
  of `new_flavor` drops + `milestone` events. No persistent event table — items
  are synthesized on read from `flavor.created_at` and, for milestones, the
  timestamp of the rating that crossed a threshold (25/50/100/250/500/1000;
  one item per flavor at its highest crossed threshold). Candidate set is bounded
  (latest 40 drops + flavors ≥25 ratings), built once and paged in memory.
- Frontend: third **Activity** tab with its own card style (drop vs. milestone
  icon), paginated like the others.

#### Files touched

- `backend-rs/src/dto.rs` (`ActivityOut`), `service.rs` (`build_activity`),
  `routes/activity.rs` (new), `routes/mod.rs` (mount).
- `frontend/src/api/queries/useCommunityFeed.ts` (`useActivityFeed`),
  `frontend/src/api/keys.ts` (`communityActivity`),
  `frontend/src/pages/CommunityFeed.tsx` (Activity tab + `renderActivityCard`),
  `frontend/src/i18n.ts` (`tabActivity`, `activitySubtitle`, `activityEmpty`,
  `activityEmptyHint`, `newDropLabel`, `milestoneLabel`, `milestoneText`).

---

## Suggested order

Phase 2.1 (reactions) and 2.2 (Discover sort/filter) give the most UX lift per
unit of backend work. 2.3 and 2.4 follow. **All of Phase 2 is now complete.**
