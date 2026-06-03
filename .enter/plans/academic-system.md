# Plan: Manual Enrollment Auto-Removal + Thesis S/U Grading

## Context
Two features to add to OCS and Faculty grade management:
1. **Auto-removal on INC/4 grade in manual enrollment** — when OCS saves a grade of INC or 4 for a manually-enrolled course, that enrollment is automatically removed after the grade is saved.
2. **S/U grading for Thesis courses** — replace P (Passed) / F (Failed) grade options with S (Satisfactory) / U (Unsatisfactory) when the course type is `'Thesis'`, in both OCS Grade Management and Faculty Grade Encoding.

## Critical Files
- `src/lib/types.ts` — `GradeValue` type (add 'S' and 'U')
- `src/pages/ocs/OCSGradeManagement.tsx` — grade options, auto-remove logic
- `src/pages/faculty/FacultyGradeEncoding.tsx` — GRADES array, thesis detection

---

## Feature 1: Auto-removal on INC/4 (Manual Enrollment — OCS)

**Where**: Only the **Manual Courses** tab of `OCSGradeManagement.tsx`.

**Logic**: In `handleSaveGrade`, after saving:
```typescript
const handleSaveGrade = (studentId, sectionId, termId) => {
  const gradeToSave = editGradeValue === '__none__' ? null : editGradeValue as GradeValue;
  ocsUpdateGrade(studentId, sectionId, termId, gradeToSave);
  
  // Auto-remove if the enrollment is manual AND grade is INC or 4
  const isManual = enrolledRows.find(r => r.enrollment.sectionId === sectionId)?.sec?.sectionCode === '__MANUAL__';
  if (isManual && (gradeToSave === 'INC' || gradeToSave === '4')) {
    ocsRemoveEnrollment(studentId, sectionId, termId);
    toast.success('Grade saved. Enrollment auto-removed (INC/4 grade).');
  } else {
    toast.success('Grade updated successfully.');
  }
  setEditingKey(null);
};
```

**Note**: Auto-removal applies to ALL manual rows regardless of which tab the user is in (Grade Records or Manual Courses) — only for rows where `sec.sectionCode === '__MANUAL__'`.

---

## Feature 2: S/U Grading for Thesis Courses

### Step 1 — Update `GradeValue` type in `src/lib/types.ts`
Add 'S' and 'U' to the union:
```typescript
export type GradeValue = '1.0' | '1.25' | ... | 'INC' | 'DRP' | 'P' | 'F' | 'S' | 'U';
```

### Step 2 — OCSGradeManagement.tsx

Replace static `GRADE_OPTIONS` with a function that returns different options based on whether the course is a thesis:

```typescript
function getGradeOptions(isThesisCourse: boolean) {
  return [
    { label: '— Not yet graded —', value: '__none__' },
    { label: '1.0', value: '1.0' }, ...
    { label: '4 (Conditional)', value: '4' },
    { label: '5 (Failed)', value: '5' },
    { label: 'INC (Incomplete)', value: 'INC' },
    { label: 'DRP (Dropped)', value: 'DRP' },
    // Thesis: show S/U instead of P/F
    ...(isThesisCourse
      ? [
          { label: 'S (Satisfactory)', value: 'S' },
          { label: 'U (Unsatisfactory)', value: 'U' },
        ]
      : [
          { label: 'P (Passed)', value: 'P' },
          { label: 'F (Failed)', value: 'F' },
        ]
    ),
  ];
}
```

In the grade editing dropdowns (both "Grade Records" and "Manual Courses" tabs), determine if the current row's course is a Thesis type and pass that to `getGradeOptions(isThesisCourse)`.

### Step 3 — FacultyGradeEncoding.tsx

`course` is already resolved from `section.courseId`. Use it to conditionally swap grade options:

```typescript
const isThesisCourse = course?.type === 'Thesis';
const EFFECTIVE_GRADES: GradeValue[] = isThesisCourse
  ? ['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0','4','5','INC','DRP','S','U']
  : ['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0','4','5','INC','DRP'];
```

Replace `GRADES` array usage with `EFFECTIVE_GRADES` in the grade dropdown.

Also update `gradeColor` to handle 'S' and 'U'.

---

## Verification
- Set a manual course grade to INC → enrollment row should disappear automatically with toast.
- Set a manual course grade to 4 → same behavior.
- Set a manual course grade to 3.0 → enrollment stays, toast says "Grade updated successfully."
- For a Thesis-type course in OCS grade management → grade dropdown shows S/U instead of P/F.
- For a Thesis-type course in Faculty Grade Encoding → grade dropdown shows S/U instead of P/F.
- For non-Thesis courses → dropdown shows P/F as before.
