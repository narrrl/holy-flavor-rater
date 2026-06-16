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

- [x] **#5 Hall of Fame carousel** (`MainPage.tsx`) — added 6s auto-advance (stops on manual control, pauses on hover, off for reduced-motion), touch swipe, on-card overlay arrows on mobile (header arrows desktop-only), and featured quote now picks the highest-scored comment instead of the first.
- [x] **#6 Admin edit leaks into product card** (`FlavorDetail.tsx`) — extracted to `components/AdminFlavorEditDialog.tsx`; card keeps a clean read view, edit opens a focused dialog.
- [x] **#7 CommunityFeed duplication** (`CommunityFeed.tsx`) — dropped the in-page Notifications + Following sidebar cards (NavSidebar already provides both: NotificationMenu popup + Following collapse). Kept the unique "Circle's Top Rated" card. Removed now-dead queries/state/imports.
- [x] **#8 Reply Enter-to-submit on multiline** (`CommunityFeed.tsx`, `FlavorDetail.tsx`, `MyReviewCard.tsx`) — reply fields are now `multiline rows={2}`; plain Enter inserts a newline, submit moved to Ctrl/Cmd+Enter (no longer hijacks Enter, no longer blocks newlines).
- [x] **#9 Login password UX** (`Login.tsx`) — added a `PasswordField` with show/hide toggle (all password inputs), a 0–4 strength meter on signup + reset-new-password, and inline validation mirroring the backend (min 8 chars, not entirely numeric) that gates the submit button.

## 🟢 Design-system cleanup

- [ ] **#10 Unify grid breakpoints** — 3 different responsive card grids across browse surfaces.
- [x] **#11 Extract `<BackButton>`** — repeated with drifting `sx` on 5+ pages.
- [ ] **#12 Font-weight scale** — 600/700/800/900/'bold' scattered; enforce via theme.
- [ ] **#13 Avatar fallback casing** — inconsistent `.toUpperCase()`.
- [ ] **#14 Image placeholder** — `CommunityFeed`/`MyReviewCard` raw `<img>` can show broken-image icon; reuse `FlavorCard` pattern.
- [ ] **#15 Standardize empty states** — `EmptyState` component vs inline `<Typography>`.

## ✅ Good (keep)
ScoreInput a11y (radiogroup, arrow/number keys). Glass design system + skeletons. Optimistic mutations. Lazy routes. Status/Rating badges.
