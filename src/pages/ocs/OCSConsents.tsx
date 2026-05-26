import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Clock, AlertCircle, FileCheck, Search } from 'lucide-react';
import type { ConsentStatus } from '@/lib/types';

const StatusIcon = ({ status }: { status: ConsentStatus }) => {
  if (status === 'approved') return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === 'denied')   return <XCircle className="w-4 h-4 text-red-500" />;
  if (status === 'pending')  return <Clock className="w-4 h-4 text-yellow-500" />;
  return <AlertCircle className="w-4 h-4 text-gray-400" />;
};

const statusBadge = (status: ConsentStatus) => {
  const classes = { approved: 'bg-green-100 text-green-800 border-green-200', denied: 'bg-red-100 text-red-800 border-red-200', pending: 'bg-yellow-100 text-yellow-800 border-yellow-200', not_requested: 'bg-gray-100 text-gray-600 border-gray-200' };
  return <Badge className={`text-xs ${classes[status]}`}>{status.replace('_', ' ').toUpperCase()}</Badge>;
};

export default function OCSConsents() {
  const { state, updateConsentStatus } = useApp();
  const [termFilter, setTermFilter] = useState(state.terms.find(t => t.isActive)?.id ?? state.terms[0]?.id ?? '');
  const [search, setSearch] = useState('');

  const ocsUser = state.currentUser;
  const ocsCollege = ocsUser?.college ? state.colleges.find(c => c.name === ocsUser.college) ?? null : null;
  const collegeDeptNames = new Set(ocsCollege ? state.departments.filter(d => d.collegeId === ocsCollege.id).map(d => d.name) : []);
  const collegeCourseIds = new Set(ocsCollege ? state.courses.filter(c => collegeDeptNames.has(c.department)).map(c => c.id) : state.courses.map(c => c.id));

  const allConsents = state.consents.filter(c => {
    if (termFilter && c.termId !== termFilter) return false;
    const sec = state.sections.find(s => s.id === c.sectionId);
    if (!sec || !collegeCourseIds.has(sec.courseId)) return false;
    return true;
  });

  const pendingOCS  = allConsents.filter(c => c.ocsConsentStatus === 'pending');
  const processed   = allConsents.filter(c => c.ocsConsentStatus !== 'not_requested' && c.ocsConsentStatus !== 'pending');

  const getStudent = (id: string) => state.users.find(u => u.id === id);
  const getSection = (id: string) => state.sections.find(s => s.id === id);
  const getCourse  = (sectionId: string) => { const sec = state.sections.find(s => s.id === sectionId); return sec ? state.courses.find(c => c.id === sec.courseId) : undefined; };

  const filterConsents = (list: typeof allConsents) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(c => {
      const student = getStudent(c.studentId);
      const course = getCourse(c.sectionId);
      return student?.name.toLowerCase().includes(q) || student?.studentNumber?.toLowerCase().includes(q) || course?.code.toLowerCase().includes(q) || course?.title.toLowerCase().includes(q);
    });
  };

  const ConsentCard = ({ consent, showActions = false }: { consent: typeof allConsents[0]; showActions?: boolean }) => {
    const student = getStudent(consent.studentId);
    const section = getSection(consent.sectionId);
    const course  = getCourse(consent.sectionId);
    if (!student || !section || !course) return null;

    return (
      <div className="border rounded-md px-4 py-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="font-semibold text-sm">{student.name}</p>
                <p className="text-xs text-muted-foreground">{student.studentNumber}</p>
              </div>
            </div>
            <p className="text-sm font-medium text-primary mt-1">{course.code} — {course.title}</p>
            <p className="text-xs text-muted-foreground">Section {section.sectionCode}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">COI</p>
              <div className="flex flex-col items-center gap-1"><StatusIcon status={consent.coiStatus} />{statusBadge(consent.coiStatus)}</div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">OCS</p>
              <div className="flex flex-col items-center gap-1"><StatusIcon status={consent.ocsConsentStatus} />{statusBadge(consent.ocsConsentStatus)}</div>
            </div>
          </div>
        </div>
        {showActions && consent.ocsConsentStatus === 'pending' && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">OCS Consent:</span>
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
    );
  };

  return (
    <PortalLayout role="ocs" userName={state.currentUser?.name ?? ''}>
      <div className="space-y-4">

        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <FileCheck className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Consent Management
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Review and process student consent requests</p>
          </div>
          <Select value={termFilter} onValueChange={setTermFilter}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Filter by term" /></SelectTrigger>
            <SelectContent>
              {state.terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* ── Stats row ────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b pb-3">
          <span>OCS Pending: <strong className="text-yellow-700">{pendingOCS.length}</strong></span>
          <span>OCS Processed: <strong className="text-green-700">{processed.length}</strong></span>
          <span>Total Records: <strong className="text-foreground">{allConsents.length}</strong></span>
        </div>

        {/* ── Search ──────────────────────────────────────────────── */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by student name, ID, or course..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* ── Pending OCS Actions ──────────────────────────────────── */}
        <div className="rounded-md overflow-hidden border border-border">
          <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between">
            <span>Pending OCS Actions</span>
            {pendingOCS.length > 0 && <Badge className="bg-yellow-300 text-yellow-900 text-xs border-0">{pendingOCS.length} pending</Badge>}
          </div>
          <div className="p-3 space-y-2 bg-background">
            {filterConsents(pendingOCS).length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No pending consent requests.</p>
                <p className="text-muted-foreground text-sm mt-1">All OCS consent requests have been processed.</p>
              </div>
            ) : (
              filterConsents(pendingOCS).map(c => <ConsentCard key={c.id} consent={c} showActions />)
            )}
          </div>
        </div>

        {/* ── All Consent Records ──────────────────────────────────── */}
        <div className="rounded-md overflow-hidden border border-border">
          <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between">
            <span>All Consent Records</span>
            <span className="text-primary-foreground/70 text-xs font-normal">{allConsents.length} total</span>
          </div>
          <div className="p-3 space-y-2 bg-background">
            {filterConsents(allConsents).length === 0 ? (
              <div className="py-10 text-center">
                <FileCheck className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No consent records found.</p>
              </div>
            ) : (
              filterConsents(allConsents).map(c => <ConsentCard key={c.id} consent={c} showActions={c.ocsConsentStatus === 'pending'} />)
            )}
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}
