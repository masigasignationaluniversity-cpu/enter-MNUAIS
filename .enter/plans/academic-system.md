# Academic System — Bug Fixes & Enhancements

## Changes Required

### 1. Re-Enlistment Request (StudentEnlistment.tsx)
**Current**: Shows for ANY non-finalized, non-disqualified student regardless of date.  
**Fix**: Only show the "Re-Enlistment Request" section when `pastFinalizationDeadline === true` AND `!isFinalized` AND `!isDisqualified`.  
(`pastFinalizationDeadline` already computed in the file.)

### 2. Weekly Schedule — Lab Schedule Not Appearing (StudentEnlistment.tsx)
**Current**: `renderTimetable()` uses `blks.push()` + `return blks` pattern that returns arrays-of-arrays. Lab blocks are not rendering visibly.  
**Fix**: Refactor to `React.Fragment` pattern with proper keys:
- Enrolled sections: `<React.Fragment key={sec.id}>` wrapping lecture block + lab block (both conditionally rendered)
- Cart sections: same `React.Fragment` pattern
- Also add lab schedule display for cart sections (currently missing)
- Add time/room info to lab blocks in timetable

### 3. ClassCard Title Format (StudentEnlistment.tsx)
**Current**: `{course.code} ({course.code}-{course.units} Units credit) — {sectionCode}`  
**Fix**: Change to `{course.code} ({course.title})` — bold (already has `font-bold` class)

### 4. Permanent Disqualification — Lock Consent Module (StudentConsent.tsx)
**Current**: No PD lock in consent module.  
**Fix**:
- Add `isDisqualified = me.status === 'permanently_disqualified'`
- Get `submitReconsiderationRequest` from `useApp()`
- Add state: `showReconDialog`, `reconReason`, `submittingRecon`
- Add imports: `Dialog, DialogContent, DialogHeader, DialogTitle`, `Label`, `Input`, `MessageSquare`
- Show red PD lock banner (same style as enlistment) with "Request Reconsideration" button + dialog
- Change all consent form row visibility from `!isFinalized` to `!isFinalized && !isDisqualified`
- Change `canSubmit` and `ocsCanApply` to include `!isDisqualified`

### 5. Permanent Disqualification — Lock Prerogative Module (StudentPrerogatives.tsx)
**Current**: No PD lock in prerogatives module.  
**Fix**:
- Add `isDisqualified = student.status === 'permanently_disqualified'`  
- Get `submitReconsiderationRequest` from `useApp()`
- Add state: `showReconDialog`, `reconReason`, `submittingRecon`
- Add imports: `Dialog, DialogContent, DialogHeader, DialogTitle`, `Label`, `Input`, `MessageSquare`
- Show red PD lock banner with "Request Reconsideration" button + dialog
- Hide "Search Full Sections" panel when `isDisqualified`
- Change `canSubmit` to `false` when `isDisqualified`

## Files to Modify
- `src/pages/student/StudentEnlistment.tsx` — items 1, 2, 3
- `src/pages/student/StudentConsent.tsx` — item 4
- `src/pages/student/StudentPrerogatives.tsx` — item 5
