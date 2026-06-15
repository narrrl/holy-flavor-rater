# Holy Flavor Rater — Audit

Scope: `backend-rs/` (Rust/Axum/SeaORM) + `frontend/` (React 19/MUI 7). Django backend excluded (legacy data dir). Findings ordered by impact within each area.

## Robustness

### R1. Notification text is hardcoded English (DE locale shows mixed languages)
`App.tsx:183-189` and `NavSidebar.tsx:445-451` hardcode `replied to your review on`, `mentioned you on`, `left a message on your guestbook` as template literals while sibling notif types use `t(...)`. German users get a mixed-language menu.
**Fix:** move to i18n keys with interpolation, e.g. `t('community.notifReply', { flavor: n.flavor_name })`.

### R2. Full page reload on notification click
`App.tsx:104` and `NavSidebar.tsx:83` use `window.location.href = '/flavor/${id}'` instead of `navigate()`. Kills SPA state, refetches everything, white flash. Other branches use `navigate()` — inconsistent.
**Fix:** `navigate(path)`; if same-route remount is needed, reset via key/scroll.

### R3. Rate limiter fails open and is per-process
`throttle.rs` is in-memory: login/signup limits reset on restart and don't span instances. Acceptable for the single Rust process today. If ever scaled to 2 instances or frequent deploys, the brute-force window resets each time.
**Fix (future):** DB/Redis-backed counters, or rely on strict nginx limits in front.

### R4. `refetchUser` 60s poll also re-pulls the full following list
`AuthContext.tsx:48` — every minute it re-fetches `following_list` just to refresh the unread badge, which is already on `/users/me/`.
**Fix:** poll only `users/me/`; fetch following on login + after follow/unfollow mutations.

## Performance

### P1. (Biggest) List endpoints ship full nested ratings the UI never reads
`build_flavors` (`service.rs:230`) always populates `FlavorOut.ratings` with full `RatingOut` objects (comment, avatar URL, category, score…). `/flavors/` page size = 50 (`pagination.rs:9`). `FlavorCard` (`FlavorCard.tsx:10-18`) consumes only id/name/image/avg/flags/category — never `ratings`. Category + main list pages thus transfer 50 flavors × all their ratings as dead JSON.
- Detail view needs ratings. `top` needs them (`MainPage.tsx:98,363`). `list`/`newest`/`category` do **not**.
**Fix:** add `include_ratings: bool` (mirrors existing `include_replies`); skip per-rating `RatingOut` build for list/newest/category while keeping the cheap aggregate pass (avg/distribution). For `top`'s review-count + featured review, keep ratings on `top` only or add slim `review_count`/`featured_comment` fields.

### P2. Double average computation in `list`
`flavors.rs:97` orders by `AVG(score)` in SQL, then `build_flavors` recomputes avg in Rust. Ordering forces the SQL avg; the win is the P1 payload trim (ratings get fully loaded regardless today).

## Code quality

### Q1. Notification menu duplicated
Full render + `handleNotificationClick` logic is copy-pasted in `App.tsx:94-205` and `NavSidebar.tsx`. Two places to fix every notif bug (already bit us: R1 + R2 live in both).
**Fix:** extract `<NotificationMenu>` + `useNotificationClick()`.

### Q2. Categories fetched raw, outside react-query
`App.tsx:75-83` uses raw `api.get('categories/')` in `useEffect` while everything else uses query hooks. No cache, refetch on every mount, manual array/results juggling.
**Fix:** `useCategories()` query hook.

### Q3. Stale docs / comment mismatch
`api.ts:4-7` correctly describes httpOnly-cookie auth, but CLAUDE.md frontend Auth still describes the retired localStorage `access`/`refresh` scheme.
**Fix:** update CLAUDE.md frontend Auth paragraph.

### Q4. `as object` cast hack
`AuthContext.tsx:40-42` does `...({ skipAuthRedirect: true } as object)`; the field is already typed in `RetriableConfig` (`api.ts:24`).
**Fix:** export that type, drop the cast.

## Extendability

### E1. Hand-rolled per-field validation
`ratings.rs:107-178` (and update `:258-321`) manually build DRF-shaped field errors. Every new field/endpoint repeats the pattern.
**Fix:** small validation helper (required/int-range/string) returning the field-keyed map.

### E2. App-level CASCADE hand-coded per handler
`ratings.rs:352-373` collects replies→notifications→replies→rating in a txn. Correct but error-prone as relations grow.
**Fix (long-term):** migration adding `ON DELETE CASCADE` FKs; short-term centralize collectors in helpers.

## UX flow

### U1. No optimistic UI on rating/reply submit
Verify mutations `invalidateQueries`; consider optimistic insert so reviews appear instantly.

### U2. Login redirect is a hard reload
`Login.tsx:35` + `Settings.tsx:185` use `window.location.href='/'`, losing warm react-query cache.
**Fix:** `navigate('/')` + `refetchUser()`.

### U3. Mark-all-read fails silently
`NotificationContext.tsx:44-51` swallows errors; badge clears then reappears on next poll if the request failed.
**Fix:** toast on failure (ToastContext exists).

---

## Implementation status
- [x] Q2 — `useCategories()` query hook (`api/queries/useCategories.ts`, key
  `queryKeys.categories()`, 30 min `staleTime`). Replaced raw
  `api.get('categories/')` + `useState`/`useEffect` in `App.tsx` with the hook;
  dropped the now-unused `api` import. Cached + shared across mounts. `tsc` +
  ESLint (0 errors) clean.
- [x] R1 + R2 + Q1 — notif menu dedup + i18n + SPA nav. Extracted shared
  `<NotificationMenu>` (`components/layout/NotificationMenu.tsx`) + `useNotificationClick()`
  hook (`hooks/useNotificationClick.ts`); `App.tsx` and `NavSidebar.tsx` now both render
  the one component. R1: hardcoded English notif strings moved to i18n keys
  (`community.notifReplyOn`/`notifMentionOn`/`notifProfileComment`/`markAllRead`, EN+DE,
  flavor interpolated). R2: `window.location.href` → `navigate()` (no full reload). `tsc`,
  ESLint (0 errors), 27 tests, `vite build` all clean.
- [x] P1 — list payload trim (`include_ratings` flag). `build_flavors` now takes
  `include_ratings`; the aggregate rollup (avg/followed-avg/distribution/viewer
  score) always runs, but the per-rating `RatingOut` vec + rating-author user
  lookup are skipped when false. Set false on `newest`, `followed_top`, and the
  dashboard's "missing flavors" (loads *every* unrated flavor — biggest win);
  kept true on `list`/`top`/detail because their UI reads the nested reviews. No
  frontend change required. `cargo fmt`/`clippy`/`test` clean (20 passed).
</content>
</invoke>
