# Match Consent/Prerogative pending stat cards to OCS Graduation Applications style

## Goal
Replace the small pill-style `StatChip` rows currently used in OCS Consents, OCS Prerogatives, Faculty Consents, Faculty Prerogatives, and Dept Head Consents with the bigger stat-card style already used in `OCSGraduationApplications.tsx` (icon-in-rounded-square + large number + label, using `dash-stat portal-panel` classes), matching the reference screenshot: **Pending** (orange), **Approved** (dark maroon/primary gradient), **Denied** (red).

Per user's decision: **visual style only** — non-clickable (plain `div`, not `button`), no filtering behavior change. Page layout (separate "Pending Applications" + "Transaction History" panels) stays exactly as-is.

## Shared color/style reference (copied from OCSGraduationApplications.tsx)
```
Pending:  { background: 'linear-gradient(135deg, hsl(38 95% 50%), hsl(25 95% 50%))' }
Approved: { background: 'var(--gradient-header)' }   // dark maroon
Denied:   { background: 'linear-gradient(135deg, hsl(0 70% 55%), hsl(0 70% 45%))' }
```
Card markup per stat:
```jsx
<div className="dash-stat portal-panel">
  <div className="dash-stat-icon" style={style}>{icon}</div>
  <p className="dash-stat-value">{count}</p>
  <p className="dash-stat-label">{label}</p>
</div>
```
Wrapped in `<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">`.

## Per-file changes

### `src/pages/ocs/OCSConsents.tsx`
Current: `StatChip` row with Pending / Processed / Total (based on `ocsConsentStatus`).
New: compute `approvedOCS`/`deniedOCS` by splitting `processedOCS`, then render 3 `dash-stat` cards: Pending / Approved / Denied. Remove `StatChip` import if no longer used elsewhere in file (it isn't).

### `src/pages/ocs/OCSPrerogatives.tsx`
Current: `StatChip` row with Pending / Approved / Denied / Total (based on prerogative `status`).
New: same 3 counts already computed (`pending`, `progs.filter(approved)`, `progs.filter(denied)`) — just re-render as 3 `dash-stat` cards, drop the "Total" chip to match the 3-card reference exactly. Remove `StatChip` import.

### `src/pages/faculty/FacultyConsents.tsx`
Current: `StatChip` row with "COI Pending" / "COI Sections" (based on `coiStatus`, no approved/denied breakdown).
New: compute `totalCoiApproved` / `totalCoiDenied` alongside existing `totalCoiPending`, render 3 `dash-stat` cards: Pending / Approved / Denied. Remove `StatChip` import.

### `src/pages/faculty/FacultyPrerogatives.tsx`
Current: `StatChip` row already has Pending / Approved / Denied (`totalPending`, `totalApproved`, `totalDenied`) — just swap the chip rendering for 3 `dash-stat` cards. Remove `StatChip` import.

### `src/pages/depthead/DeptHeadConsents.tsx`
Current: `StatChip` row with "Pending" / "Dept Consent Sections" (based on `deptConsentStatus`, no approved/denied breakdown).
New: compute `totalApproved` / `totalDenied` for dept consent status alongside existing `totalPending`, render 3 `dash-stat` cards: Pending / Approved / Denied. Remove `StatChip` import.

## Out of scope
- No changes to `SectionRequestCard`, table content, banners, or approve/deny action logic.
- No click-to-filter behavior added (per user's choice).
- `StatChip` component itself is not deleted (still may be used elsewhere), just its imports removed from these 5 files where no longer used.
