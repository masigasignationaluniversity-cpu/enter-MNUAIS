# OCS: Grade/Enrollment Management Module + Bug Fix

## Tasks

### 1. New OCS Module — "Grade & Enrollment Management" (`/ocs/grade-management`)
Three-tab page for OCS staff:

**Tab A — Grade Records**
- Search student by name / student number
- Select term (dropdown)
- Shows table: section code, course code, title, enrolled status, current grade
- Inline grade editing (GradeValue dropdown) + "Save" per row — calls `ocsUpdateGrade`
- "Add Grade Record" for enrolled students missing a grade row

**Tab B — Manual Enrollment**
- Same student+term selector
- Shows current enrolled sections
- "Add Section" → searchable section picker (filtered by term, excludes already-enrolled) → calls `ocsManualEnroll` (no restriction checks; directly creates enrollment + grade row with `grade:null, submitted:false`)
- "Remove" from enrollment (calls existing `removeSection`)

**Tab C — Term Settings**
- Add new term (form identical to admin term control, uses existing `addTerm`)
- Per-student max units override: search student → enter custom units for that term → "Save Override" → calls `setStudentMaxUnitsOverride`
- Shows table of existing overrides for the active term

---

### 2. OCS Per-Student Max Units Override

**`src/lib/types.ts`**
- Add `studentMaxUnitsOverrides?: Record<string, number>` to `Term` interface (key = studentId)

**`src/contexts/AppContext.tsx`**
- Add interface method: `setStudentMaxUnitsOverride(termId: string, studentId: string, units: number | null): void`
- Implementation: updates `term.studentMaxUnitsOverrides` via `updateTermSettings` and saves via `saveAppSetting('terms', ...)`
- Add `ocsManualEnroll(studentId, sectionId, termId)` — creates `Enrollment` (status='enrolled') + `Grade` (null, unsubmitted) → saves to DB; skips all restriction checks
- Add `ocsUpdateGrade(studentId, sectionId, termId, grade)` — upserts a grade record: finds existing by studentId+sectionId+termId, updates it; if not found, creates new. Sets `submitted: true` when grade is non-null.
- Interface additions: `ocsManualEnroll`, `ocsUpdateGrade`, `setStudentMaxUnitsOverride`

**`src/pages/student/StudentEnlistment.tsx`**
- Change `const maxUnits = activeTerm.maxUnits ?? 21;` to:
  `const maxUnits = activeTerm.studentMaxUnitsOverrides?.[student.id] ?? activeTerm.maxUnits ?? 21;`

**`src/pages/student/StudentChangeDropModal.tsx`**
- Same override for `maxUnits` inside `getRestrictions`

---

### 3. Fix: Change/Drop Requests Not Appearing in OCS

**Root cause**: The realtime subscription only listens for `'UPDATE'` events on `app_settings`. When the very first change/drop request is submitted, `saveAppSetting` does an `INSERT` (row doesn't exist yet), which the listener misses.

**Fix in `src/contexts/AppContext.tsx`**:
- Change `{ event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'key=eq.change_drop_requests' }` → `{ event: '*', ... }` to catch both INSERT and UPDATE.

---

### 4. Router + Navigation

**`src/router.tsx`**
- Add: `{ path: "/ocs/grade-management", element: <OCSGradeManagement /> }`

**`src/components/shared/PortalLayout.tsx`**
- Add to OCS nav: `{ label: 'Grade & Enrollment', path: '/ocs/grade-management', icon: <Award size={16} /> }`

---

## Critical Files
- `src/lib/types.ts`
- `src/contexts/AppContext.tsx` (realtime fix + 3 new functions + interface)
- `src/pages/ocs/OCSGradeManagement.tsx` (new file)
- `src/components/shared/PortalLayout.tsx` (nav)
- `src/router.tsx` (route)
- `src/pages/student/StudentEnlistment.tsx` (maxUnits override)
- `src/pages/student/StudentChangeDropModal.tsx` (maxUnits override)

## Reused Existing Context Functions
- `addTerm` — for creating terms in OCS
- `removeSection` — for removing from enrollment in Tab B
- `submitGrade` (superseded by `ocsUpdateGrade`)
- `updateTermSettings` — for saving term maxUnits overrides

## Verification
1. OCS sees all change/drop requests immediately (even first-ever submission)
2. OCS can edit a grade and it persists (faculty portal reflects updated grade)
3. OCS can manually enroll a student → student sees the section in their enrollment
4. OCS sets a per-student max units override → student's unit limit changes in their portal
5. OCS can add a new term → appears in all term selectors
