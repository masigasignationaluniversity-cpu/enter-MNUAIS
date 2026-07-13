import type { Course, Grade, GradeWorkflowStatus, Section, Term, User, College, DegreeProgram, GraduationRequirements, Enrollment, FinalizedEnlistment, SpecializationRequest, GeElectiveRequest } from '@/lib/types';
import { getCurrentYearStanding } from '@/lib/academic';

function effectiveGradeStatus(g: Grade): GradeWorkflowStatus {
  return g.status ?? (g.submitted ? 'posted' : 'draft');
}

/** Maps the computed year classification to the numeric year level shown on the sheet. */
const YEAR_CLASS_TO_LEVEL: Record<string, number> = { Freshman: 1, Sophomore: 2, Junior: 3, Senior: 4 };

/** Full app-state slices needed to compute each student's current year standing. */
export interface GradeSheetContext {
  users: User[];
  colleges: College[];
  degreePrograms: DegreeProgram[];
  graduationRequirements: GraduationRequirements[];
  grades: Grade[];
  sections: Section[];
  courses: Course[];
  enrollments: Enrollment[];
  terms: Term[];
  finalizedEnlistments: FinalizedEnlistment[];
  specializationRequests: SpecializationRequest[];
  geElectiveRequests: GeElectiveRequest[];
  institutionName: string;
}

/** Shared print stylesheet for the official Grade Sheet format. Each printed
 *  class block gets `page-break-after: always` (handled by the caller) so multiple
 *  sections can be concatenated into one multi-page PDF via the browser print dialog. */
export const GRADE_SHEET_STYLES = `
  @page { size: letter portrait; margin: 14mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #111; }
  .sheet { page-break-after: always; }
  .sheet:last-child { page-break-after: auto; }
  .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .topbar .inst { font-weight: bold; font-size: 11pt; }
  .topbar .title { font-weight: bold; font-size: 18pt; letter-spacing: 1px; }
  .topbar .copy { font-weight: bold; font-size: 10pt; color: #555; }
  table { width: 100%; border-collapse: collapse; }
  table.info { margin-bottom: 16px; }
  table.info th, table.info td, table.roster th, table.roster td {
    border: 1px solid #333; padding: 6px 10px;
  }
  table.info th { background: #f3f4f6; font-size: 8.5pt; text-transform: uppercase; text-align: center; }
  table.info td { text-align: center; font-size: 11pt; }
  table.roster th { background: #f3f4f6; font-size: 8.5pt; text-transform: uppercase; text-align: center; }
  table.roster td { font-size: 10pt; }
  .ctr { text-align: center; }
  .bold { font-weight: bold; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

/**
 * Builds the official Grade Sheet HTML block for a single class/section —
 * same format used by Faculty's per-class "Grade Sheet" download.
 *
 * `ctx` should carry the FULL app-state arrays (not pre-filtered to this section) —
 * they're needed to compute each student's current year standing across their whole
 * academic record, using the exact same Plan-of-Study-based calculation shown on the
 * student's own Profile page.
 */
export function buildGradeSheetBlock(
  section: Section,
  course: Course | undefined,
  term: Term | undefined,
  ctx: GradeSheetContext,
): string {
  const semesterLabel = term?.semester === '1st' ? 'First Semester' : term?.semester === '2nd' ? 'Second Semester' : (term?.semester ?? '—');
  const totalUnits = (course?.units ?? 0) + (course?.labUnits ?? 0);
  const getCollegeAbbr = (student: User | undefined) => {
    if (!student) return '—';
    const college = ctx.colleges.find(col => col.id === student.college || col.name === student.college);
    return college?.abbreviation ?? student.college ?? '—';
  };
  // Current year standing — same Plan-of-Study-based calculation as the student's own
  // Profile page, so it reflects their live academic standing instead of a stale value.
  const getCurrentYearLevel = (student: User) => {
    const yc = getCurrentYearStanding(
      student, ctx.grades, ctx.sections, ctx.courses, ctx.enrollments, ctx.terms,
      ctx.finalizedEnlistments, ctx.specializationRequests, ctx.geElectiveRequests,
      ctx.graduationRequirements, ctx.colleges, ctx.degreePrograms,
    );
    return yc ? YEAR_CLASS_TO_LEVEL[yc] : (student.yearLevel ?? '');
  };
  const rows = ctx.grades
    .filter(g => g.sectionId === section.id)
    .map(g => ({ g, student: ctx.users.find(u => u.id === g.studentId) }))
    .filter((r): r is { g: Grade; student: User } => !!r.student)
    .sort((a, b) => a.student.name.localeCompare(b.student.name))
    .map(({ g, student }, i) => {
      const st = effectiveGradeStatus(g);
      const gradeDisplay = st === 'posted' ? (g.grade ?? '—') : '—';
      return `<tr>
        <td class="ctr">${i + 1}</td>
        <td class="ctr">${student.studentNumber ?? '—'}</td>
        <td>${student.name.toUpperCase()}</td>
        <td class="ctr">${getCollegeAbbr(student)}</td>
        <td class="ctr">${getCurrentYearLevel(student)}</td>
        <td class="ctr bold">${gradeDisplay}</td>
        <td>${st === 'posted' ? (g.remarks ?? '') : ''}</td>
      </tr>`;
    }).join('');

  return `<div class="sheet">
    <div class="topbar">
      <span class="inst">${ctx.institutionName.toUpperCase()}</span>
      <span class="title">GRADE SHEET</span>
      <span class="copy">REGISTRAR'S COPY</span>
    </div>
    <table class="info">
      <thead>
        <tr>
          <th>Course Number/Title</th>
          <th>Units</th>
          <th>Sem/Term</th>
          <th>School Year</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${course?.code ?? ''} ${course?.title ?? ''}</td>
          <td>${totalUnits}</td>
          <td>${semesterLabel}</td>
          <td>${term?.academicYear ?? ''}</td>
        </tr>
      </tbody>
    </table>
    <table class="roster">
      <thead>
        <tr>
          <th>Count</th>
          <th>Student No.</th>
          <th>Student Name</th>
          <th>College</th>
          <th>Year</th>
          <th>Final Grade</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

/** Opens a print window containing one or more grade sheet blocks and triggers print. */
export function printGradeSheets(title: string, blocksHtml: string) {
  const html = `<!DOCTYPE html><html><head><title>${title}</title>
    <style>${GRADE_SHEET_STYLES}</style></head><body>${blocksHtml}</body></html>`;
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
  return true;
}
