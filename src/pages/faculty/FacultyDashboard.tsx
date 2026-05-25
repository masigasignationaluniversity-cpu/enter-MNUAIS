import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { BookMarked, Users, Award, Star, CheckCircle, Clock } from 'lucide-react';

export default function FacultyDashboard() {
  const { state, getActiveTerm } = useApp();
  const me = state.currentUser;
  if (!me) return null;
  const activeTerm = getActiveTerm();

  const myClasses = activeTerm
    ? state.sections.filter(s => s.facultyId === me.id && s.termId === activeTerm.id)
    : [];

  const totalStudents = myClasses.reduce((sum, sec) => {
    return sum + state.enrollments.filter(e => e.sectionId === sec.id && e.status !== 'dropped').length;
  }, 0);

  const pendingGrades = myClasses.reduce((sum, sec) => {
    const grds = state.grades.filter(g => g.sectionId === sec.id && !g.submitted && g.grade !== null);
    return sum + grds.length;
  }, 0);

  const evals = activeTerm ? state.evaluations.filter(e => e.facultyId === me.id && e.termId === activeTerm.id) : [];
  const avgRating = evals.length > 0
    ? (evals.reduce((sum, e) => sum + e.overallRating, 0) / evals.length).toFixed(2)
    : 'N/A';

  const stats = [
    { label: 'My Classes', value: myClasses.length, icon: <BookMarked size={20} />, color: 'text-primary' },
    { label: 'Total Students', value: totalStudents, icon: <Users size={20} />, color: 'text-secondary' },
    { label: 'Grades to Submit', value: pendingGrades, icon: <Award size={20} />, color: pendingGrades > 0 ? 'text-yellow-600' : 'text-secondary' },
    { label: 'Avg Eval Rating', value: avgRating, icon: <Star size={20} />, color: 'text-primary' },
  ];

  return (
    <PortalLayout title="Faculty Dashboard">
      <div className="space-y-6">
        {activeTerm && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <CheckCircle size={16} className="text-primary" />
            <span className="text-sm font-medium text-foreground">Active Term: <strong>{activeTerm.name}</strong></span>
            <div className="ml-auto flex gap-2">
              <Badge className={activeTerm.controls.gradeSubmissionOpen ? 'bg-secondary/10 text-secondary border-secondary/30' : 'bg-muted text-muted-foreground'}>
                Grade Submission {activeTerm.controls.gradeSubmissionOpen ? 'Open' : 'Closed'}
              </Badge>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <Card key={s.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className={s.color}>{s.icon}</span>
                  <span className="text-2xl font-bold text-foreground">{s.value}</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* My classes this term */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My Classes — {activeTerm?.name ?? 'No Active Term'}</CardTitle>
          </CardHeader>
          <CardContent>
            {myClasses.length === 0
              ? <p className="text-sm text-muted-foreground py-4 text-center">No classes assigned for this term.</p>
              : (
                <div className="space-y-3">
                  {myClasses.map(sec => {
                    const course = state.courses.find(c => c.id === sec.courseId);
                    const grades = state.grades.filter(g => g.sectionId === sec.id);
                    const submitted = grades.filter(g => g.submitted).length;
                    const encoded = grades.filter(g => g.grade !== null).length;
                    const sectionEnrollments = state.enrollments.filter(e => e.sectionId === sec.id && e.status !== 'dropped');
                    const finalizedStudents = sectionEnrollments.filter(e => e.status === 'enrolled').length;
                    const totalEnlisted = sectionEnrollments.length;
                    return (
                      <div key={sec.id} className="p-4 rounded-lg border border-border bg-muted/30">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-bold text-foreground">{course?.code} — Sec {sec.sectionCode}</p>
                            <p className="text-sm text-muted-foreground">{course?.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {sec.schedule.days.join('')} {sec.schedule.startTime}–{sec.schedule.endTime} | {sec.schedule.room}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="text-center">
                              <p className="font-bold text-foreground">{finalizedStudents}<span className="text-muted-foreground font-normal text-xs">/{totalEnlisted}</span></p>
                              <p className="text-xs text-muted-foreground">Finalized</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-foreground">{encoded}</p>
                              <p className="text-xs text-muted-foreground">Encoded</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-foreground">{submitted}</p>
                              <p className="text-xs text-muted-foreground">Submitted</p>
                            </div>
                          </div>
                        </div>
                        {grades.length > 0 && (
                          <div className="mt-3">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-secondary rounded-full transition-all"
                                style={{ width: `${Math.round((submitted / grades.length) * 100)}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {submitted}/{grades.length} grades submitted
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            }
          </CardContent>
        </Card>

        {/* Recent evaluations */}
        {evals.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star size={16} className="text-yellow-500" />
                Student Evaluations ({evals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">{avgRating}</p>
                  <p className="text-xs text-muted-foreground">Average Rating</p>
                </div>
                <div className="flex-1 space-y-1">
                  {[5,4,3,2,1].map(r => {
                    const cnt = evals.filter(e => Math.round(e.overallRating) === r).length;
                    const pct = evals.length > 0 ? (cnt / evals.length) * 100 : 0;
                    return (
                      <div key={r} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-muted-foreground">{r}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-4 text-muted-foreground text-right">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PortalLayout>
  );
}
