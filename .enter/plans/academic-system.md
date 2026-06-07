# Bug Fixes + POS Enlistment Restriction

## Bugs Identified

### Bug 1 — OCSPlanOfStudy: Admin HK/PE/NSTP not excluded from Additional Required Courses search
`globalGeIds` excludes admin GE. But admin HK/PE/NSTP (`globalReq?.requiredHkPeNstpCourseIds`) is NOT excluded from the Additional Required Courses search. Fix: add `globalHkIds` set and include it in `excludedIds`.

### Bug 2 — StudentPlanOfStudy: Elective GE panel missing approved GE Elective plan courses
The Specialized panel merges enrolled + approved Specialization plan courses. The Elective GE panel ONLY shows `studentCoursesByCategory.get('Elective GE')` (enrolled). Fix: mirror the Specialized pattern with `state.geElectiveRequests`.

### Bug 3 — StudentPlanOfStudy: allFlowchartCourses missing GE Elective plan
`allFlowchartCourses` (used for flowchart/PDF) includes `approvedSpec?.courseIds` but not `approvedGeElective?.courseIds`. Fix: add GE Elective plan to `allIds`.

### Bug 4 — StudentEnlistment: No geElectiveBlocked check for Elective GE courses
`specializationBlocked` hard-blocks Specialized courses without an approved plan. There's no equivalent for `Elective GE` category courses. Fix: add `geElectiveBlocked` to `getSectionInfo` and `handleEnlist`.

## New Feature: POS Enlistment Warning Pop-Up

When a student tries to enlist a course that is NOT in their Plan of Study, show a **confirmation dialog** (not a hard block):
- Title: "Course Not in Your Plan of Study"
- Body: course name + "This course is not part of your Plan of Study. Are you sure you want to proceed?"
- Buttons: "Proceed Anyway" (enlists) + "Cancel"

## Files to Modify

### 1. `src/pages/ocs/OCSPlanOfStudy.tsx`
**~Line 78**: Add `globalHkIds` alongside `globalGeIds`:
```typescript
const globalHkIds = useMemo(() => {
  const globalReq = state.graduationRequirements.find(r => r.collegeId === 'global' && !r.programId);
  return new Set(globalReq?.requiredHkPeNstpCourseIds ?? []);
}, [state.graduationRequirements]);
```
**~Line 284**: Add to `excludedIds`:
```typescript
...Array.from(globalHkIds),
```

### 2. `src/pages/student/StudentPlanOfStudy.tsx`
**~Line 283**: Update Elective GE panel to mirror Specialized pattern:
```typescript
...(studentDegreeType !== 'associate_certificate' ? [(() => {
  const approvedGe = (state.geElectiveRequests ?? []).find(
    r => r.studentId === student.id && r.status === 'approved'
  );
  const gePlanCourseIds = approvedGe?.courseIds ?? [];
  const gePlanCourses = gePlanCourseIds
    .map(id => state.courses.find(c => c.id === id))
    .filter((c): c is Course => Boolean(c));
  const enrolled = studentCoursesByCategory.get('Elective GE') ?? [];
  const enrolledIds = new Set(enrolled.map(c => c.id));
  const allGeCourses = [...enrolled, ...gePlanCourses.filter(c => !enrolledIds.has(c.id))];
  return {
    label: 'Elective GE' as CourseCategory,
    requiredUnits: collegeReq?.maxElectiveGe ?? 0,
    courses: allGeCourses,
  };
})()] : []),
```

**~Line 354**: Update `allFlowchartCourses` useMemo deps + IDs:
```typescript
const approvedGeElective = (state.geElectiveRequests ?? []).find(
  r => r.studentId === student.id && r.status === 'approved'
);
const allIds = [
  ...existing ids...,
  ...(approvedSpec?.courseIds ?? []),
  ...(approvedGeElective?.courseIds ?? []),  // ADD THIS
];
// Also update deps: add state.geElectiveRequests
```

### 3. `src/pages/student/StudentEnlistment.tsx`
**`getSectionInfo` (~line 830)**: Add `geElectiveBlocked` after `specializationBlocked`:
```typescript
const geElectiveBlocked = !enrolled && !!course &&
  course.category === 'Elective GE' &&
  !(state.geElectiveRequests ?? []).find(
    r => r.studentId === student.id && r.status === 'approved' && r.courseIds.includes(course.id)
  );
```
Update return to include `geElectiveBlocked`.

**New state** (~line 260):
```typescript
const [posWarning, setPosWarning] = useState<{ sec: Section; courseName: string } | null>(null);
```

**New memoized `posAllCourseIds`** (after `getSectionInfo`):
```typescript
const posAllCourseIds = useMemo(() => {
  const globalReq = state.graduationRequirements.find(r => r.collegeId === 'global' && !r.programId);
  const collegeId = state.colleges.find(c => c.name === student.college || c.id === student.college)?.id ?? '';
  const prog = state.degreePrograms?.find(p => p.name === student.program || p.id === student.program);
  const collegeReq = state.graduationRequirements.find(r => r.collegeId === collegeId && r.programId === prog?.id);
  const approvedSpec = (state.specializationRequests ?? []).find(r => r.studentId === student.id && r.status === 'approved');
  const approvedGe = (state.geElectiveRequests ?? []).find(r => r.studentId === student.id && r.status === 'approved');
  const ids = new Set<string>([
    ...(globalReq?.requiredGeCourseIds ?? []),
    ...(globalReq?.requiredHkPeNstpCourseIds ?? []),
    ...(collegeReq?.requiredMajorCourseIds ?? []),
    ...(collegeReq?.requiredGeCourseIds ?? []),
    ...(collegeReq?.requiredThesisCourseIds ?? []),
    ...(approvedSpec?.courseIds ?? []),
    ...(approvedGe?.courseIds ?? []),
  ]);
  return ids;
}, [state.graduationRequirements, state.degreePrograms, state.colleges, state.specializationRequests, state.geElectiveRequests, student.college, student.program, student.id]);
```

**`handleEnlist` (~line 920)**: After `specializationBlocked` check, add:
```typescript
if (geElectiveBlocked) { toast.error('GE Elective Plan Required', ...); return false; }
// POS check — soft warning:
const requirementsConfigured = posAllCourseIds.size > 0;
if (requirementsConfigured && course && !posAllCourseIds.has(course.id)) {
  setPosWarning({ sec, courseName: course.title });
  return false;
}
```

**New helper `performEnlist(sec)`**: Extract the actual `enlistSection` call into a helper so the POS confirmation dialog can call it directly.

**New Dialog** (after existing warning dialog ~line 1565):
```tsx
<Dialog open={!!posWarning} onOpenChange={open => { if (!open) setPosWarning(null); }}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-amber-700">
        <AlertTriangle /> Course Not in Your Plan of Study
      </DialogTitle>
    </DialogHeader>
    <p className="text-sm">...</p>
    <div className="flex justify-end gap-2 mt-4">
      <Button variant="outline" onClick={() => setPosWarning(null)}>Cancel</Button>
      <Button onClick={async () => { const s = posWarning!.sec; setPosWarning(null); await performEnlist(s); }}>
        Proceed Anyway
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

**Bulk enlist** (~line 959): Add `geElectiveBlocked` to bulk failure reasons.

**Finalize issues** (~line 851): Consider whether to add POS check to finalize issues (optional - likely not needed).

## Verification
- Student enlisting a Specialized course without plan → toast hard block (existing)
- Student enlisting an Elective GE course without GE Elective plan → toast hard block (new)
- Student enlisting a course not in their POS → warning dialog with "Proceed Anyway"
- Student with no graduation requirements configured → no warning shown (posAllCourseIds is empty)
- OCS POS Additional Required Courses search → no admin GE or admin HK/PE/NSTP shown
- Student POS Elective GE panel → shows approved GE Elective plan courses + enrolled courses
- Student POS flowchart → includes approved GE Elective plan courses
