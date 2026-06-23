import { useRef, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { StatusBanner } from '../../components/shared/StatusBanner';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { openPdfPreview } from '../../lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { CheckCircle, Clock, XCircle, FileText, Lock, Upload, MessageSquare, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { ConsentStatus } from '../../lib/types';
import { OCS_CONSENT_TYPES } from '../../lib/types';
import { getScholasticStanding } from '../../lib/academic';

const StatusBadge = ({ s }: { s: ConsentStatus }) => {
  if (s === 'approved') return <Badge className="bg-green-100 text-green-800 border-green-200 gap-1 text-xs"><CheckCircle className="w-3 h-3" />Approved</Badge>;
  if (s === 'pending')  return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1 text-xs"><Clock className="w-3 h-3" />Pending</Badge>;
  if (s === 'denied')   return <Badge className="bg-red-100 text-red-800 border-red-200 gap-1 text-xs"><XCircle className="w-3 h-3" />Denied</Badge>;
  return <Badge variant="outline" className="text-muted-foreground text-xs">—</Badge>;
};

type CoiDeptField = 'coiStatus' | 'deptConsentStatus';
interface ConsentDef { key: CoiDeptField; label: string; short: string; tabValue: string; desc: string; requiresField: 'requiresCOI' | 'requiresDeptConsent'; }
type TabState = { courseId: string; sectionId: string; remarks: string };

const COI_DEPT_DEFS: ConsentDef[] = [
  { key: 'coiStatus',         label: 'Consent of Instructor',  short: 'COI', tabValue: 'coi', desc: 'Consent of Instructor — required by the faculty teaching the section.',   requiresField: 'requiresCOI' },
  { key: 'deptConsentStatus', label: 'Department Consent',     short: 'DC',  tabValue: 'dc',  desc: 'Department Consent — required by the department offering the course.',    requiresField: 'requiresDeptConsent' },
];

type OCSTabState = { courseId: string; ocsType: string; sectionId: string; remarks: string; attachmentName: string; attachmentDataUrl: string };

export default function StudentConsent() {
  const { state, requestConsent, getActiveTerm, submitReconsiderationRequest } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tabStates, setTabStates] = useState<Record<string, TabState>>({
    coiStatus:         { courseId: '', sectionId: '', remarks: '' },
    deptConsentStatus: { courseId: '', sectionId: '', remarks: '' },
  });
  const [ocsState, setOcsState] = useState<OCSTabState>({ courseId: '', ocsType: '', sectionId: '', remarks: '', attachmentName: '', attachmentDataUrl: '' });
  const [showReconDialog, setShowReconDialog] = useState(false);
  const [reconReason, setReconReason] = useState('');
  const [submittingRecon, setSubmittingRecon] = useState(false);

  const me = state.currentUser;
  if (!me) return null;
  const activeTerm = getActiveTerm();
  const isFinalized = !!activeTerm && state.finalizedEnlistments.some(f => f.studentId === me.id && f.termId === activeTerm.id);
  const hasPDEver = me.status === 'permanently_disqualified' ||
    state.terms.some(t =>
      getScholasticStanding(me.id, t.id, state.grades, state.sections, state.courses)?.standing === 'Permanent Disqualification'
    );
  const hasApprovedReconThisTerm = !!activeTerm && (state.reconsiderationRequests ?? []).some(
    r => r.studentId === me.id && r.termId === activeTerm.id &&
         (!r.requestType || r.requestType === 'pd_reconsideration') &&
         r.status === 'approved'
  );
  const isDisqualified = hasPDEver && !hasApprovedReconThisTerm;
  const latestRecon = [...(state.reconsiderationRequests ?? [])]
    .filter(r => r.studentId === me.id && (activeTerm ? r.termId === activeTerm.id : true))
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];

  const hasApprovedLateEnlistThisTerm = !isFinalized && !!(activeTerm) && (state.reconsiderationRequests ?? []).some(
    r => r.studentId === me.id && r.termId === activeTerm.id && r.requestType === 'late_enlistment' && r.status === 'approved'
  );
  const hasApprovedChangeDropRequest = !isFinalized && !!(activeTerm) && (state.changeDropRequests ?? []).some(
    r => r.studentId === me.id && r.termId === activeTerm.id && r.status === 'approved'
  );
  const appealBypass = hasApprovedLateEnlistThisTerm || hasApprovedChangeDropRequest;

  const getConsentWindowStatus = (consentKey: string): 'open' | 'not-set' | 'upcoming' | 'ended' => {
    if (!activeTerm?.consentWindows) return 'not-set';
    const resolvedKey = OCS_CONSENT_TYPES.includes(consentKey as typeof OCS_CONSENT_TYPES[number])
      ? 'OCS Consent'
      : consentKey;
    const w = activeTerm.consentWindows[resolvedKey] ?? activeTerm.consentWindows[consentKey];
    if (!w || (!w.from && !w.until)) return 'not-set';
    const now = new Date();
    if (w.from && now < new Date(w.from)) return 'upcoming';
    if (w.until && now > new Date(w.until)) return 'ended';
    return 'open';
  };
  const isConsentWindowOpen = (consentKey: string): boolean =>
    appealBypass || getConsentWindowStatus(consentKey) === 'open';

  const getConsent = (sectionId: string) =>
    state.consents.find(c => c.studentId === me.id && c.sectionId === sectionId && c.termId === activeTerm?.id);

  const setTab = (key: string, patch: Partial<TabState>) =>
    setTabStates(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const handleCoiDeptSubmit = (def: ConsentDef) => {
    const ts = tabStates[def.key];
    if (!activeTerm || !ts.sectionId) return;
    if (!isConsentWindowOpen('COI / Department Consent')) {
      toast.error('Consent window closed', { description: 'COI/Department consent is not accessible at this time.' });
      return;
    }
    requestConsent(me.id, ts.sectionId, activeTerm.id, def.key, ts.remarks);
    toast.success('Consent requested', { description: 'Your request has been submitted for review.' });
    setTab(def.key, { sectionId: '', courseId: '', remarks: '' });
  };

  const handleOCSSubmit = () => {
    if (!activeTerm || !ocsState.sectionId || !ocsState.ocsType || !ocsState.attachmentName) return;
    if (!isConsentWindowOpen(ocsState.ocsType)) {
      toast.error('Consent window closed', { description: `${ocsState.ocsType} is not accessible at this time.` });
      return;
    }
    requestConsent(me.id, ocsState.sectionId, activeTerm.id, 'ocsConsentStatus', ocsState.remarks, ocsState.ocsType, ocsState.attachmentName, ocsState.attachmentDataUrl);
    toast.success('OCS Consent application submitted', { description: 'Your application is now pending OCS review.' });
    setOcsState({ courseId: '', ocsType: '', sectionId: '', remarks: '', attachmentName: '', attachmentDataUrl: '' });
  };

  const pendingCount = (key: CoiDeptField, requiresField: 'requiresCOI' | 'requiresDeptConsent') => {
    if (!activeTerm) return 0;
    return state.sections.filter(sec => {
      if (sec.termId !== activeTerm.id) return false;
      if (sec.sectionCode === '__MANUAL__') return false;
      const course = state.courses.find(c => c.id === sec.courseId);
      if (!course?.[requiresField]) return false;
      return (getConsent(sec.id)?.[key] ?? 'not_requested') === 'pending';
    }).length;
  };

  const ocsPending = activeTerm
    ? state.consents.filter(c => c.studentId === me.id && c.termId === activeTerm.id && c.ocsConsentStatus === 'pending').length
    : 0;

  const ocsEligibleCourses = activeTerm
    ? Array.from(new Map(
        state.sections
          .filter(s => s.termId === activeTerm.id && s.sectionCode !== '__MANUAL__')
          .map(s => state.courses.find(c => c.id === s.courseId))
          .filter((c): c is NonNullable<typeof c> => !!c)
          .map(c => [c.id, c])
      ).values())
    : [];

  const ocsSectionsForCourse = ocsState.courseId && activeTerm
    ? (() => {
        const all = state.sections.filter(s => s.termId === activeTerm.id && s.courseId === ocsState.courseId && s.sectionCode !== '__MANUAL__');
        const course = state.courses.find(c => c.id === ocsState.courseId);
        const isDual = course?.type === 'Lec+Lab' || course?.type === 'Lec+Rec';
        if (isDual) {
          const children = all.filter(s => !!s.parentSectionId);
          return children.length > 0 ? children : all;
        }
        return all.filter(s => !state.sections.some(cs => cs.parentSectionId === s.id));
      })()
    : [];

  const ocsSelSection = state.sections.find(s => s.id === ocsState.sectionId);
  const ocsSelCourse  = state.courses.find(c => c.id === ocsState.courseId);
  const ocsSelConsent = ocsSelSection ? getConsent(ocsSelSection.id) : undefined;
  const ocsSelStatus: ConsentStatus = ocsSelConsent?.ocsConsentStatus ?? 'not_requested';
  const ocsCanApply = (!isFinalized || appealBypass) && !isDisqualified && !!ocsState.sectionId && !!ocsState.ocsType && !!ocsState.attachmentName &&
    (ocsSelStatus === 'not_requested' || ocsSelStatus === 'denied');

  const ocsExistingRequests = activeTerm
    ? state.consents.filter(c => c.studentId === me.id && c.termId === activeTerm.id && c.ocsConsentStatus !== 'not_requested')
    : [];

  const getCourseCollege = (courseId: string) => {
    const course = state.courses.find(c => c.id === courseId);
    if (!course) return '—';
    const dept = state.departments.find(d => d.name === course.department);
    if (!dept) return '—';
    return state.colleges.find(col => col.id === dept.collegeId)?.abbreviation ?? '—';
  };

  // Window status banner
  const WindowStatusBanner = ({ windowKey }: { windowKey: string }) => {
    if (appealBypass) return null;
    const resolvedKey = OCS_CONSENT_TYPES.includes(windowKey as typeof OCS_CONSENT_TYPES[number])
      ? 'OCS Consent' : windowKey;
    const w = activeTerm?.consentWindows?.[resolvedKey] ?? activeTerm?.consentWindows?.[windowKey];
    const ws = getConsentWindowStatus(windowKey);
    const fmt = (d?: string) => d ? new Date(d).toLocaleString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
    const fromDate = fmt(w?.from);
    const untilDate = fmt(w?.until);

    if (ws === 'open') return (
      <StatusBanner type="open" title="Consent Window is Open" description={untilDate ? <>Closes on <strong>{untilDate}</strong>.</> : undefined} />
    );
    if (ws === 'not-set') return (
      <StatusBanner type="warning" title="Consent Window Not Yet Scheduled" description="Consent window has not been scheduled. Please wait for the University announcement." />
    );
    if (ws === 'upcoming') return (
      <StatusBanner type="deadline" title="Consent Window Not Yet Open" description={<>{fromDate && <>Opens on <strong>{fromDate}</strong>.</>}{untilDate && <> Closes on <strong>{untilDate}</strong>.</>}{!fromDate && !untilDate && <>Please check back when the consent period begins.</>}</>} />
    );
    // ended
    return (
      <StatusBanner type="error" title="Consent Window Has Closed" description={fromDate && untilDate ? `Was open ${fromDate} – ${untilDate}` : undefined} />
    );
  };

  return (
    <PortalLayout title="My Consents">
      <div className="space-y-4">

        {isFinalized && !appealBypass && (
          <StatusBanner type="notice" title="Enlistment Finalized" description="New consent requests are locked. Existing requests remain for reference." />
        )}

        {/* Consent request status banners */}
        {activeTerm && (() => {
          const myConsents = state.consents.filter(c => c.studentId === me.id && c.termId === activeTerm.id);
          const hasApproved = myConsents.some(c => c.coiStatus === 'approved' || c.deptConsentStatus === 'approved' || c.ocsConsentStatus === 'approved');
          const hasDenied   = myConsents.some(c => c.coiStatus === 'denied' || c.deptConsentStatus === 'denied' || c.ocsConsentStatus === 'denied');
          return (
            <>
              {hasDenied && !hasApproved && (
                <StatusBanner type="error" title="Consent Request(s) Denied" description="Please check the details below or contact your department." />
              )}
            </>
          );
        })()}

        {appealBypass && (
          <StatusBanner type="open" title="OCS Access Granted" description="Consent windows are open for you. You may submit new consent requests." />
        )}

        {/* PD lock */}
        {isDisqualified && (() => {
          const noPending = !latestRecon || latestRecon.status !== 'pending';
          return (
            <>
              <div className="rounded-xl border border-red-200 bg-red-50/70">
                <div className="pt-3 pb-3 px-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-red-900">Consent Module Locked — Permanent Disqualification</p>
                        <p className="text-xs text-red-700 mt-0.5">You cannot submit consent requests. Submit a reconsideration request to the OCS.</p>
                      </div>
                    </div>
                    {noPending && (
                      <Button size="sm" variant="outline" className="border-red-400 text-red-700 hover:bg-red-100"
                        onClick={() => setShowReconDialog(true)}>
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5" />Request Reconsideration
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {latestRecon?.status === 'pending' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70">
                  <div className="pt-3 pb-3 px-4 flex items-center gap-3">
                    <RefreshCw className="w-4 h-4 text-yellow-600 flex-shrink-0 animate-spin" />
                    <p className="text-sm text-yellow-800">Your reconsideration request is pending OCS review.</p>
                  </div>
                </div>
              )}
              {latestRecon?.status === 'denied' && (
                <div className="rounded-xl border border-red-200 bg-red-50/70">
                  <div className="pt-3 pb-3 px-4 flex items-center gap-3">
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Reconsideration Request — DENIED</p>
                      {latestRecon.response && <p className="text-xs text-red-700">OCS: "{latestRecon.response}"</p>}
                    </div>
                  </div>
                </div>
              )}
              <Dialog open={showReconDialog} onOpenChange={v => { setShowReconDialog(v); if (!v) setReconReason(''); }}>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" />Request Reconsideration</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-2">
                    <p className="text-sm text-muted-foreground">Explain your case. The OCS will review and may reinstate your privileges.</p>
                    <div>
                      <Label>Reason <span className="text-red-500">*</span></Label>
                      <Textarea rows={4} placeholder="Explain why this should be reconsidered..." value={reconReason} onChange={e => setReconReason(e.target.value)} className="mt-1" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => { setShowReconDialog(false); setReconReason(''); }}>Cancel</Button>
                      <Button className="flex-1" disabled={!reconReason.trim() || submittingRecon}
                        onClick={async () => {
                          setSubmittingRecon(true);
                          if (activeTerm) await submitReconsiderationRequest(me.id, activeTerm.id, reconReason.trim());
                          setSubmittingRecon(false);
                          setShowReconDialog(false);
                          setReconReason('');
                        }}>
                        {submittingRecon ? 'Submitting...' : 'Submit Request'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          );
        })()}

        {/* ── Three-tab consent module ─────────────────────────────── */}
        <Tabs defaultValue="coi" className="w-full">
          <TabsList className="w-full justify-start h-auto p-1 gap-1">
            {COI_DEPT_DEFS.map(def => {
              const p = pendingCount(def.key, def.requiresField);
              return (
                <TabsTrigger key={def.tabValue} value={def.tabValue} className="gap-2 text-sm">
                  {def.label}
                  {p > 0 && <Badge className="bg-yellow-400 text-yellow-900 text-xs border-0 h-4 px-1.5 rounded-full">{p}</Badge>}
                </TabsTrigger>
              );
            })}
            <TabsTrigger value="ocs" className="gap-2 text-sm">
              Office of College Secretary Consent
              {ocsPending > 0 && <Badge className="bg-yellow-400 text-yellow-900 text-xs border-0 h-4 px-1.5 rounded-full">{ocsPending}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* ── OCS Consent Tab ─────────────────────────────────────── */}
          <TabsContent value="ocs" className="mt-3">
            <div className="space-y-4">
              <WindowStatusBanner windowKey="OCS Consent" />

              {/* Instructions */}
              <div className="portal-panel">
                <div className="portal-panel-header">
                  <span>OCS Consent</span>
                  {ocsPending > 0 && <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded font-bold">{ocsPending} pending</span>}
                </div>
                <div className="px-4 py-4 bg-background text-sm space-y-2">
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
              </div>

              {/* Application panel */}
              {(!isFinalized || appealBypass) && !isDisqualified && activeTerm && (
                <div className="portal-panel">
                  <div className="portal-panel-header">Application</div>
                  <div className="bg-background">
                    <p className="px-4 pt-3 pb-1 text-xs text-muted-foreground">
                      Select a course, consent type, and section. Upload your supporting document (PDF, max 400KB).
                    </p>
                    <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setOcsState(prev => ({ ...prev, attachmentName: file.name, attachmentDataUrl: ev.target?.result as string }));
                        reader.readAsDataURL(file);
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
                          {isConsentWindowOpen('OCS Consent') ? (
                            <tr className="border-b bg-background hover:bg-muted/10">
                              <td className="px-3 py-2 align-top">
                                <Select value={ocsState.courseId || '__none__'}
                                  onValueChange={v => setOcsState(prev => ({ ...prev, courseId: v === '__none__' ? '' : v, sectionId: '', ocsType: '', attachmentName: '', attachmentDataUrl: '' }))}>
                                  <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">— Select —</SelectItem>
                                    {ocsEligibleCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </td>
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
                              <td className="px-3 py-2 align-top text-xs text-muted-foreground max-w-[170px]">
                                {ocsSelCourse && ocsSelSection ? (
                                  <div>
                                    <p className="line-clamp-1">{ocsSelCourse.title}</p>
                                    <p className="text-muted-foreground/70">
                                      {(ocsSelSection.schedule?.days ?? []).join('')} {ocsSelSection.schedule?.startTime}–{ocsSelSection.schedule?.endTime}
                                    </p>
                                  </div>
                                ) : <span className="text-muted-foreground/40">—</span>}
                              </td>
                              <td className="px-3 py-2 align-top text-xs text-muted-foreground whitespace-nowrap">
                                {ocsState.courseId ? getCourseCollege(ocsState.courseId) : <span className="text-muted-foreground/40">—</span>}
                              </td>
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
                              <td className="px-3 py-2 align-top w-48">
                                <Textarea className="text-xs min-h-[60px] resize-none" placeholder="Limit to 280 characters..."
                                  maxLength={280} value={ocsState.remarks}
                                  onChange={e => setOcsState(prev => ({ ...prev, remarks: e.target.value }))}
                                  disabled={!ocsState.sectionId} />
                                {ocsState.remarks.length > 0 && <p className="text-xs text-muted-foreground mt-0.5 text-right">{ocsState.remarks.length}/280</p>}
                              </td>
                              <td className="px-3 py-2 align-top whitespace-nowrap">
                                {ocsCanApply ? (
                                  <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={handleOCSSubmit}>Apply</Button>
                                ) : (
                                  <span className="text-xs italic text-muted-foreground">
                                    {ocsSelStatus === 'pending' ? 'Pending' : ocsSelStatus === 'approved' ? 'Approved' : 'Unavailable'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ) : (
                            <tr><td colSpan={8} className="text-center py-6 text-muted-foreground text-sm">Consent window is not open.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction History */}
              <div className="portal-panel">
                <div className="panel-header-history">
                  <span>Transaction History</span>
                  <span className="text-white/70 text-xs font-normal">{ocsExistingRequests.length} record(s)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-t border-b bg-muted/20">
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Course</th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Type</th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Section</th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Description | Day - Time</th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">College</th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Attachment</th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Remarks/Appeal</th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ocsExistingRequests.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">No OCS consent records.</td></tr>
                      ) : ocsExistingRequests.map(c => {
                        const sec = state.sections.find(s => s.id === c.sectionId);
                        const course = sec ? state.courses.find(co => co.id === sec.courseId) : undefined;
                        if (!sec || !course || sec.sectionCode === '__MANUAL__') return null;
                        return (
                          <tr key={c.id} className="border-b last:border-0 hover:bg-muted/10">
                            <td className="px-3 py-2 text-xs font-mono font-semibold text-primary">{course.code}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{c.ocsConsentType ?? '—'}</td>
                            <td className="px-3 py-2 text-xs">{sec.sectionCode}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground max-w-[170px]">
                              <p className="line-clamp-1">{course.title}</p>
                              <p className="text-muted-foreground/70">{(sec.schedule?.days ?? []).join('')} {sec.schedule?.startTime}–{sec.schedule?.endTime}</p>
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{getCourseCollege(course.id)}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground italic">
                              {c.ocsAttachmentName
                                ? <div className="flex flex-col gap-0.5">
                                    <span className="text-blue-600 truncate block max-w-[90px]" title={c.ocsAttachmentName}>{c.ocsAttachmentName}</span>
                                    {c.ocsAttachmentDataUrl && (
                                      <button onClick={() => openPdfPreview(c.ocsAttachmentDataUrl!)}
                                        className="text-[10px] text-primary underline text-left hover:text-primary/70">
                                        Preview PDF
                                      </button>
                                    )}
                                  </div>
                                : '—'}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground italic max-w-[160px]">{c.ocsReason ? `"${c.ocsReason}"` : '—'}</td>
                            <td className="px-3 py-2 text-xs whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <StatusBadge s={c.ocsConsentStatus} />
                                {c.ocsConsentStatus === 'approved' && (
                                  <span className="text-xs text-blue-600 font-medium">Add in Enlistment</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── DC and COI Tabs ──────────────────────────────────────── */}
          {COI_DEPT_DEFS.map(def => {
            const ts = tabStates[def.key];
            const pending = pendingCount(def.key, def.requiresField);
            const eligibleCourses: typeof state.courses = activeTerm
              ? Array.from(new Map(
                  state.sections
                    .filter(s => s.termId === activeTerm.id && s.sectionCode !== '__MANUAL__')
                    .map(s => state.courses.find(c => c.id === s.courseId))
                    .filter((c): c is NonNullable<typeof c> => !!c && !!c[def.requiresField])
                    .map(c => [c.id, c])
                ).values())
              : [];

            const sectionsForCourse = ts.courseId && activeTerm
              ? (() => {
                  const all = state.sections.filter(s => s.termId === activeTerm.id && s.courseId === ts.courseId && s.sectionCode !== '__MANUAL__');
                  const course = state.courses.find(c => c.id === ts.courseId);
                  const isDual = course?.type === 'Lec+Lab' || course?.type === 'Lec+Rec';
                  if (isDual) {
                    const children = all.filter(s => !!s.parentSectionId);
                    return children.length > 0 ? children : all;
                  }
                  return all.filter(s => !state.sections.some(cs => cs.parentSectionId === s.id));
                })()
              : [];

            const selSection = state.sections.find(s => s.id === ts.sectionId);
            const selCourse  = state.courses.find(c => c.id === ts.courseId);
            const selFaculty = selSection ? state.users.find(u => u.id === selSection.facultyId) : undefined;
            const selConsent = selSection ? getConsent(selSection.id) : undefined;
            const selStatus: ConsentStatus = selConsent?.[def.key] ?? 'not_requested';
            const canSubmit = (!isFinalized || appealBypass) && !isDisqualified && ts.sectionId && (selStatus === 'not_requested' || selStatus === 'denied');

            const existingRequests = activeTerm
              ? state.consents.filter(c => c.studentId === me.id && c.termId === activeTerm.id && c[def.key] !== 'not_requested')
              : [];

            return (
              <TabsContent key={def.tabValue} value={def.tabValue} className="mt-3">
                <div className="space-y-4">
                  <WindowStatusBanner windowKey="COI / Department Consent" />

                  {/* Instructions */}
                  <div className="portal-panel">
                    <div className="portal-panel-header">
                      <span>{def.label}</span>
                      {pending > 0 && <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded font-bold">{pending} pending</span>}
                    </div>
                    <div className="px-4 py-4 bg-background text-sm space-y-2">
                      <p><strong>To all students:</strong></p>
                      {def.key === 'coiStatus' ? (
                        <>
                          <p>
                            <strong>COI (Consent of Instructor)</strong> is required when the faculty teaching the section
                            has set a restriction. You must request consent directly through this portal before you can enlist in the section.
                          </p>
                          <p>
                            Select the <strong>course</strong> and <strong>section</strong> you wish to request COI for, then click <strong>Submit</strong>.
                            You may add a remarks/appeal message for the faculty.
                          </p>
                        </>
                      ) : (
                        <>
                          <p>
                            <strong>Department Consent</strong> is required when the department offering the course has set a restriction on enrollment.
                            You must request consent before you can enlist in the section.
                          </p>
                          <p>
                            Select the <strong>course</strong> and <strong>section</strong> you wish to apply for, then click <strong>Submit</strong>.
                            The department will review your request.
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Application panel */}
                  {(!isFinalized || appealBypass) && !isDisqualified && isConsentWindowOpen('COI / Department Consent') && activeTerm && (
                    <div className="portal-panel">
                      <div className="portal-panel-header">Application</div>
                      <div className="bg-background">
                        <p className="px-4 pt-3 pb-1 text-xs text-muted-foreground">{def.desc}. Select course and section below.</p>
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
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transaction History */}
                  <div className="portal-panel">
                    <div className="panel-header-history">
                      <span>Transaction History</span>
                      <span className="text-white/70 text-xs font-normal">{existingRequests.length} record(s)</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-t border-b bg-muted/20">
                            <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Course</th>
                            <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Section</th>
                            <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Description</th>
                            <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Faculty-in-Charge</th>
                            <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Consent</th>
                            <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Status</th>
                            <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Remarks/Appeal</th>
                            <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {existingRequests.length === 0 ? (
                            <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">No {def.short} consent records.</td></tr>
                          ) : existingRequests.map(c => {
                            const sec = state.sections.find(s => s.id === c.sectionId);
                            const course = sec ? state.courses.find(co => co.id === sec.courseId) : undefined;
                            const fac = sec ? state.users.find(u => u.id === sec.facultyId) : undefined;
                            const status = c[def.key];
                            const reason = def.key === 'coiStatus' ? c.coiReason : c.deptReason;
                            if (!sec || !course || sec.sectionCode === '__MANUAL__') return null;
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
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

      </div>
    </PortalLayout>
  );
}
