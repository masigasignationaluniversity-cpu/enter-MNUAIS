import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Clock, FileCheck, Search, Paperclip } from 'lucide-react';
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

  const ocsUser = state.currentUser;
  const ocsCollege = ocsUser?.college ? state.colleges.find(c => c.name === ocsUser.college) ?? null : null;
  const collegeDeptNames = new Set(ocsCollege ? state.departments.filter(d => d.collegeId === ocsCollege.id).map(d => d.name) : []);
  const collegeCourseIds = new Set(ocsCollege ? state.courses.filter(c => collegeDeptNames.has(c.department)).map(c => c.id) : state.courses.map(c => c.id));

  const allConsents = state.consents.filter(c => {
    if (termFilter && c.termId !== termFilter) return false;
    const sec = state.sections.find(s => s.id === c.sectionId);
    if (!sec || !collegeCourseIds.has(sec.courseId)) return false;
    return c.ocsConsentStatus !== 'not_requested'; // Only show OCS consent requests
  });

  const pendingOCS   = allConsents.filter(c => c.ocsConsentStatus === 'pending');
  const processedOCS = allConsents.filter(c => c.ocsConsentStatus !== 'pending');

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

  const ConsentRow = ({ consent, showActions = false }: { consent: typeof allConsents[0]; showActions?: boolean }) => {
    const student = getStudent(consent.studentId);
    const section = getSection(consent.sectionId);
    const course  = getCourse(consent.sectionId);
    if (!student || !section || !course) return null;
    const college = getCollege(course.id);
    return (
      <tr className="border-b last:border-0 hover:bg-muted/10">
        {/* Student */}
        <td className="px-3 py-2 align-top">
          <p className="font-semibold text-xs">{student.name}</p>
          <p className="text-xs text-muted-foreground">{student.studentNumber}</p>
          {student.program && <p className="text-xs text-muted-foreground truncate max-w-[120px]">{student.program}</p>}
        </td>
        {/* Course */}
        <td className="px-3 py-2 align-top text-xs font-mono font-semibold text-primary whitespace-nowrap">{course.code}</td>
        {/* Type */}
        <td className="px-3 py-2 align-top text-xs text-muted-foreground max-w-[130px]">
          {consent.ocsConsentType
            ? <span className="inline-block leading-4">{consent.ocsConsentType}</span>
            : <span className="text-muted-foreground/40">—</span>}
        </td>
        {/* Section */}
        <td className="px-3 py-2 align-top text-xs whitespace-nowrap">{section.sectionCode}</td>
        {/* Description | Day - Time */}
        <td className="px-3 py-2 align-top text-xs text-muted-foreground max-w-[160px]">
          <p className="line-clamp-1">{course.title}</p>
          <p className="text-muted-foreground/70">{section.schedule.days.join('')} {section.schedule.startTime}–{section.schedule.endTime}</p>
        </td>
        {/* College */}
        <td className="px-3 py-2 align-top text-xs text-muted-foreground whitespace-nowrap">{college}</td>
        {/* Attachment */}
        <td className="px-3 py-2 align-top text-xs">
          {consent.ocsAttachmentName
            ? <span className="flex items-center gap-1 text-blue-600 truncate max-w-[100px]" title={consent.ocsAttachmentName}>
                <Paperclip className="w-3 h-3 flex-shrink-0" />{consent.ocsAttachmentName}
              </span>
            : <span className="text-muted-foreground/40">—</span>}
        </td>
        {/* Remarks */}
        <td className="px-3 py-2 align-top text-xs text-muted-foreground italic max-w-[150px]">
          {consent.ocsReason ? `"${consent.ocsReason}"` : '—'}
        </td>
        {/* Status / Action */}
        <td className="px-3 py-2 align-top whitespace-nowrap">
          <div className="flex flex-col gap-1.5">
            <StatusBadge status={consent.ocsConsentStatus} />
            {consent.ocsConsentStatus === 'approved' && (
              <span className="text-xs text-green-600 font-medium">Auto-enlisted</span>
            )}
            {showActions && consent.ocsConsentStatus === 'pending' && (
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

  const TableHeader = () => (
    <thead>
      <tr className="border-b bg-muted/20">
        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Student</th>
        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Course</th>
        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Type</th>
        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Section</th>
        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Description | Day - Time</th>
        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">College</th>
        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Attachment</th>
        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Remarks/Appeal</th>
        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Action</th>
      </tr>
    </thead>
  );

  return (
    <PortalLayout role="ocs" userName={state.currentUser?.name ?? ''}>
      <div className="space-y-4">

        {/* Page header */}
        <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <FileCheck className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> OCS Consent Management
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Review and process student OCS consent applications</p>
          </div>
          <Select value={termFilter} onValueChange={setTermFilter}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Filter by term" /></SelectTrigger>
            <SelectContent>
              {state.terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b pb-3">
          <span>Pending: <strong className="text-yellow-700">{pendingOCS.length}</strong></span>
          <span>Processed: <strong className="text-green-700">{processedOCS.length}</strong></span>
          <span>Total: <strong className="text-foreground">{allConsents.length}</strong></span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by student name, ID, course, or consent type..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Pending OCS Actions */}
        <div className="rounded-md overflow-hidden border border-border">
          <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between">
            <span>Pending OCS Applications</span>
            {pendingOCS.length > 0 && <Badge className="bg-yellow-300 text-yellow-900 text-xs border-0">{pendingOCS.length} pending</Badge>}
          </div>
          <div className="bg-background">
            {filterConsents(pendingOCS).length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No pending OCS consent applications.</p>
                <p className="text-muted-foreground text-sm mt-1">All applications have been processed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <TableHeader />
                  <tbody>
                    {filterConsents(pendingOCS).map(c => <ConsentRow key={c.id} consent={c} showActions />)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* All OCS Records */}
        <div className="rounded-md overflow-hidden border border-border">
          <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between">
            <span>All OCS Consent Records</span>
            <span className="text-primary-foreground/70 text-xs font-normal">{allConsents.length} total</span>
          </div>
          <div className="bg-background">
            {filterConsents(allConsents).length === 0 ? (
              <div className="py-10 text-center">
                <FileCheck className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No OCS consent records found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <TableHeader />
                  <tbody>
                    {filterConsents(allConsents).map(c => <ConsentRow key={c.id} consent={c} showActions={c.ocsConsentStatus === 'pending'} />)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}
