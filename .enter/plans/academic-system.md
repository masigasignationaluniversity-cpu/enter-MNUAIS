# Theme Unification Plan

## Context
All pages across all portals must use the consistent **maroon section panel** theme instead of shadcn `Card` components. Additionally, the StudentConsent page needs "My _____ Request" sub-headers inside each consent section.

The Card imports in every file still exist — no previous session changes were saved.

---

## Target Pattern

### Section Panel
```tsx
<div className="rounded-md overflow-hidden border border-border">
  <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between">
    Title
  </div>
  <div className="p-4 bg-background">
    content
  </div>
</div>
```

### Stat Box
```tsx
<div className="rounded-md overflow-hidden border border-border">
  <div className="bg-primary text-primary-foreground px-3 py-2.5 flex items-center justify-between">
    <span className="text-xs font-bold leading-tight">{label}</span>
    {icon}
  </div>
  <div className="px-3 py-3 bg-background">
    <span className={`text-2xl font-bold ${color}`}>{value}</span>
  </div>
</div>
```

---

## Files To Change

### StudentConsent.tsx
- Already uses maroon panels — no Card conversion needed
- Add "My COI Requests" / "My Department Consent Requests" sub-header rows before `{existingRequests.map(...)}` in COI/Dept loop (only when `existingRequests.length > 0`)
- Add "My OCS Consent Requests" sub-header row before `{ocsExistingRequests.map(...)}` (only when `ocsExistingRequests.length > 0`)
- Pattern: `<tr><td colSpan={8} className="px-3 py-2 bg-primary/5 border-t-2 border-primary/20"><p className="text-xs font-bold text-primary uppercase tracking-wide">My {def.label} Requests</p></td></tr>`

### StudentDashboard.tsx
- Remove `Card, CardContent, CardHeader, CardTitle` import
- Stat cards grid → stat box pattern
- Enrollment Card → panel with title "Current Enrollment — {activeTerm?.name}"
- Grade notice Card → plain `<div className={`rounded-md border flex items-center gap-3 p-4 ...`}>`

### StudentGrades.tsx
- Remove Card import
- No-term empty state Card → panel with title "Grades"
- Locked Card → panel with title "Grades Not Yet Available"
- GWA Card → panel with header "Term GWA — {term.name}"
- Grades table Card → panel with header "Grade Report — {term.name}"

### StudentProfile.tsx (large file — read fully before editing)
- Remove Card import
- Convert multiple cards: stat row, year classification, scholastic standing, GWA per semester table, cumulative GWA, honorific scholarships panel

### StudentEvaluation.tsx
- Remove `Card, CardContent, CardHeader, CardTitle, CardDescription` import
- Progress/selection card → panel
- Evaluation form card → panel with course/section info in header
- Empty states → plain divs

### FacultyDashboard.tsx
- Remove Card import
- Stat cards grid → stat box pattern
- Classes Card → panel with title "My Classes — {term}"
- Evaluations Card → panel with title "Student Evaluations"

### FacultyClasses.tsx
- Remove Card import
- Each class Card → panel with course info in maroon header, student list in body
- Empty state Card → panel with empty state in body

### FacultyGradeEncoding.tsx (complex)
- Remove Card import
- Controls Card → panel "Select Course"
- No-section-selected Card → panel empty state
- Section info Card → panel "Section Information"
- Student grades Card → panel with grade table
- Removal grades Card → panel with removal table

### FacultyTimetable.tsx
- Remove Card import
- Schedule Card → panel with "Schedule — {term.name}" title and download button

### FacultyEvaluations.tsx
- Remove Card import
- Summary Card → panel
- Per-question Card → panel
- Per-class Cards → panels
- Empty state Cards → panels

### OCSDashboard.tsx
- Remove Card import
- Stat cards grid → stat box pattern
- Active Sections Card → panel "Active Term Sections"
- Pending Consents Card → panel "Pending OCS Consents" with badge count

### OCSCourses.tsx
- Remove Card import
- Content Card → panel "Courses"

### OCSSections.tsx
- Remove Card import
- Content Card → panel with dynamic title

### OCSStudents.tsx (large file)
- Remove Card import
- Student detail / list Cards → panels

### OCSUnfinalize.tsx
- Remove Card import
- Content cards → panels

### OCSReconsideration.tsx
- Remove Card import
- Content cards → panels

### AdminDashboard.tsx
- Remove Card import
- Active term Card → panel "Active Term" with term info
- Stat cards grid → stat box pattern
- Academic Terms Card → panel "Academic Terms"
- Section Enrollment Card → panel "Current Term — Section Enrollment"

### AdminTermControl.tsx
- Remove Card import
- Each term Card → panel with conditional active/inactive header (`bg-primary` vs `bg-muted`), term metadata in sub-row, controls in body
- Active term: `border-2 border-green-500`, inactive: `border border-border`

### AdminUsers.tsx
- Remove `Card, CardContent` import
- `userCard` helper function: replace Card/CardContent with `<div>`

### AdminAcademicUnits.tsx
- Remove Card import
- Tab content Cards → panels

### AdminPortalSettings.tsx
- Remove `Card, CardContent, CardHeader, CardTitle, CardDescription` import
- Header banner Card → plain info div
- Form Card → panel "Display Information"
- Preview Card → panel "Live Preview"

### AdminReportCard.tsx
- Remove Card import
- Student selector / report Cards → panels

### AdminRooms.tsx
- Remove Card import
- Rooms table Card → panel

---

## Implementation Strategy
1. Edit each file one at a time using `edit_file`
2. Start with simpler files (dashboards) then work to complex ones
3. Run `run_lint` after all edits to confirm 0 errors
