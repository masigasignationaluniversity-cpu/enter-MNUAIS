# Specialization Planner + Timetable/Export Cleanup

## Context
Implement a full Specialization Planner feature across Student and OCS portals, restrict enlistment of Specialized courses to approved plans, clean up timetable PDF buttons, filter SC courses from Change/Drop, and add specialization change deadlines to Admin Portal Settings.

---

## Tasks

### 1. Remove PDF Export from Timetable
- `src/pages/faculty/FacultyTimetable.tsx` — Remove "Download PDF" button + `downloadTimetable` function + `downloadAsPdf` import
- `src/pages/student/StudentEnlistment.tsx` — Remove "Download PDF" button + `downloadTimetable` function + `downloadAsPdf` import

---

### 2. New Types — `src/lib/types.ts`

**Add to `PortalSettings`:**
```ts
specializationChangeDeadline?: string;   // ISO datetime: student change deadline
specializationApprovalDeadline?: string; // ISO datetime: OCS approval deadline
```

**Add new types:**
```ts
export type SpecializationRequestStatus = 'pending' | 'approved' | 'denied';

export interface SpecializationRequest {
  id: string;
  studentId: string;
  courseIds: string[];
  totalUnits: number;
  status: SpecializationRequestStatus;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  response?: string;
  isChangeRequest?: boolean;
  previousRequestId?: string;
}
```

**Add to `AppState`:**
```ts
specializationRequests: SpecializationRequest[];
```

---

### 3. AppContext — `src/contexts/AppContext.tsx`

**Import updates:** Add `SpecializationRequest`, `SpecializationRequestStatus` to import.

**Interface additions:**
```ts
submitSpecializationRequest: (studentId: string, courseIds: string[]) => Promise<void>;
cancelSpecializationRequest: (requestId: string) => void;
processSpecializationRequest: (requestId: string, status: SpecializationRequestStatus, processedBy: string, response?: string) => Promise<void>;
```

**State init guard:** `if (!s.specializationRequests) s.specializationRequests = [];`

**AppSettings load:** `if (map.specialization_requests) next.specializationRequests = ...`

**Realtime subscription:** Watch `key=eq.specialization_requests`

**`submitSpecializationRequest`:**
- Compute totalUnits from courseIds
- Check if student already has a pending request → deny (must cancel first)
- If student already has an APPROVED request: mark as change request, set `isChangeRequest=true`, `previousRequestId=<previous approved id>`
- Save via `saveAppSetting('specialization_requests', ...)`

**`cancelSpecializationRequest`:** Remove the pending request from state + resave.

**`processSpecializationRequest`:** Update status + processedAt + processedBy. If approving a change request, update the previous approved request status to 'denied' (superseded). Save via `saveAppSetting`.

**`enlistSection` restriction** (add after duplicate-course check, before consent check):
```ts
if (course.category === 'Specialized') {
  const approvedSpec = (state.specializationRequests ?? []).find(
    r => r.studentId === studentId && r.status === 'approved' && r.courseIds.includes(course.id)
  );
  if (!approvedSpec) {
    return { success: false, message: 'This is a Specialized course. You must have an approved Specialization Plan that includes this course before enlisting.' };
  }
}
```

---

### 4. Admin Portal Settings — `src/pages/admin/AdminPortalSettings.tsx`

Add two `datetime-local` input fields under a new "Specialization" section:
- **Student Change Deadline** → `portalSettings.specializationChangeDeadline`
- **OCS Approval Deadline** → `portalSettings.specializationApprovalDeadline`
Uses `updatePortalSettings` from context.

---

### 5. Student Specialization Planner — `src/pages/student/StudentSpecialization.tsx`

New page at `/student/specialization`.

**State:** `selectedCourseIds: string[]`

**Data:**
- `allSpecializedCourses` = `state.courses.filter(c => c.category === 'Specialized')`
- `maxUnits` = `collegeReq?.maxSpecialized ?? 0` (from `graduationRequirements` for student's college)
- `selectedUnits` = sum of selected courses' units
- `myRequest` = student's latest specialization request (pending or approved)
- `canChange`:
  - `specializationChangeDeadline` not passed
  - No course in approved plan has grade 4, 5, DRP, F, or U

**UI:**
- If no approved request yet: show course selection table + Submit button
- If pending request: show "pending" status card with Cancel option
- If approved request:
  - Show approved courses list
  - If `canChange`: show "Request Change" button → enters selection mode again
  - If `!canChange`: show reason why change is blocked
- Course selection table: shows all Specialized courses, checkboxes to select, shows units per course, running total vs maxUnits
- Warning if `selectedUnits > maxUnits`
- Cannot submit if no courses selected or `selectedUnits > maxUnits`

---

### 6. OCS Specialization Module — `src/pages/ocs/OCSSpecialization.tsx`

New page at `/ocs/specialization`.

**UI:**
- List all specialization requests, grouped by status (pending first)
- Filter by status, search by student name/number
- Each row: student name, program, requested courses list, total units, status badge, action buttons
- For pending: Approve / Deny buttons (with optional response textarea for Deny)
- For approved/denied: show processed date + response
- Show change requests differently (badge "Change Request")
- `specializationApprovalDeadline` → show banner if deadline has passed

---

### 7. Student Plan of Study — `src/pages/student/StudentPlanOfStudy.tsx`

Modify the Specialized `unitPanels` entry to include courses from the student's approved specialization plan, not just courses they've taken:

```ts
// In unitPanels computation:
const approvedSpec = (state.specializationRequests ?? []).find(
  r => r.studentId === currentUser.id && r.status === 'approved'
);
const specCourseIds = approvedSpec?.courseIds ?? [];
const specCoursesFromPlan = specCourseIds
  .map(id => state.courses.find(c => c.id === id))
  .filter(Boolean) as Course[];
// merge with studentCoursesByCategory.get('Specialized') (avoid duplicates)
const allSpecCourses = [
  ...(studentCoursesByCategory.get('Specialized') ?? []),
  ...specCoursesFromPlan.filter(c => !(studentCoursesByCategory.get('Specialized') ?? []).find(x => x.id === c.id))
];
// Use allSpecCourses in the Specialized unitPanel
```

---

### 8. Change/Drop Modal — `src/pages/student/StudentChangeDropModal.tsx`

- In the "Add" tab section search/filter, filter out courses where `category === 'Specialized'` from the available sections list.
- Add an info banner at the top of the "Add" tab:
  `<Alert>Specialized courses cannot be added via Change & Drop. Use the Specialization Planner module.</Alert>`
- Drop tab remains unchanged (students can still drop Specialized courses).

---

### 9. Router + Navigation

**`src/router.tsx`:**
```ts
import StudentSpecialization from "./pages/student/StudentSpecialization";
import OCSSpecialization from "./pages/ocs/OCSSpecialization";
// Add routes:
{ path: "/student/specialization", name: "student-specialization", element: <StudentSpecialization /> },
{ path: "/ocs/specialization", name: "ocs-specialization", element: <OCSSpecialization /> },
```

**`src/components/shared/PortalLayout.tsx`:**
- Add to `student` nav: `{ label: 'Specialization', path: '/student/specialization', icon: <Layers size={16}/> }`
- Add to `ocs` nav: `{ label: 'Specialization', path: '/ocs/specialization', icon: <Layers size={16}/> }`
- Add to `bannerMap`:
  - `/student/specialization`: BookMarked icon, "Select and submit your specialization course plan for OCS approval."
  - `/ocs/specialization`: Layers icon, "Review and process student specialization plan requests."

---

## Files Modified
| File | Change |
|------|--------|
| `src/lib/types.ts` | New types + AppState + PortalSettings fields |
| `src/contexts/AppContext.tsx` | New methods + state init + enlistment restriction |
| `src/pages/faculty/FacultyTimetable.tsx` | Remove PDF button |
| `src/pages/student/StudentEnlistment.tsx` | Remove PDF button |
| `src/pages/student/StudentChangeDropModal.tsx` | Filter SC + add banner |
| `src/pages/student/StudentPlanOfStudy.tsx` | Show approved spec courses |
| `src/pages/admin/AdminPortalSettings.tsx` | Add deadlines |
| `src/router.tsx` | New routes |
| `src/components/shared/PortalLayout.tsx` | Nav + banners |

## New Files
| File | Purpose |
|------|---------|
| `src/pages/student/StudentSpecialization.tsx` | Student specialization planner |
| `src/pages/ocs/OCSSpecialization.tsx` | OCS specialization manager |
