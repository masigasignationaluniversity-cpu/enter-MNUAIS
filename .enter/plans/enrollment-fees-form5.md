# Student Adviser Feature Plan

## Context
Add a Student Adviser assignment system:
- OCS can assign faculty advisers to students (same college filter)
- Faculty can view their advisees with academic details
- Form 5 PDF shows the assigned adviser name

---

## 1. DB Migration
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adviser_id TEXT;
```

---

## 2. Types (`src/lib/types.ts`)
Add to `User` interface:
```typescript
adviserId?: string;
```

---

## 3. AppContext (`src/contexts/AppContext.tsx`)
- **`profileToUser`**: add `adviserId: p.adviser_id ?? undefined`
- **`updateUser`**: add `if (profileUpdates.adviserId !== undefined) dbUpdates.adviser_id = profileUpdates.adviserId || null;`

---

## 4. OCS Adviser Page (`src/pages/ocs/OCSAdviser.tsx`)
- Table of all students from OCS's college (same filter as OCSStudents)
- Columns: Student No., Name, Program, Year Level, Current Adviser
- Each row has a Select dropdown populated with faculty from same college
- Save on change via `updateUser(studentId, { adviserId: selectedId })`
- Search bar by name/student number
- "Clear" option to remove adviser

**Pattern**: Reuse `studentInMyCollege` pattern from OCSStudents.tsx

---

## 5. Faculty Advisee Page (`src/pages/faculty/FacultyAdvisees.tsx`)
- List students where `student.adviserId === currentUser.id`
- Columns: Student No., Name, College, Program, Year Level, GWA (Term), GWA (Cum), Enrollment Status (Finalized/Enlisted/Not Enrolled)
- Uses `computeGWA(studentId, termId)` and `computeGWA(studentId)` for GWA
- Uses `getYearClassification` for year level from academic.ts
- No-data state when no advisees assigned

---

## 6. Form 5 PDF (`src/pages/student/StudentEnlistment.tsx`)
Line 999 already has "Signature & Printed Name of Adviser" field. Populate it:
```javascript
const adviser = state.users.find(u => u.id === student.adviserId);
const adviserName = adviser ? adviser.name : '';
```
Then replace the blank line with `${adviserName}`.

---

## 7. Router (`src/router.tsx`)
Add two new routes:
```typescript
import OCSAdviser from "./pages/ocs/OCSAdviser";
import FacultyAdvisees from "./pages/faculty/FacultyAdvisees";

{ path: "/ocs/adviser", name: "ocs-adviser", element: p(<OCSAdviser />) },
{ path: "/faculty/advisees", name: "faculty-advisees", element: p(<FacultyAdvisees />) },
```

---

## 8. Navigation (`src/components/shared/PortalLayout.tsx`)
- OCS nav: add `{ label: 'Student Adviser', path: '/ocs/adviser', icon: <UserCog size={16} /> }` under student management group
- Faculty nav: add `{ label: 'My Advisees', path: '/faculty/advisees', icon: <Users size={16} /> }`
- Add page descriptions for both routes

---

## Files Modified
1. `supabase/migrations/...` — DB migration
2. `src/lib/types.ts` — User.adviserId
3. `src/contexts/AppContext.tsx` — profileToUser + updateUser
4. `src/pages/ocs/OCSAdviser.tsx` — NEW
5. `src/pages/faculty/FacultyAdvisees.tsx` — NEW
6. `src/pages/student/StudentEnlistment.tsx` — Form 5 adviser name
7. `src/router.tsx` — routes
8. `src/components/shared/PortalLayout.tsx` — navigation
