# Term Control + Enlistment Fixes

## Changes

### 1. Fix `deleteTerm` — don't delete courses
**File:** `src/contexts/AppContext.tsx` (~line 898)
- Remove the orphan-course detection + deletion logic entirely
- Keep: `sections`, `enrollments`, `grades`, `prerogatives` deletion by `termId`
- Keep: local state cascade for those same entities
- **Do NOT** delete `courses` — courses are catalog entries independent of terms

### 2. Fix "all batches" enlistment
**File:** `src/pages/student/StudentEnlistment.tsx` (~line 388)
- `effectiveEnlistmentOpen` currently only uses `activeTerm.controls.enlistmentOpen` (manual toggle)
- Admin has NO UI to flip that toggle → always `false` → students can never enlist
- **Fix:** `effectiveEnlistmentOpen = enlistmentOpen || enlistmentWindowStatus === 'open' || appealBypass`
- This makes the date window (`enlistmentFrom`/`enlistmentUntil`) auto-open enlistment without needing a manual toggle

### 3. Inline edit for term name + academic year
**File:** `src/pages/admin/AdminTermControl.tsx`
- Add `editingHeader` state: `{ termId: string; name: string; academicYear: string } | null`
- In the card header, show a small pencil/edit icon next to the term name
- Clicking it swaps the name + academic year into inline `<Input>` fields with save/cancel buttons
- On save: call `updateTermSettings(termId, { name, academicYear })` — **check if `academicYear` is in the `Partial<Term>` update signature**

### 4. Enhance AdminTermControl UI
**File:** `src/pages/admin/AdminTermControl.tsx`
Redesign term cards to be more visual and navigable:
- **Card header**: gradient (`bg-primary` when active, `bg-muted/60` otherwise), inline-edit for name + academic year, quick stat badges (section count, student count), active/inactive badge
- **Quick controls row**: horizontal toggle switches for `enlistmentOpen`, `prerogativeOpen`, `ficEvalOpen`, `gradeSubmissionOpen` — calls `updateTermControls(termId, { key: value })`
- **Window status grid**: replace flat pills with a 2×3 grid of mini status cards (icon + label + open/upcoming/ended/not-set badge with color)
- **Edit button**: remains to open the full settings accordion (unchanged logic)
- **Delete**: alert dialog stays same
- **Overall**: add subtle shadow, rounded-xl, better spacing, color-coded sections
- Keep all existing edit form logic and SectionBlock components intact

## Files to Modify
| File | Change |
|------|--------|
| `src/contexts/AppContext.tsx` | Remove course deletion in `deleteTerm` |
| `src/pages/student/StudentEnlistment.tsx` | Fix `effectiveEnlistmentOpen` |
| `src/pages/admin/AdminTermControl.tsx` | Inline header edit + UI redesign |

## Verification
1. Delete a term → sections/enrollments/grades removed, course catalog intact
2. Set `enlistmentFrom`/`Until` dates spanning today in active term → students can see "Enlist All" button
3. Edit term name/academic year inline in card header → reflected immediately
4. Quick control toggles flip `controls.*` → affects student portal immediately
