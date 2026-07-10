## Reorganize merchant store product page by category + size

Update `src/pages/user/UserMerchantDetail.tsx` so the product list is grouped into clear sections instead of one flat grid.

### Grouping structure
Group products by category, in this fixed order, and within each category sub-group by cylinder size (kg) ascending:

1. **LPG Refill** — subsections per size (e.g. 12kg, 14kg)
2. **New Cylinder Gas** — subsections per size (e.g. 12kg, 14kg)
3. **Industrial Gas** — subsections per size (e.g. 12kg, 14kg)
4. **Accessories / Inspection** — no size subsections; single list (Gas Kit + Inspection + Installation, Gas Inspection, etc.)

Any product whose category doesn't match the four above falls into an "Other" section at the end.

### Layout
- Section header: category name (e.g. "LPG Refill").
- Under each section, size subheaders ("12 kg", "14 kg") followed by a 2-col product grid (same card style as today).
- Accessories section has no size subheader — just the grid.
- Sections with zero products are hidden.
- Keep existing card, coming-soon badge, out-of-range disable, and price logic unchanged.

### Category-filter behavior
When `?category=` is set in the URL, only that single section renders (still with size subgroups if applicable). The existing filter chip stays.

### Technical notes
- Match categories by slug (`lpg-refill`, `cylinder` / new cylinder, `industrial-gas`, `accessories`) — pull slug into `categoriesMap` (store `{name, slug}`).
- Confirm exact slugs by reading `categories` in DB before finalizing during build.
- Sorting: size asc numeric; products with no size go last within their category.
- No DB or business-logic changes; presentation only.
