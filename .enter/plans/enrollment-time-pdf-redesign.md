# Plan: Enrollment Time Slots + PDF Enhancements

## Context
Two features requested:
1. **Enrollment schedule time slots** — add per-slot start/end times for each day in all 3 phases (Pre-reg, Gen Reg, Change of Matriculation). Admin can set start/end times, and the system enforces them on the student side.
2. **PDF redesign** — formal A4 layout for TOR, Form 13C, and Certificate of Registration using the portal's maroon/green theme.

## Part 1: Enrollment Time Slots

### Files to Modify
- `src/lib/types.ts` — Add `startTime?: string` and `endTime?: string` to `EnrollmentSlot`; update phase type `1 | 2` → `1 | 2 | 3`
- `src/pages/admin/AdminTermControl.tsx` — UI time inputs; save/load logic
- `src/pages/student/StudentEnlistment.tsx` — Time-aware access check; schedule display

### types.ts change
```typescript
export interface EnrollmentSlot {
  day: number;
  phase: 1 | 2 | 3;   // 3 = Change of Matriculation (was 1 | 2)
  date: string;
  idPrefixes: string[];
  startTime?: string;  // HH:MM
  endTime?: string;    // HH:MM
}
```

### AdminTermControl.tsx changes
- `EditForm.enrollmentSlots` type: add `startTime?: string; endTime?: string`
- `emptySlots()`: add `startTime: '', endTime: ''` defaults
- `openEdit()`: copy `startTime` and `endTime` from existing saved slots
- `handleSaveEdit()`: include `startTime` / `endTime` in the saved slot object
- UI: after each slot's date input, add a compact Start/End time pair (only shown when date is set)

### StudentEnlistment.tsx changes
1. Add `currentTime` = `HH:MM` string computed from `new Date()`
2. Add helper: `isTimeInWindow(slot)` — returns true if no times set OR current time is within `[startTime, endTime]`
3. Update `isMyEnrollDay`: also require `isTimeInWindow(enrollSchedToday)`
4. Update `isPhase3Today`: find the matching phase-3 slot, also require `isTimeInWindow(phase3Slot)`
5. Update `checkEnrollmentSchedule()`: add time-based error messages ("Enrollment for today opens at HH:MM", "Enrollment for today closed at HH:MM")
6. Update enrollment schedule display: show "HH:MM – HH:MM" next to each slot date

## Part 2: PDF Redesign

### Portal Theme Colors (for HTML/CSS in PDFs)
- **Primary/Maroon**: `#7A1A2E` (hsl 348 58% 30%)
- **Secondary/Green**: `#1E5940` (hsl 158 46% 26%)
- **Gradient header**: maroon → green, linear
- Dark table headers, clean white body, formal typography

---

### A. Transcript of Record (TOR) — `src/pages/ocs/OCSStudents.tsx`

Currently: basic Arial div rendered via `downloadAsPdf` (html2canvas → jsPDF)

**Redesign** (keep `downloadAsPdf` approach, redesign the HTML):
- Full-width letterhead with gradient bar (maroon→green), logo on left, institution name centered, "OFFICIAL TRANSCRIPT OF RECORDS" in caps below
- Double rule divider
- Student info box: 3-column grid (Name, Student No., Program, Year, Cumulative GWA, Date)
- Per-term blocks: colored section header (dark maroon band with term name + semester GWA)
- Grade table: dark header row (black bg, white text), alternating row shading
- Cumulative GWA summary box at bottom with maroon accent
- Formal signature block (3 columns: OCS Name, Verified By, Date Generated)
- Disclaimer footer in small text

---

### B. Certificate of Registration (COR) — `src/pages/student/StudentEnlistment.tsx` (`generateEnrollmentFormPdf`)

Currently: decent layout but plain

**Redesign**:
- Letterhead: maroon gradient header bar with logo + institution name + "CERTIFICATE OF ENROLLMENT"
- Student info: bordered grid (same structure, better typography)
- Course table: dark maroon header row (white text uppercase), cleaner rows
- Signature block: 3 signatory lines
- T&C section: keep content, style with colored section headers
- Add "Form No." / control number area

---

### C. Form 13C — `src/pages/faculty/FacultyRemovalGrades.tsx` (`generateForm13C`)

Currently: 3-copy layout in 90mm sections, good structure

**Redesign** (keep 3-copy structure):
- Per-copy: colored header band (maroon) for institution name + "FORM 13C"
- Add thin green accent line below the header
- Grade table: dark header row with white text
- Fields: better label styling
- Keep same @page and height constraints (90mm per copy for A4 portrait 3-up)
- Upgrade `.tnc` styling with colored title

---

## Verification
- Admin: Open any term → Settings → Enrollment Schedule; verify each day slot shows date + start/end time inputs
- Student: When enrolled day matches date AND current time is within slot window → enlistment opens; shows time range in schedule display
- TOR: OCS → Students → TOR tab → Generate PDF → verify formal A4 with maroon header
- COR: Student → Enlistment → Download Enrollment Form → verify formal A4 look
- Form 13C: Faculty → Removal Grades → Transaction History → Form 13C button → verify maroon header
