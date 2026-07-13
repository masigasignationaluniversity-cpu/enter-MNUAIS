# Admin: Bulk Grade Sheet PDF Generator (Active Term)

## Goal
Add a new Admin page that generates the **official Grade Sheet** (same visual format faculty already download per-class from Grade Encoding) in bulk for **all sections in the active term with posted/finished grades**, filterable by **All / College / Program**, exported as a single multi-page PDF (via browser print).

## Reuse existing format — refactor, don't duplicate
`src/pages/faculty/FacultyGradeEncoding.tsx` already has `generateGradeSheet(sec)` which builds the exact official Grade Sheet HTML (topbar, info table, student roster table with Count/Student No./Name/College/Year/Final Grade/Remarks) and opens a print window.

**Plan:** Extract the per-section HTML-building logic into a new shared helper `src/lib/gradeSheet.ts`:
- `buildGradeSheetBlock(section, course, term, grades, users, colleges, institutionName)` → returns the inner `<div class="sheet">...</div>` markup for one class (topbar + info table + roster table), reusing the exact same styling/columns as today.
- `GRADE_SHEET_STYLES` → the shared `<style>` block (topbar, table.info, table.roster, print rules) as a constant string.

Update `FacultyGradeEncoding.tsx`'s `generateGradeSheet` to call this helper and wrap it in a single-page print document (no visible behavior change — output stays pixel-identical).

## New Admin page: `src/pages/admin/AdminGradeSheets.tsx`
- Route: `/admin/grade-sheets`, nav entry in Admin sidebar (new single-item group, `FileSpreadsheet` icon, placed near "Grade Posting").
- Shows the **active term** only (per request — no term selector; if no active term, show empty state).
- **Scope filter** (segmented control or Select): `All` / `By College` / `By Program`
  - `By College` → shows a College dropdown (uses existing Course→Department→College resolution pattern already used in `OCSCourseOverview.tsx`).
  - `By Program` → shows a Program (DegreeProgram) dropdown. Since courses aren't directly linked to a program, program scope is resolved via that program's `GraduationRequirements` (matching `programId`) — union of `requiredMajorCourseIds`, `requiredSpecializedCourseIds`, `requiredThesisCourseIds`, `requiredSeminarCourseIds`, `requiredInternshipCourseIds`. If none configured, show an info message ("No program-specific curriculum configured yet — try College or All") instead of an empty silent list.
- **Included sections**: active-term sections, excluding `__MANUAL__` and lecture-parent sections that have lab/rec children (same convention used elsewhere), that have **at least one posted grade** (`status === 'posted'` / legacy `submitted`) — matching "finished grades" only.
- **Preview list**: table/list of qualifying sections (Course code/title, Section, Faculty, posted/total count badge) plus a small stat row (Sections in scope, Total posted grades).
- **Generate button**: "Download Grade Sheets (PDF)" — opens one print window containing every qualifying section's grade-sheet block, each wrapped with CSS `page-break-after: always` (all but last), then triggers `window.print()`. This mirrors the exact existing single-section pattern (print-to-PDF), just concatenated into multiple pages — keeps text-crisp output (no canvas rasterization).

## Files touched
1. **New** `src/lib/gradeSheet.ts` — shared HTML builder + styles (extracted from FacultyGradeEncoding).
2. **Edit** `src/pages/faculty/FacultyGradeEncoding.tsx` — `generateGradeSheet` now calls the shared builder (behavior-preserving refactor).
3. **New** `src/pages/admin/AdminGradeSheets.tsx` — the bulk filtered generator page described above.
4. **Edit** `src/router.tsx` — add `/admin/grade-sheets` route.
5. **Edit** `src/components/shared/PortalLayout.tsx` — add nav entry + banner copy for the new admin page.

## Out of scope
- No changes to grade data, posting workflow, or the per-section download button faculty already have.
- No PDF changes for OCS/Faculty roles — this is Admin-only, active-term-only, per the request.
