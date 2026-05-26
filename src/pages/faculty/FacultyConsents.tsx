import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [termFilter, setTermFilter] = useState(activeTerm?.id ?? state.terms[0]?.id ?? '');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) =>
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const mySections = state.sections.filter(s => s.facultyId === faculty.id && s.termId === termFilter);
  const deptCourseIds = new Set(
    faculty.department ? state.courses.filter(c => c.department === faculty.department).map(c => c.id) : []
  );
  const deptSections = state.sections.filter(
    s => s.termId === termFilter && deptCourseIds.has(s.courseId) && s.facultyId !== faculty.id
  );

  const getSectionConsents = (sectionId: string) =>
    state.consents.filter(c => c.sectionId === sectionId && c.termId === termFilter);

  const getDeptConsentsForSection = (sectionId: string) => {
    const sec = state.sections.find(s => s.id === sectionId);
    if (!sec || !deptCourseIds.has(sec.courseId)) return [];
    return state.consents.filter(c => c.sectionId === sectionId && c.termId === termFilter && c.deptConsentStatus !== 'not_requested');
  };

  const getStudent = (id: string) => state.users.find(u => u.id === id);
  const getCourse = (sectionId: string) => {
    const sec = state.sections.find(s => s.id === sectionId);
    return sec ? state.courses.find(c => c.id === sec.courseId) : undefined;
  };

  const totalCoiPending = state.consents.filter(
    c => c.termId === termFilter && mySections.some(s => s.id === c.sectionId) && c.coiStatus === 'pending'
  ).length;
  const totalDeptPending = state.consents.filter(
    c => c.termId === termFilter && state.sections.some(s => s.id === c.sectionId && deptCourseIds.has(s.courseId)) && c.deptConsentStatus === 'pending'
  ).length;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ConsentRow = ({ consent, type }: { consent: any; type: 'coi' | 'dept' }) => {
    const student = getStudent(consent.studentId);
    const course = getCourse(consent.sectionId);
    if (!student || !course) return null;
    const currentStatus: ConsentStatus = type === 'coi' ? consent.coiStatus : consent.deptConsentStatus;
    const statusField: 'coiStatus' | 'deptConsentStatus' = type === 'coi' ? 'coiStatus' : 'deptConsentStatus';
    const reason = type === 'coi' ? consent.coiReason : consent.deptReason;
    return (
      <div className="flex items-start gap-3 py-3 border-b last:border-0 flex-wrap">
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
          {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{student.name}</p>
            <p className="text-xs text-muted-foreground">{student.studentNumber ?? student.username}</p>
            <Badge className="text-xs bg-primary/10 text-primary border-primary/20">{type === 'coi' ? 'COI' : 'Dept'}</Badge>
          </div>
          {student.program && <p className="text-xs text-muted-foreground truncate">{student.program}</p>}
          {reason && <p className="text-xs italic text-muted-foreground mt-0.5">"{reason}"</p>}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5"><StatusIcon status={currentStatus} />{statusBadge(currentStatus)}</div>
          {currentStatus === 'pending' && (
            <div className="flex gap-1.5">
              <Button size="sm" className="h-6 px-2 bg-green-600 text-white hover:bg-green-700 gap-1 text-xs"
                onClick={() => updateConsentStatus(consent.id, statusField, 'approved')}>
                <CheckCircle className="w-3 h-3" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="h-6 px-2 border-red-300 text-red-600 hover:bg-red-50 gap-1 text-xs"
                onClick={() => updateConsentStatus(consent.id, statusField, 'denied')}>
                <XCircle className="w-3 h-3" /> Deny
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const SectionConsentCard = ({ sectionId, isDept = false }: { sectionId: string; isDept?: boolean }) => {
    const sec = state.sections.find(s => s.id === sectionId);
    if (!sec) return null;
    const course = state.courses.find(c => c.id === sec.courseId);
    if (!course) return null;
    const coiRecords = isDept ? [] : getSectionConsents(sectionId).filter(c => c.coiStatus !== 'not_requested');
    const deptRecords = isDept
      ? getDeptConsentsForSection(sectionId)
      : getSectionConsents(sectionId).filter(c => c.deptConsentStatus !== 'not_requested' && deptCourseIds.has(sec.courseId));
    const allRecords = [...coiRecords, ...deptRecords];
    const pendingCount = coiRecords.filter(c => c.coiStatus === 'pending').length + deptRecords.filter(c => c.deptConsentStatus === 'pending').length;
    const isExpanded = expandedSections.has(sectionId);
    const sectionFaculty = isDept ? state.users.find(u => u.id === sec.facultyId) : null;

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
              {isDept && sectionFaculty && <p className="text-xs text-muted-foreground">{sectionFaculty.name}</p>}
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{sec.enrolled}/{sec.slots}</span>
                <span>{course.units}u{course.labUnits ? `+${course.labUnits}L` : ''}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground">{allRecords.length} req</span>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>
        {isExpanded && (
          <div className="px-4 pb-2 bg-background">
            {allRecords.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No consent requests for this section.</p>
            ) : (
              <>
                {coiRecords.sort((a, b) => (a.coiStatus === 'pending' ? -1 : 1) - (b.coiStatus === 'pending' ? -1 : 1))
                  .map(c => <ConsentRow key={c.id} consent={c} type="coi" />)}
                {deptRecords.sort((a, b) => (a.deptConsentStatus === 'pending' ? -1 : 1) - (b.deptConsentStatus === 'pending' ? -1 : 1))
                  .map(c => <ConsentRow key={c.id} consent={c} type="dept" />)}
              </>
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

        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Consent Requests
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Review COI and department consent requests for {selectedTerm?.name ?? '—'}</p>
          </div>
          <Select value={termFilter} onValueChange={v => { setTermFilter(v); setExpandedSections(new Set()); }}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Select semester" /></SelectTrigger>
            <SelectContent>
              {state.terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}{t.isActive ? ' (Active)' : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* ── Stats row ────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b pb-3">
          <span>COI Pending: <strong className="text-yellow-700">{totalCoiPending}</strong></span>
          <span>Dept Pending: <strong className="text-orange-700">{totalDeptPending}</strong></span>
          <span>My Sections: <strong className="text-foreground">{mySections.length}</strong></span>
        </div>

        {/* ── My Sections — COI ─────────────────────────────────────── */}
        <div className="rounded-md overflow-hidden border border-border">
          <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> My Sections — COI Requests</span>
            {totalCoiPending > 0 && <Badge className="bg-yellow-300 text-yellow-900 text-xs border-0">{totalCoiPending} pending</Badge>}
          </div>
          <div className="p-3 space-y-2 bg-background">
            {mySections.length === 0 ? (
              <div className="py-10 text-center">
                <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No sections assigned for this semester.</p>
                <p className="text-muted-foreground text-sm mt-1">Contact admin to assign sections to your account.</p>
              </div>
            ) : (
              mySections.map(s => <SectionConsentCard key={s.id} sectionId={s.id} />)
            )}
          </div>
        </div>

        {/* ── Dept Consent ─────────────────────────────────────────── */}
        {faculty.department ? (
          deptSections.length > 0 && (
            <div className="rounded-md overflow-hidden border border-border">
              <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Dept Consent — {faculty.department}</span>
                {totalDeptPending > 0 && <Badge className="bg-yellow-300 text-yellow-900 text-xs border-0">{totalDeptPending} pending</Badge>}
              </div>
              <div className="p-3 space-y-2 bg-background">
                {deptSections.map(s => <SectionConsentCard key={s.id} sectionId={s.id} isDept />)}
              </div>
            </div>
          )
        ) : (
          <div className="rounded-md overflow-hidden border border-border">
            <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm">
              Department Consent
            </div>
            <div className="py-10 text-center bg-background">
              <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">No department assigned to your account.</p>
              <p className="text-muted-foreground text-sm mt-1">Contact an administrator to assign your department.</p>
            </div>
          </div>
        )}

      </div>
    </PortalLayout>
  );
}
