import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import DashboardAnnouncements from '../../components/shared/DashboardAnnouncements';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { BookOpen, Award, Star, CheckCircle, Clock } from 'lucide-react';

export default function StudentDashboard() {
  const { state, getActiveTerm, canStudentViewGrades, computeGWA } = useApp();
  const me = state.currentUser;
  if (!me) return null;
  const activeTerm = getActiveTerm();

  const enrollments = activeTerm
    ? state.enrollments.filter(e => {
        if (e.studentId !== me.id || e.termId !== activeTerm.id || e.status !== 'enrolled') return false;
        const sec = state.sections.find(s => s.id === e.sectionId);
        return sec && sec.sectionCode !== '__MANUAL__';
      })
    : [];
  const canView = activeTerm ? canStudentViewGrades(me.id, activeTerm.id) : false;
  const pendingEvals = activeTerm
    ? enrollments.filter(enr =>
        !state.evaluations.some(e => e.studentId === me.id && e.sectionId === enr.sectionId && e.termId === activeTerm.id)
      ).length
    : 0;
  const { gwa } = computeGWA(me.id);
  const pendingConsents = state.consents.filter(c =>
    c.studentId === me.id && c.termId === activeTerm?.id &&
    (c.coiStatus === 'pending' || c.deptConsentStatus === 'pending' || c.ocsConsentStatus === 'pending')
  ).length;

  const stats = [
    { label: 'Enrolled Subjects', value: enrollments.length, icon: <BookOpen size={20} /> },
    { label: 'Pending Evaluations', value: pendingEvals, icon: <Star size={20} />, warn: pendingEvals > 0 },
    { label: 'Cumulative GWA', value: gwa > 0 ? gwa.toFixed(2) : '—', icon: <Award size={20} /> },
    { label: 'Pending Consents', value: pendingConsents, icon: <Clock size={20} />, warn: pendingConsents > 0 },
  ];

  return (
    <PortalLayout title="Student Dashboard">
      <div className="space-y-6">

        <DashboardAnnouncements portalSettings={state.portalSettings} user={me} />

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={s.label} className="dash-stat" style={{ animationDelay: `${i * 60}ms` }}>
              <div className={`dash-stat-icon ${s.warn ? 'bg-none' : ''}`}
                style={s.warn ? { background: 'linear-gradient(135deg, hsl(38 95% 50%) 0%, hsl(25 95% 50%) 100%)' } : undefined}>
                {s.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`dash-stat-value ${s.warn ? 'text-amber-600' : ''}`}>{s.value}</p>
                <p className="dash-stat-label">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Current enrollment */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <div className="flex items-center gap-2">
              <BookOpen size={14} />
              <span>Current Enrollment</span>
            </div>
            <span className="text-muted-foreground text-xs font-normal">{activeTerm?.name ?? 'No Active Term'}</span>
          </div>
          {enrollments.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              No officially enrolled subjects for this term.
              {activeTerm?.controls.enlistmentOpen && ' Go to Enlistment to add classes.'}
            </div>
          ) : (
            <div className="dash-list">
              {enrollments.map(enr => {
                const sec = state.sections.find(s => s.id === enr.sectionId);
                const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                const faculty = sec ? state.users.find(u => u.id === sec.facultyId) : null;
                const grade = state.grades.find(g => g.studentId === me.id && g.sectionId === enr.sectionId);
                const hasEval = state.evaluations.some(e => e.studentId === me.id && e.sectionId === enr.sectionId && e.termId === activeTerm?.id);
                return (
                  <div key={enr.id} className="dash-list-row">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">
                        <span className="text-primary font-bold">{course?.code}</span>
                        {course?.title ? ` — ${course.title}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Sec {sec?.sectionCode} &bull; {sec?.schedule?.days?.join('') ?? ''} {sec?.schedule?.startTime}–{sec?.schedule?.endTime} &bull; {faculty?.name ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hasEval
                        ? <Badge className="text-xs bg-secondary/10 text-secondary border-secondary/30 flex items-center gap-1"><CheckCircle size={9} /> Evaluated</Badge>
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

        {/* Grade visibility notice */}
        {enrollments.length > 0 && (
          <div className={`banner ${canView ? 'banner-success' : 'banner-warning'}`}>
            {canView
              ? <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
              : <Clock size={18} className="flex-shrink-0 mt-0.5" />
            }
            <div>
              <span className="banner-title">
                {canView ? 'Grades are now visible!' : 'Grades not yet available'}
              </span>
              <span className="banner-desc">
                {canView
                  ? 'You have completed all evaluations and your faculty has submitted grades.'
                  : 'Complete all faculty evaluations and wait for your faculty to submit grades to view your grades.'
                }
              </span>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
