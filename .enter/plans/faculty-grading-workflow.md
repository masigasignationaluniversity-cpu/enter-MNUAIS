# Faculty Student Grades — Multi-Stage Grading Workflow

## Summary
Replace the current single-step Faculty Grade Encoding page with the full Encoder → Approver → Poster workflow shown in the reference video, with these two adaptations per user's decisions:
- **Partial vs Batch posting** is configured by **Admin**, per section/class (new Admin page), instead of requiring OUR/registrar approval. Default = Batch.
- **Encoder / Approver / Poster role assignment** is done by **OCS**, in the existing OCS Sections page, instead of a "registration committee". A faculty member can hold multiple/all roles on the same class.

## 1. Data Model Changes (`src/lib/types.ts`)

```ts
export type GradePostingType = 'batch' | 'partial';
export type GradeWorkflowStatus = 'draft' | 'for_approval' | 'approved' | 'posted';

export interface GradeNote {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

// Grade gets:
status?: GradeWorkflowStatus;  // undefined/'draft' = encoding stage; kept in sync with `submitted` (true iff 'posted')
notes?: GradeNote[];
// `remarks` field already exists in the type but was never persisted to DB — fixing that too.

// Section gets:
postingType?: GradePostingType;   // default 'batch' — set by Admin
encoderIds?: string[];            // set by OCS — faculty who can encode grades
approverIds?: string[];           // set by OCS — faculty who can approve for posting
posterIds?: string[];             // set by OCS — faculty who can post (release) grades
```

Backward compatibility:
- Sections without `encoderIds/approverIds/posterIds` → treated as `[section.facultyId]` for all three roles (computed fallback, not backfilled in DB).
- Grades without `status` → treated as `submitted ? 'posted' : 'draft'` (computed fallback).

## 2. Database Migration

```sql
alter table sections add column if not exists posting_type text default 'batch';
alter table sections add column if not exists encoder_ids jsonb default '[]';
alter table sections add column if not exists approver_ids jsonb default '[]';
alter table sections add column if not exists poster_ids jsonb default '[]';

alter table grades add column if not exists status text default 'draft';
alter table grades add column if not exists notes jsonb default '[]';
alter table grades add column if not exists remarks text;

-- Backfill existing data
update grades set status = case when submitted then 'posted' else 'draft' end where status is null;
```

## 3. AppContext (`src/contexts/AppContext.tsx`)

- Extend `loadSections`/`addSection`/`updateSection` to map `postingType`/`encoderIds`/`approverIds`/`posterIds` ↔ snake_case DB columns.
- Extend `loadGrades` to map `status`, `notes`, `remarks`.
- New functions (mirroring existing `submitGradesBatch` pattern):
  - `saveGradeDraft(gradeId, grade, remarks?)` — updates grade value + remarks, sets `status: 'draft'`, `submitted: false`. Used during Encoding.
  - `submitGradesForApproval(gradeIds: string[])` — bulk sets `status: 'for_approval'`.
  - `returnGradesToEncoding(gradeIds: string[])` — bulk sets `status: 'draft'` (used by Approver or Poster).
  - `approveGradesForPosting(gradeIds: string[])` — bulk sets `status: 'approved'`.
  - `postGrades(gradeIds: string[])` — bulk sets `status: 'posted'`, `submitted: true` (keeps existing `submitted` flag in sync so GWA/year-standing/evaluation-gating logic elsewhere keeps working unchanged).
  - `addGradeNote(gradeId, authorId, authorName, text)` — appends a `GradeNote` to the grade's `notes` array.
- `ocsUpdateGrade` (existing OCS override): also set `status: grade !== null ? 'posted' : 'draft'` so OCS overrides don't leave a grade stuck mid-workflow.

## 4. New Admin Page: Grade Posting Settings (`src/pages/admin/AdminGradePosting.tsx`)

- Term selector + searchable list of sections (course code, section, faculty, enrolled count).
- Per-row toggle: **Batch Post** (default) / **Partial Post** badge-buttons → calls `updateSection(id, { postingType })`.
- Route: `/admin/grade-posting`. Nav entry added under Admin group in `PortalLayout.tsx` + banner config.

## 5. OCS Sections — Role Assignment (`src/pages/ocs/OCSSections.tsx`)

In the Add/Edit Section dialog, add three multi-select faculty pickers (reusing the existing `scopedFaculty` list used for the main faculty picker):
- **Encoders** — defaults to `[facultyId]` when section is created.
- **Approvers** — defaults to `[facultyId]`.
- **Posters** — defaults to `[facultyId]`.
Stored as `encoderIds`/`approverIds`/`posterIds` via `addSection`/`updateSection`.

## 6. Faculty Grade Encoding Rework (`src/pages/faculty/FacultyGradeEncoding.tsx`)

Full replacement of the page body:

### Overview table (top)
Columns: Course code, Section, Schedule, Enrolled, Posting Type (Batch/Partial badge), Status (`Completed` badge or `Unfinished (N)` badge — N = count of non-posted grades), Action (**Grade Sheet** button).
- Grade Sheet button rules:
  - Batch: disabled until `Unfinished === 0` (all posted).
  - Partial: always enabled (exports whatever is posted; pending rows show blank/pending in the sheet).
- Only sections where the faculty is encoder, approver, or poster (or legacy `facultyId`) appear.
- Selecting a row loads the Grade Encoding & Submission panel below.

### Grade Encoding & Submission panel
- Course info bar (existing style, kept).
- Role badges showing which role(s) the current faculty holds for this class (Encoder / Approver / Poster).
- Three tabs: **Encoding**, **For Approval**, **For Posting** (using existing `Tabs` component). Each tab shows the full roster; only rows in the tab's relevant `status` are actionable — others shown read-only with a status badge for context.
  - **Encoding tab** (actionable if user is an Encoder, row status is `draft`/undefined):
    - Header count "X / Y encoded".
    - Per-row: grade dropdown (options depend on course type, same `getEffectiveGrades` logic as today), Remarks input (required + max 52 chars when grade is one of `4,5,INC,DRP,F,U`), row checkbox (disabled until grade selected AND remarks satisfied), select-all checkbox.
    - Notes: popover on a note icon per row — textarea + "Add" button, list of existing notes, badge showing note count.
    - Action dropdown (enabled when ≥1 row selected): **Submit for Approval** → opens CONFIRM dialog (type "CONFIRM", review list of selected students+grades) → `submitGradesForApproval`.
  - **For Approval tab** (actionable if user is an Approver, row status is `for_approval`):
    - Read-only grade/remarks display, checkbox selection, select-all.
    - Action dropdown: **Approve for Posting** or **Return to Encoding** → CONFIRM dialog → `approveGradesForPosting` / `returnGradesToEncoding`.
  - **For Posting tab** (actionable if user is a Poster, row status is `approved`):
    - Read-only grade/remarks display, checkbox selection (batch sections force "select all or none" — selecting some but not all is blocked with a message mirroring the video: "you must post all grades at once for this class"), select-all.
    - Action dropdown: **Post** or **Return to Encoding** (only allowed pre-posting) → CONFIRM dialog → `postGrades` / `returnGradesToEncoding`.
    - Once `posted`, rows can no longer be returned to encoding (matches video).
- Confirm dialogs reuse the exact "type CONFIRM" UX pattern from `FacultyRemovalGrades.tsx` (info-note-error styling, disabled submit until text matches).

### Grade Sheet PDF
- New `generateGradeSheet(section)` function using the same `window.open` + printable-HTML pattern as `FacultyRemovalGrades.tsx`'s Form 13C generator (consistent with codebase convention) — lists Student No, Name, Grade, Remarks, Status, for all enrolled students in the section.

## 7. Nav / Router
- `src/router.tsx`: add `/admin/grade-posting` → `AdminGradePosting`.
- `src/components/shared/PortalLayout.tsx`: add "Grade Posting" nav entry under Admin group + banner config entry.

## Out of scope (unchanged)
- `FacultyRemovalGrades.tsx` (INC/4.0 completion workflow) — separate, untouched.
- `OCSGradeManagement.tsx` overrides — OCS can still force-set any grade anytime, bypassing the workflow (existing behavior), just kept in sync with the new `status` field.
- Student-facing grade visibility logic (`canStudentViewGrades`, GWA, year-standing) — unchanged, since `submitted` stays in sync with `status === 'posted'`.

## Files touched
- `src/lib/types.ts`
- `src/contexts/AppContext.tsx`
- `src/pages/faculty/FacultyGradeEncoding.tsx` (full rework)
- `src/pages/ocs/OCSSections.tsx` (add role pickers)
- `src/pages/admin/AdminGradePosting.tsx` (new)
- `src/router.tsx`
- `src/components/shared/PortalLayout.tsx`
- Supabase migration (sections + grades columns)
