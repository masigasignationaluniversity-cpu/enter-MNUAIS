import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Users, BookOpen, CalendarDays, GraduationCap, ClipboardCheck, CheckCircle, XCircle, Video } from 'lucide-react';
import VideoTutorialModal from '../shared/VideoTutorialModal';

export default function AdminDashboard() {
  const { state, getActiveTerm } = useApp();
  const activeTerm = getActiveTerm();
  const [showTutorial, setShowTutorial] = useState(false);

  const stats = [
    { label: 'Total Students', value: state.users.filter(u => u.role === 'student').length, icon: <Users size={16} />, color: 'text-primary' },
    { label: 'Total Faculty', value: state.users.filter(u => u.role === 'faculty').length, icon: <GraduationCap size={16} />, color: 'text-secondary' },
    { label: 'Courses Offered', value: activeTerm ? new Set(state.sections.filter(s => s.termId === activeTerm.id).map(s => s.courseId)).size : 0, icon: <BookOpen size={16} />, color: 'text-primary' },
    { label: 'Active Sections', value: activeTerm ? state.sections.filter(s => s.termId === activeTerm.id).length : 0, icon: <ClipboardCheck size={16} />, color: 'text-secondary' },
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
        {showTutorial && <VideoTutorialModal onClose={() => setShowTutorial(false)} />}
        {/* Guide buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => setShowTutorial(true)}>
            <Video size={14} /> Video Tutorial
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => window.open('/guide', '_blank')}>
            <BookOpen size={14} /> User Guide / Gabay
          </Button>
        </div>
        {/* Active Term */}
        <div className="rounded-md overflow-hidden border border-primary/30">
          <div className="portal-panel-header">
            <CalendarDays size={14} /> Active Term
          </div>
          <div className="p-4 bg-primary/5">
            <div className="flex items-center flex-wrap gap-3">
              <div>
                <p className="text-foreground font-bold text-lg">{activeTerm?.name ?? 'No active term'}</p>
                {activeTerm && <p className="text-xs text-muted-foreground">AY {activeTerm.academicYear}</p>}
              </div>
              <div className="flex flex-wrap gap-3">
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
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="portal-panel">
              <div className="portal-panel-header">
                <span className="text-xs font-bold leading-tight">{s.label}</span>
                <span className={s.color}>{s.icon}</span>
              </div>
              <div className="px-3 py-3 bg-background">
                <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Terms overview */}
        <div className="portal-panel">
          <div className="portal-panel-header">Academic Terms</div>
          <div className="p-4 bg-background">
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
          </div>
        </div>

        {/* Enrollments per section */}
        <div className="portal-panel">
          <div className="portal-panel-header">Current Term — Section Enrollment</div>
          <div className="p-4 bg-background">
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
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
