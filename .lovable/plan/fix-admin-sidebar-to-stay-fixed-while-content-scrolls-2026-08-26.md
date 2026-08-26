# Fix Admin Sidebar to Stay Fixed While Content Scrolls

## Goal
Make the admin sidebar remain visible (static/fixed) on desktop while only the main content area scrolls.

## Current Issue
In `src/components/admin/AdminLayout.tsx` the sidebar is a flex child of a `min-h-screen` container. When the main content grows taller than the viewport, the entire page scrolls and the sidebar scrolls out of view. The user wants the sidebar to stay fixed on the left.

## Proposed Changes

### 1. `src/components/admin/AdminLayout.tsx`
- Change the desktop `<aside>` from a flex child to a `fixed` or `sticky top-0 h-screen` element so it stays in place.
- Give the sidebar internal layout:
  - Header (logo + title) fixed height.
  - Navigation `flex-1 overflow-y-auto` so long menu lists scroll inside the sidebar if needed.
  - Footer (user email + sign out) pinned at the bottom.
- Add matching left margin (`md:ml-64`) to the `<main>` element so content does not slide under the fixed sidebar.
- Keep the mobile `<Sheet>` trigger and sidebar content unchanged.

### 2. Verification
- Run typecheck/build to ensure no regressions.
- Visually confirm in the preview that:
  - The sidebar stays fixed when scrolling a long page.
  - The main content still scrolls normally.
  - Mobile hamburger menu still works.

## Technical Notes
- Use existing Tailwind tokens (`bg-sidebar`, `border-sidebar-border`, etc.) and keep the current color scheme.
- No backend or route changes are required.
