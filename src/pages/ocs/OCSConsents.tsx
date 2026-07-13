import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TermSelect } from '@/components/shared/TermSelect';
import { Input } from '@/components/ui/input';
import { SectionRequestCard } from '@/components/shared/SectionRequestCard';
import { CheckCircle, XCircle, Clock, Search, Link } from 'lucide-react';
import type { ConsentStatus } from '@/lib/types';

const StatusBadge = ({ status }: { status: ConsentStatus }) => {
  if (status === 'approved') return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs gap-1"><CheckCircle className="w-3 h-3" />Approved</Badge>;
  if (status === 'denied')   return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs gap-1"><XCircle className="w-3 h-3" />Denied</Badge>;
  if (status === 'pending')  return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
  return <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">—</Badge>;
};

export default function OCSConsents() {
  const { state, updateConsentStatus } = useApp();
  const [termFilter, setTermFilter] = useState(state.terms.find(t => t.isActive)?.id ?? state.terms[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) =>
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const ocsUser = state.currentUser;
  const ocsCollege = ocsUser?.college ? state.colleges.find(c => c.name === ocsUser.college) ?? null : null;
  const collegeDeptNames = new Set(ocsCollege ? state.departments.filter(d => d.collegeId === ocsCollege.id).map(d => d.name) : []);
  const collegeCourseIds = new Set(ocsCollege ? state.courses.filter(c => collegeDeptNames.has(c.department)).map(c => c.id) : state.courses.map(c => c.id));

  // Build set of course IDs that have NO OCS officer assigned — those are visible to all OCS officers
  const allCollegesWithOCS = new Set(
    state.users.filter(u => u.role === 'ocs' && u.college).map(u => u.college as string)
  );
  const allDeptNamesWithOCS = new Set(
    state.departments
      .filter(d => {
        const col = state.colleges.find(c => c.id === d.collegeId);
        return col && allCollegesWithOCS.has(col.name);
      })
      .map(d => d.name)
  );
  const unassignedCourseIds = new Set(
    state.courses.filter(c => !allDeptNamesWithOCS.has(c.department)).map(c => c.id)
  );

  // An OCS officer can see a consent if:
  // 1. The course is in their assigned college, OR
  // 2. The course belongs to a college with no OCS officer assigned (unassigned → visible to all)
  const canSeeConsent = (courseId: string) =>
    collegeCourseIds.has(courseId) || unassignedCourseIds.has(courseId);

  const relevantTermIds = new Set(state.consents.filter(c => {
    const sec = state.sections.find(s => s.id === c.sectionId);
    return sec && sec.sectionCode !== '__MANUAL__' && canSeeConsent(sec.courseId) && c.ocsConsentStatus !== 'not_requested';
  }).map(c => c.termId));
  const relevantTerms = state.terms.filter(t => relevantTermIds.has(t.id) || !!t.isActive);

  // Request deadline lock: OCS cannot approve/deny after this date
  const selectedTerm = state.terms.find(t => t.id === termFilter);
  const isDeadlinePassed = selectedTerm?.requestDeadline
    ? new Date() > new Date(selectedTerm.requestDeadline)
    : false;

  const allConsents = state.consents.filter(c => {
    if (termFilter && c.termId !== termFilter) return false;
    const sec = state.sections.find(s => s.id === c.sectionId);
    if (!sec || sec.sectionCode === '__MANUAL__' || !canSeeConsent(sec.courseId)) return false;
    return c.ocsConsentStatus !== 'not_requested'; // Only show OCS consent requests
  });

  const pendingOCS   = allConsents.filter(c => c.ocsConsentStatus === 'pending');
  const processedOCS = allConsents.filter(c => c.ocsConsentStatus !== 'pending');
  const approvedOCS  = allConsents.filter(c => c.ocsConsentStatus === 'approved');
  const deniedOCS    = allConsents.filter(c => c.ocsConsentStatus === 'denied');

  const getStudent = (id: string) => state.users.find(u => u.id === id);
  const getSection = (id: string) => state.sections.find(s => s.id === id);
  const getCourse  = (sectionId: string) => { const sec = getSection(sectionId); return sec ? state.courses.find(c => c.id === sec.courseId) : undefined; };
  const getCollege = (courseId: string) => {
    const course = state.courses.find(c => c.id === courseId);
    if (!course) return '—';
    const dept = state.departments.find(d => d.name === course.department);
    if (!dept) return '—';
    return state.colleges.find(col => col.id === dept.collegeId)?.abbreviation ?? '—';
  };

  // Helper: get approved appeal type for a student in a term
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

  const filterConsents = (list: typeof allConsents) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(c => {
      const student = getStudent(c.studentId);
      const course = getCourse(c.sectionId);
      return student?.name.toLowerCase().includes(q)
        || student?.studentNumber?.toLowerCase().includes(q)
        || course?.code.toLowerCase().includes(q)
        || course?.title.toLowerCase().includes(q)
        || c.ocsConsentType?.toLowerCase().includes(q);
    });
  };

  // Group consents by section for the card-based layout
  const groupBySection = (list: typeof allConsents, keyPrefix: string) => {
    const map = new Map<string, typeof allConsents>();
    filterConsents(list).forEach(c => {
      const key = `${keyPrefix}-${c.sectionId}`;
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    });
    return Array.from(map.entries());
  };

  const ConsentRow = ({ consent, showActions = false, isLocked = false }: { consent: typeof allConsents[0]; showActions?: boolean; isLocked?: boolean }) => {
    const student = getStudent(consent.studentId);
    const appealType = getStudentAppealType(consent.studentId, consent.termId);
    if (!student) return null;
    return (
      <tr className={`border-b last:border-0 hover:bg-muted/10 ${appealType ? 'ring-inset ring-1 ring-blue-200 bg-blue-50/30' : ''}`}>
        {/* Student */}
        <td className="px-3 py-2 align-top">
          <p className="font-semibold text-xs">{student.name}</p>
          <p className="text-xs text-muted-foreground">{student.studentNumber}</p>
          {student.program && <p className="text-xs text-muted-foreground truncate max-w-[140px]">{student.program}</p>}
        </td>
        {/* Type */}
        <td className="px-3 py-2 align-top text-xs text-muted-foreground max-w-[130px]">
          {consent.ocsConsentType
            ? <span className="inline-block leading-4">{consent.ocsConsentType}</span>
            : <span className="text-muted-foreground/40">—</span>}
        </td>
        {/* Drive Link */}
        <td className="px-3 py-2 align-top text-xs">
          {consent.ocsDriveLink
            ? <a href={/^https?:\/\//.test(consent.ocsDriveLink) ? consent.ocsDriveLink : `https://${consent.ocsDriveLink}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 underline hover:opacity-70 whitespace-nowrap">
                <Link className="w-3 h-3 flex-shrink-0" /><span>View</span>
              </a>
            : <span className="text-muted-foreground/40">—</span>}
        </td>
        {/* Remarks */}
        <td className="px-3 py-2 align-top text-xs text-muted-foreground italic max-w-[200px]">
          {consent.ocsReason ? `"${consent.ocsReason}"` : '—'}
          {appealType && (
            <span className={`block mt-1 not-italic font-semibold px-1.5 py-0.5 rounded text-[10px] ${appealType === 'change_drop' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
              {appealType === 'change_drop' ? 'OCS-Approved: Change/Drop' : 'OCS-Approved: Late Enrollment'}
            </span>
          )}
        </td>
        {/* Status / Action */}
        <td className="px-3 py-2 align-top whitespace-nowrap">
          <div className="flex flex-col gap-1.5">
            <StatusBadge status={consent.ocsConsentStatus} />
            {showActions && consent.ocsConsentStatus === 'pending' && !isLocked && (
              <div className="flex gap-1 mt-0.5">
                <Button size="sm" className="h-6 px-2 bg-green-600 text-white hover:bg-green-700 gap-1 text-xs"
                  onClick={() => updateConsentStatus(consent.id, 'ocsConsentStatus', 'approved')}>
                  <CheckCircle className="w-3 h-3" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="h-6 px-2 border-red-300 text-red-600 hover:bg-red-50 gap-1 text-xs"
                  onClick={() => updateConsentStatus(consent.id, 'ocsConsentStatus', 'denied')}>
                  <XCircle className="w-3 h-3" /> Deny
                </Button>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const SectionGroupCard = ({ groupKey, sectionId, records, showActions = false, isLocked = false }: { groupKey: string; sectionId: string; records: typeof allConsents; showActions?: boolean; isLocked?: boolean }) => {
    const section = getSection(sectionId);
    const course = getCourse(sectionId);
    if (!section || !course) return null;
    const faculty = state.users.find(u => u.id === section.facultyId);
    const college = getCollege(course.id);
    const pendingCount = records.filter(c => c.ocsConsentStatus === 'pending').length;
    const isExpanded = expandedSections.has(groupKey);
    return (
      <SectionRequestCard
        courseCode={course.code}
        courseTitle={`${course.title} · ${section.schedule.days.join('')} ${section.schedule.startTime}–${section.schedule.endTime}`}
        sectionCode={section.sectionCode}
        pendingCount={pendingCount}
        requestCount={records.length}
        enrolled={section.enrolled}
        slots={section.slots}
        metaLine={`${faculty?.name ?? 'Unassigned'} · ${college}`}
        isExpanded={isExpanded}
        onToggle={() => toggleSection(groupKey)}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Student</th>
                <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Type</th>
                <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Drive Link</th>
                <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Remarks/Appeal</th>
                <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map(c => <ConsentRow key={c.id} consent={c} showActions={showActions} isLocked={isLocked} />)}
            </tbody>
          </table>
        </div>
      </SectionRequestCard>
    );
  };

  return (
    <PortalLayout role="ocs" userName={state.currentUser?.name ?? ''}>
      <div className="space-y-4">

        <TermSelect terms={relevantTerms} value={termFilter} onValueChange={setTermFilter} />

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="dash-stat portal-panel">
            <div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, hsl(38 95% 50%), hsl(25 95% 50%))' }}><Clock className="w-5 h-5" /></div>
            <p className="dash-stat-value">{pendingOCS.length}</p>
            <p className="dash-stat-label">Pending</p>
          </div>
          <div className="dash-stat portal-panel">
            <div className="dash-stat-icon" style={{ background: 'var(--gradient-header)' }}><CheckCircle className="w-5 h-5" /></div>
            <p className="dash-stat-value">{approvedOCS.length}</p>
            <p className="dash-stat-label">Approved</p>
          </div>
          <div className="dash-stat portal-panel">
            <div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, hsl(0 70% 55%), hsl(0 70% 45%))' }}><XCircle className="w-5 h-5" /></div>
            <p className="dash-stat-value">{deniedOCS.length}</p>
            <p className="dash-stat-label">Denied</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by student name, ID, course, or consent type..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Deadline lock banner */}
        {isDeadlinePassed && (
          <StatusBanner type="error" title="Request Deadline Has Passed" description="OCS approval is locked — no actions can be performed on pending requests for this term." />
        )}

        {/* Pending OCS Actions */}
        <div className="portal-panel">
          <div className="panel-header-pending">
            <span>Pending Applications</span>
            {pendingOCS.length > 0 && <span className="bg-muted text-foreground text-xs px-2 py-0.5 rounded font-bold">{pendingOCS.length} pending</span>}
          </div>
          <div className="p-3 space-y-3 bg-background">
            {groupBySection(pendingOCS, 'pending').length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No pending OCS consent applications.</p>
                <p className="text-muted-foreground text-sm mt-1">All applications have been processed.</p>
              </div>
            ) : (
              groupBySection(pendingOCS, 'pending').map(([groupKey, records]) => (
                <SectionGroupCard key={groupKey} groupKey={groupKey} sectionId={records[0].sectionId} records={records} showActions isLocked={isDeadlinePassed} />
              ))
            )}
          </div>
        </div>

        {/* Transaction History — only approved/denied */}
        <div className="portal-panel">
          <div className="panel-header-history">
            <span>Transaction History</span>
            <span className="text-white/70 text-xs font-normal">{processedOCS.length} total</span>
          </div>
          <div className="p-3 space-y-3 bg-background">
            {groupBySection(processedOCS, 'history').length === 0 ? (
              <div className="py-10 text-center">
                <FileCheck className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No processed OCS consent records yet.</p>
              </div>
            ) : (
              groupBySection(processedOCS, 'history').map(([groupKey, records]) => (
                <SectionGroupCard key={groupKey} groupKey={groupKey} sectionId={records[0].sectionId} records={records} />
              ))
            )}
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}
