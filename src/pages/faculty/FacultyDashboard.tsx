import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import DashboardAnnouncements from '../../components/shared/DashboardAnnouncements';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { BookOpen, Star, Users, CheckCircle } from 'lucide-react';

export default function FacultyDashboard() {
  const { state, getActiveTerm } = useApp();
  const me = state.currentUser;
  if (!me) return null;
  const activeTerm = getActiveTerm();

  const myClasses = activeTerm
    ? state.sections.filter(s => s.facultyId === me.id && s.termId === activeTerm.id)
    : [];

  const totalStudents = myClasses.reduce((sum, sec) => {
    return sum + state.enrollments.filter(e => e.sectionId === sec.id && e.status === 'enrolled').length;
  }, 0);

  const avgRating = (() => {
    if (!activeTerm) return 0;
    const termEvals = state.evaluations.filter(e => e.facultyId === me.id && e.termId === activeTerm.id);
    if (termEvals.length === 0) return 0;
    let totalScore = 0; let totalQ = 0;
    termEvals.forEach(ev => { ev.responses.forEach(r => { totalScore += r.rating; totalQ += 1; }); });
    return totalQ > 0 ? totalScore / totalQ : 0;
  })();

  const gradesSubmitted = activeTerm
    ? myClasses.reduce((sum, sec) => sum + (state.grades.some(g => g.sectionId === sec.id && g.submitted) ? 1 : 0), 0)
    : 0;

  const stats = [
    { label: 'Active Sections', value: myClasses.length, icon: <BookOpen size={16} />, color: 'text-secondary' },
    { label: 'Total Students', value: totalStudents, icon: <Users size={16} />, color: 'text-foreground' },
    { label: 'Avg Rating', value: avgRating > 0 ? avgRating.toFixed(2) : 'N/A', icon: <Star size={16} />, color: 'text-yellow-600' },
    { label: 'Grades Submitted', value: `${gradesSubmitted}/${myClasses.length}`, icon: <CheckCircle size={16} />, color: 'text-secondary' },
  ];

  return (
    <PortalLayout title="Faculty Dashboard">
      <div className="space-y-6">
        {/* Guide button */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => window.open('/guide', '_blank')}>
            <BookOpen size={14} /> User Guide / Gabay
          </Button>
        </div>
        {/* Welcome + Announcements */}
        <DashboardAnnouncements portalSettings={state.portalSettings} user={me} />

        {/* Stat Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="portal-panel">
              <div className="portal-panel-header">
                <span className="text-xs font-bold leading-tight">{s.label}</span>
                <span className={s.color}>{s.icon}</span>
              </div>
              <div className="px-3 py-3 bg-background">
                <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* My Classes */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            My Classes — {activeTerm?.name ?? 'No Active Term'}
          </div>
          <div className="p-4 bg-background">
            {myClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No classes assigned for this term.</p>
            ) : (
              <div className="space-y-2">
                {myClasses.map(sec => {
                  const course = state.courses.find(c => c.id === sec.courseId);
                  const enrolled = state.enrollments.filter(e => e.sectionId === sec.id && e.status === 'enrolled').length;
                  const gradesOut = state.grades.some(g => g.sectionId === sec.id && g.submitted);
                  return (
                    <div key={sec.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border flex-wrap gap-2">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{course?.code} — {course?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Sec {sec.sectionCode} | {sec.schedule.days.join('')} {sec.schedule.startTime}–{sec.schedule.endTime}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">{enrolled} students</Badge>
                        {gradesOut && <Badge className="bg-secondary/10 text-secondary border-secondary/30 text-xs flex items-center gap-1"><CheckCircle size={10} /> Grades Out</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Evaluations summary */}
        {activeTerm && (
          <div className="portal-panel">
            <div className="portal-panel-header">Student Evaluations</div>
            <div className="p-4 bg-background">
              {state.evaluations.filter(e => e.facultyId === me.id && e.termId === activeTerm.id).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No evaluation responses yet for this term.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {myClasses.map(sec => {
                    const course = state.courses.find(c => c.id === sec.courseId);
                    const evals = state.evaluations.filter(e => e.facultyId === me.id && e.sectionId === sec.id && e.termId === activeTerm.id);
                    const enrolled = state.enrollments.filter(e => e.sectionId === sec.id && e.status === 'enrolled').length;
                    let avg = 0;
                    if (evals.length > 0) {
                      let total = 0; let q = 0;
                      evals.forEach(ev => { ev.responses.forEach(r => { total += r.rating; q++; }); });
                      avg = q > 0 ? total / q : 0;
                    }
                    return (
                      <div key={sec.id} className="p-3 rounded-lg bg-muted/40 border border-border text-center">
                        <p className="text-xs font-semibold text-foreground truncate">{course?.code} Sec {sec.sectionCode}</p>
                        <p className="text-2xl font-bold text-yellow-600 mt-1">{avg > 0 ? avg.toFixed(2) : '—'}</p>
                        <p className="text-xs text-muted-foreground">{evals.length}/{enrolled} responded</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
