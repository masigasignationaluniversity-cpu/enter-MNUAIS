import type { Course, Enrollment, Grade, GraduationApplication, Section, Term, User } from '@/lib/types';
import { getEffectiveGradeWithRules, sortTermsChronologically } from '@/lib/academic';
import { isNonAcademicCourse } from '@/lib/utils';

export interface TorTermRow {
  course: Course | null | undefined;
  grade: Grade | null | undefined;
  enrollment: Enrollment | null | undefined;
}

export interface TorTermBlock {
  term: Term;
  rows: TorTermRow[];
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Builds the Official Transcript of Records HTML — formatted to match the
 * standard University TOR layout (header, entrance/degree info grid, per-semester
 * subject table with Final/Comp grade + credit, grading legend, signature block).
 */
export function buildOfficialTorHtml(params: {
  student: User;
  termBlocks: TorTermBlock[];
  allGrades: Grade[];
  allSections: Section[];
  allTerms: Term[];
  institutionName: string;
  registrarName: string;
  graduationApplication: GraduationApplication | undefined;
}): string {
  const { student, termBlocks, allGrades, allSections, allTerms, institutionName, registrarName, graduationApplication } = params;

  const isConferred = graduationApplication?.status === 'approved';
  const dateConferredDisplay = isConferred ? (student.dateConferred ? formatDate(student.dateConferred) : '—') : '—';
  const specialOrderDisplay = isConferred ? (student.specialOrderNumber || '—') : '—';

  const semesterLabel = (t: Term) =>
    t.semester === '1st' ? '1st Semester' : t.semester === '2nd' ? '2nd Semester' : t.semester;

  const gradeIsAcademic = (g: Grade | null | undefined) => !!(g && g.submitted && g.grade !== null);

  const sortedBlocks = [...termBlocks].sort((a, b) =>
    sortTermsChronologically(allTerms).findIndex(t => t.id === a.term.id) -
    sortTermsChronologically(allTerms).findIndex(t => t.id === b.term.id)
  );

  const semesterSections = sortedBlocks.map(({ term, rows }) => {
    const courseRows = rows.map(({ course, grade: g, enrollment }) => {
      if (!course) return '';
      const isDropped = enrollment?.status === 'dropped' && !g?.submitted;
      if (isDropped) return '';
      const finalGrade = gradeIsAcademic(g) ? (g!.grade ?? '—') : '—';
      const effective = g ? getEffectiveGradeWithRules(g, allGrades, allSections, allTerms) : null;
      const compGrade = (effective && g?.grade && effective !== g.grade) ? effective : '';
      const credit = course.units + (course.labUnits ?? 0);
      const creditDisplay = isNonAcademicCourse(course) ? `(${credit})` : `${credit}`;
      return `<tr>
        <td style="padding:3px 8px;vertical-align:top;white-space:nowrap">${course.code}</td>
        <td style="padding:3px 8px;vertical-align:top">${course.title}</td>
        <td style="padding:3px 8px;vertical-align:top;text-align:center">${finalGrade}</td>
        <td style="padding:3px 8px;vertical-align:top;text-align:center">${compGrade}</td>
        <td style="padding:3px 8px;vertical-align:top;text-align:center">${creditDisplay}</td>
      </tr>`;
    }).join('');
    if (!courseRows) return '';
    return `<tr><td colspan="5" style="padding:6px 8px 2px;font-style:italic;text-decoration:underline">${semesterLabel(term)} ${term.academicYear}</td></tr>${courseRows}`;
  }).join('');

  return `<div class="tor" style="width:100%;padding:0 6mm;font-family:'Times New Roman',Georgia,serif;color:#111">
    <div style="text-align:center;line-height:1.35">
      <div style="font-size:12pt">Republic of the Philippines</div>
      <div style="font-size:16pt;font-weight:bold;font-style:italic;margin-top:2px">${institutionName.toUpperCase()}</div>
      <div style="font-size:11pt;letter-spacing:0.25em;color:#333;margin-top:2px">OFFICE OF THE REGISTRAR</div>
      <div style="font-size:14pt;font-weight:bold;letter-spacing:0.15em;margin-top:8px">OFFICIAL TRANSCRIPT OF RECORDS</div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:18px;font-size:10pt">
      <tbody>
        <tr>
          <td style="padding:2px 0;width:14%;vertical-align:top">Surname</td>
          <td style="padding:2px 0;width:36%;vertical-align:top;font-weight:bold">: ${student.name.toUpperCase()}</td>
          <td style="padding:2px 0;width:16%;vertical-align:top">Entrance Data</td>
          <td style="padding:2px 0;width:34%;vertical-align:top">: ${student.entranceCredential || '—'}</td>
        </tr>
        <tr>
          <td style="padding:2px 0;vertical-align:top">Degree/Course</td>
          <td style="padding:2px 0;vertical-align:top;font-weight:bold">: ${(student.program ?? '—').toUpperCase()}</td>
          <td style="padding:2px 0;vertical-align:top">ID Number</td>
          <td style="padding:2px 0;vertical-align:top">: ${student.idNumber || '—'}</td>
        </tr>
        <tr>
          <td style="padding:2px 0;vertical-align:top">Date Conferred</td>
          <td style="padding:2px 0;vertical-align:top">: ${dateConferredDisplay}</td>
          <td style="padding:2px 0;vertical-align:top">Year Admitted</td>
          <td style="padding:2px 0;vertical-align:top">: ${student.yearAdmitted || '—'}</td>
        </tr>
        <tr>
          <td style="padding:2px 0;vertical-align:top">Special Order</td>
          <td style="padding:2px 0;vertical-align:top">: ${specialOrderDisplay}</td>
          <td style="padding:2px 0;vertical-align:top">Last School Attended</td>
          <td style="padding:2px 0;vertical-align:top">: ${student.lastSchoolAttended || '—'}</td>
        </tr>
        <tr>
          <td style="padding:2px 0;vertical-align:top">Home Address</td>
          <td style="padding:2px 0;vertical-align:top">: ${student.presentAddress || '—'}</td>
          <td style="padding:2px 0;vertical-align:top">Last Year</td>
          <td style="padding:2px 0;vertical-align:top">: ${student.lastSchoolYear || '—'}</td>
        </tr>
      </tbody>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:10pt;border:1px solid #333">
      <thead>
        <tr style="border-bottom:1px solid #333">
          <th style="padding:6px 8px;text-align:left;width:14%">SUBJECT</th>
          <th style="padding:6px 8px;text-align:left;width:44%">DESCRIPTIVE TITLE</th>
          <th style="padding:6px 8px;text-align:center;width:14%">FINAL GRADE</th>
          <th style="padding:6px 8px;text-align:center;width:14%">COMP GRADE</th>
          <th style="padding:6px 8px;text-align:center;width:14%">CREDIT</th>
        </tr>
      </thead>
      <tbody>
        ${semesterSections || '<tr><td colspan="5" style="padding:16px;text-align:center;color:#999">No academic records found.</td></tr>'}
      </tbody>
    </table>

    <div style="margin-top:16px;font-size:8pt;color:#333;line-height:1.5;border-top:1px solid #999;padding-top:6px">
      <strong>GRADING SYSTEM</strong>: Undergraduate/Graduate Courses: 1.00, 1.25-Excellent; 1.50, 1.75-Very Good; 2.0-2.25-Good; 2.50, 2.75-Satisfactory; 3.00-Passing;
      5.00-Failure, no credit; INC-Incomplete, no credit; DRP Dropped, no credit; IP-In progress, no credit; 5.00*-Overdue, no credit.<br />
      Diploma Courses: E Excellent; VG-Very Good; G-Good; S-Satisfactory; P-Passing; INC-Incomplete, no credit; F or U-Failure, no credit<br /><br />
      <strong>CREDIT</strong>: One university unit of credit is one hour lecture or recitation each week for the period of one semester, while in all laboratory courses, three hours of laboratory week.
    </div>

    <div style="margin-top:22px;font-size:8.5pt;color:#333">
      <strong>NOTE:</strong> This transcript is valid only when it bears the seal of the University and the original signature in ink of the Registrar. Any alteration made on the copy renders the whole transcript invalid.
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:26px;font-size:9.5pt">
      <tbody>
        <tr>
          <td style="width:33%;padding-top:22px;border-top:1px solid #333">Evaluated by</td>
          <td style="width:33%;padding-top:22px;border-top:1px solid #333">Checked by</td>
          <td style="width:34%;text-align:center;padding-top:22px;border-top:1px solid #333;font-weight:bold">${registrarName.toUpperCase()}</td>
        </tr>
        <tr>
          <td></td>
          <td></td>
          <td style="text-align:center;font-size:8.5pt">University Registrar</td>
        </tr>
      </tbody>
    </table>

    <div style="text-align:center;margin-top:16px;font-size:10pt">
      Issued on: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
    </div>
  </div>`;
}
