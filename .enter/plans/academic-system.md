# Enrollment Schedule: Two-Phase Redesign

## Context
The current enrollment schedule is a flat list of days with optional ID prefixes. The user wants a structured two-phase system:
- **Phase 1: Pre-registration** — Days 1-3 (specific IDs), Day 4 (all students)
- **Phase 2: General Registration** — Days 1-3 (specific IDs), Day 4 (all students)

Day 4 of each phase = empty `idPrefixes` = open to all students.

---

## Data Structure Change

**`src/lib/types.ts`** — Add `phase` to `EnrollmentSlot`:
```ts
export interface EnrollmentSlot {
  day: number;          // 1–4 within the phase
  phase: 1 | 2;         // 1 = Pre-registration, 2 = General Registration
  date: string;         // 'YYYY-MM-DD'
  idPrefixes: string[]; // empty = all students eligible
}
```

---

## Files to Change

### 1. `src/lib/types.ts`
Add `phase: 1 | 2` to `EnrollmentSlot`.

### 2. `src/pages/admin/AdminTermControl.tsx`
**EditForm type** — replace single `enrollmentSlots` array with structured per-phase slots:
```ts
enrollmentSlots: Array<{ phase: 1 | 2; day: number; date: string; idPrefixes: string[]; input: string }>;
```
Pre-populate with 8 entries: phase 1 days 1–4 + phase 2 days 1–4. Days 4 are "open" (empty idPrefixes, just need a date).

**`openEdit`** — load existing slots mapped to the new structure; fall back to 8 empty entries.

**`handleSaveEdit`** — map `enrollmentSlots` → `EnrollmentSlot[]` including `phase` field.

**UI** — Replace the flat "Add Day" list with two titled sections:
```
Phase 1: Pre-registration
  ┌─ Day 1 [date] [id prefixes input]
  ├─ Day 2 [date] [id prefixes input]
  ├─ Day 3 [date] [id prefixes input]
  └─ Day 4 [date] — Open to all students (no prefix input)

Phase 2: General Registration
  ┌─ Day 1 [date] [id prefixes input]
  ├─ Day 2 [date] [id prefixes input]
  ├─ Day 3 [date] [id prefixes input]
  └─ Day 4 [date] — Open to all students
```

### 3. `src/pages/student/StudentEnlistment.tsx`
**`isMyEnrollDay`** — check today matches a slot where:
- `slot.idPrefixes.length === 0` (open day) OR
- `matchesEnrollPrefix(slot.idPrefixes)` (student ID matches)

**`checkEnrollmentSchedule`** — same logic update.

**Enrollment Schedule Banner** — replace flat list with two-phase display:
```
┌─────────────────────────────────┐
│ Phase 1: Pre-registration       │
│ Day 1 - May 28: IDs 2021, 2022  │
│ Day 2 - May 29: IDs 2020, 2019  │
│ Day 3 - May 30: IDs 2018, 2017  │
│ Day 4 - May 31: Open to all     │
├─────────────────────────────────┤
│ Phase 2: General Registration   │
│ Day 1 - Jun 2:  IDs 2021, 2022  │
│ ...                             │
│ Day 4 - Jun 5:  Open to all     │
└─────────────────────────────────┘
```
- Today's slot highlighted in green
- "Today is your enrollment day!" message if student is eligible today

---

## Backward Compatibility
Existing slots without `phase` will be treated as phase 1 by default.
