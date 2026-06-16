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

### 1. Reactions (highest engagement lever)

Lightweight 👍 / emoji on ratings. Social proof, drives return visits.

- New `rating_reaction` table (`user_id`, `rating_id`, `kind`, `created_at`;
  unique on `user_id + rating_id + kind`).
- Endpoints: `POST /api/ratings/{id}/react/`, `DELETE /api/ratings/{id}/react/`.
- Include reaction counts + the caller's own reaction in `RatingOut`.
- Frontend: reaction bar on each feed card; optimistic toggle.

### 2. Discover feed with sort + pagination

`recent/` is fixed at 10 and unpaginated. Promote Discover to a real feed.

- Extend `ratings/feed/` (or a new `ratings/discover/`) to accept
  `?sort=recent|top` and `?category=<slug>` and `?page=`.
- Frontend: sticky filter bar with `Recent | Top | <category chips>`. Reuse the
  `category_slug` already in the payload.

### 3. Who-to-follow

Sidebar card suggesting active raters the user doesn't follow yet.

- `GET /api/users/suggested/` — most-active raters excluding self + already-followed.
- Frontend: avatar + name + follow button; optimistic follow.

### 4. Richer activity types

Make the feed alive when friends are quiet.

- New-flavor drops (from the `sync_flavors` job) and milestones
  ("X hit 100 ratings") as feed items.
- Likely a unified activity payload or a separate `activity/` endpoint.

---

## Suggested order

Phase 2.1 (reactions) and 2.2 (Discover sort/filter) give the most UX lift per
unit of backend work. 2.3 and 2.4 follow.
