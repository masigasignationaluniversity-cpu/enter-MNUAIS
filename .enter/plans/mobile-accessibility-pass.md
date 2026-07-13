# App-wide Mobile/Tablet Accessibility Pass

## Goal
Make the entire portal (sidebar/nav already largely responsive) usable on phones and tablets by fixing the remaining concrete gaps found in the audit: dialogs that can overflow the viewport, raw HTML tables that overflow horizontally with no way to scroll, and fixed 3/7-column grids that squeeze content unreadably on narrow screens.

## What's already fine (no changes needed)
- `PortalLayout.tsx` sidebar: already collapses off-screen on mobile (`<lg`), has a hamburger button + backdrop overlay, closes on nav click.
- The shadcn `<Table>` component (`src/components/ui/table.tsx`) already wraps its `<table>` in `overflow-auto` — every page using the capitalized `<Table>` component (not raw `<table>`) already scrolls horizontally correctly. No changes needed there.
- Login/Index landing pages are already responsive.
- Most dashboards already use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` style responsive stat grids.

## Fix 1 — Shared Dialog/AlertDialog components (high leverage, 2 files)
`src/components/ui/dialog.tsx` and `src/components/ui/alert-dialog.tsx`: `DialogContent`/`AlertDialogContent` currently use `w-full max-w-lg` with no viewport-height cap, so tall forms get clipped off-screen on short/mobile viewports with no way to scroll to the footer buttons.
- Change width class to constrain to the viewport with side margin: `w-[calc(100%-2rem)] sm:w-full`
- Add `max-h-[85vh] overflow-y-auto` so tall dialogs scroll internally instead of overflowing the screen.
This single fix improves every modal across the entire app (used by dozens of pages).

## Fix 2 — Raw `<table>` elements missing horizontal scroll wrapper
These are live JSX tables (not PDF/print templates — confirmed via audit) using plain HTML `<table>` instead of the shadcn `<Table>` component, so they have no scroll behavior on narrow screens. Wrap each in `<div className="overflow-x-auto">...</div>`:
- `src/pages/admin/AdminGraduationSettings.tsx` (~line 135)
- `src/pages/admin/AdminPasswordTickets.tsx` (~line 129)
- `src/pages/ocs/OCSChangeDrop.tsx` (~lines 262, 298, 381)
- `src/pages/ocs/OCSCourseOverview.tsx` (~line 328)
- `src/pages/ocs/OCSGeElective.tsx` (~line 298)
- `src/pages/ocs/OCSGradeManagement.tsx` (~lines 855, 951, 1250, 1302, 1362)
- `src/pages/ocs/OCSReconsideration.tsx` (~lines 629, 770)
- `src/pages/ocs/OCSSections.tsx` (~line 1074)
- `src/pages/ocs/OCSSpecialization.tsx` (~line 298)
- `src/pages/ocs/OCSStudents.tsx` (~lines 215, 468)
- `src/pages/student/StudentChangeDropModal.tsx` (~lines 788, 918)
- `src/pages/student/StudentEnlistment.tsx` (~line 3450)
- `src/pages/student/StudentGeElective.tsx` (~lines 450, 603, 659, 709)
- `src/pages/student/StudentPrerogatives.tsx` (~line 328)
- `src/pages/student/StudentSpecialization.tsx` (~lines 533, 686, 742, 792)

(Tables inside PDF/print template strings — e.g. OCSGwaReport's print HTML, StudentEnlistment's Form 5 print HTML, FacultyRemovalGrades' Form 13C — are intentionally left untouched; they render inside a dedicated print window with fixed paper-size CSS, not the responsive app UI.)

## Fix 3 — Fixed multi-column grids that don't stack on mobile
Add a `grid-cols-1` (or `grid-cols-2`) mobile fallback with the existing 3-column layout kicking in at `sm:`/`md:`:
- `src/pages/admin/AdminAcademicUnits.tsx` (~line 131): `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`
- `src/pages/admin/AdminFeeSchedule.tsx` (~line 151): `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`
- `src/pages/ocs/OCSGraduationApplications.tsx` (~line 256): same
- `src/pages/ocs/OCSSpecialization.tsx` (~line 175): same
- `src/pages/ocs/OCSUnderload.tsx` (~line 334): same
- `src/pages/ocs/OCSStudentLoans.tsx` (~line 213): same
- `src/pages/ocs/OCSCourseOverview.tsx` (~line 185): same
- `src/pages/ocs/OCSGeElective.tsx` (~line 175): same
- `src/pages/ocs/OCSSections.tsx` (~line 322): `grid-cols-3` → `grid-cols-1 sm:grid-cols-3` (room/schedule input row)
- `src/pages/ocs/OCSPayments.tsx` (~line 663): `grid-cols-3` → `grid-cols-1 sm:grid-cols-3` (payment method buttons)

## Fix 4 — Weekly timetable grids (grid-cols-7)
These squeeze 7 day-columns + times into unreadable slivers on phones. Wrap each timetable grid in a horizontal-scroll container with a sensible `min-width` so columns stay legible and the user swipes/scrolls horizontally instead of the text becoming unreadable:
- `src/pages/student/StudentEnlistment.tsx` (~lines 1968, 1972 — header row + grid body, must scroll together)
- `src/pages/faculty/FacultyTimetable.tsx` (~lines 59, 66 — header row + grid body)

## Out of scope
- No visual redesign — purely structural/responsive fixes (wrapping, breakpoint classes, max-height).
- PDF/print template HTML strings are not touched (they target print paper sizes, not device screens).
- No changes to sidebar/nav (already responsive) or Login/Index (already responsive).
