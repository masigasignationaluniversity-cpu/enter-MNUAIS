import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Users, BookOpen, CalendarDays, GraduationCap, ClipboardCheck, CheckCircle, XCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { state, getActiveTerm } = useApp();
  const activeTerm = getActiveTerm();

  const stats = [
    { label: 'Total Students', value: state.users.filter(u => u.role === 'student').length, icon: <Users size={20} />, color: 'text-primary' },
    { label: 'Total Faculty', value: state.users.filter(u => u.role === 'faculty').length, icon: <GraduationCap size={20} />, color: 'text-secondary' },
    { label: 'Total Courses', value: state.courses.length, icon: <BookOpen size={20} />, color: 'text-primary' },
    { label: 'Active Sections', value: activeTerm ? state.sections.filter(s => s.termId === activeTerm.id).length : 0, icon: <ClipboardCheck size={20} />, color: 'text-secondary' },
  ];

  const controls = activeTerm ? [
    { label: 'Enlistment', active: activeTerm.controls.enlistmentOpen },
    { label: 'Enrollment', active: activeTerm.controls.enrollmentOpen },
    { label: 'FIC Evaluation', active: activeTerm.controls.ficEvalOpen },
    { label: 'Grade Submission', active: activeTerm.controls.gradeSubmissionOpen },
  ] : [];

  return (
    <PortalLayout title="Administrator Dashboard">
      <div className="space-y-6">
        {/* Active Term */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <CalendarDays size={24} className="text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Active Term</p>
                  <p className="text-foreground font-bold text-lg">{activeTerm?.name ?? 'No active term'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {controls.map(c => (
                  <div key={c.label} className="flex items-center gap-1.5 text-sm">
                    {c.active
                      ? <CheckCircle size={14} className="text-secondary" />
                      : <XCircle size={14} className="text-destructive" />
                    }
                    <span className={c.active ? 'text-secondary font-medium' : 'text-muted-foreground'}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
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

        {/* Terms overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Academic Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {state.terms.map(term => (
                <div key={term.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-3">
                    <CalendarDays size={16} className={term.isActive ? 'text-secondary' : 'text-muted-foreground'} />
                    <div>
                      <p className="font-semibold text-sm text-foreground">{term.name}</p>
                      <p className="text-xs text-muted-foreground">AY {term.academicYear}</p>
                    </div>
                  </div>
                  <Badge className={term.isActive ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground border border-border'}>
                    {term.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Enrollments per section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Current Term — Section Enrollment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeTerm ? state.sections
                .filter(s => s.termId === activeTerm.id)
                .map(sec => {
                  const course = state.courses.find(c => c.id === sec.courseId);
                  const faculty = state.users.find(u => u.id === sec.facultyId);
                  const pct = Math.round((sec.enrolled / sec.slots) * 100);
                  return (
                    <div key={sec.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-sm mb-0.5">
                          <span className="font-medium text-foreground truncate">{course?.code} - Sec {sec.sectionCode}</span>
                          <span className="text-muted-foreground text-xs ml-2 flex-shrink-0">{sec.enrolled}/{sec.slots}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-yellow-500' : 'bg-secondary'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{faculty?.name}</p>
                      </div>
                    </div>
                  );
                }) : <p className="text-sm text-muted-foreground">No active term.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
