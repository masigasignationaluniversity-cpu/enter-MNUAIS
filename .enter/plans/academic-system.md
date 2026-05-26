# Plan: FCFS Enlistment + Faculty Consent Course-Grouping

## Feature 1 — True First-Come-First-Serve Slot Enforcement

### Problem
`enlistSection` currently checks `sec.enrolled >= sec.slots` against **local state** (potentially stale). Two students enrolling at the exact same second can both pass the check and both get a slot, over-filling the section.

### Solution: Atomic RPC via PostgreSQL `FOR UPDATE`
1. **Supabase migration** — create `enlist_student_atomic(p_enrollment_id, p_student_id, p_section_id, p_term_id, p_enlisted_at)` that:
   - `SELECT ... FOR UPDATE` on the `sections` row (row-level lock)
   - Counts real enrolled vs. slots
   - If full → returns `{success: false, message: 'Section is full.'}`
   - If ok → `INSERT INTO enrollments` + `UPDATE sections SET enrolled = enrolled + 1`
   - Returns `{success: true}`

2. **AppContext.tsx** (`enlistSection`):
   - Keep ALL local validations as-is (prereqs, schedule, unit limit, passed courses, PD, etc.)
   - Replace the local slot check (`if (!hasApprovedPrerog && sec.enrolled >= sec.slots)`) with a **real-time DB query** of current enrollment count
   - Replace the two fire-and-forget Supabase calls at the end with a **single `supabase.rpc('enlist_student_atomic', {...})`** call
   - Make the function `async` and `await` the RPC
   - On RPC failure, return the error without updating local state
   - On RPC success, update local state (enrollments + sections.enrolled)

3. **StudentEnlistment.tsx**:
   - `handleEnlist` → `async handleEnlist` (returns `Promise<boolean>`)
   - "Enlist All" loop → `async` with `for...of` + `await` per section (sequential to respect FCFS order)
   - Direct enlist button at line 1327 → async `onClick`
   - Add `enlisting` loading state to show spinner on active button

### Files to modify
- `supabase/migrations/migration_FCFS` (new)
- `src/contexts/AppContext.tsx` — `enlistSection` function
- `src/pages/student/StudentEnlistment.tsx` — `handleEnlist`, "Enlist All", direct enlist

---

## Feature 2 — Faculty Consent: Course-Grouped View per Semester

### Problem
The page already has a semester dropdown, but shows a **flat list** of student consent requests. The user wants to see which **courses/sections** they teach in the selected semester, and under each, the pending/processed consent requests.

### Solution: Restructure FacultyConsents.tsx
- Keep the term/semester dropdown at the top (already exists)
- Replace the flat COI / Dept tab layout with a **course-centric view**:
  - For each section this faculty teaches in the selected term → show a course card
  - Each card shows: course code, title, section code, slot info
  - Under each card: pending and processed consent requests (COI + dept combined for this section)
  - If a section has no consent requests → show "No requests" empty state inside that card
  - If faculty has no sections in this term → show global empty state
- Keep the summary stats bar at the top (pending count etc.)
- Keep the Approve/Deny actions per consent card

### Files to modify
- `src/pages/faculty/FacultyConsents.tsx` — full restructure (all data is already available in context)

---

## Verification
1. **FCFS**: Two students simultaneously clicking "Enlist" on a 1-slot section → only the first succeeds; second gets "Section is full" even if both clicked at the same moment
2. **Consent grouping**: Faculty switches semester → sees their course sections for that semester; consent requests are nested under the relevant section card
