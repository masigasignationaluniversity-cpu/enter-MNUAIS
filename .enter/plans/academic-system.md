# Academic System Enhancement Plan

## Context
Multiple connected enhancements to the degree program, scholar standing, and POS systems.

---

## 1. Degree Program Type Field

### `src/lib/types.ts`
Add to `DegreeProgram`:
```ts
degreeType?: 'bachelors' | 'masters' | 'doctorate' | 'associate_certificate';
```
Helper: programs with no `degreeType` default to Bachelor's behavior.

### `src/pages/admin/AdminAcademicUnits.tsx`
- Add `degreeType` field to `ProgForm` type and `emptyProg`
- Add Select dropdown in Add/Edit Program dialog: "Bachelor's Degree", "Master's Degree", "Doctorate Degree", "Associate / Certificate"
- Pass `degreeType` to `addDegreeProgram` / `updateDegreeProgram`
- Display degree type badge on program cards

---

## 2. OCS Plan of Study — POS changes per degree type

### `src/pages/ocs/OCSPlanOfStudy.tsx`
In `ProgramEditor`, derive `degreeType` from `program.degreeType`:

- **Associate/Certificate** (`associate_certificate`):
  - Hide the **Thesis** course picker panel entirely
  - Hide the **Elective GE** unit requirement section

- **Master's / Doctorate** (`masters` / `doctorate`):
  - No change to POS editor UI (OCS still configures required courses / units)

- **"Additional Required GE (Program-Specific)"** → rename to **"Additional Required Courses"**
  - Remove `c.category === 'GE'` filter — allow ALL courses from `state.courses`
  - Remove `!globalGeIds.has(c.id)` exclusion (no longer GE-only)
  - Update header label, description text, and search placeholder

---

## 3. Student Profile — degree type behavior

### `src/pages/student/StudentProfile.tsx`
Derive student's `degreeType` via `state.degreePrograms.find(p => p.name === student.program || p.id === student.program)?.degreeType`.

**Associate/Certificate:**
- Year classification is capped at Sophomore: `getYearClassification` result clamped — if result is `'Junior'` or `'Senior'`, display as `'Sophomore'`

**Master's / Doctorate:**
- Hide year classification badge and "Year Classification" panel
- Replace with a "Program Progress" section: progress bar + `(completionPct * 100).toFixed(1)%` completion
- No Freshman/Sophomore/Junior/Senior label

**Scholar standing in Mid-Term:**
- If `activeTerm?.semester === 'Mid-Term'`: suppress College/University Scholar for that term

---

## 4. Scholar Standing — Units + Underload Gate

### New type in `src/lib/types.ts`
```ts
export type UnderloadApplicationStatus = 'pending' | 'approved' | 'denied';
export interface UnderloadApplication {
  id: string;
  studentId: string;
  termId: string;
  reason: string;
  status: UnderloadApplicationStatus;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  response?: string;
}
```

Add to `Term`:
```ts
underloadFrom?: string;   // ISO datetime: underload application window opens
underloadUntil?: string;  // ISO datetime: underload application window closes
```

Add to `AppState`:
```ts
underloadApplications: UnderloadApplication[];
```

### DB migration
```sql
CREATE TABLE underload_applications (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  term_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by TEXT,
  response TEXT
);
ALTER TABLE underload_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users can access underload_applications"
  ON underload_applications FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE underload_applications;
```

### `src/contexts/AppContext.tsx`
- Add `underloadApplications: []` to initial state
- Add `loadUnderloadApplications` (select all, map rows)
- Add `submitUnderloadApplication(termId, reason)` — insert with `id = 'ul-' + Date.now()`, studentId = currentUser.id
- Add `processUnderloadApplication(id, status, response?)` — update row, update state
- Expose all three in context interface
- Add realtime subscription for `underload_applications`
- Call `loadUnderloadApplications` on initial load

### Scholar standing gate (per-term honorific check)

**In `src/pages/student/StudentProfile.tsx`** — update `getTermHonorific` call per term:
1. If `term.semester === 'Mid-Term'` → skip (no scholar)
2. Count units **enlisted** (not just graded) for that term from `state.enrollments` (non-dropped, non-PE, non-NSTP)
3. If enlisted units < 15:
   - Check `state.underloadApplications.find(a => a.studentId === me.id && a.termId === term.id && a.status === 'approved')`
   - If no approved underload → skip (not eligible)
   - If approved underload → proceed (candidate; still subject to GWA/grade checks)
4. Call existing `getTermHonorific(gwa, gradesArr)` as before (it already checks grade ≥ 3.0 and INC conditions)

---

## 5. Admin: Underload Window in Term Settings

### `src/pages/admin/AdminTermControl.tsx`
- Add `underloadFrom: string` and `underloadUntil: string` to `EditForm` type and `emptyEditForm`
- Load from `term.underloadFrom` / `term.underloadUntil` when opening edit dialog
- Save via `updateTermSettings` with `underloadFrom` / `underloadUntil`
- Add `WindowRow` entry in the term card summary view (icon: `UserX` or `Users`)
- Add `DateTimeRangeRow` in the edit form under "Student Requests" section

---

## 6. OCS: Underload Applications Page

### New file: `src/pages/ocs/OCSUnderload.tsx`
Follow exact same pattern as `OCSSpecialization.tsx`:
- List pending underload applications for the active term from OCS's college students
- Filter by college: `state.users.find(u => u.id === app.studentId)?.college === ocsCollegeId`
- Show student name, student number, reason, requested date
- Accept / Decline buttons (with optional response text)
- Call `processUnderloadApplication(id, 'approved'|'denied', response)`
- Show window status (open/upcoming/ended) based on `activeTerm.underloadFrom/Until`

### `src/router.tsx`
Add route: `{ path: "/ocs/underload", element: <OCSUnderload /> }`

### Portal navigation
Add "Underload Applications" link to OCS nav (alongside Specialization, Reconsideration, etc.)

---

## 7. Student: Underload Application Banner

### `src/pages/student/StudentEnlistment.tsx`
After the existing late enrollment banner pattern, add an **Underload Application banner** that appears when:
- `activeTerm.underloadFrom` and `activeTerm.underloadUntil` are set
- Current time is within the window
- Student's enlisted units < 15 (non-PE/NSTP)
- Student has NOT already submitted an underload application for this term

Banner shows:
- "Your enlisted units are below 15. Apply for Underload consideration to remain eligible for College/University Scholar."
- Reason textarea + submit button
- If already submitted: show status badge (Pending / Approved / Denied)

---

## Critical Files Modified
1. `src/lib/types.ts` — DegreeProgram + UnderloadApplication + Term additions
2. `src/contexts/AppContext.tsx` — load/submit/process underload applications
3. `src/pages/admin/AdminAcademicUnits.tsx` — degree type dropdown
4. `src/pages/admin/AdminTermControl.tsx` — underload window settings
5. `src/pages/ocs/OCSPlanOfStudy.tsx` — conditional panels + rename/all-courses GE section
6. `src/pages/ocs/OCSUnderload.tsx` — NEW file
7. `src/pages/student/StudentProfile.tsx` — degree type display + scholar gate
8. `src/pages/student/StudentEnlistment.tsx` — underload banner
9. `src/router.tsx` — new OCS route

## Verification
- Add a "Master's Degree" program → StudentProfile shows progress bar, no year classification
- Add "Associate/Certificate" program → POS shows no Thesis/Elective GE panels; year classification capped at Sophomore
- Set underload window in Admin term settings → banner appears in StudentEnlistment for students with < 15 units
- OCS can approve/deny from OCSUnderload page
- Mid-Term active → no College/University Scholar badge shown per-term
- Student with < 15 units but approved underload still shows scholar if GWA qualifies
