import { useRef, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { CheckCircle, Clock, XCircle, FileText, Info, Lock, Upload } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { ConsentStatus } from '../../lib/types';
import { OCS_CONSENT_TYPES } from '../../lib/types';

const StatusBadge = ({ s }: { s: ConsentStatus }) => {
  if (s === 'approved') return <Badge className="bg-green-100 text-green-800 border-green-200 gap-1 text-xs"><CheckCircle className="w-3 h-3" />Approved</Badge>;
  if (s === 'pending')  return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1 text-xs"><Clock className="w-3 h-3" />Pending</Badge>;
  if (s === 'denied')   return <Badge className="bg-red-100 text-red-800 border-red-200 gap-1 text-xs"><XCircle className="w-3 h-3" />Denied</Badge>;
  return <Badge variant="outline" className="text-muted-foreground text-xs">—</Badge>;
};

type CoiDeptField = 'coiStatus' | 'deptConsentStatus';
interface ConsentDef { key: CoiDeptField; label: string; short: string; desc: string; requiresField: 'requiresCOI' | 'requiresDeptConsent'; }
type TabState = { courseId: string; sectionId: string; remarks: string };

const COI_DEPT_DEFS: ConsentDef[] = [
  { key: 'coiStatus',         label: 'COI (Consent of Instructor)', short: 'COI', desc: 'Consent of Instructor — required by the faculty teaching the section.',   requiresField: 'requiresCOI' },
  { key: 'deptConsentStatus', label: 'Department Consent',          short: 'DC',  desc: 'Department Consent — required by the department offering the course.',    requiresField: 'requiresDeptConsent' },
];

type OCSTabState = { courseId: string; ocsType: string; sectionId: string; remarks: string; attachmentName: string };

export default function StudentConsent() {
  const { state, requestConsent, getActiveTerm } = useApp();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tabStates, setTabStates] = useState<Record<string, TabState>>({
    coiStatus:         { courseId: '', sectionId: '', remarks: '' },
    deptConsentStatus: { courseId: '', sectionId: '', remarks: '' },
  });
  const [ocsState, setOcsState] = useState<OCSTabState>({ courseId: '', ocsType: '', sectionId: '', remarks: '', attachmentName: '' });

  const me = state.currentUser;
  if (!me) return null;
  const activeTerm = getActiveTerm();
  const isFinalized = !!activeTerm && state.finalizedEnlistments.some(f => f.studentId === me.id && f.termId === activeTerm.id);

  const getConsent = (sectionId: string) =>
    state.consents.find(c => c.studentId === me.id && c.sectionId === sectionId && c.termId === activeTerm?.id);

  const setTab = (key: string, patch: Partial<TabState>) =>
    setTabStates(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  // ── COI / Dept submit ──────────────────────────────────────────
  const handleCoiDeptSubmit = (def: ConsentDef) => {
    const ts = tabStates[def.key];
    if (!activeTerm || !ts.sectionId) return;
    requestConsent(me.id, ts.sectionId, activeTerm.id, def.key, ts.remarks);
    toast({ title: 'Consent requested', description: 'Your request has been submitted for review.' });
    setTab(def.key, { sectionId: '', courseId: '', remarks: '' });
  };

  // ── OCS submit ────────────────────────────────────────────────
  const handleOCSSubmit = () => {
    if (!activeTerm || !ocsState.sectionId || !ocsState.ocsType || !ocsState.attachmentName) return;
    requestConsent(me.id, ocsState.sectionId, activeTerm.id, 'ocsConsentStatus', ocsState.remarks, ocsState.ocsType, ocsState.attachmentName);
    toast({ title: 'OCS Consent application submitted', description: 'Your application is now pending OCS review.' });
    setOcsState({ courseId: '', ocsType: '', sectionId: '', remarks: '', attachmentName: '' });
  };

  const pendingCount = (key: CoiDeptField, requiresField: 'requiresCOI' | 'requiresDeptConsent') => {
    if (!activeTerm) return 0;
    return state.sections.filter(sec => {
      if (sec.termId !== activeTerm.id) return false;
      const course = state.courses.find(c => c.id === sec.courseId);
      if (!course?.[requiresField]) return false;
      return (getConsent(sec.id)?.[key] ?? 'not_requested') === 'pending';
    }).length;
  };

  const ocsPending = activeTerm
    ? state.consents.filter(c => c.studentId === me.id && c.termId === activeTerm.id && c.ocsConsentStatus === 'pending').length
    : 0;

  // OCS eligible courses (all courses with requiresOCSConsent in active term)
  const ocsEligibleCourses = activeTerm
    ? Array.from(new Map(
        state.sections
          .filter(s => s.termId === activeTerm.id)
          .map(s => state.courses.find(c => c.id === s.courseId))
          .filter((c): c is NonNullable<typeof c> => !!c && !!c.requiresOCSConsent)
          .map(c => [c.id, c])
      ).values())
    : [];

  const ocsSectionsForCourse = ocsState.courseId && activeTerm
    ? state.sections.filter(s => s.termId === activeTerm.id && s.courseId === ocsState.courseId)
    : [];

  const ocsSelSection = state.sections.find(s => s.id === ocsState.sectionId);
  const ocsSelCourse  = state.courses.find(c => c.id === ocsState.courseId);
  const ocsSelConsent = ocsSelSection ? getConsent(ocsSelSection.id) : undefined;
  const ocsSelStatus: ConsentStatus = ocsSelConsent?.ocsConsentStatus ?? 'not_requested';
  const ocsCanApply = !isFinalized && !!ocsState.sectionId && !!ocsState.ocsType && !!ocsState.attachmentName &&
    (ocsSelStatus === 'not_requested' || ocsSelStatus === 'denied');

  const ocsExistingRequests = activeTerm
    ? state.consents.filter(c => c.studentId === me.id && c.termId === activeTerm.id && c.ocsConsentStatus !== 'not_requested')
    : [];

  // Get college for a course
  const getCourseCollege = (courseId: string) => {
    const course = state.courses.find(c => c.id === courseId);
    if (!course) return '—';
    const dept = state.departments.find(d => d.name === course.department);
    if (!dept) return '—';
    return state.colleges.find(col => col.id === dept.collegeId)?.abbreviation ?? '—';
  };

  return (
    <PortalLayout title="Consent Management">
      <div className="space-y-4">

        {/* Page header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Consent Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Apply for required consents before you can enlist in restricted courses — {activeTerm?.name ?? '—'}</p>
        </div>

        {isFinalized && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-300 text-green-800 text-sm">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>Enlistment is finalized — new consent requests are locked. Existing requests remain for reference.</span>
          </div>
        )}

        {/* ── COI & Dept sections (same columns as before) ─────────── */}
        {COI_DEPT_DEFS.map(def => {
          const ts = tabStates[def.key];
          const pending = pendingCount(def.key, def.requiresField);

          const eligibleCourses = activeTerm
            ? Array.from(new Map(
                state.sections
                  .filter(s => s.termId === activeTerm.id)
                  .map(s => state.courses.find(c => c.id === s.courseId))
                  .filter((c): c is NonNullable<typeof c> => !!c && !!c[def.requiresField])
                  .map(c => [c.id, c])
              ).values())
            : [];

          const sectionsForCourse = ts.courseId && activeTerm
            ? state.sections.filter(s => s.termId === activeTerm.id && s.courseId === ts.courseId)
            : [];

          const selSection = state.sections.find(s => s.id === ts.sectionId);
          const selCourse  = state.courses.find(c => c.id === ts.courseId);
          const selFaculty = selSection ? state.users.find(u => u.id === selSection.facultyId) : undefined;
          const selConsent = selSection ? getConsent(selSection.id) : undefined;
          const selStatus: ConsentStatus = selConsent?.[def.key] ?? 'not_requested';
          const canSubmit = !isFinalized && ts.sectionId && (selStatus === 'not_requested' || selStatus === 'denied');

          const existingRequests = activeTerm
            ? state.consents.filter(c => c.studentId === me.id && c.termId === activeTerm.id && c[def.key] !== 'not_requested')
            : [];

          return (
            <div key={def.key} className="rounded-md overflow-hidden border border-border">
              <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between">
                <span>{def.label}</span>
                {pending > 0 && <Badge className="bg-yellow-300 text-yellow-900 text-xs border-0">{pending} pending</Badge>}
              </div>
              <div className="bg-background">
                <div className="px-4 pt-3 pb-1 flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-primary" />
                  <span>{def.desc}</span>
                </div>
                {!activeTerm ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">No active term.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-t border-b bg-muted/20">
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Course <span className="text-red-500">*</span></th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Section <span className="text-red-500">*</span></th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Description</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Faculty-in-Charge</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Consent</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Status</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Remarks/Appeal</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!isFinalized && (
                          <tr className="border-b bg-background hover:bg-muted/10">
                            <td className="px-3 py-2 align-top">
                              <Select value={ts.courseId || '__none__'} onValueChange={v => setTab(def.key, { courseId: v === '__none__' ? '' : v, sectionId: '', remarks: '' })}>
                                <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">— Select Course —</SelectItem>
                                  {eligibleCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2 align-top">
                              <Select value={ts.sectionId || '__none__'} onValueChange={v => setTab(def.key, { sectionId: v === '__none__' ? '' : v })} disabled={!ts.courseId}>
                                <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Choose a section" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Choose a section</SelectItem>
                                  {sectionsForCourse.map(s => <SelectItem key={s.id} value={s.id}>{s.sectionCode}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2 align-top text-xs text-muted-foreground max-w-[160px]">
                              {selCourse ? <span className="line-clamp-2">{selCourse.title}</span> : <span className="text-muted-foreground/40">—</span>}
                            </td>
                            <td className="px-3 py-2 align-top text-xs text-muted-foreground whitespace-nowrap">
                              {selFaculty?.name ?? <span className="text-muted-foreground/40">—</span>}
                            </td>
                            <td className="px-3 py-2 align-top">
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{def.short}</Badge>
                            </td>
                            <td className="px-3 py-2 align-top">
                              {ts.sectionId ? <StatusBadge s={selStatus} /> : <span className="text-muted-foreground/40 text-xs">—</span>}
                            </td>
                            <td className="px-3 py-2 align-top w-52">
                              <Textarea className="text-xs min-h-[60px] resize-none" placeholder="Limit to 280 characters" maxLength={280}
                                value={ts.remarks} onChange={e => setTab(def.key, { remarks: e.target.value })} disabled={!ts.sectionId || !canSubmit} />
                              {ts.remarks.length > 0 && <p className="text-xs text-muted-foreground mt-0.5 text-right">{ts.remarks.length}/280</p>}
                            </td>
                            <td className="px-3 py-2 align-top whitespace-nowrap">
                              {!ts.sectionId ? <span className="text-xs italic text-muted-foreground">Unavailable</span>
                                : canSubmit ? <Button size="sm" className="h-7 text-xs bg-primary text-primary-foreground" onClick={() => handleCoiDeptSubmit(def)}>Submit</Button>
                                : selStatus === 'pending' ? <span className="text-xs italic text-muted-foreground">Pending</span>
                                : selStatus === 'approved' ? <span className="text-xs italic text-green-600">Approved</span>
                                : <span className="text-xs italic text-muted-foreground">Unavailable</span>}
                            </td>
                          </tr>
                        )}
                        {existingRequests.map(c => {
                          const sec = state.sections.find(s => s.id === c.sectionId);
                          const course = sec ? state.courses.find(co => co.id === sec.courseId) : undefined;
                          const fac = sec ? state.users.find(u => u.id === sec.facultyId) : undefined;
                          const status = c[def.key];
                          const reason = def.key === 'coiStatus' ? c.coiReason : c.deptReason;
                          if (!sec || !course) return null;
                          return (
                            <tr key={c.id} className="border-b last:border-0 hover:bg-muted/10">
                              <td className="px-3 py-2 text-xs font-mono font-semibold text-primary">{course.code}</td>
                              <td className="px-3 py-2 text-xs">{sec.sectionCode}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground max-w-[160px]"><span className="line-clamp-2">{course.title}</span></td>
                              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fac?.name ?? 'TBA'}</td>
                              <td className="px-3 py-2"><Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{def.short}</Badge></td>
                              <td className="px-3 py-2"><StatusBadge s={status} /></td>
                              <td className="px-3 py-2 text-xs text-muted-foreground italic max-w-[180px]">{reason ? `"${reason}"` : '—'}</td>
                              <td className="px-3 py-2 text-xs italic text-muted-foreground whitespace-nowrap">
                                {status === 'approved' ? <span className="text-green-600">Approved</span> : status === 'pending' ? 'Awaiting review' : status === 'denied' ? <span className="text-red-500">Denied</span> : '—'}
                              </td>
                            </tr>
                          );
                        })}
                        {isFinalized && existingRequests.length === 0 && (
                          <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">No {def.short} consent records.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* ── OCS Consent section (different columns) ──────────────── */}
        <div className="rounded-md overflow-hidden border border-border">
          <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between">
            <span>OCS Consent</span>
            {ocsPending > 0 && <Badge className="bg-yellow-300 text-yellow-900 text-xs border-0">{ocsPending} pending</Badge>}
          </div>

          {/* Info block */}
          <div className="px-4 py-4 border-b bg-background space-y-2 text-sm">
            <p><strong>To all students:</strong></p>
            <p>
              Please note that applying for an OCS Consent pertaining to{' '}
              <span className="underline">waivers/satisfaction of pre-req</span> in{' '}
              <strong>ONE CLASS OF A COURSE</strong>, is enough to override the requisites/validations of all classes of that course.{' '}
              <span className="underline">No need to apply for an OCS Consent for all sections</span> of the course.
            </p>
            <p>
              When a class displays the note{' '}
              <span className="text-red-600 font-semibold">&ldquo;Requires OCS Consent&rdquo;</span>, you must apply for OCS consent type:{' '}
              <span className="underline">OCS Controlled Class</span>.
            </p>
            <p className="font-bold italic">
              Reminder: File to be uploaded in the OCS Consent module should be in{' '}
              <span className="text-red-600">PDF</span> format with size of{' '}
              <span className="text-red-600">less than 400KB</span>.
            </p>
          </div>

          {/* APPLICATION sub-header */}
          <div className="bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold tracking-wide">
            APPLICATION
          </div>

          <div className="bg-background">
            {!activeTerm ? (
              <p className="text-center text-muted-foreground py-6 text-sm">No active term.</p>
            ) : (
              <>
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) setOcsState(prev => ({ ...prev, attachmentName: file.name }));
                  }}
                />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-t border-b bg-muted/20">
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Course <span className="text-red-500">*</span></th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Type <span className="text-red-500">*</span></th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Section <span className="text-red-500">*</span></th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Description | Day - Time</th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">College</th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Attachment <span className="text-red-500">*</span></th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Remarks/Appeal</th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Input row */}
                      {!isFinalized && (
                        <tr className="border-b bg-background hover:bg-muted/10">
                          {/* Course */}
                          <td className="px-3 py-2 align-top">
                            <Select value={ocsState.courseId || '__none__'}
                              onValueChange={v => setOcsState(prev => ({ ...prev, courseId: v === '__none__' ? '' : v, sectionId: '', ocsType: '', attachmentName: '' }))}>
                              <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— Select —</SelectItem>
                                {ocsEligibleCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                          {/* Type */}
                          <td className="px-3 py-2 align-top">
                            <Select value={ocsState.ocsType || '__none__'}
                              onValueChange={v => setOcsState(prev => ({ ...prev, ocsType: v === '__none__' ? '' : v }))}>
                              <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— Select Type —</SelectItem>
                                {OCS_CONSENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                          {/* Section */}
                          <td className="px-3 py-2 align-top">
                            <Select value={ocsState.sectionId || '__none__'}
                              onValueChange={v => setOcsState(prev => ({ ...prev, sectionId: v === '__none__' ? '' : v }))}
                              disabled={!ocsState.courseId}>
                              <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Choose a section" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Choose a section</SelectItem>
                                {ocsSectionsForCourse.map(s => <SelectItem key={s.id} value={s.id}>{s.sectionCode}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                          {/* Description | Day - Time */}
                          <td className="px-3 py-2 align-top text-xs text-muted-foreground max-w-[170px]">
                            {ocsSelCourse && ocsSelSection ? (
                              <div>
                                <p className="line-clamp-1">{ocsSelCourse.title}</p>
                                <p className="text-muted-foreground/70">
                                  {ocsSelSection.schedule.days.join('')} {ocsSelSection.schedule.startTime}–{ocsSelSection.schedule.endTime}
                                </p>
                              </div>
                            ) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          {/* College */}
                          <td className="px-3 py-2 align-top text-xs text-muted-foreground whitespace-nowrap">
                            {ocsState.courseId ? getCourseCollege(ocsState.courseId) : <span className="text-muted-foreground/40">—</span>}
                          </td>
                          {/* Attachment */}
                          <td className="px-3 py-2 align-top">
                            <div className="flex flex-col items-start gap-1">
                              <Button type="button" size="sm"
                                className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white p-0"
                                onClick={() => fileInputRef.current?.click()}>
                                <Upload className="w-4 h-4" />
                              </Button>
                              {ocsState.attachmentName && (
                                <p className="text-xs text-muted-foreground truncate max-w-[100px]" title={ocsState.attachmentName}>
                                  {ocsState.attachmentName}
                                </p>
                              )}
                            </div>
                          </td>
                          {/* Remarks */}
                          <td className="px-3 py-2 align-top w-48">
                            <Textarea className="text-xs min-h-[60px] resize-none" placeholder="Limit to 280 characters..."
                              maxLength={280} value={ocsState.remarks}
                              onChange={e => setOcsState(prev => ({ ...prev, remarks: e.target.value }))}
                              disabled={!ocsState.sectionId} />
                            {ocsState.remarks.length > 0 && <p className="text-xs text-muted-foreground mt-0.5 text-right">{ocsState.remarks.length}/280</p>}
                          </td>
                          {/* Action */}
                          <td className="px-3 py-2 align-top whitespace-nowrap">
                            {ocsCanApply ? (
                              <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={handleOCSSubmit}>
                                Apply
                              </Button>
                            ) : (
                              <span className="text-xs italic text-muted-foreground">
                                {ocsSelStatus === 'pending' ? 'Pending' : ocsSelStatus === 'approved' ? 'Approved' : 'Unavailable'}
                              </span>
                            )}
                          </td>
                        </tr>
                      )}

                      {/* Existing OCS requests */}
                      {ocsExistingRequests.map(c => {
                        const sec = state.sections.find(s => s.id === c.sectionId);
                        const course = sec ? state.courses.find(co => co.id === sec.courseId) : undefined;
                        if (!sec || !course) return null;
                        return (
                          <tr key={c.id} className="border-b last:border-0 hover:bg-muted/10">
                            <td className="px-3 py-2 text-xs font-mono font-semibold text-primary">{course.code}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{c.ocsConsentType ?? '—'}</td>
                            <td className="px-3 py-2 text-xs">{sec.sectionCode}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground max-w-[170px]">
                              <p className="line-clamp-1">{course.title}</p>
                              <p className="text-muted-foreground/70">{sec.schedule.days.join('')} {sec.schedule.startTime}–{sec.schedule.endTime}</p>
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{getCourseCollege(course.id)}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground italic">
                              {c.ocsAttachmentName
                                ? <span className="text-blue-600 truncate block max-w-[90px]" title={c.ocsAttachmentName}>{c.ocsAttachmentName}</span>
                                : '—'}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground italic max-w-[160px]">{c.ocsReason ? `"${c.ocsReason}"` : '—'}</td>
                            <td className="px-3 py-2 text-xs whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <StatusBadge s={c.ocsConsentStatus} />
                                {c.ocsConsentStatus === 'approved' && (
                                  <span className="text-xs text-green-600 font-medium">Auto-enlisted</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {isFinalized && ocsExistingRequests.length === 0 && (
                        <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">No OCS consent records.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}
