# Academic System: Major Feature Update Plan

## Context
This update adds a Room module, fixes multiple data/UX issues, and adds new enrollment/prerogative flows across Admin, OCS, Faculty, and Student portals.

---

## 1. Types Changes (`src/lib/types.ts`)
- Rename `semester: '1st' | '2nd' | 'Summer'` → `'1st' | '2nd' | 'Mid-Term'`
- Add `college?: string` to `User` (for faculty/OCS — store college name here; `department` stays for students)
- Add `Room` interface: `{ id, name, capacity?, collegeId, building? }`
- Add `UnfinalizedRequest` interface: `{ id, studentId, termId, reason, status: 'pending'|'approved'|'denied', requestedAt, processedAt?, processedBy?, response? }`
- Add `Term.unfinalizedDeadline?: string` (ISO datetime — when unfinalized courses auto-drop)
- Add `Section.prerogativeAccepting?: boolean` (per-section FIC toggle)
- Add `rooms: Room[]` and `unfinalizedRequests: UnfinalizedRequest[]` to `AppState`

---

## 2. AppContext (`src/contexts/AppContext.tsx`)
- Add `rooms` and `unfinalizedRequests` to initial state
- Add CRUD: `addRoom`, `updateRoom`, `deleteRoom`
- Add `submitUnfinalizedRequest(studentId, termId, reason)` 
- Add `processUnfinalizedRequest(requestId, status, response?)` — on 'approved': calls unfinalizeEnlistment + reopens enlistment for student
- Add `dropUnfinalizedCourses(studentId, termId)` — drops all enlisted (non-finalized) enrollments; also clears pending prerogatives; used when unfinalizedDeadline passes
- Update `enlistSection`: bypass slot check if student has an `approved` prerogative for that section
- Fix `getCurrentUnits`: keep counting all non-dropped (used for enlistment validation)
- Add `getDisplayUnits(studentId, termId)` → only counts `status === 'enrolled'` (for profile/dashboard)

---

## 3. DB Migration (Supabase)
```sql
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER,
  college_id TEXT,
  building TEXT
);
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON rooms FOR ALL USING (true);

CREATE TABLE unfinalized_requests (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  term_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TEXT NOT NULL,
  processed_at TEXT,
  processed_by TEXT,
  response TEXT
);
ALTER TABLE unfinalized_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON unfinalized_requests FOR ALL USING (true);
```

---

## 4. Admin: Room Module
- **New file**: `src/pages/admin/AdminRooms.tsx` — CRUD page for rooms
  - List rooms grouped by college
  - Add/Edit/Delete with: Name, Building, Capacity, College (dropdown)
- Add route `/admin/rooms` to `router.tsx`
- Add "Rooms" nav item to PortalLayout admin nav

---

## 5. Admin Users (`src/pages/admin/AdminUsers.tsx`)
- For `faculty` role: change Department dropdown → **College** dropdown (required)
- For `ocs` role: change Department dropdown → **College** dropdown (**required**, no `_none` option)
- On save: store selected college name in `user.college` field (not `department`)
- Update `openEdit` to map `user.college` back to college id for the select
- Update `handleAdd`/`handleEdit` to resolve college name from id and store in `user.college`

---

## 6. Admin Term Control (`src/pages/admin/AdminTermControl.tsx`)
- Change semester select: `Summer` → `Mid-Term`
- Add `unfinalizedDeadline` datetime field in Edit Term Settings under a new "Unfinalized Student Deadline" section
- Display in term card when set

---

## 7. OCS Sections (`src/pages/ocs/OCSSections.tsx`)
- **College-based filtering**: OCS user has `college` field → find all departments in that college → filter courses/faculty by those departments
- **Auto-show lab**: when course selected has `type === 'Lec+Lab'`, auto-set `hasLab: true` in form state; show lab section automatically (not manually toggled)
- **Room dropdown**: replace free-text room `Input` with `Select` populated from `state.rooms` filtered by OCS user's college's rooms. Same for lab room.
- Keep free-text fallback if no rooms configured

---

## 8. OCS Consents (`src/pages/ocs/OCSConsents.tsx`)
- Remove all `deptConsentStatus` handling: buttons, display, counts
- Keep only OCS consent processing

---

## 9. OCS Unfinalize (`src/pages/ocs/OCSUnfinalize.tsx`)
- Add "Re-Enlistment Requests" section/tab showing `unfinalizedRequests` for current term
- For each pending request: show student name, reason, date; approve/deny buttons
- Approve → call `processUnfinalizedRequest(id, 'approved')` → which calls `unfinalizeEnlistment` to reopen their enlistment

---

## 10. Faculty Grade Encoding (`src/pages/faculty/FacultyGradeEncoding.tsx`)
- Check `encodingFrom` / `encodingUntil` date fields **in addition to** the `gradeSubmissionOpen` toggle
- `gradeOpen` logic: `gradeSubmissionOpen && (now >= encodingFrom || !encodingFrom) && (now <= encodingUntil || !encodingUntil)`
- Display encoding window dates in the page info banner

---

## 11. Faculty: Term Dropdown (Classes, Timetable, Evaluations)
- **FacultyClasses** (`src/pages/faculty/FacultyClasses.tsx`): replace `<Tabs>` with `<Select>` term dropdown; show selected term's classes
- **FacultyTimetable** (`src/pages/faculty/FacultyTimetable.tsx`): replace `<Tabs>` with `<Select>` term dropdown
- **FacultyEvaluations** (`src/pages/faculty/FacultyEvaluations.tsx`): replace `<Tabs>` with `<Select>` term dropdown
- (FacultyConsents already has a dropdown — no change)

---

## 12. Faculty Prerogatives (`src/pages/faculty/FacultyPrerogatives.tsx`)
- Add per-section prerogative toggle (open/closed) using `Section.prerogativeAccepting`
- Each section card shows a toggle: "Accepting Prerogatives: ON/OFF"
- Toggling calls `updateSection(secId, { prerogativeAccepting: bool })`
- Student portal checks `section.prerogativeAccepting !== false` before allowing prerog request

---

## 13. Student Dashboard (`src/pages/student/StudentDashboard.tsx`)
- Change to only show courses where enrollment `status === 'enrolled'` (finalized)
- Show "No finalized subjects" message when none
- Do not count enlisted (non-finalized) courses in the stats/units display

---

## 14. Student Profile (`src/pages/student/StudentProfile.tsx`)
- Use `getDisplayUnits` (finalized only) for the "Current Enrollment" section
- Filter `allEnrollments` to only `status === 'enrolled'` for display
- Classify year level based on finalized units only

---

## 15. Student Grades (`src/pages/student/StudentGrades.tsx`)
- Filter enrollment counts/display to only `status === 'enrolled'`

---

## 16. Student Evaluation (`src/pages/student/StudentEvaluation.tsx`)
- Filter `evalTargets` to only `status === 'enrolled'` enrollments

---

## 17. Student Enlistment (`src/pages/student/StudentEnlistment.tsx`)

### A. Warning Modal (replace bottom banner)
- Replace `enlistWarning` state + bottom card with a `Dialog` modal showing the issues list
- Trigger on failed enlistment: show all conflicts/requirement failures in a styled dialog

### B. Unfinalized Request Form
- Detect if `unfinalizedDeadline` has passed AND student is not finalized → call `dropUnfinalizedCourses` if they have any enlisted courses
- Show a banner: "Your enlisted courses were cleared. Submit a re-enlistment request:"
- Form with textarea for reason → calls `submitUnfinalizedRequest`
- If request is `pending`: show "Awaiting OCS approval"
- If request is `approved`: unlock enlistment

### C. Prerog → Course Bin flow
- In Prerogatives tab: approved prerogatives show "Move to Course Bin" button → adds to cart
- `enlistSection` bypasses slot check for approved prerog holders

### D. Re-enlist after drop
- Already works (dropped enrollments not counted in "already enlisted" check)
- Ensure UI doesn't block it

---

## Files Modified Summary
1. `src/lib/types.ts`
2. `src/contexts/AppContext.tsx`
3. `src/pages/admin/AdminRooms.tsx` (**NEW**)
4. `src/pages/admin/AdminTermControl.tsx`
5. `src/pages/admin/AdminUsers.tsx`
6. `src/pages/ocs/OCSSections.tsx`
7. `src/pages/ocs/OCSConsents.tsx`
8. `src/pages/ocs/OCSUnfinalize.tsx`
9. `src/pages/faculty/FacultyGradeEncoding.tsx`
10. `src/pages/faculty/FacultyClasses.tsx`
11. `src/pages/faculty/FacultyTimetable.tsx`
12. `src/pages/faculty/FacultyEvaluations.tsx`
13. `src/pages/faculty/FacultyPrerogatives.tsx`
14. `src/pages/student/StudentDashboard.tsx`
15. `src/pages/student/StudentProfile.tsx`
16. `src/pages/student/StudentGrades.tsx`
17. `src/pages/student/StudentEvaluation.tsx`
18. `src/pages/student/StudentEnlistment.tsx`
19. `src/router.tsx`
20. `src/components/shared/PortalLayout.tsx`

---

## Verification
- Admin: Add a room → appears in OCS section form dropdown
- OCS: Select a Lec+Lab course → lab scheduler auto-expands
- Faculty: Grade encoding page shows encoding window dates and respects them
- Faculty Prerogatives: Toggle per-section → student can't prerog closed section
- Student: Finalize → Dashboard/Profile only show finalized courses
- Student: Deadline passes → courses cleared → submit request → OCS approves → can re-enlist
