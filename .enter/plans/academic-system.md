# Plan of Study Module

## Context
Students need a graduation checklist view split into 6 panels showing which required courses they've passed/enrolled/not taken. OCS configures requirements per college (required course IDs + max count per category). Admin configures required GE and HK/PE/NSTP lists globally. Each course gets a new `category` field.

---

## 1. Database Migrations

### A. Add `category` to `courses` table
```sql
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category text DEFAULT 'Major';
```
Values: `'GE'` | `'Elective GE'` | `'HK/PE/NSTP'` | `'Major'` | `'Specialized'` | `'Thesis'`

### B. New `graduation_requirements` table
```sql
CREATE TABLE graduation_requirements (
  college_id text PRIMARY KEY,  -- 'global' row for admin GE/HKPENSTP lists; actual college IDs for OCS settings
  -- Admin-managed (only on 'global' row)
  required_ge_course_ids       jsonb DEFAULT '[]',
  required_hk_pe_nstp_course_ids jsonb DEFAULT '[]',
  -- OCS-managed (on per-college rows)
  required_elective_ge_course_ids  jsonb DEFAULT '[]',
  max_elective_ge              integer DEFAULT 0,
  required_major_course_ids    jsonb DEFAULT '[]',
  max_major                    integer DEFAULT 0,
  required_specialized_course_ids jsonb DEFAULT '[]',
  max_specialized              integer DEFAULT 0,
  required_thesis_course_ids   jsonb DEFAULT '[]',
  max_thesis                   integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE graduation_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grad_req_all" ON graduation_requirements FOR ALL USING (true) WITH CHECK (true);
INSERT INTO graduation_requirements (college_id) VALUES ('global') ON CONFLICT DO NOTHING;
```

---

## 2. Types (`src/lib/types.ts`)

Add `CourseCategory` type:
```ts
export type CourseCategory = 'GE' | 'Elective GE' | 'HK/PE/NSTP' | 'Major' | 'Specialized' | 'Thesis';
```

Add `category?: CourseCategory` to `Course` interface.

Add `GraduationRequirements` interface:
```ts
export interface GraduationRequirements {
  collegeId: string;
  requiredGeCourseIds: string[];
  requiredHkPeNstpCourseIds: string[];
  requiredElectiveGeCourseIds: string[];
  maxElectiveGe: number;
  requiredMajorCourseIds: string[];
  maxMajor: number;
  requiredSpecializedCourseIds: string[];
  maxSpecialized: number;
  requiredThesisCourseIds: string[];
  maxThesis: number;
}
```

Add `graduationRequirements: GraduationRequirements[]` to `AppState`.

---

## 3. AppContext (`src/contexts/AppContext.tsx`)

### State loading
- Load `graduation_requirements` table on init (alongside courses).
- Map DB rows → `GraduationRequirements` objects.

### New context functions
```ts
saveGraduationRequirements: (req: GraduationRequirements) => void;
```
- Upserts one row in `graduation_requirements` by `college_id`.
- Updates local state immediately.

### Course fields
- Map `category` from DB when loading courses.
- Pass `category` in `addCourse` / `updateCourse` to DB.

---

## 4. OCS Courses page (`src/pages/ocs/OCSCourses.tsx`)

Add `category` field to the add/edit form:
- New `<Select>` for category: GE | Elective GE | HK/PE/NSTP | Major | Specialized | Thesis
- Default: `'Major'`
- Show category badge in the course list table.

---

## 5. New: OCS Plan of Study Config (`src/pages/ocs/OCSPlanOfStudy.tsx`)

Route: `/ocs/plan-of-study`  
Nav label: **"Plan of Study"** (icon: `GraduationCap`)

UI layout:
- College selector at top (dropdown of all colleges)
- Two sub-tabs per college: **Required Courses** | **Max Counts**

### Required Courses tab (6 sections — collapsible):
For each category (Elective GE, Major, Specialized, Thesis — OCS manages these 4; GE and HK/PE/NSTP are admin-only and shown read-only):
- Search + Add course picker (filters courses by category)
- Displays current required course IDs as removable badges/rows

### Max Counts tab:
- Number inputs for: Max Elective GE, Max Major, Max Specialized, Max Thesis
- Save button → calls `saveGraduationRequirements`

---

## 6. New: Admin Graduation Settings panel (`src/pages/admin/AdminGraduationSettings.tsx`)

Route: `/admin/graduation-settings`  
Nav label: **"Graduation"** (icon: `GraduationCap`)

UI: Two panels side-by-side:
1. **Required GE Courses** — search/add/remove course picker (filters courses with `category === 'GE'`)
2. **Required HK/PE/NSTP Courses** — same but `category === 'HK/PE/NSTP'`

Saves to the `'global'` row in `graduation_requirements`.

---

## 7. New: Student Plan of Study (`src/pages/student/StudentPlanOfStudy.tsx`)

Route: `/student/plan-of-study`  
Nav label: **"Plan of Study"** (icon: `GraduationCap`)

### Logic
Get the student's college → look up `graduation_requirements` for that college (+ 'global').

Build status for each course:
```
passed    → has submitted grade that is passing (1.0–3.0, P, S)
in_progress → currently enrolled this term (status = 'enlisted'/'enrolled')
failed    → has grade 4/5/F/U (final)
not_taken → no record
```

### Six panels (accordion cards)
Each panel shows:
- Panel header: category name + progress bar (X / Y required passed)
- Table: Course Code | Title | Units | Status badge | Grade

**1. General Education Courses**
- Source: `required_ge_course_ids` from 'global' row
- All are required; shows every course in the list

**2. Elective General Education Courses**
- Source: `required_elective_ge_course_ids` from college row
- Shows required ones + "Select up to N" label (`max_elective_ge`)

**3. HK, PE, NSTP**
- Source: `required_hk_pe_nstp_course_ids` from 'global' row

**4. Major Courses**
- Source: `required_major_course_ids` from college row
- Shows required + max count label

**5. Specialized Courses**
- Source: `required_specialized_course_ids` from college row

**6. Thesis**
- Source: `required_thesis_course_ids` from college row

### Graduation Eligibility Banner
At the top: green "Eligible to Graduate" banner OR red list of incomplete requirements.
A student is eligible if ALL required courses in all panels are passed (within max counts).

---

## 8. Navigation & Router Updates

### `src/components/shared/PortalLayout.tsx`
- Add to `student` nav: `{ label: 'Plan of Study', path: '/student/plan-of-study', icon: <GraduationCap> }`
- Add to `ocs` nav: `{ label: 'Plan of Study', path: '/ocs/plan-of-study', icon: <GraduationCap> }`
- Add to `admin` nav: `{ label: 'Graduation', path: '/admin/graduation-settings', icon: <GraduationCap> }`

### `src/router.tsx`
Add 3 new routes for the 3 new pages.

---

## 9. Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/types.ts` | Add `CourseCategory`, update `Course`, add `GraduationRequirements`, update `AppState` |
| `src/contexts/AppContext.tsx` | Load grad requirements, add `saveGraduationRequirements`, map course `category` |
| `src/pages/ocs/OCSCourses.tsx` | Add category field to form + table |
| `src/pages/ocs/OCSPlanOfStudy.tsx` | NEW — OCS config page |
| `src/pages/admin/AdminGraduationSettings.tsx` | NEW — Admin GE/HKPENSTP config |
| `src/pages/student/StudentPlanOfStudy.tsx` | NEW — Student checklist view |
| `src/components/shared/PortalLayout.tsx` | Add nav items |
| `src/router.tsx` | Add 3 routes |

---

## 10. Verification
- Add a course with category `GE` → appears in admin GE picker.
- Admin adds it to required GE list → saves to DB.
- OCS selects a college, adds Major courses, sets max count → saves.
- Student (in that college) views Plan of Study → GE panel shows the course with status.
- After student passes the course → status changes to "Passed", progress bar updates.
- Graduation eligibility banner turns green when all requirements met.
