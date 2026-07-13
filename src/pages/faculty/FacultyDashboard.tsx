import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import DashboardAnnouncements from '../../components/shared/DashboardAnnouncements';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { BookOpen, Users, Star, ClipboardList, CheckCircle, Clock, ChevronRight, Award, FilePen, Unlock, ClipboardCheck } from 'lucide-react';

export default function FacultyDashboard() {
  const { state, getActiveTerm } = useApp();
  const me = state.currentUser;
  const navigate = useNavigate();
  if (!me) return null;
  const activeTerm = getActiveTerm();

  const myClasses = activeTerm
    ? state.sections.filter(
        s => s.facultyId === me.id && s.termId === activeTerm.id && s.sectionCode !== '__MANUAL__'
      )
    : [];
  const totalStudents = myClasses.reduce((sum, s) => sum + s.enrolled, 0);
  const gradedSections = myClasses.filter(s => {
    const sectionEnrollments = state.enrollments.filter(e => e.sectionId === s.id && e.status !== 'dropped' && state.users.some(u => u.id === e.studentId));
    if (!sectionEnrollments.length) return true;
    return sectionEnrollments.every(enr =>
      state.grades.some(g => g.sectionId === s.id && g.studentId === enr.studentId && g.submitted)
    );
  }).length;
  const pendingConsents = state.consents.filter(c =>
    c.facultyId === me.id && c.termId === activeTerm?.id &&
    (c.coiStatus === 'pending' || c.deptConsentStatus === 'pending')
  ).length;
  const mySectionIds = new Set(myClasses.map(s => s.id));
  const pendingPrerogatives = (state.prerogatives ?? []).filter(p => mySectionIds.has(p.sectionId) && p.status === 'pending').length;

  const stats = [
    { label: 'Classes This Term', value: myClasses.length, icon: <BookOpen size={20} /> },
    { label: 'Total Students', value: totalStudents, icon: <Users size={20} /> },
    { label: 'Grades Submitted', value: `${gradedSections}/${myClasses.length}`, icon: <ClipboardList size={20} /> },
    { label: 'Pending Consents', value: pendingConsents, icon: <Clock size={20} />, warn: pendingConsents > 0 },
  ];

  const quickActions = [
    { label: 'Grade Encoding', desc: 'Encode and submit grades for your classes', path: '/faculty/grades', icon: <Award size={18} /> },
    { label: 'Removal/Completion', desc: 'Submit removal or completion grades', path: '/faculty/removal-grades', icon: <FilePen size={18} /> },
    { label: 'COI Consents', desc: 'Review pending COI consent requests', path: '/faculty/consents', icon: <ClipboardCheck size={18} />, badge: pendingConsents > 0 ? pendingConsents : undefined },
    { label: 'Prerogatives', desc: 'Review student prerogative requests', path: '/faculty/prerogatives', icon: <Unlock size={18} />, badge: pendingPrerogatives > 0 ? pendingPrerogatives : undefined },
    { label: 'My Timetable', desc: 'View your weekly class schedule', path: '/faculty/timetable', icon: <ClipboardList size={18} /> },
    { label: 'My Advisees', desc: 'View and manage your advisees', path: '/faculty/advisees', icon: <Users size={18} /> },
  ];

  return (
    <PortalLayout title="Faculty Dashboard">
      <div className="space-y-6">

        <DashboardAnnouncements portalSettings={state.portalSettings} user={me} />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={s.label} className="dash-stat" style={{ animationDelay: `${i * 60}ms` }}>
              <div className={`dash-stat-icon`}
                style={s.warn ? { background: 'linear-gradient(135deg, hsl(38 95% 50%), hsl(25 95% 50%))' } : undefined}>
                {s.icon}
              </div>
              <div>
                <p className={`dash-stat-value ${s.warn ? 'text-amber-600' : ''}`}>{s.value}</p>
                <p className="dash-stat-label">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <div className="flex items-center gap-2"><ChevronRight size={14} /> Quick Actions</div>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickActions.map(a => (
              <button key={a.path} onClick={() => navigate(a.path)} className="dash-action group">
                <div className="dash-action-icon">{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{a.label}</p>
                    {a.badge && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs h-4 px-1.5">{a.badge}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{a.desc}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* My Classes */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <div className="flex items-center gap-2"><BookOpen size={14} /> My Classes</div>
            <span className="text-white/70 text-xs font-normal">{activeTerm?.name ?? 'No Active Term'}</span>
          </div>
          {myClasses.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              No classes assigned for this term.
            </div>
          ) : (
            <div className="dash-list">
              {myClasses.map(sec => {
                const course = state.courses.find(c => c.id === sec.courseId);
                const sectionEnrollments = state.enrollments.filter(e => e.sectionId === sec.id && e.status !== 'dropped' && state.users.some(u => u.id === e.studentId));
                const allGraded = sectionEnrollments.length > 0 && sectionEnrollments.every(enr =>
                  state.grades.some(g => g.sectionId === sec.id && g.studentId === enr.studentId && g.submitted)
                );
                const pendingCount = sectionEnrollments.filter(enr =>
                  !state.grades.some(g => g.sectionId === sec.id && g.studentId === enr.studentId && g.submitted)
                ).length;
                return (
                  <div key={sec.id} className="dash-list-row">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground">
                        <span className="text-primary font-bold">{course?.code}</span>
                        {course?.title ? ` — ${course.title}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Sec {sec.sectionCode} &bull; {sec.schedule?.days?.join('') ?? ''} {sec.schedule?.startTime}–{sec.schedule?.endTime} &bull; {sec.enrolled}/{sec.slots} students
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {allGraded
                        ? <Badge className="bg-secondary/10 text-secondary border-secondary/30 flex items-center gap-1 text-xs"><CheckCircle size={9} /> Graded</Badge>
                        : pendingCount > 0
                          ? <Badge className="status-pending text-xs">{pendingCount} Pending</Badge>
                          : <Badge className="bg-muted text-muted-foreground border border-border text-xs">No Students</Badge>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending evaluations notice */}
        {activeTerm?.controls.ficEvalOpen && (
          <div className="portal-panel">
            <div className="portal-panel-header">
              <div className="flex items-center gap-2"><Star size={14} /> Faculty Evaluations</div>
            </div>
            <div className="px-4 py-4 flex items-start gap-3">
              {myClasses.length > 0 ? (
                <>
                  <CheckCircle size={16} className="text-secondary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-foreground font-medium">Faculty evaluation is now open</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Students can currently evaluate your classes. Results will be available after the term.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No classes to evaluate.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
