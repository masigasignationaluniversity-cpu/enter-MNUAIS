# Late Enrollment Banner & Flow

## Context
A student with 0 enlisted units (missed enrollment) needs to see a "Request for Late Enrollment" banner with instructions and an appeal letter form. The OCS can review, respond, and approve/deny. Once approved, the student can enlist + finalize even after the registration window has passed.

The `late_enlistment` type already exists in `ReconsiderationRequest` (types.ts), `reconsiderationRequests` AppState, `submitReconsiderationRequest` function, and the OCSReconsideration "Late Enlistment" tab. Much of the infrastructure is already there.

---

## What Already Works
- `hasApprovedLateEnlistThisTerm` bypasses `effectiveEnlistmentOpen` so the enlist buttons appear
- `submitReconsiderationRequest(..., 'late_enlistment')` already sends to OCS
- OCSReconsideration.tsx "Late Enlistment" tab already shows requests + approve/deny
- `latestLateRequest` tracks the student's latest request for the active term
- The existing "Enlistment Window Has Closed" banner already shows a "Request Late Re-enlistment" button

## What's Missing
1. **Prominent banner for 0-unit students** — currently the banner appears for ALL students when window is ended, not specifically for 0-unit students with late enrollment instructions
2. **Finalize bypass when late enlistment approved** — `finalizeButtonVisible` doesn't include `hasApprovedLateEnlistThisTerm`
3. **OCS approval note** — when OCS approves (not just denies), they can't write a response visible to the student
4. **Student sees OCS response on approval** — student only sees response on denial, not on approval

---

## Files to Modify

### 1. `src/pages/student/StudentEnlistment.tsx`

**a. Fix finalize bypass** (line ~254):
```tsx
const finalizeButtonVisible = finalizeWindowStatus === 'open' || hasApprovedUnfinalizedRequest || hasApprovedLateEnlistThisTerm;
```

**b. Replace the "Enlistment Window Has Closed" banner** (line ~736) with conditional rendering:
- When `enlistmentWindowStatus === 'ended' && currentUnits === 0 && !hasApprovedLateEnlistThisTerm`: Show the full "Request for Late Enrollment" banner:
  - Orange/amber border, prominent styling
  - Title: "Request for Late Enrollment"
  - Instructions explaining what late enrollment is and how the process works
  - If `latestLateRequest.status === 'pending'`: show "Under Review" status badge
  - If `latestLateRequest.status === 'denied'`: show denied notice + OCS response + re-apply button
  - If no request or denied: show "Submit Appeal Letter" button
  
- When `enlistmentWindowStatus === 'ended' && currentUnits > 0 && !hasApprovedLateEnlistThisTerm`: Keep existing shorter banner (student has some courses, just wants to add more)

- When `hasApprovedLateEnlistThisTerm`: Show a green "Late Enrollment Approved" banner:
  - Title: "Late Enrollment Granted"  
  - If `latestLateRequest.response`: show OCS response note
  - Guidance: "You may now enlist your subjects and finalize your enrollment."

**c. Improve the appeal letter dialog** content (already has `showLateEnlistDialog`):
- Add instructions at top of the dialog
- Keep existing Textarea for the reason/appeal letter
- Submit button text: "Submit Appeal Letter"

### 2. `src/pages/ocs/OCSReconsideration.tsx`

**a. Add approval note for late enlistment requests:**
- Add state: `approveNoteId: string | null`, `approveNote: string`
- Replace the AlertDialog for late enlistment approve with a regular Dialog
- Dialog has: confirmation text + optional "Response to Student" Textarea + "Grant Access" button
- `handleApprove` receives optional note: `processReconsiderationRequest(requestId, 'approved', me.id, note || undefined)`

**b. Show OCS response on approved late enlistment cards:**
- Currently only shows `req.response` when `req.status !== 'pending'` (already done for both tabs)
- This already handles it — approved cards will show the note if it was set

---

## Data Flow Summary
1. Student (0 units, window closed) → sees banner → opens dialog → writes appeal letter → `submitReconsiderationRequest(id, termId, reason, 'late_enlistment')`
2. OCS sees request in "Late Enlistment" tab → opens approve dialog → optionally writes response → `processReconsiderationRequest(id, 'approved', ocsId, note)`
3. `hasApprovedLateEnlistThisTerm` becomes `true` → student sees green banner with OCS note
4. Student can now enlist (bypassed via `effectiveEnlistmentOpen`) and finalize (bypassed via updated `finalizeButtonVisible`)
