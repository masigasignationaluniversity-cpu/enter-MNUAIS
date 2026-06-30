# Plan: Searchable Select for All Dropdowns

## Context
All `<Select>` dropdowns across all portals (OCS, Student, Faculty, Admin, DeptHead) need to support a search/filter input inside the dropdown. This is especially important for large lists like courses, programs, colleges, terms, and users.

There are **66 `<Select>` usages** across **19 files** in `src/pages/`.

## Approach

### 1. Create `SearchableSelect` component
**File:** `src/components/ui/searchable-select.tsx`

Uses existing `Popover` + `Command` (cmdk) primitives — already installed.

**API:**
```tsx
interface SearchableSelectOption {
  value: string;
  label: string;           // display text
  description?: string;    // optional secondary line
  disabled?: boolean;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;      // wrapper div className
  triggerClassName?: string;
  emptyText?: string;
}
```

**Design:**
- Trigger button visually identical to existing `SelectTrigger` (same height, border, font, hover/focus styles)
- Popover opens below trigger, width matches trigger
- `CommandInput` at top for filtering
- `CommandList` renders filtered `CommandItem`s
- Selected item shows a checkmark
- Keyboard navigation via cmdk (arrow keys, Enter)
- Shows `"No results found."` when nothing matches

### 2. Replace all Select usages — by file

Pattern transformation:
```tsx
// BEFORE:
<Select value={x} onValueChange={v => fn(v)}>
  <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All Terms" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Terms</SelectItem>
    {state.terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
  </SelectContent>
</Select>

// AFTER:
<SearchableSelect
  value={x}
  onValueChange={v => fn(v)}
  placeholder="All Terms"
  triggerClassName="w-[180px] h-9"
  options={[
    { value: 'all', label: 'All Terms' },
    ...state.terms.map(t => ({ value: t.id, label: t.name })),
  ]}
/>
```

### Files to modify (19 files):

| File | # Selects | Notes |
|------|-----------|-------|
| `src/pages/admin/AdminUsers.tsx` | 10 | College, dept, program, sex, civil status, country, role, filters |
| `src/pages/admin/AdminRooms.tsx` | 1 | College picker |
| `src/pages/ocs/OCSSections.tsx` | 7 | Course, faculty, term, category, time (time selects kept as-is with search) |
| `src/pages/ocs/OCSCourses.tsx` | 5 | Category, type, year standing, term filters |
| `src/pages/ocs/OCSGradeManagement.tsx` | 5 | Term, grade values |
| `src/pages/faculty/FacultyGradeEncoding.tsx` | 3 | Term, section, grade |
| `src/pages/student/StudentConsent.tsx` | 5 | Course, OCS type, section |
| `src/pages/faculty/FacultyRemovalGrades.tsx` | 3 | Term, section, grade |
| `src/pages/ocs/OCSAdviser.tsx` | 1 | Adviser picker |
| `src/pages/ocs/OCSPayments.tsx` | 2 | Term, status |
| `src/pages/ocs/OCSChangeDrop.tsx` | 1 | Term |
| `src/pages/ocs/OCSGraduationApplications.tsx` | 1 | Status |
| `src/pages/ocs/OCSGeElective.tsx` | 1 | Status |
| `src/pages/ocs/OCSSpecialization.tsx` | 1 | Status |
| `src/pages/ocs/OCSUnderload.tsx` | 1 | Status |
| `src/pages/ocs/OCSReconsideration.tsx` | 1 | Term |
| `src/pages/student/StudentEnlistment.tsx` | 2 | Page size, status filter |
| `src/pages/student/StudentPrerogatives.tsx` | 2 | Course, section |
| `src/pages/faculty/FacultyClasses.tsx` | 1 | Term |

### Special cases:
- **Grade dropdowns** (OCSGradeManagement, FacultyGradeEncoding): grade options are ~10 items — still searchable but list is short
- **Time pickers** (OCSSections): large list of 48 time slots — search very helpful
- **OCSAdviser**: adviser displayed with complex format — flatten to `${user.name} (${dept})` label
- **Country of citizenship** (AdminUsers): potentially long list — search most valuable here
- **StudentConsent OCS type select**: string union options — simple

### Search behavior:
- Search shows when ≥1 option exists
- cmdk handles fuzzy filtering by default on `label` field
- `description` text also searchable if provided

## Verification
- All dropdowns open a Popover with search input
- Typing filters the list in real time
- Arrow keys navigate, Enter selects
- Selected value shows a checkmark
- Clicking outside closes without selection
- Disabled state prevents opening
- Width of popover matches trigger width
