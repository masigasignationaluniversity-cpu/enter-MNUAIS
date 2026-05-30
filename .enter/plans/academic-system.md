# Change/Drop Request — Full Redesign

## Context
Replace the simple text-letter dialog for Change/Drop requests with a structured popup. Students select specific courses to add/change and drop. The request generates a PDF. OCS approval directly applies the changes to the student's enrollment (no re-finalization needed).

## Files to Modify
1. `src/lib/types.ts` — add `addSections?` and `dropSections?` to `ChangeDropRequest`
2. `src/contexts/AppContext.tsx` — update `submitChangeDropRequest` + `processChangeDropRequest`
3. `src/pages/student/StudentEnlistment.tsx` — replace old dialog, update banner
4. `src/pages/ocs/OCSChangeDrop.tsx` — show selected courses in request card

## New File
- `src/pages/student/StudentChangeDropModal.tsx` — full-featured modal component

---

## 1. Types (`src/lib/types.ts`)
```ts
export interface ChangeDropRequest {
  id: string;
  studentId: string;
  termId: string;
  reason: string;                // student statement
  status: ChangeDropRequestStatus;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  response?: string;
  addSections?: string[];        // NEW: section IDs to add
  dropSections?: string[];       // NEW: section IDs to drop
}
```

## 2. AppContext Changes

### `submitChangeDropRequest` (new signature)
```ts
submitChangeDropRequest(studentId, termId, reason, addSections?, dropSections?): Promise<void>
```
- Guards: no duplicate pending request
- Saves `addSections` and `dropSections` to the request object

### `processChangeDropRequest` (on approval, when new-style)
Detect new-style: `req.addSections !== undefined || req.dropSections !== undefined`
- **New behavior**: Apply changes directly, keep finalized
  - Drop: `enrollments.status = 'dropped'` for each dropSection
  - Add: Insert new enrollment records (status: 'enrolled')
  - Update `sections.enrolled` counts
  - Do NOT remove from `finalizedEnlistments`
  - Persist to DB: `enrollments` table updates + inserts
- **Old behavior (backwards compat)**: If no addSections/dropSections → un-finalize as before

## 3. New Modal `StudentChangeDropModal.tsx`

### Structure: Dialog with 3 tabs
**Tab 1 — Change / Add:**
- Course search input (like enlistment)
- Section results table (code, title, schedule, slots, units)
- Shows warnings for prereq/coreq issues (non-blocking)
- Selected sections shown as chips

**Tab 2 — Drop:**
- Table of current enrolled courses (checkboxes)
- Warning: "DRP will be recorded for dropped courses"

**Tab 3 — Statement & Submit:**
- Summary of selected add/drop courses
- `<Textarea>` for student statement/reason
- Terms & Conditions block (T&C text)
- Confirm checkbox
- "Preview PDF" button → opens printable window
- "Submit Request" button → submits then auto-downloads PDF

### PDF generation
HTML template opened in new window + `window.print()`:
- University header (logo + name)
- "Request to Change/Drop Subjects" title
- Student info (name, student number, program, term, date)
- "Courses to Add" table (if any)
- "Courses to Drop" table (if any)
- Statement section
- T&C declaration
- Signature lines (student + OCS staff)

### Unit counter bar
Shows: current units − dropping + adding = projected / maxUnits

## 4. StudentEnlistment.tsx Changes
- Remove old `showChangeDropDialog` state + `changeDropReason` state + simple `<Dialog>`
- Import and render `<StudentChangeDropModal>`
- Update banner logic:
  - If pending new-style request: show "Under Review" (no submit button)
  - If approved new-style request: show "Approved & Applied" with option to submit new request
  - If denied: show denied message + allow new submission
  - `canSubmitNew = !existingReq || existingReq.status !== 'pending'`

## 5. OCSChangeDrop.tsx Changes
In the RequestCard expanded section, replace the plain "Reason" text with:
- "Courses to Add" table (reads section/course data from `req.addSections`)
- "Courses to Drop" table (reads section/course data from `req.dropSections`)
- "Statement" paragraph at bottom

## Key Reused Utilities
- `checkPrerequisites(studentId, sectionId)` — prereq validation in Add tab
- `checkCorequisites(studentId, sectionId)` — coreq validation in Add tab
- `getCurrentUnits(studentId, termId)` — unit count
- `toPng` / HTML+window.print pattern from `generateEnrollmentFormPdf` — PDF
- `enlistSection`/`dropSection` patterns for DB ops in `processChangeDropRequest`

## Verification
1. Student can open the modal, search and select courses to add, select courses to drop
2. Statement and T&C visible; cannot submit without confirming
3. PDF opens in new window on "Preview" or after submit
4. Submitted request shows in OCS portal with add/drop course tables
5. OCS approves → enrollment immediately reflects: dropped courses gone, added courses present
6. Student's Enlistment page shows updated courses without re-finalization
7. Old-style requests (no addSections/dropSections) still un-finalize on approval
