# GE Electives Module — Plan

## Context
User wants a new "GE Electives" module mirroring the Specialization module but for `Elective GE` courses. Both a student-facing page (select & submit courses) and an OCS review page (approve/deny) are needed.

## Changes

### 1. `src/lib/types.ts`
**Add:**
```ts
export type GeElectiveRequestStatus = 'pending' | 'approved' | 'denied';
export interface GeElectiveRequest {
  id: string; studentId: string; courseIds: string[]; totalUnits: number;
  status: GeElectiveRequestStatus; requestedAt: string;
  processedAt?: string; processedBy?: string; response?: string;
  isChangeRequest?: boolean; previousRequestId?: string;
}
```
**To Term:** Add `geElectiveFrom?`, `geElectiveUntil?`, `geElectiveChangeUntil?`, `geElectiveApprovalUntil?`
**To AppState:** Add `geElectiveRequests: GeElectiveRequest[]`
**To AppContext interface:** Add `submitGeElectiveRequest`, `cancelGeElectiveRequest`, `processGeElectiveRequest`

### 2. `src/contexts/AppContext.tsx`
- Initialize `geElectiveRequests: []` in state guard
- Add `app_settings` subscription for key `ge_elective_requests`
- Load from `map.ge_elective_requests` on settings load
- Add `submitGeElectiveRequest(studentId, courseIds)` — identical pattern to `submitSpecializationRequest` but uses `ge_elective_requests` key
- Add `cancelGeElectiveRequest(requestId)` — same pattern as cancel
- Add `processGeElectiveRequest(requestId, status, processedBy, response?)` — same pattern as process
- Expose all three in the context value

### 3. `src/pages/student/StudentGeElective.tsx` (NEW)
Clone of `StudentSpecialization.tsx` adapted for GE Electives:
- Title: `"GE Elective Planner"`
- Courses source: `collegeReq?.requiredElectiveGeCourseIds` with fallback to `state.courses.filter(c => c.category === 'Elective GE')`
- Max units: `collegeReq?.maxElectiveGe ?? 0`
- **No Junior standing gate** (GE Electives don't require junior standing)
- Uses term windows: `geElectiveFrom`, `geElectiveUntil`, `geElectiveApprovalUntil`, `geElectiveChangeUntil`
- Uses state: `geElectiveRequests`, functions: `submitGeElectiveRequest`, `cancelGeElectiveRequest`
- PDF label: `"GE Elective Plan — OCS Approval"`

### 4. `src/pages/ocs/OCSGeElective.tsx` (NEW)
Clone of `OCSSpecialization.tsx` adapted:
- Title: `"GE Elective Requests"`
- Uses `state.geElectiveRequests` and `processGeElectiveRequest`
- Icon: `BookMarked` (to distinguish from Specialization which uses `Layers`)

### 5. `src/pages/admin/AdminTermControl.tsx`
In the Specialization `SectionBlock`, add a new parallel `SectionBlock` for GE Elective windows:
- `geElectiveFrom / geElectiveUntil` (application window)
- `geElectiveChangeUntil` (change deadline)
- `geElectiveApprovalUntil` (OCS approval deadline)
- Add `WindowRow` display for `geElectiveFrom/Until`
- Update `EditForm` type, `emptyEditForm`, `openEditForm`, `handleSave` accordingly

### 6. `src/components/shared/PortalLayout.tsx`
- Student nav: add `{ label: 'GE Electives', path: '/student/ge-elective', icon: <BookMarked size={16} /> }` after Specialization
- OCS nav: add `{ label: 'GE Elective Requests', path: '/ocs/ge-elective', icon: <BookMarked size={16} /> }` after Specialization
- bannerMap entries for both paths
- Hide `/student/ge-elective` for `associate_certificate` students (same conditional as Specialization)

### 7. `src/router.tsx`
- Add imports for `StudentGeElective` and `OCSGeElective`
- Add routes: `/student/ge-elective` and `/ocs/ge-elective`

## Files to Modify/Create
1. `src/lib/types.ts` — new types + Term fields + AppState field + AppContext interface
2. `src/contexts/AppContext.tsx` — state init + app_settings + 3 new functions
3. `src/pages/student/StudentGeElective.tsx` — NEW (clone + adapt)
4. `src/pages/ocs/OCSGeElective.tsx` — NEW (clone + adapt)
5. `src/pages/admin/AdminTermControl.tsx` — new GE Elective window section
6. `src/components/shared/PortalLayout.tsx` — nav items + banner + hide for assoc/cert
7. `src/router.tsx` — new routes
