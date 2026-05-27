import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import DashboardAnnouncements from '../../components/shared/DashboardAnnouncements';
import { Badge } from '../../components/ui/badge';
import { BookOpen, ClipboardList, Clock, Users, CheckCircle } from 'lucide-react';

export default function OCSDashboard() {
  const { state, getActiveTerm } = useApp();
  const activeTerm = getActiveTerm();
  const me = state.currentUser;

  const dept = me?.department ?? '';
  const deptCourseIds = new Set(
    dept ? state.courses.filter(c => c.department === dept).map(c => c.id)
         : state.courses.map(c => c.id)
  );
  const deptCourses = dept ? state.courses.filter(c => c.department === dept) : state.courses;

  const activeSections = activeTerm
    ? state.sections.filter(s => s.termId === activeTerm.id && deptCourseIds.has(s.courseId))
    : [];
  const pendingConsents = state.consents.filter(c => {
    if (c.termId !== activeTerm?.id) return false;
    if (c.ocsConsentStatus !== 'pending') return false;
    const sec = state.sections.find(s => s.id === c.sectionId);
    return sec && deptCourseIds.has(sec.courseId);
  });
  const approvedConsents = state.consents.filter(c => {
    if (c.termId !== activeTerm?.id) return false;
    if (c.ocsConsentStatus !== 'approved') return false;
    const sec = state.sections.find(s => s.id === c.sectionId);
    return sec && deptCourseIds.has(sec.courseId);
  });

  const stats = [
    { label: dept ? `${dept} Courses` : 'Total Courses', value: deptCourses.length, icon: <BookOpen size={16} />, color: 'text-secondary' },
    { label: 'Active Sections', value: activeSections.length, icon: <ClipboardList size={16} />, color: 'text-foreground' },
    { label: 'Pending OCS Consents', value: pendingConsents.length, icon: <Clock size={16} />, color: 'text-yellow-600' },
    { label: 'Approved Consents', value: approvedConsents.length, icon: <CheckCircle size={16} />, color: 'text-secondary' },
  ];

  return (
    <PortalLayout title="OCS Dashboard">
      <div className="space-y-6">
        {/* Welcome + Announcements */}
        <DashboardAnnouncements portalSettings={state.portalSettings} user={me} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="rounded-md overflow-hidden border border-border">
              <div className="bg-primary text-primary-foreground px-3 py-2.5 flex items-center justify-between">
                <span className="text-xs font-bold leading-tight">{s.label}</span>
                <span className={s.color}>{s.icon}</span>
              </div>
              <div className="px-3 py-3 bg-background">
                <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Active sections */}
          <div className="rounded-md overflow-hidden border border-border">
            <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm">Active Term Sections</div>
            <div className="p-4 bg-background">
              <div className="space-y-2">
                {activeSections.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No active sections.</p>
                ) : activeSections.slice(0, 6).map(sec => {
                  const course = state.courses.find(c => c.id === sec.courseId);
                  const faculty = state.users.find(u => u.id === sec.facultyId);
                  const pct = Math.round((sec.enrolled / sec.slots) * 100);
                  return (
                    <div key={sec.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border text-sm">
                      <div>
                        <p className="font-semibold text-foreground">{course?.code} - {sec.sectionCode}</p>
                        <p className="text-xs text-muted-foreground">{faculty?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{sec.enrolled}/{sec.slots}</p>
                        <div className={`text-xs ${pct >= 90 ? 'text-destructive' : 'text-muted-foreground'}`}>{pct}% full</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pending consents */}
          <div className="rounded-md overflow-hidden border border-border">
            <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between">
              <span>Pending OCS Consents</span>
              {pendingConsents.length > 0 && (
                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">{pendingConsents.length}</span>
              )}
            </div>
            <div className="p-4 bg-background">
              {pendingConsents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center">No pending consents.</p>
              ) : (
                <div className="space-y-2">
                  {pendingConsents.map(c => {
                    const student = state.users.find(u => u.id === c.studentId);
                    const sec = state.sections.find(s => s.id === c.sectionId);
                    const course = sec ? state.courses.find(co => co.id === sec.courseId) : null;
                    return (
                      <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-yellow-50 border border-yellow-200 text-sm">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-yellow-600" />
                          <div>
                            <p className="font-semibold text-foreground">{student?.name}</p>
                            <p className="text-xs text-muted-foreground">{course?.code} - {sec?.sectionCode}</p>
                          </div>
                        </div>
                        <Badge className="status-pending text-xs">Pending</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
