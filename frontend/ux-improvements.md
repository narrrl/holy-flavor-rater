# UX & Design Improvements

Tracking doc from the frontend/UX audit. Items grouped by priority. Check off as done.

## 🔴 High impact

- [ ] **#1 i18n sweep** — app claims EN/DE but ~30+ user-facing strings are English-only.
  - [x] `App.tsx` 404 page
  - [x] `CategoryFlavors.tsx` empty state + review caption
  - [x] `CommunityFeed.tsx` "No comment provided.", reply-failed toast
  - [x] `FlavorDetail.tsx` admin edit labels, confirm dialogs, error toasts
  - [x] `Login.tsx` reset/verify flow labels, buttons, messages
  - [x] `MyReviewCard.tsx` confirm dialogs, error toasts
  - [x] `PublicProfile.tsx` tabs, empty states, confirm dialogs, error toasts
  - [ ] **Deferred (admin-only, superuser surface):** `AdminUserDetail.tsx`, `admin/*` (Banners, Tickets, Overview, Config, Jobs, Users), `AdminRatingDetail.tsx`, `AdminReplyDetail.tsx`, `Settings.tsx` theme-list subheaders. Lower UX priority — only the operator sees these.
- [x] **#2 Delete dead code** — `FlavorList.tsx` (240 LOC) + `AdminDashboard.tsx` (873 LOC). Zero imports, not in router (replaced by `admin/` folder + `flavors/FlavorDetail`).
- [ ] **#3 Add brand/logo** — no app identity anchor in sidebar or mobile appbar.
- [x] **#4 Categories discoverable** — accordion now open by default (`NavSidebar.tsx`); primary browse axis visible without an extra click.

## 🟡 Medium

- [ ] **#5 Hall of Fame carousel** — no swipe/auto-advance; arrows far from card on mobile; featured quote is arbitrary (first-with-comment).
- [x] **#6 Admin edit leaks into product card** (`FlavorDetail.tsx`) — extracted to `components/AdminFlavorEditDialog.tsx`; card keeps a clean read view, edit opens a focused dialog.
- [ ] **#7 CommunityFeed duplication** — in-page notifications + following duplicate the nav/global menus.
- [ ] **#8 Reply Enter-to-submit on multiline** — surprising; blocks newlines.
- [ ] **#9 Login password UX** — no show/hide toggle, no strength hint, no inline validation.

## 🟢 Design-system cleanup

- [ ] **#10 Unify grid breakpoints** — 3 different responsive card grids across browse surfaces.
- [x] **#11 Extract `<BackButton>`** — repeated with drifting `sx` on 5+ pages.
- [ ] **#12 Font-weight scale** — 600/700/800/900/'bold' scattered; enforce via theme.
- [ ] **#13 Avatar fallback casing** — inconsistent `.toUpperCase()`.
- [ ] **#14 Image placeholder** — `CommunityFeed`/`MyReviewCard` raw `<img>` can show broken-image icon; reuse `FlavorCard` pattern.
- [ ] **#15 Standardize empty states** — `EmptyState` component vs inline `<Typography>`.

## ✅ Good (keep)
ScoreInput a11y (radiogroup, arrow/number keys). Glass design system + skeletons. Optimistic mutations. Lazy routes. Status/Rating badges.
