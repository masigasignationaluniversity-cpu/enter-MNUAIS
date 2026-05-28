import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Pencil, Check, Trash2, X, ChevronDown, ChevronRight,
  ShoppingCart, GraduationCap, ClipboardCheck, BookOpen, FileText,
  Clock, CalendarDays, Users, AlertTriangle, Settings,
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// OCS consent: all 4 OCS types share one window
const ADMIN_CONSENT_KEYS = ['COI / Department Consent', 'OCS Consent'] as const;

type WindowStatus = 'open' | 'upcoming' | 'ended' | 'not-set';
function windowStatus(from?: string, until?: string): WindowStatus {
  if (!from && !until) return 'not-set';
  const now = new Date();
  if (from && now < new Date(from)) return 'upcoming';
  if (until && now > new Date(until)) return 'ended';
  return 'open';
}

const STATUS_STYLE: Record<WindowStatus, string> = {
  open:     'bg-green-50 border-green-300 text-green-800',
  upcoming: 'bg-blue-50 border-blue-300 text-blue-800',
  ended:    'bg-gray-50 border-gray-300 text-gray-600',
  'not-set':'bg-red-50 border-red-200 text-red-700',
};
const STATUS_DOT: Record<WindowStatus, string> = {
  open:     'bg-green-500',
  upcoming: 'bg-blue-400',
  ended:    'bg-gray-400',
  'not-set':'bg-red-400',
};

function WindowPill({ label, status }: { label: string; status: WindowStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
      {label}
    </span>
  );
}

function DatePair({
  label, from, until, onFrom, onUntil, hint, icon: Icon,
}: {
  label: string; from: string; until: string;
  onFrom: (v: string) => void; onUntil: (v: string) => void;
  hint?: string; icon?: React.ElementType;
}) {
  const status = windowStatus(from || undefined, until || undefined);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full border ${STATUS_STYLE[status]}`}>
          {status === 'open' ? 'Open' : status === 'upcoming' ? 'Upcoming' : status === 'ended' ? 'Ended' : 'Not set'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Opens</p>
          <Input type="datetime-local" value={from} onChange={e => onFrom(e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Closes</p>
          <Input type="datetime-local" value={until} onChange={e => onUntil(e.target.value)} className="h-8 text-xs" />
        </div>
      </div>
      {hint && <p className="text-xs text-muted-foreground italic">{hint}</p>}
    </div>
  );
}

function SectionBlock({ title, icon: Icon, color, children }: { title: string; icon: React.ElementType; color: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`rounded-lg border ${color} overflow-hidden`}>
      <button
        type="button"
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left font-semibold text-sm"
        onClick={() => setOpen(o => !o)}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4 bg-white/60">
          {children}
        </div>
      )}
    </div>
  );
}

type EditForm = {
  termName: string;
  maxUnits: string;
  // Add to Cart (enlistment) window
  addToCartFrom: string; addToCartUntil: string;
  // Finalization
  finalizeWindowStart: string; finalizeWindowEnd: string;
  unfinalizedDeadline: string;
  // Prerogatives
  prerogativeFrom: string; prerogativeUntil: string;
  // Late enrollment appeal
  lateEnrollmentFrom: string; lateEnrollmentUntil: string;
  // Change/Drop appeal
  changeDropFrom: string; changeDropUntil: string;
  // Request deadline (OCS lock)
  requestDeadline: string;
  // SET Evaluation
  evaluationFrom: string; evaluationUntil: string;
  // Grade Submission
  encodingFrom: string; encodingUntil: string;
  // Consent windows: COI + single OCS
  consentWindows: Record<string, { from: string; until: string }>;
  // Enrollment schedule
  enrollmentSlots: Array<{ phase: 1 | 2; day: number; date: string; idPrefixes: string[]; input: string }>;
};

const emptySlots = (): EditForm['enrollmentSlots'] => [
  { phase: 1, day: 1, date: '', idPrefixes: [], input: '' },
  { phase: 1, day: 2, date: '', idPrefixes: [], input: '' },
  { phase: 1, day: 3, date: '', idPrefixes: [], input: '' },
  { phase: 1, day: 4, date: '', idPrefixes: [], input: '' },
  { phase: 2, day: 1, date: '', idPrefixes: [], input: '' },
  { phase: 2, day: 2, date: '', idPrefixes: [], input: '' },
  { phase: 2, day: 3, date: '', idPrefixes: [], input: '' },
  { phase: 2, day: 4, date: '', idPrefixes: [], input: '' },
];
const emptyConsentWindows = () =>
  Object.fromEntries(ADMIN_CONSENT_KEYS.map(k => [k, { from: '', until: '' }]));

const emptyEditForm = (): EditForm => ({
  termName: '', maxUnits: '21',
  addToCartFrom: '', addToCartUntil: '',
  finalizeWindowStart: '', finalizeWindowEnd: '',
  unfinalizedDeadline: '',
  prerogativeFrom: '', prerogativeUntil: '',
  lateEnrollmentFrom: '', lateEnrollmentUntil: '',
  changeDropFrom: '', changeDropUntil: '',
  requestDeadline: '',
  evaluationFrom: '', evaluationUntil: '',
  encodingFrom: '', encodingUntil: '',
  consentWindows: emptyConsentWindows(),
  enrollmentSlots: emptySlots(),
});

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

export default function AdminTermControl() {
  const { state, updateTermSettings, setActiveTerm, addTerm, deleteTerm } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editTerm, setEditTerm] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', academicYear: '', semester: '1st' as '1st' | '2nd' | 'Mid-Term', maxUnits: '21' });
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm());

  const handleAdd = () => {
    if (!form.name || !form.academicYear) return;
    addTerm({
      name: form.name, academicYear: form.academicYear, semester: form.semester,
      isActive: false, maxUnits: parseInt(form.maxUnits) || 21,
      controls: { enlistmentOpen: false, enrollmentOpen: false, ficEvalOpen: false, gradeSubmissionOpen: false, prerogativeOpen: false },
    });
    setForm({ name: '', academicYear: '', semester: '1st', maxUnits: '21' });
    setAddOpen(false);
  };

  const handleSaveEdit = (termId: string) => {
    const slots = editForm.enrollmentSlots
      .filter(s => s.date)
      .map(s => ({ phase: s.phase, day: s.day, date: s.date, idPrefixes: s.idPrefixes }));
    const cw: Record<string, { from?: string; until?: string }> = {};
    for (const [k, v] of Object.entries(editForm.consentWindows)) {
      if (v.from || v.until) cw[k] = { from: v.from || undefined, until: v.until || undefined };
    }
    updateTermSettings(termId, {
      name: editForm.termName || undefined,
      maxUnits: parseInt(editForm.maxUnits) || 21,
      // Add to Cart = enlistment/enrollment fields
      enlistmentFrom: editForm.addToCartFrom || undefined,
      enlistmentUntil: editForm.addToCartUntil || undefined,
      enrollmentFrom: editForm.addToCartFrom || undefined,
      enrollmentUntil: editForm.addToCartUntil || undefined,
      // Finalization
      finalizeWindowStart: editForm.finalizeWindowStart || undefined,
      finalizeWindowEnd: editForm.finalizeWindowEnd || undefined,
      unfinalizedDeadline: editForm.unfinalizedDeadline || undefined,
      // Prerogatives
      prerogativeFrom: editForm.prerogativeFrom || undefined,
      prerogativeUntil: editForm.prerogativeUntil || undefined,
      // Late enrollment
      lateEnrollmentFrom: editForm.lateEnrollmentFrom || undefined,
      lateEnrollmentUntil: editForm.lateEnrollmentUntil || undefined,
      // Change/Drop
      changeDropFrom: editForm.changeDropFrom || undefined,
      changeDropUntil: editForm.changeDropUntil || undefined,
      // Request deadline
      requestDeadline: editForm.requestDeadline || undefined,
      // Faculty
      evaluationFrom: editForm.evaluationFrom || undefined,
      evaluationUntil: editForm.evaluationUntil || undefined,
      encodingFrom: editForm.encodingFrom || undefined,
      encodingUntil: editForm.encodingUntil || undefined,
      // Clear old drop deadline
      dropDeadline: undefined,
      enrollmentSchedule: slots.length > 0 ? { slots } : undefined,
      consentWindows: Object.keys(cw).length > 0 ? cw : undefined,
    });
    setEditTerm(null);
  };

  const openEdit = (term: typeof state.terms[0]) => {
    // Load existing slots
    const existingSlots = term.enrollmentSchedule?.slots ?? [];
    const base = emptySlots();
    existingSlots.forEach(s => {
      const ph = (s.phase ?? 1) as 1 | 2;
      const idx = base.findIndex(b => b.phase === ph && b.day === s.day);
      if (idx !== -1) base[idx] = { ...base[idx], date: s.date, idPrefixes: s.idPrefixes };
    });
    // Load consent windows (both old individual and new unified)
    const cw = emptyConsentWindows();
    for (const [k, v] of Object.entries(term.consentWindows ?? {})) {
      if (k in cw) {
        cw[k] = { from: v.from ?? '', until: v.until ?? '' };
      } else if (k !== 'COI / Department Consent') {
        // Old individual OCS type → migrate to unified 'OCS Consent' key
        if (!cw['OCS Consent']?.from && v.from) {
          cw['OCS Consent'] = { from: v.from ?? '', until: v.until ?? '' };
        }
      }
    }
    // Add to Cart uses enlistmentFrom/Until (prefer these over enrollmentFrom/Until)
    const addToCartFrom = term.enlistmentFrom ?? term.enrollmentFrom ?? '';
    const addToCartUntil = term.enlistmentUntil ?? term.enrollmentUntil ?? '';

    setEditForm({
      termName: term.name,
      maxUnits: String(term.maxUnits ?? 21),
      addToCartFrom, addToCartUntil,
      finalizeWindowStart: term.finalizeWindowStart ?? '',
      finalizeWindowEnd: term.finalizeWindowEnd ?? '',
      unfinalizedDeadline: term.unfinalizedDeadline ?? '',
      prerogativeFrom: term.prerogativeFrom ?? '',
      prerogativeUntil: term.prerogativeUntil ?? '',
      lateEnrollmentFrom: term.lateEnrollmentFrom ?? '',
      lateEnrollmentUntil: term.lateEnrollmentUntil ?? '',
      changeDropFrom: term.changeDropFrom ?? '',
      changeDropUntil: term.changeDropUntil ?? '',
      requestDeadline: term.requestDeadline ?? '',
      evaluationFrom: term.evaluationFrom ?? '',
      evaluationUntil: term.evaluationUntil ?? '',
      encodingFrom: term.encodingFrom ?? '',
      encodingUntil: term.encodingUntil ?? '',
      consentWindows: cw,
      enrollmentSlots: base,
    });
    setEditTerm(term.id);
  };

  const setEF = (key: keyof EditForm, val: string) =>
    setEditForm(f => ({ ...f, [key]: val }));

  // Summary pills for the term card
  const termPills = (term: typeof state.terms[0]) => {
    const addToCartFrom = term.enlistmentFrom ?? term.enrollmentFrom;
    const addToCartUntil = term.enlistmentUntil ?? term.enrollmentUntil;
    return [
      { label: 'Add to Cart', status: windowStatus(addToCartFrom, addToCartUntil) },
      { label: 'Prerogatives', status: windowStatus(term.prerogativeFrom, term.prerogativeUntil) },
      { label: 'SET Eval', status: windowStatus(term.evaluationFrom, term.evaluationUntil) },
      { label: 'Grade Entry', status: windowStatus(term.encodingFrom, term.encodingUntil) },
      { label: 'OCS Consent', status: windowStatus(term.consentWindows?.['OCS Consent']?.from, term.consentWindows?.['OCS Consent']?.until) },
    ];
  };

  return (
    <PortalLayout role="admin" userName={state.currentUser?.name ?? ''}>
      <div className="p-6 space-y-5">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Term Control</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage academic terms and activity windows</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                <Plus className="w-4 h-4" /> New Term
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Add New Term</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><Label>Term Name</Label><Input placeholder="e.g. 1st Sem 2025-2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
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
                <div><Label>Max Units per Student (excl. PE/NSTP)</Label><Input type="number" min={1} max={30} value={form.maxUnits} onChange={e => setForm(f => ({ ...f, maxUnits: e.target.value }))} /></div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleAdd}>Create Term</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Term Cards */}
        <div className="space-y-4">
          {state.terms.map(term => (
            <div key={term.id} className={`rounded-xl overflow-hidden border-2 shadow-sm ${term.isActive ? 'border-primary' : 'border-border'}`}>

              {/* Card Header */}
              <div className={`px-5 py-4 ${term.isActive ? 'bg-primary text-primary-foreground' : 'bg-muted/50'}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`text-lg font-bold ${term.isActive ? 'text-primary-foreground' : 'text-foreground'}`}>{term.name}</span>
                      {term.isActive
                        ? <Badge className="bg-green-500 text-white border-0 text-xs px-2">Active</Badge>
                        : <Badge variant="outline" className="text-muted-foreground text-xs">Inactive</Badge>}
                    </div>
                    <p className={`text-sm mt-0.5 ${term.isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      A.Y. {term.academicYear} · Max {term.maxUnits ?? 21} units
                      {term.unfinalizedDeadline && <span className="ml-2 text-orange-300 font-medium">· Auto-drop: {fmt(term.unfinalizedDeadline)}</span>}
                      {term.requestDeadline && <span className="ml-2 text-red-300 font-medium">· Request deadline: {fmt(term.requestDeadline)}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant={term.isActive ? 'secondary' : 'outline'} className="gap-1.5 text-xs" onClick={() => openEdit(term)}>
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                    {!term.isActive && (
                      <Button size="sm" variant="outline" className="border-green-500 text-green-700 hover:bg-green-50 gap-1.5 text-xs" onClick={() => setActiveTerm(term.id)}>
                        <Check className="w-3 h-3" /> Set Active
                      </Button>
                    )}
                    {!term.isActive && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 px-2"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{term.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently remove this term. Records linked to it cannot be recovered.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteTerm(term.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>

              {/* Window Status Pills */}
              <div className="px-5 py-3 bg-background border-b border-border flex flex-wrap gap-2">
                {termPills(term).map(pill => (
                  <WindowPill key={pill.label} label={pill.label} status={pill.status} />
                ))}
              </div>

              {/* ── Edit Form ── */}
              {editTerm === term.id && (
                <div className="p-5 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-foreground text-sm flex items-center gap-2">
                      <Settings className="w-4 h-4 text-primary" /> Editing: {term.name}
                    </p>
                    <Button size="sm" variant="ghost" onClick={() => setEditTerm(null)}><X className="w-4 h-4" /></Button>
                  </div>

                  {/* Section A: General */}
                  <SectionBlock title="General Settings" icon={Settings} color="border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Term Name</Label>
                        <Input value={editForm.termName} onChange={e => setEF('termName', e.target.value)} className="h-8 text-sm mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Max Regular Units (excl. PE/NSTP)</Label>
                        <Input type="number" min={1} max={30} value={editForm.maxUnits} onChange={e => setEF('maxUnits', e.target.value)} className="h-8 text-sm mt-1" />
                      </div>
                    </div>
                  </SectionBlock>

                  {/* Section B: Student Enlistment */}
                  <SectionBlock title="Student Enlistment Windows" icon={ShoppingCart} color="border-blue-200 bg-blue-50/50">
                    <DatePair label="Add to Cart (Students can browse and enlist sections)"
                      from={editForm.addToCartFrom} until={editForm.addToCartUntil}
                      onFrom={v => setEF('addToCartFrom', v)} onUntil={v => setEF('addToCartUntil', v)}
                      icon={ShoppingCart}
                    />
                    <DatePair label="Finalize Enlistment (Students can submit / lock their section list)"
                      from={editForm.finalizeWindowStart} until={editForm.finalizeWindowEnd}
                      onFrom={v => setEF('finalizeWindowStart', v)} onUntil={v => setEF('finalizeWindowEnd', v)}
                      icon={ClipboardCheck}
                      hint="Leave blank = finalize button always visible."
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                        <span className="text-xs font-semibold text-foreground">Auto-drop Deadline (Unfinalized Students)</span>
                      </div>
                      <Input type="datetime-local" value={editForm.unfinalizedDeadline} onChange={e => setEF('unfinalizedDeadline', e.target.value)} className="h-8 text-xs w-64" />
                      <p className="text-xs text-muted-foreground italic">After this date, enlisted-but-not-finalized students are auto-dropped.</p>
                    </div>
                  </SectionBlock>

                  {/* Section C: Student Requests */}
                  <SectionBlock title="Student Request Windows" icon={FileText} color="border-purple-200 bg-purple-50/50">
                    <DatePair label="Prerogative Requests"
                      from={editForm.prerogativeFrom} until={editForm.prerogativeUntil}
                      onFrom={v => setEF('prerogativeFrom', v)} onUntil={v => setEF('prerogativeUntil', v)}
                      icon={FileText}
                    />
                    <DatePair label="Late Enrollment Appeals"
                      from={editForm.lateEnrollmentFrom} until={editForm.lateEnrollmentUntil}
                      onFrom={v => setEF('lateEnrollmentFrom', v)} onUntil={v => setEF('lateEnrollmentUntil', v)}
                      icon={Clock}
                      hint="Students with 0 units can submit late enrollment appeal letters within this window."
                    />
                    <DatePair label="Change & Drop Appeals (after finalization)"
                      from={editForm.changeDropFrom} until={editForm.changeDropUntil}
                      onFrom={v => setEF('changeDropFrom', v)} onUntil={v => setEF('changeDropUntil', v)}
                      icon={FileText}
                      hint="Finalized students can submit Change/Drop appeals within this window."
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        <span className="text-xs font-semibold text-foreground">OCS Approval Deadline</span>
                      </div>
                      <Input type="datetime-local" value={editForm.requestDeadline} onChange={e => setEF('requestDeadline', e.target.value)} className="h-8 text-xs w-64" />
                      <p className="text-xs text-muted-foreground italic">After this date, OCS cannot approve or deny any student requests.</p>
                    </div>
                  </SectionBlock>

                  {/* Section D: Faculty & Evaluation */}
                  <SectionBlock title="Faculty & Evaluation Windows" icon={GraduationCap} color="border-green-200 bg-green-50/50">
                    <DatePair label="SET Evaluation (Student evaluates Faculty)"
                      from={editForm.evaluationFrom} until={editForm.evaluationUntil}
                      onFrom={v => setEF('evaluationFrom', v)} onUntil={v => setEF('evaluationUntil', v)}
                      icon={GraduationCap}
                    />
                    <DatePair label="Grade Submission (Faculty encodes and submits grades)"
                      from={editForm.encodingFrom} until={editForm.encodingUntil}
                      onFrom={v => setEF('encodingFrom', v)} onUntil={v => setEF('encodingUntil', v)}
                      icon={BookOpen}
                    />
                  </SectionBlock>

                  {/* Section E: Consent Windows */}
                  <SectionBlock title="OCS Consent Windows" icon={ClipboardCheck} color="border-amber-200 bg-amber-50/50">
                    <p className="text-xs text-muted-foreground">Leave blank = always open for that consent type.</p>
                    {ADMIN_CONSENT_KEYS.map(key => (
                      <DatePair
                        key={key}
                        label={key === 'OCS Consent'
                          ? 'OCS Consent (Waiver · Substitution · Satisfaction · OCS Controlled Class)'
                          : key}
                        from={editForm.consentWindows[key]?.from ?? ''}
                        until={editForm.consentWindows[key]?.until ?? ''}
                        onFrom={v => setEditForm(f => ({ ...f, consentWindows: { ...f.consentWindows, [key]: { ...f.consentWindows[key], from: v } } }))}
                        onUntil={v => setEditForm(f => ({ ...f, consentWindows: { ...f.consentWindows, [key]: { ...f.consentWindows[key], until: v } } }))}
                      />
                    ))}
                  </SectionBlock>

                  {/* Section F: Enrollment Schedule */}
                  <SectionBlock title="Enrollment Schedule by Student ID" icon={Users} color="border-indigo-200 bg-indigo-50/50">
                    <p className="text-xs text-muted-foreground">Set dates per phase and day. Days 1–3: assign student ID prefixes. Day 4: open to all.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {([1, 2] as const).map(phase => {
                        const phaseSlots = editForm.enrollmentSlots.filter(s => s.phase === phase);
                        const phaseLabel = phase === 1 ? 'Phase 1 — Pre-registration' : 'Phase 2 — Open Registration';
                        const phaseBorder = phase === 1 ? 'border-indigo-300 bg-indigo-50' : 'border-teal-300 bg-teal-50';
                        const phaseText = phase === 1 ? 'text-indigo-800' : 'text-teal-800';
                        return (
                          <div key={phase} className={`rounded-lg border p-3 space-y-2 ${phaseBorder}`}>
                            <p className={`text-xs font-bold ${phaseText}`}>{phaseLabel}</p>
                            {phaseSlots.map(slot => {
                              const gi = editForm.enrollmentSlots.findIndex(s => s.phase === phase && s.day === slot.day);
                              const isOpen = slot.day === 4;
                              return (
                                <div key={slot.day} className="bg-white rounded border border-gray-200 p-2 space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold w-10 shrink-0 ${phaseText}`}>Day {slot.day}</span>
                                    <Input type="date" value={slot.date}
                                      onChange={e => setEditForm(f => { const s = [...f.enrollmentSlots]; s[gi] = { ...s[gi], date: e.target.value }; return { ...f, enrollmentSlots: s }; })}
                                      className="h-7 text-xs flex-1" />
                                    {isOpen && <span className="text-xs text-muted-foreground">All</span>}
                                  </div>
                                  {!isOpen && (
                                    <>
                                      <div className="flex flex-wrap gap-1 pl-12">
                                        {slot.idPrefixes.map((p, pi) => (
                                          <span key={pi} className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 border border-blue-300 rounded-full px-2 py-0.5">
                                            {p}
                                            <button onClick={() => setEditForm(f => { const s = [...f.enrollmentSlots]; s[gi] = { ...s[gi], idPrefixes: s[gi].idPrefixes.filter((_, j) => j !== pi) }; return { ...f, enrollmentSlots: s }; })}><X className="w-3 h-3" /></button>
                                          </span>
                                        ))}
                                        {slot.idPrefixes.length === 0 && <span className="text-xs text-muted-foreground italic">No prefixes</span>}
                                      </div>
                                      <div className="flex gap-1 pl-12">
                                        <Input type="text" placeholder="e.g. 2021" value={slot.input}
                                          className="h-7 text-xs flex-1"
                                          onChange={e => setEditForm(f => { const s = [...f.enrollmentSlots]; s[gi] = { ...s[gi], input: e.target.value }; return { ...f, enrollmentSlots: s }; })}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter' || e.key === ',') {
                                              e.preventDefault();
                                              const val = slot.input.trim();
                                              if (val && !slot.idPrefixes.includes(val))
                                                setEditForm(f => { const s = [...f.enrollmentSlots]; s[gi] = { ...s[gi], idPrefixes: [...s[gi].idPrefixes, val], input: '' }; return { ...f, enrollmentSlots: s }; });
                                            }
                                          }} />
                                        <Button size="sm" className="h-7 text-xs px-2 bg-primary text-primary-foreground"
                                          onClick={() => {
                                            const val = slot.input.trim();
                                            if (val && !slot.idPrefixes.includes(val))
                                              setEditForm(f => { const s = [...f.enrollmentSlots]; s[gi] = { ...s[gi], idPrefixes: [...s[gi].idPrefixes, val], input: '' }; return { ...f, enrollmentSlots: s }; });
                                          }}>
                                          <Plus className="w-3 h-3" />
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
                  </SectionBlock>

                  {/* Save / Cancel */}
                  <div className="flex gap-2 pt-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setEditTerm(null)}>Cancel</Button>
                    <Button size="sm" className="bg-primary text-primary-foreground px-6" onClick={() => handleSaveEdit(term.id)}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {state.terms.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">
              <CalendarDays className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No terms yet</p>
              <p className="text-sm">Click "New Term" to create your first academic term.</p>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
