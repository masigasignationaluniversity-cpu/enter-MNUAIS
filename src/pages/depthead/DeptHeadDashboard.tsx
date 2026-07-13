import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import DashboardAnnouncements from '../../components/shared/DashboardAnnouncements';
import { Badge } from '../../components/ui/badge';
import { ChevronRight, BookOpen, Layers, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DeptHeadDashboard() {
  const { state, getActiveTerm } = useApp();
  const me = state.currentUser;
  const navigate = useNavigate();
  if (!me) return null;
  const activeTerm = getActiveTerm();

  const myDeptFaculty = state.users.filter(u => u.role === 'faculty' && u.department === me.department);
  const pendingConsents = state.consents.filter(c =>
    c.termId === activeTerm?.id && c.deptConsentStatus === 'pending' &&
    myDeptFaculty.some(f => f.id === c.facultyId)
  ).length;

  const quickActions = [
    { label: 'Manage Courses', desc: 'View and update department courses', path: '/depthead/courses', icon: <BookOpen size={18} /> },
    { label: 'Manage Sections', desc: 'View sections assigned to your faculty', path: '/depthead/sections', icon: <Layers size={18} /> },
    { label: 'Faculty Consents', desc: 'Review and process consent requests', path: '/depthead/consents', icon: <ClipboardCheck size={18} />, badge: pendingConsents > 0 ? pendingConsents : undefined },
  ];

  return (
    <PortalLayout title="Department Head Dashboard">
      <div className="space-y-6">

        <DashboardAnnouncements portalSettings={state.portalSettings} user={me} />

        {/* Quick Links */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <div className="flex items-center gap-2"><ChevronRight size={14} /> Quick Links</div>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
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
