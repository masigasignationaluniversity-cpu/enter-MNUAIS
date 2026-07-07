import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { StatusBanner } from '../../components/shared/StatusBanner';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { SearchableSelect } from '../../components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { CheckCircle, Clock, XCircle, Link, MessageSquare } from 'lucide-react';
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

type OCSTabState = { courseId: string; ocsType: string; sectionId: string; remarks: string; driveLink: string };

export default function StudentConsent() {
  const { state, requestConsent, getActiveTerm, submitReconsiderationRequest } = useApp();

  const [tabStates, setTabStates] = useState<Record<string, TabState>>({
    coiStatus:         { courseId: '', sectionId: '', remarks: '' },
    deptConsentStatus: { courseId: '', sectionId: '', remarks: '' },
  });
  const [ocsState, setOcsState] = useState<OCSTabState>({ courseId: '', ocsType: '', sectionId: '', remarks: '', driveLink: '' });
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
    if (!activeTerm || !ocsState.sectionId || !ocsState.ocsType || !ocsState.driveLink) return;
    if (!isConsentWindowOpen(ocsState.ocsType)) {
      toast.error('Consent window closed', { description: `${ocsState.ocsType} is not accessible at this time.` });
      return;
    }
    requestConsent(me.id, ocsState.sectionId, activeTerm.id, 'ocsConsentStatus', ocsState.remarks, ocsState.ocsType, ocsState.driveLink);
    toast.success('OCS Consent application submitted', { description: 'Your application is now pending OCS review.' });
    setOcsState({ courseId: '', ocsType: '', sectionId: '', remarks: '', driveLink: '' });
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
  const ocsCanApply = (!isFinalized || appealBypass) && !isDisqualified && !!ocsState.sectionId && !!ocsState.ocsType && !!ocsState.driveLink &&
    (ocsSelStatus === 'not_requested' || ocsSelStatus === 'denied');

  const ocsExistingRequests = activeTerm
    ? state.consents.filter(c => c.studentId === me.id && c.termId === activeTerm.id && c.ocsConsentStatus !== 'not_requested')
    : [];
  const ocsPendingRequests = ocsExistingRequests.filter(c => c.ocsConsentStatus === 'pending');

  const getCourseCollege = (courseId: string) => {
    const course = state.courses.find(c => c.id === courseId);
    if (!course) return '—';
    const dept = state.departments.find(d => d.name === course.department);
    if (!dept) return '—';
    return state.colleges.find(col => col.id === dept.collegeId)?.abbreviation ?? '—';
  };

  const WindowStatusBanner = ({ windowKey }: { windowKey: string }) => {
    if (appealBypass) return null;
    const resolvedKey = OCS_CONSENT_TYPES.includes(windowKey as typeof OCS_CONSENT_TYPES[number])
      ? 'OCS Consent' : windowKey;
    const w = activeTerm?.consentWindows?.[resolvedKey] ?? activeTerm?.consentWindows?.[windowKey];
    const ws = getConsentWindowStatus(windowKey);
    const fmt = (d?: string) => d ? new Date(d).toLocaleString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
    const fromDate = fmt(w?.from);
    const untilDate = fmt(w?.until);
    if (ws === 'open') return <StatusBanner type="open" title="Consent Window is Open" description={untilDate ? <>Closes on <strong>{untilDate}</strong>.</> : undefined} />;
    if (ws === 'not-set') return <StatusBanner type="warning" title="Consent Window Not Yet Scheduled" description="Consent window has not been scheduled. Please wait for the University announcement." />;
    if (ws === 'upcoming') return <StatusBanner type="deadline" title="Consent Window Not Yet Open" description={<>{fromDate && <>Opens on <strong>{fromDate}</strong>.</>}{untilDate && <> Closes on <strong>{untilDate}</strong>.</>}{!fromDate && !untilDate && <>Please check back when the consent period begins.</>}</>} />;
    return <StatusBanner type="error" title="Consent Window Has Closed" description={fromDate && untilDate ? `Was open ${fromDate} – ${untilDate}` : undefined} />;
  };

  return (
    <PortalLayout title="My Consents">
      <div className="space-y-4">

        {isFinalized && !appealBypass && (
          <StatusBanner type="notice" title="Enlistment Finalized" description="New consent requests are locked. Existing requests remain for reference." />
        )}

        {activeTerm && (() => {
          const myConsents = state.consents.filter(c => c.studentId === me.id && c.termId === activeTerm.id);
          const hasApproved = myConsents.some(c => c.coiStatus === 'approved' || c.deptConsentStatus === 'approved' || c.ocsConsentStatus === 'approved');
          const hasDenied   = myConsents.some(c => c.coiStatus === 'denied' || c.deptConsentStatus === 'denied' || c.ocsConsentStatus === 'denied');
          return hasDenied && !hasApproved
            ? <StatusBanner type="error" title="Consent Request(s) Denied" description="Please check the details below or contact your department." />
            : null;
        })()}

        {appealBypass && (
          <StatusBanner type="open" title="OCS Access Granted" description="Consent windows are open for you. You may submit new consent requests." />
        )}

        {isDisqualified && (() => {
          const noPending = !latestRecon || latestRecon.status !== 'pending';
          return (
            <>
              <StatusBanner type="error" title="Consent Module Locked — Permanent Disqualification"
                description="You cannot submit consent requests. Submit a reconsideration request to the OCS.">
                {noPending && (
                  <Button size="sm" variant="outline" className="border-red-400 text-red-700 hover:bg-red-100" onClick={() => setShowReconDialog(true)}>
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" />Request Reconsideration
                  </Button>
                )}
              </StatusBanner>
              {latestRecon?.status === 'pending' && <StatusBanner type="warning" title="Reconsideration Request Pending" description="Your reconsideration request is pending OCS review." />}
              {latestRecon?.status === 'denied' && <StatusBanner type="error" title="Reconsideration Request — Denied" description={latestRecon.response ? `OCS: "${latestRecon.response}"` : undefined} />}
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

        {/* ── Main consent type tabs ─────────────────────────────── */}
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

          {/* ── COI & Department Consent Tabs ────────────────────── */}
          {COI_DEPT_DEFS.map(def => {
            const ts = tabStates[def.key];
            const pending = pendingCount(def.key, def.requiresField);
            const eligibleCourses = activeTerm
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
            const canSubmit = (!isFinalized || appealBypass) && !isDisqualified && !!ts.sectionId && (selStatus === 'not_requested' || selStatus === 'denied');
            const canShowForm = (!isFinalized || appealBypass) && !isDisqualified && isConsentWindowOpen('COI / Department Consent') && !!activeTerm;

            const allRequests = activeTerm
              ? state.consents.filter(c => c.studentId === me.id && c.termId === activeTerm.id && c[def.key] !== 'not_requested')
              : [];
            const pendingRequests = allRequests.filter(c => c[def.key] === 'pending');

            return (
              <TabsContent key={def.tabValue} value={def.tabValue} className="mt-3">
                <WindowStatusBanner windowKey="COI / Department Consent" />

                <Tabs defaultValue="application" className="mt-3">
                  <TabsList className="h-9 p-1">
                    <TabsTrigger value="application" className="text-xs px-4">Your Application</TabsTrigger>
                    <TabsTrigger value="history" className="text-xs px-4">
                      Transaction History
                      {allRequests.length > 0 && <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground rounded-full px-1.5">{allRequests.length}</span>}
                    </TabsTrigger>
                  </TabsList>

                  {/* Your Application */}
                  <TabsContent value="application" className="mt-4 space-y-4">
                    {/* Instructions */}
                    <div className="portal-panel">
                      <div className="portal-panel-header">
                        <span>{def.label}</span>
                        {pending > 0 && <span className="bg-muted text-foreground text-xs px-2 py-0.5 rounded font-bold">{pending} pending</span>}
                      </div>
                      <div className="px-4 py-4 bg-background text-sm space-y-2">
                        <p><strong>To all students:</strong></p>
                        {def.key === 'coiStatus' ? (
                          <>
                            <p><strong>COI (Consent of Instructor)</strong> is required when the faculty teaching the section has set a restriction. You must request consent directly through this portal before you can enlist in the section.</p>
                            <p>Select the <strong>course</strong> and <strong>section</strong> you wish to request COI for, then click <strong>Submit</strong>. You may add a remarks/appeal message for the faculty.</p>
                          </>
                        ) : (
                          <>
                            <p><strong>Department Consent</strong> is required when the department offering the course has set a restriction on enrollment. You must request consent before you can enlist in the section.</p>
                            <p>Select the <strong>course</strong> and <strong>section</strong> you wish to apply for, then click <strong>Submit</strong>. The department will review your request.</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Application Form */}
                    {canShowForm && (
                      <div className="portal-panel">
                        <div className="portal-panel-header">Application Form</div>
                        <div className="p-5">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {/* Left: inputs */}
                            <div className="md:col-span-2 space-y-3">
                              <div>
                                <Label className="text-xs font-semibold">Course Code <span className="text-red-500">*</span></Label>
                                <SearchableSelect
                                  value={ts.courseId || '__none__'}
                                  onValueChange={v => setTab(def.key, { courseId: v === '__none__' ? '' : v, sectionId: '', remarks: '' })}
                                  placeholder="— Select Course —"
                                  options={[
                                    { value: '__none__', label: '— Select Course —' },
                                    ...eligibleCourses.map(c => ({ value: c.id, label: c.code })),
                                  ]}
                                  triggerClassName="mt-1 w-full"
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-semibold">Section <span className="text-red-500">*</span></Label>
                                <SearchableSelect
                                  value={ts.sectionId || '__none__'}
                                  onValueChange={v => setTab(def.key, { sectionId: v === '__none__' ? '' : v })}
                                  disabled={!ts.courseId}
                                  placeholder="Choose a section"
                                  options={[
                                    { value: '__none__', label: 'Choose a section' },
                                    ...sectionsForCourse.map(s => ({ value: s.id, label: s.sectionCode })),
                                  ]}
                                  triggerClassName="mt-1 w-full"
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-semibold">Faculty-in-charge</Label>
                                <Input readOnly value={selFaculty?.name ?? ''} placeholder="—" className="mt-1 bg-muted/50 text-sm" />
                              </div>
                              <div>
                                <Label className="text-xs font-semibold">Description</Label>
                                <Input readOnly value={selCourse?.title ?? ''} placeholder="—" className="mt-1 bg-muted/50 text-sm" />
                              </div>
                            </div>
                            {/* Right: remarks */}
                            <div className="flex flex-col">
                              <Label className="text-xs font-semibold">Remarks/Appeal</Label>
                              <Textarea
                                className="mt-1 flex-1 min-h-[160px] resize-none text-sm"
                                placeholder="Limit to 280 characters..."
                                maxLength={280}
                                value={ts.remarks}
                                onChange={e => setTab(def.key, { remarks: e.target.value })}
                                disabled={!ts.sectionId || !canSubmit}
                              />
                              {ts.remarks.length > 0 && <p className="text-xs text-muted-foreground mt-1 text-right">{ts.remarks.length}/280</p>}
                            </div>
                          </div>
                          <div className="flex justify-end mt-4 pt-4 border-t border-border">
                            <Button
                              disabled={!canSubmit}
                              onClick={() => handleCoiDeptSubmit(def)}
                            >
                              Submit
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pending Applications */}
                    <div className="portal-panel">
                      <div className="portal-panel-header">
                        <span>Pending Applications</span>
                        <span className="text-muted-foreground text-xs font-normal">{pendingRequests.length} record(s)</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-t border-b bg-muted/20">
                              <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Course</th>
                              <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Section</th>
                              <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Faculty-in-Charge</th>
                              <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Remarks</th>
                              <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendingRequests.length === 0 ? (
                              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No pending applications.</td></tr>
                            ) : pendingRequests.map(c => {
                              const sec = state.sections.find(s => s.id === c.sectionId);
                              const course = sec ? state.courses.find(co => co.id === sec.courseId) : undefined;
                              const fac = sec ? state.users.find(u => u.id === sec.facultyId) : undefined;
                              const reason = def.key === 'coiStatus' ? c.coiReason : c.deptReason;
                              if (!sec || !course || sec.sectionCode === '__MANUAL__') return null;
                              return (
                                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/10">
                                  <td className="px-3 py-2 text-xs font-mono font-semibold text-primary">{course.code}</td>
                                  <td className="px-3 py-2 text-xs">{sec.sectionCode}</td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fac?.name ?? 'TBA'}</td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground italic max-w-[200px]">{reason ? `"${reason}"` : '—'}</td>
                                  <td className="px-3 py-2"><StatusBadge s={c[def.key]} /></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Transaction History */}
                  <TabsContent value="history" className="mt-4">
                    <div className="portal-panel">
                      <div className="panel-header-history">
                        <span>Transaction History</span>
                        <span className="text-muted-foreground text-xs font-normal">{allRequests.length} record(s)</span>
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
                            </tr>
                          </thead>
                          <tbody>
                            {allRequests.length === 0 ? (
                              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No {def.short} consent records.</td></tr>
                            ) : allRequests.map(c => {
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
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            );
          })}

          {/* ── OCS Consent Tab ─────────────────────────────────────── */}
          <TabsContent value="ocs" className="mt-3">
            <WindowStatusBanner windowKey="OCS Consent" />

            <Tabs defaultValue="application" className="mt-3">
              <TabsList className="h-9 p-1">
                <TabsTrigger value="application" className="text-xs px-4">Your Application</TabsTrigger>
                <TabsTrigger value="history" className="text-xs px-4">
                  Transaction History
                  {ocsExistingRequests.length > 0 && <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground rounded-full px-1.5">{ocsExistingRequests.length}</span>}
                </TabsTrigger>
              </TabsList>

              {/* Your Application */}
              <TabsContent value="application" className="mt-4 space-y-4">
                {/* Instructions */}
                <div className="portal-panel">
                  <div className="portal-panel-header">
                    <span>OCS Consent</span>
                    {ocsPending > 0 && <span className="bg-muted text-foreground text-xs px-2 py-0.5 rounded font-bold">{ocsPending} pending</span>}
                  </div>
                  <div className="px-4 py-4 bg-background text-sm space-y-2">
                    <p><strong>To all students:</strong></p>
                    <p>
                      Applying for an OCS Consent pertaining to <span className="underline">waivers/satisfaction of pre-req</span> in{' '}
                      <strong>ONE CLASS OF A COURSE</strong> is enough to override the requisites/validations of all classes of that course.{' '}
                      <span className="underline">No need to apply for all sections</span> of the course.
                    </p>
                    <p>
                      When a class displays <span className="text-red-600 font-semibold">&ldquo;Requires OCS Consent&rdquo;</span>, apply for OCS consent type:{' '}
                      <span className="underline">OCS Controlled Class</span>.
                    </p>
                    <p className="font-bold italic">
                      Reminder: Attach supporting documents via a <span className="text-red-600">Google Drive link</span> (ensure the link is set to "Anyone with the link can view").
                    </p>
                  </div>
                </div>

                {/* Application Form */}
                {(!isFinalized || appealBypass) && !isDisqualified && activeTerm && (
                  <div className="portal-panel">
                    <div className="portal-panel-header">Application Form</div>
                    <div className="p-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Left: inputs */}
                        <div className="md:col-span-2 space-y-3">
                          <div>
                            <Label className="text-xs font-semibold">Course Code <span className="text-red-500">*</span></Label>
                            <SearchableSelect
                              value={ocsState.courseId || '__none__'}
                              onValueChange={v => setOcsState(prev => ({ ...prev, courseId: v === '__none__' ? '' : v, sectionId: '', ocsType: '', driveLink: '' }))}
                              placeholder="— Select —"
                              options={[
                                { value: '__none__', label: '— Select —' },
                                ...ocsEligibleCourses.map(c => ({ value: c.id, label: c.code })),
                              ]}
                              triggerClassName="mt-1 w-full"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold">Consent Type <span className="text-red-500">*</span></Label>
                            <SearchableSelect
                              value={ocsState.ocsType || '__none__'}
                              onValueChange={v => setOcsState(prev => ({ ...prev, ocsType: v === '__none__' ? '' : v }))}
                              placeholder="— Select Type —"
                              options={[
                                { value: '__none__', label: '— Select Type —' },
                                ...OCS_CONSENT_TYPES.map(t => ({ value: t, label: t })),
                              ]}
                              triggerClassName="mt-1 w-full"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold">Section <span className="text-red-500">*</span></Label>
                            <SearchableSelect
                              value={ocsState.sectionId || '__none__'}
                              onValueChange={v => setOcsState(prev => ({ ...prev, sectionId: v === '__none__' ? '' : v }))}
                              disabled={!ocsState.courseId}
                              placeholder="Choose a section"
                              options={[
                                { value: '__none__', label: 'Choose a section' },
                                ...ocsSectionsForCourse.map(s => ({ value: s.id, label: s.sectionCode })),
                              ]}
                              triggerClassName="mt-1 w-full"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold">Description</Label>
                            <Input readOnly value={ocsSelCourse?.title ?? ''} placeholder="—" className="mt-1 bg-muted/50 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold">Google Drive Link <span className="text-red-500">*</span></Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Link className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <Input
                                placeholder="https://drive.google.com/..."
                                value={ocsState.driveLink}
                                onChange={e => setOcsState(prev => ({ ...prev, driveLink: e.target.value }))}
                                className="text-sm"
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">Set sharing to "Anyone with the link can view".</p>
                          </div>
                        </div>
                        {/* Right: remarks */}
                        <div className="flex flex-col">
                          <Label className="text-xs font-semibold">Remarks/Appeal</Label>
                          <Textarea
                            className="mt-1 flex-1 min-h-[200px] resize-none text-sm"
                            placeholder="Limit to 280 characters..."
                            maxLength={280}
                            value={ocsState.remarks}
                            onChange={e => setOcsState(prev => ({ ...prev, remarks: e.target.value }))}
                            disabled={!ocsState.sectionId}
                          />
                          {ocsState.remarks.length > 0 && <p className="text-xs text-muted-foreground mt-1 text-right">{ocsState.remarks.length}/280</p>}
                        </div>
                      </div>
                      <div className="flex justify-end mt-4 pt-4 border-t border-border">
                        <Button disabled={!ocsCanApply} onClick={handleOCSSubmit}>Apply</Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending Applications */}
                <div className="portal-panel">
                  <div className="portal-panel-header">
                    <span>Pending Applications</span>
                    <span className="text-muted-foreground text-xs font-normal">{ocsPendingRequests.length} record(s)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-t border-b bg-muted/20">
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Course</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Type</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Section</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Remarks</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ocsPendingRequests.length === 0 ? (
                          <tr><td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No pending OCS applications.</td></tr>
                        ) : ocsPendingRequests.map(c => {
                          const sec = state.sections.find(s => s.id === c.sectionId);
                          const course = sec ? state.courses.find(co => co.id === sec.courseId) : undefined;
                          if (!sec || !course || sec.sectionCode === '__MANUAL__') return null;
                          return (
                            <tr key={c.id} className="border-b last:border-0 hover:bg-muted/10">
                              <td className="px-3 py-2 text-xs font-mono font-semibold text-primary">{course.code}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">{c.ocsConsentType ?? '—'}</td>
                              <td className="px-3 py-2 text-xs">{sec.sectionCode}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground italic max-w-[200px]">{c.ocsReason ? `"${c.ocsReason}"` : '—'}</td>
                              <td className="px-3 py-2"><StatusBadge s={c.ocsConsentStatus} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* Transaction History */}
              <TabsContent value="history" className="mt-4">
                <div className="portal-panel">
                  <div className="panel-header-history">
                    <span>Transaction History</span>
                    <span className="text-muted-foreground text-xs font-normal">{ocsExistingRequests.length} record(s)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-t border-b bg-muted/20">
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Course</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Type</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Section</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Description | Day-Time</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">College</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Drive Link</th>
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
                              <td className="px-3 py-2 text-xs">
                                {c.ocsDriveLink
                                  ? <a href={/^https?:\/\//.test(c.ocsDriveLink) ? c.ocsDriveLink : `https://${c.ocsDriveLink}`}
                                      target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-blue-600 underline hover:opacity-70 whitespace-nowrap">
                                      <Link className="w-3 h-3 flex-shrink-0" /><span>View</span>
                                    </a>
                                  : <span className="text-muted-foreground/40">—</span>}
                              </td>
                              <td className="px-3 py-2 text-xs text-muted-foreground italic max-w-[160px]">{c.ocsReason ? `"${c.ocsReason}"` : '—'}</td>
                              <td className="px-3 py-2 text-xs whitespace-nowrap">
                                <div className="flex flex-col gap-0.5">
                                  <StatusBadge s={c.ocsConsentStatus} />
                                  {c.ocsConsentStatus === 'approved' && <span className="text-xs text-blue-600 font-medium">Add in Enlistment</span>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

      </div>
    </PortalLayout>
  );
}
