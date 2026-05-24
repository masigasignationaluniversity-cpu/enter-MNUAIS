import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, AlertCircle, ClipboardList, User } from 'lucide-react';
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

  const [termFilter, setTermFilter] = useState(state.terms.find(t => t.isActive)?.id ?? state.terms[0]?.id ?? '');

  // Sections taught by this faculty
  const mySectionIds = new Set(
    state.sections
      .filter(s => s.facultyId === faculty.id)
      .map(s => s.id)
  );

  // Course IDs for faculty's department (for Dept Consent)
  const deptCourseIds = new Set(
    faculty.department
      ? state.courses.filter(c => c.department === faculty.department).map(c => c.id)
      : []
  );

  const deptSectionIds = new Set(
    state.sections
      .filter(s => deptCourseIds.has(s.courseId))
      .map(s => s.id)
  );

  // COI requests: consent records for my sections where coiStatus is pending (or any non-not_requested)
  const coiConsents = state.consents.filter(c => {
    if (termFilter && c.termId !== termFilter) return false;
    return mySectionIds.has(c.sectionId) && c.coiStatus !== 'not_requested';
  });
  const coiPending = coiConsents.filter(c => c.coiStatus === 'pending');
  const coiProcessed = coiConsents.filter(c => c.coiStatus !== 'pending');

  // Dept Consent requests: pending dept consent for courses in my department
  const deptConsents = state.consents.filter(c => {
    if (termFilter && c.termId !== termFilter) return false;
    return deptSectionIds.has(c.sectionId) && c.deptConsentStatus !== 'not_requested';
  });
  const deptPending = deptConsents.filter(c => c.deptConsentStatus === 'pending');
  const deptProcessed = deptConsents.filter(c => c.deptConsentStatus !== 'pending');

  const getStudent = (id: string) => state.users.find(u => u.id === id);
  const getSection = (id: string) => state.sections.find(s => s.id === id);
  const getCourseFromSection = (sectionId: string) => {
    const sec = state.sections.find(s => s.id === sectionId);
    return sec ? state.courses.find(c => c.id === sec.courseId) : undefined;
  };
  const getPrereqNames = (courseId: string): string => {
    const course = state.courses.find(c => c.id === courseId);
    if (!course?.prerequisites?.length) return 'None';
    return course.prerequisites.map(pid => state.courses.find(c => c.id === pid)?.code ?? pid).join(', ');
  };
  const getCoreqNames = (courseId: string): string => {
    const course = state.courses.find(c => c.id === courseId);
    if (!course?.corequisites?.length) return 'None';
    return course.corequisites.map(pid => state.courses.find(c => c.id === pid)?.code ?? pid).join(', ');
  };

  interface ConsentCardProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    consent: any;
    type: 'coi' | 'dept';
    showActions?: boolean;
  }

  const ConsentCard = ({ consent, type, showActions = false }: ConsentCardProps) => {
    const student = getStudent(consent.studentId);
    const section = getSection(consent.sectionId);
    const course = getCourseFromSection(consent.sectionId);
    const sectionFaculty = section ? state.users.find(u => u.id === section.facultyId) : null;
    if (!student || !section || !course) return null;

    const currentStatus: ConsentStatus = type === 'coi' ? consent.coiStatus : consent.deptConsentStatus;
    const statusField: 'coiStatus' | 'deptConsentStatus' = type === 'coi' ? 'coiStatus' : 'deptConsentStatus';
    const reason = type === 'coi' ? consent.coiReason : consent.deptReason;
    const typeLabel = type === 'coi' ? 'Consent of Instructor (COI)' : 'Department Consent';

    return (
      <Card className="portal-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-4 flex-wrap">
            {/* Student info */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground">{student.name}</p>
                <p className="text-xs text-muted-foreground">{student.studentNumber ?? '@' + student.username}</p>
                {student.program && <p className="text-xs text-muted-foreground truncate max-w-[140px]">{student.program}</p>}
              </div>
            </div>

            {/* Course info */}
            <div className="flex-1 min-w-[160px]">
              <p className="text-sm font-semibold text-primary">{course.code} — {course.title}</p>
              <p className="text-xs text-muted-foreground">
                Section {section.sectionCode}
                {sectionFaculty && type === 'dept' ? ` • ${sectionFaculty.name.split(' ').slice(-1)[0]}` : ''}
              </p>
              <p className="text-xs text-muted-foreground/80 mt-0.5">
                {course.units} unit{course.units !== 1 ? 's' : ''}{course.labUnits ? ` + ${course.labUnits} lab` : ''}
              </p>
              {/* Pre/Co-req */}
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span><span className="font-semibold">Pre:</span> {getPrereqNames(course.id)}</span>
                <span><span className="font-semibold">Co:</span> {getCoreqNames(course.id)}</span>
              </div>
              {/* Reason */}
              {reason && (
                <p className="mt-1 text-xs italic text-muted-foreground">
                  "{reason}"
                </p>
              )}
            </div>

            {/* Status + actions */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <StatusIcon status={currentStatus} />
                {statusBadge(currentStatus)}
              </div>
              <p className="text-xs text-muted-foreground">{typeLabel}</p>
              {showActions && currentStatus === 'pending' && (
                <div className="flex gap-2 mt-1">
                  <Button
                    size="sm"
                    className="h-7 bg-green-600 text-white hover:bg-green-700 gap-1 text-xs"
                    onClick={() => updateConsentStatus(consent.id, statusField, 'approved')}
                  >
                    <CheckCircle className="w-3 h-3" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-red-300 text-red-600 hover:bg-red-50 gap-1 text-xs"
                    onClick={() => updateConsentStatus(consent.id, statusField, 'denied')}
                  >
                    <XCircle className="w-3 h-3" /> Deny
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const totalPending = coiPending.length + deptPending.length;

  return (
    <PortalLayout role="faculty" userName={faculty.name}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-primary" /> Consent Requests
            </h1>
            <p className="text-gray-600 mt-1">
              Review COI and department consent requests from students
            </p>
          </div>
          <Select value={termFilter} onValueChange={setTermFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Filter by term" />
            </SelectTrigger>
            <SelectContent>
              {state.terms.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'COI Pending', count: coiPending.length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Dept Pending', count: deptPending.length, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'COI Processed', count: coiProcessed.length, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Dept Processed', count: deptProcessed.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(s => (
            <Card key={s.label} className={`${s.bg} border-0`}>
              <CardContent className="pt-4 pb-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-gray-600 mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="coi">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="coi">
              COI ({coiPending.length} pending)
            </TabsTrigger>
            <TabsTrigger value="dept">
              Dept Consent ({deptPending.length} pending)
            </TabsTrigger>
          </TabsList>

          {/* ── COI Tab ── */}
          <TabsContent value="coi" className="mt-4">
            {coiConsents.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 font-medium">No COI requests for your sections.</p>
                <p className="text-gray-400 text-sm mt-1">Students request COI from the instructor when they need to enlist with special permission.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {coiPending.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-yellow-500" /> Pending ({coiPending.length})
                    </p>
                    <div className="space-y-3">
                      {coiPending.map(c => <ConsentCard key={c.id} consent={c} type="coi" showActions />)}
                    </div>
                  </div>
                )}
                {coiProcessed.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-green-500" /> Processed ({coiProcessed.length})
                    </p>
                    <div className="space-y-3">
                      {coiProcessed.map(c => <ConsentCard key={c.id} consent={c} type="coi" />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Dept Consent Tab ── */}
          <TabsContent value="dept" className="mt-4">
            {!faculty.department ? (
              <div className="text-center py-12">
                <AlertCircle className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 font-medium">No department assigned to your account.</p>
                <p className="text-gray-400 text-sm mt-1">Contact an administrator to assign your department.</p>
              </div>
            ) : deptConsents.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 font-medium">No department consent requests.</p>
                <p className="text-gray-400 text-sm mt-1">Dept: <span className="font-medium text-gray-500">{faculty.department}</span></p>
              </div>
            ) : (
              <div className="space-y-4">
                {deptPending.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-yellow-500" /> Pending ({deptPending.length})
                    </p>
                    <div className="space-y-3">
                      {deptPending.map(c => <ConsentCard key={c.id} consent={c} type="dept" showActions />)}
                    </div>
                  </div>
                )}
                {deptProcessed.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-green-500" /> Processed ({deptProcessed.length})
                    </p>
                    <div className="space-y-3">
                      {deptProcessed.map(c => <ConsentCard key={c.id} consent={c} type="dept" />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
}
