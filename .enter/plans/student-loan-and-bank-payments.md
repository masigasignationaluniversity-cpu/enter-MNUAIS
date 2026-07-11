# Student Loan Applications + OCS Banking Payment Method

## Summary
Add a "Student Loan" request flow (student applies → OCS approves/denies) that lifts a payment hold immediately and carries the unpaid balance forward as a surcharge on the succeeding term. Also add a Payment Method (Cash / Online Banking / Over-the-Counter Bank Deposit) + Reference/Transaction Code to OCS's "Record Payment" dialog, for record-keeping purposes.

## 1. Data Model (`src/lib/types.ts`)

Add new types, following the exact pattern of `UnderloadApplication`:

```ts
export type StudentLoanStatus = 'pending' | 'approved' | 'denied';
export interface StudentLoanApplication {
  id: string;
  studentId: string;
  termId: string;        // the term with the unpaid balance
  reason: string;
  amount: number;        // snapshot of the outstanding balance at time of application
  status: StudentLoanStatus;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  response?: string;
  carriedToTermId?: string; // set when approved — the succeeding term the balance was carried into
}
```

Extend `EnrollmentPayment`:
```ts
carriedOverAmount?: number; // extra amount added to this term's payable, carried from a prior approved loan
```

Extend `PaymentTransaction`:
```ts
paymentMethod?: 'cash' | 'online_banking' | 'bank_deposit';
referenceCode?: string; // bank/online transaction reference code (for record only)
```

Add `studentLoanApplications: StudentLoanApplication[]` to `AppState`.

## 2. Database (Supabase migration)

```sql
create table student_loan_applications (
  id text primary key,
  student_id text not null,
  term_id text not null,
  reason text not null,
  amount numeric not null default 0,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by text,
  response text,
  carried_to_term_id text
);
alter table student_loan_applications enable row level security;
create policy student_loan_applications_all on student_loan_applications for all using (true) with check (true);

alter table enrollment_payments add column carried_over_amount numeric default 0;
alter table payment_transactions add column payment_method text default 'cash';
alter table payment_transactions add column reference_code text;
```

## 3. AppContext (`src/contexts/AppContext.tsx`)

- `if (!s.studentLoanApplications) s.studentLoanApplications = [];` in state init.
- `loadStudentLoanApplications()` — same shape as `loadUnderloadApplications`.
- `submitStudentLoanApplication(studentId, termId, reason, amount)` — inserts pending record (blocks duplicate pending/approved per term, mirrors underload).
- `processStudentLoanApplication(id, status, processedBy, response?)`:
  - On `approved`: determine the succeeding term via `sortTermsChronologically` (find index of `termId`, take `index+1`); if it exists, `upsertEnrollmentPayment` for that succeeding term with `carriedOverAmount` incremented by the loan amount (creating the payment record if none exists yet, defaulting other fields). Set `carriedToTermId` on the loan record. If no succeeding term exists yet, still approve but leave `carriedToTermId` unset (carried amount applied once that term is created — out of scope; note limitation to user only if asked).
  - On `denied`: just update status/response, no side effects.
  - Update `enrollmentPayments` for the **original held term** is NOT changed to "paid" — instead the hold-check logic (`StudentEnlistment.tsx`) will treat an approved loan on that term as suppressing the hold (see §5).
- `addPaymentTransaction` — extend param object with optional `paymentMethod` and `referenceCode`, persist to new columns.
- Wire `loadStudentLoanApplications` into the initial load effect + realtime subscription (mirror underload's).
- Export new functions from context value.

## 4. OCS Page: new `src/pages/ocs/OCSStudentLoans.tsx`

Clone the structure of `OCSUnderload.tsx` (stat cards, filters, list, approve/deny with response textarea). Differences:
- Shows `amount` (loan amount requested) per application.
- Approve button calls `processStudentLoanApplication(app.id, 'approved', me.id)`.
- After approving, show a toast noting the balance was carried to the succeeding term (or a note if no succeeding term exists yet).
- No PDF print requirement (skip to keep scope tight) — actually keep parity minimal, no printUnderloadPDF equivalent needed unless trivial; I will skip PDF generation for loans to control scope.

Register route `/ocs/student-loans` in `src/router.tsx` and add nav entry in `PortalLayout.tsx` under OCS "Requests" group (label "Student Loans", DollarSign or Landmark icon) + add a `bannerConfig` entry like the other OCS pages have (optional, following pattern at line 139 area).

## 5. Student Enlistment (`src/pages/student/StudentEnlistment.tsx`)

- Pull `studentLoanApplications`, `submitStudentLoanApplication` from `useApp()`.
- Compute `myLoanAppForHeldTerm` = latest loan application by this student for `heldByTerm.id`.
- **Hold suppression:** modify `isPaymentHeld` computation — if there's an `approved` loan application for the currently-detected held term, exclude that term from the `heldByTerm` scan (i.e., treat it as settled for hold purposes only, not as "paid" in payment records).
- **Banner button:** in the existing Payment Hold banner (`StatusBanner type="warning"` block, ~line 2233), add an "Apply for Student Loan" button next to "View Payment History" — visible only if no pending/approved loan application already exists for `heldByTerm.id`. If a pending application exists, show a small inline note "Loan application pending OCS review" instead of the button. If approved (edge case where realtime hasn't yet re-run the hold calc), show "Loan approved — balance carried to next term".
- **New dialog** `showLoanDialog` (state) mirroring the existing Underload Application dialog pattern (~line 3754): title "Student Loan Application", info-note explaining "Your current unpaid balance will be added to your fees for the succeeding term once approved. You may enlist immediately after approval.", reason textarea (required), and a read-only display of the computed outstanding balance for `heldByTerm` (reuse existing `computeTermFees`/`applySubsidies` helpers already defined inline in the payment hold banner block — lift them slightly higher in scope or recompute inline). On submit: call `submitStudentLoanApplication(student.id, heldByTerm.id, reason, outstandingAmount)`, toast success, close dialog.

## 6. OCS Payments Dialog — Banking Payment Method (`src/pages/ocs/OCSPayments.tsx`)

In the "Record Payment" dialog:
- Add a `payMethod` state (`'cash' | 'online_banking' | 'bank_deposit'`, default `'cash'`) and `payRefCode` state.
- Add a segmented control / `SearchableSelect` for "Payment Method" above the OR Number field.
- When method is `online_banking` or `bank_deposit`, show an additional required "Reference / Transaction Code" input (bank record purposes only — does not replace OR Number, which remains the internal receipt number per existing behavior confirmed by user).
- Pass `paymentMethod: payMethod, referenceCode: payRefCode || undefined` into `addPaymentTransaction(...)`.
- Display payment method + reference code in the transaction history rows (expanded receipts list) as a small badge/text next to OR number.

## 7. Nav & Misc
- Add OCS sidebar entry + banner config for `/ocs/student-loans`.
- No changes needed to student sidebar (loan application is accessed via the enlistment hold banner only, per user's choice).

## Out of scope / explicitly not doing
- No PDF certificate generation for loan approvals (keeps scope tight; can add later if requested).
- No automatic re-application of carried-over amount beyond one succeeding term (if student defaults again next term, standard hold logic re-applies — matches user's approved answer).
- Not touching `AdminFeeSchedule.tsx` — the carried-over amount is added as a flat surcharge line item in the succeeding term's `EnrollmentPayment.carriedOverAmount`, added into `totalPayable` calculations wherever fees are computed for that student (OCSPayments `calcAmountPayable` and StudentEnlistment `applySubsidies`/`computeTermFees` displays) by simply summing `+ payment.carriedOverAmount` at the final total step in both places.

## Files touched
- `src/lib/types.ts` — new types/fields
- `src/contexts/AppContext.tsx` — new state, load/submit/process functions, extend addPaymentTransaction
- `src/pages/ocs/OCSStudentLoans.tsx` — new page
- `src/router.tsx` — new route
- `src/components/shared/PortalLayout.tsx` — new nav entry + banner config
- `src/pages/student/StudentEnlistment.tsx` — hold suppression logic, loan dialog, banner button
- `src/pages/ocs/OCSPayments.tsx` — payment method + reference code fields, carriedOverAmount included in totals
- Supabase migration for `student_loan_applications` table + new columns on `enrollment_payments`/`payment_transactions`
