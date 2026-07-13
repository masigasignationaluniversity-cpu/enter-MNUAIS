import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import PortalLayout from '@/components/shared/PortalLayout';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, GraduationCap, ChevronDown, ChevronUp, BookOpen, AlertTriangle,
  Award, CheckCircle2, Clock,
} from 'lucide-react';
import {
  getYearClassification, getPassedUnits, buildProgramCourseIdSet,
  yearClassificationColor, YearClassification, getScholasticStanding,
  scholasticStandingColor, getEffectiveGradeWithRules, computePlanOfStudyProgress,
  getCompletionPercent, sortTermsChronologically,
} from '@/lib/academic';

function fmtPHP(n: number) { return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`; }

export default function FacultyAdvisees() {
  const { state, getActiveTerm, computeGWA, canStudentViewGrades } = useApp();
  const activeTerm = getActiveTerm();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const me = state.currentUser;

  const advisees = useMemo(() =>
    state.users
      .filter(u => u.role === 'student' && u.adviserId === me?.id)
      .sort((a, b) => a.name.localeCompare(b.name)),
  [state.users, me?.id]);

  if (!me) return null;

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

  // ── Detail builders for the expanded advisee panel ──────────────────────────
  const buildAdviseeDetail = (student: typeof state.users[0]) => {
    const prog = state.degreePrograms.find(p => p.name === student.program || p.id === student.program);
    const degreeType = prog?.degreeType;
    const collegeId = (() => {
      if (!student.college) return '';
      const byId = state.colleges.find(c => c.id === student.college);
      if (byId) return byId.id;
      return state.colleges.find(c => c.name === student.college)?.id ?? student.college;
    })();
    const globalReq = state.graduationRequirements.find(r => r.collegeId === 'global' && !r.programId);
    const collegeReq = prog?.id
      ? (state.graduationRequirements.find(r => r.programId === prog.id)
          ?? state.graduationRequirements.find(r => r.collegeId === collegeId && !r.programId))
      : state.graduationRequirements.find(r => r.collegeId === collegeId && !r.programId);

    // Plan of Study progress (source of truth: OCS-configured requirements)
    const { totalRequiredUnits, totalPassedUnits } = computePlanOfStudyProgress(
      student.id, degreeType, globalReq, collegeReq,
      state.grades, state.sections, state.courses, state.enrollments, state.terms,
      state.finalizedEnlistments, state.specializationRequests ?? [], state.geElectiveRequests ?? [],
    );
    const completionPct = totalRequiredUnits > 0 ? getCompletionPercent(totalPassedUnits, totalRequiredUnits) : 0;

    // Current enlisted/enrolled classes this term
    const currentEnrollments = activeTerm
      ? state.enrollments.filter(e =>
          e.studentId === student.id && e.termId === activeTerm.id && e.status !== 'dropped' &&
          !state.sections.find(s => s.id === e.sectionId)?.parentSectionId
        )
      : [];

    // Holds / warnings — same detection logic as Student Profile
    const hasPDEver = student.status === 'permanently_disqualified' ||
      state.terms.some(t =>
        getScholasticStanding(student.id, t.id, state.grades, state.sections, state.courses)?.standing === 'Permanent Disqualification'
      );
    const hasApprovedPDRecon = activeTerm ? (state.reconsiderationRequests ?? []).some(
      r => r.studentId === student.id && r.termId === activeTerm.id &&
           (!r.requestType || r.requestType === 'pd_reconsideration') && r.status === 'approved'
    ) : false;
    const isDisqualifiedHold = hasPDEver && !hasApprovedPDRecon;

    const activeLoan = [...(state.studentLoanApplications ?? [])]
      .filter(l => l.studentId === student.id && l.status === 'approved' && l.carriedToTermId)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];
    const activeLoanTerm = activeLoan?.carriedToTermId ? state.terms.find(t => t.id === activeLoan.carriedToTermId) : undefined;
    const activeLoanPayment = activeLoanTerm ? (state.enrollmentPayments ?? []).find(p => p.studentId === student.id && p.termId === activeLoanTerm.id) : undefined;
    const hasUnsettledLoan = !!activeLoan && (activeLoanPayment?.status !== 'paid');

    const heldByTerm = activeTerm ? state.terms.find(term => {
      const payment = (state.enrollmentPayments ?? []).find(p => p.studentId === student.id && p.termId === term.id);
      const isCurrentTerm = term.id === activeTerm.id;
      const studentFinalisedThisTerm = state.finalizedEnlistments.some(fe => fe.studentId === student.id && fe.termId === term.id);
      const hasApprovedLoan = (state.studentLoanApplications ?? []).some(l => l.studentId === student.id && l.termId === term.id && l.status === 'approved');
      if (hasApprovedLoan) return false;
      if (payment && payment.status === 'unpaid' && payment.amountPaid > 0) {
        if (isCurrentTerm && studentFinalisedThisTerm) return false;
        return true;
      }
      if (!isCurrentTerm && studentFinalisedThisTerm && (!payment || payment.status === 'unpaid')) return true;
      return false;
    }) : undefined;

    type Hold = { key: string; type: 'negative' | 'positive'; title: string; description: string };
    const holds: Hold[] = [
      ...(isDisqualifiedHold ? [{
        key: 'pd', type: 'negative' as const,
        title: 'Permanent Disqualification',
        description: 'Scholastic standing reached Permanent Disqualification.',
      }] : []),
      ...(hasUnsettledLoan && activeLoanTerm ? [{
        key: 'loan', type: 'positive' as const,
        title: 'Active Student Loan',
        description: `${activeLoanTerm.name} — outstanding loan of ${fmtPHP(activeLoan!.amount)}, still unsettled.`,
      }] : []),
      ...(heldByTerm ? [{
        key: 'tuition', type: 'negative' as const,
        title: 'Unsettled Account Balance',
        description: `${heldByTerm.name} — has an unpaid balance on file.`,
      }] : []),
    ];

    // Scholastic standing per term (only terms visible to student, same rule)
    const scholasticPerTerm = sortTermsChronologically(state.terms)
      .map(term => ({
        term,
        result: getScholasticStanding(student.id, term.id, state.grades, state.sections, state.courses),
        canView: canStudentViewGrades(student.id, term.id),
      }))
      .filter(x => x.result !== null && x.canView);
    const latestScholastic = scholasticPerTerm[scholasticPerTerm.length - 1]?.result ?? null;

    // Grades — current active term only, read-only summary
    const currentTermGrades = activeTerm ? state.grades.filter(g => g.studentId === student.id && g.termId === activeTerm.id) : [];

    return {
      totalRequiredUnits, totalPassedUnits, completionPct,
      currentEnrollments, holds, latestScholastic, currentTermGrades,
    };
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
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advisees.map(student => {
                  const { gwa: termGwa } = activeTerm ? computeGWA(student.id, activeTerm.id) : { gwa: 0 };
                  const { gwa: cumGwa } = computeGWA(student.id);
                  const yearClass = getYearClass(student);
                  const enrollStatus = getEnrollmentStatus(student.id);
                  const currentUnits = getCurrentUnits(student.id);
                  const isExpanded = expandedId === student.id;
                  const detail = isExpanded ? buildAdviseeDetail(student) : null;
                  return (
                    <>
                      <TableRow
                        key={student.id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => setExpandedId(isExpanded ? null : student.id)}
                      >
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
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={e => { e.stopPropagation(); setExpandedId(isExpanded ? null : student.id); }}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>

                      {isExpanded && detail && (
                        <TableRow key={`${student.id}-detail`} className="bg-muted/10 hover:bg-muted/10">
                          <TableCell colSpan={9} className="p-0">
                            <div className="p-4 space-y-4 border-t border-border">

                              {/* Holds & Warnings */}
                              {detail.holds.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Holds & Warnings
                                  </p>
                                  {detail.holds.map(hold => (
                                    <div key={hold.key} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                                      hold.type === 'negative' ? 'bg-destructive/5 border-destructive/30' : 'bg-amber-50 border-amber-300'
                                    }`}>
                                      <div className="min-w-0">
                                        <p className="font-semibold text-foreground">{hold.title}</p>
                                        <p className="text-xs text-muted-foreground">{hold.description}</p>
                                      </div>
                                      <Badge className={hold.type === 'negative' ? 'bg-destructive text-destructive-foreground text-xs flex-shrink-0' : 'bg-amber-100 text-amber-800 border-amber-300 text-xs flex-shrink-0'}>
                                        {hold.type === 'negative' ? 'Negative Hold' : 'Positive Hold'}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Plan of Study progress */}
                                <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                                    <GraduationCap className="w-3.5 h-3.5 text-primary" /> Plan of Study Progress
                                  </p>
                                  {detail.totalRequiredUnits > 0 ? (
                                    <>
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Units completed</span>
                                        <span className="font-semibold text-foreground">{detail.totalPassedUnits} / {detail.totalRequiredUnits}</span>
                                      </div>
                                      <div className="relative w-full bg-muted rounded-full h-2.5 overflow-hidden">
                                        <div className="h-2.5 rounded-full bg-primary transition-all" style={{ width: `${(detail.completionPct * 100).toFixed(1)}%` }} />
                                      </div>
                                      <p className="text-xs text-muted-foreground">{(detail.completionPct * 100).toFixed(1)}% complete</p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Plan of Study not yet configured by OCS for this program.</p>
                                  )}
                                  {detail.latestScholastic && (
                                    <div className="pt-1.5 mt-1.5 border-t border-border/60">
                                      <Badge className={`text-xs border ${scholasticStandingColor(detail.latestScholastic.standing)}`}>
                                        {detail.latestScholastic.standing}
                                      </Badge>
                                    </div>
                                  )}
                                </div>

                                {/* Current enlisted classes */}
                                <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5 text-primary" /> Current Classes{activeTerm ? ` — ${activeTerm.name}` : ''}
                                  </p>
                                  {detail.currentEnrollments.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No classes enlisted this term.</p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {detail.currentEnrollments.map(e => {
                                        const sec = state.sections.find(s => s.id === e.sectionId);
                                        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                                        if (!sec || !course) return null;
                                        return (
                                          <div key={e.id} className="flex items-center justify-between text-xs">
                                            <span>
                                              <span className="font-mono font-semibold text-primary">{course.code}</span>
                                              <span className="text-muted-foreground"> · Sec {sec.sectionCode}</span>
                                            </span>
                                            <Badge variant="outline" className="text-[10px]">
                                              {e.status === 'enrolled' ? 'Finalized' : 'Enlisted'}
                                            </Badge>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Grades this term */}
                              <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                                <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                                  <Award className="w-3.5 h-3.5 text-primary" /> Grades{activeTerm ? ` — ${activeTerm.name}` : ''}
                                </p>
                                {!activeTerm || detail.currentTermGrades.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No grade records for this term yet.</p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {detail.currentTermGrades.map(g => {
                                      const sec = state.sections.find(s => s.id === g.sectionId);
                                      const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                                      if (!course) return null;
                                      const effGrade = g.submitted ? getEffectiveGradeWithRules(g, state.grades, state.sections, state.terms) : null;
                                      return (
                                        <div key={g.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-muted/40">
                                          <span className="font-mono font-medium">{course.code}</span>
                                          {g.submitted
                                            ? <Badge className="text-[10px] bg-secondary/10 text-secondary border-secondary/30 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" />{effGrade ?? '—'}</Badge>
                                            : <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />Pending</Badge>
                                          }
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
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
