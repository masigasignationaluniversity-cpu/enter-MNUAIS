import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import DashboardAnnouncements from '../../components/shared/DashboardAnnouncements';
import { Badge } from '../../components/ui/badge';
import { ChevronRight, Award, FilePen, ClipboardCheck, Unlock, ClipboardList, Users } from 'lucide-react';

export default function FacultyDashboard() {
  const { state, getActiveTerm } = useApp();
  const me = state.currentUser;
  const navigate = useNavigate();
  if (!me) return null;
  const activeTerm = getActiveTerm();

  const mySectionIds = new Set(
    (activeTerm
      ? state.sections.filter(s => s.facultyId === me.id && s.termId === activeTerm.id && s.sectionCode !== '__MANUAL__')
      : []
    ).map(s => s.id)
  );
  const pendingConsents = state.consents.filter(c =>
    c.facultyId === me.id && c.termId === activeTerm?.id &&
    (c.coiStatus === 'pending' || c.deptConsentStatus === 'pending')
  ).length;
  const pendingPrerogatives = (state.prerogatives ?? []).filter(p => mySectionIds.has(p.sectionId) && p.status === 'pending').length;

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
