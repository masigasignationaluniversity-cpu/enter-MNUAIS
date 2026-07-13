import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import DashboardAnnouncements from '../../components/shared/DashboardAnnouncements';
import { Badge } from '../../components/ui/badge';
import { ChevronRight, BookOpen, FileText, Star, GraduationCap, Unlock, User } from 'lucide-react';

export default function StudentDashboard() {
  const { state, getActiveTerm } = useApp();
  const me = state.currentUser;
  const navigate = useNavigate();
  if (!me) return null;
  const activeTerm = getActiveTerm();

  const pendingConsents = state.consents.filter(c =>
    c.studentId === me.id && c.termId === activeTerm?.id &&
    (c.coiStatus === 'pending' || c.deptConsentStatus === 'pending' || c.ocsConsentStatus === 'pending')
  ).length;
  const pendingEvals = activeTerm
    ? state.enrollments.filter(e => {
        if (e.studentId !== me.id || e.termId !== activeTerm.id || e.status !== 'enrolled') return false;
        const sec = state.sections.find(s => s.id === e.sectionId);
        if (!sec || sec.sectionCode === '__MANUAL__') return false;
        return !state.evaluations.some(ev => ev.studentId === me.id && ev.sectionId === e.sectionId && ev.termId === activeTerm.id);
      }).length
    : 0;
  const pendingPrerogatives = (state.prerogatives ?? []).filter(p => p.studentId === me.id && p.termId === activeTerm?.id && p.status === 'pending').length;

  const quickActions = [
    { label: 'Enlistment', desc: 'Search and enlist in classes', path: '/student/enlistment', icon: <BookOpen size={18} /> },
    { label: 'My Consents', desc: 'View and submit consent requests', path: '/student/consent', icon: <FileText size={18} />, badge: pendingConsents > 0 ? pendingConsents : undefined },
    { label: 'SET Evaluation', desc: 'Evaluate your faculty for this term', path: '/student/evaluation', icon: <Star size={18} />, badge: pendingEvals > 0 ? pendingEvals : undefined },
    { label: 'Plan of Study', desc: 'Track your graduation requirements', path: '/student/plan-of-study', icon: <GraduationCap size={18} /> },
    { label: 'Prerogatives', desc: 'Submit or check prerogative requests', path: '/student/prerogatives', icon: <Unlock size={18} />, badge: pendingPrerogatives > 0 ? pendingPrerogatives : undefined },
    { label: 'My Profile', desc: 'View your student information', path: '/student/profile', icon: <User size={18} /> },
  ];

  return (
    <PortalLayout title="Student Dashboard">
      <div className="space-y-6">

        <DashboardAnnouncements portalSettings={state.portalSettings} user={me} />

        {/* Quick Links */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <div className="flex items-center gap-2"><ChevronRight size={14} /> Quick Links</div>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickActions.map(a => (
              <button key={a.path} onClick={() => navigate(a.path)} className="dash-action group">
                <div className="dash-action-icon dash-action-icon-secondary">{a.icon}</div>
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
      </div>
    </PortalLayout>
  );
}
