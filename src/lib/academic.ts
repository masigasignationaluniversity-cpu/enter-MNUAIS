import type { Grade, Section, Course, Term, GraduationRequirements, Enrollment, FinalizedEnlistment, SpecializationRequest, GeElectiveRequest } from './types';
import type { GradeValue } from './types';

// ─── Year Classification ───────────────────────────────────────────────────────
export type YearClassification = 'Freshman' | 'Sophomore' | 'Junior' | 'Senior';

/**
 * Classifies a student's year level based on the percentage of total program units completed.
 *
 * Standard (bachelors/masters/doctorate):
 *   < 25%      → Freshman
 *   25–50%     → Sophomore
 *   50–75%     → Junior
 *   ≥ 75%      → Senior
 *
 * Associate / Certificate programs:
 *   < 50%      → Freshman
 *   ≥ 50%      → Sophomore
 */
export function getYearClassification(passedUnits: number, totalProgramUnits: number, degreeType?: string): YearClassification {
  if (totalProgramUnits <= 0) return 'Freshman';
  const pct = passedUnits / totalProgramUnits;
  if (degreeType === 'associate_certificate') {
    return pct < 0.5 ? 'Freshman' : 'Sophomore';
  }
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
  enrollments?: { studentId: string; sectionId: string; termId: string; status: string }[],
  /** When provided, only count passed units for courses in this set.
   *  Unit-based elective categories ('Elective GE', 'Specialized') are always
   *  counted regardless, since they are student-chosen and program-agnostic. */
  allowedCourseIds?: Set<string>,
): number {
  return grades
    .filter(g => g.studentId === studentId && g.submitted && g.grade !== null)
    .reduce((sum, g) => {
      const sec = sections.find(s => s.id === g.sectionId);
      const course = sec ? courses.find(c => c.id === sec.courseId) : null;
      if (!course || course.isPE || course.isNSTP) return sum;
      // If an allowedCourseIds filter is active, skip courses outside the
      // current program's curriculum (except student-chosen unit-based electives)
      if (allowedCourseIds) {
        const isUnitBased = course.category === 'Elective GE' || course.category === 'Specialized';
        if (!isUnitBased && !allowedCourseIds.has(course.id)) return sum;
      }
      // Skip if the corresponding enrollment was officially dropped
      if (enrollments) {
        const enr = enrollments.find(e => e.studentId === studentId && e.sectionId === g.sectionId && e.termId === g.termId);
        if (enr?.status === 'dropped') return sum;
      }
      const effective = (g.removalSubmitted && g.removalGrade) ? g.removalGrade : g.grade!;
      // S (Thesis 1 pass) and P (pass/fail pass) count as passed units
      if (effective === 'S' || effective === 'P') {
        return sum + course.units + (course.labUnits ?? 0);
      }
      const numGrade = parseFloat(effective as string);
      if (isNaN(numGrade) || numGrade > 3.0) return sum; // 4, 5, INC, DRP, F, U don't count
      return sum + course.units + (course.labUnits ?? 0);
    }, 0);
}

/**
 * Builds a Set of course IDs that belong to a student's CURRENT program curriculum,
 * using the matching global + college/program graduation requirements.
 * Pass this to `getPassedUnits()` so only on-program units are counted for
 * year classification after a student shifts programs.
 */
export function buildProgramCourseIdSet(
  graduationRequirements: GraduationRequirements[],
  collegeId: string,
  programId?: string,
): Set<string> {
  const ids = new Set<string>();
  for (const req of graduationRequirements) {
    // Include global (collegeId='') or matching college/program requirements
    const isGlobal = !req.collegeId || req.collegeId === '';
    const isCollegeMatch = req.collegeId === collegeId && (!req.programId || req.programId === programId);
    if (!isGlobal && !isCollegeMatch) continue;
    req.requiredGeCourseIds.forEach(id => ids.add(id));
    req.requiredHkPeNstpCourseIds.forEach(id => ids.add(id));
    req.requiredElectiveGeCourseIds.forEach(id => ids.add(id));
    req.requiredMajorCourseIds.forEach(id => ids.add(id));
    req.requiredSpecializedCourseIds.forEach(id => ids.add(id));
    req.requiredThesisCourseIds.forEach(id => ids.add(id));
    req.requiredSeminarCourseIds.forEach(id => ids.add(id));
  }
  return ids;
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

    // Failing = numeric grade > 3.0 (i.e., 4 or 5), or U/F (S/U or P/F fail)
    if ((!isNaN(numGrade) && numGrade > 3.0) || effective === 'U' || effective === 'F') {
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

// ─── Prescription Period (INC / 4.0) ─────────────────────────────────────────
// One (1) academic year = three (3) terms (1st Sem → 2nd Sem → Mid-Year)

const SEMESTER_ORDER: Record<string, number> = { '1st': 0, '2nd': 1, 'Mid-Term': 2 };

/**
 * Sort terms chronologically by academic year, then by semester sequence:
 * 1st Semester → 2nd Semester → Mid-Year / Summer
 */
export function sortTermsChronologically(terms: Term[]): Term[] {
  return [...terms].sort((a, b) => {
    const ayDiff = a.academicYear.localeCompare(b.academicYear);
    if (ayDiff !== 0) return ayDiff;
    return (SEMESTER_ORDER[a.semester] ?? 3) - (SEMESTER_ORDER[b.semester] ?? 3);
  });
}

/**
 * Return how many terms have passed from the grade term up to (but not including) the reference term.
 * E.g. grade in term index 2, reference index 5 → 3 terms have passed.
 */
export function termsSinceGrade(gradeTermId: string, referenceTermId: string, sortedTerms: Term[]): number {
  const gi = sortedTerms.findIndex(t => t.id === gradeTermId);
  const ri = sortedTerms.findIndex(t => t.id === referenceTermId);
  if (gi === -1 || ri === -1) return 0;
  return Math.max(0, ri - gi);
}

/**
 * Returns true when the 1-academic-year (3-term) prescription period has elapsed.
 */
export function isPrescriptionExpired(gradeTermId: string, referenceTermId: string, sortedTerms: Term[]): boolean {
  return termsSinceGrade(gradeTermId, referenceTermId, sortedTerms) >= 3;
}

/**
 * Returns the term that is exactly 3 terms after the grade term (the deadline term).
 * Returns null if data is insufficient.
 */
export function getPrescriptionDeadlineTerm(gradeTermId: string, sortedTerms: Term[]): Term | null {
  const idx = sortedTerms.findIndex(t => t.id === gradeTermId);
  if (idx === -1) return null;
  return sortedTerms[idx + 3] ?? null;
}

/**
 * Human-readable deadline label: "End of <term name>" or "Expired" if past deadline.
 */
export function getPrescriptionDeadlineLabel(gradeTermId: string, terms: Term[]): { label: string; expired: boolean; urgent: boolean } {
  const sorted = sortTermsChronologically(terms);
  const refTerm = sorted.find(t => t.isActive) ?? sorted[sorted.length - 1];
  const deadlineTerm = getPrescriptionDeadlineTerm(gradeTermId, sorted);
  if (!deadlineTerm) return { label: 'Unknown', expired: false, urgent: false };
  const expired = refTerm ? isPrescriptionExpired(gradeTermId, refTerm.id, sorted) : false;
  const termsSince = refTerm ? termsSinceGrade(gradeTermId, refTerm.id, sorted) : 0;
  return {
    label: expired ? `Expired (was: End of ${deadlineTerm.name})` : `End of ${deadlineTerm.name}`,
    expired,
    urgent: !expired && termsSince === 2, // last term before deadline
  };
}

/**
 * Returns true if a 4.0 grade should be auto-converted to 5.0.
 * Purely time-based: if 3+ terms (1 academic year) have passed since the grade
 * was given and no removal exam has been submitted, the grade auto-converts.
 * Re-enrollment in the same course is a separate academic record and does NOT
 * reset or extend the prescription period for the original 4.0.
 */
export function shouldAutoConvert40(
  grade: Grade,
  _allGrades: Grade[],
  _sections: Section[],
  sortedTerms: Term[],
  referenceTermId: string,
): boolean {
  if (grade.grade !== '4') return false;
  if (grade.removalSubmitted) return false;
  return isPrescriptionExpired(grade.termId, referenceTermId, sortedTerms);
}

/**
 * Get the effective grade applying all academic rules:
 * - Uses removalGrade if officially submitted
 * - Auto-converts 4.0 → 5.0 if prescription expired and no re-enrollment within year
 * - Otherwise returns original grade
 */
export function getEffectiveGradeWithRules(
  grade: Grade,
  allGrades: Grade[],
  sections: Section[],
  terms: Term[],
): GradeValue | null {
  if (!grade.grade || !grade.submitted) return null;
  if (grade.removalSubmitted && grade.removalGrade) return grade.removalGrade;
  const sorted = sortTermsChronologically(terms);
  const refTerm = sorted.find(t => t.isActive) ?? sorted[sorted.length - 1];
  if (refTerm && shouldAutoConvert40(grade, allGrades, sections, sorted, refTerm.id)) return '5';
  return grade.grade;
}

/**
 * Returns true if a student is restricted from re-enrolling in a course
 * because they have an active, uncompleted INC within the 3-term window.
 * Rule: "A course with an INC may not be re-enrolled within the period or term."
 */
export function isIncEnrollmentRestricted(
  studentId: string,
  courseId: string,
  grades: Grade[],
  sections: Section[],
  terms: Term[],
): boolean {
  const sorted = sortTermsChronologically(terms);
  const refTerm = sorted.find(t => t.isActive) ?? sorted[sorted.length - 1];
  if (!refTerm) return false;
  return grades.some(g => {
    if (g.studentId !== studentId || g.grade !== 'INC' || !g.submitted) return false;
    if (g.removalSubmitted) return false; // already completed
    const sec = sections.find(s => s.id === g.sectionId);
    if (!sec || sec.courseId !== courseId) return false;
    return !isPrescriptionExpired(g.termId, refTerm.id, sorted);
  });
}

/**
 * Computes total required academic units from graduation requirements.
 * Basis: GE (global) + additional GE (college) + maxMajor + maxSpecialized + maxThesis + maxElectiveGe.
 * HK/PE/NSTP is intentionally excluded (it does not count toward year classification).
 * Falls back to 0 if no graduation requirements are configured.
 */
export function computeTotalRequiredUnits(
  globalReq: GraduationRequirements | undefined,
  collegeReq: GraduationRequirements | undefined,
  courses: Course[]
): number {
  const unitOf = (id: string) => {
    const c = courses.find(x => x.id === id);
    return c ? c.units + (c.labUnits ?? 0) : 0;
  };
  let total = 0;
  // Global required GE
  if (globalReq) total += (globalReq.requiredGeCourseIds ?? []).reduce((s, id) => s + unitOf(id), 0);
  if (!collegeReq) return total;
  // College additional required GE
  total += (collegeReq.requiredGeCourseIds ?? []).reduce((s, id) => s + unitOf(id), 0);
  // Major (bounded by maxMajor)
  if ((collegeReq.maxMajor ?? 0) > 0) total += collegeReq.maxMajor;
  // Specialization
  if ((collegeReq.maxSpecialized ?? 0) > 0) total += collegeReq.maxSpecialized;
  // Thesis
  if ((collegeReq.maxThesis ?? 0) > 0) total += collegeReq.maxThesis;
  // Elective GE
  if ((collegeReq.maxElectiveGe ?? 0) > 0) total += collegeReq.maxElectiveGe;
  return total;
}

// ─── Plan of Study Progress (OCS-configured) ───────────────────────────────────
const POS_PASSING_GRADES: GradeValue[] = ['1.0', '1.25', '1.5', '1.75', '2.0', '2.25', '2.5', '2.75', '3.0', 'P', 'S'];

export interface PlanOfStudyProgress {
  totalRequiredUnits: number;
  totalPassedUnits: number;
}

/**
 * Computes graduation progress (required vs. passed units) using the EXACT same
 * logic as the student-facing Plan of Study page — i.e. what OCS has configured
 * for the student's degree program (GE, HK/PE/NSTP, Major, Thesis, Seminar,
 * Internship/Practicum, additional required GE, NSTP, and free-choice Elective
 * GE / Specialized units). This intentionally ignores the Admin's static
 * DegreeProgram.totalUnits field — OCS's Plan of Study is now the source of truth.
 */
export function computePlanOfStudyProgress(
  studentId: string,
  degreeType: 'bachelors' | 'masters' | 'doctorate' | 'associate_certificate' | undefined,
  globalReq: GraduationRequirements | undefined,
  collegeReq: GraduationRequirements | undefined,
  grades: Grade[],
  sections: Section[],
  courses: Course[],
  enrollments: Enrollment[],
  terms: Term[],
  finalizedEnlistments: FinalizedEnlistment[],
  specializationRequests: SpecializationRequest[],
  geElectiveRequests: GeElectiveRequest[],
): PlanOfStudyProgress {
  const isGradProgram = degreeType === 'masters' || degreeType === 'doctorate';
  const activeTerm = terms.find(t => t.isActive);

  // Passed-course lookup: mirrors StudentPlanOfStudy's statusMap (submitted grades only)
  const passedCourseIds = new Set<string>();
  grades
    .filter(g => g.studentId === studentId && g.submitted)
    .forEach(g => {
      const sec = sections.find(s => s.id === g.sectionId);
      if (!sec) return;
      const effective = (g.removalSubmitted && g.removalGrade) ? g.removalGrade : g.grade;
      if (!effective) return;
      if (POS_PASSING_GRADES.includes(effective as GradeValue)) passedCourseIds.add(sec.courseId);
    });
  const isPassed = (courseId: string) => passedCourseIds.has(courseId);
  const unitsOf = (c: Course) => (c.units ?? 0) + (c.labUnits ?? 0);

  // Fixed-list panels (GE, HK/PE, Major, Thesis, Seminar, Internship/Practicum)
  const fixedPanels: { courses: Course[]; maxCount?: number }[] = [
    ...(isGradProgram ? [] : [{
      courses: (globalReq?.requiredGeCourseIds ?? []).map(id => courses.find(c => c.id === id)).filter((c): c is Course => Boolean(c)),
    }]),
    ...(isGradProgram ? [] : [{
      courses: (globalReq?.requiredHkPeNstpCourseIds ?? [])
        .map(id => courses.find(c => c.id === id))
        .filter((c): c is Course => Boolean(c) && !c.isNSTP),
    }]),
    {
      courses: (collegeReq?.requiredMajorCourseIds ?? []).map(id => courses.find(c => c.id === id)).filter((c): c is Course => Boolean(c)),
      maxCount: collegeReq?.maxMajor || 0,
    },
    ...(degreeType !== 'associate_certificate' ? [{
      courses: (collegeReq?.requiredThesisCourseIds ?? []).map(id => courses.find(c => c.id === id)).filter((c): c is Course => Boolean(c)),
      maxCount: collegeReq?.maxThesis || 0,
    }] : []),
    ...(degreeType !== 'associate_certificate' ? [{
      courses: (collegeReq?.requiredSeminarCourseIds ?? []).map(id => courses.find(c => c.id === id)).filter((c): c is Course => Boolean(c)),
      maxCount: collegeReq?.maxSeminar || 0,
    }] : []),
    {
      courses: (collegeReq?.requiredInternshipCourseIds ?? []).map(id => courses.find(c => c.id === id)).filter((c): c is Course => Boolean(c)),
      maxCount: collegeReq?.maxInternship || 0,
    },
  ];

  let totalRequiredUnits = 0;
  let totalPassedUnits = 0;
  for (const p of fixedPanels) {
    const effective = p.maxCount && p.maxCount > 0 ? p.maxCount : p.courses.length;
    totalRequiredUnits += p.courses.slice(0, effective).reduce((s, c) => s + unitsOf(c), 0);
    totalPassedUnits += p.courses.filter(c => isPassed(c.id)).reduce((s, c) => s + unitsOf(c), 0);
  }

  // NSTP: student-chosen, must pass exactly 2 courses (3 units each) — excluded for grad programs
  if (!isGradProgram) {
    const NSTP_REQUIRED = 2;
    const nstpCourseIds = new Set<string>();
    grades.filter(g => g.studentId === studentId && g.submitted).forEach(g => {
      const sec = sections.find(s => s.id === g.sectionId);
      const c = sec ? courses.find(x => x.id === sec.courseId) : undefined;
      if (c?.isNSTP) nstpCourseIds.add(c.id);
    });
    enrollments.filter(e => e.studentId === studentId && e.status !== 'dropped').forEach(e => {
      const sec = sections.find(s => s.id === e.sectionId);
      const c = sec ? courses.find(x => x.id === sec.courseId) : undefined;
      if (c?.isNSTP) nstpCourseIds.add(c.id);
    });
    const nstpCourses = [...nstpCourseIds].map(id => courses.find(c => c.id === id)).filter((c): c is Course => Boolean(c));
    const nstpPassedCount = nstpCourses.filter(c => isPassed(c.id)).length;
    totalRequiredUnits += NSTP_REQUIRED * 3;
    totalPassedUnits += Math.min(nstpPassedCount, NSTP_REQUIRED) * 3;
  }

  // Additional required GE (program-specific, college-level requiredGeCourseIds)
  const additionalGeCourses = (collegeReq?.requiredGeCourseIds ?? []).map(id => courses.find(c => c.id === id)).filter((c): c is Course => Boolean(c));
  totalRequiredUnits += additionalGeCourses.reduce((s, c) => s + unitsOf(c), 0);
  totalPassedUnits += additionalGeCourses.filter(c => isPassed(c.id)).reduce((s, c) => s + unitsOf(c), 0);

  // Free-choice unit-based panels: Elective GE (bachelor's only) + Specialized
  const finalizedTermIds = new Set(finalizedEnlistments.filter(f => f.studentId === studentId).map(f => f.termId));
  const finalizedCourseIds = new Set<string>();
  enrollments.filter(e => e.studentId === studentId && e.status !== 'dropped' && finalizedTermIds.has(e.termId)).forEach(e => {
    const sec = sections.find(s => s.id === e.sectionId);
    if (sec) finalizedCourseIds.add(sec.courseId);
  });

  const buildUnitPanelCourses = (category: 'Elective GE' | 'Specialized', requests: (SpecializationRequest | GeElectiveRequest)[]) => {
    const approved = requests.find(r => r.studentId === studentId && r.status === 'approved');
    const planCourses = (approved?.courseIds ?? []).map(id => courses.find(c => c.id === id)).filter((c): c is Course => Boolean(c));
    const enrolled = courses.filter(c => c.category === category && finalizedCourseIds.has(c.id));
    const enrolledIds = new Set(enrolled.map(c => c.id));
    return [...enrolled, ...planCourses.filter(c => !enrolledIds.has(c.id))];
  };

  if (!isGradProgram && degreeType !== 'associate_certificate') {
    const geCourses = buildUnitPanelCourses('Elective GE', geElectiveRequests);
    const geRequiredUnits = collegeReq?.maxElectiveGe ?? 0;
    const gePassedUnits = geCourses.filter(c => isPassed(c.id)).reduce((s, c) => s + unitsOf(c), 0);
    totalRequiredUnits += geRequiredUnits;
    totalPassedUnits += Math.min(gePassedUnits, geRequiredUnits);
  }
  if (degreeType !== 'associate_certificate') {
    const specCourses = buildUnitPanelCourses('Specialized', specializationRequests);
    const specRequiredUnits = collegeReq?.maxSpecialized ?? 0;
    const specPassedUnits = specCourses.filter(c => isPassed(c.id)).reduce((s, c) => s + unitsOf(c), 0);
    totalRequiredUnits += specRequiredUnits;
    totalPassedUnits += Math.min(specPassedUnits, specRequiredUnits);
  }

  return { totalRequiredUnits, totalPassedUnits };
}
