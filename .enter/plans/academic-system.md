# Plan: Filter Dropdowns + Plan of Study Flowchart PDF

## 1. Filter Dropdowns — Courses Module (`src/pages/ocs/OCSCourses.tsx`)

### New state
```ts
const [filterCategory, setFilterCategory] = useState<CourseCategory | ''>('');
const [filterType, setFilterType] = useState<CourseType | ''>('');
```

### Update `filtered`
```ts
const filtered = state.courses.filter(c =>
  (!dept || c.department === dept) &&
  (!filterCategory || c.category === filterCategory) &&
  (!filterType || c.type === filterType) &&
  (search === '' || c.code.toLowerCase().includes(...) || ...)
);
```

### Toolbar additions (next to existing Search input)
- `<Select>` for **Category**: All Categories | Major | GE | Elective GE | HK/PE/NSTP | Specialized | Thesis
- `<Select>` for **Type**: All Types | Lec | Lab | Lec+Lab | Recitation | Thesis | Thesis 1 | Thesis 2 | Internship
- Show active filter count badge if any filter is set

---

## 2. Filter Dropdowns — Sections Module (`src/pages/ocs/OCSSections.tsx`)

### New state
```ts
const [filterCategory, setFilterCategory] = useState<CourseCategory | ''>('');
```

### Update `filtered`
```ts
const filtered = activeSections.filter(s => {
  const course = state.courses.find(c => c.id === s.courseId);
  return (
    (!filterCategory || course?.category === filterCategory) &&
    (!search || course?.code.toLowerCase().includes(search.toLowerCase()) || ...)
  );
});
```

### Toolbar addition
- `<Select>` for **Category**: All Categories | Major | GE | Elective GE | HK/PE/NSTP | Specialized | Thesis

---

## 3. Plan of Study Flowchart PDF — `src/pages/student/StudentPlanOfStudy.tsx` + new component

### Dependencies to install
- `jspdf` — PDF generation
- `html2canvas` — captures DOM node as canvas for PDF embedding

### New file: `src/components/student/PlanFlowchart.tsx`

#### Data collection
- Get ALL required courses from graduation requirements (global + college):
  - `globalReq.requiredGeCourseIds`
  - `globalReq.requiredHkPeNstpCourseIds`
  - `collegeReq.requiredMajorCourseIds`
  - `collegeReq.requiredThesisCourseIds`
  - `collegeReq.requiredGeCourseIds` (additional GE)
  - Unit-based categories (Elective GE, Specialized) — include enrolled courses
- Resolve course IDs to Course objects

#### Layout algorithm (topological leveling)
```
function assignLevels(courses, prereqMap):
  level[c] = 0 for all courses with no prereqs in set
  BFS/DFS: level[c] = max(level[prereq] + 1) for each course
  → Column index = level value
```
- Columns = prerequisite depth (0 = no prereqs, 1 = depends on level-0, etc.)
- Rows = sorted by category first, then alphabetically within each column

#### SVG Rendering
- Box per course: 120×48px, colored by status:
  - `passed` → green border + green bg
  - `in_progress` → blue border + blue bg  
  - `failed` → red border + red bg
  - `not_taken` → white/light bg, dark border
- Course code in bold, title (truncated) below
- Arrows: SVG `<path>` with marker-end arrowhead, from right-center of prereq box to left-center of course box
- Arrow color: black (prereq), purple (coreq)
- Categories are visually grouped with a faint color band per row group

#### PDF Export
```ts
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const exportPDF = async () => {
  const el = document.getElementById('plan-flowchart-svg-wrapper');
  const canvas = await html2canvas(el, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  // Scale canvas to fit PDF page
  pdf.addImage(imgData, 'PNG', 10, 10, pageW - 20, scaledH);
  pdf.save(`${studentName}_plan_flowchart.pdf`);
};
```

#### Button in StudentPlanOfStudy.tsx
- Add `<Button onClick={exportPDF}>Download Flowchart PDF</Button>` in the header area
- Show a loading state while html2canvas is rendering

### Legend
- Small color legend at top of flowchart: Passed (green) | In Progress (blue) | Failed (red) | Not Taken (gray)

---

## Files to modify
| File | Change |
|---|---|
| `src/pages/ocs/OCSCourses.tsx` | Add Category + Type filter dropdowns |
| `src/pages/ocs/OCSSections.tsx` | Add Category filter dropdown |
| `src/pages/student/StudentPlanOfStudy.tsx` | Add Download Flowchart PDF button + hook up component |
| `src/components/student/PlanFlowchart.tsx` | **NEW** — flowchart SVG + export logic |

## Dependencies to install
- `jspdf`
- `html2canvas`

## Verification
1. Courses module: Filter by Major shows only Major courses; combining Category=Major + Type=Lec further narrows list
2. Sections module: Filter by GE shows only sections of GE courses
3. Student POS: Click "Download Flowchart PDF" → downloads PDF with course boxes and prerequisite arrows, color-coded by status
