import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import DashboardAnnouncements from '../../components/shared/DashboardAnnouncements';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { BookOpen, Users, Layers, ClipboardCheck, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DeptHeadDashboard() {
  const { state, getActiveTerm } = useApp();
  const me = state.currentUser;
  const navigate = useNavigate();
  if (!me) return null;
  const activeTerm = getActiveTerm();

  const myDeptFaculty = state.users.filter(u => u.role === 'faculty' && u.department === me.department);
  const activeCourseIds = new Set(state.courses.map(c => c.id));
  const deptSections = activeTerm
    ? state.sections.filter(s =>
        s.termId === activeTerm.id &&
        activeCourseIds.has(s.courseId) &&
        s.sectionCode !== '__MANUAL__' &&
        myDeptFaculty.some(f => f.id === s.facultyId)
      )
    : [];
  const pendingConsents = state.consents.filter(c =>
    c.termId === activeTerm?.id && c.deptConsentStatus === 'pending' &&
    myDeptFaculty.some(f => f.id === c.facultyId)
  ).length;
  const deptCourses = state.courses.filter(c => c.department === me.department || c.unit === me.department);

  const stats = [
    { label: 'Dept Faculty', value: myDeptFaculty.length, icon: <Users size={20} /> },
    { label: 'Dept Sections', value: deptSections.length, icon: <Layers size={20} /> },
    { label: 'Dept Courses', value: deptCourses.length, icon: <BookOpen size={20} /> },
    { label: 'Pending Consents', value: pendingConsents, icon: <ClipboardCheck size={20} />, warn: pendingConsents > 0 },
  ];

  const quickActions = [
    { label: 'Manage Courses', desc: 'View and update department courses', path: '/depthead/courses', icon: <BookOpen size={18} /> },
    { label: 'Manage Sections', desc: 'View sections assigned to your faculty', path: '/depthead/sections', icon: <Layers size={18} /> },
    { label: 'Faculty Consents', desc: 'Review and process consent requests', path: '/depthead/consents', icon: <ClipboardCheck size={18} />, badge: pendingConsents > 0 ? pendingConsents : undefined },
  ];

  return (
    <PortalLayout title="Department Head Dashboard">
      <div className="space-y-6">

        <DashboardAnnouncements portalSettings={state.portalSettings} user={me} />

        {/* Department header */}
        {me.department && (
          <div className="portal-panel">
            <div className="portal-panel-header">
              <div className="flex items-center gap-2"><Users size={14} /> Department</div>
            </div>
            <div className="px-4 py-3">
              <p className="text-foreground font-bold text-base">{me.department}</p>
              {activeTerm && <p className="text-xs text-muted-foreground mt-0.5">{activeTerm.name}</p>}
            </div>
          </div>
        )}

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
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        {/* Dept sections */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <div className="flex items-center gap-2"><Layers size={14} /> Department Sections</div>
            <span className="text-muted-foreground text-xs font-normal">{activeTerm?.name ?? '—'}</span>
          </div>
          {deptSections.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              {!activeTerm ? 'No active term.' : 'No sections found for your department.'}
            </div>
          ) : (
            <div className="dash-list">
              {deptSections.map(sec => {
                const course = state.courses.find(c => c.id === sec.courseId);
                const faculty = myDeptFaculty.find(f => f.id === sec.facultyId);
                const pct = Math.round((sec.enrolled / sec.slots) * 100);
                return (
                  <div key={sec.id} className="dash-list-row">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground">
                        <span className="text-primary">{course?.code}</span> · Sec {sec.sectionCode}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{faculty?.name ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{sec.enrolled}/{sec.slots}</span>
                      <Badge className={`text-xs ${pct >= 90 ? 'bg-destructive/10 text-destructive border-destructive/30' : pct >= 70 ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-secondary/10 text-secondary border-secondary/30'}`}>
                        {pct}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
