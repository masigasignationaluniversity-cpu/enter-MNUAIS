import { useEffect, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Users, BookOpen, CalendarDays, GraduationCap, ClipboardCheck, CheckCircle, XCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { state, getActiveTerm, syncAllToCloud, loadSections, loadEnrollments, loadGrades, loadPrerogatives } = useApp();
  const activeTerm = getActiveTerm();
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    const hasLocalData = state.sections.length > 0 || state.enrollments.length > 0 || state.grades.length > 0;
    if (!hasLocalData) return;
    syncAllToCloud()
      .then(() => Promise.all([loadSections(), loadEnrollments(), loadGrades(), loadPrerogatives()]))
      .catch(e => console.error('Auto-sync error:', e));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCourseIds = new Set(state.courses.map(c => c.id));
  const termSections = activeTerm
    ? state.sections.filter(s => s.termId === activeTerm.id && activeCourseIds.has(s.courseId))
    : [];

  const stats = [
    { label: 'Total Students', value: state.users.filter(u => u.role === 'student').length, icon: <Users size={20} /> },
    { label: 'Total Faculty', value: state.users.filter(u => u.role === 'faculty').length, icon: <GraduationCap size={20} /> },
    { label: 'Courses Offered', value: new Set(termSections.map(s => s.courseId)).size, icon: <BookOpen size={20} /> },
    { label: 'Active Sections', value: termSections.length, icon: <ClipboardCheck size={20} /> },
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
        {/* Guide */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => window.open('/guide', '_blank')}>
            <BookOpen size={14} /> User Guide
          </Button>
        </div>

        {/* Active Term hero */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <div className="flex items-center gap-2"><CalendarDays size={14} /> Active Term</div>
          </div>
          <div className="px-5 py-4 bg-primary/5">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div>
                <p className="text-foreground font-bold text-xl leading-tight">{activeTerm?.name ?? 'No active term'}</p>
                {activeTerm && <p className="text-xs text-muted-foreground mt-0.5">AY {activeTerm.academicYear}</p>}
              </div>
              <div className="flex flex-wrap gap-3">
                {controls.map(c => (
                  <div key={c.label} className="flex items-center gap-1.5">
                    {c.active
                      ? <CheckCircle size={14} className="text-secondary" />
                      : <XCircle size={14} className="text-muted-foreground/50" />
                    }
                    <span className={`text-sm ${c.active ? 'text-secondary font-semibold' : 'text-muted-foreground'}`}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={s.label} className="dash-stat" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="dash-stat-icon">{s.icon}</div>
              <div>
                <p className="dash-stat-value">{s.value}</p>
                <p className="dash-stat-label">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Terms list */}
          <div className="portal-panel">
            <div className="portal-panel-header">
              <div className="flex items-center gap-2"><CalendarDays size={14} /> Academic Terms</div>
              <Badge className="bg-white/20 border-0 text-white text-xs">{state.terms.length}</Badge>
            </div>
            <div className="dash-list">
              {state.terms.length === 0 ? (
                <div className="px-4 py-6 text-center text-muted-foreground text-sm">No terms found.</div>
              ) : state.terms.map(term => (
                <div key={term.id} className="dash-list-row">
                  <div className="flex items-center gap-3">
                    <CalendarDays size={15} className={term.isActive ? 'text-secondary' : 'text-muted-foreground/40'} />
                    <div>
                      <p className="font-semibold text-sm text-foreground">{term.name}</p>
                      <p className="text-xs text-muted-foreground">AY {term.academicYear}</p>
                    </div>
                  </div>
                  <Badge className={term.isActive ? 'bg-secondary text-secondary-foreground border-0' : 'bg-muted text-muted-foreground border border-border text-xs'}>
                    {term.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Section enrollment */}
          <div className="portal-panel">
            <div className="portal-panel-header">
              <div className="flex items-center gap-2"><ClipboardCheck size={14} /> Section Enrollment</div>
              <span className="text-white/60 text-xs font-normal">{activeTerm?.name ?? '—'}</span>
            </div>
            {!activeTerm || termSections.length === 0 ? (
              <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                {!activeTerm ? 'No active term.' : 'No sections for this term.'}
              </div>
            ) : (
              <div className="dash-list">
                {termSections.map(sec => {
                  const course = state.courses.find(c => c.id === sec.courseId);
                  const faculty = state.users.find(u => u.id === sec.facultyId);
                  const pct = Math.round((sec.enrolled / sec.slots) * 100);
                  return (
                    <div key={sec.id} className="dash-list-row flex-col items-start gap-1.5">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold text-sm text-foreground">
                          <span className="text-primary">{course?.code}</span> · Sec {sec.sectionCode}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{sec.enrolled}/{sec.slots}</span>
                      </div>
                      <div className="dash-progress w-full">
                        <div
                          className={`dash-progress-bar ${pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-amber-500' : 'bg-secondary'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{faculty?.name ?? '—'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
