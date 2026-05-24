# Academic Information System — Implementation Plan

## Context
Build a full Academic Information System with 4 role-based portals (Admin, OCS, Faculty, Student) using mock data (localStorage-backed state), green + maroon theme, and separate login pages per role.

---

## Design System Changes
**`src/index.css`** — Replace tokens with green/maroon university theme:
- `--primary`: Maroon (`348 83% 28%`)
- `--secondary`: Green (`142 60% 30%`)
- `--accent`: Light green tint
- Sidebar uses maroon background with green active highlights
- Custom tokens: `--maroon`, `--green`, gradients, shadows

**`tailwind.config.ts`** — Add `maroon` and `green` color keys pointing to CSS vars.

---

## Data Layer
**`src/lib/types.ts`** — All TypeScript interfaces:
`User`, `Term`, `Course`, `Section`, `Schedule`, `Enrollment`, `Grade`, `Consent`, `Evaluation`, `GradeRecord`

**`src/lib/mockData.ts`** — Seeded demo data:
- 1 admin, 2 OCS users, 3 faculty, 6 students
- 2 terms (1 active), sample courses + sections with schedules
- Pre-filled enrollments + grades for demo

**`src/lib/store.ts`** — localStorage-backed state manager (read/write helpers, React context provider)

**`src/contexts/AppContext.tsx`** — Global provider wrapping the app, exposes `useApp()` hook

---

## Routing (`src/router.tsx`)
```
/                    → Landing (Portal Selector)
/admin               → Admin Login
/admin/dashboard     → Admin Dashboard
/admin/terms         → Term Control
/admin/users         → User Management
/ocs                 → OCS Login
/ocs/dashboard       → OCS Dashboard
/ocs/courses         → Course Management
/ocs/sections        → Section/Slot Management
/ocs/consents        → OCS Consent Approvals
/faculty             → Faculty Login
/faculty/dashboard   → Faculty Dashboard
/faculty/classes     → My Classes
/faculty/grades      → Grade Encoding
/faculty/evaluations → View Student Evaluations
/student             → Student Login
/student/dashboard   → Student Dashboard
/student/enlistment  → Enlistment + Timetable
/student/consent     → Consent Management (COI/Dept/OCS)
/student/grades      → View Grades
/student/profile     → Profile + GWA
/student/evaluation  → Submit Faculty Evaluations
```

---

## File Structure
```
src/
  lib/
    types.ts
    mockData.ts
    store.ts
  contexts/
    AppContext.tsx
  components/
    ui/          (existing shadcn)
    shared/
      PortalLayout.tsx    (sidebar layout reused across roles)
      Timetable.tsx       (schedule grid for student enlistment)
      GradeTable.tsx      (reusable grade display)
      ConsentCard.tsx     (consent action card)
  pages/
    Index.tsx             (Portal Selector landing page)
    admin/
      AdminLogin.tsx
      AdminDashboard.tsx
      AdminTermControl.tsx
      AdminUsers.tsx
    ocs/
      OCSLogin.tsx
      OCSDashboard.tsx
      OCSCourses.tsx
      OCSSections.tsx
      OCSConsents.tsx
    faculty/
      FacultyLogin.tsx
      FacultyDashboard.tsx
      FacultyClasses.tsx
      FacultyGradeEncoding.tsx
      FacultyEvaluations.tsx
    student/
      StudentLogin.tsx
      StudentDashboard.tsx
      StudentEnlistment.tsx
      StudentConsent.tsx
      StudentGrades.tsx
      StudentProfile.tsx
      StudentEvaluation.tsx
```

---

## Feature Details

### Admin
- Term Control: toggle Active/Inactive for Enlistment, Enrollment, FIC Eval, Grade Submission
- User Management: view all users by role

### OCS
- Courses: add course with type (Lec | Lab | Recitation | Lec+Lab), units
- Sections: assign faculty, set slots, set schedule (day/time/room)
- Consents: approve/deny OCS consent requests from students

### Faculty
- Classes: view sections assigned by OCS with enrolled students
- Grade Encoding: table with grade input per student (1.0–3.0, 4, 5, INC, DRP), submit grades button (sends grades to students, unlocks their evaluation view)
- Removal Grades: encode removal for 4/5/INC students
- Evaluations: see evaluation results only after grades are submitted

### Student
- Enlistment: browse open sections, weekly timetable grid (MWF / TTh), overlap warning toast, enlist/drop
- Consent: COI form, Dept Consent request, OCS Consent request (each has status badge)
- Grades: visible only after submitting ALL evaluations for the term's FIC
- GWA: computed per semester and cumulative (excludes PE/NSTP courses)
- Evaluation: 5-question rating form per faculty (1–5 scale), must complete all before grades unlock

---

## Key Logic
- **Overlap Detection**: compare new section's schedule days+time against already enlisted sections
- **Grade Visibility Gate**: `canViewGrades = evaluations.filter(e => e.studentId === me && e.termId === active).length === enrolledSections.length`
- **GWA Calculation**: `sum(grade × units) / sum(units)` — filter out courses tagged `PE` or `NSTP`
- **Consent Flow**: COI → Dept Consent → OCS Consent (sequential unlock)

---

## Demo Credentials (mock data)
| Role    | Username         | Password  |
|---------|-----------------|-----------|
| Admin   | admin            | admin123  |
| OCS     | ocs1             | ocs123    |
| Faculty | faculty1         | faculty123|
| Student | student1         | student123|

---

## Verification
1. Login as each role and verify sidebar nav items
2. Admin: toggle term controls and confirm OCS/Student flows respond
3. Student: enlist two overlapping sections → see warning toast
4. Faculty: submit grades → student evaluation unlocks
5. Student: submit all evaluations → grades become visible
6. Student profile: GWA excludes PE/NSTP courses
