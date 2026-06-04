import { useMemo } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, AlertCircle, Clock, GraduationCap, BookOpen } from 'lucide-react';
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

export default function StudentPlanOfStudy() {
  const { state } = useApp();
  const student = state.currentUser!;
  const activeTerm = state.terms.find(t => t.isActive);

  // Resolve college ID (handle both stored-as-ID and stored-as-name)
  const studentCollegeId = useMemo(() => {
    const byId = state.colleges.find(c => c.id === student.college);
    if (byId) return byId.id;
    const byName = state.colleges.find(c => c.name === student.college);
    return byName?.id ?? student.college ?? '';
  }, [state.colleges, student.college]);

  const globalReq = state.graduationRequirements.find(r => r.collegeId === 'global');
  const collegeReq = state.graduationRequirements.find(r => r.collegeId === studentCollegeId);

  // Build status map: courseId → { status, grade, units }
  const statusMap = useMemo(() => {
    const map = new Map<string, { status: CourseStatus; grade?: string }>();

    state.grades
      .filter(g => g.studentId === student.id)
      .forEach(g => {
        const sec = state.sections.find(s => s.id === g.sectionId);
        if (!sec) return;
        const effective = (g.removalSubmitted && g.removalGrade) ? g.removalGrade : g.grade;
        if (!effective) return;
        const courseId = sec.courseId;
        if (PASSING_GRADES.includes(effective as GradeValue)) {
          map.set(courseId, { status: 'passed', grade: effective });
        } else if (['4', '5', 'F', 'U', 'INC'].includes(effective)) {
          if (!map.has(courseId) || map.get(courseId)?.status !== 'passed') {
            map.set(courseId, { status: 'failed', grade: effective });
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
            map.set(courseId, { status: 'in_progress' });
          }
        });
    }

    return map;
  }, [state.grades, state.enrollments, state.sections, student.id, activeTerm]);

  const getStatus = (courseId: string): CourseStatus => statusMap.get(courseId)?.status ?? 'not_taken';
  const getGrade = (courseId: string): string | undefined => statusMap.get(courseId)?.grade;

  // Courses student has taken (any status) by category
  const studentCoursesByCategory = useMemo(() => {
    const takenCourseIds = new Set(statusMap.keys());
    const result = new Map<CourseCategory, Course[]>();
    const cats: CourseCategory[] = ['Elective GE', 'Specialized'];
    cats.forEach(cat => {
      result.set(cat, state.courses.filter(c => c.category === cat && takenCourseIds.has(c.id)));
    });
    return result;
  }, [statusMap, state.courses]);

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

  // Course row renderer (for fixed panels)
  function CourseRow({ course }: { course: Course }) {
    const status = getStatus(course.id);
    const grade = getGrade(course.id);
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
        <td className="py-2 pr-3">
          {grade ? (
            <Badge className={`text-xs ${PASSING_GRADES.includes(grade as GradeValue) ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {grade}
            </Badge>
          ) : <span className="text-muted-foreground text-xs">—</span>}
        </td>
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
                            <th className="text-left py-1.5 pr-3 font-medium">Grade</th>
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
                              <td className="py-2 pr-3">
                                {getGrade(course.id) ? (
                                  <Badge className={`text-xs ${PASSING_GRADES.includes(getGrade(course.id) as GradeValue) ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {getGrade(course.id)}
                                  </Badge>
                                ) : <span className="text-muted-foreground text-xs">—</span>}
                              </td>
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
          const allCoursesByCategory = state.courses.filter(c => c.category === panel.label);
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
                        <p>You have not yet taken any <strong>{PANEL_LABELS[panel.label]}</strong> courses.</p>
                        <p className="text-xs mt-1">
                          {allCoursesByCategory.length > 0
                            ? `${allCoursesByCategory.length} course${allCoursesByCategory.length !== 1 ? 's' : ''} available in this category.`
                            : 'No courses tagged with this category yet.'
                          }
                        </p>
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
                              <th className="text-left py-1.5 pr-3 font-medium">Grade</th>
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
