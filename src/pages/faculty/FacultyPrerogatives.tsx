import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { TermSelect } from '@/components/shared/TermSelect';
import { SectionRequestCard } from '@/components/shared/SectionRequestCard';
import { CheckCircle, XCircle, Clock, Settings, BookOpen } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { PrerogativeStatus } from '@/lib/types';

const statusBadge = (s: PrerogativeStatus) => {
  const map = { pending: 'bg-yellow-100 text-yellow-800 border-yellow-200', approved: 'bg-green-100 text-green-800 border-green-200', denied: 'bg-red-100 text-red-800 border-red-200' };
  return <Badge className={`text-xs ${map[s]}`}>{s.toUpperCase()}</Badge>;
};

export default function FacultyPrerogatives() {
  const { state, processPrerogative, updateSection } = useApp();
  const faculty = state.currentUser;

  const activeTerm = state.terms.find(t => t.isActive);
  const relevantTermIds = new Set(state.sections.filter(s => s.facultyId === faculty?.id && s.sectionCode !== '__MANUAL__').map(s => s.termId));
  const relevantTerms = state.terms.filter(t => relevantTermIds.has(t.id) || !!t.isActive);
  const [termFilter, setTermFilter] = useState(activeTerm?.id ?? relevantTerms[0]?.id ?? '');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  if (!faculty) return null;

  const toggleSection = (id: string) =>
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  // For Lec+Lab/Lec+Rec: lab/rec section faculty handles prerogatives.
  // Exclude lecture sections that have child lab/rec sections.
  const mySections = state.sections.filter(s => {
    if (s.facultyId !== faculty.id || s.termId !== termFilter || s.sectionCode === '__MANUAL__') return false;
    const hasChildren = state.sections.some(cs => cs.parentSectionId === s.id && cs.termId === s.termId);
    return !hasChildren;
  });
  const selectedTerm = state.terms.find(t => t.id === termFilter);
  const prerogOpen = selectedTerm?.controls.prerogativeOpen ?? false;

  const handleToggle = (sectionId: string, currentValue: boolean | undefined) => {
    const newValue = currentValue === false ? true : false;
    updateSection(sectionId, { prerogativeAccepting: newValue });
    toast.success(newValue ? 'Prerogative requests opened' : 'Prerogative requests closed');
  };

  const getStudent = (id: string) => state.users.find(u => u.id === id);
  const getSectionPrerogatives = (sectionId: string) => state.prerogatives.filter(p => p.sectionId === sectionId);

  // Helper: get approved appeal type for a student in the current term
  const getStudentAppealType = (studentId: string, termId: string): 'late_enrollment' | 'change_drop' | null => {
    const hasChangeDrop = (state.changeDropRequests ?? []).some(
      r => r.studentId === studentId && r.termId === termId && r.status === 'approved'
    );
    if (hasChangeDrop) return 'change_drop';
    const hasLateEnroll = (state.reconsiderationRequests ?? []).some(
      r => r.studentId === studentId && r.termId === termId && r.requestType === 'late_enlistment' && r.status === 'approved'
    );
    if (hasLateEnroll) return 'late_enrollment';
    return null;
  };

  const termSectionIds = new Set(mySections.map(s => s.id));
  const termPrerogatives = state.prerogatives.filter(p => termSectionIds.has(p.sectionId));
  const totalPending  = termPrerogatives.filter(p => p.status === 'pending').length;
  const totalApproved = termPrerogatives.filter(p => p.status === 'approved').length;
  const totalDenied   = termPrerogatives.filter(p => p.status === 'denied').length;

  const SectionCard = ({ sectionId }: { sectionId: string }) => {
    const sec = state.sections.find(s => s.id === sectionId);
    if (!sec) return null;
    const course = state.courses.find(c => c.id === sec.courseId);
    if (!course) return null;
    const progs = getSectionPrerogatives(sectionId);
    const pendingCount = progs.filter(p => p.status === 'pending').length;
    const isExpanded = expandedSections.has(sectionId);
    const isAccepting = sec.prerogativeAccepting !== false;

    return (
      <SectionRequestCard
        courseCode={course.code}
        courseTitle={course.title}
        sectionCode={sec.sectionCode}
        pendingCount={pendingCount}
        requestCount={progs.length}
        enrolled={sec.enrolled}
        slots={sec.slots}
        units={`${course.units}u`}
        isExpanded={isExpanded}
        onToggle={() => toggleSection(sectionId)}
        rightSlot={
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${isAccepting ? 'text-green-600' : 'text-red-500'}`}>{isAccepting ? 'Accepting' : 'Closed'}</span>
            <Switch checked={isAccepting} onCheckedChange={() => handleToggle(sectionId, sec.prerogativeAccepting)} />
          </div>
        }
      >
        {progs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No prerogative requests for this section.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-bold">Student Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold">Student No.</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold">Program</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold">Reason</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold">Requested</th>
                  <th className="px-4 py-2.5 text-center text-xs font-bold">Status</th>
                  <th className="px-4 py-2.5 text-center text-xs font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {[...progs].sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1)).map((prg, idx) => {
                  const student = getStudent(prg.studentId);
                  if (!student) return null;
                  const appealType = getStudentAppealType(prg.studentId, prg.termId);
                  const canAct = prg.status === 'pending' && (appealType !== null || (prerogOpen && isAccepting));
                  return (
                    <tr key={prg.id} className={`border-b border-border last:border-0 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'} ${appealType ? 'ring-inset ring-1 ring-blue-200' : ''}`}>
                      <td className="px-4 py-2.5 font-medium">
                        {student.name}
                        {appealType && (
                          <span className={`ml-1.5 inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded ${appealType === 'change_drop' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                            {appealType === 'change_drop' ? 'Change/Drop' : 'Late Enroll'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{student.studentNumber ?? student.username}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{student.program ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs italic text-muted-foreground max-w-[200px]">
                        "{prg.reason}"
                        {appealType && <span className="block mt-0.5 not-italic font-medium text-blue-700">[OCS Appeal: {appealType === 'change_drop' ? 'Approved Change/Drop request' : 'Approved Late Enrollment request'}]</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{prg.requestedAt}</td>
                      <td className="px-4 py-2.5 text-center">{statusBadge(prg.status)}</td>
                      <td className="px-4 py-2.5 text-center">
                        {canAct ? (
                          <div className="flex gap-1.5 justify-center">
                            <Button size="sm" className="h-6 px-2 bg-green-600 text-white hover:bg-green-700 gap-1 text-xs"
                              onClick={() => processPrerogative(prg.id, 'approved', faculty.id)}>
                              <CheckCircle className="w-3 h-3" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 px-2 border-red-300 text-red-600 hover:bg-red-50 gap-1 text-xs"
                              onClick={() => processPrerogative(prg.id, 'denied', faculty.id)}>
                              <XCircle className="w-3 h-3" /> Deny
                            </Button>
                          </div>
                        ) : prg.status === 'pending' && !prerogOpen ? (
                          <span className="text-xs text-red-500">Window closed</span>
                        ) : prg.status === 'pending' && !isAccepting ? (
                          <span className="text-xs text-orange-500">Section closed</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionRequestCard>
    );
  };

  return (
    <PortalLayout role="faculty" userName={faculty.name}>
      <div className="space-y-4">

        <TermSelect terms={relevantTerms} value={termFilter} onValueChange={v => { setTermFilter(v); setExpandedSections(new Set()); }} />

        {/* ── Status banner ────────────────────────────────────────── */}
        {prerogOpen
          ? <StatusBanner type="open" title="Prerogative Window is Open" description="You can approve or deny student requests below." />
          : <StatusBanner type="error" title="Prerogative Window is Closed" description="Pending requests cannot be processed until reopened." />
        }

        {/* ── Stats row ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="dash-stat portal-panel">
            <div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, hsl(38 95% 50%), hsl(25 95% 50%))' }}><Clock className="w-5 h-5" /></div>
            <p className="dash-stat-value">{totalPending}</p>
            <p className="dash-stat-label">Pending</p>
          </div>
          <div className="dash-stat portal-panel">
            <div className="dash-stat-icon" style={{ background: 'var(--gradient-header)' }}><CheckCircle className="w-5 h-5" /></div>
            <p className="dash-stat-value">{totalApproved}</p>
            <p className="dash-stat-label">Approved</p>
          </div>
          <div className="dash-stat portal-panel">
            <div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, hsl(0 70% 55%), hsl(0 70% 45%))' }}><XCircle className="w-5 h-5" /></div>
            <p className="dash-stat-value">{totalDenied}</p>
            <p className="dash-stat-label">Denied</p>
          </div>
        </div>

        {/* ── Toggle info ──────────────────────────────────────────── */}
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/40 border text-xs text-muted-foreground">
          <Settings className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
          <span>Use the <strong>Accepting / Closed</strong> toggle on each section card to control whether students can submit prerogative requests, even when the global window is open.</span>
        </div>

        {/* ── Section cards ────────────────────────────────────────── */}
        <div className="portal-panel">
          <div className="panel-header-pending">
            <span>Pending Prerogative Requests</span>
            {totalPending > 0 && <span className="bg-muted text-foreground text-xs px-2 py-0.5 rounded font-bold">{totalPending} pending</span>}
          </div>
          <div className="p-3 space-y-3 bg-background">
            {mySections.length === 0 ? (
              <div className="py-10 text-center">
                <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No sections assigned for this semester.</p>
                <p className="text-muted-foreground text-sm mt-1">Select a different semester or contact admin to assign sections.</p>
              </div>
            ) : (
              mySections.map(s => <SectionCard key={s.id} sectionId={s.id} />)
            )}
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}
