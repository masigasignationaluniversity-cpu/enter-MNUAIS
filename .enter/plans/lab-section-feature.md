# Grouped Navigation Plan

## Goal
Replace the current flat sidebar navigation with collapsible group sections ("tabs") per the user's spec for each role.

## File to Modify
**`src/components/shared/PortalLayout.tsx`** — single file change.

---

## Data Structure

Replace `NavItem[]` per role with `NavGroup[]`:

```typescript
type NavGroup = {
  label: string;        // group header label
  icon: React.ReactNode; // group icon (shown in collapsed mode)
  items: NavItem[];     // 1 = direct nav; 2+ = collapsible sub-items
};
```

A group with `items.length === 1` behaves like a direct nav button (no expand/collapse).  
A group with `items.length > 1` shows a clickable header that expands/collapses sub-items.

---

## Groups per Role

### OCS
| Group | Items |
|-------|-------|
| Dashboard | /ocs/dashboard |
| Course Overview | /ocs/course-overview |
| Consents | OCS Consents |
| Student Management | Students, GWA Report, Grade & Enrollment, Graduation Applications |
| College Management | Plan of Study, Specialization, GE Elective Requests |
| Requests | Underload Applications, Reconsideration, Change & Drop |

### Department Head
| Group | Items |
|-------|-------|
| Dashboard | /depthead/dashboard |
| Consents | Department Consents |
| Course Management | Sections, Courses |

### Student (associate/certificate)
| Group | Items |
|-------|-------|
| Dashboard | /student/dashboard |
| Enrollment | My Consents, Plan of Study, Enlistment, Prerogatives |
| My Grades | /student/grades |
| SET | /student/evaluation |
| My Profile | /student/profile |

### Student (BS/Masters/Doctorates)
| Group | Items |
|-------|-------|
| Dashboard | /student/dashboard |
| Enrollment | My Consents, Plan of Study, Specialization, GE Electives, Enlistment, Prerogatives |
| My Grades | /student/grades |
| SET | /student/evaluation |
| My Profile | /student/profile |

### Faculty
| Group | Items |
|-------|-------|
| Dashboard | /faculty/dashboard |
| Class Management | My Classes, My Timetable |
| Grade Management | Grade Encoding, Removal/Completion |
| Consents | COI Consents, Prerogatives |
| Student Evaluations | /faculty/evaluations |

### Admin
Keep flat (no grouping needed per user's spec).

---

## State & Behavior

- `expandedGroup: string | null` — tracks which multi-item group is open
- `useEffect` on `location.pathname`: auto-expand the group whose items include current path
- Clicking a group header toggles it open/closed
- Clicking a sub-item navigates; closes mobile menu
- Single-item groups: clicking navigates directly (no toggle)
- Collapsed sidebar: group icons visible; hover tooltip shows group label; clicking expands sidebar + opens group

---

## Rendering Logic (inside nav)

```
For each group:
  If group.items.length === 1:
    → Render as direct nav button (existing style)
  Else:
    → Render collapsible group:
       [Icon] [Label]  [ChevronDown/Up]   ← header button
       If expanded:
         [sub-items indented, smaller text, dot prefix]
```

Sub-items use a slightly smaller font, left border accent when any item in group is active. The group header itself gets an "active" highlight when any child is active.

---

## Backward Compatibility

- `navItems` (flat list) is still derived from groups for `activeNavItem` detection (title display).
- All existing `bannerMap` entries and paths remain unchanged.
- Admin role keeps the existing flat nav (no groups).
