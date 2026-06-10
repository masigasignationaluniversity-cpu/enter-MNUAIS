# Fix: Auto-Drop Unfinalized Enlistments on Deadline

## Problem
Students with "Enlisted" (not finalized) status are NOT automatically dropped when the enlistment deadline passes. The auto-drop runs only **once per session** on startup via `hasRunInitAutoDropRef`, so any user already logged in when a deadline passes is never affected.

Two additional sub-bugs:
- `dropUnfinalizedCourses` exits early if `unfinalizedDeadline` is not set — ignoring `enlistmentUntil`
- The 60-second periodic refresh reloads data but never re-checks deadlines

---

## Root Cause (AppContext.tsx)

### Bug 1 — One-shot gate
```tsx
// Runs only once per session:
if (!state.currentUser || hasRunInitAutoDropRef.current) return;
hasRunInitAutoDropRef.current = true;  // <-- never resets
```

### Bug 2 — No fallback deadline
```tsx
// Exits if unfinalizedDeadline is not configured:
if (!term?.unfinalizedDeadline) return;
```

### Bug 3 — Periodic refresh never checks deadlines
The 60-second `setInterval` only reloads data — it never calls `dropUnfinalizedCourses`.

---

## Fix (3 changes, all in `src/contexts/AppContext.tsx`)

### Change 1 — `dropUnfinalizedCourses`: fall back to `enlistmentUntil`
```tsx
// Before:
if (!term?.unfinalizedDeadline) return;
const now = new Date();
if (now < new Date(term.unfinalizedDeadline)) return;

// After:
const effectiveDeadline = term?.unfinalizedDeadline ?? term?.enlistmentUntil;
if (!effectiveDeadline) return;
const now = new Date();
if (now < new Date(effectiveDeadline)) return;
```

### Change 2 — Startup auto-drop: remove one-shot gate, expand deps
Remove `hasRunInitAutoDropRef` check. Use `state.enrollments.length` and `state.terms.length` as additional deps so it re-evaluates after data reloads. Also include `enlistmentUntil` fallback in the condition:
```tsx
useEffect(() => {
  if (!state.currentUser) return;
  if (state.sections.length === 0 || state.enrollments.length === 0) return;
  const now = new Date();
  state.terms.forEach(term => {
    const deadline = term.unfinalizedDeadline ?? term.enlistmentUntil;
    if (deadline && now >= new Date(deadline)) {
      dropUnfinalizedCourses(term.id);
    }
  });
}, [state.currentUser?.id, state.sections.length, state.enrollments.length, state.terms.length]);
// eslint-disable-line react-hooks/exhaustive-deps
```

### Change 3 — Periodic deadline-check using a ref (avoids stale closure)
Add a `deadlineCheckRef` that always holds the latest check function. Call it from the 60-second interval:
```tsx
// After dropUnfinalizedCourses useCallback:
const performDeadlineCheck = useCallback(() => {
  const now = new Date();
  state.terms.forEach(term => {
    const deadline = term.unfinalizedDeadline ?? term.enlistmentUntil;
    if (deadline && now >= new Date(deadline)) {
      dropUnfinalizedCourses(term.id);
    }
  });
}, [state.terms, dropUnfinalizedCourses]);

const deadlineCheckRef = useRef(performDeadlineCheck);
useEffect(() => {
  deadlineCheckRef.current = performDeadlineCheck;
}, [performDeadlineCheck]);
```

Then in the existing 60-second `setInterval`, after the data loads, add:
```tsx
deadlineCheckRef.current();
```

---

## Files to Change
- `src/contexts/AppContext.tsx` — only file that needs changes

## Safety
- `dropUnfinalizedCourses` is already idempotent: exits early via `enlistedEnrollments.length === 0` when there's nothing to drop, so multiple calls are safe
- The ref pattern prevents stale closure inside `setInterval`
- Existing logic that exempts approved-unfinalized-request students is preserved
