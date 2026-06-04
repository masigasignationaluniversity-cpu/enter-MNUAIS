import { useMemo } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, AlertCircle, Clock, GraduationCap, BookOpen } from 'lucide-react';
import type { Course, GradeValue, CourseCategory } from '@/lib/types';

const PASSING_GRADES: GradeValue[] = ['1.0', '1.25', '1.5', '1.75', '2.0', '2.25', '2.5', '2.75', '3.0', 'P', 'S'];

type CourseStatus = 'passed' | 'in_progress' | 'failed' | 'not_taken';

function getCategoryColor(cat: CourseCategory) {
  switch (cat) {
    case 'GE': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Elective GE': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'HK/PE/NSTP': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
    case 'Major': return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'Specialized': return 'bg-violet-100 text-violet-700 border-violet-200';
    case 'Thesis': return 'bg-amber-100 text-amber-700 border-amber-200';
  }
}

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

interface PanelData {
  label: CourseCategory;
  courses: Course[];
  maxCount?: number;
  description?: string;
}

export default function StudentPlanOfStudy() {
  const { state } = useApp();
  const student = state.currentUser!;
  const activeTerm = state.terms.find(t => t.isActive);

  const studentCollege = student.college ?? '';

  const globalReq = state.graduationRequirements.find(r => r.collegeId === 'global');
  const collegeReq = state.graduationRequirements.find(r => r.collegeId === studentCollege);

  // Build status map: courseId → CourseStatus
  const statusMap = useMemo(() => {
    const map = new Map<string, { status: CourseStatus; grade?: string }>();

    // Check passed courses (submitted grades)
    state.grades.forEach(g => {
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

    // Check in-progress (current term enrollments)
    if (activeTerm) {
      const activeEnrollments = state.enrollments.filter(
        e => e.studentId === student.id && e.termId === activeTerm.id && e.status !== 'dropped'
      );
      activeEnrollments.forEach(e => {
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

  const getStatus = (courseId: string): CourseStatus =>
    statusMap.get(courseId)?.status ?? 'not_taken';

  const getGrade = (courseId: string): string | undefined =>
    statusMap.get(courseId)?.grade;

  // Build panels
  const panels: PanelData[] = [
    {
      label: 'GE',
      courses: (globalReq?.requiredGeCourseIds ?? [])
        .map(id => state.courses.find(c => c.id === id))
        .filter(Boolean) as Course[],
      description: 'General Education Courses required for graduation.',
    },
    {
      label: 'Elective GE',
      courses: (collegeReq?.requiredElectiveGeCourseIds ?? [])
        .map(id => state.courses.find(c => c.id === id))
        .filter(Boolean) as Course[],
      maxCount: collegeReq?.maxElectiveGe,
      description: 'Elective General Education Courses.',
    },
    {
      label: 'HK/PE/NSTP',
      courses: (globalReq?.requiredHkPeNstpCourseIds ?? [])
        .map(id => state.courses.find(c => c.id === id))
        .filter(Boolean) as Course[],
      description: 'Health & Kinesiology, Physical Education, and NSTP.',
    },
    {
      label: 'Major',
      courses: (collegeReq?.requiredMajorCourseIds ?? [])
        .map(id => state.courses.find(c => c.id === id))
        .filter(Boolean) as Course[],
      maxCount: collegeReq?.maxMajor,
      description: 'Major courses required for your program.',
    },
    {
      label: 'Specialized',
      courses: (collegeReq?.requiredSpecializedCourseIds ?? [])
        .map(id => state.courses.find(c => c.id === id))
        .filter(Boolean) as Course[],
      maxCount: collegeReq?.maxSpecialized,
      description: 'Specialized courses for your college/program.',
    },
    {
      label: 'Thesis',
      courses: (collegeReq?.requiredThesisCourseIds ?? [])
        .map(id => state.courses.find(c => c.id === id))
        .filter(Boolean) as Course[],
      maxCount: collegeReq?.maxThesis,
      description: 'Thesis / Research requirements.',
    },
  ];

  // Graduation eligibility: all required courses in all panels must be passed
  const eligibilityResults = panels.map(panel => {
    const required = panel.maxCount && panel.maxCount > 0
      ? panel.courses.slice(0, panel.maxCount)
      : panel.courses;
    const passedCount = required.filter(c => getStatus(c.id) === 'passed').length;
    return { label: panel.label, required: required.length, passed: passedCount, eligible: passedCount >= required.length };
  });
  const isEligible = eligibilityResults.every(r => r.eligible) && eligibilityResults.some(r => r.required > 0);
  const totalRequired = eligibilityResults.reduce((s, r) => s + r.required, 0);
  const totalPassed = eligibilityResults.reduce((s, r) => s + r.passed, 0);

  const PANEL_LABELS: Record<CourseCategory, string> = {
    'GE': 'General Education Courses',
    'Elective GE': 'Elective General Education Courses',
    'HK/PE/NSTP': 'HK, PE, and NSTP',
    'Major': 'Major Courses',
    'Specialized': 'Specialized Courses',
    'Thesis': 'Thesis',
  };

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
          {totalRequired > 0 && (
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-primary">{totalPassed}/{totalRequired}</div>
              <div className="text-xs text-muted-foreground">required courses passed</div>
            </div>
          )}
        </div>

        {/* Eligibility Banner */}
        {totalRequired > 0 && (
          <div className={`rounded-lg border p-4 flex items-start gap-3 ${
            isEligible
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
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
                  {eligibilityResults.filter(r => !r.eligible && r.required > 0).map(r => (
                    <li key={r.label} className="text-xs text-amber-700">
                      {PANEL_LABELS[r.label as CourseCategory]}: {r.passed}/{r.required} passed
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Overall Progress */}
        {totalRequired > 0 && (
          <div className="portal-panel">
            <div className="portal-panel-header">Overall Progress</div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Graduation Requirements</span>
                <span className="font-semibold">{Math.round((totalPassed / totalRequired) * 100)}%</span>
              </div>
              <Progress value={(totalPassed / totalRequired) * 100} className="h-2" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                {eligibilityResults.filter(r => r.required > 0).map(r => (
                  <div key={r.label} className="text-center">
                    <div className={`text-lg font-bold ${r.eligible ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      {r.passed}/{r.required}
                    </div>
                    <div className="text-xs text-muted-foreground">{PANEL_LABELS[r.label as CourseCategory]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Six Panels */}
        {panels.map(panel => {
          const passed = panel.courses.filter(c => getStatus(c.id) === 'passed').length;
          const effective = panel.maxCount && panel.maxCount > 0 ? panel.maxCount : panel.courses.length;
          return (
            <div key={panel.label} className="portal-panel">
              <div className="portal-panel-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {PANEL_LABELS[panel.label]}
                </div>
                <div className="flex items-center gap-2">
                  {panel.maxCount && panel.maxCount > 0 && (
                    <span className="text-xs text-muted-foreground font-normal">
                      (max {panel.maxCount} count toward graduation)
                    </span>
                  )}
                  <Badge className={`text-xs ${passed >= effective && effective > 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {passed}/{effective}
                  </Badge>
                </div>
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
                        <Progress value={Math.min((passed / effective) * 100, 100)} className="h-1.5" />
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
                          {panel.courses.map((course, idx) => {
                            const status = getStatus(course.id);
                            const grade = getGrade(course.id);
                            const isCountable = !panel.maxCount || idx < panel.maxCount;
                            return (
                              <tr key={course.id} className={`border-b last:border-0 ${!isCountable ? 'opacity-50' : ''}`}>
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
                                    <Badge className={`text-xs ${
                                      PASSING_GRADES.includes(grade as GradeValue)
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>{grade}</Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </td>
                                <td className="py-2"><StatusBadge status={status} /></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {totalRequired === 0 && (
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
