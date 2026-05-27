# Feature: Change/Drop After Finalization + Schedule Windows

## Summary of Changes

### 1. `src/lib/types.ts`
Add to `Term`:
- `lateEnrollmentFrom?: string`   — datetime: when Late Enrollment banner shows to students
- `lateEnrollmentUntil?: string`  — datetime: when Late Enrollment banner/appeal closes
- `changeDropFrom?: string`       — datetime: window opens for Change/Drop after finalization
- `changeDropUntil?: string`      — datetime: deadline for Change/Drop appeals

Add new type:
```ts
export type ChangeDropRequestStatus = 'pending' | 'approved' | 'denied';
export interface ChangeDropRequest {
  id: string; studentId: string; termId: string;
  reason: string; status: ChangeDropRequestStatus;
  requestedAt: string; processedAt?: string;
  processedBy?: string; response?: string;
}
```
Add `changeDropRequests: ChangeDropRequest[]` to `AppState`.

---

### 2. Supabase Migration
```sql
CREATE TABLE change_drop_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id),
  term_id uuid NOT NULL REFERENCES terms(id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES users(id),
  response text
);
ALTER TABLE change_drop_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON change_drop_requests FOR ALL USING (true) WITH CHECK (true);
```

---

### 3. `src/contexts/AppContext.tsx`
- Add `changeDropRequests: []` to initial state
- Load from `change_drop_requests` table on init
- Add `submitChangeDropRequest(studentId, termId, reason)` — inserts row
- Add `processChangeDropRequest(requestId, status, processedBy, response?)`:
  - Updates row status
  - If `status === 'approved'`: also deletes the `finalizedEnlistments` record for that student+term (mirrors old `processUnfinalizedRequest`) so student can re-enlist/finalize
- Add `loadChangeDropRequests()` — refreshes from DB
- Expose all in context value

---

### 4. `src/pages/admin/AdminTermControl.tsx`
Add to `EditForm` type:
```ts
lateEnrollmentFrom: string; lateEnrollmentUntil: string;
changeDropFrom: string; changeDropUntil: string;
```
Add two new `DateWindowRow` entries in the edit form UI:
- "Late Enrollment Request Window" (from/until) — under the existing enlistment section
- "Change & Drop After Finalization Window" (from/until) + single `unfinalizedDeadline` datetime — separate section

Update `openEdit` and `handleSaveEdit` to include the new fields.
Update `updateTermSettings` call accordingly.

---

### 5. `src/pages/student/StudentEnlistment.tsx`
**Late Enrollment banner logic**: Only show when `now` is within `activeTerm.lateEnrollmentFrom` to `lateEnrollmentUntil` (if not set, default to showing when enlistment window ends).

**New "Change/Drop" banner** — shown when:
- `isFinalized === true`
- `now >= activeTerm.changeDropFrom` AND `now <= activeTerm.changeDropUntil`

Banner shows:
- Pending: "Under OCS review"
- Denied: OCS note
- Not submitted: appeal letter + textarea + submit button
- Approved: green "Change/Drop Access Granted"

**`hasApprovedChangeDropRequest`**: computed from `state.changeDropRequests` — finds approved request for this student+term.

When `hasApprovedChangeDropRequest`:
- `effectiveEnlistmentOpen = true` → can enlist
- `canDrop = true` → can drop
- `finalizeButtonVisible = true` → can re-finalize

---

### 6. `src/pages/student/StudentConsent.tsx`
Add `hasApprovedChangeDropRequest` bypass:
```ts
const isConsentWindowOpen = (key) =>
  (hasApprovedLateEnlistThisTerm && !isFinalized) ||
  hasApprovedChangeDropRequest ||
  getConsentWindowStatus(key) === 'open';
```

### 7. `src/pages/student/StudentPrerogatives.tsx`
Add `hasApprovedChangeDropRequest` to `effectivePrerogativeOpen`:
```ts
const effectivePrerogativeOpen = prerogativeOpen || hasApprovedLateEnlistThisTerm || hasApprovedChangeDropRequest;
```

---

### 8. New `src/pages/ocs/OCSChangeDrop.tsx`
New OCS page modeled after `OCSReconsideration.tsx`:
- Loads `changeDropRequests` from state (filtered by OCS college)
- Shows cards with student info, appeal letter, status
- Approve (with optional response note) / Deny (with required note) actions
- Refresh button
- Badge count on pending

---

### 9. `src/router.tsx`
Add: `{ path: "/ocs/change-drop", name: "ocs-change-drop", element: <OCSChangeDrop /> }`

### 10. `src/components/shared/PortalLayout.tsx`
Add to OCS nav: `{ label: 'Change & Drop', path: '/ocs/change-drop', icon: <RefreshCw size={16} /> }`
