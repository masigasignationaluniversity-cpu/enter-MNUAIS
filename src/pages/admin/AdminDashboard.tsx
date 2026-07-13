import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Users, BookOpen, CalendarDays, GraduationCap, ClipboardCheck, CheckCircle, XCircle, ChevronRight, KeyRound, DollarSign, Building2, Settings } from 'lucide-react';

export default function AdminDashboard() {
  const { state, getActiveTerm, syncAllToCloud, loadSections, loadEnrollments, loadGrades, loadPrerogatives, getPasswordResetTickets } = useApp();
  const activeTerm = getActiveTerm();
  const navigate = useNavigate();
  const hasSyncedRef = useRef(false);
  const [pendingTickets, setPendingTickets] = useState(0);

  useEffect(() => {
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    const hasLocalData = state.sections.length > 0 || state.enrollments.length > 0 || state.grades.length > 0;
    if (!hasLocalData) return;
    syncAllToCloud()
      .then(() => Promise.all([loadSections(), loadEnrollments(), loadGrades(), loadPrerogatives()]))
      .catch(e => console.error('Auto-sync error:', e));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getPasswordResetTickets()
      .then(tickets => setPendingTickets(tickets.filter(t => t.status === 'pending').length))
      .catch(() => {});
  }, [getPasswordResetTickets]);

  const activeCourseIds = new Set(state.courses.map(c => c.id));
  const termSections = activeTerm
    ? state.sections.filter(s => s.termId === activeTerm.id && activeCourseIds.has(s.courseId) && s.sectionCode !== '__MANUAL__')
    : [];

  const stats = [
    { label: 'Total Students', value: state.users.filter(u => u.role === 'student').length, icon: <Users size={20} /> },
    { label: 'Total Faculty', value: state.users.filter(u => u.role === 'faculty').length, icon: <GraduationCap size={20} /> },
    { label: 'Courses Offered', value: new Set(termSections.map(s => s.courseId)).size, icon: <BookOpen size={20} /> },
    { label: 'Active Sections', value: termSections.length, icon: <ClipboardCheck size={20} /> },
  ];

  const controls = activeTerm ? [
    { label: 'Enlistment', active: activeTerm.controls.enlistmentOpen },
    { label: 'Enrollment', active: activeTerm.controls.enrollmentOpen },
    { label: 'FIC Evaluation', active: activeTerm.controls.ficEvalOpen },
    { label: 'Grade Submission', active: activeTerm.controls.gradeSubmissionOpen },
  ] : [];

  const quickActions = [
    { label: 'Term Control', desc: 'Arrange terms and set the active term', path: '/admin/terms', icon: <CalendarDays size={18} /> },
    { label: 'User Management', desc: 'Add, edit, or deactivate user accounts', path: '/admin/users', icon: <Users size={18} /> },
    { label: 'Password Tickets', desc: 'Resolve pending password reset requests', path: '/admin/password-tickets', icon: <KeyRound size={18} />, badge: pendingTickets > 0 ? pendingTickets : undefined },
    { label: 'Academic Units', desc: 'Manage colleges, departments, and programs', path: '/admin/academic-units', icon: <Building2 size={18} /> },
    { label: 'Fee Schedule', desc: 'Configure tuition and fee amounts per term', path: '/admin/fees', icon: <DollarSign size={18} /> },
    { label: 'Portal Settings', desc: 'Customize portal appearance and branding', path: '/admin/portal-settings', icon: <Settings size={18} /> },
  ];

  return (
    <PortalLayout title="Administrator Dashboard">
      <div className="space-y-6">

        {/* Active Term hero */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <div className="flex items-center gap-2"><CalendarDays size={14} /> Active Term</div>
          </div>
          <div className="px-5 py-4 bg-primary/5">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div>
                <p className="text-foreground font-bold text-xl leading-tight">{activeTerm?.name ?? 'No active term'}</p>
                {activeTerm && <p className="text-xs text-muted-foreground mt-0.5">AY {activeTerm.academicYear}</p>}
              </div>
              <div className="flex flex-wrap gap-3">
                {controls.map(c => (
                  <div key={c.label} className="flex items-center gap-1.5">
                    {c.active
                      ? <CheckCircle size={14} className="text-secondary" />
                      : <XCircle size={14} className="text-muted-foreground/50" />
                    }
                    <span className={`text-sm ${c.active ? 'text-secondary font-semibold' : 'text-muted-foreground'}`}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={s.label} className="dash-stat" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="dash-stat-icon">{s.icon}</div>
              <div>
                <p className="dash-stat-value">{s.value}</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Terms list */}
          <div className="portal-panel">
            <div className="portal-panel-header">
              <div className="flex items-center gap-2"><CalendarDays size={14} /> Academic Terms</div>
              <Badge className="bg-muted border-0 text-foreground text-xs">{state.terms.length}</Badge>
            </div>
            <div className="dash-list">
              {state.terms.length === 0 ? (
                <div className="px-4 py-6 text-center text-muted-foreground text-sm">No terms found.</div>
              ) : state.terms.map(term => (
                <div key={term.id} className="dash-list-row">
                  <div className="flex items-center gap-3">
                    <CalendarDays size={15} className={term.isActive ? 'text-secondary' : 'text-muted-foreground/40'} />
                    <div>
                      <p className="font-semibold text-sm text-foreground">{term.name}</p>
                      <p className="text-xs text-muted-foreground">AY {term.academicYear}</p>
                    </div>
                  </div>
                  <Badge className={term.isActive ? 'bg-secondary text-secondary-foreground border-0' : 'bg-muted text-muted-foreground border border-border text-xs'}>
                    {term.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Section enrollment */}
          <div className="portal-panel">
            <div className="portal-panel-header">
              <div className="flex items-center gap-2"><ClipboardCheck size={14} /> Section Enrollment</div>
              <span className="text-white/70 text-xs font-normal">{activeTerm?.name ?? '—'}</span>
            </div>
            {!activeTerm || termSections.length === 0 ? (
              <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                {!activeTerm ? 'No active term.' : 'No sections for this term.'}
              </div>
            ) : (
              <div className="dash-list">
                {termSections.map(sec => {
                  const course = state.courses.find(c => c.id === sec.courseId);
                  const faculty = state.users.find(u => u.id === sec.facultyId);
                  const pct = Math.round((sec.enrolled / sec.slots) * 100);
                  return (
                    <div key={sec.id} className="dash-list-row flex-col items-start gap-1.5">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-sm text-foreground">
                          <span className="text-primary">{course?.code}</span> · Sec {sec.sectionCode}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{sec.enrolled}/{sec.slots}</span>
                      </div>
                      <div className="dash-progress w-full">
                        <div
                          className={`dash-progress-bar ${pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-amber-500' : 'bg-secondary'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{faculty?.name ?? '—'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
