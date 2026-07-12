# Student Profile Redesign — Sidebar-Tab Layout

## Summary
Rebuild `src/pages/student/StudentProfile.tsx` into a sidebar-tab layout matching the reference images: **Student Information | Classes | Grades | Financial Account | Student Record**. All existing GWA/scholastic-standing content is preserved and relocated under a **Grades** tab (internal render, not a redirect — simplest, no route changes needed). Only `StudentProfile.tsx` changes; Enlistment and the standalone `/student/grades` route remain untouched. Nav label stays "My Profile" pointing at `/student/profile`.

## 1. Data model additions (`src/lib/types.ts` + migration)

Add to `User`:
```ts
birthday?: string;            // ISO date
generationalSuffix?: string;  // Jr., III, etc.
preferredName?: string;
indigenousGroup?: string;
religion?: string;
genderIdentity?: string;
disability?: string;
houseNoStreet?: string;       // "House No./Blk/Lot"
barangay?: string;
cityMunicipality?: string;
province?: string;
zipCode?: string;
```
These are read-only display fields for now (per user decision) — shown as "-" when empty. No new edit form; `AdminUsers.tsx` is NOT modified (out of scope).

Migration: `alter table profiles add column if not exists birthday date, generational_suffix text, preferred_name text, indigenous_group text, religion text, gender_identity text, disability text, house_no_street text, barangay text, city_municipality text, province text, zip_code text;`

Update `profileToUser()` in `AppContext.tsx` to map these new snake_case columns.

## 2. Page structure — `StudentProfile.tsx` full rewrite

**Layout**: Reuse `PortalLayout` (keeps global sidebar/header). Inside the page body, build the reference's inner banner + inner-sidebar:
- Maroon hero banner (using `bg-primary`) with circular avatar (initials fallback, no upload — matches "no upload capability" finding) overlapping bottom edge.
- Name + student number + right-aligned classification badge (reuse existing `getYearClassification` logic → "Continuing First Year" style label: combine `Freshman/Sophomore/Junior/Senior` classification with a simple "Continuing" prefix, using existing academic.ts helpers).
- Left inner-sidebar with 5 buttons (icon + label), local `useState<'info'|'classes'|'grades'|'financial'|'record'>` tab state, active tab highlighted maroon (`bg-primary text-primary-foreground`) matching reference.
- Right content area renders per-tab content.

### Tab: Student Information
Two/three-column bordered info-card groups (`Profile Information`, `Additional Information`, `Contact and Address`), using semantic `portal-panel`-style bordered boxes (not raw white/gray) per design-system rules. Fields:
- Profile Information: First/Middle/Last Name (parsed from `me.name` — no structured name fields exist, so split on whitespace: first token = First, last token = Last, middle = everything between), Civil Status, Birthday, Generational Suffix, Sex assigned at Birth (`me.sex`), Email.
- Additional Information: Preferred Name, Indigenous Group, Religion, Gender Identity, Disability — all new fields, "-" fallback.
- Contact and Address: House No./Blk/Lot, Barangay, City/Municipality (new fields) plus existing `presentAddress`/`presentAddressTel` shown as supplementary fields since they already exist and hold real data.

### Tab: Classes
Sub-tabs "Current Class" / "History" (local state). Read-only table, columns: Lecture | Laboratory | Status.
- **Current Class**: pulls `activeTerm`'s enrolled sections for `me.id` (mirroring the read-only subset of `StudentEnlistment.tsx`'s `myEnrolledSections` logic — course code, section, schedule, room, prerequisite string, faculty). Pairs lecture with its child lab/rec row in the same row (Lecture column / Laboratory column) matching the reference's two-column card layout. Status column: badge showing "Bookmarked" (default/neutral state — since no real bookmark flag exists, use it as the default status label for any active non-conflicting enrolled class, matching the mockup's cosmetic use) or "Schedule Conflict"/"Prereq Conflict" computed live via the same `schedulesOverlap` and `checkPrerequisites` helpers already in `AppContext`.
- **History**: same table shape, sourced from non-active terms' enrolled sections; "No Data Available" empty state when none exist (matches reference image exactly). Includes a term selector ("Select Semester and A.Y.") dropdown using `TermSelect`.

### Tab: Grades
Render the **existing GWA/scholastic-standing/cumulative-GWA content verbatim** (all JSX currently in `StudentProfile.tsx` today) inside this tab — no logic changes, just relocated under the new tab switcher. This satisfies "except for the grades" instruction (visually restyled minimally to fit the new inner-content width, but computations/content untouched).

### Tab: Financial Account
Table columns: Semester | Reference | Bill Type | Total Bill Amount | Settled Amount | Balance.
- Iterate `state.terms` (sorted chronologically) that have a `feeSchedule` and an `EnrollmentPayment` record for `me.id`.
- Reuse `computeFees`/`calcAmountPayable`-equivalent logic (port a local copy scoped to the signed-in student only, mirroring `OCSPayments.tsx`'s functions) to get Total Bill Amount.
- Settled Amount = `payment.amountPaid`. Balance = max(0, total - settled).
- Reference column = `payment.orNumber` (falls back to first `PaymentTransaction.orNumber` for that term). Bill Type = static "Matriculation Bill" label (matches reference; no existing bill-type taxonomy, confirmed in research) unless `freeTuition`/`stCode` is set, in which case show "Matriculation Bill (RA 10931)" / "Matriculation Bill (ST-{code})".
- Search + "Select Semester and A.Y." filter, matching reference controls.

### Tab: Student Record
- **Active Student Record** box: Student Number, Classification (year classification label), Degree Program (full `DegreeProgram.name`), Department/Unit ("None" — confirmed students don't have this set), College (`me.college` resolved to full `College.name`).
- **Inactive Student Record** box: "None" placeholder (no historical-program-change data model exists — out of scope to build).
- **Hold Notice (N)** box: confirmed no positive/negative hold model exists. Repurpose the existing binary Payment Hold check (already computed in `StudentEnlistment.tsx`'s `heldByTerm` logic) as the one real hold source — port a read-only version scoped to `me.id`: if held, show one row "Unsettled Account Balance — Negative Hold" with amount/term; else "None". Include the static explanatory note about positive vs negative holds exactly as shown in the reference (informational copy only).

## 3. New helper additions
- `src/lib/academic.ts`: no changes needed — reuse existing exports.
- Local (in `StudentProfile.tsx`): a `splitName(fullName)` helper for First/Middle/Last parsing, a scoped `computeStudentTermBill(termId)` helper (ports OCSPayments' fee math for the single logged-in student), and a scoped `computeStudentHold()` helper (ports the `heldByTerm` scan from StudentEnlistment for the single logged-in student, read-only, no cart/enlist actions).

## 4. Files touched
- `src/lib/types.ts` — new `User` fields.
- `supabase` migration — new `profiles` columns.
- `src/contexts/AppContext.tsx` — map new columns in `profileToUser()` (read path only; no write path needed since no edit form yet).
- `src/pages/student/StudentProfile.tsx` — full rewrite per above.

## Out of scope (explicitly)
- No profile picture upload (no storage bucket wired; avatar stays initials-only, matching current app-wide pattern).
- No editing of new personal/address fields (read-only per user's choice).
- No changes to `StudentEnlistment.tsx`, `/student/grades`, `AdminUsers.tsx`, or nav structure.
- No new "hold notice" data model — Student Record tab's Hold Notice reuses the existing payment-hold computation only.
