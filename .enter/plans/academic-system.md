# Academic System – Batch 4 Changes

## Changes Summary

### 1. Student POS — Rename "Additional Required GE (College-Specific)" → "Additional Required Courses"
**File:** `src/pages/student/StudentPlanOfStudy.tsx` line 997
- Change title text from `Additional Required GE (College-Specific)` to `Additional Required Courses`

### 2. Student POS — Hide Specialization panel for Associate/Certificate
**File:** `src/pages/student/StudentPlanOfStudy.tsx`
- The `unitPanels` array currently always includes `Specialized` (IIFE at line 288–308).
- Wrap the Specialized IIFE with `...(studentDegreeType !== 'associate_certificate' ? [...] : [])` pattern, same as Elective GE.

### 3. Underload Banner — Rule: only 1–14 units (not 0)
**File:** `src/pages/student/StudentEnlistment.tsx` line 1237
- Change condition from `currentUnits < 15` to `currentUnits > 0 && currentUnits < 15`
- 0 units → Late Enrollment banner (already exists below, no change needed there)

### 4. Underload Approval — OCS transcript-format document
**File:** `src/pages/student/StudentEnlistment.tsx`
- Add a `generateUnderloadApprovalDoc()` function (patterned after `generateCertificateOfEnrollment`)
- Format: A4 letterhead, university logo, title "UNDERLOAD APPLICATION APPROVAL", student info table (name, student number, program, term), reason submitted, units enlisted, approval date, processor name, OCS signature line
- Show "View Approval Document" button when `myUnderloadApp?.status === 'approved'`
- Also keep the existing approved status text, just add the button below it

### 5. OCS POS — Course search: show nothing by default, filter only when user types (by code)
**File:** `src/pages/ocs/OCSPlanOfStudy.tsx`
- For ALL course pickers (Major, Thesis, AdditionalGE), change the search filter logic:
  - If `catSearch` is empty → show `[]` (no results shown)
  - If `catSearch` has content → filter by course code only (not title), excluding already-added IDs
- Update the empty state text when no search: `"Type a course code to search..."`
- This affects lines 191–197 (Major/Thesis pickers) and lines 281–286 (AdditionalGE picker)

### 6. OCS POS — Hide "Unit Requirements" and "Max Course Counts" tabs for Associate/Certificate
**File:** `src/pages/ocs/OCSPlanOfStudy.tsx`
- In `ProgramEditor`, the `Tabs` section has 3 tabs: "Required Courses", "Unit Requirements", "Max Course Counts"
- For `program.degreeType === 'associate_certificate'`: conditionally hide the Unit Requirements and Max Course Counts tab triggers and their content
- Implementation: wrap `TabsTrigger` for "units" and "max" with `{program.degreeType !== 'associate_certificate' && (...)}` 
- Also wrap their `TabsContent` blocks similarly

## Files to Modify
1. `src/pages/student/StudentPlanOfStudy.tsx` — rename label, hide Specialized panel
2. `src/pages/student/StudentEnlistment.tsx` — underload rule fix + approval document
3. `src/pages/ocs/OCSPlanOfStudy.tsx` — search behavior + hide tabs for assoc/cert
