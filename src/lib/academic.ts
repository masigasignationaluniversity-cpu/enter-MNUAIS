import type { Grade, Section, Course } from './types';

// ─── Year Classification ───────────────────────────────────────────────────────
export type YearClassification = 'Freshman' | 'Sophomore' | 'Junior' | 'Senior';

/**
 * Classifies a student's year level based on the percentage of total program units completed.
 * < 25%      → Freshman
 * 25–50%     → Sophomore
 * 50–75%     → Junior
 * ≥ 75%      → Senior
 */
export function getYearClassification(passedUnits: number, totalProgramUnits: number): YearClassification {
  if (totalProgramUnits <= 0) return 'Freshman';
  const pct = passedUnits / totalProgramUnits;
  if (pct < 0.25) return 'Freshman';
  if (pct < 0.50) return 'Sophomore';
  if (pct < 0.75) return 'Junior';
  return 'Senior';
}

/**
 * Returns the percentage of units completed as a number between 0 and 1.
 */
export function getCompletionPercent(passedUnits: number, totalProgramUnits: number): number {
  if (totalProgramUnits <= 0) return 0;
  return Math.min(1, passedUnits / totalProgramUnits);
}

/**
 * Counts the total academic units a student has passed (numeric grade ≤ 3.0),
 * using the effective grade (removal grade if officially submitted).
 * PE and NSTP are excluded.
 */
export function getPassedUnits(
  studentId: string,
  grades: Grade[],
  sections: Section[],
  courses: Course[],
): number {
  return grades
    .filter(g => g.studentId === studentId && g.submitted && g.grade !== null)
    .reduce((sum, g) => {
      const sec = sections.find(s => s.id === g.sectionId);
      const course = sec ? courses.find(c => c.id === sec.courseId) : null;
      if (!course || course.isPE || course.isNSTP) return sum;
      const effective = (g.removalSubmitted && g.removalGrade) ? g.removalGrade : g.grade!;
      const numGrade = parseFloat(effective as string);
      if (isNaN(numGrade) || numGrade > 3.0) return sum; // 4, 5, INC, DRP, F don't count
      return sum + course.units + (course.labUnits ?? 0);
    }, 0);
}

// ─── Scholastic Standing ───────────────────────────────────────────────────────
export type ScholasticStanding =
  | 'Good Standing'
  | 'Warning'
  | 'Probation'
  | 'Dismissal'
  | 'Permanent Disqualification';

export interface ScholasticResult {
  standing: ScholasticStanding;
  totalAcademicUnits: number;
  failedUnits: number;
  failedPercent: number;
}

/**
 * Computes scholastic standing for a specific term.
 *
 * Rules (from university code):
 * - INC and DRP are excluded from the computation
 * - Grade of 4 counts as failing until it is removed
 * - After removal: only the final removal grade (3.0 or 5.0) is counted
 * - PE and NSTP are excluded
 *
 * Failed % thresholds:
 * - 0%–24%   → Good Standing (passes ≥ 75% of academic units)
 * - 25%–49%  → Warning
 * - 50%–75%  → Probation
 * - 76%–99%  → Dismissal
 * - 100%     → Permanent Disqualification
 */
export function getScholasticStanding(
  studentId: string,
  termId: string,
  grades: Grade[],
  sections: Section[],
  courses: Course[],
): ScholasticResult | null {
  const termGrades = grades.filter(g =>
    g.studentId === studentId &&
    g.termId === termId &&
    g.submitted &&
    g.grade !== null &&
    g.grade !== 'INC' &&  // INC excluded from computation
    g.grade !== 'DRP',    // DRP excluded from computation
  );

  if (termGrades.length === 0) return null;

  let totalAcademicUnits = 0;
  let failedUnits = 0;

  for (const g of termGrades) {
    const sec = sections.find(s => s.id === g.sectionId);
    const course = sec ? courses.find(c => c.id === sec.courseId) : null;
    if (!course || course.isPE || course.isNSTP) continue;

    const units = course.units + (course.labUnits ?? 0);
    totalAcademicUnits += units;

    // Effective grade: use removal grade if officially submitted
    const effective = (g.removalSubmitted && g.removalGrade) ? g.removalGrade : g.grade!;
    const numGrade = parseFloat(effective as string);

    // Failing = numeric grade > 3.0 (i.e., 4 or 5)
    if (!isNaN(numGrade) && numGrade > 3.0) {
      failedUnits += units;
    }
  }

  if (totalAcademicUnits === 0) return null;

  const failedPercent = failedUnits / totalAcademicUnits;

  let standing: ScholasticStanding;
  if (failedPercent >= 1.0) standing = 'Permanent Disqualification';
  else if (failedPercent >= 0.76) standing = 'Dismissal';
  else if (failedPercent >= 0.50) standing = 'Probation';
  else if (failedPercent >= 0.25) standing = 'Warning';
  else standing = 'Good Standing';

  return { standing, totalAcademicUnits, failedUnits, failedPercent };
}

// ─── Display helpers ──────────────────────────────────────────────────────────
export function scholasticStandingColor(standing: ScholasticStanding): string {
  switch (standing) {
    case 'Good Standing': return 'bg-green-100 text-green-800 border-green-300';
    case 'Warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Probation': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'Dismissal': return 'bg-red-100 text-red-800 border-red-300';
    case 'Permanent Disqualification': return 'bg-red-200 text-red-900 border-red-400';
  }
}

export function yearClassificationColor(yc: YearClassification): string {
  switch (yc) {
    case 'Freshman': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Sophomore': return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'Junior': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'Senior': return 'bg-green-100 text-green-800 border-green-300';
  }
}
