# Student Enlistment — Fix 2 Issues

## Context
Two bugs exist in `StudentEnlistment.tsx`:

1. **Re-Enlistment Request section appears too early** — The "Missed the finalization deadline? Request Re-Enlistment" card currently shows whenever `!isFinalized`. It should only appear AFTER the finalization period has closed (i.e., after `unfinalizedDeadline` or `finalizeWindowEnd` has passed) and only when the student has NOT finalized.

2. **Enlistment badge is wrong for disqualified students** — When a student is `permanently_disqualified` and enlistment is open, the badge incorrectly shows "Enlistment Open" instead of a locked/blocked state. Also, the re-enlistment request card currently appears for disqualified students (they can see "Missed the deadline?" prompt but the button may be missing or incorrect — this section should be hidden entirely for disqualified students since they need OCS reconsideration, not an unfinalized request).

---

## File to Modify
**`src/pages/student/StudentEnlistment.tsx`** — Two targeted edits.

---

## Changes

### Fix 1 — Re-Enlistment Request Visibility Gate

**Current condition** (line ~668):
```tsx
{!isFinalized && (() => { ... })()}
```

**New condition** — add `!isDisqualified` AND a `pastFinalizationDeadline` check:

Add a derived boolean near the other computed values (after line 130):
```typescript
// Re-enlistment request section only appears after finalization window closes
const pastFinalizationDeadline = (() => {
  const now = new Date();
  if (activeTerm.unfinalizedDeadline && now >= new Date(activeTerm.unfinalizedDeadline)) return true;
  if (activeTerm.finalizeWindowEnd && now >= new Date(activeTerm.finalizeWindowEnd)) return true;
  return false;
})();
```

Change the section wrapper condition:
```tsx
{!isFinalized && !isDisqualified && pastFinalizationDeadline && (() => { ... })()}
```

This ensures:
- Finalized students → section hidden (they're enrolled, no need for request)
- Disqualified students → section hidden (they need OCS reconsideration, not re-enlistment)  
- Before finalization deadline → section hidden (student can still finalize normally)
- After finalization deadline + not finalized → section appears ✓

---

### Fix 2 — Status Badge for Disqualified Students

**Current logic** (lines 530–534):
```tsx
{isFinalized
  ? <Badge>Enlistment Finalized</Badge>
  : enlistmentOpen
    ? <Badge>Enlistment Open</Badge>
    : <Badge><Lock />Enlistment Closed</Badge>}
```

**Fixed logic** — insert `isDisqualified` check between `isFinalized` and `enlistmentOpen`:
```tsx
{isFinalized
  ? <Badge className="bg-green-700 text-white ..."><CheckSquare />Enlistment Finalized</Badge>
  : isDisqualified
    ? <Badge className="bg-red-100 text-red-800 ..."><Lock />Enlistment Locked</Badge>
    : enlistmentOpen
      ? <Badge className="bg-green-100 text-green-800">Enlistment Open</Badge>
      : <Badge className="bg-red-100 text-red-800 ..."><Lock />Enlistment Closed</Badge>}
```

---

## Verification

1. **Disqualified student** — Status badge shows "Enlistment Locked" regardless of whether enlistment is open/closed. Re-enlistment request card does not appear.
2. **Non-finalized student, deadline not passed** — Status badge shows correct open/closed state. Re-enlistment request card does NOT appear yet.
3. **Non-finalized student, after `unfinalizedDeadline`** — Re-enlistment request card appears with the "Request Re-Enlistment" button.
4. **Non-finalized student, after `finalizeWindowEnd`** — Re-enlistment request card appears.
5. **Finalized student** — Green finalized banner shows. No re-enlistment request card.
6. If a student already submitted a request (pending/approved/denied), the status card still appears (since the condition just gates the outer section — existing requests are inside the same IIFE).
