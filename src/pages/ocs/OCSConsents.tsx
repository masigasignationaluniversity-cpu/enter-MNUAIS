import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, AlertCircle, FileCheck } from 'lucide-react';
import type { ConsentStatus } from '@/lib/types';

const StatusIcon = ({ status }: { status: ConsentStatus }) => {
  if (status === 'approved') return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === 'denied') return <XCircle className="w-4 h-4 text-red-500" />;
  if (status === 'pending') return <Clock className="w-4 h-4 text-yellow-500" />;
  return <AlertCircle className="w-4 h-4 text-gray-400" />;
};

const statusBadge = (status: ConsentStatus) => {
  const classes = {
    approved: 'bg-green-100 text-green-800 border-green-200',
    denied: 'bg-red-100 text-red-800 border-red-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    not_requested: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return <Badge className={`text-xs ${classes[status]}`}>{status.replace('_', ' ').toUpperCase()}</Badge>;
};

export default function OCSConsents() {
  const { state, updateConsentStatus } = useApp();
  const [termFilter, setTermFilter] = useState(state.terms.find(t => t.isActive)?.id ?? state.terms[0]?.id ?? '');

  const ocsUser = state.currentUser;
  const ocsCollege = ocsUser?.college
    ? state.colleges.find(c => c.name === ocsUser.college) ?? null
    : null;
  const collegeDeptNames = new Set(
    ocsCollege
      ? state.departments.filter(d => d.collegeId === ocsCollege.id).map(d => d.name)
      : []
  );
  const collegeCourseIds = new Set(
    ocsCollege
      ? state.courses.filter(c => collegeDeptNames.has(c.department)).map(c => c.id)
      : state.courses.map(c => c.id)
  );

  // Show ALL consent records that have any OCS-relevant pending state
  const allConsents = state.consents.filter(c => {
    if (termFilter && c.termId !== termFilter) return false;
    // Dept filter
    const sec = state.sections.find(s => s.id === c.sectionId);
    if (!sec) return false;
    if (!collegeCourseIds.has(sec.courseId)) return false;
    return true;
  });

  const pendingOCS = allConsents.filter(c => c.ocsConsentStatus === 'pending');
  const pendingDept = allConsents.filter(c => c.deptConsentStatus === 'pending');
  const processed = allConsents.filter(c => c.ocsConsentStatus !== 'not_requested' && c.ocsConsentStatus !== 'pending');
  const allVisible = allConsents;

  const getStudent = (id: string) => state.users.find(u => u.id === id);
  const getSection = (id: string) => state.sections.find(s => s.id === id);
  const getCourse = (sectionId: string) => {
    const sec = state.sections.find(s => s.id === sectionId);
    return sec ? state.courses.find(c => c.id === sec.courseId) : undefined;
  };

  const ConsentCard = ({ consent, showActions = false }: { consent: typeof allConsents[0]; showActions?: boolean }) => {
    const student = getStudent(consent.studentId);
    const section = getSection(consent.sectionId);
    const course = getCourse(consent.sectionId);
    if (!student || !section || !course) return null;

    return (
      <Card className="portal-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                  {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{student.name}</p>
                  <p className="text-xs text-gray-500">{student.studentNumber}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-primary mt-1">{course.code} — {course.title}</p>
              <p className="text-xs text-gray-500">Section {section.sectionCode}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                <span className="font-medium">Prereq:</span>{' '}
                {(course.prerequisites ?? []).length === 0
                  ? 'None'
                  : (course.prerequisites ?? []).map(pid => state.courses.find(c => c.id === pid)?.code ?? pid).join(', ')}
                {' · '}
                <span className="font-medium">Coreq:</span>{' '}
                {(course.corequisites ?? []).length === 0
                  ? 'None'
                  : (course.corequisites ?? []).map(pid => state.courses.find(c => c.id === pid)?.code ?? pid).join(', ')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">COI</p>
                <div className="flex flex-col items-center gap-1">
                  <StatusIcon status={consent.coiStatus} />
                  {statusBadge(consent.coiStatus)}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">OCS</p>
                <div className="flex flex-col items-center gap-1">
                  <StatusIcon status={consent.ocsConsentStatus} />
                  {statusBadge(consent.ocsConsentStatus)}
                  {consent.ocsReason && (
                    <p className="text-xs text-gray-500 max-w-[100px] text-center truncate" title={consent.ocsReason}>{consent.ocsReason}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          {showActions && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {consent.ocsConsentStatus === 'pending' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">OCS Consent:</span>
                  <Button size="sm" className="h-7 bg-green-600 text-white hover:bg-green-700 gap-1 text-xs"
                    onClick={() => updateConsentStatus(consent.id, 'ocsConsentStatus', 'approved')}>
                    <CheckCircle className="w-3 h-3" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 border-red-300 text-red-600 hover:bg-red-50 gap-1 text-xs"
                    onClick={() => updateConsentStatus(consent.id, 'ocsConsentStatus', 'denied')}>
                    <XCircle className="w-3 h-3" /> Deny
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const hasPendingAction = (c: typeof allConsents[0]) =>
    c.ocsConsentStatus === 'pending';

  return (
    <PortalLayout role="ocs" userName={state.currentUser?.name ?? ''}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-primary" /> Consent Management
            </h1>
            <p className="text-gray-600 mt-1">Review and process student consent requests</p>
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'OCS Pending', count: pendingOCS.length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'OCS Processed', count: processed.length, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Total Records', count: allVisible.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(s => (
            <Card key={s.label} className={`${s.bg} border-0`}>
              <CardContent className="pt-4 pb-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-gray-600 mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="pending">Pending Action ({pendingOCS.length})</TabsTrigger>
            <TabsTrigger value="processed">Processed ({processed.length})</TabsTrigger>
            <TabsTrigger value="all">All Records ({allVisible.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-3">
            {allVisible.filter(hasPendingAction).length === 0 ? (
              <p className="text-gray-400 text-center py-8">No pending consent requests.</p>
            ) : (
              allVisible.filter(hasPendingAction).map(c => <ConsentCard key={c.id} consent={c} showActions />)
            )}
          </TabsContent>

          <TabsContent value="processed" className="mt-4 space-y-3">
            {processed.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No processed records.</p>
            ) : (
              processed.map(c => <ConsentCard key={c.id} consent={c} />)
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-4 space-y-3">
            {allVisible.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No consent records found.</p>
            ) : (
              allVisible.map(c => <ConsentCard key={c.id} consent={c} showActions={hasPendingAction(c)} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
}
