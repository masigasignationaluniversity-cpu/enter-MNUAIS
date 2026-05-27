# Academic System — Multi-Feature Plan

## Features

### 1. OCS Sections Per Department
**Problem:** OCS users see all courses across their entire college; sections are mixed across departments.
**Answer:** OCS users see and manage ONLY their own department's sections.

**Changes:**
- `src/pages/admin/AdminUsers.tsx` — Make **department required** for OCS users (currently only college required). Add department Select (filtered by chosen college) under the college field, with same validation as faculty.
- `src/pages/ocs/OCSSections.tsx` — Change filtering:
  - `ocsDept = ocsUser?.department` (string name)
  - `deptCourses` = courses where `c.department === ocsDept` (instead of all collegeDeptNames)
  - `deptFaculty` = faculty where `u.department === ocsDept`
  - `activeSections` = sections whose courseId is in deptCourses (department-scoped, not college-scoped)
  - Course dropdown in Add/Edit form also limited to deptCourses

---

### 2. Student NSTP/PE — Max 6 Units Separate Pool
**Problem:** Line 361 of `StudentEnlistment.tsx` skips unit check for PE/NSTP entirely.
**Rule:** PE/NSTP courses share a separate 6-unit pool per semester, independent of `maxUnits`.

**Changes:**
- `src/pages/student/StudentEnlistment.tsx`:
  - Compute `currentPeNstpUnits` = sum of units for enrolled PE/NSTP sections in active term
  - In `getSectionInfo` for PE/NSTP courses: check `currentPeNstpUnits + adding <= 6`
  - Show PE/NSTP unit progress bar separately in the unit load display
  - In `handleBulkEnlist`, track `runningPeNstpUnits` alongside `runningUnits`

---

### 3. Student Search — Course Code Only
**Problem:** Search matches both course code AND title; user wants code-only.

**Changes:**
- `src/pages/student/StudentEnlistment.tsx` line ~316:
  - Change `course?.code.toLowerCase().includes(q) || course?.title.toLowerCase().includes(q)` → `course?.code.toLowerCase().includes(q)` only
  - Update filter dialog label from "Course Code / Title" → "Course Code"

---

### 4. Auto-Drop Fix
**Problem:** `dropUnfinalizedCourses` was removed from mount to prevent over-aggressive drops. Now it never fires automatically.
**Fix:** Trigger it once on app initialization (after DB sync) for any term whose `unfinalizedDeadline` has passed.

**Changes:**
- `src/contexts/AppContext.tsx` — In the main init `useEffect` (after `loadAppData` completes), add:
  ```ts
  state.terms.forEach(term => {
    if (term.unfinalizedDeadline && new Date(term.unfinalizedDeadline) <= new Date()) {
      dropUnfinalizedCourses(term.id);
    }
  });
  ```
  Use a `hasRunAutoDropRef` ref so it only fires once per session (not on every re-render).

---

### 5. Request Status Banners (All Types)
**Problem:** Students should see pending/approved/rejected status for ALL request types.

**Changes — shared banner pattern:**
Each student page shows a colored banner at the top for requests in the active term:
- Yellow = pending, Green = approved/success, Red = rejected

Pages to update:
- `src/pages/student/StudentPrerogatives.tsx` — already has status banner; verify it shows pending AND approved states clearly
- `src/pages/student/StudentConsent.tsx` — add banner showing COI / dept consent / OCS consent status
- `src/pages/student/StudentEnlistment.tsx` — already has banners for change-drop and late enrollment; verify pending state is visible

---

### 6. Admin: Add Student Request Deadline to Term
**New field:** `requestDeadline?: string` on `Term` — date after which students cannot submit new requests AND OCS cannot approve/reject.

**Changes:**
- `src/lib/types.ts` — add `requestDeadline?: string` to `Term` interface
- `src/contexts/AppContext.tsx` — include `requestDeadline` in `updateTermSettings`
- `src/pages/admin/AdminTermControl.tsx` — add "Student Request Deadline" date field in the term edit form (next to `unfinalizedDeadline`)

---

### 7. Lock OCS Approval After Request Deadline
**When `activeTerm.requestDeadline` is set and has passed:**
- Students: cannot submit new requests (show "Request period has ended" notice)
- OCS: approve/reject buttons are disabled + notice shown

**Changes:**
- `src/pages/ocs/OCSConsents.tsx` — disable approve/reject when deadline passed
- `src/pages/ocs/OCSReconsideration.tsx` — same
- `src/pages/ocs/OCSChangeDrop.tsx` — same
- `src/pages/ocs/OCSPrerogatives.tsx` — same
- Student pages (Prerogatives, Consent, Enlistment) — hide submit buttons + show deadline-passed notice

---

## Files Modified
| File | Change |
|---|---|
| `src/lib/types.ts` | Add `requestDeadline` to Term |
| `src/contexts/AppContext.tsx` | Auto-drop init trigger + requestDeadline in updateTermSettings |
| `src/pages/admin/AdminUsers.tsx` | Dept required for OCS |
| `src/pages/admin/AdminTermControl.tsx` | requestDeadline field in edit form |
| `src/pages/ocs/OCSSections.tsx` | Filter by dept not college |
| `src/pages/ocs/OCSConsents.tsx` | Lock approval after deadline |
| `src/pages/ocs/OCSReconsideration.tsx` | Lock approval after deadline |
| `src/pages/ocs/OCSChangeDrop.tsx` | Lock approval after deadline |
| `src/pages/ocs/OCSPrerogatives.tsx` | Lock approval after deadline |
| `src/pages/student/StudentEnlistment.tsx` | Code-only search + PE/NSTP 6-unit pool |
| `src/pages/student/StudentPrerogatives.tsx` | Banner verification |
| `src/pages/student/StudentConsent.tsx` | Add status banner |
