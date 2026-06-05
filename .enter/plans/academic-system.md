# Implementation Plan

## 1. Timetable → PDF (Faculty + Student)

### FacultyTimetable.tsx
- Remove `import { toPng } from 'html-to-image'`
- Replace `downloadTimetable()` with async function using `html2canvas` + `jspdf`
- Target: `timetableRefs.current[termId]` div
- Export: landscape A4, fit content width to page
- Change button label: "Download PNG" → "Download PDF"

### StudentEnlistment.tsx — timetable
- Remove `toPng` from html-to-image import (keep other imports)
- Replace `downloadTimetable()` with html2canvas + jspdf (portrait A4)
- Target: `timetableRef.current` div
- Change button label: "PNG" → "PDF"

---

## 2. Export Documents → PDF (all portals, except .xlsx)

### AdminReportCard.tsx
- Add `reportRef = useRef<HTMLDivElement>(null)` 
- Wrap student card + per-term tables in `<div ref={reportRef}>`
- Replace `window.print()` with async `downloadPDF()`:
  - html2canvas(reportRef.current, { scale: 2, backgroundColor: '#fff' })
  - jsPDF portrait A4, fit image, add pages if tall
  - pdf.save(`TOR_${student.name}...pdf`)
- Change button: "Print" → "Download PDF"

### OCSStudents.tsx — downloadStudentPDF
- Already builds an HTML string in `const html = ...`
- Replace window.open + print with:
  1. Create hidden `<div>`, set innerHTML = html
  2. Append to body (fixed, off-screen, width=210mm)
  3. html2canvas on that div → jspdf portrait A4
  4. pdf.save(`TOR_${student...}.pdf`)
  5. Remove div from body
- Change button label from "Generate TOR PDF" to "Download TOR PDF"

---

## 3. Active Enlistment — ClassCard Collapse Fix

### StudentEnlistment.tsx — ClassCard component (line 153)
Current: `const [open, setOpen] = React.useState(false)` — both Lec and Lab cards start collapsed.
User issue: Lec card should start EXPANDED; Lab/Rec card starts collapsed. Each independently collapsible.

**Fix:**
- Add `defaultOpen?: boolean` to ClassCard props
- Change state init: `const [open, setOpen] = React.useState(defaultOpen ?? false)`
- Where Lec+Lab renders (both cartRows and enrolledRows), pass `defaultOpen={true}` to the Lec ClassCard and `defaultOpen={false}` to the Lab ClassCard

These are at two locations in the JSX:
1. cartRows section (line ~1513): `<ClassCard ... />` (Lec) + `{sec.labSchedule && <ClassCard isLab ... />}` (Lab)
2. enrolledRows section (line ~1598): same pattern

---

## 4. PDF Rendering Utility (shared helper)
Create a shared `downloadAsPdf` helper:
```typescript
// src/lib/pdfUtils.ts
export async function downloadAsPdf(element: HTMLElement, filename: string, landscape = false) {
  const [html2canvas, { default: jsPDF }] = await Promise.all([
    import('html2canvas').then(m => m.default),
    import('jspdf'),
  ]);
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const ratio = canvas.height / canvas.width;
  const iw = pw - 20;
  const ih = iw * ratio;
  // Multi-page support
  let pageTop = 0;
  while (pageTop < ih) {
    if (pageTop > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 10, 10 - pageTop, iw, ih);
    pageTop += ph - 20;
  }
  pdf.save(filename);
}
```

---

## Files to Modify
1. `src/pages/faculty/FacultyTimetable.tsx` — timetable PDF
2. `src/pages/student/StudentEnlistment.tsx` — timetable PDF + ClassCard fix
3. `src/pages/admin/AdminReportCard.tsx` — report card PDF
4. `src/pages/ocs/OCSStudents.tsx` — TOR PDF
5. `src/lib/pdfUtils.ts` (NEW) — shared PDF utility

## Notes
- jspdf + html2canvas already installed
- Remove `html-to-image` imports where replaced
- No XLSX downloads → unchanged (courses template uses XLSX by design)
- CSV grade exports → unchanged (data exports, not documents)
- `window.print()` in OCSConsents is a "Preview PDF" button (not a download) → out of scope
