import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Unlock, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getScholasticStanding } from '@/lib/academic';

const StatusBadge = ({ s }: { s: string }) => {
  if (s === 'approved') return <Badge className="bg-green-100 text-green-800 border-green-200 gap-1 text-xs"><CheckCircle className="w-3 h-3" />Approved</Badge>;
  if (s === 'pending')  return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1 text-xs"><Clock className="w-3 h-3" />Pending</Badge>;
  if (s === 'denied')   return <Badge className="bg-red-100 text-red-800 border-red-200 gap-1 text-xs"><XCircle className="w-3 h-3" />Denied</Badge>;
  return <Badge variant="outline" className="text-muted-foreground text-xs">—</Badge>;
};

export default function StudentPrerogatives() {
  const { state, requestPrerogative, cancelPrerogative, submitReconsiderationRequest } = useApp();
  const student = state.currentUser;
  const activeTerm = state.terms.find(t => t.isActive);

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [showReconDialog, setShowReconDialog] = useState(false);
  const [reconReason, setReconReason] = useState('');
  const [submittingRecon, setSubmittingRecon] = useState(false);

  if (!student) return null;

  if (!activeTerm) {
    return (
      <PortalLayout role="student" userName={student.name}>
        <div className="text-center text-muted-foreground py-12">No active term found.</div>
      </PortalLayout>
    );
  }

  const isFinalized = !!state.finalizedEnlistments.find(f => f.studentId === student.id && f.termId === activeTerm.id);
  const hasPDEver = student.status === 'permanently_disqualified' ||
    state.terms.some(t =>
      getScholasticStanding(student.id, t.id, state.grades, state.sections, state.courses)?.standing === 'Permanent Disqualification'
    );
  const hasApprovedReconThisTerm = (state.reconsiderationRequests ?? []).some(
    r => r.studentId === student.id && r.termId === activeTerm.id &&
         (!r.requestType || r.requestType === 'pd_reconsideration') &&
         r.status === 'approved'
  );
  const isDisqualified = hasPDEver && !hasApprovedReconThisTerm;
  const latestRecon = [...(state.reconsiderationRequests ?? [])]
    .filter(r => r.studentId === student.id && r.termId === activeTerm.id)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];

  const prerogativeOpen = activeTerm.controls.prerogativeOpen;
  const hasApprovedLateEnlistThisTerm = !isFinalized && (state.reconsiderationRequests ?? []).some(
    r => r.studentId === student.id && r.termId === activeTerm.id && r.requestType === 'late_enlistment' && r.status === 'approved'
  );
  const hasApprovedChangeDropRequest = !isFinalized && (state.changeDropRequests ?? []).some(
    r => r.studentId === student.id && r.termId === activeTerm.id && r.status === 'approved'
  );
  const appealBypass = hasApprovedLateEnlistThisTerm || hasApprovedChangeDropRequest;
  const effectivePrerogativeOpen = prerogativeOpen || hasApprovedLateEnlistThisTerm || hasApprovedChangeDropRequest;

  const prerogativeWindowStatus = (() => {
    const { prerogativeFrom, prerogativeUntil } = activeTerm;
    if (!prerogativeFrom && !prerogativeUntil) return 'not-set';
    const now = new Date();
    if (prerogativeFrom && now < new Date(prerogativeFrom)) return 'upcoming';
    if (prerogativeUntil && now > new Date(prerogativeUntil)) return 'ended';
    return 'open';
  })();

  const myEnrollments = state.enrollments.filter(e => e.studentId === student.id && e.termId === activeTerm.id && e.status !== 'dropped');
  const myPrerogatives = state.prerogatives.filter(p => p.studentId === student.id && p.termId === activeTerm.id);
  const pendingPrerogatives = myPrerogatives.filter(p => p.status === 'pending');

  const availableCourses = Array.from(
    new Map(
      state.sections
        .filter(s => s.termId === activeTerm.id && s.sectionCode !== '__MANUAL__')
        .map(s => state.courses.find(c => c.id === s.courseId))
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map(c => [c.id, c])
    ).values()
  );

  const sectionsForCourse = selectedCourseId
    ? (() => {
        const all = state.sections.filter(s => s.termId === activeTerm.id && s.courseId === selectedCourseId && s.sectionCode !== '__MANUAL__');
        const course = state.courses.find(c => c.id === selectedCourseId);
        const isDual = course?.type === 'Lec+Lab' || course?.type === 'Lec+Rec';
        if (isDual) {
          const children = all.filter(s => !!s.parentSectionId);
          return children.length > 0 ? children : all;
        }
        return all.filter(s => !s.parentSectionId || !state.sections.some(cs => cs.parentSectionId === s.id));
      })()
    : [];

  const selSection = state.sections.find(s => s.id === selectedSectionId);
  const selCourse = state.courses.find(c => c.id === selectedCourseId);
  const selFaculty = selSection ? state.users.find(u => u.id === selSection.facultyId) : undefined;
  const isFull = selSection ? selSection.enrolled >= selSection.slots : false;
  const alreadyEnlisted = !!myEnrollments.find(e => e.sectionId === selectedSectionId);
  const existingPrerog = myPrerogatives.find(p => p.sectionId === selectedSectionId);
  const fic_accepting = selSection?.prerogativeAccepting !== false;

  const canSubmit = (!isFinalized || appealBypass) && !isDisqualified && effectivePrerogativeOpen
    && !!selectedSectionId && isFull && !alreadyEnlisted && !existingPrerog && fic_accepting && remarks.trim().length > 0;

  const sectionStatusLabel = () => {
    if (!selectedSectionId) return null;
    if (alreadyEnlisted) return { text: 'Already Enlisted', cls: 'bg-green-100 text-green-700 border-green-200' };
    if (existingPrerog) return { text: existingPrerog.status.charAt(0).toUpperCase() + existingPrerog.status.slice(1), cls: existingPrerog.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' : existingPrerog.status === 'denied' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    if (!isFull) return { text: 'Available', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (!fic_accepting) return { text: 'FIC Closed', cls: 'bg-orange-100 text-orange-700 border-orange-200' };
    return { text: 'FULL', cls: 'bg-red-100 text-red-700 border-red-200' };
  };
  const statusLabel = sectionStatusLabel();

  const handleSubmit = () => {
    if (!canSubmit) return;
    requestPrerogative(student.id, selectedSectionId, activeTerm.id, remarks.trim());
    toast.success('Prerogative requested', { description: 'Your request has been sent to the faculty for review.' });
    setSelectedCourseId('');
    setSelectedSectionId('');
    setRemarks('');
  };

  return (
    <PortalLayout role="student" userName={student.name}>
      <div className="space-y-4">

        {/* Window status banners */}
        {effectivePrerogativeOpen && (!isFinalized || appealBypass)
          ? <StatusBanner type="open" title="Prerogative Window is Open" description="You may submit requests to full sections below." />
          : (!isFinalized || appealBypass) && (
            prerogativeWindowStatus === 'not-set' ? (
              <StatusBanner type="warning" title="Prerogative Window Not Yet Scheduled" description={<>Prerogative window has not been scheduled. Please <strong>wait for the University announcement</strong>.</>} />
            ) : prerogativeWindowStatus === 'upcoming' && activeTerm.prerogativeFrom ? (
              <StatusBanner type="deadline" title="Prerogative Window Not Yet Open" description={<>Prerogative window opens on <strong>{new Date(activeTerm.prerogativeFrom).toLocaleString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>.</>} />
            ) : (
              <StatusBanner type="error" title="Prerogative Window Closed" description="Requests cannot be submitted at this time." />
            )
          )
        }

        {isFinalized && !appealBypass && (
          <StatusBanner type="notice" title="Enlistment Finalized" description="Your enlistment is finalized. Prerogative requests are no longer accepted." />
        )}

        {pendingPrerogatives.length > 0 && (
          <StatusBanner type="notice" title="Requests Pending Review" description={<><strong>{pendingPrerogatives.length} prerogative request(s)</strong> submitted and awaiting faculty review.</>} />
        )}
        {myPrerogatives.filter(p => p.status === 'denied').length > 0 && !myPrerogatives.some(p => p.status === 'approved') && (
          <StatusBanner type="error" title={`${myPrerogatives.filter(p => p.status === 'denied').length} Prerogative Request(s) Denied`} description="You may try a different section if the window is still open." />
        )}

        {/* PD Lock */}
        {isDisqualified && (() => {
          const noPending = !latestRecon || latestRecon.status !== 'pending';
          return (
            <>
              <StatusBanner type="error" title="Prerogative Module Locked — Permanent Disqualification"
                description="You cannot submit prerogative requests. Submit a reconsideration request to the OCS.">
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
                          await submitReconsiderationRequest(student.id, activeTerm.id, reconReason.trim());
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

        {/* Main Tabs */}
        <Tabs defaultValue="application" className="w-full">
          <TabsList className="h-9 p-1">
            <TabsTrigger value="application" className="text-xs px-4">Your Application</TabsTrigger>
            <TabsTrigger value="history" className="text-xs px-4">
              Transaction History
              {myPrerogatives.length > 0 && <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground rounded-full px-1.5">{myPrerogatives.length}</span>}
            </TabsTrigger>
          </TabsList>

          {/* Your Application */}
          <TabsContent value="application" className="mt-4 space-y-4">
            {/* Instructions */}
            <div className="portal-panel">
              <div className="portal-panel-header">Prerogative Request</div>
              <div className="px-4 py-4 bg-background text-sm space-y-2">
                <p><strong>To all students:</strong></p>
                <p>
                  A <strong>prerogative request</strong> allows you to request enrollment in a section that is already full.
                  Submitted requests are individually reviewed and approved or denied by the faculty-in-charge of the section.
                </p>
                <p>
                  Select the <strong>course</strong> and <strong>section</strong> below. You must include a remarks/appeal message
                  to support your request. If approved, go to the <strong>Enlistment page</strong> to complete your enrollment.
                </p>
                <p className="font-bold italic">
                  Reminder: You may only submit <span className="not-italic font-bold underline">one prerogative request per section</span>.
                  Duplicate submissions will be rejected.
                </p>
              </div>
            </div>

            {/* Application Form */}
            {(!isFinalized || appealBypass) && !isDisqualified && (
              <div className="portal-panel">
                <div className="portal-panel-header">Application Form</div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Left: inputs */}
                    <div className="md:col-span-2 space-y-3">
                      <div>
                        <Label className="text-xs font-semibold">Course Code <span className="text-red-500">*</span></Label>
                        <SearchableSelect
                          value={selectedCourseId || '__none__'}
                          onValueChange={v => { setSelectedCourseId(v === '__none__' ? '' : v); setSelectedSectionId(''); setRemarks(''); }}
                          placeholder="— Select Course —"
                          options={[
                            { value: '__none__', label: '— Select Course —' },
                            ...availableCourses.map(c => ({ value: c.id, label: c.code })),
                          ]}
                          triggerClassName="mt-1 w-full"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Section <span className="text-red-500">*</span></Label>
                        <SearchableSelect
                          value={selectedSectionId || '__none__'}
                          onValueChange={v => { setSelectedSectionId(v === '__none__' ? '' : v); setRemarks(''); }}
                          disabled={!selectedCourseId}
                          placeholder="Choose a section"
                          options={[
                            { value: '__none__', label: 'Choose a section' },
                            ...sectionsForCourse.map(s => ({ value: s.id, label: `${s.sectionCode} (${s.enrolled}/${s.slots})` })),
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
                      {selectedSectionId && statusLabel && (
                        <div>
                          <Label className="text-xs font-semibold">Section Status</Label>
                          <div className="mt-1">
                            <Badge className={`text-xs ${statusLabel.cls}`}>{statusLabel.text}</Badge>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Right: remarks */}
                    <div className="flex flex-col">
                      <Label className="text-xs font-semibold">Remarks/Appeal <span className="text-red-500">*</span></Label>
                      <Textarea
                        className="mt-1 flex-1 min-h-[200px] resize-none text-sm"
                        placeholder="Limit to 280 characters..."
                        maxLength={280}
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        disabled={!selectedSectionId}
                      />
                      {remarks.length > 0 && <p className="text-xs text-muted-foreground mt-1 text-right">{remarks.length}/280</p>}
                    </div>
                  </div>
                  <div className="flex justify-end mt-4 pt-4 border-t border-border">
                    <Button disabled={!canSubmit} onClick={handleSubmit}>Submit</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Applications */}
            <div className="portal-panel">
              <div className="portal-panel-header">
                <span>Pending Applications</span>
                <span className="text-white/70 text-xs font-normal">{pendingPrerogatives.length} record(s)</span>
              </div>
              <div className="overflow-x-auto">
                {pendingPrerogatives.length === 0 ? (
                  <div className="py-10 text-center">
                    <Unlock className="w-7 h-7 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground text-sm">No pending applications.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-t border-b bg-muted/20">
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Course</th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Section</th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Faculty-in-Charge</th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Remarks</th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Status</th>
                        <th className="text-left font-bold px-3 py-2.5 text-xs whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingPrerogatives.map(prg => {
                        const sec = state.sections.find(s => s.id === prg.sectionId);
                        const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                        const fac = sec ? state.users.find(u => u.id === sec.facultyId) : null;
                        return (
                          <tr key={prg.id} className="border-b last:border-0 hover:bg-muted/10">
                            <td className="px-3 py-2 text-xs font-mono font-semibold text-primary">{course?.code ?? '—'}</td>
                            <td className="px-3 py-2 text-xs">{sec?.sectionCode && sec.sectionCode !== '__MANUAL__' ? sec.sectionCode : '—'}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fac?.name ?? 'TBA'}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground italic max-w-[200px]">{prg.reason ? `"${prg.reason}"` : '—'}</td>
                            <td className="px-3 py-2"><StatusBadge s={prg.status} /></td>
                            <td className="px-3 py-2 text-xs">
                              <Button size="sm" variant="outline" className="h-6 text-xs border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => cancelPrerogative(prg.id)}>Cancel</Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Transaction History */}
          <TabsContent value="history" className="mt-4">
            <div className="portal-panel">
              <div className="panel-header-history">
                <span>Transaction History</span>
                <span className="text-white/70 text-xs font-normal">{myPrerogatives.length} record(s)</span>
              </div>
              <div className="bg-background">
                {myPrerogatives.length === 0 ? (
                  <div className="py-12 text-center">
                    <Unlock className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground font-medium">No prerogative requests yet.</p>
                    <p className="text-muted-foreground text-sm mt-1">Go to "Your Application" to submit a request.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/20">
                          <th className="text-left font-bold px-3 py-2.5 text-xs">Course</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs">Section</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs">Description</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs">Faculty-in-Charge</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs">Status</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs">Remarks/Appeal</th>
                          <th className="text-left font-bold px-3 py-2.5 text-xs">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myPrerogatives.map(prg => {
                          const sec = state.sections.find(s => s.id === prg.sectionId);
                          const course = sec ? state.courses.find(c => c.id === sec.courseId) : null;
                          const fac = sec ? state.users.find(u => u.id === sec.facultyId) : null;
                          return (
                            <tr key={prg.id} className="border-b last:border-0 hover:bg-muted/10">
                              <td className="px-3 py-2 text-xs font-mono font-semibold text-primary">{course?.code ?? '—'}</td>
                              <td className="px-3 py-2 text-xs">{sec?.sectionCode && sec.sectionCode !== '__MANUAL__' ? sec.sectionCode : '—'}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground max-w-[150px]"><span className="line-clamp-2">{course?.title ?? '—'}</span></td>
                              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fac?.name ?? 'TBA'}</td>
                              <td className="px-3 py-2"><StatusBadge s={prg.status} /></td>
                              <td className="px-3 py-2 text-xs italic text-muted-foreground max-w-[180px]">{prg.reason ? `"${prg.reason}"` : '—'}</td>
                              <td className="px-3 py-2 text-xs whitespace-nowrap">
                                {prg.status === 'approved' ? (
                                  <span className="text-green-600 font-medium">Go to Enlistment</span>
                                ) : prg.status === 'pending' ? (
                                  <Button size="sm" variant="outline" className="h-6 text-xs border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={() => cancelPrerogative(prg.id)}>Cancel</Button>
                                ) : (
                                  <span className="text-muted-foreground italic">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </PortalLayout>
  );
}
