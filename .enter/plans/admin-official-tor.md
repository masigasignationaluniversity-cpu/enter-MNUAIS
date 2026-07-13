# Official Transcript of Records (TOR) — Legal-size PDF, University format

## Goal
Replace the current "Generate Transcript of Record" output in `AdminReportCard.tsx` with an authentic University-style Official Transcript of Records matching the reference images: header block (Republic of the Philippines / University Name / Office of the Registrar / address / "OFFICIAL TRANSCRIPT OF RECORDS" + TOR number), a two-column info grid (Surname, Degree/Course, Date Conferred, Special Order, Home Address | Entrance Data, ID Number, Year Admitted, Last School Attended, Last Year), a subject table with columns Subject / Descriptive Title / Final Grade / Comp Grade / Credit grouped by semester, a grading system legend footer, and a signature block (Evaluated by / Checked by / University Registrar signature + "Issued on" date). Output as **legal size** PDF.

## New persisted profile fields (registrar-editable, reused every TOR generation)
Add to `User` type + Supabase `profiles` table + Admin > User Management student form:
- `entranceCredential` (e.g. "FORM 137-A") — text
- `idNumber` (distinct from Student Number — the reference shows both "ID Number: 0 6-8853" and student number separately) — text
- `yearAdmitted` (e.g. "1st semester 2006-2007") — text
- `lastSchoolAttended` — text
- `lastSchoolYear` (e.g. "2004-2005") — text
- `specialOrderNumber` (e.g. "B-103252") — text, manually entered by registrar once a student graduates
- `dateConferred` — date, manually entered by registrar once a student graduates

These live under a new "Academic Credentials" section in the student Edit form (Admin > User Management), visible for student role only. Not required fields (optional, filled in as registrar processes admission/graduation).

Migration: `alter table profiles add column if not exists entrance_credential text, add column if not exists id_number text, add column if not exists year_admitted text, add column if not exists last_school_attended text, add column if not exists last_school_year text, add column if not exists special_order_number text, add column if not exists date_conferred date;`

Wire into `profileToUser()`, `updateUser()`, and `addUser()` in `AppContext.tsx` following the exact existing pattern (birthday/generationalSuffix etc.).

## Date Conferred / Special Order display logic
Per user's decision: show "—" for both fields unless the student has an **approved** `GraduationApplication` record. If approved application exists, show the registrar-entered `dateConferred`/`specialOrderNumber` values (falling back to "—" if the registrar hasn't filled them in yet even though approved).

## PDF generation approach
Extend `src/lib/pdfUtils.ts`'s `downloadAsPdf()` with an optional `format: 'a4' | 'legal'` parameter (default 'a4', backward compatible) — jsPDF supports 'legal' natively. AdminReportCard's new TOR generator calls it with `format: 'legal'`.

## New TOR HTML builder
Add `buildOfficialTorHtml()` inside `AdminReportCard.tsx` (or a new `src/lib/tor.ts` helper, mirroring the `gradeSheet.ts` pattern for consistency) that renders:
1. Header: "Republic of the Philippines" / institution name (bold, larger) / "OFFICE OF THE REGISTRAR" / (address — reuse `portalSettings.institutionName`/new optional `portalSettings` address if present, else omit) / "OFFICIAL TRANSCRIPT OF RECORDS" / a generated TOR number (e.g. derived from student's internal id, formatted like the sample) — right-aligned.
2. Two-column info grid: left = Surname (last name portion of `student.name`), Degree/Course (`student.program`), Date Conferred, Special Order, Home Address (`presentAddress`); right = Entrance Data (`entranceCredential`), ID Number (`idNumber`), Year Admitted (`yearAdmitted`), Last School Attended (`lastSchoolAttended`), Last Year (`lastSchoolYear`).
3. Subject table: header row Subject / Descriptive Title / Final Grade / Comp Grade / Credit. Grouped by term (semester header row spanning the table, underlined, e.g. "1st Semester 2006-2007"), reusing the existing `getStudentTermRows`/`getStudentTerms` logic already in `AdminReportCard.tsx`. "Final Grade" = original grade; "Comp Grade" = the removal/completion grade if changed (else blank); "Credit" = course units (parenthesized for PE/NSTP-style non-major 1-2 unit courses, matching sample's "(1)" "(1.5)" style for non-credit-bearing rows like CSH/PE — reuse `isNonAcademicCourse`).
4. Grading system legend (static footer text block matching the sample: numeric scale descriptions, INC/DRP/IP/5.00* definitions, credit-hour definition).
5. Signature block: "Evaluated by" / "Checked by" blank lines + University Registrar name (reuse `portalSettings` or a new optional field — reuse existing hardcoded pattern already used elsewhere, OR make it configurable; simplest: use `state.currentUser?.name` as fallback like existing TOR, OR add a settings field). For MVP, follow existing app convention: signee = logged-in Admin's name, labeled "University Registrar" (consistent with how OCS/Admin TOR already self-signs).
6. "Issued on: [today's date]" line.
7. Legal-size page CSS handled by the `downloadAsPdf(..., format: 'legal')` call — no manual `@page` needed since this reuses the html2canvas+jspdf pipeline (not window.print()).

## File changes
1. **Migration SQL** — add the 7 new `profiles` columns.
2. **`src/lib/types.ts`** — add 7 optional fields to `User`.
3. **`src/contexts/AppContext.tsx`** — extend `profileToUser`, `addUser`, `updateUser` to read/write the new fields (mirrors existing pattern exactly).
4. **`src/pages/admin/AdminUsers.tsx`** — add "Academic Credentials" section to the student form (`emptyForm`, `renderRoleFields('student')`, `openEdit`, `handleAdd`, `handleEdit`) with the 7 new inputs (entranceCredential, idNumber, yearAdmitted, lastSchoolAttended, lastSchoolYear, specialOrderNumber as text inputs; dateConferred as a date input). All optional, no validation required.
5. **`src/lib/pdfUtils.ts`** — add `format` param to `downloadAsPdf`.
6. **New `src/lib/tor.ts`** — `buildOfficialTorHtml(student, terms, termRows fn, computeGWA result, ...)` returning the full styled HTML string in the reference TOR format.
7. **`src/pages/admin/AdminReportCard.tsx`** — replace `downloadPDF` to call the new `buildOfficialTorHtml` + `downloadAsPdf(..., 'TOR_xxx.pdf', false, 'legal')`. Keep existing search/table/CSV UI as-is (no UI redesign requested — just the PDF output format + legal size). Rename button label if needed to reflect "Official TOR".

## Out of scope
- No changes to OCS's separate TOR generator (`OCSStudents.tsx`) — user specifically said "in admin".
- No redesign of the on-screen preview table in AdminReportCard — only the downloaded PDF changes format/content per the reference images.
- Institution address line will use existing `portalSettings` fields where available; if no address field exists yet, we'll show the institution name only (no fabricated address) unless the user wants a new portalSettings address field — flagging this as a reasonable default rather than adding more scope.
