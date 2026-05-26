import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { BookOpen, Award, Star, User, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function StudentDashboard() {
  const { state, getActiveTerm, canStudentViewGrades, computeGWA } = useApp();
  const me = state.currentUser;
  if (!me) return null;
  const activeTerm = getActiveTerm();

  // Only count officially finalized (enrolled) courses on the dashboard
  const enrollments = activeTerm
    ? state.enrollments.filter(e => e.studentId === me.id && e.termId === activeTerm.id && e.status === 'enrolled')
    : [];
  const canView = activeTerm ? canStudentViewGrades(me.id, activeTerm.id) : false;
  const pendingEvals = activeTerm ? enrollments.filter(enr => {
    return !state.evaluations.some(e => e.studentId === me.id && e.sectionId === enr.sectionId && e.termId === activeTerm.id);
  }).length : 0;
  const { gwa } = computeGWA(me.id);
  const pendingConsents = state.consents.filter(c =>
    c.studentId === me.id && c.termId === activeTerm?.id &&
    (c.coiStatus === 'pending' || c.deptConsentStatus === 'pending' || c.ocsConsentStatus === 'pending')
  ).length;

  const stats = [
    { label: 'Enrolled Subjects', value: enrollments.length, icon: <BookOpen size={16} />, color: 'text-secondary' },
    { label: 'Pending Evaluations', value: pendingEvals, icon: <Star size={16} />, color: pendingEvals > 0 ? 'text-yellow-600' : 'text-secondary' },
    { label: 'Cumulative GWA', value: gwa > 0 ? gwa.toFixed(2) : 'N/A', icon: <Award size={16} />, color: 'text-primary' },
    { label: 'Pending Consents', value: pendingConsents, icon: <Clock size={16} />, color: pendingConsents > 0 ? 'text-yellow-600' : 'text-secondary' },
  ];

  return (
    <PortalLayout title="Student Dashboard">
      <div className="space-y-6">
        {/* Greeting */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-secondary/10 to-primary/5 border border-secondary/20">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
            <User size={24} className="text-secondary-foreground" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">Welcome, {me.name.split(' ')[0]}!</p>
            <p className="text-sm text-muted-foreground">{me.studentNumber} — {me.program} — Year {me.yearLevel}</p>
          </div>
          {activeTerm && (
            <div className="ml-auto flex flex-col items-end gap-1">
              <Badge className="bg-secondary text-secondary-foreground">{activeTerm.name}</Badge>
              <div className="flex gap-1.5">
                {activeTerm.controls.enlistmentOpen
                  ? <Badge className="status-approved text-xs flex items-center gap-1"><CheckCircle size={10} /> Enlistment Open</Badge>
                  : <Badge className="status-closed text-xs flex items-center gap-1"><XCircle size={10} /> Enlistment Closed</Badge>
                }
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="rounded-md overflow-hidden border border-border">
              <div className="bg-primary text-primary-foreground px-3 py-2.5 flex items-center justify-between">
                <span className="text-xs font-bold leading-tight">{s.label}</span>
                <span className={s.color}>{s.icon}</span>
              </div>
              <div className="px-3 py-3 bg-background">
                <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Current classes */}
        <div className="rounded-md overflow-hidden border border-border">
          <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm">
            Current Enrollment — {activeTerm?.name ?? 'No Active Term'}
          </div>
          <div className="p-4 bg-background">
            {enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                You have no officially enrolled subjects for this term.
                {activeTerm?.controls.enlistmentOpen && ' Go to Enlistment to add classes.'}
              </p>
            ) : (
              <div className="space-y-2">
                {enrollments.map(enr => {
                  const sec = state.sections.find(s => s.id === enr.sectionId);
                  const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                  const faculty = sec ? state.users.find(u => u.id === sec.facultyId) : null;
                  const grade = state.grades.find(g => g.studentId === me.id && g.sectionId === enr.sectionId);
                  const hasEval = state.evaluations.some(e => e.studentId === me.id && e.sectionId === enr.sectionId && e.termId === activeTerm?.id);
                  return (
                    <div key={enr.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border flex-wrap gap-2">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{course?.code} — {course?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Sec {sec?.sectionCode} | {sec?.schedule.days.join('')} {sec?.schedule.startTime}–{sec?.schedule.endTime} | {faculty?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasEval
                          ? <Badge className="text-xs bg-secondary/10 text-secondary border-secondary/30 flex items-center gap-1"><CheckCircle size={10} /> Evaluated</Badge>
                          : <Badge className="status-pending text-xs">Needs Eval</Badge>
                        }
                        {canView && grade?.grade && (
                          <Badge className="text-xs bg-primary/10 text-primary border-primary/30 font-bold">{grade.grade}</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Grade visibility notice */}
        {enrollments.length > 0 && (
          <div className={`rounded-md border flex items-center gap-3 p-4 ${canView ? 'border-secondary/30 bg-secondary/5' : 'border-yellow-300 bg-yellow-50'}`}>
            {canView
              ? <CheckCircle size={20} className="text-secondary flex-shrink-0" />
              : <Clock size={20} className="text-yellow-600 flex-shrink-0" />
            }
            <div>
              <p className={`text-sm font-semibold ${canView ? 'text-secondary' : 'text-yellow-800'}`}>
                {canView ? 'Grades are now visible!' : 'Grades not yet available'}
              </p>
              <p className={`text-xs mt-0.5 ${canView ? 'text-secondary/80' : 'text-yellow-700'}`}>
                {canView
                  ? 'You have completed all evaluations and your faculty has submitted grades.'
                  : 'Complete all faculty evaluations and wait for your faculty to submit grades to view your grades.'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
