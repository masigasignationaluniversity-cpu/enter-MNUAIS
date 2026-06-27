# ST Code — Tuition Discount System

## Context
OCS staff need to assign scholarship/discount codes (ST Codes) to students that reduce their tuition fee payable. There are 4 tiers, with fixed effective tuition rates per unit:

| ST Code | Label | Effective Rate/Unit | Other Fees |
|---------|-------|---------------------|------------|
| 33 | Partial Discount – 33% | ₱1,000.00/unit | Unchanged |
| 60 | Partial Discount – 60% | ₱600.00/unit | Unchanged |
| 80 | Partial Discount – 80% | ₱300.00/unit | Unchanged |
| 100 | Full Discount | Free (₱0.00) | Also waived |

- ST Code 100 = same behavior as existing RA 10931 (freeTuition + otherFeesSubsidy = true, status = free_tuition)
- ST Codes 33/60/80 = tuition-only discount; other fees still apply; student still goes through normal payment flow

## Files to Modify

1. **`src/lib/types.ts`** — Add `stCode?: string` to `EnrollmentPayment`
2. **`src/pages/ocs/OCSPayments.tsx`** — Main changes (see below)
3. **`src/pages/student/StudentEnlistment.tsx`** — Show ST code in Form 5 PDF (already has "ST Code" cell in Certification)

---

## Implementation Details

### 1. types.ts
Add to `EnrollmentPayment` interface:
```typescript
stCode?: string;  // '33' | '60' | '80' | '100' — tuition discount tier
```

### 2. OCSPayments.tsx

**A. ST_CODES constant** (top-level, before component):
```typescript
const ST_CODES = [
  { code: '33', label: 'Partial Discount – 33%', ratePerUnit: 1000 },
  { code: '60', label: 'Partial Discount – 60%', ratePerUnit: 600  },
  { code: '80', label: 'Partial Discount – 80%', ratePerUnit: 300  },
  { code: '100', label: 'Full Discount – 100%',  ratePerUnit: 0    },
] as const;
```

**B. `getStCodeSubsidy(stCode, computed)` helper**:
```typescript
// tuitionSubsidy = academicUnits * (tuitionPerUnit - effectiveRate)
// clamped to [0, baseTuition + nstpTuition]
// For code '100': also returns otherFeesSubsidy = otherFees
```

**C. New `stCodeDialog` state**:
```typescript
const [stCodeDialog, setStCodeDialog] = useState<{
  studentId: string; name: string; currentCode?: string;
} | null>(null);
const [selectedStCode, setSelectedStCode] = useState('');
```

**D. `handleAssignStCode()` handler**:
- If selectedStCode === '100': upsert with `freeTuition: true, otherFeesSubsidy: true, status: 'free_tuition', stCode: '100', amountPaid: 0`
- Else (33/60/80): upsert existing payment record with ONLY `stCode` updated, preserving all other flags. If no existing record yet, create with `status: 'unpaid', freeTuition: false, otherFeesSubsidy: false, amountPaid: 0, stCode: code`
- "Clear" option: sets `stCode: undefined`

**E. Update `amountPayable` in student row**:
Replace current:
```typescript
const amountPayable = computed
  ? computed.totalBeforeSubsidy
    - (payment?.freeTuition ? computed.tuition + computed.nstpTuition : 0)
    - (payment?.otherFeesSubsidy ? computed.otherFees : 0)
  : null;
```
With:
```typescript
const { tuitionSubsidy, otherSubsidy } = getStCodeSubsidy(payment?.stCode, computed);
const effectiveTuitionSubsidy = payment?.freeTuition
  ? (computed.tuition + computed.nstpTuition) : tuitionSubsidy;
const effectiveOtherSubsidy = (payment?.otherFeesSubsidy || payment?.freeTuition)
  ? computed.otherFees : otherSubsidy;
const amountPayable = computed
  ? computed.totalBeforeSubsidy - effectiveTuitionSubsidy - effectiveOtherSubsidy
  : null;
```

**F. Update `handleOpenPayDialog`**:
Same logic as (E) above, replacing the current `subsidyTuition`/`subsidyOther` computation.

**G. Update `handleConfirmPaid`**:
Preserve `stCode` from `existingRecord?.stCode` when calling `upsertEnrollmentPayment`.

**H. ST Code badge in student row**:
Add next to `StatusBadge`:
```tsx
{payment?.stCode && (
  <Badge className="text-[10px] bg-purple-100 text-purple-700 border-purple-300">
    ST-{payment.stCode}
  </Badge>
)}
```

**I. "ST Code" button in student row actions**:
Add a small button "ST Code" that opens `stCodeDialog`.

**J. ST Code dialog UI**:
- Radio-group or Select with the 4 tiers + "Clear / None"
- Shows effective rate per unit for each option
- Confirm button

**K. Fee summary in payment dialog** (payDialog):
Show discounted tuition line if stCode is set:
```
Tuition (N units × ₱X/u)             ₱base
  Less: ST Code Discount (N × ₱Y/u)  (₱discount)
```

### 3. StudentEnlistment.tsx (Form 5 PDF)
The Form 5 already has an "ST Code" cell in Certification. Update it to show the actual stCode value:
```html
<div class="ic-label">ST Code</div>
<div style="font-size:7.5px;font-weight:bold">${paymentRecord?.stCode ?? ''}</div>
```

---

## Verification
1. Assign ST Code 33 to a student → amountPayable = otherFees + (academicUnits × ₱1,000) + nstpTuition
2. Assign ST Code 100 → same as "RA 10931" (all fees waived, status = free_tuition)
3. Record payment for ST Code student → dialog shows discounted total
4. Form 5 PDF Certification section shows the ST code
5. Reverting ("Revert" button) preserves normal behavior; Clear ST Code sets stCode = undefined
