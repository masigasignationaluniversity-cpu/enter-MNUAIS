import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Award, GraduationCap, TrendingUp, BookOpen, Info, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  getYearClassification, getPassedUnits, getScholasticStanding,
  getCompletionPercent, scholasticStandingColor, yearClassificationColor,
} from '../../lib/academic';

const gwaColor = (gwa: number) => {
  if (gwa <= 1.5) return 'text-secondary';
  if (gwa <= 2.5) return 'text-foreground';
  if (gwa <= 3.0) return 'text-yellow-600';
  return 'text-destructive';
};

const gwaLabel = (gwa: number, isSenior?: boolean) => {
  if (gwa === 0) return 'N/A';
  // Latin honors only apply to Seniors
  if (isSenior) {
    if (gwa <= 1.25) return 'Summa Cum Laude';
    if (gwa <= 1.5) return 'Magna Cum Laude';
    if (gwa <= 1.75) return 'Cum Laude';
  }
  if (gwa <= 1.45) return 'University Scholar';
  if (gwa <= 1.75) return 'College Scholar';
  if (gwa <= 2.0) return 'Very Good';
  if (gwa <= 2.5) return 'Good';
  if (gwa <= 3.0) return 'Satisfactory';
  return 'Below Average';
};

function getTermHonorific(
  gwa: number,
  gradesArr: { grade: import('../../lib/types').Grade; section: import('../../lib/types').Section; course: import('../../lib/types').Course }[],
  termSemester?: string,
  hasApprovedUnderload?: boolean
): 'University Scholar' | 'College Scholar' | null {
  if (gwa <= 0) return null;
  // No scholar standing in Mid-Term
  if (termSemester === 'Mid-Term') return null;
  const unitsTaken = gradesArr
    .filter(g => !g.course.isPE && !g.course.isNSTP)
    .reduce((sum, g) => sum + g.course.units + (g.course.labUnits ?? 0), 0);
  // Require 15+ units unless student has an approved underload application
  if (unitsTaken < 15 && !hasApprovedUnderload) return null;
  const hasBelow3 = gradesArr.some(g => {
    const effective = (g.grade.removalSubmitted && g.grade.removalGrade) ? g.grade.removalGrade : g.grade.grade;
    if (!effective) return false;
    const n = parseFloat(effective as string);
    if (!isNaN(n) && n > 3.0) return true;
    if (effective === 'F' || effective === '5') return true;
    return false;
  });
  const hasINC = gradesArr.some(g => g.grade.grade === 'INC');
  if (hasBelow3 || hasINC) return null;
  if (gwa <= 1.45) return 'University Scholar';
  if (gwa <= 1.75) return 'College Scholar';
  return null;
}

export default function StudentProfile() {
  const { state, computeGWA, canStudentViewGrades, getStudentGrades } = useApp();
  const me = state.currentUser;
  if (!me) return null;

  const { gwa: overallGWA, perTerm } = computeGWA(me.id);
  const initials = me.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // ── Year classification ────────────────────────────────────────────────────
  const degreeProgram = state.degreePrograms.find(p => p.name === me.program || p.id === me.program);
  const degreeType = degreeProgram?.degreeType;
  const isGradProgram = degreeType === 'masters' || degreeType === 'doctorate';
  const totalProgramUnits = degreeProgram?.totalUnits ?? 0;
  const passedUnits = getPassedUnits(me.id, state.grades, state.sections, state.courses, state.enrollments);
  const rawYearClass = totalProgramUnits > 0 ? getYearClassification(passedUnits, totalProgramUnits) : null;
  // Associate/Certificate: cap at Sophomore; Grad programs: no year class
  const yearClass = isGradProgram ? null :
    degreeType === 'associate_certificate' && rawYearClass && ['Junior', 'Senior'].includes(rawYearClass) ? 'Sophomore' :
    rawYearClass;
  // Senior check: unit-based OR yearLevel field (4th year and above) as fallback
  const isSeniorStudent = yearClass === 'Senior' || (!isGradProgram && me.yearLevel != null && me.yearLevel >= 4);
  const completionPct = totalProgramUnits > 0 ? getCompletionPercent(passedUnits, totalProgramUnits) : 0;

  // ── Academic record summary ────────────────────────────────────────────────
  const allEnrollments = state.enrollments.filter(e => e.studentId === me.id && e.status === 'enrolled');
  const totalEnrolledUnits = allEnrollments.reduce((sum, enr) => {
    const sec = state.sections.find(s => s.id === enr.sectionId);
    const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
    if (!course || course.isPE || course.isNSTP) return sum;
    return sum + course.units;
  }, 0);
  const termsEnrolled = [...new Set(allEnrollments.map(e => state.sections.find(s => s.id === e.sectionId)?.termId).filter(Boolean))].length;

  // ── Scholastic standing per term ───────────────────────────────────────────
  const scholasticPerTerm = state.terms
    .map(term => ({
      term,
      result: getScholasticStanding(me.id, term.id, state.grades, state.sections, state.courses),
      canView: canStudentViewGrades(me.id, term.id),
    }))
    .filter(x => x.result !== null && x.canView);

  const latestScholastic = scholasticPerTerm[scholasticPerTerm.length - 1]?.result ?? null;

  return (
    <PortalLayout title="My Profile">
      <div className="space-y-5">

        {/* ── Hero: Profile Banner ──────────────────────────────────────────── */}
        <div className="portal-panel">
          <div className="portal-panel-header">Student Profile</div>
          <div className="p-6 bg-background">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 border-4 border-primary shadow-lg flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground truncate">{me.name}</h1>
                <p className="text-muted-foreground mt-0.5">{me.email}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {me.studentNumber && <Badge className="bg-secondary text-secondary-foreground text-sm px-3 py-0.5">{me.studentNumber}</Badge>}
                  {me.program && <Badge className="bg-primary/15 text-primary border border-primary/30 text-sm px-3 py-0.5">{me.program}</Badge>}
                  {!isGradProgram && yearClass && <Badge className={`border text-sm px-3 py-0.5 ${yearClassificationColor(yearClass)}`}>{yearClass}</Badge>}
                  {isGradProgram && totalProgramUnits > 0 && <Badge className="border text-sm px-3 py-0.5 bg-primary/10 text-primary border-primary/30">{(completionPct * 100).toFixed(1)}% Complete</Badge>}
                  {latestScholastic && (
                    <Badge className={`border text-sm px-3 py-0.5 ${scholasticStandingColor(latestScholastic.standing)}`}>
                      {latestScholastic.standing}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stat Row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Subjects Enrolled', value: allEnrollments.length, icon: BookOpen },
            { label: 'Terms Enrolled', value: termsEnrolled, icon: GraduationCap },
            { label: 'Units Enrolled', value: totalEnrolledUnits, icon: TrendingUp },
            { label: 'Units Passed', value: passedUnits, icon: Award },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="portal-panel">
              <div className="portal-panel-header">
                <span className="text-xs font-bold leading-tight">{label}</span>
                <Icon size={14} />
              </div>
              <div className="px-3 py-3 bg-background flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Two Column Layout ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: Year Classification + Scholastic Standing + GWA per term */}
          <div className="lg:col-span-2 space-y-5">

            {/* Year Classification / Degree Progress */}
            {totalProgramUnits > 0 ? (
              <div className="portal-panel">
                <div className="portal-panel-header">
                  <GraduationCap size={14} /> {isGradProgram ? 'Degree Progress' : 'Year Classification'}
                </div>
                <div className="p-4 bg-background space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      {isGradProgram ? (
                        <p className="text-3xl font-bold text-foreground">{(completionPct * 100).toFixed(1)}%</p>
                      ) : (
                        <p className="text-3xl font-bold text-foreground">{yearClass}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-semibold text-foreground">{passedUnits}</span> passed units out of{' '}
                        <span className="font-semibold text-foreground">{totalProgramUnits}</span> required
                        {!isGradProgram && <span className="ml-2 font-bold text-primary">({(completionPct * 100).toFixed(1)}% complete)</span>}
                      </p>
                    </div>
                    {!isGradProgram && yearClass && (
                      <Badge className={`text-base px-4 py-1.5 border ${yearClassificationColor(yearClass)}`}>{yearClass}</Badge>
                    )}
                    {isGradProgram && (
                      <Badge className="text-base px-4 py-1.5 border bg-primary/10 text-primary border-primary/30">
                        {degreeType === 'masters' ? "Master's" : 'Doctorate'}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="relative w-full bg-muted rounded-full h-4 overflow-hidden">
                      <div
                        className="h-4 rounded-full bg-primary transition-all"
                        style={{ width: `${(completionPct * 100).toFixed(1)}%` }}
                      />
                      {!isGradProgram && [25, 50, 75].map(pct => (
                        <div key={pct} className="absolute top-0 h-full w-px bg-border/60" style={{ left: `${pct}%` }} />
                      ))}
                    </div>
                    {!isGradProgram && (
                      <div className="grid grid-cols-4 text-xs text-muted-foreground">
                        <span className="font-medium">Freshman<br />&lt;25%</span>
                        <span className="text-center font-medium">Sophomore<br />25–50%</span>
                        {degreeType !== 'associate_certificate' && <>
                          <span className="text-center font-medium">Junior<br />50–75%</span>
                          <span className="text-right font-medium">Senior<br />≥75%</span>
                        </>}
                        {degreeType === 'associate_certificate' && <>
                          <span className="text-center font-medium text-muted-foreground/50">—</span>
                          <span className="text-right font-medium text-muted-foreground/50">—</span>
                        </>}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                    Classification is based on the percentage of total program units satisfactorily completed (grade ≤ 3.0). PE and NSTP are excluded.
                  </p>
                </div>
              </div>
            ) : (
              <div className="portal-panel">
                <div className="portal-panel-header">
                  <GraduationCap size={14} /> Year Classification
                </div>
                <div className="p-4 bg-background flex items-center gap-3 text-muted-foreground">
                  <Info size={16} className="flex-shrink-0" />
                  <p className="text-sm">Year classification is unavailable until your program's total required units are configured by admin.</p>
                </div>
              </div>
            )}

            {/* Scholastic Standing per term */}
            {scholasticPerTerm.length > 0 && (
              <div className="portal-panel">
                <div className="portal-panel-header">
                  <ShieldCheck size={14} /> Scholastic Standing
                </div>
                <div className="p-4 bg-background space-y-3">
                  {latestScholastic && (
                    <div className={`flex items-center gap-4 p-4 rounded-xl border ${scholasticStandingColor(latestScholastic.standing)}`}>
                      {latestScholastic.standing === 'Good Standing'
                        ? <ShieldCheck size={22} className="flex-shrink-0" />
                        : <AlertTriangle size={22} className="flex-shrink-0" />}
                      <div className="flex-1">
                        <p className="font-bold text-lg">{latestScholastic.standing}</p>
                        <p className="text-sm mt-0.5 opacity-80">
                          {latestScholastic.failedUnits > 0
                            ? `${latestScholastic.failedUnits} of ${latestScholastic.totalAcademicUnits} academic units below 3.0 (${(latestScholastic.failedPercent * 100).toFixed(0)}% failed)`
                            : `All ${latestScholastic.totalAcademicUnits} academic units passed this term`}
                        </p>
                      </div>
                      <Badge className="text-xs opacity-80 border-current">Latest</Badge>
                    </div>
                  )}
                  <div className="space-y-2">
                    {scholasticPerTerm.map(({ term, result }) => {
                      if (!result) return null;
                      return (
                        <div key={term.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/40 border border-border">
                          <div>
                            <p className="font-medium">{term.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Failed: {result.failedUnits}/{result.totalAcademicUnits} units ({(result.failedPercent * 100).toFixed(0)}%)
                            </p>
                          </div>
                          <Badge className={`text-xs border ${scholasticStandingColor(result.standing)}`}>{result.standing}</Badge>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                    INC and DRP grades are excluded. Grade 4 counts as failing until the completion exam is passed (3.0) or failed (5.0).
                  </p>
                </div>
              </div>
            )}

            {/* GWA Per Semester */}
            <div className="portal-panel">
              <div className="portal-panel-header">
                <Award size={14} /> GWA Per Semester
              </div>
              <div className="p-4 bg-background">
                {perTerm.length === 0 ? (
                  <p className="text-muted-foreground py-6 text-center">No graded terms yet.</p>
                ) : (
                  <div className="space-y-3">
                    {perTerm.map(({ term, gwa }) => {
                      const canView = canStudentViewGrades(me.id, term.id);
                      const standing = scholasticPerTerm.find(s => s.term.id === term.id)?.result ?? null;
                      const termGrades = getStudentGrades(me.id, term.id);
                      const hasApprovedUnderload = (state.underloadApplications ?? []).some(
                        a => a.studentId === me.id && a.termId === term.id && a.status === 'approved'
                      );
                      const honorific = canView ? getTermHonorific(gwa, termGrades, term.semester, hasApprovedUnderload) : null;
                      return (
                        <div key={term.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/40 border border-border">
                          <div className="flex items-center gap-3">
                            <GraduationCap size={18} className={term.isActive ? 'text-secondary' : 'text-muted-foreground'} />
                            <div>
                              <p className="font-semibold">{term.name}</p>
                              <p className="text-xs text-muted-foreground">AY {term.academicYear}</p>
                              {standing && (
                                <Badge className={`mt-1 text-xs border ${scholasticStandingColor(standing.standing)}`}>{standing.standing}</Badge>
                              )}
                            </div>
                          </div>
                          {canView ? (
                            <div className="text-right">
                              <p className={`text-2xl font-bold ${gwaColor(gwa)}`}>{gwa.toFixed(2)}</p>
                              {honorific ? (
                                <Badge className={`text-xs mt-0.5 ${honorific === 'University Scholar' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-blue-100 text-blue-800 border-blue-300'} border`}>
                                  {honorific}
                                </Badge>
                              ) : (
                                <p className="text-xs text-muted-foreground">{gwaLabel(gwa)}</p>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Cumulative GWA + Scholastic Reference */}
          <div className="space-y-5">

            {/* Cumulative GWA */}
            <div className="portal-panel">
              <div className="portal-panel-header">
                <TrendingUp size={14} /> Cumulative GWA
              </div>
              <div className="p-4 bg-background space-y-4">
                <div className="text-center py-4 border border-border rounded-xl bg-muted/20">
                  <p className={`text-6xl font-bold ${gwaColor(overallGWA)}`}>
                    {overallGWA > 0 ? overallGWA.toFixed(2) : '—'}
                  </p>
                  <p className={`text-base font-semibold mt-2 ${gwaColor(overallGWA)}`}>
                    {overallGWA > 0 ? gwaLabel(overallGWA, isSeniorStudent) : 'Not yet available'}
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Passed units</span>
                    <span className="font-semibold">{passedUnits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Graded terms</span>
                    <span className="font-semibold">{perTerm.length}</span>
                  </div>
                  {totalProgramUnits > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-semibold">{(completionPct * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-muted/40 flex items-start gap-2">
                  <Info size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Removal grades (if submitted) are used. PE and NSTP excluded. Formula: Σ(Grade × Units) / Σ(Units)
                  </p>
                </div>
              </div>
            </div>

            {/* Honorific Scholarship Reference */}
            <div className="portal-panel">
              <div className="portal-panel-header">
                <ShieldCheck size={14} /> Honorific Scholarships
              </div>
              <div className="p-4 bg-background space-y-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 border text-xs">University Scholar</Badge>
                      <span className="text-xs text-muted-foreground">President's List</span>
                    </div>
                    <p className="text-xs text-yellow-800">GWA of <strong>1.45 or better</strong> at end of semester.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-sky-50/70 border border-sky-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300 border text-xs">College Scholar</Badge>
                      <span className="text-xs text-muted-foreground">Dean's List</span>
                    </div>
                    <p className="text-xs text-blue-800">GWA of <strong>1.46–1.75</strong> at end of semester (not University Scholar).</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1.5 pt-1 border-t border-border">
                  <p className="font-semibold text-foreground">Requirements:</p>
                  <p>1. At least <strong>15 units</strong> of academic credit taken the previous semester.</p>
                  <p>2. <strong>No grade below 3.00</strong> in any subject.</p>
                  <p>3. No <strong>INC</strong> grade (must be completed by end of semester).</p>
                  <p className="italic text-muted-foreground pt-1">These scholarships do not entitle holders to tuition waivers or discounts. Effectivity is for the semester the GWA is obtained.</p>
                </div>
                {isSeniorStudent && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-foreground mb-2">Latin Honors (at graduation, Senior year):</p>
                    <div className="space-y-1.5">
                      {[
                        { label: 'Summa Cum Laude', range: 'GWA ≤ 1.25', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
                        { label: 'Magna Cum Laude', range: 'GWA ≤ 1.50', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
                        { label: 'Cum Laude', range: 'GWA ≤ 1.75', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                      ].map(({ label, range, color }) => (
                        <div key={label} className="flex items-center gap-2">
                          <Badge className={`text-xs border flex-shrink-0 ${color}`}>{label}</Badge>
                          <span className="text-xs text-muted-foreground">{range}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
