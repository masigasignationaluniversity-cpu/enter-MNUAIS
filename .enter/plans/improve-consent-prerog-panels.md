# Improve Advisees detail panel + unify COI/Dept/OCS Consent & Prerogative panels

## Scope
1. **FacultyAdvisees.tsx** — visual polish of the expanded advisee detail panel (Holds, Plan of Study, Current Classes, Grades).
2. **FacultyConsents.tsx** (COI), **DeptHeadConsents.tsx** (Dept consent), **OCSConsents.tsx** — visual polish + consistent structure.
3. **FacultyPrerogatives.tsx**, **OCSPrerogatives.tsx** — visual polish + consistent structure.
4. **OCSConsents.tsx** and **OCSPrerogatives.tsx** will be restructured from their current flat searchable-table/flat-card format into the same **collapsible per-section card** format already used by Faculty/DeptHead, so all three roles look and behave the same way.

## Shared component (avoids duplicating ~40 lines x 5 files)
Create `src/components/shared/SectionRequestCard.tsx`:
- Collapsible card with a header row: icon, course code, section badge, pending-count badge, an optional meta line (e.g. faculty name for OCS/DeptHead, enrolled/units), an optional right-side slot (e.g. Faculty's Accepting/Closed switch), and a chevron toggle.
- Body renders `children` (the per-module table) only when expanded.
- Used by FacultyConsents, DeptHeadConsents, OCSConsents, FacultyPrerogatives, OCSPrerogatives — each keeps its own table columns/logic, just shares the card chrome.

## New CSS utility
Add `.dash-stat-sm` (compact icon + value stat chip) in `index.css` to replace the plain-text `Pending: X  Approved: Y` rows with small consistent stat cards, used across all 5 consent/prerogative pages.

## Per-file changes

### FacultyAdvisees.tsx (detail panel polish)
- Give each of the 3 sub-sections (Holds, Plan of Study, Current Classes, Grades) a consistent elevated card style (icon badge circle + title, `card-elevated` shadow, better spacing).
- No structural/logic changes — visual only.

### FacultyConsents.tsx / DeptHeadConsents.tsx (light polish)
- Replace plain stats text row with `.dash-stat-sm` chips.
- Swap custom section-card markup for shared `SectionRequestCard`.
- Keep all existing logic (window checks, appeal badges, approve/deny) unchanged.

### OCSConsents.tsx (restructure to match)
- Group consent records by section (only sections with an `ocsConsentStatus !== 'not_requested'` record, respecting existing college-visibility rules).
- Render with `SectionRequestCard`: header shows course code, section badge, pending badge, faculty name, college abbreviation, enrolled/units meta.
- Expanded body: table with Student, Type, Drive Link, Remarks/Appeal, Status/Action (trimmed since course/section/college now live in the header).
- Keep: term filter, search (filters rows within groups, hides empty groups), deadline-lock banner, Pending vs Transaction History panels, `.dash-stat-sm` stats.

### FacultyPrerogatives.tsx (light polish)
- Replace stats row with `.dash-stat-sm`.
- Swap section header markup for shared `SectionRequestCard` (keeping the Accepting/Closed `Switch` in the right slot).

### OCSPrerogatives.tsx (restructure to match)
- Group prerogative requests by section (currently a flat list of per-request cards).
- Render with `SectionRequestCard`: header shows course, section, faculty name, slots.
- Expanded body: table with Student, Reason, Requested, Status (read-only — OCS doesn't approve/deny prerogatives, same as today).
- Keep: term filter (with "All"), search, Pending vs All Records panels, `.dash-stat-sm` stats.

## Out of scope
- No changes to data model, approve/deny logic, or window/deadline rules — purely visual + structural (layout) consistency.
- DeptHead has no Prerogatives page, so nothing to change there for prerogatives.
