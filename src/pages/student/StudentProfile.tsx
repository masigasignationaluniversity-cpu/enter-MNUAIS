import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Award, User, GraduationCap, TrendingUp, BookOpen, Info, ShieldCheck, AlertTriangle } from 'lucide-react';
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

const gwaLabel = (gwa: number) => {
  if (gwa === 0) return 'N/A';
  if (gwa <= 1.25) return 'Summa Cum Laude';
  if (gwa <= 1.5) return 'Magna Cum Laude';
  if (gwa <= 1.75) return 'Cum Laude';
  if (gwa <= 2.0) return 'Excellent';
  if (gwa <= 2.5) return 'Good';
  if (gwa <= 3.0) return 'Satisfactory';
  return 'Below Average';
};

export default function StudentProfile() {
  const { state, computeGWA, canStudentViewGrades } = useApp();
  const me = state.currentUser;
  if (!me) return null;

  const { gwa: overallGWA, perTerm } = computeGWA(me.id);
  const initials = me.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // ── Year classification ────────────────────────────────────────────────────
  const degreeProgram = state.degreePrograms.find(p => p.name === me.program);
  const totalProgramUnits = degreeProgram?.totalUnits ?? 0;
  const passedUnits = getPassedUnits(me.id, state.grades, state.sections, state.courses);
  const yearClass = totalProgramUnits > 0 ? getYearClassification(passedUnits, totalProgramUnits) : null;
  const completionPct = totalProgramUnits > 0 ? getCompletionPercent(passedUnits, totalProgramUnits) : 0;

  // ── Academic record summary ────────────────────────────────────────────────
  const allEnrollments = state.enrollments.filter(e => e.studentId === me.id && e.status !== 'dropped');
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
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border-primary/20">
          <CardContent className="p-6">
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
                  <Badge variant="outline" className="text-sm px-3 py-0.5">Year {me.yearLevel}</Badge>
                  {yearClass && <Badge className={`border text-sm px-3 py-0.5 ${yearClassificationColor(yearClass)}`}>{yearClass}</Badge>}
                  {latestScholastic && (
                    <Badge className={`border text-sm px-3 py-0.5 ${scholasticStandingColor(latestScholastic.standing)}`}>
                      {latestScholastic.standing}
                    </Badge>
                  )}
                </div>
              </div>
              {/* GWA highlight in banner */}
              {overallGWA > 0 && (
                <div className="text-right flex-shrink-0 hidden md:block">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Cumulative GWA</p>
                  <p className={`text-5xl font-bold mt-1 ${gwaColor(overallGWA)}`}>{overallGWA.toFixed(2)}</p>
                  <p className={`text-sm font-semibold mt-0.5 ${gwaColor(overallGWA)}`}>{gwaLabel(overallGWA)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Stat Row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Subjects Enrolled', value: allEnrollments.length, icon: BookOpen },
            { label: 'Terms Enrolled', value: termsEnrolled, icon: GraduationCap },
            { label: 'Units Enrolled', value: totalEnrolledUnits, icon: TrendingUp },
            { label: 'Units Passed', value: passedUnits, icon: Award },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Two Column Layout ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: Year Classification + Scholastic Standing per term */}
          <div className="lg:col-span-2 space-y-5">

            {/* Year Classification */}
            {totalProgramUnits > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap size={20} className="text-primary" />
                    Year Classification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-foreground">{yearClass}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-semibold text-foreground">{passedUnits}</span> passed units out of{' '}
                        <span className="font-semibold text-foreground">{totalProgramUnits}</span> required
                        <span className="ml-2 font-bold text-primary">({(completionPct * 100).toFixed(1)}% complete)</span>
                      </p>
                    </div>
                    {yearClass && (
                      <Badge className={`text-base px-4 py-1.5 border ${yearClassificationColor(yearClass)}`}>{yearClass}</Badge>
                    )}
                  </div>
                  {/* Progress bar with markers */}
                  <div className="space-y-2">
                    <div className="relative w-full bg-muted rounded-full h-4 overflow-hidden">
                      <div
                        className="h-4 rounded-full bg-primary transition-all"
                        style={{ width: `${(completionPct * 100).toFixed(1)}%` }}
                      />
                      {/* Markers */}
                      {[25, 50, 75].map(pct => (
                        <div key={pct} className="absolute top-0 h-full w-px bg-border/60" style={{ left: `${pct}%` }} />
                      ))}
                    </div>
                    <div className="grid grid-cols-4 text-xs text-muted-foreground">
                      <span className="font-medium">Freshman<br />&lt;25%</span>
                      <span className="text-center font-medium">Sophomore<br />25–50%</span>
                      <span className="text-center font-medium">Junior<br />50–75%</span>
                      <span className="text-right font-medium">Senior<br />≥75%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                    Classification is based on the percentage of total program units satisfactorily completed (grade ≤ 3.0). PE and NSTP are excluded.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-5 flex items-center gap-3 text-muted-foreground">
                  <Info size={16} className="flex-shrink-0" />
                  <p className="text-sm">Year classification is unavailable until your program's total required units are configured by admin.</p>
                </CardContent>
              </Card>
            )}

            {/* Scholastic Standing per term */}
            {scholasticPerTerm.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck size={20} className="text-primary" />
                    Scholastic Standing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
                </CardContent>
              </Card>
            )}

            {/* GWA Per Semester */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Award size={20} className="text-secondary" />
                  GWA Per Semester
                </CardTitle>
              </CardHeader>
              <CardContent>
                {perTerm.length === 0 ? (
                  <p className="text-muted-foreground py-6 text-center">No graded terms yet.</p>
                ) : (
                  <div className="space-y-3">
                    {perTerm.map(({ term, gwa }) => {
                      const canView = canStudentViewGrades(me.id, term.id);
                      const standing = scholasticPerTerm.find(s => s.term.id === term.id)?.result ?? null;
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
                              <p className="text-xs text-muted-foreground">{gwaLabel(gwa)}</p>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Cumulative GWA + Scholastic Reference */}
          <div className="space-y-5">

            {/* Cumulative GWA card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={20} className="text-primary" />
                  Cumulative GWA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4 border border-border rounded-xl bg-muted/20">
                  <p className={`text-6xl font-bold ${gwaColor(overallGWA)}`}>
                    {overallGWA > 0 ? overallGWA.toFixed(2) : '—'}
                  </p>
                  <p className={`text-base font-semibold mt-2 ${gwaColor(overallGWA)}`}>
                    {overallGWA > 0 ? gwaLabel(overallGWA) : 'Not yet available'}
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
              </CardContent>
            </Card>

            {/* Scholastic Standing Reference */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User size={18} className="text-primary" />
                  Standing Reference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {([
                    { s: 'Good Standing', desc: 'Fails < 25% of academic units', color: 'bg-green-100 text-green-800 border-green-300' },
                    { s: 'Warning', desc: 'Fails 25%–49% of academic units', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
                    { s: 'Probation', desc: 'Fails 50%–75%; load limited by Dean', color: 'bg-orange-100 text-orange-800 border-orange-300' },
                    { s: 'Dismissal', desc: 'Fails 76%–99%; dropped from rolls', color: 'bg-red-100 text-red-800 border-red-300' },
                    { s: 'Permanent Disqualification', desc: 'Fails 100%; barred from readmission', color: 'bg-red-200 text-red-900 border-red-400' },
                  ] as const).map(({ s, desc, color }) => (
                    <div key={s} className="flex items-start gap-2">
                      <Badge className={`text-xs border flex-shrink-0 mt-0.5 ${color}`}>{s}</Badge>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    INC and DRP excluded. Grade 4 counts as failing until removal is completed.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
