# User Guide — Complete Revised Implementation Plan

## Context
Replace the current `src/pages/shared/UserGuide.tsx` with a fully comprehensive, bilingual (EN/FIL toggle), module-by-module user guide for all 5 roles. Each module section must include:
- Step-by-step instructions (in selected language)
- Access restrictions callout
- Process flowchart (CSS/HTML boxes + arrows)
- Portal UI SVG mockup illustration

---

## Architecture — 7 New/Modified Files

```
src/pages/shared/
  UserGuide.tsx          ← Rewrite (main entry: lang toggle, role routing, cover page)
  guide/
    GuideComponents.tsx  ← New: shared primitives (LangContext, Steps, FlowChart, BranchFlow, Restriction, InfoBox, ModuleSection, SVG frame)
    AdminGuide.tsx        ← New: 10 Admin modules
    OCSGuide.tsx          ← New: 12 OCS modules
    FacultyGuide.tsx      ← New: 8 Faculty modules
    StudentGuide.tsx      ← New: 9 Student modules
    DeptHeadGuide.tsx     ← New: 4 Dept Head modules
```

---

## GuideComponents.tsx — Shared Primitives

### LangContext
```ts
export const LangContext = createContext<'en' | 'fil'>('en');
export const useLang = () => useContext(LangContext);
```

### Components
- `<ModuleSection id title titleFil icon />` — wrapper with anchor id, header bar, icon
- `<Steps items=[{en, fil}] />` — numbered steps with gradient circle numbers
- `<Restriction en fil />` — orange warning callout
- `<InfoBox en fil />` — blue info callout  
- `<FlowChart nodes=[{label, type}] />` — horizontal flow: start→step→decision→success/reject→end; decision nodes show ◆ prefix; color-coded (maroon=start/end, slate=step, blue=decision, green=success, red=reject)
- `<BranchFlow trigger condition yes no />` — vertical decision tree with two branches
- `<PortalIllustration>` — 380×200 SVG frame with maroon sidebar (72px) + active nav item highlighted + white content area; children = content area SVG
- Generic illustration helpers: `IllusTable`, `IllusForm`, `IllusCards`, `IllusGrid`, `IllusChart`

---

## Module Coverage per Role

### Admin (10 modules)
| # | Module | Path | Key restrictions |
|---|--------|------|-----------------|
| 1 | Dashboard | /admin/dashboard | Admin only |
| 2 | Dashboard Content | /admin/dashboard-content | Admin only; edits affect ALL user dashboards |
| 3 | Term Control | /admin/terms | Admin only; only one term can be active |
| 4 | User Management | /admin/users | Admin only; CSV import requires correct format |
| 5 | Report Cards | /admin/reportcard | Admin only |
| 6 | Academic Units | /admin/academic-units | Admin only; deleting a college cascades |
| 7 | Rooms | /admin/rooms | Admin only |
| 8 | Password Tickets | /admin/password-tickets | Admin only; ticket must exist before resetting |
| 9 | Graduation Settings | /admin/graduation-settings | Admin only |
| 10 | Portal Settings | /admin/portal-settings | Admin only |

### OCS (12 modules)
| # | Module | Path | Key restrictions |
|---|--------|------|-----------------|
| 1 | Dashboard | /ocs/dashboard | OCS only; scoped to assigned college |
| 2 | Course Overview | /ocs/course-overview | OCS; read-only overview |
| 3 | Courses | /ocs/courses | OCS; scoped to college |
| 4 | Sections | /ocs/sections | OCS; requires active term + course exists |
| 5 | OCS Consents | /ocs/consents | OCS; only pending consent requests shown |
| 6 | Students | /ocs/students | OCS; scoped to college |
| 7 | Grade & Enrollment | /ocs/grade-management | OCS; grade submission must be open for faculty edits |
| 8 | Plan of Study | /ocs/plan-of-study | OCS |
| 9 | Specialization | /ocs/specialization | OCS; student must have submitted request |
| 10 | Graduation Applications | /ocs/graduation-applications | OCS; student must meet eligibility |
| 11 | Reconsideration | /ocs/reconsideration | OCS; only post-grade-release requests |
| 12 | Change & Drop | /ocs/change-drop | OCS; only within allowed window |

### Faculty (8 modules)
| # | Module | Path | Key restrictions |
|---|--------|------|-----------------|
| 1 | Dashboard | /faculty/dashboard | Faculty only |
| 2 | My Classes | /faculty/classes | Scoped to assigned sections |
| 3 | My Timetable | /faculty/timetable | Scoped to active term |
| 4 | Grade Encoding | /faculty/grades | Grade submission window must be open |
| 5 | Prerogatives | /faculty/prerogatives | Faculty reviews only their own sections |
| 6 | Consents (COI) | /faculty/consents | Faculty reviews only their own sections |
| 7 | Removal/Completion | /faculty/removal-grades | For INC students only; special window required |
| 8 | Student Evaluations | /faculty/evaluations | Read-only; anonymous responses |

### Student (9 modules)
| # | Module | Path | Key restrictions |
|---|--------|------|-----------------|
| 1 | Dashboard | /student/dashboard | Student only |
| 2 | Enlistment | /student/enlistment | Enlistment window must be open |
| 3 | Prerogatives | /student/prerogatives | Prerogative window must be open; section must be full OR restricted |
| 4 | My Consents | /student/consent | Applicable only to courses requiring COI/Dept/OCS consent |
| 5 | My Grades | /student/grades | Must complete ALL evaluations first |
| 6 | Plan of Study | /student/plan-of-study | Read-only; maintained by OCS |
| 7 | Specialization | /student/specialization | Must be within eligible program |
| 8 | SET (Evaluation) | /student/evaluation | FIC Evaluation window must be open |
| 9 | My Profile | /student/profile | Read-only; updated by Admin/OCS |

### Department Head (4 modules)
| # | Module | Path | Key restrictions |
|---|--------|------|-----------------|
| 1 | Dashboard | /depthead/dashboard | Dept Head only; scoped to assigned dept |
| 2 | Dept Consent | /depthead/consents | Only courses with requiresDeptConsent = true |
| 3 | Sections | /depthead/sections | Scoped to dept; view-only (OCS manages) |
| 4 | Courses | /depthead/courses | Scoped to assigned department |

---

## Flowchart Types per Module

Each module gets at minimum a **linear flow** (5–7 steps). Modules with approval/rejection use a **BranchFlow** decision node showing the two outcomes.

Key flowcharts:
- **Term Control**: Create → Set Dates → Set Controls → Activate → Open Windows
- **User Management**: Add Manually OR Import CSV → Validate → Save → User Gets Credentials
- **Enlistment**: Check Window → Browse → Add to Cart → Request Consents if needed → Submit → OCS Enrolls
- **Grade Encoding**: Window Opens → Select Section → Input Grades → Review → Submit → OCS Receives
- **OCS Consents / COI / Dept Consent**: Student Requests → Reviewer Gets Notified → Review → Approve/Deny → Student Notified
- **Graduation Application**: Student Applies → OCS Checks Eligibility → Approve/Deny
- **Reconsideration**: Student Submits Request → OCS Reviews → Approve (grade changes) / Deny
- **Change & Drop**: Student Submits → OCS Reviews Window → Approve/Deny → Enrollment Updated

---

## SVG Illustration Strategy

Each `<PortalIllustration>` SVG (380×200) shows:
1. **Maroon sidebar** (72px) with 6 nav-item rectangles; one highlighted white (active module)
2. **Top bar** with maroon header and module title text
3. **Content area** with module-specific UI:
   - Dashboard → 4 stat cards + bar chart
   - Table modules → header row + 3 data rows with action buttons
   - Form modules → labeled input fields + Save button
   - Grade grid → matrix of cells with grade values
   - Timetable → weekly grid with colored blocks
   - Consent list → rows with status badges (Pending/Approved/Denied)
   - Plan of Study → checklist tree (checkmarks + circles)
   - Evaluation → star rating rows

---

## Language Behavior

- `LangContext` provides `'en' | 'fil'`
- Toggle button in sticky top bar: `[EN] | [FIL]` — switches all content
- Cover page shows both language label of the role
- Print CSS: hides top bar, renders A4 with page breaks between modules
- `document.title` updates to reflect selected language

---

## Files to Modify / Create

| File | Action |
|------|--------|
| `src/pages/shared/UserGuide.tsx` | **Rewrite** — main entry, lang toggle, role routing, cover |
| `src/pages/shared/guide/GuideComponents.tsx` | **Create** — all shared primitives |
| `src/pages/shared/guide/AdminGuide.tsx` | **Create** — 10 admin modules |
| `src/pages/shared/guide/OCSGuide.tsx` | **Create** — 12 OCS modules |
| `src/pages/shared/guide/FacultyGuide.tsx` | **Create** — 8 faculty modules |
| `src/pages/shared/guide/StudentGuide.tsx` | **Create** — 9 student modules |
| `src/pages/shared/guide/DeptHeadGuide.tsx` | **Create** — 4 dept head modules |

Router (`src/router.tsx`) and dashboard files already have `/guide` route and buttons — **no changes needed**.

---

## Verification
1. Navigate to any dashboard → click "User Guide / Gabay" → guide opens in new tab
2. Toggle EN ↔ FIL → all content switches completely
3. All 5 roles render their correct modules (test by logging in as each role)
4. Print / Save as PDF button → shows clean A4 layout with no toolbar
5. Each module has: illustration, flowchart, steps, restriction (where applicable)
6. No lint errors
