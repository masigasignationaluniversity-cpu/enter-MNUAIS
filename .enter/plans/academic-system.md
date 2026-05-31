# Plan: Remove Mock Data + Enhance Navigation Panel

## Context
Two separate improvements:
1. **Mock data removal**: `initialState` in `mockData.ts` contains hardcoded users, courses, sections, terms, etc. When any device loads the app fresh (new device / cleared storage), it shows this stale mock data until DB loads. Deleted data from admin portal would reappear on fresh installs. Fix: empty all data arrays in `initialState` so the app always starts clean and fills only from the DB.
2. **Navigation enhancement**: The sidebar's hamburger/toggle button is buried in the logo header. The user wants it prominently placed above the navigation list. Overall nav UX improvements.

---

## Changes

### 1. `src/lib/mockData.ts` — Strip mock data, empty initialState

**What to keep:**
- `EVAL_QUESTIONS` array (static app config, not data)
- `initialState` with empty arrays for all data tables
- Minimal `portalSettings` defaults

**What to remove:**
- `const users: User[]` — 12 hardcoded users
- `const terms: Term[]` — 2 hardcoded terms
- `const courses: Course[]` — 12 hardcoded courses
- `const sections: Section[]` — hardcoded sections
- `const grades: Grade[]` — hardcoded grades
- `const enrollments: Enrollment[]` — hardcoded enrollments
- `const consents: ConsentRecord[]` — hardcoded consents
- `const evaluations: Evaluation[]` — hardcoded evaluations
- `const prerogatives: Prerogative[]` — hardcoded prerogatives
- `const colleges: College[]` — hardcoded colleges
- `const departments: Department[]` — hardcoded departments
- `const degreePrograms: DegreeProgram[]` — hardcoded programs
- `const finalizedEnlistments: FinalizedEnlistment[]`

**New `initialState`:**
```typescript
export const initialState: AppState = {
  users: [],
  terms: [],
  courses: [],
  sections: [],
  grades: [],
  consents: [],
  enrollments: [],
  evaluations: [],
  prerogatives: [],
  finalizedEnlistments: [],
  currentUser: null,
  changeDropRequests: [],
  reconsiderationRequests: [],
  unfinalizedRequests: [],
  rooms: [],
  colleges: [],
  departments: [],
  degreePrograms: [],
  portalSettings: {
    portalName: 'University AIS',
    portalTagline: 'Academic Information System',
    institutionName: 'University',
    logoUrl: '',
  },
};
```

### 2. `src/components/shared/PortalLayout.tsx` — Enhanced Navigation

**Key design changes:**

**A. Hamburger above nav panel:**
- Add a visible `<button>` with `Menu`/`ChevronLeft` icon positioned just above the nav items list (inside the sidebar, between user-info section and nav list)
- This makes the collapse toggle prominent and intuitive
- On mobile: this button closes the mobile drawer

**B. Nav item visual improvements:**
- Active item: left accent border + stronger background + white text
- Inactive item: slightly more padding, better opacity transitions
- Icon remains fixed size; label truncates cleanly
- Collapsed mode: show icon-only with tooltips
- Add a subtle divider + "NAVIGATION" label above the items

**C. Overall sidebar:**
- Slightly wider default (`w-64` instead of `w-60`)
- Logo area more compact, removed the X button from it (toggle now below)
- Bottom logout button gets a destructive-tinted hover

**D. Mobile hamburger in header:** Keep as-is (already works well)

---

## Files Modified
- `src/lib/mockData.ts` — strip all mock data arrays, empty initialState
- `src/components/shared/PortalLayout.tsx` — enhanced nav panel layout

## Verification
1. Clear localStorage, visit app → should show empty state (no mock users/courses in admin portal)
2. Log in as admin → data loads from DB only
3. Sidebar collapse button appears above nav items
4. Active nav item has clear visual indicator
5. Collapsed sidebar shows icons with tooltips
