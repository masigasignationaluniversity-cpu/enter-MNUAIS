import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { TermSelect } from '@/components/shared/TermSelect';
import { Input } from '@/components/ui/input';
import { SectionRequestCard } from '@/components/shared/SectionRequestCard';
import { Unlock, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import type { PrerogativeStatus } from '@/lib/types';

const statusBadge = (s: PrerogativeStatus) => {
  const map = { pending: 'bg-yellow-100 text-yellow-800 border-yellow-200', approved: 'bg-green-100 text-green-800 border-green-200', denied: 'bg-red-100 text-red-800 border-red-200' };
  return <Badge className={`text-xs border ${map[s]}`}>{s.toUpperCase()}</Badge>;
};

export default function OCSPrerogatives() {
  const { state } = useApp();
  const [termFilter, setTermFilter] = useState(state.terms.find(t => t.isActive)?.id ?? 'all');
  const [search, setSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) =>
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const dept = state.currentUser?.department ?? '';
  const deptCourseIds = new Set(dept ? state.courses.filter(c => c.department === dept).map(c => c.id) : state.courses.map(c => c.id));

  const relevantTermIds = new Set(state.prerogatives.filter(p => {
    const sec = state.sections.find(s => s.id === p.sectionId);
    return sec && sec.sectionCode !== '__MANUAL__' && deptCourseIds.has(sec.courseId);
  }).map(p => p.termId));
  const relevantTerms = state.terms.filter(t => relevantTermIds.has(t.id) || !!t.isActive);

  const progs = state.prerogatives.filter(p => {
    if (termFilter !== 'all' && p.termId !== termFilter) return false;
    const sec = state.sections.find(s => s.id === p.sectionId);
    if (!sec || sec.sectionCode === '__MANUAL__' || !deptCourseIds.has(sec.courseId)) return false;
    return true;
  });

  const getStudent = (id: string) => state.users.find(u => u.id === id);
  const getSection = (id: string) => state.sections.find(s => s.id === id);
  const getCourse  = (secId: string) => { const sec = state.sections.find(s => s.id === secId); return sec ? state.courses.find(c => c.id === sec.courseId) : undefined; };
  const getFaculty = (secId: string) => { const sec = state.sections.find(s => s.id === secId); return sec ? state.users.find(u => u.id === sec.facultyId) : undefined; };

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

  const filterProgs = (list: typeof progs) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(p => {
      const student = state.users.find(u => u.id === p.studentId);
      const sec = state.sections.find(s => s.id === p.sectionId);
      const course = sec ? state.courses.find(c => c.id === sec.courseId) : undefined;
      return student?.name.toLowerCase().includes(q) || student?.studentNumber?.toLowerCase().includes(q) || course?.code.toLowerCase().includes(q);
    });
  };

  const pending   = progs.filter(p => p.status === 'pending');
  const processed = progs.filter(p => p.status !== 'pending');

  // Group prerogatives by section for the card-based layout
  const groupBySection = (list: typeof progs, keyPrefix: string) => {
    const map = new Map<string, typeof progs>();
    filterProgs(list).forEach(p => {
      const key = `${keyPrefix}-${p.sectionId}`;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    });
    return Array.from(map.entries());
  };

  const PrgRow = ({ prg }: { prg: typeof progs[0] }) => {
    const student = getStudent(prg.studentId);
    if (!student) return null;
    const appealType = getStudentAppealType(prg.studentId, prg.termId);
    return (
      <tr className={`border-b last:border-0 hover:bg-muted/10 ${appealType ? 'ring-inset ring-1 ring-blue-200 bg-blue-50/30' : ''}`}>
        <td className="px-3 py-2 align-top">
          <p className="font-semibold text-xs">{student.name}</p>
          <p className="text-xs text-muted-foreground">{student.studentNumber}</p>
        </td>
        <td className="px-3 py-2 align-top text-xs italic text-muted-foreground max-w-[240px]">
          "{prg.reason}"
          {appealType && (
            <span className={`block mt-1 not-italic font-semibold px-1.5 py-0.5 rounded text-[10px] w-fit ${appealType === 'change_drop' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
              {appealType === 'change_drop' ? 'OCS-Approved: Change/Drop' : 'OCS-Approved: Late Enrollment'}
            </span>
          )}
        </td>
        <td className="px-3 py-2 align-top text-xs text-muted-foreground whitespace-nowrap">{prg.requestedAt}</td>
        <td className="px-3 py-2 align-top text-xs text-muted-foreground whitespace-nowrap">{prg.processedAt ?? '—'}</td>
        <td className="px-3 py-2 align-top whitespace-nowrap">{statusBadge(prg.status)}</td>
      </tr>
    );
  };

  const SectionGroupCard = ({ groupKey, sectionId, records }: { groupKey: string; sectionId: string; records: typeof progs }) => {
    const section = getSection(sectionId);
    const course = getCourse(sectionId);
    const faculty = getFaculty(sectionId);
    if (!section || !course) return null;
    const pendingCount = records.filter(p => p.status === 'pending').length;
    const isExpanded = expandedSections.has(groupKey);
    return (
      <SectionRequestCard
        courseCode={course.code}
        courseTitle={course.title}
        sectionCode={section.sectionCode}
        pendingCount={pendingCount}
        requestCount={records.length}
        enrolled={section.enrolled}
        slots={section.slots}
        metaLine={`FIC: ${faculty?.name ?? 'Unassigned'}`}
        isExpanded={isExpanded}
        onToggle={() => toggleSection(groupKey)}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Student</th>
                <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Reason/Appeal</th>
                <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Requested</th>
                <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Processed</th>
                <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map(p => <PrgRow key={p.id} prg={p} />)}
            </tbody>
          </table>
        </div>
      </SectionRequestCard>
    );
  };

  return (
    <PortalLayout role="ocs" userName={state.currentUser?.name ?? ''}>
      <div className="space-y-4">

        <TermSelect terms={relevantTerms} value={termFilter} onValueChange={setTermFilter} includeAll />

        {/* ── Stats row ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="dash-stat portal-panel">
            <div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, hsl(38 95% 50%), hsl(25 95% 50%))' }}><Clock className="w-5 h-5" /></div>
            <p className="dash-stat-value">{pending.length}</p>
            <p className="dash-stat-label">Pending</p>
          </div>
          <div className="dash-stat portal-panel">
            <div className="dash-stat-icon" style={{ background: 'var(--gradient-header)' }}><CheckCircle className="w-5 h-5" /></div>
            <p className="dash-stat-value">{progs.filter(p => p.status === 'approved').length}</p>
            <p className="dash-stat-label">Approved</p>
          </div>
          <div className="dash-stat portal-panel">
            <div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, hsl(0 70% 55%), hsl(0 70% 45%))' }}><XCircle className="w-5 h-5" /></div>
            <p className="dash-stat-value">{progs.filter(p => p.status === 'denied').length}</p>
            <p className="dash-stat-label">Denied</p>
          </div>
        </div>

        {/* ── Search ──────────────────────────────────────────────── */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by student name, ID, or course code..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* ── Pending ──────────────────────────────────────────────── */}
        <div className="portal-panel">
          <div className="panel-header-pending">
            <span>Pending Requests</span>
            {pending.length > 0 && <span className="bg-muted text-foreground text-xs px-2 py-0.5 rounded font-bold">{pending.length} pending</span>}
          </div>
          <div className="p-3 space-y-3 bg-background">
            {groupBySection(pending, 'pending').length === 0 ? (
              <div className="py-10 text-center">
                <Clock className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No pending prerogatives.</p>
                <p className="text-muted-foreground text-sm mt-1">All prerogative requests have been processed by faculty.</p>
              </div>
            ) : (
              groupBySection(pending, 'pending').map(([groupKey, records]) => (
                <SectionGroupCard key={groupKey} groupKey={groupKey} sectionId={records[0].sectionId} records={records} />
              ))
            )}
          </div>
        </div>

        {/* ── All Records ──────────────────────────────────────────── */}
        <div className="portal-panel">
          <div className="panel-header-history">
            <span>Transaction History</span>
            <span className="text-white/70 text-xs font-normal">{processed.length} total</span>
          </div>
          <div className="p-3 space-y-3 bg-background">
            {groupBySection(processed, 'history').length === 0 ? (
              <div className="py-10 text-center">
                <Unlock className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No processed prerogative records.</p>
              </div>
            ) : (
              groupBySection(processed, 'history').map(([groupKey, records]) => (
                <SectionGroupCard key={groupKey} groupKey={groupKey} sectionId={records[0].sectionId} records={records} />
              ))
            )}
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}
