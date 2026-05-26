import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, AlertCircle, ClipboardList, BookOpen, Users, ChevronDown, ChevronUp } from 'lucide-react';
import type { ConsentStatus } from '@/lib/types';

const StatusIcon = ({ status }: { status: ConsentStatus }) => {
  if (status === 'approved') return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === 'denied') return <XCircle className="w-4 h-4 text-red-500" />;
  if (status === 'pending') return <Clock className="w-4 h-4 text-yellow-500" />;
  return <AlertCircle className="w-4 h-4 text-gray-400" />;
};

const statusBadge = (status: ConsentStatus) => {
  const classes: Record<ConsentStatus, string> = {
    approved: 'bg-green-100 text-green-800 border-green-200',
    denied: 'bg-red-100 text-red-800 border-red-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
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

  // Sections the faculty teaches in the selected term
  const mySections = state.sections.filter(
    s => s.facultyId === faculty.id && s.termId === termFilter
  );

  // Department course IDs (for dept consent)
  const deptCourseIds = new Set(
    faculty.department
      ? state.courses.filter(c => c.department === faculty.department).map(c => c.id)
      : []
  );

  // Helper: get consent records for a section
  const getSectionConsents = (sectionId: string) =>
    state.consents.filter(c => c.sectionId === sectionId && c.termId === termFilter);

  // Helper: get dept consent records for dept courses in the selected term (that are NOT my own sections)
  const getDeptConsentsForSection = (sectionId: string) => {
    const sec = state.sections.find(s => s.id === sectionId);
    if (!sec || !deptCourseIds.has(sec.courseId)) return [];
    return state.consents.filter(
      c => c.sectionId === sectionId && c.termId === termFilter && c.deptConsentStatus !== 'not_requested'
    );
  };

  // All dept-consent sections (may include sections taught by other faculty in same dept)
  const deptSections = state.sections.filter(
    s => s.termId === termFilter && deptCourseIds.has(s.courseId) && s.facultyId !== faculty.id
  );

  const getStudent = (id: string) => state.users.find(u => u.id === id);
  const getCourse = (sectionId: string) => {
    const sec = state.sections.find(s => s.id === sectionId);
    return sec ? state.courses.find(c => c.id === sec.courseId) : undefined;
  };

  // Summary counts for the header
  const totalCoiPending = state.consents.filter(
    c => c.termId === termFilter && mySections.some(s => s.id === c.sectionId) && c.coiStatus === 'pending'
  ).length;
  const totalDeptPending = state.consents.filter(
    c => c.termId === termFilter &&
    state.sections.some(s => s.id === c.sectionId && deptCourseIds.has(s.courseId)) &&
    c.deptConsentStatus === 'pending'
  ).length;

  interface ConsentRowProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    consent: any;
    type: 'coi' | 'dept';
  }

  const ConsentRow = ({ consent, type }: ConsentRowProps) => {
    const student = getStudent(consent.studentId);
    const course = getCourse(consent.sectionId);
    if (!student || !course) return null;

    const currentStatus: ConsentStatus = type === 'coi' ? consent.coiStatus : consent.deptConsentStatus;
    const statusField: 'coiStatus' | 'deptConsentStatus' = type === 'coi' ? 'coiStatus' : 'deptConsentStatus';
    const reason = type === 'coi' ? consent.coiReason : consent.deptReason;
    const typeLabel = type === 'coi' ? 'COI' : 'Dept';

    return (
      <div className="flex items-start gap-3 py-3 border-b last:border-0 flex-wrap">
        {/* Student avatar */}
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
          {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm text-foreground">{student.name}</p>
            <p className="text-xs text-muted-foreground">{student.studentNumber ?? student.username}</p>
            <Badge className="text-xs bg-primary/10 text-primary border-primary/20">{typeLabel}</Badge>
          </div>
          {student.program && <p className="text-xs text-muted-foreground truncate">{student.program}</p>}
          {reason && <p className="text-xs italic text-muted-foreground mt-0.5">"{reason}"</p>}
        </div>
        {/* Status + actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <StatusIcon status={currentStatus} />
            {statusBadge(currentStatus)}
          </div>
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

  interface SectionConsentCardProps {
    sectionId: string;
    isDept?: boolean;
  }

  const SectionConsentCard = ({ sectionId, isDept = false }: SectionConsentCardProps) => {
    const sec = state.sections.find(s => s.id === sectionId);
    if (!sec) return null;
    const course = state.courses.find(c => c.id === sec.courseId);
    if (!course) return null;

    const coiRecords = isDept ? [] : getSectionConsents(sectionId).filter(c => c.coiStatus !== 'not_requested');
    const deptRecords = isDept
      ? getDeptConsentsForSection(sectionId)
      : getSectionConsents(sectionId).filter(c => c.deptConsentStatus !== 'not_requested' && deptCourseIds.has(sec.courseId));

    const allRecords = [...coiRecords, ...deptRecords];
    const pendingCount = coiRecords.filter(c => c.coiStatus === 'pending').length +
      deptRecords.filter(c => c.deptConsentStatus === 'pending').length;

    const isExpanded = expandedSections.has(sectionId);
    const sectionFaculty = isDept ? state.users.find(u => u.id === sec.facultyId) : null;

    return (
      <Card className="portal-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <button
            className="flex items-center justify-between w-full text-left gap-3"
            onClick={() => toggleSection(sectionId)}
          >
            <div className="flex items-start gap-3 min-w-0">
              <BookOpen className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">{course.code}</span>
                  <Badge variant="outline" className="text-xs">{sec.sectionCode}</Badge>
                  {pendingCount > 0 && (
                    <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">
                      {pendingCount} pending
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{course.title}</p>
                {isDept && sectionFaculty && (
                  <p className="text-xs text-muted-foreground">{sectionFaculty.name}</p>
                )}
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{sec.enrolled}/{sec.slots} slots</span>
                  <span>{course.units} unit{course.units !== 1 ? 's' : ''}{course.labUnits ? ` + ${course.labUnits} lab` : ''}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-muted-foreground">{allRecords.length} request{allRecords.length !== 1 ? 's' : ''}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </button>
        </CardHeader>

        {isExpanded && (
          <CardContent className="px-4 pt-0 pb-3">
            {allRecords.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No consent requests for this section.</p>
            ) : (
              <div>
                {/* COI requests */}
                {coiRecords.length > 0 && (
                  <div className="mb-2">
                    {coiRecords
                      .sort((a, b) => (a.coiStatus === 'pending' ? -1 : 1) - (b.coiStatus === 'pending' ? -1 : 1))
                      .map(c => <ConsentRow key={c.id} consent={c} type="coi" />)}
                  </div>
                )}
                {/* Dept consent requests */}
                {deptRecords.length > 0 && (
                  <div>
                    {deptRecords
                      .sort((a, b) => (a.deptConsentStatus === 'pending' ? -1 : 1) - (b.deptConsentStatus === 'pending' ? -1 : 1))
                      .map(c => <ConsentRow key={c.id} consent={c} type="dept" />)}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  const selectedTerm = state.terms.find(t => t.id === termFilter);

  return (
    <PortalLayout role="faculty" userName={faculty.name}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Consent Requests
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Review COI and department consent requests from students
            </p>
          </div>
          <Select value={termFilter} onValueChange={v => { setTermFilter(v); setExpandedSections(new Set()); }}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              {state.terms.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}{t.isActive ? ' (Active)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'COI Pending', count: totalCoiPending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Dept Pending', count: totalDeptPending, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'My Sections', count: mySections.length, color: 'text-primary', bg: 'bg-primary/5' },
            { label: 'Semester', count: selectedTerm?.name ?? '—', color: 'text-blue-600', bg: 'bg-blue-50', isText: true },
          ].map(s => (
            <Card key={s.label} className={`${s.bg} border-0`}>
              <CardContent className="pt-3 pb-3 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* My Sections — COI Requests */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            My Sections — {selectedTerm?.name ?? 'Selected Semester'}
            {totalCoiPending > 0 && (
              <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">{totalCoiPending} COI pending</Badge>
            )}
          </h2>

          {mySections.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No sections assigned for this semester.</p>
                <p className="text-muted-foreground text-sm mt-1">Contact admin to assign sections to your account.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {mySections.map(s => (
                <SectionConsentCard key={s.id} sectionId={s.id} />
              ))}
            </div>
          )}
        </div>

        {/* Dept Consent — Other Faculty Sections */}
        {faculty.department && deptSections.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Dept Consent — {faculty.department} Courses
              {totalDeptPending > 0 && (
                <Badge className="text-xs bg-orange-100 text-orange-800 border-orange-200">{totalDeptPending} pending</Badge>
              )}
            </h2>
            <div className="space-y-2">
              {deptSections.map(s => (
                <SectionConsentCard key={s.id} sectionId={s.id} isDept />
              ))}
            </div>
          </div>
        )}

        {!faculty.department && (
          <Card>
            <CardContent className="py-8 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">No department assigned to your account.</p>
              <p className="text-muted-foreground text-sm mt-1">Contact an administrator to assign your department for dept consent access.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </PortalLayout>
  );
}
