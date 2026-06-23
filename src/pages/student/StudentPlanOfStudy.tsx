import React, { useMemo, useEffect, useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, Circle, AlertCircle, Clock, GraduationCap, BookOpen, Printer, Star, Send, XCircle, Trophy, Medal, Download } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Course, GradeValue, CourseCategory } from '@/lib/types';

import PlanFlowchart from '@/components/student/PlanFlowchart';

const PASSING_GRADES: GradeValue[] = ['1.0', '1.25', '1.5', '1.75', '2.0', '2.25', '2.5', '2.75', '3.0', 'P', 'S'];

type CourseStatus = 'passed' | 'in_progress' | 'failed' | 'not_taken';

function StatusBadge({ status }: { status: CourseStatus }) {
  if (status === 'passed') return (
    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
      <CheckCircle2 className="w-3.5 h-3.5" /> Passed
    </span>
  );
  if (status === 'in_progress') return (
    <span className="flex items-center gap-1 text-xs font-semibold text-blue-600">
      <Clock className="w-3.5 h-3.5" /> In Progress
    </span>
  );
  if (status === 'failed') return (
    <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
      <AlertCircle className="w-3.5 h-3.5" /> Failed
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Circle className="w-3.5 h-3.5" /> Not Taken
    </span>
  );
}

const PANEL_LABELS: Record<CourseCategory, string> = {
  'GE': 'General Education Courses',
  'Elective GE': 'Elective General Education',
  'HK/PE/NSTP': 'HK/PE',
  'Major': 'Major Courses',
  'Specialized': 'Specialized Courses',
  'Thesis': 'Thesis',
  'Seminar': 'Seminar Courses',
};

interface BannerProps {
  studentName: string;
  programName: string;
  collegeName: string;
}

function CongratsBanner({ studentName, programName, collegeName }: BannerProps) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-8 text-center"
      style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a21caf 40%, #b45309 100%)' }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full opacity-10 bg-white" />
      <div className="absolute -bottom-10 -right-10 w-52 h-52 rounded-full opacity-10 bg-white" />
      <div className="absolute top-4 right-16 w-20 h-20 rounded-full opacity-10 bg-yellow-300" />

      <div className="relative z-10 space-y-4">
        {/* Trophy + stars row */}
        <div className="flex items-center justify-center gap-3">
          <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
          <Trophy className="w-12 h-12 text-yellow-300" />
          <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
        </div>

        <div>
          <p className="text-yellow-200 text-sm font-semibold uppercase tracking-widest mb-1">
            You did it!
          </p>
          <h2 className="text-4xl font-extrabold text-white drop-shadow-sm">
            Congratulations,
          </h2>
          <h2 className="text-4xl font-extrabold text-yellow-300 drop-shadow-sm mt-1">
            {studentName}!
          </h2>
        </div>

        <p className="text-white/80 text-sm max-w-md mx-auto leading-relaxed">
          You have successfully completed all academic requirements for
        </p>

        <div className="inline-block bg-white/15 border border-white/25 rounded-lg px-6 py-3 backdrop-blur-sm">
          <p className="text-white font-bold text-lg leading-tight">{programName || "Bachelor's Degree"}</p>
          {collegeName && (
            <p className="text-yellow-200 text-xs mt-0.5">{collegeName}</p>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 pt-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span className="text-emerald-200 text-sm font-medium">All requirements fulfilled</span>
        </div>
      </div>
    </div>
  );
}

export default function StudentPlanOfStudy() {
  const { state, loadGraduationRequirements, loadGraduationApplications, submitGraduationApplication, computeGWA } = useApp();
  const student = state.currentUser;
  const activeTerm = state.terms.find(t => t.isActive);
  const [applying, setApplying] = useState(false);

  // Always fetch fresh data when viewing this page
  useEffect(() => {
    loadGraduationRequirements();
    loadGraduationApplications();
  }, [loadGraduationRequirements, loadGraduationApplications]);

  // Resolve college ID (handle both stored-as-ID and stored-as-name)
  const studentCollegeId = useMemo(() => {
    if (!student) return '';
    const byId = state.colleges.find(c => c.id === student.college);
    if (byId) return byId.id;
    const byName = state.colleges.find(c => c.name === student.college);
    return byName?.id ?? student.college ?? '';
  }, [state.colleges, student]);

  const globalReq = state.graduationRequirements.find(r => r.collegeId === 'global' && !r.programId);

  // Resolve the student's degree program ID
  const studentProgramId = useMemo(() => {
    if (!student) return '';
    const prog = state.degreePrograms.find(p => p.name === student.program || p.id === student.program);
    return prog?.id ?? '';
  }, [state.degreePrograms, student]);

  const studentDegreeType = useMemo(() => {
    if (!student) return undefined;
    const prog = state.degreePrograms.find(p => p.name === student.program || p.id === student.program);
    return prog?.degreeType;
  }, [state.degreePrograms, student]);

  // Look up requirements: program-specific first, then college-level fallback
  const collegeReq = useMemo(() => {
    if (studentProgramId) {
      const progReq = state.graduationRequirements.find(r => r.programId === studentProgramId);
      if (progReq) return progReq;
    }
    return state.graduationRequirements.find(r => r.collegeId === studentCollegeId && !r.programId) ?? undefined;
  }, [state.graduationRequirements, studentProgramId, studentCollegeId]);

  // Build status map: courseId → { status, grade, termName }
  const statusMap = useMemo(() => {
    const map = new Map<string, { status: CourseStatus; grade?: string; termName?: string }>();

    // Only use grades from terms that still exist (guard against race-condition orphaned data)
    const existingTermIds = new Set(state.terms.map(t => t.id));

    state.grades
      .filter(g => g.studentId === student.id && existingTermIds.has(g.termId))
      .forEach(g => {
        const sec = state.sections.find(s => s.id === g.sectionId);
        if (!sec) return;
        const effective = (g.removalSubmitted && g.removalGrade) ? g.removalGrade : g.grade;
        if (!effective) return;
        const courseId = sec.courseId;
        const term = state.terms.find(t => t.id === sec.termId);
        const termName = term ? `${term.academicYear} ${term.semester}` : undefined;
        if (PASSING_GRADES.includes(effective as GradeValue)) {
          map.set(courseId, { status: 'passed', grade: effective, termName });
        } else if (['4', '5', 'F', 'U', 'INC'].includes(effective)) {
          if (!map.has(courseId) || map.get(courseId)?.status !== 'passed') {
            map.set(courseId, { status: 'failed', grade: effective, termName });
          }
        }
      });

    if (activeTerm) {
      state.enrollments
        .filter(e => e.studentId === student.id && e.termId === activeTerm.id && e.status !== 'dropped')
        .forEach(e => {
          const sec = state.sections.find(s => s.id === e.sectionId);
          if (!sec) return;
          const courseId = sec.courseId;
          if (!map.has(courseId) || map.get(courseId)?.status === 'not_taken') {
            map.set(courseId, { status: 'in_progress', termName: `${activeTerm.academicYear} ${activeTerm.semester}` });
          }
        });
    }

    return map;
  }, [state.grades, state.enrollments, state.sections, state.terms, student?.id, activeTerm]);

  const getStatus = (courseId: string): CourseStatus => statusMap.get(courseId)?.status ?? 'not_taken';
  const getTermName = (courseId: string): string | undefined => statusMap.get(courseId)?.termName;
  const getGrade = (courseId: string): string | undefined => statusMap.get(courseId)?.grade;

  const gradeColor = (grade?: string) => {
    if (!grade) return '';
    if (['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0','P','S'].includes(grade)) return 'text-emerald-700 font-bold';
    if (['5','F','U'].includes(grade)) return 'text-destructive font-bold';
    if (['4','INC'].includes(grade)) return 'text-orange-600 font-bold';
    return '';
  };

  // Courses student has enrolled in finalized terms, by category — for unit-based panels
  const studentCoursesByCategory = useMemo(() => {
    // Only consider terms that still exist
    const existingTermIds = new Set(state.terms.map(t => t.id));

    // Terms where this student finalized their enlistment (and term still exists)
    const finalizedTermIds = new Set(
      state.finalizedEnlistments
        .filter(f => f.studentId === student.id && existingTermIds.has(f.termId))
        .map(f => f.termId)
    );

    // Map: courseId → termId for non-dropped enrollments in finalized terms
    const finalizedCourseIds = new Set<string>();
    state.enrollments
      .filter(e => e.studentId === student.id && e.status !== 'dropped' && finalizedTermIds.has(e.termId))
      .forEach(e => {
        const sec = state.sections.find(s => s.id === e.sectionId);
        if (sec) finalizedCourseIds.add(sec.courseId);
      });

    const result = new Map<CourseCategory, Course[]>();
    const cats: CourseCategory[] = ['Elective GE', 'Specialized'];
    cats.forEach(cat => {
      result.set(cat, state.courses.filter(c => c.category === cat && finalizedCourseIds.has(c.id)));
    });
    return result;
  }, [state.finalizedEnlistments, state.enrollments, state.sections, state.courses, state.terms, student?.id]);

  // Fixed-list panels (GE, HK/PE (non-NSTP admin courses), Major, Thesis)
  const fixedPanels: { label: CourseCategory; courses: Course[]; maxCount?: number }[] = [
    {
      label: 'GE',
      courses: (globalReq?.requiredGeCourseIds ?? [])
        .map(id => state.courses.find(c => c.id === id)).filter(Boolean) as Course[],
    },
    {
      // Only HK/PE — NSTP is handled separately (student-chosen)
      label: 'HK/PE/NSTP',
      courses: (globalReq?.requiredHkPeNstpCourseIds ?? [])
        .map(id => state.courses.find(c => c.id === id))
        .filter((c): c is Course => Boolean(c) && !c.isNSTP),
    },
    {
      label: 'Major',
      courses: (collegeReq?.requiredMajorCourseIds ?? [])
        .map(id => state.courses.find(c => c.id === id)).filter(Boolean) as Course[],
      maxCount: collegeReq?.maxMajor || 0,
    },
    // Thesis: hidden for Associate/Certificate programs
    ...(studentDegreeType !== 'associate_certificate' ? [{
      label: 'Thesis' as CourseCategory,
      courses: (collegeReq?.requiredThesisCourseIds ?? [])
        .map(id => state.courses.find(c => c.id === id)).filter(Boolean) as Course[],
      maxCount: collegeReq?.maxThesis || 0,
    }] : []),
    // Seminar: shown for Bachelor's, Master's, Doctorate only if actually configured
    ...(studentDegreeType !== 'associate_certificate' && ((collegeReq?.requiredSeminarCourseIds?.length ?? 0) > 0 || (collegeReq?.maxSeminar ?? 0) > 0) ? [{
      label: 'Seminar' as CourseCategory,
      courses: (collegeReq?.requiredSeminarCourseIds ?? [])
        .map(id => state.courses.find(c => c.id === id)).filter(Boolean) as Course[],
      maxCount: collegeReq?.maxSeminar || 0,
    }] : []),
  ];

  // NSTP panel — student-chosen: any isNSTP courses they have enrolled/passed (need exactly 2, 6 units)
  const NSTP_REQUIRED = 2;
  const nstpCourses = useMemo(() => {
    const existingTermIds = new Set(state.terms.map(t => t.id));
    const seen = new Set<string>();
    // Collect from grades (any submitted grade for an NSTP course, in existing terms only)
    state.grades.filter(g => g.studentId === student.id && g.submitted && existingTermIds.has(g.termId)).forEach(g => {
      const sec = state.sections.find(s => s.id === g.sectionId);
      if (!sec) return;
      const c = state.courses.find(x => x.id === sec.courseId);
      if (c?.isNSTP) seen.add(c.id);
    });
    // Collect from active enrollments (in-progress)
    state.enrollments.filter(e => e.studentId === student.id && e.status !== 'dropped').forEach(e => {
      const sec = state.sections.find(s => s.id === e.sectionId);
      if (!sec) return;
      const c = state.courses.find(x => x.id === sec.courseId);
      if (c?.isNSTP) seen.add(c.id);
    });
    return [...seen].map(id => state.courses.find(c => c.id === id)).filter((c): c is Course => Boolean(c));
  }, [student?.id, state.grades, state.sections, state.courses, state.enrollments, state.terms]);

  // Program-specific AND college-level additional required courses (merged, deduplicated)
  const additionalGeCourses = useMemo(() => {
    // Only use the student's own program-specific additional required courses
    return (collegeReq?.requiredGeCourseIds ?? [])
      .map(id => state.courses.find(c => c.id === id))
      .filter((c): c is Course => Boolean(c));
  }, [collegeReq, state.courses]);

  // Unit-based free-choice panels (Elective GE, Specialized)
  const unitPanels: { label: CourseCategory; requiredUnits: number; courses: Course[] }[] = [
    // Elective GE: hidden for Associate/Certificate programs
    ...(studentDegreeType !== 'associate_certificate' ? [(() => {
      const approvedGe = (state.geElectiveRequests ?? []).find(
        r => r.studentId === student.id && r.status === 'approved'
      );
      const gePlanCourseIds = approvedGe?.courseIds ?? [];
      const gePlanCourses = gePlanCourseIds
        .map(id => state.courses.find(c => c.id === id))
        .filter((c): c is Course => Boolean(c));
      const enrolled = studentCoursesByCategory.get('Elective GE') ?? [];
      const enrolledIds = new Set(enrolled.map(c => c.id));
      const allGeCourses = [
        ...enrolled,
        ...gePlanCourses.filter(c => !enrolledIds.has(c.id)),
      ];
      return {
        label: 'Elective GE' as CourseCategory,
        requiredUnits: collegeReq?.maxElectiveGe ?? 0,
        courses: allGeCourses,
      };
    })()] : []),
    // Specialized/Specialization: hidden for Associate/Certificate programs
    ...(studentDegreeType !== 'associate_certificate' ? [(() => {
      const approvedSpec = (state.specializationRequests ?? []).find(
        r => r.studentId === student.id && r.status === 'approved'
      );
      const specPlanCourseIds = approvedSpec?.courseIds ?? [];
      const specPlanCourses = specPlanCourseIds
        .map(id => state.courses.find(c => c.id === id))
        .filter((c): c is Course => Boolean(c));
      const enrolled = studentCoursesByCategory.get('Specialized') ?? [];
      const enrolledIds = new Set(enrolled.map(c => c.id));
      const allSpecCourses = [
        ...enrolled,
        ...specPlanCourses.filter(c => !enrolledIds.has(c.id)),
      ];
      return {
        label: 'Specialized' as CourseCategory,
        requiredUnits: collegeReq?.maxSpecialized ?? 0,
        courses: allSpecCourses,
      };
    })()] : []),
  ];

  // Eligibility calculations
  const fixedEligibility = fixedPanels.map(p => {
    const effective = p.maxCount && p.maxCount > 0 ? p.maxCount : p.courses.length;
    const passed = p.courses.filter(c => getStatus(c.id) === 'passed').length;
    const passedUnits = p.courses
      .filter(c => getStatus(c.id) === 'passed')
      .reduce((s, c) => s + (c.units ?? 0) + (c.labUnits ?? 0), 0);
    // Required units = sum of the first `effective` courses in pool (best estimate when maxCount < pool)
    const totalUnits = p.courses.slice(0, effective).reduce((s, c) => s + (c.units ?? 0) + (c.labUnits ?? 0), 0);
    return { label: p.label, required: effective, passed, eligible: effective === 0 || passed >= effective, passedUnits, totalUnits };
  });

  // NSTP eligibility: student must pass exactly 2 NSTP courses (6 units)
  const nstpPassed = nstpCourses.filter(c => getStatus(c.id) === 'passed').length;
  const nstpPassedUnits = nstpCourses.filter(c => getStatus(c.id) === 'passed').reduce((s, c) => s + (c.units ?? 0), 0);
  const nstpTotalUnits = NSTP_REQUIRED * 3; // each NSTP course = 3 units
  const nstpEligible = nstpPassed >= NSTP_REQUIRED;

  // Additional GE eligibility
  const additionalGeRequired = additionalGeCourses.length;
  const additionalGePassed = additionalGeCourses.filter(c => getStatus(c.id) === 'passed').length;
  const additionalGePassedUnits = additionalGeCourses.filter(c => getStatus(c.id) === 'passed').reduce((s, c) => s + (c.units ?? 0), 0);
  const additionalGeTotalUnits = additionalGeCourses.reduce((s, c) => s + (c.units ?? 0), 0);
  const additionalGeEligibility = {
    required: additionalGeRequired,
    passed: additionalGePassed,
    passedUnits: additionalGePassedUnits,
    totalUnits: additionalGeTotalUnits,
    eligible: additionalGeRequired === 0 || additionalGePassed >= additionalGeRequired,
  };

  const unitEligibility = unitPanels.map(p => {
    const passedUnits = p.courses
      .filter(c => getStatus(c.id) === 'passed')
      .reduce((sum, c) => sum + (c.units ?? 0), 0);
    return {
      label: p.label,
      requiredUnits: p.requiredUnits,
      passedUnits,
      eligible: p.requiredUnits === 0 || passedUnits >= p.requiredUnits,
    };
  });

  const allEligibility = [
    ...fixedEligibility.map(e => e.eligible),
    additionalGeEligibility.eligible,
    nstpEligible,
    ...unitEligibility.map(e => e.eligible),
  ];
  const isEligible = allEligibility.every(Boolean) && (fixedEligibility.some(e => e.required > 0) || additionalGeEligibility.required > 0 || unitEligibility.some(e => e.requiredUnits > 0));
  const hasRequirements = fixedEligibility.some(e => e.required > 0) || additionalGeEligibility.required > 0 || unitEligibility.some(e => e.requiredUnits > 0);

  // All explicitly listed required courses (for flowchart) — derived directly from requirements
  // Also includes approved specialization and GE elective plan courses
  const allFlowchartCourses = useMemo(() => {
    const approvedSpec = (state.specializationRequests ?? []).find(
      r => r.studentId === student.id && r.status === 'approved'
    );
    const approvedGeElective = (state.geElectiveRequests ?? []).find(
      r => r.studentId === student.id && r.status === 'approved'
    );
    const allIds = [
      ...(globalReq?.requiredGeCourseIds ?? []),
      // HK/PE only (non-NSTP admin-set courses)
      ...(globalReq?.requiredHkPeNstpCourseIds ?? []).filter(id => {
        const c = state.courses.find(x => x.id === id);
        return c && !c.isNSTP;
      }),
      // Student's own NSTP courses
      ...nstpCourses.map(c => c.id),
      ...(collegeReq?.requiredMajorCourseIds ?? []),
      ...(collegeReq?.requiredThesisCourseIds ?? []),
      ...(collegeReq?.requiredSeminarCourseIds ?? []),
      ...(collegeReq?.requiredGeCourseIds ?? []).filter(
        id => !(globalReq?.requiredGeCourseIds ?? []).includes(id)
      ),
      // Approved specialization courses appear in the flowchart
      ...(approvedSpec?.courseIds ?? []),
      // Approved GE Elective courses appear in the flowchart
      ...(approvedGeElective?.courseIds ?? []),
    ];
    const seen = new Set<string>();
    return allIds
      .filter(id => { if (seen.has(id)) return false; seen.add(id); return true; })
      .map(id => state.courses.find(c => c.id === id))
      .filter((c): c is Course => Boolean(c));
  }, [globalReq, collegeReq, state.courses, state.specializationRequests, state.geElectiveRequests, student?.id, nstpCourses]);

  const totalRequired = fixedEligibility.reduce((s, e) => s + e.required, 0) + additionalGeEligibility.required + NSTP_REQUIRED;
  const totalPassed = fixedEligibility.reduce((s, e) => s + Math.min(e.passed, e.required), 0) + Math.min(additionalGeEligibility.passed, additionalGeEligibility.required) + Math.min(nstpPassed, NSTP_REQUIRED);
  const totalRequiredUnits = unitEligibility.reduce((s, e) => s + e.requiredUnits, 0);
  const totalPassedUnits = unitEligibility.reduce((s, e) => s + Math.min(e.passedUnits, e.requiredUnits), 0);

  // Resolve display names for certificate
  const collegeName = useMemo(() => {
    const c = state.colleges.find(col => col.id === studentCollegeId);
    return c?.name ?? student.college ?? '';
  }, [state.colleges, studentCollegeId, student]);

  const programName = useMemo(() => {
    const prog = state.degreePrograms.find(p => p.id === student.program || p.name === student.program || p.abbreviation === student.program);
    return prog?.name ?? student.program ?? '';
  }, [state.degreePrograms, student]);

  const degreeLabel = useMemo(() => {
    if (!studentDegreeType) return null;
    if (studentDegreeType === 'bachelors') return "Bachelor's Degree";
    if (studentDegreeType === 'masters') return "Master's Degree";
    if (studentDegreeType === 'doctorate') return 'Doctorate';
    if (studentDegreeType === 'associate_certificate') return 'Associate / Certificate';
    return null;
  }, [studentDegreeType]);

  const institutionName = state.portalSettings.institutionName || state.portalSettings.portalName || 'University';

  // ── Honors / Awardee Eligibility ──────────────────────────────────────────
  // Show only when student has completed all POS requirements (isEligible)
  const { gwa: overallGWA } = computeGWA(student.id);

  /**
   * A student has "unexcused underload" in a term if they enrolled in fewer than
   * 15 academic units (PE/NSTP excluded) without an approved underload permit.
   * Any such term disqualifies them from laudes AND from the Faculty Award.
   * For Associate / Certificate programs, Mid-Term semesters are excluded from
   * the underload check (only 1st and 2nd semester underload matters).
   */
  const hasUnexcusedUnderload = useMemo(() => {
    if (!isEligible || overallGWA <= 0) return false;
    // Collect all terms the student was officially enrolled in
    const enrolledTermIds = new Set<string>([
      ...state.enrollments
        .filter(e => e.studentId === student.id && e.status !== 'dropped')
        .map(e => e.termId),
    ]);
    for (const termId of enrolledTermIds) {
      const term = state.terms.find(t => t.id === termId);
      // For Associate / Certificate: Mid-Term semesters are exempt from underload checks
      if (studentDegreeType === 'associate_certificate' && term?.semester === 'Mid-Term') continue;
      // Sum academic units for non-dropped enrollments in this term
      const termEnrollments = state.enrollments.filter(
        e => e.studentId === student.id && e.termId === termId && e.status !== 'dropped'
      );
      let academicUnits = 0;
      for (const enr of termEnrollments) {
        const sec = state.sections.find(s => s.id === enr.sectionId);
        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
        if (!course || course.isPE || course.isNSTP) continue;
        academicUnits += course.units + (course.labUnits ?? 0);
      }
      // "Underload" = enrolled in fewer than 15 academic units in a regular term
      if (academicUnits > 0 && academicUnits < 15) {
        const hasPermit = (state.underloadApplications ?? []).some(
          u => u.studentId === student.id && u.termId === termId && u.status === 'approved'
        );
        if (!hasPermit) return true; // Unexcused underload found — disqualified
      }
    }
    return false;
  }, [isEligible, overallGWA, studentDegreeType, state.enrollments, state.sections, state.courses, state.underloadApplications, state.terms, student?.id]);

  const honorEligible = isEligible && overallGWA > 0 && !hasUnexcusedUnderload;

  /**
   * For Associate / Certificate programs: no laudes — instead "Awardee" for GWA 1.0–1.75.
   * For Bachelor's / Master's / Doctorate: standard Latin Honors.
   */
  const latinHonor = honorEligible
    ? studentDegreeType === 'associate_certificate'
      ? (overallGWA <= 1.75 ? 'Awardee' : null)
      : (overallGWA <= 1.25 ? 'Summa Cum Laude' : overallGWA <= 1.5 ? 'Magna Cum Laude' : overallGWA <= 1.75 ? 'Cum Laude' : null)
    : null;

  /** Full award title shown in banner and certificate — program-specific for associates. */
  const awardDisplayName = latinHonor === 'Awardee'
    ? `Faculty Award for Academic Excellence${programName ? ` in ${programName}` : ''}`
    : latinHonor;

  // My graduation application
  const myApp = (state.graduationApplications ?? []).find(a => a.studentId === student.id);

  const handleApply = async () => {
    setApplying(true);
    await submitGraduationApplication(student.id, studentCollegeId, student.program, myApp?.id, activeTerm?.id);
    toast.success(myApp ? 'Application re-submitted for OCS review.' : 'Application for graduation submitted.');
    setApplying(false);
  };

  // All grade history per course (for print — includes retakes)
  const gradeHistory = useMemo(() => {
    const existingTermIds = new Set(state.terms.map(t => t.id));
    const map = new Map<string, Array<{ termName: string; grade: string }>>();
    state.grades
      .filter(g => g.studentId === student.id && existingTermIds.has(g.termId))
      .forEach(g => {
        const sec = state.sections.find(s => s.id === g.sectionId);
        if (!sec) return;
        const effective = (g.removalSubmitted && g.removalGrade) ? g.removalGrade : g.grade;
        if (!effective) return;
        const term = state.terms.find(t => t.id === sec.termId);
        const termName = term ? `${term.academicYear} ${term.semester}` : '—';
        const arr = map.get(sec.courseId) ?? [];
        arr.push({ termName, grade: effective });
        map.set(sec.courseId, arr);
      });
    return map;
  }, [state.grades, state.sections, state.terms, student?.id]);

  const handlePrintApplication = () => {
    const approvedBy = state.users.find(u => u.id === myApp?.processedBy)?.name ?? 'OCS';
    const approvedAt = myApp?.processedAt ? new Date(myApp.processedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const logoUrl = state.portalSettings?.logoUrl ?? '';
    const dateGenerated = new Date().toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    const allCoursePanels = [
      { title: 'General Education', courses: fixedPanels.find(p => p.label === 'GE')?.courses ?? [] },
      { title: 'HK/PE', courses: fixedPanels.find(p => p.label === 'HK/PE/NSTP')?.courses ?? [] },
      { title: 'NSTP', courses: nstpCourses },
      { title: 'Major Courses', courses: fixedPanels.find(p => p.label === 'Major')?.courses ?? [] },
      { title: 'Thesis', courses: fixedPanels.find(p => p.label === 'Thesis')?.courses ?? [] },
      { title: 'Seminar Courses', courses: fixedPanels.find(p => p.label === 'Seminar')?.courses ?? [] },
      { title: 'Elective General Education', courses: unitPanels.find(p => p.label === 'Elective GE')?.courses ?? [] },
      { title: 'Specialized Courses', courses: unitPanels.find(p => p.label === 'Specialized')?.courses ?? [] },
    ];

    const gradeColor = (g: string) => {
      if (g === '5' || g === 'F') return '#c00';
      if (g === '4' || g === 'INC') return '#b05000';
      if (['1.0','1.25','1.5','1.75','2.0','2.25','2.5','2.75','3.0'].includes(g)) return '#005500';
      return '#333';
    };

    const tableBlocks = allCoursePanels.flatMap(panel => {
      if (panel.courses.length === 0) return [];
      const courseRows = panel.courses.flatMap(course => {
        const attempts = gradeHistory.get(course.id) ?? [];
        if (attempts.length === 0) {
          return [`<tr><td style="padding:4px 8px;border:1px solid #ddd;font-size:11px">${course.code}</td><td style="padding:4px 8px;border:1px solid #ddd;font-size:11px">${course.title}</td><td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">${course.units}</td><td style="padding:4px 8px;border:1px solid #ddd;font-size:11px">—</td><td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center;color:#aaa">—</td></tr>`];
        }
        return attempts.map((a, i) => `<tr>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px">${i === 0 ? course.code : ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;${i > 0 ? 'color:#888;font-style:italic;padding-left:16px' : ''}">${i === 0 ? course.title : '↳ Retake ' + i}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">${i === 0 ? course.units : ''}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;color:#444">${a.termName}</td>
          <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center;font-weight:bold;color:${gradeColor(a.grade)}">${a.grade}</td>
        </tr>`);
      }).join('');
      return [`
        <h3 style="margin:14px 0 4px;font-size:13px;color:#444">${panel.title}</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:4px">
          <thead><tr style="background:#e5e7eb">
            <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:left">Code</th>
            <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:left">Course Title</th>
            <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">Units</th>
            <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:left">Term</th>
            <th style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:center">Grade</th>
          </tr></thead>
          <tbody>${courseRows || '<tr><td colspan="5" style="text-align:center;padding:8px;color:#999">No records</td></tr>'}</tbody>
        </table>`];
    }).join('');

    const win = window.open('', '_blank', 'width=900,height=750');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Application for Graduation – ${student.name}</title>
  <style>* { margin:0; padding:0; box-sizing:border-box; } body { font-family:Arial,sans-serif; padding:24px; color:#111; } h2 { margin-bottom:2px; } @media print { @page { margin:20mm } }</style>
</head>
<body>
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="width:64px;height:64px;object-fit:contain;flex-shrink:0" />` : ''}
    <div style="flex:1;text-align:center">
      <div style="font-size:15px;font-weight:bold;color:#111;text-transform:uppercase;letter-spacing:0.04em">${institutionName}</div>
      <div style="font-size:13px;color:#555;margin-top:2px;letter-spacing:0.08em;text-transform:uppercase">Application for Graduation</div>
    </div>
    ${logoUrl ? `<div style="width:64px;flex-shrink:0"></div>` : ''}
  </div>
  <hr style="margin:0 0 12px">
  <h2>${student.name}</h2>
  <p style="color:#555;font-size:12px;margin-bottom:4px">
    Student No: <strong>${student.studentNumber ?? '—'}</strong> &nbsp;|&nbsp;
    Program: <strong>${programName}</strong> &nbsp;|&nbsp;
    College: <strong>${collegeName}</strong>
  </p>
  <p style="color:#555;font-size:12px;margin-bottom:4px">
    Date Applied: <strong>${new Date(myApp?.submittedAt ?? '').toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })}</strong> &nbsp;|&nbsp;
    Status: <strong style="color:#005500">Approved</strong>
  </p>
  <hr style="margin:12px 0">
  ${tableBlocks || '<p style="color:#999">No course records found.</p>'}
  <div style="margin-top:12px;padding:10px 14px;background:#f3f4f6;border:1px solid #ddd;border-radius:4px;font-size:12px;display:flex;justify-content:space-between;align-items:flex-end">
    <div>
      <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Approved by</div>
      <div style="font-weight:700;font-size:13px;border-top:1px solid #555;padding-top:4px;margin-top:24px">${approvedBy}</div>
      <div style="font-size:11px;color:#555">OCS · Approved on ${approvedAt}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Student</div>
      <div style="font-weight:700;font-size:13px;border-top:1px solid #555;padding-top:4px;margin-top:24px">${student.name}</div>
      <div style="font-size:11px;color:#555">Signature over Printed Name</div>
    </div>
  </div>
  <div style="margin-top:8px;padding:6px 10px;background:#fffbea;border:1px solid #e5e7eb;border-radius:4px;font-size:10px;color:#555;line-height:1.5">
    This document is computer-generated. &bull; Date Generated: ${dateGenerated}
  </div>
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handlePrintHonorsLetter = () => {
    if (!latinHonor) return;
    const win = window.open('', '_blank', 'width=860,height=700');
    if (!win) return;
    const isAwardee = latinHonor === 'Awardee';
    const honorDesc = isAwardee
      ? 'the Faculty Award for Academic Excellence, conferred upon graduates who have maintained an outstanding grade point average throughout their program without any unexcused underload in regular semesters'
      : latinHonor === 'Summa Cum Laude'
      ? 'the highest academic distinction, reserved for students of exceptional scholastic excellence'
      : latinHonor === 'Magna Cum Laude'
      ? 'a distinction for outstanding academic performance throughout the academic career'
      : 'a distinction for commendable academic achievement during the course of studies';
    const honorTitle = isAwardee ? 'Faculty Award for Academic Excellence' : 'Latin Honors Recognition';
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${isAwardee ? awardDisplayName : 'Latin Honors'} – ${student.name}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Georgia, serif; color:#111; background:#fff; }
    .cover { background: linear-gradient(135deg, #5e1422 0%, #1a4f37 100%); padding: 56px 64px; min-height: 320px; display:flex; flex-direction:column; justify-content:space-between; }
    .cover-top { display:flex; flex-direction:column; gap:8px; }
    .inst { font-size:13px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:rgba(255,255,255,0.75); }
    .honor-title { font-size:42px; font-weight:700; color:#fff; line-height:1.1; margin-top:8px; }
    .honor-badge { display:inline-block; background:rgba(255,215,0,0.2); border:1.5px solid rgba(255,215,0,0.6); color:#FFD700; font-size:20px; font-weight:700; padding:8px 20px; border-radius:6px; margin-top:16px; letter-spacing:.04em; }
    .cover-bottom { color:rgba(255,255,255,0.5); font-size:11px; letter-spacing:.06em; text-transform:uppercase; margin-top:32px; }
    .body { padding: 48px 64px; }
    .salutation { font-size:16px; margin-bottom:20px; }
    .body p { font-size:13px; line-height:1.8; color:#333; margin-bottom:14px; }
    .gwa-box { border:1px solid #ddd; border-radius:4px; padding:16px 20px; margin:24px 0; display:flex; gap:40px; background:#fafafa; }
    .gwa-item label { font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:#888; display:block; margin-bottom:4px; }
    .gwa-item value { font-size:22px; font-weight:700; color:#5e1422; display:block; }
    .sign-section { margin-top:40px; display:flex; justify-content:space-between; border-top:2px solid #5e1422; padding-top:20px; }
    .sig-block { font-size:12px; }
    .sig-name { font-weight:700; font-size:13px; border-top:1px solid #555; padding-top:4px; margin-top:28px; }
    .footer { text-align:center; font-size:10px; color:#aaa; margin-top:32px; border-top:1px solid #eee; padding-top:12px; }
    @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
  </style>
</head>
<body>
  <div class="cover">
    <div class="cover-top">
      <div class="inst">${institutionName}</div>
      <div class="honor-title">Congratulations,<br/>${student.name}!</div>
      <div class="honor-badge">${awardDisplayName}</div>
    </div>
    <div class="cover-bottom">Office of the College Secretary &bull; ${honorTitle}</div>
  </div>
  <div class="body">
    <p class="salutation">Dear ${student.name},</p>
    <p>
      On behalf of <strong>${institutionName}</strong>, it is with great honor and pride that we congratulate you for achieving
      <strong>${awardDisplayName}</strong> — ${honorDesc}.
    </p>
    <p>
      Your dedication, perseverance, and academic excellence throughout your academic career have made you one of the most
      distinguished students of your batch. This recognition is a testament to your hard work and commitment to scholastic achievement.
    </p>
    <div class="gwa-box">
      <div class="gwa-item"><label>Cumulative GWA</label><value>${overallGWA.toFixed(2)}</value></div>
      <div class="gwa-item"><label>${isAwardee ? 'Distinction' : 'Honor'}</label><value style="font-size:13px;line-height:1.3">${awardDisplayName}</value></div>
      ${programName ? `<div class="gwa-item"><label>Program</label><value style="font-size:14px;">${programName}</value></div>` : ''}
    </div>
    <p>
      We wish you continued success in all your future endeavors. May this honor inspire you to strive for greater heights in
      all aspects of your life.
    </p>
    <div class="sign-section">
      <div class="sig-block">
        <div class="sig-name">Office of the College Secretary</div>
        <div>${institutionName}</div>
      </div>
      <div class="sig-block" style="text-align:right">
        <div class="sig-name">${student.name}</div>
        <div>${student.studentNumber ?? '—'}</div>
      </div>
    </div>
    <div class="footer">Generated from the Academic Information System &bull; ${institutionName} &bull; ${new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })}</div>
  </div>
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handlePrintChecklist = () => {
    const logoUrl = state.portalSettings?.logoUrl ?? '';
    const dateGenerated = new Date().toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    // ─────────────────────────────────────────────────────────────────────────

    const checkIcon = (status: CourseStatus) => {
      if (status === 'passed')      return `<span style="color:#15803d;font-size:14px;font-weight:700">&#10003;</span>`;
      if (status === 'in_progress') return `<span style="color:#2563eb;font-size:12px;font-weight:700">&#9679;</span>`;
      if (status === 'failed')      return `<span style="color:#dc2626;font-size:13px;font-weight:700">&#10007;</span>`;
      return `<span style="color:#94a3b8;font-size:13px">&#9744;</span>`;
    };

    const statusLabel = (status: CourseStatus) => {
      if (status === 'passed')      return `<span style="background:#dcfce7;color:#15803d;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">Passed</span>`;
      if (status === 'in_progress') return `<span style="background:#dbeafe;color:#1d4ed8;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">In Progress</span>`;
      if (status === 'failed')      return `<span style="background:#fee2e2;color:#b91c1c;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">Failed</span>`;
      return `<span style="background:#f1f5f9;color:#64748b;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Not Taken</span>`;
    };

    // ── Requirement helpers ───────────────────────────────────────────────────
    const resolveReqIds = (ids?: string[][] | string[]): string[] => {
      if (!ids || ids.length === 0) return [];
      const flat: string[] = (ids as (string | string[])[]).reduce<string[]>((acc, v) =>
        Array.isArray(v) ? [...acc, ...v] : [...acc, v], []);
      return flat.map(id => {
        const found = state.courses.find(x => x.id === id);
        return found ? found.code : null;
      }).filter(Boolean) as string[];
    };

    const buildPanel = (title: string, courses: Course[], note?: string) => {
      if (courses.length === 0) return '';
      const rows = courses.map(c => {
        const status = getStatus(c.id);
        const term = getTermName(c.id) ?? '—';

        // ── Build requirement tags ───────────────────────────────────────────
        const prereqCodes = resolveReqIds(c.prerequisites);
        const coreqCodes  = resolveReqIds(c.corequisites);
        const reqTags: string[] = [];
        if (prereqCodes.length)           reqTags.push(`<span style="background:#f0fdf4;color:#166534;border:1px solid #86efac;padding:1px 5px;border-radius:3px;font-size:8px;white-space:nowrap">Pre-req: ${prereqCodes.join(' / ')}</span>`);
        if (coreqCodes.length)            reqTags.push(`<span style="background:#eff6ff;color:#1e40af;border:1px solid #93c5fd;padding:1px 5px;border-radius:3px;font-size:8px;white-space:nowrap">Co-req: ${coreqCodes.join(' / ')}</span>`);
        if (c.minUnitsRequired)           reqTags.push(`<span style="background:#fafafa;color:#374151;border:1px solid #d1d5db;padding:1px 5px;border-radius:3px;font-size:8px;white-space:nowrap">Min ${c.minUnitsRequired} units passed</span>`);
        if (c.minYearStanding)            reqTags.push(`<span style="background:#fafafa;color:#374151;border:1px solid #d1d5db;padding:1px 5px;border-radius:3px;font-size:8px;white-space:nowrap">Min standing: ${c.minYearStanding}</span>`);
        if (c.requiresCOI)                reqTags.push(`<span style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;padding:1px 5px;border-radius:3px;font-size:8px;white-space:nowrap">COI Required</span>`);
        if (c.requiresDeptConsent)        reqTags.push(`<span style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;padding:1px 5px;border-radius:3px;font-size:8px;white-space:nowrap">Dept Consent Required</span>`);
        if (c.requiresOCSConsent)         reqTags.push(`<span style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;padding:1px 5px;border-radius:3px;font-size:8px;white-space:nowrap">OCS Consent Required</span>`);
        if (c.coiIfUnsatisfied && !c.requiresCOI)           reqTags.push(`<span style="background:#fff7ed;color:#9a3412;border:1px dashed #fb923c;padding:1px 5px;border-radius:3px;font-size:8px;white-space:nowrap">COI if prereq/co-req unmet</span>`);
        if (c.deptConsentIfUnsatisfied && !c.requiresDeptConsent) reqTags.push(`<span style="background:#fff7ed;color:#9a3412;border:1px dashed #fb923c;padding:1px 5px;border-radius:3px;font-size:8px;white-space:nowrap">Dept Consent if prereq/co-req unmet</span>`);
        if (c.ocsConsentIfUnsatisfied && !c.requiresOCSConsent)   reqTags.push(`<span style="background:#fff7ed;color:#9a3412;border:1px dashed #fb923c;padding:1px 5px;border-radius:3px;font-size:8px;white-space:nowrap">OCS Consent if prereq/co-req unmet</span>`);

        const reqRow = reqTags.length > 0
          ? `<tr><td colspan="6" style="padding:2px 8px 5px 30px;border:1px solid #e2e8f0;border-top:none;background:#fafafa"><div style="display:flex;flex-wrap:wrap;gap:3px">${reqTags.join('')}</div></td></tr>`
          : '';

        return `<tr>
          <td style="padding:4px 6px;border:1px solid #e2e8f0;text-align:center;width:24px">${checkIcon(status)}</td>
          <td style="padding:4px 8px;border:1px solid #e2e8f0;font-family:monospace;font-weight:700;font-size:10px;color:#5b1a2a;white-space:nowrap">${c.code}</td>
          <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px;color:#111">${c.title}</td>
          <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px;text-align:center;color:#374151">${c.units}${c.labUnits ? `+${c.labUnits}` : ''}</td>
          <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px;color:#555">${term}</td>
          <td style="padding:4px 8px;border:1px solid #e2e8f0">${statusLabel(status)}</td>
        </tr>${reqRow}`;
      }).join('');
      return `
        <div style="margin-bottom:16px">
          <div style="background:linear-gradient(90deg,#5b1a2a,#1a4f37);padding:6px 12px;border-radius:4px 4px 0 0;display:flex;align-items:center;justify-content:space-between">
            <span style="color:#fff;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.06em">${title}</span>
            ${note ? `<span style="color:rgba(255,255,255,0.7);font-size:9px">${note}</span>` : ''}
          </div>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#f8fafc">
                <th style="padding:4px 6px;border:1px solid #e2e8f0;font-size:9px;color:#64748b;text-align:center;width:24px"></th>
                <th style="padding:4px 8px;border:1px solid #e2e8f0;font-size:9px;color:#64748b;text-align:left">Code</th>
                <th style="padding:4px 8px;border:1px solid #e2e8f0;font-size:9px;color:#64748b;text-align:left">Course Title</th>
                <th style="padding:4px 8px;border:1px solid #e2e8f0;font-size:9px;color:#64748b;text-align:center">Units</th>
                <th style="padding:4px 8px;border:1px solid #e2e8f0;font-size:9px;color:#64748b;text-align:left">Term</th>
                <th style="padding:4px 8px;border:1px solid #e2e8f0;font-size:9px;color:#64748b;text-align:center">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    };

    const allPanels = [
      buildPanel('General Education', fixedPanels.find(p => p.label === 'GE')?.courses ?? []),
      buildPanel('HK / PE', fixedPanels.find(p => p.label === 'HK/PE/NSTP')?.courses ?? []),
      buildPanel('NSTP (National Service Training Program)', nstpCourses, 'Must complete 2 courses (6 units)'),
      buildPanel('Major Courses', fixedPanels.find(p => p.label === 'Major')?.courses ?? []),
      buildPanel('Thesis', fixedPanels.find(p => p.label === 'Thesis')?.courses ?? []),
      buildPanel('Seminar Courses', fixedPanels.find(p => p.label === 'Seminar')?.courses ?? []),
      buildPanel('Additional Required Courses', additionalGeCourses),
      buildPanel(`Elective General Education (${unitEligibility.find(e => e.label === 'Elective GE')?.passedUnits ?? 0}/${unitEligibility.find(e => e.label === 'Elective GE')?.requiredUnits ?? 0} units)`, unitPanels.find(p => p.label === 'Elective GE')?.courses ?? [], 'Student-chosen'),
      buildPanel(`Specialized Courses (${unitEligibility.find(e => e.label === 'Specialized')?.passedUnits ?? 0}/${unitEligibility.find(e => e.label === 'Specialized')?.requiredUnits ?? 0} units)`, unitPanels.find(p => p.label === 'Specialized')?.courses ?? [], 'Student-chosen'),
    ].filter(Boolean).join('');

    const eligibilityBar = isEligible
      ? `<div style="background:#dcfce7;border:1px solid #16a34a;border-radius:6px;padding:8px 12px;margin-bottom:16px;display:flex;align-items:center;gap:8px"><span style="color:#15803d;font-weight:700;font-size:11px">&#10003; ELIGIBLE TO GRADUATE</span><span style="color:#166534;font-size:10px">— All requirements fulfilled</span></div>`
      : `<div style="background:#fefce8;border:1px solid #ca8a04;border-radius:6px;padding:8px 12px;margin-bottom:16px"><span style="color:#92400e;font-weight:700;font-size:11px">&#9888; NOT YET ELIGIBLE TO GRADUATE</span><span style="color:#78350f;font-size:10px"> — ${totalPassed}/${totalRequired} required courses passed</span></div>`;

    const win = window.open('', '_blank', 'width=900,height=750');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Plan of Study Checklist – ${student.name}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; color:#111; background:#fff; }
    @media print {
      @page { margin: 15mm 18mm; size: A4 portrait; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body style="padding:0">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#5b1a2a 0%,#1a4f37 100%);padding:20px 28px;display:flex;align-items:center;gap:16px">
    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="width:56px;height:56px;object-fit:contain;background:#fff;border-radius:6px;padding:3px;flex-shrink:0" crossorigin="anonymous"/>` : ''}
    <div style="flex:1;text-align:center">
      <div style="font-size:14px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.08em">${institutionName}</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.75);margin-top:3px;letter-spacing:.1em;text-transform:uppercase">Office of the College Secretary</div>
      <div style="font-size:16px;font-weight:800;color:#FFD700;margin-top:6px;letter-spacing:.04em;text-transform:uppercase">Plan of Study Checklist</div>
    </div>
    ${logoUrl ? `<div style="width:56px;flex-shrink:0"></div>` : ''}
  </div>

  <!-- Student Info -->
  <div style="border-bottom:3px solid #5b1a2a;padding:12px 28px;background:#fafafa;display:flex;justify-content:space-between;align-items:flex-end">
    <div>
      <div style="font-size:16px;font-weight:700;color:#111">${student.name}</div>
      <div style="font-size:11px;color:#555;margin-top:2px">
        Student No: <strong>${student.studentNumber ?? '—'}</strong>&nbsp;&nbsp;|&nbsp;&nbsp;
        Program: <strong>${programName}</strong>&nbsp;&nbsp;|&nbsp;&nbsp;
        College: <strong>${collegeName}</strong>
      </div>
    </div>
    <div style="text-align:right;font-size:10px;color:#777">
      <div>Date Generated:</div>
      <div style="font-weight:600;color:#333">${dateGenerated}</div>
    </div>
  </div>

  <div style="padding:16px 28px">
    ${eligibilityBar}

    <!-- Summary Stats -->
    <div style="display:flex;gap:12px;margin-bottom:16px">
      <div style="flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;text-align:center">
        <div style="font-size:20px;font-weight:800;color:#5b1a2a">${totalPassed}<span style="font-size:13px;color:#888">/${totalRequired}</span></div>
        <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Courses Passed</div>
      </div>
      ${totalRequiredUnits > 0 ? `<div style="flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;text-align:center">
        <div style="font-size:20px;font-weight:800;color:#1a4f37">${totalPassedUnits}<span style="font-size:13px;color:#888">/${totalRequiredUnits}</span></div>
        <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Elective Units</div>
      </div>` : ''}
      ${overallGWA > 0 ? `<div style="flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;text-align:center">
        <div style="font-size:20px;font-weight:800;color:#374151">${overallGWA.toFixed(2)}</div>
        <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Cumulative GWA</div>
      </div>` : ''}
      ${latinHonor ? `<div style="flex:1;border:1px solid #fcd34d;background:#fffbeb;border-radius:6px;padding:8px 12px;text-align:center">
        <div style="font-size:10px;font-weight:800;color:#92400e;line-height:1.3">${awardDisplayName}</div>
        <div style="font-size:9px;color:#78350f;text-transform:uppercase;letter-spacing:.06em">${latinHonor === 'Awardee' ? 'Faculty Award' : 'Latin Honors'}</div>
      </div>` : ''}
    </div>

    <!-- Legend -->
    <div style="display:flex;gap:16px;margin-bottom:14px;padding:6px 10px;background:#f8fafc;border-radius:4px;font-size:9px;color:#555;flex-wrap:wrap">
      <span><span style="color:#15803d;font-weight:700">&#10003;</span> Passed</span>
      <span><span style="color:#2563eb">&#9679;</span> In Progress</span>
      <span><span style="color:#dc2626">&#10007;</span> Failed</span>
      <span><span style="color:#94a3b8">&#9744;</span> Not Taken</span>
      <span style="margin-left:8px;border-left:1px solid #cbd5e1;padding-left:8px"><span style="background:#f0fdf4;color:#166534;border:1px solid #86efac;padding:1px 5px;border-radius:3px;font-size:8px">Pre-req</span></span>
      <span><span style="background:#eff6ff;color:#1e40af;border:1px solid #93c5fd;padding:1px 5px;border-radius:3px;font-size:8px">Co-req</span></span>
      <span><span style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;padding:1px 5px;border-radius:3px;font-size:8px">Consent Required</span></span>
      <span><span style="background:#fff7ed;color:#9a3412;border:1px dashed #fb923c;padding:1px 5px;border-radius:3px;font-size:8px">Conditional Consent</span></span>
    </div>

    ${allPanels || '<p style="color:#999;text-align:center;padding:24px">No course requirements configured.</p>'}

    <!-- Signature -->
    <div style="margin-top:20px;padding-top:14px;border-top:2px solid #5b1a2a;display:flex;justify-content:space-between">
      <div style="font-size:11px">
        <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:20px">Noted by</div>
        <div style="border-top:1px solid #555;padding-top:4px;font-weight:700;font-size:12px">OCS / Registrar</div>
        <div style="font-size:10px;color:#555">Office of the College Secretary</div>
      </div>
      <div style="font-size:11px;text-align:right">
        <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:20px">Student Signature</div>
        <div style="border-top:1px solid #555;padding-top:4px;font-weight:700;font-size:12px">${student.name}</div>
        <div style="font-size:10px;color:#555">${student.studentNumber ?? ''} · ${programName}</div>
      </div>
    </div>

    <div style="margin-top:10px;font-size:9px;color:#aaa;text-align:center;border-top:1px solid #f0f0f0;padding-top:8px">
      This is a computer-generated Plan of Study Checklist. &bull; ${institutionName} &bull; ${dateGenerated}
    </div>
  </div>
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  function CourseRow({ course, className }: { course: Course; className?: string }) {
    const status = getStatus(course.id);
    const termName = getTermName(course.id);

    // Resolve prerequisite / co-requisite IDs → course codes
    const resolveIds = (ids?: string[][] | string[]): string[] => {
      if (!ids || ids.length === 0) return [];
      const flat = (ids as (string | string[])[]).reduce<string[]>(
        (acc, v) => Array.isArray(v) ? [...acc, ...v] : [...acc, v], []
      );
      return flat.map(id => state.courses.find(x => x.id === id)?.code ?? null).filter(Boolean) as string[];
    };

    const prereqCodes = resolveIds(course.prerequisites);
    const coreqCodes  = resolveIds(course.corequisites);

    const reqItems: React.ReactNode[] = [];
    if (prereqCodes.length)
      reqItems.push(<span key="pre" className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 rounded px-1.5 py-0.5 font-medium">Pre-req: {prereqCodes.join(' / ')}</span>);
    if (coreqCodes.length)
      reqItems.push(<span key="co" className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-800 border border-blue-300 rounded px-1.5 py-0.5 font-medium">Co-req: {coreqCodes.join(' / ')}</span>);
    if (course.minUnitsRequired)
      reqItems.push(<span key="units" className="inline-flex items-center gap-1 text-[10px] bg-muted text-muted-foreground border border-border rounded px-1.5 py-0.5">Min {course.minUnitsRequired} units passed</span>);
    if (course.minYearStanding)
      reqItems.push(<span key="standing" className="inline-flex items-center gap-1 text-[10px] bg-muted text-muted-foreground border border-border rounded px-1.5 py-0.5">Min standing: {course.minYearStanding}</span>);
    if (course.requiresCOI)
      reqItems.push(<span key="coi" className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 border border-amber-300 rounded px-1.5 py-0.5">COI Required</span>);
    if (course.requiresDeptConsent)
      reqItems.push(<span key="dept" className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 border border-amber-300 rounded px-1.5 py-0.5">Dept Consent Required</span>);
    if (course.requiresOCSConsent)
      reqItems.push(<span key="ocs" className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 border border-amber-300 rounded px-1.5 py-0.5">OCS Consent Required</span>);
    if (course.coiIfUnsatisfied && !course.requiresCOI)
      reqItems.push(<span key="coiif" className="inline-flex items-center gap-1 text-[10px] bg-orange-50 text-orange-800 border border-dashed border-orange-400 rounded px-1.5 py-0.5">COI if prereq/co-req unmet</span>);
    if (course.deptConsentIfUnsatisfied && !course.requiresDeptConsent)
      reqItems.push(<span key="deptif" className="inline-flex items-center gap-1 text-[10px] bg-orange-50 text-orange-800 border border-dashed border-orange-400 rounded px-1.5 py-0.5">Dept Consent if prereq/co-req unmet</span>);
    if (course.ocsConsentIfUnsatisfied && !course.requiresOCSConsent)
      reqItems.push(<span key="ocsif" className="inline-flex items-center gap-1 text-[10px] bg-orange-50 text-orange-800 border border-dashed border-orange-400 rounded px-1.5 py-0.5">OCS Consent if prereq/co-req unmet</span>);

    return (
      <>
        <TableRow className={className}>
          <TableCell className="py-1.5">
            {status === 'passed'
              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              : <Circle className="w-4 h-4 text-muted-foreground/40" />
            }
          </TableCell>
          <TableCell className="py-1.5 font-mono font-semibold text-primary text-xs">{course.code}</TableCell>
          <TableCell className="py-1.5 text-sm">{course.title}</TableCell>
          <TableCell className="py-1.5 text-center text-sm">{course.units}</TableCell>
          <TableCell className="py-1.5 text-xs text-muted-foreground whitespace-nowrap">{termName ?? '—'}</TableCell>
          <TableCell className="py-1.5"><StatusBadge status={status} /></TableCell>
        </TableRow>
        {reqItems.length > 0 && (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={6} className="py-0 pb-2 pl-8 border-t-0">
              <div className="flex flex-wrap gap-1">
                {reqItems}
              </div>
            </TableCell>
          </TableRow>
        )}
      </>
    );
  }

  if (!student) return null;

  return (
    <PortalLayout role="student" userName={student.name}>
      <div className="space-y-6">
        {/* Module Banner */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
          <div className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Plan of Study</h1>
              <p className="text-white/80 text-sm mt-0.5">
                Your academic roadmap — monitor passed, in-progress, and pending course requirements for graduation.
              </p>
              <div className="flex flex-wrap gap-3 mt-3">
                <span className="inline-flex items-center gap-1.5 text-xs bg-white/15 text-white rounded-full px-3 py-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Track required courses
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs bg-white/15 text-white rounded-full px-3 py-1">
                  <BookOpen className="w-3.5 h-3.5" /> View grade history
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs bg-white/15 text-white rounded-full px-3 py-1">
                  <GraduationCap className="w-3.5 h-3.5" /> Apply for graduation
                </span>
                {degreeLabel && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-yellow-400/20 text-yellow-200 border border-yellow-300/30 rounded-full px-3 py-1 font-semibold">
                    <GraduationCap className="w-3.5 h-3.5" /> {degreeLabel}
                  </span>
                )}
              </div>
              {hasRequirements && (
                <div className="mt-4">
                  <button
                    onClick={handlePrintChecklist}
                    className="inline-flex items-center gap-2 text-xs font-semibold bg-white/20 hover:bg-white/30 text-white border border-white/25 rounded-lg px-4 py-2 transition-all duration-150 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Checklist PDF
                  </button>
                </div>
              )}
            </div>
            {hasRequirements && (
              <div className="sm:text-right shrink-0 bg-white/15 rounded-lg px-4 py-3 flex sm:flex-col gap-2 sm:gap-0 items-center sm:items-end">
                {degreeLabel && (
                  <div className="text-[10px] font-bold text-yellow-200/80 uppercase tracking-widest mb-1 w-full sm:text-right">{degreeLabel}</div>
                )}
                <div>
                  <div className="text-3xl font-bold text-white leading-none">{totalPassed}<span className="text-lg text-white/70">/{totalRequired}</span></div>
                  <div className="text-xs text-white/70 sm:mt-1">courses passed</div>
                </div>
                {totalRequiredUnits > 0 && (
                  <div className={`${totalRequired > 0 ? 'sm:mt-2 sm:pt-2 sm:border-t sm:border-white/20' : ''}`}>
                    <div className="text-xl font-bold text-white leading-none">{totalPassedUnits}<span className="text-sm text-white/70">/{totalRequiredUnits}</span></div>
                    <div className="text-xs text-white/70 sm:mt-0.5">elective units</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Eligibility Banner */}
        {hasRequirements && (
          <div className={`rounded-lg border p-4 flex items-start gap-3 ${isEligible ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            {isEligible
              ? <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              : <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            }
            <div>
              <div className={`font-semibold text-sm ${isEligible ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isEligible
                  ? `Eligible to Graduate${degreeLabel ? ` — ${degreeLabel}` : ''}`
                  : `Not Yet Eligible to Graduate${degreeLabel ? ` — ${degreeLabel}` : ''}`}
              </div>
              {!isEligible && (
                <ul className="mt-1 space-y-0.5">
                  {fixedEligibility.filter(e => !e.eligible && e.required > 0).map(e => (
                    <li key={e.label} className="text-xs text-amber-700">
                      {PANEL_LABELS[e.label]}: {e.passed}/{e.required} courses passed
                      {e.totalUnits > 0 && ` (${e.passedUnits}/${e.totalUnits} units)`}
                    </li>
                  ))}
                  {!nstpEligible && (
                    <li className="text-xs text-amber-700">
                      NSTP: {nstpPassed}/{NSTP_REQUIRED} courses completed ({nstpPassedUnits}/{nstpTotalUnits} units) — must choose and pass 2 NSTP courses
                    </li>
                  )}
                  {additionalGeEligibility.required > 0 && (
                    <li className={`text-xs ${additionalGeEligibility.eligible ? 'text-emerald-600' : 'text-amber-700'}`}>
                      Additional Required Courses: {additionalGeEligibility.passed}/{additionalGeEligibility.required} courses passed
                      {additionalGeEligibility.totalUnits > 0 && ` (${additionalGeEligibility.passedUnits}/${additionalGeEligibility.totalUnits} units)`}
                      {additionalGeEligibility.eligible ? ' — completed' : ' — required before graduation'}
                    </li>
                  )}
                  {unitEligibility.filter(e => !e.eligible && e.requiredUnits > 0).map(e => (
                    <li key={e.label} className="text-xs text-amber-700">
                      {PANEL_LABELS[e.label]}: {e.passedUnits}/{e.requiredUnits} units passed
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Congratulatory Banner */}
        {isEligible && (
          <CongratsBanner
            studentName={student.name}
            programName={programName}
            collegeName={collegeName}
          />
        )}

        {/* Latin Honors Congratulatory Letter */}
        {latinHonor && (
          <div
            className="relative overflow-hidden rounded-xl p-8"
            style={{ background: 'var(--gradient-hero)' }}
          >
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full opacity-10 bg-white" />
            <div className="absolute -bottom-10 -left-10 w-52 h-52 rounded-full opacity-10 bg-white" />
            <div className="absolute top-6 left-1/2 w-24 h-24 rounded-full opacity-10 bg-yellow-300" />

            <div className="relative z-10 space-y-4">
              {/* Medal + stars */}
              <div className="flex items-center gap-3">
                <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                <Medal className="w-9 h-9 text-yellow-300" />
                <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
              </div>

              <div className="space-y-1">
                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">
                  {latinHonor === 'Awardee' ? 'Faculty Award for Academic Excellence' : 'Latin Honors Distinction'}
                </p>
                <h2 className="text-3xl font-extrabold text-white leading-tight">
                  Congratulations,
                </h2>
                <h2 className="text-3xl font-extrabold text-yellow-300 leading-tight">
                  {student.name}!
                </h2>
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-lg px-4 py-2 backdrop-blur-sm">
                  <Medal className="w-4 h-4 text-yellow-300 flex-shrink-0" />
                  <span className="text-white font-bold text-base leading-snug">{awardDisplayName}</span>
                </div>
                <p className="text-white/75 text-sm leading-relaxed max-w-lg">
                  {latinHonor === 'Awardee'
                    ? 'You have achieved the Faculty Award for Academic Excellence by maintaining an outstanding grade point average throughout your program without any unexcused underload.'
                    : latinHonor === 'Summa Cum Laude'
                    ? 'You have achieved the highest academic distinction, reserved for students of exceptional scholastic excellence.'
                    : latinHonor === 'Magna Cum Laude'
                    ? 'You have achieved this distinction for outstanding academic performance throughout your academic career.'
                    : 'You have achieved this distinction for commendable academic achievement during your studies.'}
                </p>
              </div>

              <div className="flex items-center gap-6 pt-2 border-t border-white/20">
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wide">Cumulative GWA</p>
                  <p className="text-yellow-300 font-bold text-xl">{overallGWA.toFixed(2)}</p>
                </div>
                {programName && (
                  <div>
                    <p className="text-white/50 text-xs uppercase tracking-wide">Program</p>
                    <p className="text-white font-semibold text-sm">{programName}</p>
                  </div>
                )}
                <div className="ml-auto">
                  <Button
                    size="sm"
                    onClick={handlePrintHonorsLetter}
                    className="gap-1.5 bg-white/15 border border-white/30 text-white hover:bg-white/25"
                    variant="outline"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Letter
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Application for Graduation */}
        {isEligible && (
          <div className="portal-panel">
            <div className="portal-panel-header flex items-center gap-2">
              <Send className="w-4 h-4" />
              Application for Graduation
            </div>
            <div className="p-4">
              {!myApp && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium">You are eligible to apply for graduation.</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Submit your application for OCS review. Once approved, you can print your official Application for Graduation.</p>
                  </div>
                  <Button onClick={handleApply} disabled={applying} className="gap-2 shrink-0">
                    <Send className="w-4 h-4" />
                    {applying ? 'Submitting…' : 'Apply for Graduation'}
                  </Button>
                </div>
              )}
              {myApp?.status === 'pending' && (
                <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-700">Application Submitted — Pending OCS Review</p>
                    <p className="text-xs text-amber-600 mt-0.5">Submitted on {new Date(myApp.submittedAt).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })}</p>
                  </div>
                </div>
              )}
              {myApp?.status === 'approved' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-emerald-700">Application Approved by OCS</p>
                      {myApp.processedAt && (
                        <p className="text-xs text-emerald-600 mt-0.5">Approved on {new Date(myApp.processedAt).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })}</p>
                      )}
                      {myApp.response && <p className="text-xs text-emerald-700 mt-1">{myApp.response}</p>}
                    </div>
                    <Button variant="outline" size="sm" onClick={handlePrintApplication} className="gap-2 shrink-0">
                      <Printer className="w-4 h-4" />
                      Print Application
                    </Button>
                  </div>
                </div>
              )}
              {myApp?.status === 'denied' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-700">Application Denied</p>
                      {myApp.response && <p className="text-xs text-red-600 mt-1">Reason: {myApp.response}</p>}
                    </div>
                  </div>
                  <Button size="sm" onClick={handleApply} disabled={applying} className="gap-2">
                    <Send className="w-4 h-4" />
                    {applying ? 'Submitting…' : 'Re-apply for Graduation'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fixed-list Panels */}
        {fixedPanels.map((panel, pi) => {
          const elig = fixedEligibility[pi];
          const effective = elig.required;
          return (
            <div key={panel.label} className="portal-panel">
              <div className="portal-panel-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {PANEL_LABELS[panel.label]}
                </div>
                <Badge className={`text-xs ${elig.eligible && effective > 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                  {elig.passed}/{effective} courses
                </Badge>
              </div>
              <div className="p-3">
                {panel.courses.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-6">
                    No required courses configured for this category yet.
                  </div>
                ) : (
                  <>
                    {effective > 0 && (
                      <div className="mb-3">
                        <Progress value={Math.min((elig.passed / effective) * 100, 100)} className="h-1.5" />
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="w-8 py-2"></TableHead>
                            <TableHead className="py-2 text-xs font-bold">Code</TableHead>
                            <TableHead className="py-2 text-xs font-bold">Title</TableHead>
                            <TableHead className="py-2 text-xs font-bold text-center w-[54px]">Units</TableHead>
                            <TableHead className="py-2 text-xs font-bold">Term</TableHead>
                            <TableHead className="py-2 text-xs font-bold">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {panel.courses.map((course, idx) => (
                            <CourseRow key={course.id} course={course} className={panel.maxCount && panel.maxCount > 0 && idx >= panel.maxCount ? 'opacity-40' : undefined} />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* NSTP Panel — student-chosen, 2 courses required */}
        <div className="portal-panel">
          <div className="portal-panel-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              NSTP (National Service Training Program)
            </div>
            <Badge className={`text-xs ${nstpEligible ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
              {nstpPassed}/{NSTP_REQUIRED} courses
            </Badge>
          </div>
          <div className="p-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              You must choose and complete any <strong>2 NSTP courses (6 units)</strong>. Enlist in NSTP courses through the Enlistment module.
            </p>
            <Progress value={Math.min((nstpPassed / NSTP_REQUIRED) * 100, 100)} className="h-1.5" />
            {nstpCourses.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-4">
                No NSTP courses enlisted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-8 py-2"></TableHead>
                      <TableHead className="py-2 text-xs font-bold">Code</TableHead>
                      <TableHead className="py-2 text-xs font-bold">Title</TableHead>
                      <TableHead className="py-2 text-xs font-bold text-center w-[54px]">Units</TableHead>
                      <TableHead className="py-2 text-xs font-bold">Term</TableHead>
                      <TableHead className="py-2 text-xs font-bold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nstpCourses.map(course => (
                      <CourseRow key={course.id} course={course} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* College-Specific Additional GE Panel */}
        {additionalGeCourses.length > 0 && (
          <div className="portal-panel">
            <div className="portal-panel-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Additional Required Courses
              </div>
              <Badge className={`text-xs ${additionalGeEligibility.eligible && additionalGeEligibility.required > 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                {additionalGeEligibility.passed}/{additionalGeEligibility.required} courses
              </Badge>
            </div>
            <div className="p-3">
              <div className="mb-3">
                <Progress value={additionalGeEligibility.required > 0 ? Math.min((additionalGeEligibility.passed / additionalGeEligibility.required) * 100, 100) : 0} className="h-1.5" />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-8 py-2"></TableHead>
                      <TableHead className="py-2 text-xs font-bold">Code</TableHead>
                      <TableHead className="py-2 text-xs font-bold">Title</TableHead>
                      <TableHead className="py-2 text-xs font-bold text-center w-[54px]">Units</TableHead>
                      <TableHead className="py-2 text-xs font-bold">Term</TableHead>
                      <TableHead className="py-2 text-xs font-bold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {additionalGeCourses.map(course => (
                      <CourseRow key={course.id} course={course} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* Unit-based free-choice Panels (Elective GE & Specialized) */}
        {unitPanels.map((panel, pi) => {
          const elig = unitEligibility[pi];
          const reqUnits = elig.requiredUnits;
          const passedUnits = elig.passedUnits;
          const hasTaken = panel.courses.length > 0;
          return (
            <div key={panel.label} className="portal-panel">
              <div className="portal-panel-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {PANEL_LABELS[panel.label]}
                  <span className="text-xs font-normal text-muted-foreground ml-1">(Student-chosen)</span>
                </div>
                <Badge className={`text-xs ${elig.eligible && reqUnits > 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                  {passedUnits}/{reqUnits} units
                </Badge>
              </div>
              <div className="p-3">
                {reqUnits === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-6">
                    No unit requirement configured for this category yet.
                  </div>
                ) : (
                  <>
                    <div className="mb-3 space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>You need <strong className="text-foreground">{reqUnits} units</strong> of {PANEL_LABELS[panel.label]} courses</span>
                        <span className="font-semibold text-foreground">{passedUnits} passed</span>
                      </div>
                      <Progress value={reqUnits > 0 ? Math.min((passedUnits / reqUnits) * 100, 100) : 0} className="h-1.5" />
                    </div>
                    {!hasTaken && (
                      <div className="text-center text-muted-foreground text-sm py-4 border border-dashed rounded-md">
                        <p>No <strong>{PANEL_LABELS[panel.label]}</strong> courses yet.</p>
                        <p className="text-xs mt-1">Courses will appear here once your enlistment is finalized.</p>
                      </div>
                    )}
                    {hasTaken && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              <TableHead className="w-8 py-2"></TableHead>
                              <TableHead className="py-2 text-xs font-bold">Code</TableHead>
                              <TableHead className="py-2 text-xs font-bold">Title</TableHead>
                              <TableHead className="py-2 text-xs font-bold text-center w-[54px]">Units</TableHead>
                              <TableHead className="py-2 text-xs font-bold">Term</TableHead>
                              <TableHead className="py-2 text-xs font-bold">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {panel.courses.map(course => (
                              <CourseRow key={course.id} course={course} />
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {!hasRequirements && (
          <div className="portal-panel">
            <div className="p-12 text-center text-muted-foreground">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No graduation requirements configured yet.</p>
              <p className="text-sm mt-1">Your college's requirements have not been set up. Please contact OCS.</p>
            </div>
          </div>
        )}

        {/* Flowchart Section */}
        {allFlowchartCourses.length > 0 && (
          <div className="portal-panel">
            <PlanFlowchart
              courses={allFlowchartCourses}
              getStatus={getStatus}
              studentName={student.name}
            />
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
