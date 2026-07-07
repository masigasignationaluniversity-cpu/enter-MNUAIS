# UI Theme Unification — All Modules & Portals

## Context
The app has a strong design system (`.portal-panel`, `.portal-panel-header`, `StatusBanner`, `.banner-*`, `AppDialog`) but many pages bypass it with ad-hoc inline colored divs (bg-sky-50, bg-amber-50, bg-blue-50, bg-indigo-50, bg-teal-50, etc.) for info boxes, warnings, result notices, and form hints. This creates visual inconsistency across Student, OCS, Faculty, and Admin portals.

**Three core problems:**
1. **Ad-hoc inline info/note boxes** — random color combos (sky vs blue vs teal vs indigo for "info", etc.)
2. **Class card sub-headers in StudentEnlistment** — use hardcoded `bg-blue-500` instead of the maroon primary theme
3. **Payment hold block in StudentEnlistment** — manually rebuilds a StatusBanner instead of using the component

## Approach

### Step 1 — Add `.info-note` CSS utilities to `index.css`
Compact inline info boxes (smaller than `.banner`, no icon required, used inside dialogs, panels, cards):
```css
.info-note { @apply flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs border border-l-[3px]; }
.info-note > svg { @apply flex-shrink-0 mt-0.5; }
.info-note-info    { background: linear-gradient(135deg, hsl(204 95% 97%), hsl(208 90% 94%)); @apply border-sky-200 border-l-sky-500 text-sky-800; }
.info-note-warning { background: linear-gradient(135deg, hsl(46 100% 97%), hsl(40 90% 94%));  @apply border-amber-200 border-l-amber-500 text-amber-800; }
.info-note-error   { background: linear-gradient(135deg, hsl(0 80% 97%), hsl(0 72% 94%));     @apply border-red-200 border-l-red-500 text-red-800; }
.info-note-success { background: linear-gradient(135deg, hsl(148 62% 97%), hsl(148 55% 94%)); @apply border-emerald-200 border-l-emerald-500 text-emerald-800; }
.info-note-deadline{ background: linear-gradient(135deg, hsl(26 90% 97%), hsl(22 85% 94%));   @apply border-orange-200 border-l-orange-500 text-orange-800; }
/* dark variants for all 5 */
```

Also add `.section-card-header` for class card sub-headers (Lecture/Main, Laboratory, Select Group):
```css
.section-card-header {
  @apply text-white px-3 py-1.5 flex items-center justify-between gap-2 text-xs font-semibold;
  background: var(--gradient-header);
}
```

### Step 2 — Fix files (replace ad-hoc → design system classes)

**StudentEnlistment.tsx** (most changes):
- Line 2233: Replace manual amber payment-hold block → `<StatusBanner type="warning" title="Enrollment Hold — Unsettled Account" ...>`
- Lines 3579, 3613, 3664: `bg-blue-500 px-3 py-1.5` → `section-card-header`
- Line 2644: `rounded-lg bg-sky-50/70 border border-sky-200 ... text-sky-800` → `info-note info-note-info`
- Line 3790: `rounded-lg bg-orange-50/70 border border-orange-200 ... text-orange-800` → `info-note info-note-deadline`
- Line 2810: `bg-green-50 border border-green-200 text-green-800` content block → `info-note info-note-success`
- Line 2826: `bg-amber-50 border border-amber-200 text-amber-800` / `bg-destructive/5` block → `info-note info-note-warning` / `info-note info-note-error`
- Lines 2884-2929: Enrollment schedule block (bg-green-50/bg-blue-50, indigo/teal sub-blocks) → `info-note info-note-open/info` unified colors
- Lines 3236/3245: Dashed amber/red lab-picker placeholder boxes → keep dashed border but use consistent amber-50/red-50 from design tokens

**StudentChangeDropModal.tsx**:
- Line 709: `rounded-lg border border-orange-300 bg-orange-50` / `border-emerald-200 bg-emerald-50` → `info-note info-note-warning` / `info-note-success`
- Line 758: `border-blue-200 bg-blue-50 text-blue-800` → `info-note info-note-info`
- Lines 966, 976: `bg-amber-50 border-amber-200 text-amber-700` → `info-note info-note-warning`
- Line 982: `bg-red-50 border-red-300 text-red-700` → `info-note info-note-error`

**StudentPlanOfStudy.tsx**:
- Lines 1248, 1258, 1276: `rounded-lg bg-amber-50 border border-amber-200 p-4` / emerald / red → `info-note info-note-warning/success/error`
- Line 1102: `bg-emerald-50 border-emerald-200` / `bg-amber-50 border-amber-200` → `info-note info-note-success/warning`

**StudentProfile.tsx**:
- Lines 393, 400: `bg-amber-50/70 border-amber-200` / `bg-sky-50/70 border-sky-200` → `info-note info-note-warning` / `info-note info-note-info`

**StudentGrades.tsx**:
- Line 340: deadline badges (red/amber/blue) → standardize to destructive / amber / sky tokens (consistent)

**StudentGeElective.tsx & StudentSpecialization.tsx**:
- Sub-header amber banners → `info-note info-note-warning`

**OCSReconsideration.tsx**:
- Status config maps: update `bg` property to use `info-note` classes or CSS-var-based consistent tokens
- Lines 333, 444: `bg-emerald-50 border-emerald-200 text-emerald-800` / `bg-red-50` → `info-note info-note-success/error`
- Line 577: `bg-amber-50 border-amber-200 text-amber-800` → `info-note info-note-warning`
- Line 591: `bg-red-50/40 border-red-200` → `info-note info-note-error`

**OCSChangeDrop.tsx**:
- Status config maps: same pattern as OCSReconsideration
- Line 343: result box → `info-note info-note-success/error`

**OCSGradeManagement.tsx**:
- Line 1388: `border-amber-200 bg-amber-50 text-amber-800` → `info-note info-note-warning`
- Line 1009: `border-emerald-200 bg-emerald-50` → `info-note info-note-success`

**OCSSections.tsx**:
- Line 322: `border-amber-200 bg-amber-50/40 text-amber-700` → `info-note info-note-warning`

**FacultyRemovalGrades.tsx**:
- Line 352: `border-sky-200 bg-sky-50/70 text-blue-900` → `info-note info-note-info`
- Lines 420, 451, 457, 463, 470, 521: red/amber/blue/green inline boxes → `info-note info-note-error/warning/info/success`

**AdminRooms.tsx & AdminAcademicUnits.tsx**:
- Amber list-item cards → `info-note info-note-warning` (compact)

**AdminTermControl.tsx**:
- `SectionBlock` color props: replace indigo/teal/orange/blue/green/amber → use primary/secondary/warning tokens
- Phase border classes: `border-indigo-300 bg-indigo-50` / `border-teal-300 bg-teal-50` / `border-amber-300 bg-amber-50` → consolidate to `border-primary/30 bg-primary/5` / `border-secondary/30 bg-secondary/5` / `border-amber-200 bg-amber-50`

**AdminGraduationSettings.tsx**:
- Line 224: `border-sky-200 bg-sky-50 text-sky-700` → `info-note info-note-info`

## Files Modified
1. `src/index.css` — add `.info-note`, `.section-card-header`
2. `src/pages/student/StudentEnlistment.tsx`
3. `src/pages/student/StudentChangeDropModal.tsx`
4. `src/pages/student/StudentPlanOfStudy.tsx`
5. `src/pages/student/StudentProfile.tsx`
6. `src/pages/student/StudentGrades.tsx`
7. `src/pages/student/StudentGeElective.tsx`
8. `src/pages/student/StudentSpecialization.tsx`
9. `src/pages/ocs/OCSReconsideration.tsx`
10. `src/pages/ocs/OCSChangeDrop.tsx`
11. `src/pages/ocs/OCSGradeManagement.tsx`
12. `src/pages/ocs/OCSSections.tsx`
13. `src/pages/faculty/FacultyRemovalGrades.tsx`
14. `src/pages/admin/AdminRooms.tsx`
15. `src/pages/admin/AdminAcademicUnits.tsx`
16. `src/pages/admin/AdminTermControl.tsx`
17. `src/pages/admin/AdminGraduationSettings.tsx`

## Verification
- All "info" boxes should use sky/blue tones (`.info-note-info`)
- All "warning" boxes should use amber tones (`.info-note-warning`)
- All "error" boxes should use red tones (`.info-note-error`)
- All "success" boxes should use emerald tones (`.info-note-success`)
- All "deadline/caution" boxes should use orange tones (`.info-note-deadline`)
- Class card headers in enlistment should be maroon (not blue)
- No ad-hoc `bg-sky-50`, `bg-indigo-50`, `bg-teal-50` for info boxes
- `run_lint` should pass with no new errors
