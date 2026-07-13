import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import DashboardAnnouncements from '../../components/shared/DashboardAnnouncements';
import { Badge } from '../../components/ui/badge';
import { ChevronRight, Users, CalendarDays, KeyRound, Building2, DollarSign, Settings } from 'lucide-react';

export default function AdminDashboard() {
  const { state, syncAllToCloud, loadSections, loadEnrollments, loadGrades, loadPrerogatives, getPasswordResetTickets } = useApp();
  const me = state.currentUser;
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

  if (!me) return null;

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

        <DashboardAnnouncements portalSettings={state.portalSettings} user={me} />

        {/* Quick Links */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <div className="flex items-center gap-2"><ChevronRight size={14} /> Quick Links</div>
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
      </div>
    </PortalLayout>
  );
}
