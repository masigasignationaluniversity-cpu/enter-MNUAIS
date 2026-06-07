import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TermSelect } from '@/components/shared/TermSelect';
import { CheckCircle, XCircle, Clock, AlertCircle, ClipboardList, BookOpen, Users, ChevronDown, ChevronUp } from 'lucide-react';
import type { ConsentStatus } from '@/lib/types';

const StatusIcon = ({ status }: { status: ConsentStatus }) => {
  if (status === 'approved') return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === 'denied')   return <XCircle className="w-4 h-4 text-red-500" />;
  if (status === 'pending')  return <Clock className="w-4 h-4 text-yellow-500" />;
  return <AlertCircle className="w-4 h-4 text-gray-400" />;
};

const statusBadge = (status: ConsentStatus) => {
  const classes: Record<ConsentStatus, string> = {
    approved:      'bg-green-100 text-green-800 border-green-200',
    denied:        'bg-red-100 text-red-800 border-red-200',
    pending:       'bg-yellow-100 text-yellow-800 border-yellow-200',
    not_requested: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return <Badge className={`text-xs ${classes[status]}`}>{status.replace('_', ' ').toUpperCase()}</Badge>;
};

export default function FacultyConsents() {
  const { state, updateConsentStatus } = useApp();
  const faculty = state.currentUser!;

  const activeTerm = state.terms.find(t => t.isActive);
  const relevantTermIds = new Set(state.sections.filter(s => s.facultyId === faculty.id).map(s => s.termId));
  const relevantTerms = state.terms.filter(t => relevantTermIds.has(t.id) || !!t.isActive);
  const [termFilter, setTermFilter] = useState(activeTerm?.id ?? relevantTerms[0]?.id ?? '');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) =>
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  // Only sections assigned to this faculty where the course actually requires COI
  const myCOISections = state.sections.filter(s => {
    if (s.facultyId !== faculty.id || s.termId !== termFilter) return false;
    const course = state.courses.find(c => c.id === s.courseId);
    return course?.requiresCOI === true;
  });

  const getSectionConsents = (sectionId: string) =>
    state.consents.filter(c => c.sectionId === sectionId && c.termId === termFilter);

  const getStudent = (id: string) => state.users.find(u => u.id === id);

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

  const totalCoiPending = state.consents.filter(
    c => c.termId === termFilter && myCOISections.some(s => s.id === c.sectionId) && c.coiStatus === 'pending'
  ).length;

  const SectionConsentCard = ({ sectionId }: { sectionId: string }) => {
    const sec = state.sections.find(s => s.id === sectionId);
    if (!sec) return null;
    const course = state.courses.find(c => c.id === sec.courseId);
    if (!course) return null;
    const coiRecords = getSectionConsents(sectionId).filter(c => c.coiStatus !== 'not_requested');
    const pendingCount = coiRecords.filter(c => c.coiStatus === 'pending').length;
    const isExpanded = expandedSections.has(sectionId);

    return (
      <div className="border rounded-md overflow-hidden">
        <button className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-muted/20 hover:bg-muted/40 text-left"
          onClick={() => toggleSection(sectionId)}>
          <div className="flex items-start gap-3 min-w-0">
            <BookOpen className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{course.code}</span>
                <Badge variant="outline" className="text-xs">{sec.sectionCode}</Badge>
                {pendingCount > 0 && <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">{pendingCount} pending</Badge>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{course.title}</p>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{sec.enrolled}/{sec.slots}</span>
                <span>{course.units}u{course.labUnits ? `+${course.labUnits}L` : ''}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground">{coiRecords.length} req</span>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>
        {isExpanded && (
          <div className="bg-background">
            {coiRecords.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No COI consent requests for this section.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2.5 text-left text-xs font-bold">Student Name</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold">Student No.</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold">Program</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold">Reason</th>
                      <th className="px-4 py-2.5 text-center text-xs font-bold">Status</th>
                      <th className="px-4 py-2.5 text-center text-xs font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coiRecords
                      .sort((a, b) => (a.coiStatus === 'pending' ? -1 : 1) - (b.coiStatus === 'pending' ? -1 : 1))
                      .map((c, idx) => {
                        const student = getStudent(c.studentId);
                        if (!student) return null;
                        const appealType = getStudentAppealType(c.studentId, c.termId);
                        return (
                          <tr key={c.id} className={`border-b border-border last:border-0 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'} ${appealType ? 'ring-inset ring-1 ring-blue-200' : ''}`}>
                            <td className="px-4 py-2.5 font-medium">
                              {student.name}
                              {appealType && (
                                <span className={`ml-1.5 inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded ${appealType === 'change_drop' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {appealType === 'change_drop' ? 'Change/Drop' : 'Late Enroll'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{student.studentNumber ?? student.username}</td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{student.program ?? '—'}</td>
                            <td className="px-4 py-2.5 text-xs italic text-muted-foreground max-w-[200px]">
                              {c.coiReason ? `"${c.coiReason}"` : '—'}
                              {appealType && <span className="block mt-0.5 not-italic font-medium text-blue-700">[OCS Appeal: {appealType === 'change_drop' ? 'Approved Change/Drop' : 'Approved Late Enrollment'}]</span>}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <StatusIcon status={c.coiStatus} />{statusBadge(c.coiStatus)}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {c.coiStatus === 'pending' ? (
                                <div className="flex gap-1.5 justify-center">
                                  <Button size="sm" className="h-6 px-2 bg-green-600 text-white hover:bg-green-700 gap-1 text-xs"
                                    onClick={() => updateConsentStatus(c.id, 'coiStatus', 'approved')}>
                                    <CheckCircle className="w-3 h-3" /> Approve
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-6 px-2 border-red-300 text-red-600 hover:bg-red-50 gap-1 text-xs"
                                    onClick={() => updateConsentStatus(c.id, 'coiStatus', 'denied')}>
                                    <XCircle className="w-3 h-3" /> Deny
                                  </Button>
                                </div>
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
          </div>
        )}
      </div>
    );
  };

  const selectedTerm = state.terms.find(t => t.id === termFilter);

  return (
    <PortalLayout role="faculty" userName={faculty.name}>
      <div className="space-y-4">
        <TermSelect terms={relevantTerms} value={termFilter} onValueChange={v => { setTermFilter(v); setExpandedSections(new Set()); }} />

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b pb-3">
          <span>COI Pending: <strong className="text-yellow-700">{totalCoiPending}</strong></span>
          <span>COI Sections: <strong className="text-foreground">{myCOISections.length}</strong></span>
        </div>

        <div className="portal-panel">
          <div className="panel-header-pending">
            <span>Pending COI Applications</span>
            {totalCoiPending > 0 && <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded font-bold">{totalCoiPending} pending</span>}
          </div>
          <div className="p-3 space-y-2 bg-background">
            {myCOISections.length === 0 ? (
              <div className="py-10 text-center">
                <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No COI-required sections assigned for this semester.</p>
                <p className="text-muted-foreground text-sm mt-1">Only sections with courses flagged as "Requires COI" will appear here.</p>
              </div>
            ) : (
              myCOISections.map(s => <SectionConsentCard key={s.id} sectionId={s.id} />)
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
