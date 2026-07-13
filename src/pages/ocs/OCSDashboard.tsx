import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import DashboardAnnouncements from '../../components/shared/DashboardAnnouncements';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Users, Layers, ClipboardCheck, TrendingUp, ChevronRight, UserCheck, PenSquare, ShieldAlert, RefreshCw, HandCoins } from 'lucide-react';

export default function OCSDashboard() {
  const { state, getActiveTerm } = useApp();
  const me = state.currentUser;
  const navigate = useNavigate();
  if (!me) return null;
  const activeTerm = getActiveTerm();

  const activeCourseIds = new Set(state.courses.map(c => c.id));
  const termSections = activeTerm
    ? state.sections.filter(s => s.termId === activeTerm.id && activeCourseIds.has(s.courseId) && s.sectionCode !== '__MANUAL__')
    : [];
  const totalSlots = termSections.reduce((s, sec) => s + sec.slots, 0);
  const totalEnrolled = termSections.reduce((s, sec) => s + sec.enrolled, 0);
  const pendingConsents = state.consents.filter(c =>
    c.termId === activeTerm?.id &&
    (c.coiStatus === 'pending' || c.ocsConsentStatus === 'pending')
  ).length;
  const pendingReconsiderations = (state.reconsiderationRequests ?? []).filter(r => r.termId === activeTerm?.id && r.status === 'pending').length;
  const pendingChangeDrop = (state.changeDropRequests ?? []).filter(r => r.termId === activeTerm?.id && r.status === 'pending').length;
  const pendingLoans = (state.studentLoanApplications ?? []).filter(l => l.termId === activeTerm?.id && l.status === 'pending').length;

  const fillRate = totalSlots > 0 ? Math.round((totalEnrolled / totalSlots) * 100) : 0;

  const stats = [
    { label: 'Active Sections', value: termSections.length, icon: <Layers size={20} /> },
    { label: 'Total Enrolled', value: totalEnrolled, icon: <Users size={20} /> },
    { label: 'Fill Rate', value: `${fillRate}%`, icon: <TrendingUp size={20} /> },
    { label: 'Pending Consents', value: pendingConsents, icon: <ClipboardCheck size={20} />, warn: pendingConsents > 0 },
  ];

  const quickActions = [
    { label: 'OCS Consents', desc: 'Review pending consent applications', path: '/ocs/consents', icon: <UserCheck size={18} />, badge: pendingConsents > 0 ? pendingConsents : undefined },
    { label: 'Grade & Enrollment', desc: 'Manage student grades and enrollment', path: '/ocs/grade-management', icon: <PenSquare size={18} /> },
    { label: 'Reconsideration', desc: 'Process reconsideration requests', path: '/ocs/reconsideration', icon: <ShieldAlert size={18} />, badge: pendingReconsiderations > 0 ? pendingReconsiderations : undefined },
    { label: 'Change/Add/Drop', desc: 'Process change, add, and drop requests', path: '/ocs/change-drop', icon: <RefreshCw size={18} />, badge: pendingChangeDrop > 0 ? pendingChangeDrop : undefined },
    { label: 'Student Loans', desc: 'Review pending student loan applications', path: '/ocs/student-loans', icon: <HandCoins size={18} />, badge: pendingLoans > 0 ? pendingLoans : undefined },
    { label: 'Students', desc: 'Search and manage student records', path: '/ocs/students', icon: <Users size={18} /> },
  ];

  // Sort sections by fill rate desc
  const topSections = [...termSections]
    .sort((a, b) => (b.enrolled / b.slots) - (a.enrolled / a.slots))
    .slice(0, 10);

  return (
    <PortalLayout title="OCS Dashboard">
      <div className="space-y-6">

        <DashboardAnnouncements portalSettings={state.portalSettings} user={me} />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={s.label} className="dash-stat" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="dash-stat-icon"
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

        {/* Section fill overview */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <div className="flex items-center gap-2"><Layers size={14} /> Section Fill Overview</div>
            <span className="text-white/70 text-xs font-normal">{activeTerm?.name ?? 'No Active Term'}</span>
          </div>
          {topSections.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              No sections available for this term.
            </div>
          ) : (
            <div className="dash-list">
              {topSections.map(sec => {
                const course = state.courses.find(c => c.id === sec.courseId);
                const faculty = state.users.find(u => u.id === sec.facultyId);
                const pct = Math.round((sec.enrolled / sec.slots) * 100);
                return (
                  <div key={sec.id} className="dash-list-row flex-col items-start gap-1.5">
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-primary">{course?.code}</span>
                        <span className="text-foreground text-sm"> · Sec {sec.sectionCode}</span>
                        {faculty && <span className="text-muted-foreground text-xs ml-2">({faculty.name})</span>}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{sec.enrolled}/{sec.slots}</span>
                    </div>
                    <div className="flex items-center gap-3 w-full">
                      <div className="dash-progress flex-1">
                        <div
                          className={`dash-progress-bar ${pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-amber-500' : pct >= 50 ? 'bg-secondary' : 'bg-muted-foreground/40'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground w-9 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active term controls summary */}
        {activeTerm && (
          <div className="portal-panel">
            <div className="portal-panel-header">
              <div className="flex items-center gap-2"><ClipboardCheck size={14} /> Term Controls</div>
              <span className="text-white/70 text-xs font-normal">{activeTerm.name}</span>
            </div>
            <div className="px-4 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Enlistment', value: activeTerm.controls.enlistmentOpen },
                { label: 'Enrollment', value: activeTerm.controls.enrollmentOpen },
                { label: 'FIC Evaluation', value: activeTerm.controls.ficEvalOpen },
                { label: 'Grade Submission', value: activeTerm.controls.gradeSubmissionOpen },
              ].map(c => (
                <div key={c.label} className={`rounded-lg border px-3 py-2 text-sm ${c.value ? 'bg-secondary/10 border-secondary/30 text-secondary' : 'bg-muted/50 border-border text-muted-foreground'}`}>
                  <div className={`font-bold text-xs uppercase tracking-wide mb-0.5 ${c.value ? 'text-secondary' : 'text-muted-foreground/60'}`}>{c.label}</div>
                  <div className={`font-semibold ${c.value ? 'text-secondary' : 'text-muted-foreground'}`}>{c.value ? 'Open' : 'Closed'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
