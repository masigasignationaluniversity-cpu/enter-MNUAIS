import { useMemo, useEffect, useRef } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, AlertCircle, Clock, GraduationCap, BookOpen, Printer, Award } from 'lucide-react';
import type { Course, GradeValue, CourseCategory } from '@/lib/types';

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
  'HK/PE/NSTP': 'HK, PE, and NSTP',
  'Major': 'Major Courses',
  'Specialized': 'Specialized Courses',
  'Thesis': 'Thesis',
};

interface CertProps {
  studentName: string;
  studentNumber?: string;
  programName: string;
  collegeName: string;
  institutionName: string;
}

function GraduationCertificate({ studentName, studentNumber, programName, collegeName, institutionName }: CertProps) {
  const certRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = certRef.current?.innerHTML ?? '';
    const win = window.open('', '_blank', 'width=900,height=650');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificate of Graduation – ${studentName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 40px; }
            .cert { width: 750px; border: 12px double #b8960c; padding: 48px 56px; text-align: center; position: relative; background: #fffdf5; font-family: 'Inter', sans-serif; }
            .cert::before { content: ''; position: absolute; inset: 8px; border: 2px solid #d4af37; pointer-events: none; }
            .inst { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #1a1a1a; letter-spacing: 0.04em; text-transform: uppercase; }
            .divider { width: 80px; height: 2px; background: #d4af37; margin: 16px auto; }
            .label { font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #888; margin-bottom: 8px; font-weight: 500; }
            .certifies { font-size: 14px; color: #555; margin: 16px 0 8px; font-style: italic; }
            .student-name { font-family: 'Playfair Display', serif; font-size: 36px; color: #1a1a1a; margin: 8px 0; }
            .student-num { font-size: 13px; color: #777; margin-bottom: 20px; }
            .completed { font-size: 14px; color: #555; margin-bottom: 6px; }
            .program { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #2c5282; margin-bottom: 4px; }
            .college { font-size: 13px; color: #666; margin-bottom: 24px; }
            .footer { font-size: 11px; color: #aaa; margin-top: 28px; border-top: 1px solid #e5d88a; padding-top: 16px; letter-spacing: 0.05em; }
            .year { font-size: 15px; font-weight: 600; color: #444; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const year = new Date().getFullYear();

  return (
    <div className="space-y-3">
      {/* Screen-visible certificate */}
      <div
        ref={certRef}
        className="cert relative border-[10px] border-double p-10 text-center bg-[#fffdf5]"
        style={{ borderColor: '#b8960c', fontFamily: 'Georgia, serif' }}
      >
        {/* Inner border */}
        <div className="absolute inset-2 border border-[#d4af37] pointer-events-none rounded-sm" />

        <div className="relative z-10 space-y-3">
          <div className="flex justify-center mb-2">
            <Award className="w-10 h-10 text-[#b8960c]" />
          </div>

          <p className="text-xs tracking-[0.18em] uppercase text-muted-foreground font-medium">
            {institutionName}
          </p>

          <div className="w-16 h-px bg-[#d4af37] mx-auto" />

          <h2 className="text-2xl font-bold tracking-wide uppercase text-foreground" style={{ fontFamily: 'Georgia, serif' }}>
            Certificate of Graduation
          </h2>

          <div className="w-16 h-px bg-[#d4af37] mx-auto" />

          <p className="text-sm text-muted-foreground italic mt-4">This is to certify that</p>

          <p className="text-4xl font-bold text-foreground mt-1" style={{ fontFamily: 'Georgia, serif' }}>
            {studentName}
          </p>

          {studentNumber && (
            <p className="text-xs text-muted-foreground tracking-widest">{studentNumber}</p>
          )}

          <p className="text-sm text-muted-foreground mt-3">
            has successfully completed all academic requirements for the degree of
          </p>

          <p className="text-xl font-bold text-primary mt-1" style={{ fontFamily: 'Georgia, serif' }}>
            {programName || "Bachelor's Degree"}
          </p>

          <p className="text-xs text-muted-foreground">{collegeName}</p>

          <div className="w-16 h-px bg-[#d4af37] mx-auto mt-4" />

          <p className="text-sm font-semibold text-foreground">{year}</p>

          <p className="text-[10px] text-muted-foreground tracking-widest uppercase mt-4 border-t border-[#e5d88a] pt-3">
            Generated from the Academic Information System &bull; {institutionName}
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" />
          Print Certificate
        </Button>
      </div>
    </div>
  );
}

export default function StudentPlanOfStudy() {
  const { state, loadGraduationRequirements } = useApp();
  const student = state.currentUser!;
  const activeTerm = state.terms.find(t => t.isActive);

  // Always fetch fresh graduation requirements when viewing this page
  useEffect(() => {
    loadGraduationRequirements();
  }, [loadGraduationRequirements]);

  // Resolve college ID (handle both stored-as-ID and stored-as-name)
  const studentCollegeId = useMemo(() => {
    const byId = state.colleges.find(c => c.id === student.college);
    if (byId) return byId.id;
    const byName = state.colleges.find(c => c.name === student.college);
    return byName?.id ?? student.college ?? '';
  }, [state.colleges, student.college]);

  const globalReq = state.graduationRequirements.find(r => r.collegeId === 'global');
  const collegeReq = state.graduationRequirements.find(r => r.collegeId === studentCollegeId);

  // Build status map: courseId → { status, grade, termName }
  const statusMap = useMemo(() => {
    const map = new Map<string, { status: CourseStatus; grade?: string; termName?: string }>();

    state.grades
      .filter(g => g.studentId === student.id)
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
  }, [state.grades, state.enrollments, state.sections, state.terms, student.id, activeTerm]);

  const getStatus = (courseId: string): CourseStatus => statusMap.get(courseId)?.status ?? 'not_taken';
  const getTermName = (courseId: string): string | undefined => statusMap.get(courseId)?.termName;

  // Courses student has enrolled in finalized terms, by category — for unit-based panels
  const studentCoursesByCategory = useMemo(() => {
    // Terms where this student finalized their enlistment
    const finalizedTermIds = new Set(
      state.finalizedEnlistments
        .filter(f => f.studentId === student.id)
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
  }, [state.finalizedEnlistments, state.enrollments, state.sections, state.courses, student.id]);

  // Fixed-list panels (GE, HK/PE/NSTP, Major, Thesis)
  const fixedPanels: { label: CourseCategory; courses: Course[]; maxCount?: number }[] = [
    {
      label: 'GE',
      courses: (globalReq?.requiredGeCourseIds ?? [])
        .map(id => state.courses.find(c => c.id === id)).filter(Boolean) as Course[],
    },
    {
      label: 'HK/PE/NSTP',
      courses: (globalReq?.requiredHkPeNstpCourseIds ?? [])
        .map(id => state.courses.find(c => c.id === id)).filter(Boolean) as Course[],
    },
    {
      label: 'Major',
      courses: (collegeReq?.requiredMajorCourseIds ?? [])
        .map(id => state.courses.find(c => c.id === id)).filter(Boolean) as Course[],
      maxCount: collegeReq?.maxMajor || 0,
    },
    {
      label: 'Thesis',
      courses: (collegeReq?.requiredThesisCourseIds ?? [])
        .map(id => state.courses.find(c => c.id === id)).filter(Boolean) as Course[],
      maxCount: collegeReq?.maxThesis || 0,
    },
  ];

  // Unit-based free-choice panels (Elective GE, Specialized)
  const unitPanels: { label: CourseCategory; requiredUnits: number; courses: Course[] }[] = [
    {
      label: 'Elective GE',
      requiredUnits: collegeReq?.maxElectiveGe ?? 0,
      courses: studentCoursesByCategory.get('Elective GE') ?? [],
    },
    {
      label: 'Specialized',
      requiredUnits: collegeReq?.maxSpecialized ?? 0,
      courses: studentCoursesByCategory.get('Specialized') ?? [],
    },
  ];

  // Eligibility calculations
  const fixedEligibility = fixedPanels.map(p => {
    const effective = p.maxCount && p.maxCount > 0 ? p.maxCount : p.courses.length;
    const passed = p.courses.filter(c => getStatus(c.id) === 'passed').length;
    return { label: p.label, required: effective, passed, eligible: effective === 0 || passed >= effective };
  });

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
    ...unitEligibility.map(e => e.eligible),
  ];
  const isEligible = allEligibility.every(Boolean) && (fixedEligibility.some(e => e.required > 0) || unitEligibility.some(e => e.requiredUnits > 0));
  const hasRequirements = fixedEligibility.some(e => e.required > 0) || unitEligibility.some(e => e.requiredUnits > 0);

  const totalRequired = fixedEligibility.reduce((s, e) => s + e.required, 0);
  const totalPassed = fixedEligibility.reduce((s, e) => s + Math.min(e.passed, e.required), 0);

  // Resolve display names for certificate
  const collegeName = useMemo(() => {
    const c = state.colleges.find(col => col.id === studentCollegeId);
    return c?.name ?? student.college ?? '';
  }, [state.colleges, studentCollegeId, student.college]);

  const programName = useMemo(() => {
    const prog = state.degreePrograms.find(p => p.id === student.program || p.name === student.program || p.abbreviation === student.program);
    return prog?.name ?? student.program ?? '';
  }, [state.degreePrograms, student.program]);

  const institutionName = state.portalSettings.institutionName || state.portalSettings.portalName || 'University';

  // Course row renderer (for fixed panels)
  function CourseRow({ course }: { course: Course }) {
    const status = getStatus(course.id);
    const termName = getTermName(course.id);
    return (
      <tr className="border-b last:border-0">
        <td className="py-2 pr-2">
          {status === 'passed'
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            : <Circle className="w-4 h-4 text-muted-foreground/40" />
          }
        </td>
        <td className="py-2 pr-3 font-mono font-semibold text-primary text-xs">{course.code}</td>
        <td className="py-2 pr-3">{course.title}</td>
        <td className="py-2 pr-3 text-center">{course.units}</td>
        <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">{termName ?? '—'}</td>
        <td className="py-2"><StatusBadge status={status} /></td>
      </tr>
    );
  }

  return (
    <PortalLayout role="student" userName={student.name}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-primary" />
              Plan of Study
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your graduation checklist — track completed and remaining requirements.
            </p>
          </div>
          {hasRequirements && (
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-primary">{totalPassed}/{totalRequired}</div>
              <div className="text-xs text-muted-foreground">fixed courses passed</div>
            </div>
          )}
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
                {isEligible ? 'Eligible to Graduate' : 'Not Yet Eligible to Graduate'}
              </div>
              {!isEligible && (
                <ul className="mt-1 space-y-0.5">
                  {fixedEligibility.filter(e => !e.eligible && e.required > 0).map(e => (
                    <li key={e.label} className="text-xs text-amber-700">
                      {PANEL_LABELS[e.label]}: {e.passed}/{e.required} courses passed
                    </li>
                  ))}
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

        {/* Graduation Certificate */}
        {isEligible && (
          <GraduationCertificate
            studentName={student.name}
            studentNumber={student.studentNumber}
            programName={programName}
            collegeName={collegeName}
            institutionName={institutionName}
          />
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
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <th className="text-left py-1.5 pr-3 font-medium w-8"></th>
                            <th className="text-left py-1.5 pr-3 font-medium">Code</th>
                            <th className="text-left py-1.5 pr-3 font-medium">Title</th>
                            <th className="text-center py-1.5 pr-3 font-medium">Units</th>
                            <th className="text-left py-1.5 pr-3 font-medium">Term</th>
                            <th className="text-left py-1.5 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {panel.courses.map((course, idx) => (
                            <tr key={course.id} className={`border-b last:border-0 ${panel.maxCount && panel.maxCount > 0 && idx >= panel.maxCount ? 'opacity-40' : ''}`}>
                              <td className="py-2 pr-2">
                                {getStatus(course.id) === 'passed'
                                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  : <Circle className="w-4 h-4 text-muted-foreground/40" />
                                }
                              </td>
                              <td className="py-2 pr-3 font-mono font-semibold text-primary text-xs">{course.code}</td>
                              <td className="py-2 pr-3">{course.title}</td>
                              <td className="py-2 pr-3 text-center">{course.units}</td>
                              <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">{getTermName(course.id) ?? '—'}</td>
                              <td className="py-2"><StatusBadge status={getStatus(course.id)} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

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
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-xs text-muted-foreground">
                              <th className="text-left py-1.5 pr-3 font-medium w-8"></th>
                              <th className="text-left py-1.5 pr-3 font-medium">Code</th>
                              <th className="text-left py-1.5 pr-3 font-medium">Title</th>
                              <th className="text-center py-1.5 pr-3 font-medium">Units</th>
                              <th className="text-left py-1.5 pr-3 font-medium">Term</th>
                              <th className="text-left py-1.5 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {panel.courses.map(course => (
                              <CourseRow key={course.id} course={course} />
                            ))}
                          </tbody>
                        </table>
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
      </div>
    </PortalLayout>
  );
}
