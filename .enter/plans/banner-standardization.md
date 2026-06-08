# Banner Standardization Plan

## Context
All banners across the application use inconsistent markup — some use `border-l-4` gradient style, others use `rounded-md border`, `rounded-xl border`, plain `bg-*` wrappers, etc. The user wants one fixed layout with color-coding by banner type.

## Design: One Fixed Layout

All banners become:
```
rounded-lg border-l-4 {colorBorder} {colorBg} px-5 py-4 flex items-start gap-3
  └── rounded-full {iconBg} p-1.5 flex-shrink-0 mt-0.5
      └── Icon w-4 h-4 {iconColor}
  └── div
      ├── p.font-semibold text-sm {titleColor}   ← title (required)
      └── p.text-xs {descColor} mt-0.5           ← description (optional, or children)
```

## 7 Banner Variants

| type | border | bg | icon bg | icon / title color | Use case |
|---|---|---|---|---|---|
| `warning` | amber-400 | amber-50/80 | amber-100 | amber-700 | Not open, not configured |
| `deadline` | orange-500 | orange-50/80 | orange-100 | orange-700 | Upcoming deadline with date |
| `error` | red-500 | red-50/80 | red-100 | red-700 | Passed deadline, locked |
| `open` | green-500 | green-50/80 | green-100 | green-700 | Active enrollment/window |
| `info` | blue-500 | blue-50/80 | blue-100 | blue-700 | Instructions, info |
| `success` | emerald-500 | emerald-50/80 | emerald-100 | emerald-700 | Eligible, completed |
| `notice` | slate-400 | slate-50/80 | slate-100 | slate-600 | Neutral / grade-submission notice |

## Component API

```tsx
<StatusBanner
  type="warning" | "deadline" | "error" | "open" | "info" | "success" | "notice"
  title="..."          // bold header text
  description="..."    // optional subtitle (or use children for rich content)
  className="..."      // optional extra classes
/>
```

## Files to Create / Modify

### New file:
- `src/components/shared/StatusBanner.tsx` — the reusable component

### Files to update (replace inline banners with StatusBanner):

**Student:**
1. `StudentEvaluation.tsx` — 3 banners: warning (not-set), warning (upcoming), error (ended)
2. `StudentConsent.tsx` — 2 banners: warning (not-open), warning (upcoming deadline)
3. `StudentPrerogatives.tsx` — 2 banners: warning (not-open), warning (upcoming deadline)
4. `StudentEnlistment.tsx` — amber warnings + info + enrollment window banners
5. `StudentGeElective.tsx` — warning (not-open), deadline (upcoming), error (passed)
6. `StudentSpecialization.tsx` — warning (not-open), deadline (upcoming), error (passed), info

**OCS:**
7. `OCSConsents.tsx` — error (deadline passed)
8. `OCSChangeDrop.tsx` — error (deadline passed)
9. `OCSReconsideration.tsx` — error (deadline passed), warning (reminder)
10. `OCSGeElective.tsx` — error (passed), warning (no deadline), deadline (upcoming)
11. `OCSSpecialization.tsx` — error (passed), deadline (upcoming)
12. `OCSUnderload.tsx` — error (passed), deadline (upcoming), warning (window info)
13. `OCSPlanOfStudy.tsx` — info (read-only note)
14. `OCSCourses.tsx` — info (prerequisites note)

**Faculty:**
15. `FacultyEvaluations.tsx` — notice (grades required)

**Student Plan:**
16. `StudentPlanOfStudy.tsx` — success/warning (eligibility banner stays, already good)

## Implementation Steps

1. Create `StatusBanner.tsx` with all 7 variants using Lucide icons:
   - warning → AlertTriangle
   - deadline → Clock
   - error → Lock (or ShieldAlert)
   - open → Unlock (or CheckCircle)
   - info → Info
   - success → CheckCircle2
   - notice → Bell (or MessageSquare)

2. Update each file — replace all inline banner markup with `<StatusBanner type="..." title="..." description="..." />`

3. Run lint — verify no errors
