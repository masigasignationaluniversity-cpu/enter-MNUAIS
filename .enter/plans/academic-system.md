# Graduation Application Feature

## Context
Students who complete all graduation requirements need to submit a formal "Application for Graduation" through the system. OCS reviews and approves/denies it. Upon OCS approval, students can print a formal document listing all their courses, all grade attempts (including retakes), and the term each was taken.

---

## Data Model

### New type in `src/lib/types.ts`
```typescript
export type GraduationApplicationStatus = 'pending' | 'approved' | 'denied';

export interface GraduationApplication {
  id: string;
  studentId: string;
  collegeId: string;
  programId?: string;
  status: GraduationApplicationStatus;
  submittedAt: string;
  processedAt?: string;
  processedBy?: string;   // OCS userId
  response?: string;      // OCS notes
}
```

Add `graduationApplications: GraduationApplication[]` to `AppState`.

---

## DB Migration

```sql
CREATE TABLE graduation_applications (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  college_id TEXT NOT NULL,
  program_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by TEXT,
  response TEXT
);
ALTER TABLE graduation_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users full access" ON graduation_applications FOR ALL USING (auth.uid() IS NOT NULL);
ALTER PUBLICATION supabase_realtime ADD TABLE graduation_applications;
```

---

## AppContext (`src/contexts/AppContext.tsx`)

### Interface additions
```typescript
submitGraduationApplication: (studentId: string, collegeId: string, programId?: string) => Promise<void>;
processGraduationApplication: (id: string, status: 'approved' | 'denied', response?: string) => Promise<void>;
loadGraduationApplications: () => Promise<void>;
```

### Implementation
- `loadGraduationApplications`: `supabase.from('graduation_applications').select('*')` → map to `GraduationApplication[]` → setState
- `submitGraduationApplication`: insert new row with `id = crypto.randomUUID()`, status `'pending'`; update state
- `processGraduationApplication`: update row status + processedAt + processedBy + response; update state
- Add `graduationApplications: []` to `initialState` in `mockData.ts`
- Add realtime subscription for `graduation_applications` table (call `loadGraduationApplications`)
- Call `loadGraduationApplications()` in main `useEffect` and on login

---

## Student: `src/pages/student/StudentPlanOfStudy.tsx`

### When `isEligible === true`:

1. **Check for existing application**: `const myApp = state.graduationApplications.find(a => a.studentId === student.id)`

2. **No application yet** → Show "Apply for Graduation" button  
   - On click: `submitGraduationApplication(student.id, studentCollegeId, student.program)`

3. **Pending** → Show status badge "Application Submitted — Pending OCS Review"

4. **Denied** → Show denial notice with OCS response + allow re-submission

5. **Approved** → Show approval notice + "Print Application for Graduation" button

### Printable Application for Graduation (on print click)
Opens `window.open()` print dialog containing:
- **Header**: institution name, "APPLICATION FOR GRADUATION", academic year
- **Student Info block**: name, student number, program, college, date applied
- **Course table** (per panel section: GE, HK/PE/NSTP, Major, Thesis, Elective GE, Specialized):
  - Columns: Code | Title | Units | Term | Grade | Remarks (Passed/Failed/Retake)
  - For courses with multiple grade records (retakes): show ALL rows per attempt, oldest first
  - Label retakes: e.g., "Retake (1st attempt: 2.5, 2022-2023 1st Sem)"
- **OCS Approval section**: "Approved by: [OCS user name]", date approved

### Building the grade history per course
```typescript
// All grade records for this student, grouped by courseId
const gradeHistory = useMemo(() => {
  const map = new Map<string, Array<{ term: string; grade: string; isRetake: boolean }>>();
  state.grades
    .filter(g => g.studentId === student.id)
    .forEach(g => {
      const sec = state.sections.find(s => s.id === g.sectionId);
      if (!sec) return;
      const term = state.terms.find(t => t.id === sec.termId);
      const termName = term ? `${term.academicYear} ${term.semester}` : '—';
      const effective = (g.removalSubmitted && g.removalGrade) ? g.removalGrade : g.grade;
      if (!effective) return;
      const entry = { term: termName, grade: effective };
      const arr = map.get(sec.courseId) ?? [];
      arr.push(entry);
      map.set(sec.courseId, arr);
    });
  return map;
}, [state.grades, state.sections, state.terms, student.id]);
```

---

## OCS: New `src/pages/ocs/OCSGraduationApplications.tsx`

**Layout**: `PortalLayout` with 2 tabs: "Pending" | "All Applications"

**Per application card/row**:
- Student name, student number, program, college
- Date submitted
- Status badge
- "Approve" / "Deny" buttons (pending only) — deny opens dialog for response note

**Approve action**: `processGraduationApplication(id, 'approved')`  
**Deny action**: opens a dialog with a Textarea for notes → `processGraduationApplication(id, 'denied', note)`

**Filtering**: OCS sees only applications from their own college (using `ocsCollegeId` pattern from `OCSPlanOfStudy.tsx`)

---

## Router + Nav

### `src/router.tsx`
```typescript
{ path: "/ocs/graduation-applications", element: <OCSGraduationApplications /> }
```

### `src/components/shared/PortalLayout.tsx`
Add OCS nav item:
```typescript
{ label: 'Graduation Applications', path: '/ocs/graduation-applications', icon: <GraduationCap /> }
```

---

## Files to Modify/Create
1. DB migration (new table)
2. `src/lib/types.ts` — add `GraduationApplication`, `GraduationApplicationStatus`, update `AppState`
3. `src/lib/mockData.ts` — add `graduationApplications: []` to `initialState`
4. `src/contexts/AppContext.tsx` — 3 new functions, realtime sub, load on init
5. `src/pages/student/StudentPlanOfStudy.tsx` — application UI + printable document
6. `src/pages/ocs/OCSGraduationApplications.tsx` — new OCS review page
7. `src/router.tsx` — new route
8. `src/components/shared/PortalLayout.tsx` — new nav item

---

## Verification
- Student with completed requirements sees "Apply for Graduation" button
- After applying, status shows "Pending"
- OCS sees the application in their college's list
- OCS approves → student sees "Approved" + print button
- Print dialog opens with complete grade history per course (all attempts)
- OCS denies → student sees denial + reason + can re-apply
