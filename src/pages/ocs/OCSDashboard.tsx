import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import DashboardAnnouncements from '../../components/shared/DashboardAnnouncements';
import { Badge } from '../../components/ui/badge';
import { ChevronRight, UserCheck, PenSquare, ShieldAlert, RefreshCw, HandCoins, Users } from 'lucide-react';

export default function OCSDashboard() {
  const { state, getActiveTerm } = useApp();
  const me = state.currentUser;
  const navigate = useNavigate();
  if (!me) return null;
  const activeTerm = getActiveTerm();

  const pendingConsents = state.consents.filter(c =>
    c.termId === activeTerm?.id &&
    (c.coiStatus === 'pending' || c.ocsConsentStatus === 'pending')
  ).length;
  const pendingReconsiderations = (state.reconsiderationRequests ?? []).filter(r => r.termId === activeTerm?.id && r.status === 'pending').length;
  const pendingChangeDrop = (state.changeDropRequests ?? []).filter(r => r.termId === activeTerm?.id && r.status === 'pending').length;
  const pendingLoans = (state.studentLoanApplications ?? []).filter(l => l.termId === activeTerm?.id && l.status === 'pending').length;

  const quickActions = [
    { label: 'OCS Consents', desc: 'Review pending consent applications', path: '/ocs/consents', icon: <UserCheck size={18} />, badge: pendingConsents > 0 ? pendingConsents : undefined },
    { label: 'Grade & Enrollment', desc: 'Manage student grades and enrollment', path: '/ocs/grade-management', icon: <PenSquare size={18} /> },
    { label: 'Reconsideration', desc: 'Process reconsideration requests', path: '/ocs/reconsideration', icon: <ShieldAlert size={18} />, badge: pendingReconsiderations > 0 ? pendingReconsiderations : undefined },
    { label: 'Change/Add/Drop', desc: 'Process change, add, and drop requests', path: '/ocs/change-drop', icon: <RefreshCw size={18} />, badge: pendingChangeDrop > 0 ? pendingChangeDrop : undefined },
    { label: 'Student Loans', desc: 'Review pending student loan applications', path: '/ocs/student-loans', icon: <HandCoins size={18} />, badge: pendingLoans > 0 ? pendingLoans : undefined },
    { label: 'Students', desc: 'Search and manage student records', path: '/ocs/students', icon: <Users size={18} /> },
  ];

  return (
    <PortalLayout title="OCS Dashboard">
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
