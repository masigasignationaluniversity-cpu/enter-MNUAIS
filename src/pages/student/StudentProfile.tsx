import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Award, User, GraduationCap, TrendingUp, BookOpen, Info } from 'lucide-react';

export default function StudentProfile() {
  const { state, computeGWA, canStudentViewGrades } = useApp();
  const me = state.currentUser!;
  const { gwa: overallGWA, perTerm } = computeGWA(me.id);
  const initials = me.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

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

  const allEnrollments = state.enrollments.filter(e => e.studentId === me.id && e.status !== 'dropped');
  const totalUnits = allEnrollments.reduce((sum, enr) => {
    const sec = state.sections.find(s => s.id === enr.sectionId);
    const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
    if (!course || course.isPE || course.isNSTP) return sum;
    return sum + course.units;
  }, 0);

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
                <p className="text-muted-foreground mt-0.5">{me.email}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className="bg-secondary text-secondary-foreground">{me.studentNumber}</Badge>
                  <Badge className="bg-primary/10 text-primary border-primary/30">{me.program}</Badge>
                  <Badge variant="outline">Year {me.yearLevel}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                  <span>Total units (excl. PE/NSTP)</span>
                  <span className="font-semibold text-foreground">{totalUnits}</span>
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
                GWA is computed only from graded courses. PE and NSTP courses are excluded from the computation.
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
                  return (
                    <div key={term.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                      <div className="flex items-center gap-3">
                        <GraduationCap size={16} className={term.isActive ? 'text-secondary' : 'text-muted-foreground'} />
                        <div>
                          <p className="font-semibold text-foreground text-sm">{term.name}</p>
                          <p className="text-xs text-muted-foreground">AY {term.academicYear}</p>
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
                { label: 'Total Units', value: totalUnits },
                {
                  label: 'Grades Submitted', value: state.grades.filter(g =>
                    g.studentId === me.id && g.submitted
                  ).length
                },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-lg bg-muted/40 border border-border text-center">
                  <p className="text-2xl font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
