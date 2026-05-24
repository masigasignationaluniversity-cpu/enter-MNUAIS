# Feature Plan: User Management + Academic Units + Enlistment + Consents

## 5 Features

1. **Role-based user form** — AdminUsers.tsx
2. **Academic Units module** — new admin page (Colleges, Departments, Programs)
3. **Remove Action column** — StudentEnlistment.tsx Search tab
4. **Pre/Co-req in OCS Consent processing** — OCSConsents.tsx (already has display; verify/ensure complete)
5. **New Faculty Consents page** — FacultyConsents.tsx (COI + Dept Consent with pre/co-req display)

---

## Feature 1: Role-Based User Form (AdminUsers.tsx)

The Add/Edit form renders only fields relevant to the selected role:

| Role    | Fields                                                                                        |
|---------|-----------------------------------------------------------------------------------------------|
| admin   | Name, Username, Password, Email                                                               |
| ocs     | Name, Username, Password, Email, Department (dropdown → `state.departments`), Employee ID    |
| faculty | Name, Username, Password, Email, Department (dropdown → `state.departments`), Employee ID    |
| student | Name, Username, Password, Email, Student Number, Degree Program (dropdown → `state.degreePrograms`), Year Level |

- Department dropdown groups/filters from `state.departments` (name field)
- Program dropdown from `state.degreePrograms` (name field)
- Transfer dialog: program field → dropdown from `state.degreePrograms`
- Add link: `<Button variant="link" onClick={() => navigate('/admin/academic-units')}>Manage Academic Units</Button>` near form header

---

## Feature 2: Academic Units Module

### Data (types.ts + AppState)
```ts
export interface College      { id: string; name: string; abbreviation: string; }
export interface Department   { id: string; name: string; abbreviation: string; collegeId: string; }
export interface DegreeProgram{ id: string; name: string; abbreviation: string; departmentId: string; }
// AppState: add  colleges, departments, degreePrograms arrays
```

### mockData.ts seed
```
Colleges: College of Computer Studies (CCS), College of Engineering (COE), College of Science (COS)
Departments: Computer Science → CCS | Information Technology → CCS | Computer Engineering → COE | Mathematics → COS
Programs: BSCS → CS | BSIT → IT | BSCpE → CpE | BSMATH → Math
```

### AppContext — 9 new CRUD functions (same `update()` pattern):
`addCollege / updateCollege / deleteCollege`
`addDepartment / updateDepartment / deleteDepartment`
`addDegreeProgram / updateDegreeProgram / deleteDegreeProgram`

### AdminAcademicUnits.tsx (NEW)
Three-tab page: **Colleges | Departments | Programs**
- Each tab: table list + inline Add form + Edit (pencil) + Delete (trash + confirm dialog)
- Departments tab: College column + College dropdown in form
- Programs tab: Department column + College (derived) + Department dropdown in form
- Route: `/admin/academic-units`
- Nav: Add `{ label: 'Academic Units', path: '/admin/academic-units', icon: <Building2/> }` to admin nav in PortalLayout.tsx

---

## Feature 3: Remove Action Column — StudentEnlistment.tsx

In the **Search Courses** tab table:
- Remove `<TableHead>Action</TableHead>` column header
- Remove the `actionBtn` logic and its `<TableCell>` from each row
- Keep the Cart column (Add to Cart / Remove from Cart buttons) — this is how students select sections
- The Course Bin tab already has the Enlist/Enlist All buttons

---

## Feature 4: Pre/Co-req in OCSConsents.tsx

OCSConsents.tsx `ConsentCard` already has a prereq/coreq block from the previous session. Ensure it displays both `coiStatus`, `deptConsentStatus`, and `ocsConsentStatus` sections with course prereq/coreq. If any is missing, add the same pattern:
```tsx
<div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
  <span><span className="font-semibold">Pre:</span> {prereqNames || 'None'}</span>
  <span><span className="font-semibold">Co:</span> {coreqNames || 'None'}</span>
</div>
```

---

## Feature 5: Faculty Consents Page (NEW: FacultyConsents.tsx)

Faculty currently has NO page for processing COI (Consent of Instructor) or Dept Consent. Create it.

### Page structure
- Two tabs: **COI Requests | Dept Consent Requests**
- Each tab shows ConsentCard components for pending and processed requests
- Filter: only consents for sections where `section.facultyId === faculty.id`

### ConsentCard content (per consent):
- Student name, student number, program, year
- Section code + course code + course title
- **Pre/Co-req block** (same as OCSConsents pattern):
  ```tsx
  <span>Pre: {prereqNames || 'None'}</span>
  <span>Co: {coreqNames || 'None'}</span>
  ```
- Student's reason/remarks
- Approve / Deny buttons (calls `updateConsentStatus(id, 'coiStatus' | 'deptConsentStatus', status)`)

### Router + Nav
- Route: `{ path: "/faculty/consents", element: <FacultyConsents /> }`
- PortalLayout faculty nav: `{ label: 'Consents', path: '/faculty/consents', icon: <ClipboardList size={16}/> }`

---

## Files to Change

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add College, Department, DegreeProgram interfaces; extend AppState |
| `src/lib/mockData.ts` | Add seed data + initialState fields |
| `src/contexts/AppContext.tsx` | Add 9 CRUD functions + context type entries |
| `src/pages/admin/AdminUsers.tsx` | Role-based form fields + dropdowns |
| `src/pages/admin/AdminAcademicUnits.tsx` | **NEW** — 3-tab Colleges/Depts/Programs manager |
| `src/pages/faculty/FacultyConsents.tsx` | **NEW** — COI + Dept Consent processing with pre/co-req |
| `src/router.tsx` | Add `/admin/academic-units` and `/faculty/consents` routes |
| `src/components/shared/PortalLayout.tsx` | Add nav items for admin (Academic Units) + faculty (Consents) |
| `src/pages/student/StudentEnlistment.tsx` | Remove Action column from Search tab |
| `src/pages/ocs/OCSConsents.tsx` | Verify/ensure pre/co-req display is complete for all consent types |
