# Academic System — Multi-Module Update Plan

## 1. Terms Dropdown Filtering
**Issue:** All pages show ALL terms in the dropdown. Should only show terms relevant to the current user.

**Files:** StudentGrades, FacultyEvaluations, FacultyConsents, FacultyPrerogatives, FacultyTimetable, OCSPrerogatives, OCSConsents, DeptHeadConsents

**Approach:** In each page, compute `relevantTerms` by filtering `state.terms` to only those with related data, then pass that instead of `allTerms` / `state.terms` to TermSelect or Select component.

| Page | Relevance Filter |
|------|-----------------|
| StudentGrades | enrollments or grades for that student |
| FacultyEvaluations | sections where facultyId === me.id |
| FacultyConsents | sections where facultyId === me.id |
| FacultyPrerogatives | sections where facultyId === me.id |
| FacultyTimetable | sections where facultyId === me.id |
| OCSPrerogatives | any prerogative in the OCS college |
| OCSConsents | any consent for OCS college courses |
| DeptHeadConsents | any consent for dept courses |

Always include the active term even if empty (so the default is always visible).

---

## 2. Student SET — Required Open-Ended Questions

**File:** `src/pages/student/StudentEvaluation.tsx`

**Change:** The two open-ended questions (helpful, improve) are currently optional. Make them **required**:
- `isComplete` check should also verify both `helpful[sectionId]?.trim()` and `improve[sectionId]?.trim()` are non-empty
- Submit button disabled until all ratings answered AND both text fields filled
- Mark both fields with a visible `*` required indicator
- Show validation error in toast if submitted while empty

---

## 3. Faculty SET — By Course Format

**File:** `src/pages/faculty/FacultyEvaluations.tsx`

**Current:** One aggregate summary + per-question breakdown + "By Class Section" cards  
**Change:** Reorganize to **per-course primary view**

New structure:
1. TermSelect (keep)
2. Window/grade banner (standardized)
3. For each unique **course** the faculty teaches this term → a collapsible panel showing:
   - Header: `COURSE CODE — Course Title` + response count + section list
   - Per-question breakdown table (same style as student SET form)
   - Student comments section (collapsible)
4. An "Overall" summary card below (total responses + rating distribution) — keep but secondary

**"By course" definition:** Group by `sec.courseId`. If faculty teaches multiple sections of same course, aggregate them.

---

## 4. Banner Standardization

Apply the amber border-l-4 gradient banner for "not yet open / not scheduled" and standard destructive red for "closed/deadline passed" across these remaining modules:

### Student SET (`src/pages/student/StudentEvaluation.tsx`)
- `ficEvalWindowStatus === 'not-set'`: `banner banner-warning` → **amber border-l-4 banner**
- `ficEvalWindowStatus === 'upcoming'`: `banner banner-info` → **amber border-l-4 banner**
- `ficEvalWindowStatus === 'ended'`: keep `banner-warning` or → standard **red destructive** notice

### My Grades — Student (`src/pages/student/StudentGrades.tsx`)
- `!allSubmitted` (pending grades): `banner banner-warning` → keep, already matches format

### OCS Consent (`src/pages/ocs/OCSConsents.tsx`)
- `isDeadlinePassed`: `rounded-xl border border-red-200 bg-red-50/70` → standard **`flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/5`** format

### GE Elective Requests OCS (`src/pages/ocs/OCSGeElective.tsx`)
- `isApprovalDeadlinePassed`: current red inline → **standard destructive** format
- Upcoming deadline notice (amber pill): → **amber border-l-4 banner** (it's informational)

### OCS Reconsideration (`src/pages/ocs/OCSReconsideration.tsx`)
- `isDeadlinePassed` inline notice: `mx-4 mt-3 flex...border-red-200 bg-red-50` → **standard destructive** format

### OCS Change & Drop (`src/pages/ocs/OCSChangeDrop.tsx`)
- Same fix as Reconsideration

### Faculty SET (`src/pages/faculty/FacultyEvaluations.tsx`)
- "Submit all grades first" notice: `rounded-lg bg-amber-50/70 border border-amber-200` → **amber border-l-4 banner**

### DeptHead Consents / Faculty Consents
- No window-status banners found — no changes needed

---

## 5. Files Modified

1. `src/components/shared/TermSelect.tsx` — no structural change needed (filtering done at call sites)
2. `src/pages/student/StudentGrades.tsx`
3. `src/pages/student/StudentEvaluation.tsx`
4. `src/pages/faculty/FacultyEvaluations.tsx`
5. `src/pages/faculty/FacultyConsents.tsx`
6. `src/pages/faculty/FacultyPrerogatives.tsx`
7. `src/pages/faculty/FacultyTimetable.tsx`
8. `src/pages/ocs/OCSPrerogatives.tsx`
9. `src/pages/ocs/OCSConsents.tsx`
10. `src/pages/ocs/OCSGeElective.tsx`
11. `src/pages/ocs/OCSReconsideration.tsx`
12. `src/pages/ocs/OCSChangeDrop.tsx`
13. `src/pages/depthead/DeptHeadConsents.tsx`

---

## 6. Implementation Order

1. Banner updates (OCSConsents, OCSReconsideration, OCSChangeDrop, OCSGeElective, StudentEvaluation, FacultyEvaluations)
2. StudentEvaluation required fields
3. FacultyEvaluations by-course redesign
4. Terms dropdown filtering (all pages)
