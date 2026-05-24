import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { BookOpen, ClipboardList, UserCheck, Users, CheckCircle, Clock } from 'lucide-react';

export default function OCSDashboard() {
  const { state, getActiveTerm } = useApp();
  const activeTerm = getActiveTerm();

  const dept = state.currentUser?.department ?? '';
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
    { label: dept ? `${dept} Courses` : 'Total Courses', value: deptCourses.length, icon: <BookOpen size={20} />, color: 'text-secondary' },
    { label: 'Active Sections', value: activeSections.length, icon: <ClipboardList size={20} />, color: 'text-primary' },
    { label: 'Pending OCS Consents', value: pendingConsents.length, icon: <Clock size={20} />, color: 'text-yellow-600' },
    { label: 'Approved Consents', value: approvedConsents.length, icon: <CheckCircle size={20} />, color: 'text-secondary' },
  ];

  return (
    <PortalLayout title="OCS Dashboard">
      <div className="space-y-6">
        {activeTerm && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/10 border border-secondary/30">
            <CheckCircle size={16} className="text-secondary" />
            <span className="text-sm font-medium text-secondary">Active Term: {activeTerm.name}</span>
            <Badge className="ml-auto bg-secondary/20 text-secondary border-secondary/30 border">
              Enlistment {activeTerm.controls.enlistmentOpen ? 'Open' : 'Closed'}
            </Badge>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(stat => (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className={stat.color}>{stat.icon}</span>
                  <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent sections */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Term Sections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activeSections.slice(0, 6).map(sec => {
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
            </CardContent>
          </Card>

          {/* Pending consents */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Pending OCS Consents
                {pendingConsents.length > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">{pendingConsents.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalLayout>
  );
}
