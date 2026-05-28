# Plan: Migrate Courses to DB Table + Cascade Delete

## Context
Currently, courses are stored as a JSON blob in `app_settings.courses`. This creates issues:
- No real database-level cascade when deleting courses
- Department heads now own course/section management, old seeded courses must be wiped

The user wants:
1. All existing courses (and their dependent sections, enrollments, grades) deleted from DB
2. `deleteCourse` fully cascades: removes sections and their dependents from DB
3. All portals (OCS, Admin, Student) are in sync because they all read from the same DB

## Migration (DB Changes)
1. Create `courses` table with all Course fields (snake_case)
2. Enable RLS with open read/write policy
3. Clear all existing data: delete grades, enrollments, prerogatives that reference existing sections → delete sections → delete course data from app_settings

## AppContext Changes (`src/contexts/AppContext.tsx`)

### New: `loadCourses()` 
- Fetch all rows from `courses` table
- Map snake_case → camelCase using same pattern as `loadSections()`
- Update state via `setState`

### Update: `addCourse()`
- Generate `id = 'c-' + Date.now()`
- INSERT into `courses` table (snake_case columns)
- Update local state optimistically

### Update: `updateCourse()`
- UPDATE `courses` table row by id
- Update local state

### Update: `deleteCourse()`
- Cascade in this order:
  1. Get all section IDs for that courseId from local state
  2. DELETE from grades WHERE section_id IN (...)
  3. DELETE from enrollments WHERE section_id IN (...)
  4. DELETE from prerogatives WHERE section_id IN (...)
  5. DELETE from sections WHERE course_id = courseId
  6. DELETE from courses WHERE id = courseId
- Remove course + its sections from local state

### Update: `loadAppSettings()`
- Remove the `if (map.courses)` block — courses no longer live in app_settings

### Update login flow + mount effect
- Call `loadCourses()` alongside `loadSections()` so all portals get fresh data

## Files to Modify
- `src/contexts/AppContext.tsx` — primary changes above
- DB migration — create courses table, clear old data

## Verification
- Admin portal: Courses & sections list is empty after migration
- Dept Head portal: Can add a new course; appears immediately in OCS Course Overview + Admin
- Dept Head portal: Delete a course → its sections disappear from OCS Course Overview, Student enlistment, Admin views
- Student portal: Deleted course/section no longer available to enlist
