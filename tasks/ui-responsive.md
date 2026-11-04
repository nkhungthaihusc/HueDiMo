# Web UI refresh — 2026-11-04

The chosen direction is a light interface with HueDiMo purple as an accent.
This update covers the tourist web app, authentication screens, and admin.

## Layout decisions

- Below 768px, keep the map visible initially. A bottom panel opens through its
  handle, a swipe on the handle, selecting a place, or opening a feature.
- Put primary mobile navigation at the bottom. Keep all remaining actions in
  the labeled menu, implemented with a native dialog for focus and Escape support.
- Use one category selection for the map and place list. Personal contributions
  remain a separate list filter.
- Collapse the panel when entering place contribution mode so a map position can
  be selected. Open the form after selecting that position.
- Use dynamic viewport height and safe-area insets. In short landscape viewports,
  an expanded panel fills the space above navigation; its handle returns to the map.
- Keep desktop side panels and the radial category menu. Use simpler white
  surfaces and quieter borders across shared panels.
- Give admin its own scroll container, a persistent desktop sidebar, and a native
  dialog drawer below 1024px. Wide data tables scroll horizontally within their
  containers, with a visible mobile hint and a readable first column.
- Preserve API contracts, permissions, and existing data operations.

## Verification

- Chromium checks at 320, 390, 768, 1024, and 1440px, plus a 667×375 landscape
  viewport: 46 layout checks across the homepage, auth, and seven admin pages.
- 24 panel interaction checks across 320, 390, 768, and 1440px: place details,
  AI itinerary form, saved itineraries, budget, contribution, and community.
- Layout checks found no document-level horizontal overflow or JavaScript
  exceptions. Admin and authenticated interaction checks use intercepted fixture
  responses; they do not establish live backend integration or write real data.
- TypeScript and targeted ESLint pass for the new panel and rewritten layouts.
- Production build passes with `pnpm exec next build --webpack` in `front-end`.
  Default Turbopack build encountered a process-startup error on this Windows host;
  the package build script is unchanged.
- Repository-wide ESLint remains nonzero. Against the same tracked files in HEAD,
  errors decrease from 116 to 115, with no file increasing its error count.

Real-device Safari, software-keyboard behavior, and notched-device safe areas
still need physical-device verification. Chromium viewport emulation does not
establish those behaviors.

## Admin themes and avatar follow-up

- Admin now supports explicit light/dark selection from both the login screen and
  the dashboard header. The initial theme follows the OS until the user chooses.
- `huedimo_admin_theme` stores the selection locally; changes synchronize between
  tabs. Theme state and color variables are scoped to the admin wrapper.
- Admin neutral surfaces use semantic `admin-*` colors, resolved with Tailwind
  `@theme inline` so nested theme variables resolve at the point of use.
- `UserAvatar` supports both avatar field names and falls back to the user's initial
  when an image fails. The same component is used in the top bar and admin sidebar.
- Login inputs use a subtle container border for focus instead of the duplicated
  purple outline/ring. Keyboard focus remains visible on other controls.
- Browser verification: 70 admin page/theme/viewport checks, three avatar cases,
  persistence across reload/navigation and tabs, and computed login focus styles.
