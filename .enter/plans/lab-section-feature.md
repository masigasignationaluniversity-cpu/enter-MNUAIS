# Lab/Recitation Section Feature Plan

## Context
For `Lec+Lab` and `Lec+Rec` course types, OCS currently creates a single Section record with both `schedule` (lecture) and `labSchedule` (lab/rec) embedded in one row. The user needs a proper multi-section model where:
- One **lecture section** (parent) is linked to multiple **lab/recitation sections** (children)
- Each lab section has its own FIC, slots, and schedule
- The lab count is auto-calculated: `ceil(lectureSlots / labSlotsPerClass)`
- Students pick BOTH a lecture section AND one lab group separately

---

## Files to Modify

| File | Change |
|---|---|
| `src/lib/types.ts` | Add `parentSectionId?` and `sectionType?` to Section interface |
| `src/contexts/AppContext.tsx` | Update loadSections, addSection, deleteSection, enlistSection |
| `src/pages/ocs/OCSSections.tsx` | Revamp Add form for Lec+Lab/Lec+Rec; display linked sub-sections |
| `src/pages/student/StudentEnlistment.tsx` | Show lecture + lab separately; add lab-picker dialog |

**New migration:** Add `parent_section_id TEXT` and `section_type TEXT` to `sections` table.

---

## 1. Database Migration

```sql
ALTER TABLE sections
  ADD COLUMN IF NOT EXISTS parent_section_id TEXT REFERENCES sections(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS section_type TEXT; -- 'lecture' | 'lab' | 'recitation' | NULL (legacy)
```

ON DELETE CASCADE ensures lab sections are automatically removed when the parent lecture is deleted.

---

## 2. Type Update (`src/lib/types.ts`)

```typescript
export interface Section {
  // ... existing fields ...
  parentSectionId?: string;                          // lab/rec → lecture link
  sectionType?: 'lecture' | 'lab' | 'recitation';   // null = legacy single section
}
```

---

## 3. AppContext Changes (`src/contexts/AppContext.tsx`)

### loadSections
Add `parent_section_id` and `section_type` mapping from DB row → Section object.

### addSection
Save `parent_section_id` and `section_type` to DB.

### deleteSection
No change needed (CASCADE handles child deletion).

### enlistSection – duplicate check update
Current: "block enrolling in 2 sections of same courseId"
New rule:
- Allow ONE lecture enrollment + ONE lab enrollment per courseId per term
- Block: 2 lecture enrollments for same course
- Block: 2 lab enrollments for same course

Logic: when checking course duplicate, also check `sectionType`:
```typescript
const lectureAlready = enrollments.find(e => 
  e.courseId === course.id && sectionTypeOf(e.sectionId) !== 'lab' && sectionTypeOf(e.sectionId) !== 'recitation'
);
// block if enlisting in lecture and lectureAlready exists, or if enlisting in lab and labAlready exists
```

---

## 4. OCSSections.tsx – Add Form Revamp

### New SectionForm type
```typescript
type LabGroup = {
  sectionCode: string;
  facultyId: string;   // defaults to lecture FIC
  slots: number;
  days: Day[]; startTime: string; endTime: string; room: string;
};

type SectionForm = {
  // lecture
  courseId: string; facultyId: string; facultyHidden: boolean;
  sectionCode: string; slots: number;
  days: Day[]; startTime: string; endTime: string; room: string;
  // lab/rec groups (only for Lec+Lab / Lec+Rec)
  labSlotsPerClass: number;
  labGroups: LabGroup[];
};
```

### Auto-generate lab groups
When `slots` or `labSlotsPerClass` changes on a `Lec+Lab`/`Lec+Rec` course:
```typescript
const labCount = Math.ceil(slots / labSlotsPerClass);
// auto-generate labGroups array with codes: `${sectionCode}-L1`, `${sectionCode}-L2`, ...
// inherit facultyId from lecture by default
```

### handleAdd
1. Create the lecture section → get its `id`
2. For each labGroup, create a Section with:
   - `sectionType: 'lab'` (or `'recitation'`)
   - `parentSectionId: lectureSection.id`
   - `sectionCode: labGroup.sectionCode`
   - `slots: labGroup.slots`
   - `schedule: { days, startTime, endTime, room }` (lab schedule goes into `schedule` field)
   - `facultyId: labGroup.facultyId`

### Section List Display
For each section in the list:
- **Lecture** → normal display + show sub-section count badge: "3 Lab Groups"
- **Lab/Rec** → indented or labeled "↳ Lab Group" with parent lecture code

---

## 5. StudentEnlistment.tsx – Two-step Enlistment

### Browse Card
- For a Lec+Lab course: clicking "Add to Cart" on a lecture section opens a **Lab Picker Dialog** showing available lab groups (with schedule, FIC, available slots)
- Student selects one lab group → both lecture + lab section IDs are added to cart

### Cart Display
- Cart shows lecture + linked lab as paired rows
- Both are removed together on "Remove"

### Enlist
- When student enlists the lecture section, also enlist the chosen lab section (two `enlistSection` calls)

### ClassCard (enrolled view)
- Show lecture schedule + lab schedule as a combined card (reuse existing `labSchedule` display logic, but now sourced from the linked lab section's `schedule` field)

---

## 6. Legacy Compatibility
- Sections with `sectionType = null` (old Lec+Lab single records): continue rendering with `labSchedule`
- New sections: `sectionType = 'lecture'` + child `sectionType = 'lab'` records
- `labSchedule` field on lecture section is kept but unused for new records

---

## Verification
1. Add a Lec+Lab course section → verify N lab groups created in DB with `parent_section_id` set
2. Delete lecture section → verify lab sections are cascade-deleted
3. Student enlists lecture section → verify Lab Picker dialog appears
4. Student picks lab group → both appear in cart and then in enrolled list
5. Attempt to add a second lecture section of same course → blocked
6. Old single-section Lec+Lab records still display correctly
