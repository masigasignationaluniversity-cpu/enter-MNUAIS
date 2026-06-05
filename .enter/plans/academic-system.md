# User Guide / PDF Instructions Feature

## Context
Each user role (Admin, OCS, Faculty, Student, Department Head) needs a role-specific bilingual (English/Filipino) instruction guide they can print or save as PDF. The guide lives in the portal as a full-page printable view, matching the login theme (maroon/green gradient). A "User Guide" button appears on each dashboard.

---

## Approach

### 1. New Route & Component
- **Route**: `/guide` → `src/pages/shared/UserGuide.tsx`
- **Router**: Add `{ path: "/guide", element: <UserGuide /> }` to `src/router.tsx`

### 2. UserGuide Page (`src/pages/shared/UserGuide.tsx`)
- Reads `state.currentUser.role` from `useApp()` context
- Reads `state.portalSettings` for `portalName`, `institutionName`, `logoUrl`
- No sidebar / PortalLayout wrapper — standalone full-width print page
- Has a sticky top bar (screen-only): `Print / Save as PDF` button + `← Back` button
- Main content renders role-specific `<GuideContent role={...} />` component

### 3. Theme (matches Login)
- Header panel: `background: var(--gradient-hero)` — maroon-to-green gradient
- Cover block: logo (if set) + portalName + "User Guide / Gabay ng Gumagamit" + role badge
- Body: white background, primary/secondary accent colors, `font-sans`
- Section headers: `bg-primary text-primary-foreground` banner strips
- Flowchart boxes: use CSS flexbox with border + arrow (→) connectors — no extra deps

### 4. Print CSS (`@media print`)
- Hide the sticky top bar
- Page breaks before major sections (`break-before: page`)
- Force white background on body, black text
- A4 width, 1.5cm margins

### 5. Role Content Structure (bilingual EN/FIL)

Each role section contains:
- **Cover page**: Role name, portal name, institution, date
- **Quick Start / Mabilis na Simula** (numbered steps)
- **Feature Reference / Gabay sa Tampok** — table with Feature | What it does | EN / FIL
- **Workflow Diagram / Daloy ng Proseso** — CSS flowchart for main workflows

#### Per-role features:

**Admin**
- Term Control → Portal Settings → User Management → Academic Units → Rooms → Report Cards → Graduation Settings → Password Tickets → Dashboard Content
- Flowchart: Setup Flow (Portal Settings → Academic Units → Term Control → Add Users)

**OCS**
- Course Overview → Courses → Sections → Consents → Students → Grade & Enrollment → Plan of Study → Specialization → Graduation Applications → Reconsideration → Change & Drop
- Flowchart: Enlistment Preparation Flow (Add Courses → Add Sections → Open Enlistment → Review Consents)

**Faculty**
- My Classes → My Timetable → Grade Encoding → Prerogatives → Consents → Removal/Completion → Student Evaluations
- Flowchart: Grade Encoding Flow (End of Term → Encode Grades → Submit → OCS Review)

**Student**
- Enlistment → Prerogatives → My Consents → My Grades → Plan of Study → Specialization → SET (Student Eval) → My Profile
- Flowchart: Enlistment Flow (Check Cart → Add Sections → Confirm Enlistment → View Enrolled)

**Department Head**
- Dept Consent → Sections → Courses
- Flowchart: Consent Approval Flow (Student Requests → Dept Reviews → Approve/Reject)

### 6. Dashboard Buttons
Add a "User Guide" button to each dashboard page:
- `src/pages/admin/AdminDashboard.tsx`
- `src/pages/ocs/OCSDashboard.tsx`
- `src/pages/faculty/FacultyDashboard.tsx`
- `src/pages/student/StudentDashboard.tsx`
- `src/pages/depthead/DeptHeadDashboard.tsx`

Each button: `<Button variant="outline" onClick={() => window.open('/guide', '_blank')}>`  with a `BookOpen` icon and label "User Guide / Gabay".

---

## Files to Create/Modify
| File | Action |
|------|--------|
| `src/pages/shared/UserGuide.tsx` | **Create** — main guide page |
| `src/router.tsx` | **Edit** — add `/guide` route |
| `src/pages/admin/AdminDashboard.tsx` | **Edit** — add guide button |
| `src/pages/ocs/OCSDashboard.tsx` | **Edit** — add guide button |
| `src/pages/faculty/FacultyDashboard.tsx` | **Edit** — add guide button |
| `src/pages/student/StudentDashboard.tsx` | **Edit** — add guide button |
| `src/pages/depthead/DeptHeadDashboard.tsx` | **Edit** — add guide button |

---

## Verification
1. Log in as each role → Dashboard shows "User Guide / Gabay" button
2. Click button → opens `/guide` in new tab, shows correct role content
3. Content is bilingual (EN/FIL sections)
4. Browser Print (Ctrl+P) → correct A4 layout, no sidebar, page breaks at sections
5. Logo and portal name render from `portalSettings`
