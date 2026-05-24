# User Management Revision + Academic Units Module

## Context
Admin needs:
1. Role-based form fields when adding/editing users (different fields per role)
2. A new "Academic Units" admin module to manage Colleges, Departments, and Degree Programs
3. Department/Program dropdowns in user forms populated from the Academic Units module

---

## Changes

### 1. `src/lib/types.ts`
Add three new interfaces + extend AppState:
```ts
export interface College { id: string; name: string; abbreviation: string; }
export interface Department { id: string; name: string; collegeId: string; abbreviation: string; }
export interface DegreeProgram { id: string; name: string; abbreviation: string; departmentId: string; }

// AppState gains:
colleges: College[];
departments: Department[];
degreePrograms: DegreeProgram[];
```

### 2. `src/lib/mockData.ts`
Add seed data for colleges, departments, degree programs + initialState fields.

### 3. `src/contexts/AppContext.tsx`
Add context type + implementations:
- `addCollege / updateCollege / deleteCollege`
- `addDepartment / updateDepartment / deleteDepartment`
- `addDegreeProgram / updateDegreeProgram / deleteDegreeProgram`
All use `update()` helper (localStorage-backed).

### 4. `src/pages/admin/AdminUsers.tsx` — Role-based form
The form now adapts to the selected role:

| Role | Fields shown |
|---|---|
| admin | Name, Username, Password, Email |
| ocs | Name, Username, Password, Email, Department (dropdown), Employee ID |
| faculty | Name, Username, Password, Email, Department (dropdown), Employee ID |
| student | Name, Username, Password, Email, Student Number, Degree Program (dropdown → Department auto-fills), Year Level |

- Department dropdown: filtered from `state.departments`
- Program dropdown: filtered from `state.degreePrograms` (shows all, grouped optionally)
- When a program is selected for a student, department is auto-populated from the program's departmentId
- Transfer dialog: Program dropdown replaces free-text input
- Link/button to navigate to Academic Units page

### 5. `src/pages/admin/AdminAcademicUnits.tsx` — NEW page
Three-tab layout: **Colleges | Departments | Programs**

**Colleges tab**: Table with Name, Abbreviation. Add/Edit/Delete inline.

**Departments tab**: Table with Name, Abbreviation, College. Add/Edit/Delete. College is a dropdown.

**Programs tab**: Table with Name, Abbreviation, Department, College (derived). Add/Edit/Delete. Department is a dropdown.

### 6. `src/router.tsx`
Add: `{ path: "/admin/academic-units", element: <AdminAcademicUnits /> }`

### 7. `src/components/shared/PortalLayout.tsx`
Add to admin nav: `{ label: 'Academic Units', path: '/admin/academic-units', icon: <Building2 size={16} /> }`

---

## Verification
- Create a College → it appears in Department dropdown
- Create a Department under that College → it appears in OCS/Faculty user form dropdown
- Create a Degree Program → it appears in Student user form dropdown
- Selecting a program in Student form auto-fills the department
- Role switch in Add User form shows only relevant fields
