import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Award, User, GraduationCap, TrendingUp, BookOpen, Info, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { GradeValue } from '../../lib/types';
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

  // ── Year classification ─────────────────────────────────────────────────────
  const degreeProgram = state.degreePrograms.find(p => p.name === me.program);
  const totalProgramUnits = degreeProgram?.totalUnits ?? 0;
  const passedUnits = getPassedUnits(me.id, state.grades, state.sections, state.courses);
  const yearClass = totalProgramUnits > 0 ? getYearClassification(passedUnits, totalProgramUnits) : null;
  const completionPct = totalProgramUnits > 0 ? getCompletionPercent(passedUnits, totalProgramUnits) : 0;

  // ── Academic record summary ─────────────────────────────────────────────────
  const allEnrollments = state.enrollments.filter(e => e.studentId === me.id && e.status !== 'dropped');
  const totalEnrolledUnits = allEnrollments.reduce((sum, enr) => {
    const sec = state.sections.find(s => s.id === enr.sectionId);
    const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
    if (!course || course.isPE || course.isNSTP) return sum;
    return sum + course.units;
  }, 0);

  // ── Scholastic standing per term ────────────────────────────────────────────
  const scholasticPerTerm = state.terms
    .map(term => ({
      term,
      result: getScholasticStanding(me.id, term.id, state.grades, state.sections, state.courses),
      canView: canStudentViewGrades(me.id, term.id),
    }))
    .filter(x => x.result !== null && x.canView);

  // Latest scholastic standing (most recent term that has results)
  const latestScholastic = scholasticPerTerm[scholasticPerTerm.length - 1]?.result ?? null;

  return (
    <PortalLayout title="My Profile">
      <div className="space-y-6 max-w-2xl">

        {/* Profile Card */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-5">
              <Avatar className="h-20 w-20 border-4 border-primary">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">{me.name}</h2>
                <p className="text-muted-foreground mt-0.5 text-sm">{me.email}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {me.studentNumber && <Badge className="bg-secondary text-secondary-foreground">{me.studentNumber}</Badge>}
                  {me.program && <Badge className="bg-primary/10 text-primary border-primary/30">{me.program}</Badge>}
                  <Badge variant="outline">Year {me.yearLevel}</Badge>
                  {yearClass && (
                    <Badge className={`border ${yearClassificationColor(yearClass)}`}>{yearClass}</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Year Classification Card */}
        {totalProgramUnits > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap size={18} className="text-primary" />
                Year Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">{yearClass}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {passedUnits} passed units out of {totalProgramUnits} required
                    <span className="ml-1 font-medium text-foreground">({(completionPct * 100).toFixed(1)}%)</span>
                  </p>
                </div>
                {yearClass && <Badge className={`text-sm px-3 py-1 border ${yearClassificationColor(yearClass)}`}>{yearClass}</Badge>}
              </div>
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 rounded-full bg-primary transition-all"
                  style={{ width: `${(completionPct * 100).toFixed(1)}%` }}
                />
              </div>
              <div className="grid grid-cols-4 text-xs text-muted-foreground mt-1">
                <span>Freshman<br />&lt;25%</span>
                <span className="text-center">Sophomore<br />25–50%</span>
                <span className="text-center">Junior<br />50–75%</span>
                <span className="text-right">Senior<br />≥75%</span>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2 mt-1">
                Classification is based on the percentage of total program units you have satisfactorily completed (grade ≤ 3.0). PE and NSTP excluded.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Info size={14} className="flex-shrink-0" />
              Year classification is unavailable until your program's total required units are configured by admin.
            </CardContent>
          </Card>
        )}

        {/* Scholastic Standing */}
        {scholasticPerTerm.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary" />
                Scholastic Standing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Latest standing highlight */}
              {latestScholastic && (
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${scholasticStandingColor(latestScholastic.standing)}`}>
                  {latestScholastic.standing === 'Good Standing'
                    ? <ShieldCheck size={18} />
                    : <AlertTriangle size={18} />
                  }
                  <div className="flex-1">
                    <p className="font-bold">{latestScholastic.standing}</p>
                    <p className="text-xs mt-0.5 opacity-80">
                      {latestScholastic.failedUnits > 0
                        ? `${latestScholastic.failedUnits} of ${latestScholastic.totalAcademicUnits} academic units below 3.0 (${(latestScholastic.failedPercent * 100).toFixed(0)}%)`
                        : `All ${latestScholastic.totalAcademicUnits} academic units passed`
                      }
                    </p>
                  </div>
                  <span className="text-xs opacity-70">Latest</span>
                </div>
              )}
              {/* Per-term standings */}
              <div className="space-y-2">
                {scholasticPerTerm.map(({ term, result }) => {
                  if (!result) return null;
                  return (
                    <div key={term.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
                      <div>
                        <p className="text-sm font-medium">{term.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Failed: {result.failedUnits}/{result.totalAcademicUnits} units ({(result.failedPercent * 100).toFixed(0)}%)
                        </p>
                      </div>
                      <Badge className={`text-xs border ${scholasticStandingColor(result.standing)}`}>{result.standing}</Badge>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
                INC and DRP grades are excluded. Grade 4 counts as failing until the completion exam is taken and passed.
                Grade of 5 is always counted as failing.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Overall GWA */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              Cumulative GWA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className={`text-5xl font-bold ${gwaColor(overallGWA)}`}>
                  {overallGWA > 0 ? overallGWA.toFixed(2) : 'N/A'}
                </p>
                <p className={`text-sm font-semibold mt-1 ${gwaColor(overallGWA)}`}>
                  {overallGWA > 0 ? gwaLabel(overallGWA) : 'Not yet available'}
                </p>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Passed units (excl. PE/NSTP)</span>
                  <span className="font-semibold text-foreground">{passedUnits}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Terms with grades</span>
                  <span className="font-semibold text-foreground">{perTerm.length}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-accent border border-accent-foreground/10 flex items-start gap-2">
              <Info size={14} className="text-accent-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-accent-foreground/80">
                GWA uses the effective grade (removal grade if officially submitted). PE and NSTP are excluded.
                Formula: Σ(Grade × Units) / Σ(Units)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Per Semester GWA */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award size={18} className="text-secondary" />
              GWA Per Semester
            </CardTitle>
          </CardHeader>
          <CardContent>
            {perTerm.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No graded terms yet.</p>
            ) : (
              <div className="space-y-3">
                {perTerm.map(({ term, gwa }) => {
                  const canView = canStudentViewGrades(me.id, term.id);
                  const standing = scholasticPerTerm.find(s => s.term.id === term.id)?.result ?? null;
                  return (
                    <div key={term.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                      <div className="flex items-center gap-3">
                        <GraduationCap size={16} className={term.isActive ? 'text-secondary' : 'text-muted-foreground'} />
                        <div>
                          <p className="font-semibold text-foreground text-sm">{term.name}</p>
                          <p className="text-xs text-muted-foreground">AY {term.academicYear}</p>
                          {standing && (
                            <Badge className={`mt-0.5 text-xs border ${scholasticStandingColor(standing.standing)}`}>{standing.standing}</Badge>
                          )}
                        </div>
                      </div>
                      {canView ? (
                        <div className="text-right">
                          <p className={`text-xl font-bold ${gwaColor(gwa)}`}>{gwa.toFixed(2)}</p>
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

        {/* Academic record summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen size={18} className="text-primary" />
              Academic Record Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Subjects', value: allEnrollments.length },
                { label: 'Terms Enrolled', value: [...new Set(allEnrollments.map(e => {
                  const sec = state.sections.find(s => s.id === e.sectionId);
                  return sec?.termId;
                }))].filter(Boolean).length },
                { label: 'Units Enrolled', value: totalEnrolledUnits },
                { label: 'Units Passed', value: passedUnits },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-lg bg-muted/40 border border-border text-center">
                  <p className="text-2xl font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Scholastic Standing Reference */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User size={18} className="text-primary" />
              Scholastic Standing Reference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              {([
                { s: 'Good Standing', desc: 'Passes ≥ 75% of academic units (fails < 25%)', color: 'bg-green-100 text-green-800 border-green-300' },
                { s: 'Warning', desc: 'Fails 25%–49% of academic units', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
                { s: 'Probation', desc: 'Fails 50%–75% of academic units; unit load limited', color: 'bg-orange-100 text-orange-800 border-orange-300' },
                { s: 'Dismissal', desc: 'Fails 76%–99% of academic units; dropped from rolls', color: 'bg-red-100 text-red-800 border-red-300' },
                { s: 'Permanent Disqualification', desc: 'Fails 100% of academic units; permanently barred from readmission', color: 'bg-red-200 text-red-900 border-red-400' },
              ] as const).map(({ s, desc, color }) => (
                <div key={s} className="flex items-start gap-2">
                  <Badge className={`text-xs border flex-shrink-0 mt-0.5 ${color}`}>{s}</Badge>
                  <span className="text-muted-foreground">{desc}</span>
                </div>
              ))}
              <p className="text-muted-foreground pt-1 border-t border-border mt-2">
                INC grades are not counted. Grade 4 counts as failing until removed (final grade of 3.0 or 5.0). DRP grades are excluded.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
