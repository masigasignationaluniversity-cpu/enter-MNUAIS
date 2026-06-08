# Cross-Device Sync Fix

## Context
The app uses Supabase as the real-time backend. Data is synced via:
1. Supabase Realtime (postgres_changes) — pushes updates instantly to all connected clients
2. 60-second polling — catch-all fallback

The complaint "cannot sync all data to the other device" is caused by **missing realtime subscriptions** for several critical tables. When a user takes an action on Device A, Device B only learns about it after 60 seconds (polling) instead of instantly.

## Root Cause: Missing Realtime Subscriptions

The existing `change_drop_realtime` channel (AppContext.tsx lines 687–760) covers:
- ✅ app_settings: change_drop_requests, specialization_requests, ge_elective_requests, reconsideration_requests, finalized_enlistments, consents
- ✅ tables: prerogatives, graduation_requirements, graduation_applications, courses, sections, grades, underload_applications

**Missing (no realtime, only 60-sec polling):**
- ❌ `enrollments` table — most critical: when student enlists/drops, other portals (faculty, OCS) don't see it instantly; student switching devices doesn't see their own enlistment
- ❌ `app_settings` key=`terms` — when admin opens/closes enlistment window, other users don't see it instantly
- ❌ `app_settings` key=`unfinalized_requests` — OCS processing a request doesn't reach student instantly
- ❌ `profiles` table — student status changes (PD, transfer) don't reflect on other devices instantly
- ❌ `app_settings` key=`academic_units` — college/department/program changes not pushed instantly

## Fix: One File Change

**`src/contexts/AppContext.tsx`** — Add 5 missing `.on()` blocks to the existing `change_drop_realtime` channel, just before `.subscribe()`:

```typescript
.on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' },
    () => { loadEnrollments(); })
.on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.terms' },
    () => { loadAppSettings(); })
.on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.unfinalized_requests' },
    () => { loadAppSettings(); })
.on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' },
    () => { loadProfiles(); })
.on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.academic_units' },
    () => { loadAppSettings(); })
```

## Verification
- Student enlists on Phone → OCS/faculty portal on laptop updates enrollment count instantly (no 60-sec wait)
- Admin changes term controls (opens/closes enlistment) on desktop → students on mobile see it immediately
- OCS processes an unfinalized request → student's portal reflects the decision instantly
- Admin changes student status → all portals reflect it immediately
