# Academic System — Enlistment & Consent Improvements

## Context
Four distinct enhancements requested across the student enlistment module, admin term control, and the OCS course management form.

---

## Feature 1: Timetable Preview in Cart Tab

**Goal:** Students can see a visual schedule overlay of their cart items alongside already-enlisted courses so they can check conflicts before enlisting.

**Approach:**
- In the `cart` TabsContent, add a collapsible timetable section below the cart list.
- Extend the existing `renderTimetable()` function to accept an optional second array (cart sections).
- Enlisted courses render in solid COLORS blocks (existing).
- Cart sections render with a lighter dashed-border block in a neutral gray/stripe style, labeled with course code + "(Cart)".
- If a cart item has a schedule conflict with an enlisted course, highlight it in red.

**Files:** `src/pages/student/StudentEnlistment.tsx`

---

## Feature 2: "Finalize Enlistment" Button for Students

**Goal:** Student can lock their enlistment so no more adds/drops are possible.

**Data model changes:**
- Add `FinalizedEnlistment` interface to `types.ts`:
  ```ts
  interface FinalizedEnlistment { studentId: string; termId: string; finalizedAt: string; }
  ```
- Add `finalizedEnlistments: FinalizedEnlistment[]` to `AppState`.
- Safety init in AppContext.

**Context changes:**
- Add `finalizeEnlistment(studentId, termId)` function.
- Add `unfinalizeEnlistment(studentId, termId)` — admin can reset if needed (not exposed in UI for now, but useful for safety).

**UI changes in `StudentEnlistment.tsx`:**
- Check `isFinalized = finalizedEnlistments.find(f => f.studentId === student.id && f.termId === activeTerm.id)`.
- Show a prominent "Enlistment Finalized" banner when finalized.
- "Finalize Enlistment" button appears in the header area (next to existing badges), with an AlertDialog confirmation.
- The button's visibility is gated by `finalizeWindowStart` (see Feature 3).
- When finalized:
  - Add-to-cart button disabled (shows lock icon).
  - Enlist / Enlist All buttons disabled.
  - Drop button hidden/disabled.
  - Cart items: Enlist button disabled.
  - Clear banner visible on all tabs.

---

## Feature 3: Admin — "Finalize Button Appearance" Time & Day Setting

**Goal:** Admin sets the exact date + time when the "Finalize Enlistment" button becomes visible to students.

**Data model changes:**
- Add `finalizeWindowStart?: string` (ISO datetime, e.g. `"2026-05-25T08:00"`) to `Term` interface.

**UI changes in `AdminTermControl.tsx`:**
- In the inline "Edit Term Settings" panel, add a `datetime-local` input labeled **"Finalize Button Visible From"**.
- Add a helper text: "Students will see the 'Finalize Enlistment' button starting from this date and time. Leave blank to always show."
- Save via existing `updateTermSettings`.
- Display in term card info row: `"Finalize button: from [date]"` or `"Finalize: always visible"`.

**Student-side gate in `StudentEnlistment.tsx`:**
- `const finalizeButtonVisible = !activeTerm.finalizeWindowStart || new Date() >= new Date(activeTerm.finalizeWindowStart);`
- Only render the Finalize button when `finalizeButtonVisible && !isFinalized`.

---

## Feature 4: OCS Course — Consent Requirement Flags

**Goal:** Admin/OCS can mark a course as requiring COI, Dept Consent, or OCS Consent before a student can enlist.

**Data model changes in `types.ts`:**
```ts
// On Course interface:
requiresCOI?: boolean;
requiresDeptConsent?: boolean;
requiresOCSConsent?: boolean;
```

**OCS Courses form changes (`src/pages/ocs/OCSCourses.tsx`):**
- Add 3 `Switch` toggles in the form below the PE/NSTP toggles:
  - "Requires COI (Consent of Instructor)"
  - "Requires Dept Consent"
  - "Requires OCS Consent"
- Include in `emptyForm` with defaults `false`.
- Save to course data.
- Show consent requirement badges in the course list table (new mini-badges in Tags column, e.g. `COI`, `DC`, `OCS`).

**Enlistment enforcement in `AppContext.tsx` (`enlistSection`):**
After existing checks, add:
```ts
const consentRecord = state.consents.find(c => c.studentId === studentId && c.sectionId === sectionId && c.termId === termId);
if (course.requiresCOI && consentRecord?.coiStatus !== 'approved')
  return { success: false, message: 'This course requires an approved COI.' };
if (course.requiresDeptConsent && consentRecord?.deptConsentStatus !== 'approved')
  return { success: false, message: 'This course requires an approved Department Consent.' };
if (course.requiresOCSConsent && consentRecord?.ocsConsentStatus !== 'approved')
  return { success: false, message: 'This course requires an approved OCS Consent.' };
```

**Student UI feedback:**
- In Search tab and Cart tab, show consent-required badges on the course row.
- If consent is required but not approved, show a specific status badge (e.g. `COI Required`) and disable the Enlist/Cart button with tooltip-like text.
- AppContext safety init: `s.courses = s.courses.map(c => ({ requiresCOI: false, requiresDeptConsent: false, requiresOCSConsent: false, ...c }))`.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/types.ts` | Add `FinalizedEnlistment`, extend `Course` (3 consent flags), extend `Term` (`finalizeWindowStart`), extend `AppState` |
| `src/lib/mockData.ts` | Add `finalizedEnlistments: []` to initialState |
| `src/contexts/AppContext.tsx` | Add `finalizeEnlistment`, safety inits, consent gate in `enlistSection`, Provider value |
| `src/pages/student/StudentEnlistment.tsx` | Cart timetable, Finalize button, consent-blocked UI |
| `src/pages/admin/AdminTermControl.tsx` | `finalizeWindowStart` datetime picker in edit panel |
| `src/pages/ocs/OCSCourses.tsx` | 3 consent-requirement toggles + badges in table |

## Verification
- Student Cart tab shows both enlisted (solid) and cart (dashed) blocks in the timetable grid.
- Clicking "Finalize Enlistment" shows a confirmation, then locks all enlist/drop/cart operations.
- Finalize button only appears after the admin-configured date/time.
- Courses marked with `requiresCOI` cannot be enlisted without an approved consent; correct error toast is shown.
- Consent requirement badges appear in OCS course list and student enlistment rows.
