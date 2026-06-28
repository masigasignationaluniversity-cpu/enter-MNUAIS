import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import PortalLayout from '@/components/shared/PortalLayout';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, GraduationCap } from 'lucide-react';
import {
  getYearClassification, getPassedUnits, buildProgramCourseIdSet,
  yearClassificationColor, YearClassification,
} from '@/lib/academic';

export default function FacultyAdvisees() {
  const { state, getActiveTerm, computeGWA } = useApp();
  const me = state.currentUser!;
  const activeTerm = getActiveTerm();

  const advisees = useMemo(() =>
    state.users
      .filter(u => u.role === 'student' && u.adviserId === me.id)
      .sort((a, b) => a.name.localeCompare(b.name)),
  [state.users, me.id]);

  const getEnrollmentStatus = (studentId: string) => {
    if (!activeTerm) return 'No Active Term';
    const isFinalized = state.finalizedEnlistments.some(
      fe => fe.studentId === studentId && fe.termId === activeTerm.id,
    );
    if (isFinalized) return 'Finalized';
    const hasEnrolled = state.enrollments.some(
      e => e.studentId === studentId && e.termId === activeTerm.id && e.status === 'enlisted',
    );
    return hasEnrolled ? 'Enlisted' : 'Not Enrolled';
  };

  const getYearClass = (student: typeof state.users[0]) => {
    const prog = (state.degreePrograms ?? []).find(p => p.name === student.program || p.id === student.program);
    const totalUnits = prog?.totalUnits ?? 0;
    if (!totalUnits) return '—';
    const programCourseIds = buildProgramCourseIdSet(
      state.graduationRequirements ?? [],
      prog?.collegeId ?? '',
      prog?.id,
    );
    const passed = getPassedUnits(student.id, state.grades, state.sections, state.courses, state.enrollments, programCourseIds);
    return getYearClassification(passed, totalUnits, prog?.degreeType);
  };

  const getCurrentUnits = (studentId: string) => {
    if (!activeTerm) return 0;
    return state.enrollments
      .filter(e => e.studentId === studentId && e.termId === activeTerm.id && e.status !== 'dropped')
      .reduce((sum, e) => {
        const sec = state.sections.find(s => s.id === e.sectionId);
        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
        return sum + (course?.units ?? 0);
      }, 0);
  };

  return (
    <PortalLayout role="faculty" currentPath="/faculty/advisees">
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold">My Advisees</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {advisees.length} student{advisees.length !== 1 ? 's' : ''} assigned to you
              {activeTerm ? ` · ${activeTerm.name}` : ''}
            </p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Users className="w-5 h-5 text-primary" />
          </div>
        </div>

        {advisees.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No advisees assigned to you yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Contact the OCS to have students assigned to you.</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Student No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Program</TableHead>
                  <TableHead className="hidden lg:table-cell">Year</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Units (This Term)</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Term GWA</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Cum. GWA</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advisees.map(student => {
                  const { gwa: termGwa } = activeTerm ? computeGWA(student.id, activeTerm.id) : { gwa: 0 };
                  const { gwa: cumGwa } = computeGWA(student.id);
                  const yearClass = getYearClass(student);
                  const enrollStatus = getEnrollmentStatus(student.id);
                  const currentUnits = getCurrentUnits(student.id);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono text-xs">{student.studentNumber ?? '—'}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{student.name}</div>
                        <div className="md:hidden text-xs text-muted-foreground mt-0.5">{student.program ?? '—'}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[180px] truncate">{student.program ?? '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {yearClass !== '—' ? (
                          <Badge variant="outline" className={`text-[10px] ${yearClassificationColor(yearClass as YearClassification)}`}>
                            {yearClass}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right text-sm">{currentUnits > 0 ? currentUnits : '—'}</TableCell>
                      <TableCell className="hidden md:table-cell text-right font-mono text-sm">
                        {termGwa > 0 ? termGwa.toFixed(2) : '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right font-mono text-sm">
                        {cumGwa > 0 ? cumGwa.toFixed(2) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            enrollStatus === 'Finalized'
                              ? 'bg-green-50 text-green-700 border-green-300'
                              : enrollStatus === 'Enlisted'
                                ? 'bg-blue-50 text-blue-700 border-blue-300'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {enrollStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
