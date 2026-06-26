# Enrollment Fees & Form 5 Feature Plan

## Context
The admin needs to configure fee amounts per term (tuition, library, lab, etc.). OCS handles payment confirmation including RA 10931 free tuition. Students with unpaid previous-term balances are blocked from enlisting. The enrollment form PDF is revised to match UP Form 5 layout.

---

## 1. Database Migration
Create `enrollment_payments` table:
```sql
CREATE TABLE enrollment_payments (
  id text PRIMARY KEY,
  student_id text NOT NULL,
  term_id text NOT NULL,
  status text NOT NULL DEFAULT 'unpaid',  -- 'unpaid' | 'paid' | 'free_tuition'
  free_tuition boolean NOT NULL DEFAULT false,   -- RA 10931
  other_fees_subsidy boolean NOT NULL DEFAULT false,
  amount_paid numeric DEFAULT 0,
  notes text,
  processed_by text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE enrollment_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON enrollment_payments FOR ALL USING (true) WITH CHECK (true);
CREATE UNIQUE INDEX ON enrollment_payments (student_id, term_id);
```

---

## 2. Types (`src/lib/types.ts`)
Add `TermFeeSchedule` interface and `feeSchedule?: TermFeeSchedule` field to `Term`.
Add `EnrollmentPayment` interface + add `enrollmentPayments: EnrollmentPayment[]` to `AppState`.

```typescript
interface TermFeeSchedule {
  tuitionPerUnit: number;
  nstpTuition: number;
  admissionFees: number;
  entranceFees: number;
  registrationFees: number;
  libraryFees: number;
  labFeePerUnit: number;       // multiplied by course.labUnits
  computerFees: number;
  athleticFees: number;
  culturalFees: number;
  medicalDentalFees: number;
  guidanceFees: number;
  handbookFees: number;
  schoolIdFees: number;
  developmentFees: number;
  edf: number;
  changeOfMatriculation: number;
  depositFee: number;
}

interface EnrollmentPayment {
  id: string;
  studentId: string;
  termId: string;
  status: 'unpaid' | 'paid' | 'free_tuition';
  freeTuition: boolean;
  otherFeesSubsidy: boolean;
  amountPaid: number;
  notes?: string;
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
}
```

---

## 3. AppContext (`src/contexts/AppContext.tsx`)
- Add `enrollmentPayments: EnrollmentPayment[]` to `AppState`
- Add backfill in state initializer: `if (!s.enrollmentPayments) s.enrollmentPayments = [];`
- Add `loadEnrollmentPayments()` (pattern: same as `loadUnderloadApplications`)
- Add `upsertEnrollmentPayment(payment: EnrollmentPayment)` — upsert to DB + update state
- Add to real-time listener on `enrollment_payments` table
- Add to `loadInitialData()` call
- Expose in context value

---

## 4. Admin: Fee Schedule in AdminTermControl (`src/pages/admin/AdminTermControl.tsx`)
Add a new `SectionBlock` titled **"Fee Schedule (Form 5)"** with inputs for all 18 fee fields.
- Store in Term via `updateTermSettings(termId, { feeSchedule: ... })`
- Show summary in the term card using existing `WindowRow` component pattern
- Add `feeSchedule` fields to `EditForm` type, `emptyEditForm()`, `openEdit()`, `handleSave()`

---

## 5. OCS: New Payments Page (`src/pages/ocs/OCSPayments.tsx`)
New page at `/ocs/payments`:
- Term selector (same pattern as OCSUnderload)
- Table of all finalized students for the term with their payment status
- For each student: show computed fee breakdown (using term's feeSchedule + enrolled units)
- Actions: **Mark Paid** (enter amount), **Free Tuition (RA 10931)**, **Other Fees Subsidy**
- Search by name/student number
- Filter: unpaid / paid / free tuition
- Show enrollment hold warning for students with unpaid previous-term balance

---

## 6. Router + Navigation
- Add `OCSPayments` to `src/router.tsx` at `/ocs/payments`
- Add to `navGroupsByRole.ocs` in `PortalLayout.tsx` with DollarSign icon
- Add banner entry in `bannerMap`

---

## 7. Student Enlistment Hold (`src/pages/student/StudentEnlistment.tsx`)
In the enlistment logic, check if the student has an `EnrollmentPayment` record from a prior term with `status === 'unpaid'` and `freeTuition === false`. If so:
- Show a red `StatusBanner` at the top: "Enrollment Hold — Unpaid Balance" with the term name
- Disable the Add to Cart and Finalize buttons

---

## 8. Form 5 PDF Revision (`src/pages/student/StudentEnlistment.tsx`)
Revise `generateEnrollmentFormPdf()` to match UP Form 5 layout:
- Add LAB FEE column to the courses table (computed: `course.labUnits * feeSchedule.labFeePerUnit`)
- Add right-side fee breakdown panel mirroring Form 5's ITEM/CODE/AMOUNT table
- Compute totals: Total Tuition, Add: Other School Fees, Less: Tuition Subsidy (if freeTuition), Less: Other Fees Subsidy, Amount Payable
- If no feeSchedule configured, show dashes (—) for amounts

---

## Files to Modify
1. `src/lib/types.ts` — add TermFeeSchedule, EnrollmentPayment
2. `src/contexts/AppContext.tsx` — state + load/save/upsert actions
3. `src/pages/admin/AdminTermControl.tsx` — fee schedule section
4. `src/pages/ocs/OCSPayments.tsx` — NEW page
5. `src/router.tsx` — add route
6. `src/components/shared/PortalLayout.tsx` — add nav item + banner
7. `src/pages/student/StudentEnlistment.tsx` — hold check + Form 5 PDF

## Database
Run migration for `enrollment_payments` table (step 1 above).
