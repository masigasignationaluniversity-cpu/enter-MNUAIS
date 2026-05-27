import { useState, useEffect } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Plus, Pencil, Check, Trash2, Clock, Calendar, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { OCS_CONSENT_TYPES } from '@/lib/types';

const CONSENT_KEYS = ['COI / Department Consent', ...OCS_CONSENT_TYPES] as const;

type WindowStatus = 'open' | 'upcoming' | 'ended' | 'not-set';
function windowStatus(from?: string, until?: string): WindowStatus {
  if (!from && !until) return 'not-set';
  const now = new Date();
  if (from && now < new Date(from)) return 'upcoming';
  if (until && now > new Date(until)) return 'ended';
  return 'open';
}

function WindowBadge({ status }: { status: WindowStatus }) {
  if (status === 'open') return <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">Open</Badge>;
  if (status === 'upcoming') return <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">Upcoming</Badge>;
  if (status === 'ended') return <Badge className="bg-gray-100 text-gray-600 border-gray-300 text-xs">Ended</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">Not Set</Badge>;
}

function DateWindowRow({
  label, from, until,
  onFrom, onUntil, hint,
}: {
  label: string; from: string; until: string;
  onFrom: (v: string) => void; onUntil: (v: string) => void; hint?: string;
}) {
  const status = windowStatus(from || undefined, until || undefined);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        <WindowBadge status={status} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-gray-500">Opens</Label>
          <Input type="datetime-local" value={from} onChange={e => onFrom(e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Closes</Label>
          <Input type="datetime-local" value={until} onChange={e => onUntil(e.target.value)} className="h-8 text-xs" />
        </div>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function AdminTermControl() {
  const { state, updateTermSettings, setActiveTerm, addTerm, deleteTerm } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editTerm, setEditTerm] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', academicYear: '', semester: '1st' as '1st' | '2nd' | 'Mid-Term', dropDeadline: '', maxUnits: '21' });

  type EditForm = {
    termName: string;
    dropDeadline: string;
    maxUnits: string;
    enlistmentFrom: string; enlistmentUntil: string;
    enrollmentFrom: string; enrollmentUntil: string;
    evaluationFrom: string; evaluationUntil: string;
    encodingFrom: string; encodingUntil: string;
    prerogativeFrom: string; prerogativeUntil: string;
    finalizeWindowStart: string; finalizeWindowEnd: string;
    unfinalizedDeadline: string;
    lateEnrollmentFrom: string; lateEnrollmentUntil: string;
    changeDropFrom: string; changeDropUntil: string;
    enrollmentSlots: Array<{ phase: 1 | 2; day: number; date: string; idPrefixes: string[]; input: string }>;
    consentWindows: Record<string, { from: string; until: string }>;
  };

  const emptyConsentWindows = () =>
    Object.fromEntries(CONSENT_KEYS.map(k => [k, { from: '', until: '' }]));

  const emptyEnrollmentSlots = () => [
    { phase: 1 as const, day: 1, date: '', idPrefixes: [], input: '' },
    { phase: 1 as const, day: 2, date: '', idPrefixes: [], input: '' },
    { phase: 1 as const, day: 3, date: '', idPrefixes: [], input: '' },
    { phase: 1 as const, day: 4, date: '', idPrefixes: [], input: '' },
    { phase: 2 as const, day: 1, date: '', idPrefixes: [], input: '' },
    { phase: 2 as const, day: 2, date: '', idPrefixes: [], input: '' },
    { phase: 2 as const, day: 3, date: '', idPrefixes: [], input: '' },
    { phase: 2 as const, day: 4, date: '', idPrefixes: [], input: '' },
  ];

  const [editForm, setEditForm] = useState<EditForm>({
    termName: '', dropDeadline: '', maxUnits: '21',
    enlistmentFrom: '', enlistmentUntil: '',
    enrollmentFrom: '', enrollmentUntil: '',
    evaluationFrom: '', evaluationUntil: '',
    encodingFrom: '', encodingUntil: '',
    prerogativeFrom: '', prerogativeUntil: '',
    finalizeWindowStart: '', finalizeWindowEnd: '',
    unfinalizedDeadline: '',
    lateEnrollmentFrom: '', lateEnrollmentUntil: '',
    changeDropFrom: '', changeDropUntil: '',
    enrollmentSlots: emptyEnrollmentSlots(),
    consentWindows: emptyConsentWindows(),
  });

  // NOTE: dropUnfinalizedCourses is triggered manually or via a scheduled action,
  // NOT on component mount — auto-dropping on mount silently wipes student enlistments.

  const handleAdd = () => {
    if (!form.name || !form.academicYear) return;
    addTerm({
      name: form.name, academicYear: form.academicYear, semester: form.semester,
      isActive: false, dropDeadline: form.dropDeadline, maxUnits: parseInt(form.maxUnits) || 21,
      controls: { enlistmentOpen: false, enrollmentOpen: false, ficEvalOpen: false, gradeSubmissionOpen: false, prerogativeOpen: false },
    });
    setForm({ name: '', academicYear: '', semester: '1st', dropDeadline: '', maxUnits: '21' });
    setAddOpen(false);
  };

  const handleSaveEdit = (termId: string) => {
    // Save all slots that have a date set (open days have empty idPrefixes which is valid)
    const slots = editForm.enrollmentSlots
      .filter(s => s.date)
      .map(s => ({ phase: s.phase, day: s.day, date: s.date, idPrefixes: s.idPrefixes }));
    // Build consent windows (only include non-empty entries)
    const cw: Record<string, { from?: string; until?: string }> = {};
    for (const [k, v] of Object.entries(editForm.consentWindows)) {
      if (v.from || v.until) cw[k] = { from: v.from || undefined, until: v.until || undefined };
    }
    updateTermSettings(termId, {
      name: editForm.termName || undefined,
      dropDeadline: editForm.dropDeadline,
      maxUnits: parseInt(editForm.maxUnits) || 21,
      enlistmentFrom: editForm.enlistmentFrom || undefined,
      enlistmentUntil: editForm.enlistmentUntil || undefined,
      enrollmentFrom: editForm.enrollmentFrom || undefined,
      enrollmentUntil: editForm.enrollmentUntil || undefined,
      evaluationFrom: editForm.evaluationFrom || undefined,
      evaluationUntil: editForm.evaluationUntil || undefined,
      encodingFrom: editForm.encodingFrom || undefined,
      encodingUntil: editForm.encodingUntil || undefined,
      prerogativeFrom: editForm.prerogativeFrom || undefined,
      prerogativeUntil: editForm.prerogativeUntil || undefined,
      finalizeWindowStart: editForm.finalizeWindowStart || undefined,
      finalizeWindowEnd: editForm.finalizeWindowEnd || undefined,
      unfinalizedDeadline: editForm.unfinalizedDeadline || undefined,
      lateEnrollmentFrom: editForm.lateEnrollmentFrom || undefined,
      lateEnrollmentUntil: editForm.lateEnrollmentUntil || undefined,
      changeDropFrom: editForm.changeDropFrom || undefined,
      changeDropUntil: editForm.changeDropUntil || undefined,
      enrollmentSchedule: slots.length > 0 ? { slots } : undefined,
      consentWindows: Object.keys(cw).length > 0 ? cw : undefined,
    });
    setEditTerm(null);
  };

  const openEdit = (term: typeof state.terms[0]) => {
    const existingSlots = term.enrollmentSchedule?.slots ?? [];
    const cw = emptyConsentWindows();
    for (const [k, v] of Object.entries(term.consentWindows ?? {})) {
      if (k in cw) cw[k] = { from: v.from ?? '', until: v.until ?? '' };
    }
    // Build the 8-slot structure from existing data, falling back to empty
    const base = emptyEnrollmentSlots();
    existingSlots.forEach(s => {
      const ph = (s.phase ?? 1) as 1 | 2;
      const idx = base.findIndex(b => b.phase === ph && b.day === s.day);
      if (idx !== -1) base[idx] = { ...base[idx], date: s.date, idPrefixes: s.idPrefixes };
    });
    setEditForm({
      termName: term.name,
      dropDeadline: term.dropDeadline ?? '',
      maxUnits: String(term.maxUnits ?? 21),
      enlistmentFrom: term.enlistmentFrom ?? '',
      enlistmentUntil: term.enlistmentUntil ?? '',
      enrollmentFrom: term.enrollmentFrom ?? '',
      enrollmentUntil: term.enrollmentUntil ?? '',
      evaluationFrom: term.evaluationFrom ?? '',
      evaluationUntil: term.evaluationUntil ?? '',
      encodingFrom: term.encodingFrom ?? '',
      encodingUntil: term.encodingUntil ?? '',
      prerogativeFrom: term.prerogativeFrom ?? '',
      prerogativeUntil: term.prerogativeUntil ?? '',
      finalizeWindowStart: term.finalizeWindowStart ?? '',
      finalizeWindowEnd: term.finalizeWindowEnd ?? '',
      unfinalizedDeadline: term.unfinalizedDeadline ?? '',
      lateEnrollmentFrom: term.lateEnrollmentFrom ?? '',
      lateEnrollmentUntil: term.lateEnrollmentUntil ?? '',
      changeDropFrom: term.changeDropFrom ?? '',
      changeDropUntil: term.changeDropUntil ?? '',
      enrollmentSlots: base,
      consentWindows: cw,
    });
    setEditTerm(term.id);
  };

  const setEF = (key: keyof EditForm, val: string) => setEditForm(f => ({ ...f, [key]: val }));

  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

  const WINDOWS = [
    { key: 'enlistment', label: 'Enlistment', fromKey: 'enlistmentFrom' as const, untilKey: 'enlistmentUntil' as const, termFrom: (t: typeof state.terms[0]) => t.enlistmentFrom, termUntil: (t: typeof state.terms[0]) => t.enlistmentUntil },
    { key: 'enrollment', label: 'Enrollment', fromKey: 'enrollmentFrom' as const, untilKey: 'enrollmentUntil' as const, termFrom: (t: typeof state.terms[0]) => t.enrollmentFrom, termUntil: (t: typeof state.terms[0]) => t.enrollmentUntil },
    { key: 'evaluation', label: 'SET Evaluation', fromKey: 'evaluationFrom' as const, untilKey: 'evaluationUntil' as const, termFrom: (t: typeof state.terms[0]) => t.evaluationFrom, termUntil: (t: typeof state.terms[0]) => t.evaluationUntil },
    { key: 'gradeSubmission', label: 'Grade Submission', fromKey: 'encodingFrom' as const, untilKey: 'encodingUntil' as const, termFrom: (t: typeof state.terms[0]) => t.encodingFrom, termUntil: (t: typeof state.terms[0]) => t.encodingUntil },
    { key: 'prerogative', label: 'Prerogatives', fromKey: 'prerogativeFrom' as const, untilKey: 'prerogativeUntil' as const, termFrom: (t: typeof state.terms[0]) => t.prerogativeFrom, termUntil: (t: typeof state.terms[0]) => t.prerogativeUntil },
  ];

  return (
    <PortalLayout role="admin" userName={state.currentUser?.name ?? ''}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Term Control</h1>
            <p className="text-gray-600 mt-1">Manage academic terms and module access windows</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white gap-2"><Plus className="w-4 h-4" /> Add Term</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Add New Term</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>Term Name</Label><Input placeholder="e.g. 1st Semester 2025-2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><Label>Academic Year</Label><Input placeholder="e.g. 2025-2026" value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} /></div>
                <div>
                  <Label>Semester</Label>
                  <Select value={form.semester} onValueChange={v => setForm(f => ({ ...f, semester: v as '1st' | '2nd' | 'Mid-Term' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st">1st Semester</SelectItem>
                      <SelectItem value="2nd">2nd Semester</SelectItem>
                      <SelectItem value="Mid-Term">Mid-Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Drop Deadline</Label><Input type="date" value={form.dropDeadline} onChange={e => setForm(f => ({ ...f, dropDeadline: e.target.value }))} /></div>
                <div><Label>Max Units per Student (excl. PE/NSTP)</Label><Input type="number" min={1} max={30} value={form.maxUnits} onChange={e => setForm(f => ({ ...f, maxUnits: e.target.value }))} /></div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button className="flex-1 bg-primary text-white" onClick={handleAdd}>Add Term</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {state.terms.map(term => (
            <div key={term.id} className={`rounded-md overflow-hidden border-2 ${term.isActive ? 'border-green-500' : 'border-border'}`}>
              {/* ── Term Header ── */}
              <div className={`px-4 py-3 ${term.isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${term.isActive ? 'text-primary-foreground' : 'text-foreground'}`}>{term.name}</span>
                    {term.isActive
                      ? <Badge className="bg-green-100 text-green-800 border-green-200">● Active</Badge>
                      : <Badge variant="outline" className="text-gray-500">Inactive</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(term)}>
                      <Pencil className="w-3 h-3" /> Edit Settings
                    </Button>
                    {!term.isActive && (
                      <Button size="sm" variant="outline" className="border-green-500 text-green-700 hover:bg-green-50 gap-1" onClick={() => setActiveTerm(term.id)}>
                        <Check className="w-3 h-3" /> Set Active
                      </Button>
                    )}
                    {!term.isActive && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"><Trash2 className="w-3 h-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{term.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently remove the term. Records linked to this term cannot be recovered.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteTerm(term.id)}>Delete Term</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
                <div className={`flex gap-4 mt-1 text-sm flex-wrap ${term.isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  <span>A.Y. {term.academicYear}</span>
                  <span>Drop Deadline: {term.dropDeadline ? new Date(term.dropDeadline).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not set'}</span>
                  <span>Max Units: {term.maxUnits ?? '—'}</span>
                  {term.unfinalizedDeadline && <span className="text-orange-400 font-medium">Auto-drop: {fmt(term.unfinalizedDeadline)}</span>}
                </div>
              </div>

              {/* ── Window Status Grid ── */}
              <div className="px-4 py-3 bg-background border-b border-border">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {WINDOWS.map(w => {
                    const from = w.termFrom(term);
                    const until = w.termUntil(term);
                    const st = windowStatus(from, until);
                    return (
                      <div key={w.key} className={`rounded-md border px-3 py-2 text-xs ${
                        st === 'open' ? 'bg-green-50 border-green-200' :
                        st === 'upcoming' ? 'bg-blue-50 border-blue-200' :
                        st === 'ended' ? 'bg-gray-50 border-gray-200' :
                        'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {st === 'open' ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-gray-400" />}
                          <span className="font-semibold">{w.label}</span>
                        </div>
                        {from && <p className="text-gray-500">From: {fmt(from)}</p>}
                        {until && <p className="text-gray-500">Until: {fmt(until)}</p>}
                        {!from && !until && <p className="text-red-500 italic">No window set</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Edit Form ── */}
              {editTerm === term.id && (
                <div className="p-5 bg-blue-50 border-t border-blue-200 space-y-5">
                  <p className="font-semibold text-blue-900 text-sm flex items-center gap-2"><Pencil className="w-3.5 h-3.5" /> Edit Term Settings</p>

                  {/* Rename */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Term Name (Rename)</Label>
                      <Input value={editForm.termName} onChange={e => setEF('termName', e.target.value)} className="h-8 text-sm" placeholder="Term name" />
                    </div>
                    <div>
                      <Label className="text-xs">Max Regular Units</Label>
                      <Input type="number" min={1} max={30} value={editForm.maxUnits} onChange={e => setEF('maxUnits', e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Drop Deadline</Label>
                    <Input type="date" value={editForm.dropDeadline} onChange={e => setEF('dropDeadline', e.target.value)} className="h-8 text-sm w-48" />
                  </div>

                  {/* Module Windows */}
                  <div className="border-t border-blue-200 pt-4 space-y-4">
                    <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Module Date Windows</p>
                    <p className="text-xs text-blue-600">Modules automatically open/close based on these date windows. Leave blank to keep module closed.</p>

                    <DateWindowRow label="Enlistment" from={editForm.enlistmentFrom} until={editForm.enlistmentUntil}
                      onFrom={v => setEF('enlistmentFrom', v)} onUntil={v => setEF('enlistmentUntil', v)} />
                    <DateWindowRow label="Enrollment" from={editForm.enrollmentFrom} until={editForm.enrollmentUntil}
                      onFrom={v => setEF('enrollmentFrom', v)} onUntil={v => setEF('enrollmentUntil', v)} />
                    <DateWindowRow label="SET Evaluation" from={editForm.evaluationFrom} until={editForm.evaluationUntil}
                      onFrom={v => setEF('evaluationFrom', v)} onUntil={v => setEF('evaluationUntil', v)} />
                    <DateWindowRow label="Grade Submission" from={editForm.encodingFrom} until={editForm.encodingUntil}
                      onFrom={v => setEF('encodingFrom', v)} onUntil={v => setEF('encodingUntil', v)} hint="When FIC can encode and submit grades." />
                    <DateWindowRow label="Prerogatives" from={editForm.prerogativeFrom} until={editForm.prerogativeUntil}
                      onFrom={v => setEF('prerogativeFrom', v)} onUntil={v => setEF('prerogativeUntil', v)} />
                  </div>

                  {/* Finalize Window */}
                  <div className="border-t border-blue-200 pt-4 space-y-3">
                    <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Finalize Enlistment Window</p>
                    <DateWindowRow label="Finalize Button" from={editForm.finalizeWindowStart} until={editForm.finalizeWindowEnd}
                      onFrom={v => setEF('finalizeWindowStart', v)} onUntil={v => setEF('finalizeWindowEnd', v)} hint="Leave blank = always visible." />
                  </div>

                  {/* Auto-drop deadline */}
                  <div className="border-t border-blue-200 pt-4">
                    <Label className="text-xs font-bold text-orange-800">Auto-Drop Deadline (Unfinalized Students)</Label>
                    <Input type="datetime-local" value={editForm.unfinalizedDeadline} onChange={e => setEF('unfinalizedDeadline', e.target.value)} className="h-8 text-sm mt-1 w-64" />
                    <p className="text-xs text-orange-600 mt-0.5">After this date, enrolled-but-not-finalized students' courses are auto-dropped.</p>
                  </div>

                  {/* Late Enrollment Window */}
                  <div className="border-t border-blue-200 pt-4 space-y-3">
                    <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Late Enrollment Request Window</p>
                    <DateWindowRow label="Request window" from={editForm.lateEnrollmentFrom} until={editForm.lateEnrollmentUntil}
                      onFrom={v => setEF('lateEnrollmentFrom', v)} onUntil={v => setEF('lateEnrollmentUntil', v)}
                      hint="Students with 0 units can submit appeal letters only within this window." />
                  </div>

                  {/* Change & Drop Window */}
                  <div className="border-t border-blue-200 pt-4 space-y-3">
                    <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Change &amp; Drop After Finalization Window</p>
                    <DateWindowRow label="Appeal window" from={editForm.changeDropFrom} until={editForm.changeDropUntil}
                      onFrom={v => setEF('changeDropFrom', v)} onUntil={v => setEF('changeDropUntil', v)}
                      hint="Finalized students can submit Change/Drop appeals within this window." />
                  </div>

                  {/* Consent Windows */}
                  <div className="border-t border-blue-200 pt-4 space-y-3">
                    <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Consent Accessibility Windows</p>
                    <p className="text-xs text-blue-600">Set when each consent type is accessible to students. Leave blank = always open.</p>
                    {CONSENT_KEYS.map(key => (
                      <DateWindowRow
                        key={key} label={key}
                        from={editForm.consentWindows[key]?.from ?? ''}
                        until={editForm.consentWindows[key]?.until ?? ''}
                        onFrom={v => setEditForm(f => ({ ...f, consentWindows: { ...f.consentWindows, [key]: { ...f.consentWindows[key], from: v } } }))}
                        onUntil={v => setEditForm(f => ({ ...f, consentWindows: { ...f.consentWindows, [key]: { ...f.consentWindows[key], until: v } } }))}
                      />
                    ))}
                  </div>

                  {/* Enrollment Schedule */}
                  <div className="border-t border-blue-200 pt-4 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Enrollment Schedule (by Student ID)</p>
                      <p className="text-xs text-blue-600">Set dates for each day. Days 1–3: assign specific student ID prefixes. Day 4: open to all students.</p>
                    </div>
                    {([1, 2] as const).map(phase => {
                      const phaseSlots = editForm.enrollmentSlots.filter(s => s.phase === phase);
                      const phaseLabel = phase === 1 ? 'Phase 1 — Pre-registration' : 'Phase 2 — General Registration';
                      const phaseBg = phase === 1 ? 'bg-indigo-50 border-indigo-200' : 'bg-teal-50 border-teal-200';
                      const phaseText = phase === 1 ? 'text-indigo-800' : 'text-teal-800';
                      const phaseBadge = phase === 1 ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-teal-100 text-teal-700 border-teal-300';
                      return (
                        <div key={phase} className={`rounded-md border p-3 space-y-2 ${phaseBg}`}>
                          <p className={`text-xs font-bold ${phaseText}`}>{phaseLabel}</p>
                          {phaseSlots.map(slot => {
                            const globalIdx = editForm.enrollmentSlots.findIndex(s => s.phase === phase && s.day === slot.day);
                            const isOpenDay = slot.day === 4;
                            return (
                              <div key={slot.day} className="rounded border border-white bg-white/70 p-2 space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-bold w-12 shrink-0 ${phaseText}`}>Day {slot.day}</span>
                                  <Input type="date" value={slot.date}
                                    onChange={e => setEditForm(f => { const s = [...f.enrollmentSlots]; s[globalIdx] = { ...s[globalIdx], date: e.target.value }; return { ...f, enrollmentSlots: s }; })}
                                    className="h-7 text-xs flex-1" />
                                  {isOpenDay && <span className={`text-xs font-medium px-2 py-0.5 rounded border ${phaseBadge}`}>Open to all</span>}
                                </div>
                                {!isOpenDay && (
                                  <>
                                    <div className="flex flex-wrap gap-1 pl-14">
                                      {slot.idPrefixes.map((p, pi) => (
                                        <span key={pi} className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 border border-blue-300 rounded-full px-2 py-0.5">
                                          {p}
                                          <button onClick={() => setEditForm(f => {
                                            const s = [...f.enrollmentSlots];
                                            s[globalIdx] = { ...s[globalIdx], idPrefixes: s[globalIdx].idPrefixes.filter((_, pj) => pj !== pi) };
                                            return { ...f, enrollmentSlots: s };
                                          })}><X className="w-3 h-3" /></button>
                                        </span>
                                      ))}
                                      {slot.idPrefixes.length === 0 && <span className="text-xs text-muted-foreground italic">No ID prefixes added yet</span>}
                                    </div>
                                    <div className="flex gap-1 pl-14">
                                      <Input type="text" placeholder="e.g. 2021" value={slot.input}
                                        className="h-7 text-xs flex-1"
                                        onChange={e => setEditForm(f => { const s = [...f.enrollmentSlots]; s[globalIdx] = { ...s[globalIdx], input: e.target.value }; return { ...f, enrollmentSlots: s }; })}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter' || e.key === ',') {
                                            e.preventDefault();
                                            const val = slot.input.trim();
                                            if (val && !slot.idPrefixes.includes(val))
                                              setEditForm(f => { const s = [...f.enrollmentSlots]; s[globalIdx] = { ...s[globalIdx], idPrefixes: [...s[globalIdx].idPrefixes, val], input: '' }; return { ...f, enrollmentSlots: s }; });
                                          }
                                        }} />
                                      <Button size="sm" className="h-7 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={() => {
                                          const val = slot.input.trim();
                                          if (val && !slot.idPrefixes.includes(val))
                                            setEditForm(f => { const s = [...f.enrollmentSlots]; s[globalIdx] = { ...s[globalIdx], idPrefixes: [...s[globalIdx].idPrefixes, val], input: '' }; return { ...f, enrollmentSlots: s }; });
                                        }}>
                                        <Plus className="w-3 h-3" /> Add
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => setEditTerm(null)}>Cancel</Button>
                    <Button size="sm" className="bg-primary text-white" onClick={() => handleSaveEdit(term.id)}>Save Changes</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </PortalLayout>
  );
}
