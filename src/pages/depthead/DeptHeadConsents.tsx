import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TermSelect } from '@/components/shared/TermSelect';
import { SectionRequestCard } from '@/components/shared/SectionRequestCard';
import { CheckCircle, XCircle, Clock, AlertCircle, UserCheck } from 'lucide-react';
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

export default function DeptHeadConsents() {
  const { state, updateConsentStatus } = useApp();
  const me = state.currentUser!;
  const dept = me.department ?? '';

  const activeTerm = state.terms.find(t => t.isActive);
  const relevantTermIds = new Set(state.consents.filter(c => {
    const sec = state.sections.find(s => s.id === c.sectionId);
    const course = sec ? state.courses.find(co => co.id === sec.courseId) : null;
    return course?.department === dept && c.deptConsentStatus !== 'not_requested';
  }).map(c => c.termId));
  const relevantTerms = state.terms.filter(t => relevantTermIds.has(t.id) || !!t.isActive);
  const [termFilter, setTermFilter] = useState(activeTerm?.id ?? relevantTerms[0]?.id ?? '');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) =>
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  // Sections in this dept where course requires dept consent
  const deptConsentSections = state.sections.filter(s => {
    if (s.termId !== termFilter || s.sectionCode === '__MANUAL__') return false;
    const course = state.courses.find(c => c.id === s.courseId);
    return course?.department === dept && course?.requiresDeptConsent === true;
  });

  const getSectionConsents = (sectionId: string) =>
    state.consents.filter(c => c.sectionId === sectionId && c.termId === termFilter && c.deptConsentStatus !== 'not_requested');

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

  const totalPending = deptConsentSections.reduce((acc, s) => {
    return acc + state.consents.filter(c => c.sectionId === s.id && c.termId === termFilter && c.deptConsentStatus === 'pending').length;
  }, 0);
  const totalApproved = deptConsentSections.reduce((acc, s) => {
    return acc + state.consents.filter(c => c.sectionId === s.id && c.termId === termFilter && c.deptConsentStatus === 'approved').length;
  }, 0);
  const totalDenied = deptConsentSections.reduce((acc, s) => {
    return acc + state.consents.filter(c => c.sectionId === s.id && c.termId === termFilter && c.deptConsentStatus === 'denied').length;
  }, 0);

  const SectionConsentCard = ({ sectionId }: { sectionId: string }) => {
    const sec = state.sections.find(s => s.id === sectionId);
    if (!sec) return null;
    const course = state.courses.find(c => c.id === sec.courseId);
    if (!course) return null;
    const deptRecords = getSectionConsents(sectionId);
    const pendingCount = deptRecords.filter(c => c.deptConsentStatus === 'pending').length;
    const isExpanded = expandedSections.has(sectionId);
    const sectionFaculty = state.users.find(u => u.id === sec.facultyId);

    return (
      <SectionRequestCard
        courseCode={course.code}
        courseTitle={course.title}
        sectionCode={sec.sectionCode}
        pendingCount={pendingCount}
        requestCount={deptRecords.length}
        enrolled={sec.enrolled}
        slots={sec.slots}
        units={`${course.units}u${course.labUnits ? `+${course.labUnits}L` : ''}`}
        metaLine={sectionFaculty?.name}
        isExpanded={isExpanded}
        onToggle={() => toggleSection(sectionId)}
      >
        {deptRecords.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No department consent requests for this section.</p>
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
                {deptRecords
                  .sort((a, b) => (a.deptConsentStatus === 'pending' ? -1 : 1) - (b.deptConsentStatus === 'pending' ? -1 : 1))
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
                              {appealType === 'change_drop' ? 'Change/Add/Drop' : 'Late Enroll'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{student.studentNumber ?? student.username}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{student.program ?? '—'}</td>
                        <td className="px-4 py-2.5 text-xs italic text-muted-foreground max-w-[200px]">
                          {c.deptReason ? `"${c.deptReason}"` : '—'}
                          {appealType && <span className="block mt-0.5 not-italic font-medium text-blue-700">[OCS Appeal: {appealType === 'change_drop' ? 'Approved Change/Add/Drop' : 'Approved Late Enrollment'}]</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <StatusIcon status={c.deptConsentStatus} />{statusBadge(c.deptConsentStatus)}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {c.deptConsentStatus === 'pending' ? (
                            <div className="flex gap-1.5 justify-center">
                              <Button size="sm" className="h-6 px-2 bg-green-600 text-white hover:bg-green-700 gap-1 text-xs"
                                onClick={() => updateConsentStatus(c.id, 'deptConsentStatus', 'approved')}>
                                <CheckCircle className="w-3 h-3" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 px-2 border-red-300 text-red-600 hover:bg-red-50 gap-1 text-xs"
                                onClick={() => updateConsentStatus(c.id, 'deptConsentStatus', 'denied')}>
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
      </SectionRequestCard>
    );
  };

  const selectedTerm = state.terms.find(t => t.id === termFilter);

  return (
    <PortalLayout role="department_head" userName={me.name}>
      <div className="space-y-4">
        <TermSelect terms={relevantTerms} value={termFilter} onValueChange={v => { setTermFilter(v); setExpandedSections(new Set()); }} />

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

        <div className="portal-panel">
          <div className="panel-header-pending">
            <span>Pending Applications — Department Consent</span>
            {totalPending > 0 && <span className="bg-muted text-foreground text-xs px-2 py-0.5 rounded font-bold">{totalPending} pending</span>}
          </div>
          <div className="p-3 space-y-3 bg-background">
            {!dept ? (
              <div className="py-10 text-center">
                <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No department assigned to your account.</p>
              </div>
            ) : deptConsentSections.length === 0 ? (
              <div className="py-10 text-center">
                <UserCheck className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No sections requiring dept consent for this term.</p>
                <p className="text-muted-foreground text-sm mt-1">Only sections with courses flagged as "Requires Dept Consent" will appear here.</p>
              </div>
            ) : (
              deptConsentSections.map(s => <SectionConsentCard key={s.id} sectionId={s.id} />)
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
