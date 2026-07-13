# Simplify all portal dashboards to Welcome + Quick Links only

## Goal
Every role's dashboard (Admin, OCS, Faculty, Student, Department Head) should show **only**:
1. A welcome/greeting panel (existing `DashboardAnnouncements` component — greeting, user info, portal announcements)
2. A "Quick Links" panel of navigation buttons to that role's key modules (reusing the existing `quickActions` arrays + `dash-action` styling already defined in each file)

Remove everything else currently on each dashboard: stat cards, section/enrollment lists, term control summaries, "My Classes" list, "Current Enrollment" list, grade-visibility banners, department info panel, active-term hero, etc.

## Per-file changes

### `src/pages/student/StudentDashboard.tsx`
Keep: `DashboardAnnouncements`, `quickActions` array + Quick Links panel.
Remove: `stats` array + stat-card grid, "Current Enrollment" panel, grade-visibility banner.
Drop now-unused computations feeding only the removed sections (`enrollments`, `canView`, `pendingEvals`, `gwa` stat display — but keep pieces still needed for quick-action badges: `pendingConsents`, `pendingPrerogatives`). Remove unused imports (`BookOpen` stays if used in quick actions; drop `Award`, `CheckCircle`, `Clock` if no longer referenced — verify per remaining usage).

### `src/pages/faculty/FacultyDashboard.tsx`
Keep: `DashboardAnnouncements`, `quickActions` + Quick Links panel.
Remove: `stats` grid, "My Classes" list panel, "Faculty Evaluations" notice panel.
Keep only computations needed for quick-action badges (`pendingConsents`, `pendingPrerogatives`); drop `myClasses`/`totalStudents`/`gradedSections` stat-only computations (myClasses is still needed for pendingPrerogatives' mySectionIds, so keep that part; drop the rest).

### `src/pages/ocs/OCSDashboard.tsx`
Keep: `DashboardAnnouncements`, `quickActions` + Quick Links panel.
Remove: `stats` grid, "Section Fill Overview" panel, "Term Controls" summary panel.
Keep computations needed for quick-action badges (`pendingConsents`, `pendingReconsiderations`, `pendingChangeDrop`, `pendingLoans`); drop fill-rate/topSections-only computations.

### `src/pages/admin/AdminDashboard.tsx`
Keep: Quick Links panel (Admin has no `DashboardAnnouncements` currently — add it for consistency with other roles, since Admin also has a portal user identity, or keep a simple title-only header if Admin intentionally excluded announcements. Decision: add `DashboardAnnouncements` for consistency since Admin also has `state.currentUser` and `portalSettings`).
Remove: "Active Term hero" panel, `stats` grid, "Academic Terms" list, "Section Enrollment" panel.
Keep the `pendingTickets` fetch (still needed for the Password Tickets quick-action badge) and the sync-on-mount effect (unrelated to layout, keep as-is — it's a background data sync, not a dashboard widget).

### `src/pages/depthead/DeptHeadDashboard.tsx`
Keep: `DashboardAnnouncements`, `quickActions` + Quick Links panel.
Remove: "Department" info panel, `stats` grid, "Department Sections" list panel.
Keep `pendingConsents` computation for the quick-action badge; drop `deptSections`/`deptCourses`-only stat computations (deptSections still partly needed if used elsewhere — verify, else drop).

## Shared visual result
Each dashboard becomes: `DashboardAnnouncements` (or equivalent welcome header for Admin) → single `portal-panel` "Quick Links" section with the existing responsive `dash-action` button grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). No stat cards, no data lists, no extra panels.

## Out of scope
- No changes to the Quick Actions' destinations, labels, icons, or badge logic — only removing the surrounding stat/list panels.
- No changes to `PortalLayout`, `DashboardAnnouncements`, or shared dash-* CSS classes.
- No changes to other (non-dashboard) pages.
