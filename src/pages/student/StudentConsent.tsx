import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { CheckCircle, Clock, XCircle, FileText, Info, Search, Lock } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { ConsentStatus } from '../../lib/types';

const StatusBadge = ({ s }: { s: ConsentStatus }) => {
  if (s === 'approved') return <Badge className="bg-green-100 text-green-800 border-green-200 gap-1 text-xs"><CheckCircle className="w-3 h-3" />Approved</Badge>;
  if (s === 'pending')  return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1 text-xs"><Clock className="w-3 h-3" />Pending</Badge>;
  if (s === 'denied')   return <Badge className="bg-red-100 text-red-800 border-red-200 gap-1 text-xs"><XCircle className="w-3 h-3" />Denied</Badge>;
  return <Badge variant="outline" className="text-muted-foreground text-xs">Not Requested</Badge>;
};

type ConsentField = 'coiStatus' | 'deptConsentStatus' | 'ocsConsentStatus';
interface ConsentTab { key: ConsentField; label: string; short: string; desc: string; requiresField: 'requiresCOI' | 'requiresDeptConsent' | 'requiresOCSConsent'; }

const SECTIONS: ConsentTab[] = [
  { key: 'coiStatus',        label: 'COI (Consent of Instructor)',  short: 'COI',  desc: 'Consent of Instructor — required by the faculty teaching the section.',            requiresField: 'requiresCOI' },
  { key: 'deptConsentStatus', label: 'Department Consent',          short: 'DC',   desc: 'Department Consent — required by the department offering the course.',             requiresField: 'requiresDeptConsent' },
  { key: 'ocsConsentStatus',  label: 'OCS Consent',                 short: 'OCS',  desc: 'OCS Consent — final approval by the Office of the College Secretary.',            requiresField: 'requiresOCSConsent' },
];

export default function StudentConsent() {
  const { state, requestConsent, getActiveTerm } = useApp();
  const { toast } = useToast();
  const [search, setSearch] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [applying, setApplying] = useState<Record<string, boolean>>({});

  const me = state.currentUser;
  if (!me) return null;
  const activeTerm = getActiveTerm();
  const isFinalized = !!activeTerm && state.finalizedEnlistments.some(f => f.studentId === me.id && f.termId === activeTerm.id);

  const getConsent = (sectionId: string) =>
    state.consents.find(c => c.studentId === me.id && c.sectionId === sectionId && c.termId === activeTerm?.id);

  const handleRequest = (sectionId: string, field: ConsentField) => {
    if (!activeTerm) return;
    requestConsent(me.id, sectionId, activeTerm.id, field, reasons[`${sectionId}-${field}`]);
    toast({ title: 'Consent requested', description: 'Your request has been submitted for review.' });
    setReasons(prev => ({ ...prev, [`${sectionId}-${field}`]: '' }));
    setApplying(prev => ({ ...prev, [`${sectionId}-${field}`]: false }));
  };

  const pendingCount = (tab: ConsentTab) => {
    if (!activeTerm) return 0;
    return state.sections.filter(sec => {
      if (sec.termId !== activeTerm.id) return false;
      const course = state.courses.find(c => c.id === sec.courseId);
      if (!course?.[tab.requiresField]) return false;
      const consent = getConsent(sec.id);
      return (consent?.[tab.key] ?? 'not_requested') === 'pending';
    }).length;
  };

  return (
    <PortalLayout title="Consent Management">
      <div className="space-y-4">

        {/* ── Page header ─────────────────────────────────────────── */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Consent Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Apply for required consents before you can enlist in restricted courses</p>
        </div>

        {/* ── Info banner ──────────────────────────────────────────── */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Consents must be approved before you can enlist. Apply in advance to avoid delays during enlistment.</span>
        </div>

        {/* ── Finalized lock ───────────────────────────────────────── */}
        {isFinalized && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-300 text-green-800 text-sm">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>Enlistment is finalized — new consent requests are locked. Existing requests remain for reference.</span>
          </div>
        )}

        {/* ── Consent sections ─────────────────────────────────────── */}
        {SECTIONS.map(tab => {
          const q = search[tab.key] ?? '';
          const pending = pendingCount(tab);

          const relevantSections = activeTerm
            ? state.sections
                .filter(sec => sec.termId === activeTerm.id)
                .filter(sec => {
                  const course = state.courses.find(c => c.id === sec.courseId);
                  if (!course?.[tab.requiresField]) return false;
                  if (!q) return true;
                  return (
                    course.code.toLowerCase().includes(q.toLowerCase()) ||
                    course.title.toLowerCase().includes(q.toLowerCase()) ||
                    sec.sectionCode.toLowerCase().includes(q.toLowerCase())
                  );
                })
            : [];

          return (
            <div key={tab.key} className="rounded-md overflow-hidden border border-border">
              {/* Maroon header */}
              <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between">
                <span>{tab.label}</span>
                {pending > 0 && (
                  <Badge className="bg-yellow-300 text-yellow-900 text-xs border-0">{pending} pending</Badge>
                )}
              </div>

              <div className="p-4 space-y-3 bg-background">
                {/* Description */}
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
                  {tab.desc}
                </p>

                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={`Search courses requiring ${tab.short}…`}
                    className="pl-9"
                    value={q}
                    onChange={e => setSearch(prev => ({ ...prev, [tab.key]: e.target.value }))}
                  />
                </div>

                {/* Section list */}
                {!activeTerm ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">No active term.</p>
                ) : relevantSections.length === 0 ? (
                  <div className="py-8 text-center">
                    <FileText className="w-7 h-7 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground font-medium">No courses found requiring {tab.short}.</p>
                    {q && <p className="text-sm text-muted-foreground mt-1">Try a different search term.</p>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {relevantSections.map(sec => {
                      const course = state.courses.find(c => c.id === sec.courseId);
                      const faculty = state.users.find(u => u.id === sec.facultyId);
                      const consent = getConsent(sec.id);
                      const status = consent?.[tab.key] ?? 'not_requested';
                      const isApplying = applying[`${sec.id}-${tab.key}`];
                      const canRequest = !isFinalized && (status === 'not_requested' || status === 'denied');

                      return (
                        <div key={sec.id} className={`border rounded-md px-4 py-3 border-l-4 ${status === 'approved' ? 'border-l-green-500' : status === 'pending' ? 'border-l-yellow-400' : status === 'denied' ? 'border-l-red-400' : 'border-l-gray-300'}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-semibold text-primary text-sm">{course?.code}</span>
                                <span className="text-sm font-medium truncate">{course?.title}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                                <p>Section {sec.sectionCode} • {faculty?.name ?? 'TBA'} • {sec.enrolled}/{sec.slots} slots</p>
                                <p>{sec.schedule.days.join('')} {sec.schedule.startTime}–{sec.schedule.endTime}{sec.schedule.room ? ` • ${sec.schedule.room}` : ''}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <StatusBadge s={status} />
                              {canRequest && !isApplying && (
                                <Button size="sm" className="h-7 text-xs bg-primary text-primary-foreground gap-1"
                                  onClick={() => setApplying(prev => ({ ...prev, [`${sec.id}-${tab.key}`]: true }))}>
                                  <FileText className="w-3 h-3" />{status === 'denied' ? 'Re-apply' : 'Apply'}
                                </Button>
                              )}
                            </div>
                          </div>
                          {isApplying && (
                            <div className="mt-3 pt-3 border-t border-dashed space-y-2">
                              <Label className="text-xs text-muted-foreground">Reason / Justification (optional)</Label>
                              <Textarea className="text-xs min-h-16"
                                placeholder={`State your reason for requesting ${tab.short} consent…`}
                                value={reasons[`${sec.id}-${tab.key}`] ?? ''}
                                onChange={e => setReasons(prev => ({ ...prev, [`${sec.id}-${tab.key}`]: e.target.value }))} />
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="h-7 text-xs"
                                  onClick={() => setApplying(prev => ({ ...prev, [`${sec.id}-${tab.key}`]: false }))}>Cancel</Button>
                                <Button size="sm" className="h-7 text-xs bg-primary text-primary-foreground gap-1"
                                  onClick={() => handleRequest(sec.id, tab.key)}>
                                  <FileText className="w-3 h-3" /> Submit Request
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

      </div>
    </PortalLayout>
  );
}
