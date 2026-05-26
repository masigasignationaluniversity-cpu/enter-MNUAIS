import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { CheckCircle, Clock, XCircle, FileText, Info, Lock } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { ConsentStatus } from '../../lib/types';

const StatusBadge = ({ s }: { s: ConsentStatus }) => {
  if (s === 'approved') return <Badge className="bg-green-100 text-green-800 border-green-200 gap-1 text-xs"><CheckCircle className="w-3 h-3" />Approved</Badge>;
  if (s === 'pending')  return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1 text-xs"><Clock className="w-3 h-3" />Pending</Badge>;
  if (s === 'denied')   return <Badge className="bg-red-100 text-red-800 border-red-200 gap-1 text-xs"><XCircle className="w-3 h-3" />Denied</Badge>;
  return <Badge variant="outline" className="text-muted-foreground text-xs">—</Badge>;
};

type ConsentField = 'coiStatus' | 'deptConsentStatus' | 'ocsConsentStatus';
interface ConsentDef { key: ConsentField; label: string; short: string; desc: string; requiresField: 'requiresCOI' | 'requiresDeptConsent' | 'requiresOCSConsent'; }

const DEFS: ConsentDef[] = [
  { key: 'coiStatus',         label: 'COI (Consent of Instructor)', short: 'COI', desc: 'Consent of Instructor — required by the faculty teaching the section.',   requiresField: 'requiresCOI' },
  { key: 'deptConsentStatus', label: 'Department Consent',          short: 'DC',  desc: 'Department Consent — required by the department offering the course.',    requiresField: 'requiresDeptConsent' },
  { key: 'ocsConsentStatus',  label: 'OCS Consent',                 short: 'OCS', desc: 'OCS Consent — final approval by the Office of the College Secretary.',   requiresField: 'requiresOCSConsent' },
];

type TabState = { courseId: string; sectionId: string; remarks: string };

export default function StudentConsent() {
  const { state, requestConsent, getActiveTerm } = useApp();
  const { toast } = useToast();
  const [tabStates, setTabStates] = useState<Record<string, TabState>>({
    coiStatus:         { courseId: '', sectionId: '', remarks: '' },
    deptConsentStatus: { courseId: '', sectionId: '', remarks: '' },
    ocsConsentStatus:  { courseId: '', sectionId: '', remarks: '' },
  });

  const me = state.currentUser;
  if (!me) return null;
  const activeTerm = getActiveTerm();
  const isFinalized = !!activeTerm && state.finalizedEnlistments.some(f => f.studentId === me.id && f.termId === activeTerm.id);

  const getConsent = (sectionId: string) =>
    state.consents.find(c => c.studentId === me.id && c.sectionId === sectionId && c.termId === activeTerm?.id);

  const setTab = (key: string, patch: Partial<TabState>) =>
    setTabStates(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const handleSubmit = (def: ConsentDef) => {
    const ts = tabStates[def.key];
    if (!activeTerm || !ts.sectionId) return;
    requestConsent(me.id, ts.sectionId, activeTerm.id, def.key, ts.remarks);
    toast({ title: 'Consent requested', description: 'Your request has been submitted for review.' });
    setTab(def.key, { sectionId: '', courseId: '', remarks: '' });
  };

  const pendingCount = (def: ConsentDef) => {
    if (!activeTerm) return 0;
    return state.sections.filter(sec => {
      if (sec.termId !== activeTerm.id) return false;
      const course = state.courses.find(c => c.id === sec.courseId);
      if (!course?.[def.requiresField]) return false;
      return (getConsent(sec.id)?.[def.key] ?? 'not_requested') === 'pending';
    }).length;
  };

  return (
    <PortalLayout title="Consent Management">
      <div className="space-y-4">

        {/* Page header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Consent Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Apply for required consents before you can enlist in restricted courses for {activeTerm?.name ?? '—'}</p>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Consents must be approved before you can enlist. Select a course and section below, fill in your remarks, then submit your request.</span>
        </div>

        {/* Finalized */}
        {isFinalized && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-300 text-green-800 text-sm">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>Enlistment is finalized — new consent requests are locked. Existing requests remain for reference.</span>
          </div>
        )}

        {/* Consent sections */}
        {DEFS.map(def => {
          const ts = tabStates[def.key];
          const pending = pendingCount(def);

          // Courses requiring this consent type (active term sections)
          const eligibleCourses = activeTerm
            ? Array.from(
                new Map(
                  state.sections
                    .filter(s => s.termId === activeTerm.id)
                    .map(s => state.courses.find(c => c.id === s.courseId))
                    .filter((c): c is NonNullable<typeof c> => !!c && !!c[def.requiresField])
                    .map(c => [c.id, c])
                ).values()
              )
            : [];

          // Sections for the selected course
          const sectionsForCourse = ts.courseId && activeTerm
            ? state.sections.filter(s => s.termId === activeTerm.id && s.courseId === ts.courseId)
            : [];

          // Selected section data
          const selSection = state.sections.find(s => s.id === ts.sectionId);
          const selCourse = state.courses.find(c => c.id === ts.courseId);
          const selFaculty = selSection ? state.users.find(u => u.id === selSection.facultyId) : undefined;
          const selConsent = selSection ? getConsent(selSection.id) : undefined;
          const selStatus: ConsentStatus = selConsent?.[def.key] ?? 'not_requested';
          const canSubmit = !isFinalized && ts.sectionId && (selStatus === 'not_requested' || selStatus === 'denied');

          // Existing submitted requests for this consent type
          const existingRequests = activeTerm
            ? state.consents.filter(c =>
                c.studentId === me.id && c.termId === activeTerm.id &&
                c[def.key] !== 'not_requested'
              )
            : [];

          return (
            <div key={def.key} className="rounded-md overflow-hidden border border-border">
              {/* Maroon header */}
              <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between">
                <span>{def.label}</span>
                {pending > 0 && <Badge className="bg-yellow-300 text-yellow-900 text-xs border-0">{pending} pending</Badge>}
              </div>

              <div className="bg-background">
                {/* Description */}
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
                        {/* Input row */}
                        {!isFinalized && (
                          <tr className="border-b bg-background hover:bg-muted/10">
                            {/* Course dropdown */}
                            <td className="px-3 py-2 align-top">
                              <Select
                                value={ts.courseId || '__none__'}
                                onValueChange={v => setTab(def.key, { courseId: v === '__none__' ? '' : v, sectionId: '', remarks: '' })}
                              >
                                <SelectTrigger className="h-8 text-xs w-36">
                                  <SelectValue placeholder="" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">— Select Course —</SelectItem>
                                  {eligibleCourses.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            {/* Section dropdown */}
                            <td className="px-3 py-2 align-top">
                              <Select
                                value={ts.sectionId || '__none__'}
                                onValueChange={v => setTab(def.key, { sectionId: v === '__none__' ? '' : v })}
                                disabled={!ts.courseId}
                              >
                                <SelectTrigger className="h-8 text-xs w-36">
                                  <SelectValue placeholder="Choose a section" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Choose a section</SelectItem>
                                  {sectionsForCourse.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.sectionCode}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            {/* Description */}
                            <td className="px-3 py-2 align-top text-xs text-muted-foreground max-w-[160px]">
                              {selCourse ? (
                                <span className="line-clamp-2">{selCourse.title}</span>
                              ) : <span className="text-muted-foreground/40">—</span>}
                            </td>
                            {/* Faculty-in-Charge */}
                            <td className="px-3 py-2 align-top text-xs text-muted-foreground whitespace-nowrap">
                              {selFaculty?.name ?? <span className="text-muted-foreground/40">—</span>}
                            </td>
                            {/* Consent type */}
                            <td className="px-3 py-2 align-top">
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{def.short}</Badge>
                            </td>
                            {/* Status */}
                            <td className="px-3 py-2 align-top">
                              {ts.sectionId ? <StatusBadge s={selStatus} /> : <span className="text-muted-foreground/40 text-xs">—</span>}
                            </td>
                            {/* Remarks */}
                            <td className="px-3 py-2 align-top w-52">
                              <Textarea
                                className="text-xs min-h-[60px] resize-none"
                                placeholder="limit to 280 characters"
                                maxLength={280}
                                value={ts.remarks}
                                onChange={e => setTab(def.key, { remarks: e.target.value })}
                                disabled={!ts.sectionId || !canSubmit}
                              />
                              {ts.remarks.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5 text-right">{ts.remarks.length}/280</p>
                              )}
                            </td>
                            {/* Action */}
                            <td className="px-3 py-2 align-top whitespace-nowrap">
                              {!ts.sectionId ? (
                                <span className="text-xs italic text-muted-foreground">Unavailable</span>
                              ) : canSubmit ? (
                                <Button size="sm" className="h-7 text-xs bg-primary text-primary-foreground"
                                  onClick={() => handleSubmit(def)}>
                                  Submit
                                </Button>
                              ) : selStatus === 'pending' ? (
                                <span className="text-xs italic text-muted-foreground">Pending</span>
                              ) : selStatus === 'approved' ? (
                                <span className="text-xs italic text-green-600">Approved</span>
                              ) : (
                                <span className="text-xs italic text-muted-foreground">Unavailable</span>
                              )}
                            </td>
                          </tr>
                        )}

                        {/* Existing request rows */}
                        {existingRequests.map(c => {
                          const sec = state.sections.find(s => s.id === c.sectionId);
                          const course = sec ? state.courses.find(co => co.id === sec.courseId) : undefined;
                          const fac = sec ? state.users.find(u => u.id === sec.facultyId) : undefined;
                          const status = c[def.key];
                          const reason = def.key === 'coiStatus' ? c.coiReason : def.key === 'deptConsentStatus' ? c.deptReason : c.ocsReason;
                          if (!sec || !course) return null;
                          return (
                            <tr key={c.id} className="border-b last:border-0 hover:bg-muted/10">
                              <td className="px-3 py-2 text-xs font-mono font-semibold text-primary">{course.code}</td>
                              <td className="px-3 py-2 text-xs">{sec.sectionCode}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground max-w-[160px]">
                                <span className="line-clamp-2">{course.title}</span>
                              </td>
                              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fac?.name ?? 'TBA'}</td>
                              <td className="px-3 py-2">
                                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{def.short}</Badge>
                              </td>
                              <td className="px-3 py-2"><StatusBadge s={status} /></td>
                              <td className="px-3 py-2 text-xs text-muted-foreground italic max-w-[180px]">
                                {reason ? `"${reason}"` : '—'}
                              </td>
                              <td className="px-3 py-2 text-xs italic text-muted-foreground whitespace-nowrap">
                                {status === 'approved' ? <span className="text-green-600">Approved</span>
                                  : status === 'pending' ? 'Awaiting review'
                                  : status === 'denied' ? <span className="text-red-500">Denied</span>
                                  : '—'}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Empty state */}
                        {isFinalized && existingRequests.length === 0 && (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                              No {def.short} consent records.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
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
