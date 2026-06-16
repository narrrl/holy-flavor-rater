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
  - [x] **Admin-only, superuser surface:** swept `AdminUserDetail.tsx`, `admin/*` (Banners, Tickets, Overview, Config, Jobs, Users, Layout, Flavors), `AdminRatingDetail.tsx`, `AdminReplyDetail.tsx`, `Settings.tsx` theme-list subheaders. Added ~120 `admin.*` keys + `common.{home,processing,active,inactive}` (EN+DE), fixed DE leftovers in the existing admin block (manageUser/manageRating/manageReply/deactivate), added `react-i18next` to `AdminJobs` (was missing). Toasts/confirms/labels/table headers/menu items all keyed.
- [x] **#2 Delete dead code** — `FlavorList.tsx` (240 LOC) + `AdminDashboard.tsx` (873 LOC). Zero imports, not in router (replaced by `admin/` folder + `flavors/FlavorDetail`).
- [x] **#3 Add brand/logo** — new `BrandMark` (`components/layout/BrandMark.tsx`): gradient "H" monogram + wordmark, links home. Anchored at the top of `NavSidebar` (full) and the mobile `GlassAppBar` (compact, icon-only). New `brand.{name,tagline}` i18n keys (EN+DE).
- [x] **#4 Categories discoverable** — accordion now open by default (`NavSidebar.tsx`); primary browse axis visible without an extra click.

## 🟡 Medium

- [x] **#5 Hall of Fame carousel** (`MainPage.tsx`) — added 6s auto-advance (stops on manual control, pauses on hover, off for reduced-motion), touch swipe, on-card overlay arrows on mobile (header arrows desktop-only), and featured quote now picks the highest-scored comment instead of the first.
- [x] **#6 Admin edit leaks into product card** (`FlavorDetail.tsx`) — extracted to `components/AdminFlavorEditDialog.tsx`; card keeps a clean read view, edit opens a focused dialog.
- [x] **#7 CommunityFeed duplication** (`CommunityFeed.tsx`) — dropped the in-page Notifications + Following sidebar cards (NavSidebar already provides both: NotificationMenu popup + Following collapse). Kept the unique "Circle's Top Rated" card. Removed now-dead queries/state/imports.
- [x] **#8 Reply Enter-to-submit on multiline** (`CommunityFeed.tsx`, `FlavorDetail.tsx`, `MyReviewCard.tsx`) — reply fields are now `multiline rows={2}`; plain Enter inserts a newline, submit moved to Ctrl/Cmd+Enter (no longer hijacks Enter, no longer blocks newlines).
- [x] **#9 Login password UX** (`Login.tsx`) — added a `PasswordField` with show/hide toggle (all password inputs), a 0–4 strength meter on signup + reset-new-password, and inline validation mirroring the backend (min 8 chars, not entirely numeric) that gates the submit button.

## 🟢 Design-system cleanup

- [x] **#10 Unify grid breakpoints** — new `<FlavorGrid>` (`components/ui/FlavorGrid.tsx`) is the single source of truth for flavor-card grids: default roomy auto-fill mode + `compact` 2→6 fixed mode. Replaced the 3 divergent inline `display:grid` defs (CategoryFlavors, MainPage search/newest) and converted SimilarFlavors off MUI `<Grid>`.
- [x] **#11 Extract `<BackButton>`** — repeated with drifting `sx` on 5+ pages.
- [x] **#12 Font-weight scale** — normalized all inline weights to a numeric scale (`'bold'`→700, `'900'`→900, `'800'`→800) across 35 files; theme typography already owns h1–h6/button/tab weights. No visual change (`'bold'`===700).
- [x] **#13 Avatar fallback casing** — all avatar/initial fallbacks now `.charAt(0).toUpperCase()`; fixed the 2 outliers missing `.toUpperCase()` (`MainPage` featured review, `PublicProfile` header).
- [x] **#14 Image placeholder** — new `<FlavorThumb>` (`components/ui/FlavorThumb.tsx`) renders the flavor initial on missing **or** failed image (`onError` fallback), no broken-image glyph. Adopted in `CommunityFeed` (feed + top-followed) and `MyReviewCard`.
- [x] **#15 Standardize empty states** — audited: all user-facing list/section empties already use `<EmptyState>`. Remaining inline `<Typography>` are intentional in-card comment placeholders (italic "no comment") + one admin-only caption (deferred under #1).

## ✅ Good (keep)
ScoreInput a11y (radiogroup, arrow/number keys). Glass design system + skeletons. Optimistic mutations. Lazy routes. Status/Rating badges.
