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
  ToggleLeft, ToggleRight, Unlock, Star, BookMarked, Save, GripVertical, Layers,
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

const STATUS_BADGE: Record<WindowStatus, string> = {
  open:     'bg-green-100 text-green-800 border-green-300',
  upcoming: 'bg-blue-100 text-blue-800 border-blue-300',
  ended:    'bg-gray-100 text-gray-600 border-gray-300',
  'not-set':'bg-gray-100 text-gray-500 border-gray-300',
};
const STATUS_DOT: Record<WindowStatus, string> = {
  open:     'bg-green-500',
  upcoming: 'bg-blue-400',
  ended:    'bg-gray-400',
  'not-set':'bg-gray-400',
};
const STATUS_LABEL: Record<WindowStatus, string> = {
  open: 'Open', upcoming: 'Upcoming', ended: 'Ended', 'not-set': 'Closed',
};

function StatusBadge({ status }: { status: WindowStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium border rounded-full px-2 py-0.5 ${STATUS_BADGE[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

function WindowRow({
  icon: Icon, label, from, until, color,
}: {
  icon: React.ElementType; label: string; from?: string; until?: string; color: string;
}) {
  const status = windowStatus(from, until);
  const fmt = (iso?: string) => iso
    ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
  return (
    <div className={`rounded-lg border ${STATUS_BADGE[status]} px-3 py-2 flex items-center gap-3`}>
      <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{label}</p>
        {(from || until) ? (
          <p className="text-xs text-muted-foreground truncate">{fmt(from)} → {fmt(until)}</p>
        ) : (
          <p className="text-xs text-muted-foreground">No dates set — automatically closed</p>
        )}
      </div>
      <StatusBadge status={status} />
    </div>
  );
}

function ControlToggle({
  label, icon: Icon, value, onToggle,
}: {
  label: string; icon: React.ElementType; value: boolean; onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
        value
          ? 'bg-green-50 border-green-300 text-green-800 hover:bg-green-100'
          : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
      }`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="hidden sm:inline">{label}</span>
      {value
        ? <ToggleRight className="w-4 h-4 text-green-600 flex-shrink-0" />
        : <ToggleLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
    </button>
  );
}

function DatePair({
  label, from, until, onFrom, onUntil, hint, icon: Icon, hideFrom,
}: {
  label: string; from: string; until: string;
  onFrom: (v: string) => void; onUntil: (v: string) => void;
  hint?: string; icon?: React.ElementType; hideFrom?: boolean;
}) {
  const status = windowStatus(from || undefined, until || undefined);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <StatusBadge status={status} />
      </div>
      <div className={`grid gap-2 ${hideFrom ? 'grid-cols-1 max-w-[50%]' : 'grid-cols-2'}`}>
        {!hideFrom && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Opens</p>
            <Input type="datetime-local" value={from} onChange={e => onFrom(e.target.value)} className="h-8 text-xs" />
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Deadline</p>
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
  finalizeWindowStart: string; finalizeWindowEnd: string;
  unfinalizedDeadline: string;
  prerogativeFrom: string; prerogativeUntil: string;
  lateEnrollmentFrom: string; lateEnrollmentUntil: string;
  changeDropFrom: string; changeDropUntil: string;
  requestDeadline: string;
  evaluationFrom: string; evaluationUntil: string;
  encodingFrom: string; encodingUntil: string;
  specializationFrom: string; specializationUntil: string;
  specializationChangeUntil: string;
  specializationApprovalUntil: string;
  underloadFrom: string; underloadUntil: string;
  graduationFrom: string; graduationUntil: string;
  geElectiveFrom: string; geElectiveUntil: string;
  geElectiveChangeUntil: string;
  geElectiveApprovalUntil: string;
  consentWindows: Record<string, { from: string; until: string }>;
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
  { phase: 3, day: 1, date: '', idPrefixes: [], input: '' },
  { phase: 3, day: 2, date: '', idPrefixes: [], input: '' },
  { phase: 3, day: 3, date: '', idPrefixes: [], input: '' },
];
const emptyConsentWindows = () =>
  Object.fromEntries(ADMIN_CONSENT_KEYS.map(k => [k, { from: '', until: '' }]));

const emptyEditForm = (): EditForm => ({
  termName: '', maxUnits: '21',
  finalizeWindowStart: '', finalizeWindowEnd: '',
  unfinalizedDeadline: '',
  prerogativeFrom: '', prerogativeUntil: '',
  lateEnrollmentFrom: '', lateEnrollmentUntil: '',
  changeDropFrom: '', changeDropUntil: '',
  requestDeadline: '',
  evaluationFrom: '', evaluationUntil: '',
  encodingFrom: '', encodingUntil: '',
  specializationFrom: '', specializationUntil: '',
  specializationChangeUntil: '',
  specializationApprovalUntil: '',
  underloadFrom: '', underloadUntil: '',
  graduationFrom: '', graduationUntil: '',
  geElectiveFrom: '', geElectiveUntil: '',
  geElectiveChangeUntil: '',
  geElectiveApprovalUntil: '',
  consentWindows: emptyConsentWindows(),
  enrollmentSlots: emptySlots(),
});

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

export default function AdminTermControl() {
  const { state, updateTermSettings, updateTermControls, setActiveTerm, addTerm, deleteTerm, reorderTerms } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editTerm, setEditTerm] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', academicYear: '', semester: '1st' as '1st' | '2nd' | 'Mid-Term', maxUnits: '21' });
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm());
  const [headerEdit, setHeaderEdit] = useState<{ termId: string; name: string; academicYear: string } | null>(null);
  // Drag reorder
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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
      enlistmentFrom: undefined,
      enlistmentUntil: undefined,
      enrollmentFrom: undefined,
      enrollmentUntil: undefined,
      finalizeWindowStart: editForm.finalizeWindowStart || undefined,
      finalizeWindowEnd: editForm.finalizeWindowEnd || undefined,
      unfinalizedDeadline: editForm.unfinalizedDeadline || undefined,
      prerogativeFrom: editForm.prerogativeFrom || undefined,
      prerogativeUntil: editForm.prerogativeUntil || undefined,
      lateEnrollmentFrom: editForm.lateEnrollmentFrom || undefined,
      lateEnrollmentUntil: editForm.lateEnrollmentUntil || undefined,
      changeDropFrom: editForm.changeDropFrom || undefined,
      changeDropUntil: editForm.changeDropUntil || undefined,
      requestDeadline: editForm.requestDeadline || undefined,
      evaluationFrom: editForm.evaluationFrom || undefined,
      evaluationUntil: editForm.evaluationUntil || undefined,
      encodingFrom: editForm.encodingFrom || undefined,
      encodingUntil: editForm.encodingUntil || undefined,
      specializationFrom: editForm.specializationFrom || undefined,
      specializationUntil: editForm.specializationUntil || undefined,
      specializationChangeUntil: editForm.specializationChangeUntil || undefined,
      specializationApprovalUntil: editForm.specializationApprovalUntil || undefined,
      underloadFrom: editForm.underloadFrom || undefined,
      underloadUntil: editForm.underloadUntil || undefined,
      graduationFrom: editForm.graduationFrom || undefined,
      graduationUntil: editForm.graduationUntil || undefined,
      geElectiveFrom: editForm.geElectiveFrom || undefined,
      geElectiveUntil: editForm.geElectiveUntil || undefined,
      geElectiveChangeUntil: editForm.geElectiveChangeUntil || undefined,
      geElectiveApprovalUntil: editForm.geElectiveApprovalUntil || undefined,
      dropDeadline: undefined,
      enrollmentSchedule: slots.length > 0 ? { slots } : undefined,
      consentWindows: Object.keys(cw).length > 0 ? cw : undefined,
    });
    setEditTerm(null);
  };

  const openEdit = (term: typeof state.terms[0]) => {
    const existingSlots = term.enrollmentSchedule?.slots ?? [];
    const base = emptySlots();
    existingSlots.forEach(s => {
      const ph = (s.phase ?? 1) as 1 | 2 | 3;
      const idx = base.findIndex(b => b.phase === ph && b.day === s.day);
      if (idx !== -1) base[idx] = { ...base[idx], date: s.date, idPrefixes: s.idPrefixes };
    });
    const cw = emptyConsentWindows();
    for (const [k, v] of Object.entries(term.consentWindows ?? {})) {
      if (k in cw) {
        cw[k] = { from: v.from ?? '', until: v.until ?? '' };
      } else if (k !== 'COI / Department Consent') {
        if (!cw['OCS Consent']?.from && v.from) {
          cw['OCS Consent'] = { from: v.from ?? '', until: v.until ?? '' };
        }
      }
    }
    setEditForm({
      termName: term.name,
      maxUnits: String(term.maxUnits ?? 21),
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
      specializationFrom: term.specializationFrom ?? '',
      specializationUntil: term.specializationUntil ?? '',
      specializationChangeUntil: term.specializationChangeUntil ?? '',
      specializationApprovalUntil: term.specializationApprovalUntil ?? '',
      underloadFrom: term.underloadFrom ?? '',
      underloadUntil: term.underloadUntil ?? '',
      graduationFrom: term.graduationFrom ?? '',
      graduationUntil: term.graduationUntil ?? '',
      geElectiveFrom: term.geElectiveFrom ?? '',
      geElectiveUntil: term.geElectiveUntil ?? '',
      geElectiveChangeUntil: term.geElectiveChangeUntil ?? '',
      geElectiveApprovalUntil: term.geElectiveApprovalUntil ?? '',
      consentWindows: cw,
      enrollmentSlots: base,
    });
    setEditTerm(term.id);
  };

  const setEF = (key: keyof EditForm, val: string) =>
    setEditForm(f => ({ ...f, [key]: val }));

  const saveHeaderEdit = () => {
    if (!headerEdit) return;
    updateTermSettings(headerEdit.termId, {
      name: headerEdit.name.trim() || undefined,
      academicYear: headerEdit.academicYear.trim() || undefined,
    });
    setHeaderEdit(null);
  };

  const handleDragStart = (termId: string) => setDragId(termId);
  const handleDragOver = (e: React.DragEvent, termId: string) => {
    e.preventDefault();
    if (termId !== dragId) setDragOverId(termId);
  };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const ids = state.terms.map(t => t.id);
    const fromIdx = ids.indexOf(dragId);
    const toIdx = ids.indexOf(targetId);
    const newOrder = [...ids];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, dragId);
    reorderTerms(newOrder);
    setDragId(null); setDragOverId(null);
  };
  const handleDragEnd = () => { setDragId(null); setDragOverId(null); };

  return (
    <PortalLayout role="admin" userName={state.currentUser?.name ?? ''}>
      <div className="space-y-5">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">{state.terms.length} term{state.terms.length !== 1 ? 's' : ''} configured</p>
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
        <div className="space-y-5">
          {state.terms.map(term => {
            const sectionCount = state.sections.filter(s => s.termId === term.id).length;
            const studentCount = new Set(state.enrollments.filter(e => e.termId === term.id).map(e => e.studentId)).size;
            const isEditingHeader = headerEdit?.termId === term.id;

            return (
              <div
                key={term.id}
                draggable
                onDragStart={() => handleDragStart(term.id)}
                onDragOver={e => handleDragOver(e, term.id)}
                onDrop={e => handleDrop(e, term.id)}
                onDragEnd={handleDragEnd}
                className={`rounded-2xl overflow-hidden border-2 shadow-sm transition-all ${
                  dragOverId === term.id ? 'border-blue-400 shadow-blue-100 shadow-md scale-[1.01]' :
                  dragId === term.id ? 'opacity-50 border-dashed border-muted-foreground' :
                  term.isActive ? 'border-primary' : 'border-border'
                } hover:shadow-md`}
              >

                {/* ── Card Header ── */}
                <div className={`px-5 py-4 ${term.isActive ? 'bg-primary' : 'bg-muted/60 border-b border-border'}`}>
                  <div className="flex items-start justify-between gap-3">
                    {/* Drag handle */}
                    <div className={`flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing ${term.isActive ? 'text-white/40 hover:text-white/70' : 'text-muted-foreground/40 hover:text-muted-foreground'}`} title="Drag to reorder">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditingHeader ? (
                        /* Inline edit mode */
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              value={headerEdit.name}
                              onChange={e => setHeaderEdit(h => h ? { ...h, name: e.target.value } : h)}
                              placeholder="Term name"
                              className={`h-8 text-sm font-semibold flex-1 ${term.isActive ? 'bg-white/20 border-white/40 text-white placeholder:text-white/50' : ''}`}
                              onKeyDown={e => { if (e.key === 'Enter') saveHeaderEdit(); if (e.key === 'Escape') setHeaderEdit(null); }}
                              autoFocus
                            />
                            <Input
                              value={headerEdit.academicYear}
                              onChange={e => setHeaderEdit(h => h ? { ...h, academicYear: e.target.value } : h)}
                              placeholder="A.Y. e.g. 2025-2026"
                              className={`h-8 text-sm flex-1 ${term.isActive ? 'bg-white/20 border-white/40 text-white placeholder:text-white/50' : ''}`}
                              onKeyDown={e => { if (e.key === 'Enter') saveHeaderEdit(); if (e.key === 'Escape') setHeaderEdit(null); }}
                            />
                            <Button size="sm" className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white flex-shrink-0" onClick={saveHeaderEdit}>
                              <Save className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 flex-shrink-0 ${term.isActive ? 'text-white/70 hover:bg-white/20 hover:text-white' : ''}`} onClick={() => setHeaderEdit(null)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Display mode */
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-lg font-bold leading-tight ${term.isActive ? 'text-primary-foreground' : 'text-foreground'}`}>
                            {term.name}
                          </span>
                          {term.isActive
                            ? <Badge className="bg-green-500/90 text-white border-0 text-xs">Active</Badge>
                            : <Badge variant="outline" className="text-muted-foreground text-xs">Inactive</Badge>}
                          <button
                            onClick={() => setHeaderEdit({ termId: term.id, name: term.name, academicYear: term.academicYear })}
                            className={`p-1 rounded-md transition-colors ${term.isActive ? 'text-white/60 hover:text-white hover:bg-white/15' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                            title="Edit name & academic year"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {!isEditingHeader && (
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className={`text-sm ${term.isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            A.Y. {term.academicYear}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${term.isActive ? 'border-white/30 text-white/80 bg-white/10' : 'border-border text-muted-foreground'}`}>
                            Max {term.maxUnits ?? 21} units
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${term.isActive ? 'border-white/30 text-white/80 bg-white/10' : 'border-border text-muted-foreground'}`}>
                            {sectionCount} section{sectionCount !== 1 ? 's' : ''}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${term.isActive ? 'border-white/30 text-white/80 bg-white/10' : 'border-border text-muted-foreground'}`}>
                            {studentCount} enrolled
                          </span>
                          {term.unfinalizedDeadline && (
                            <span className="text-xs text-orange-300 font-medium">Auto-drop: {fmt(term.unfinalizedDeadline)}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Header action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!term.isActive && (
                        <Button size="sm" variant="outline" className="border-green-500 text-green-700 hover:bg-green-50 gap-1.5 text-xs h-8" onClick={() => setActiveTerm(term.id)}>
                          <Check className="w-3 h-3" /> Set Active
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={term.isActive ? 'secondary' : 'outline'}
                        className={`gap-1.5 text-xs h-8 ${term.isActive ? '' : ''}`}
                        onClick={() => openEdit(term)}
                      >
                        <Settings className="w-3 h-3" /> Settings
                      </Button>
                      {!term.isActive && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 px-2 h-8"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{term.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove this term along with all its sections, enrollments, and grade records.
                                Course catalog entries will not be affected.
                              </AlertDialogDescription>
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
                </div>

                {/* ── Quick Control Toggles ── */}
                <div className="px-5 py-3 bg-background border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Manual Overrides</p>
                  <div className="flex flex-wrap gap-2">
                    <ControlToggle
                      label="Enlistment" icon={ShoppingCart}
                      value={term.controls?.enlistmentOpen ?? false}
                      onToggle={() => updateTermControls(term.id, { enlistmentOpen: !(term.controls?.enlistmentOpen ?? false) })}
                    />
                    <ControlToggle
                      label="Prerogatives" icon={Unlock}
                      value={term.controls?.prerogativeOpen ?? false}
                      onToggle={() => updateTermControls(term.id, { prerogativeOpen: !(term.controls?.prerogativeOpen ?? false) })}
                    />
                    <ControlToggle
                      label="SET Eval" icon={Star}
                      value={term.controls?.ficEvalOpen ?? false}
                      onToggle={() => updateTermControls(term.id, { ficEvalOpen: !(term.controls?.ficEvalOpen ?? false) })}
                    />
                    <ControlToggle
                      label="Grade Entry" icon={BookMarked}
                      value={term.controls?.gradeSubmissionOpen ?? false}
                      onToggle={() => updateTermControls(term.id, { gradeSubmissionOpen: !(term.controls?.gradeSubmissionOpen ?? false) })}
                    />
                  </div>
                </div>

                {/* ── Window Status Summary ── */}
                <div className="px-5 py-4 bg-muted/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <WindowRow icon={ClipboardCheck} label="Finalize Enlistment" from={term.finalizeWindowStart} until={term.finalizeWindowEnd} color="text-indigo-600" />
                  <WindowRow icon={Unlock} label="Prerogatives" from={term.prerogativeFrom} until={term.prerogativeUntil} color="text-purple-600" />
                  <WindowRow icon={Star} label="SET Evaluation" from={term.evaluationFrom} until={term.evaluationUntil} color="text-amber-600" />
                  <WindowRow icon={BookOpen} label="Grade Encoding" from={term.encodingFrom} until={term.encodingUntil} color="text-green-600" />
                  <WindowRow icon={FileText} label="Change & Drop" from={term.changeDropFrom} until={term.changeDropUntil} color="text-rose-600" />
                  <WindowRow icon={Layers} label="Specialization" from={term.specializationFrom} until={term.specializationUntil} color="text-pink-600" />
                  <WindowRow icon={FileText} label="Underload Applications" from={term.underloadFrom} until={term.underloadUntil} color="text-orange-600" />
                  <WindowRow icon={GraduationCap} label="Graduation Applications" from={term.graduationFrom} until={term.graduationUntil} color="text-violet-600" />
                  <WindowRow icon={BookMarked} label="GE Electives" from={term.geElectiveFrom} until={term.geElectiveUntil} color="text-teal-600" />
                </div>

                {/* ── Settings Form (expanded inline) ── */}
                {editTerm === term.id && (
                  <div className="p-5 bg-muted/10 border-t border-border space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-foreground text-sm flex items-center gap-2">
                        <Settings className="w-4 h-4 text-primary" /> Term Settings
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

                    {/* Section E: Specialization Planner */}
                    <SectionBlock title="Specialization Planner" icon={Layers} color="border-rose-200 bg-rose-50/50">
                      <DatePair label="Student Application Window (when students can submit specialization requests)"
                        from={editForm.specializationFrom} until={editForm.specializationUntil}
                        onFrom={v => setEF('specializationFrom', v)} onUntil={v => setEF('specializationUntil', v)}
                        icon={Layers}
                      />
                      <DatePair label="Student Change Deadline (last day to request change of approved plan)"
                        from="" until={editForm.specializationChangeUntil}
                        onFrom={() => {}} onUntil={v => setEF('specializationChangeUntil', v)}
                        icon={Clock}
                        hideFrom
                      />
                      <DatePair label="OCS Acceptance Deadline (last day OCS can approve or deny requests)"
                        from="" until={editForm.specializationApprovalUntil}
                        onFrom={() => {}} onUntil={v => setEF('specializationApprovalUntil', v)}
                        icon={ClipboardCheck}
                        hideFrom
                      />
                    </SectionBlock>

                    {/* Section F: Underload Application Window */}
                    <SectionBlock title="Underload Application Window" icon={FileText} color="border-orange-200 bg-orange-50/50">
                      <DatePair label="Underload Application Window (after enlistment, students with &lt;15 units may apply)"
                        from={editForm.underloadFrom} until={editForm.underloadUntil}
                        onFrom={v => setEF('underloadFrom', v)} onUntil={v => setEF('underloadUntil', v)}
                        icon={FileText}
                        hint="Students who enlisted fewer than 15 academic units can submit an underload application during this window. Leave blank to disable."
                      />
                    </SectionBlock>

                    {/* Section F2: Graduation Application Window */}
                    <SectionBlock title="Graduation Application Window" icon={GraduationCap} color="border-violet-200 bg-violet-50/50">
                      <DatePair label="Graduation Application Window (students apply for graduation during this period)"
                        from={editForm.graduationFrom} until={editForm.graduationUntil}
                        onFrom={v => setEF('graduationFrom', v)} onUntil={v => setEF('graduationUntil', v)}
                        icon={GraduationCap}
                        hint="Students who have met their graduation requirements can submit a graduation application during this window. Leave blank to disable."
                      />
                    </SectionBlock>

                    {/* Section G: GE Elective Planner */}
                    <SectionBlock title="GE Elective Planner" icon={BookMarked} color="border-teal-200 bg-teal-50/50">
                      <DatePair label="Student Application Window (when students can submit GE elective requests)"
                        from={editForm.geElectiveFrom} until={editForm.geElectiveUntil}
                        onFrom={v => setEF('geElectiveFrom', v)} onUntil={v => setEF('geElectiveUntil', v)}
                        icon={BookMarked}
                      />
                      <DatePair label="Student Change Deadline (last day to request change of approved plan)"
                        from="" until={editForm.geElectiveChangeUntil}
                        onFrom={() => {}} onUntil={v => setEF('geElectiveChangeUntil', v)}
                        icon={Clock}
                        hideFrom
                      />
                      <DatePair label="OCS Acceptance Deadline (last day OCS can approve or deny GE elective requests)"
                        from="" until={editForm.geElectiveApprovalUntil}
                        onFrom={() => {}} onUntil={v => setEF('geElectiveApprovalUntil', v)}
                        icon={ClipboardCheck}
                        hideFrom
                      />
                    </SectionBlock>

                    {/* Section H: OCS Consent Windows */}
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
                      <p className="text-xs text-muted-foreground">Set dates per phase and day. Phases 1–2: assign student ID prefixes (Day 4 open to all). Phase 3 is Change of Matriculation — open to all students on the set dates.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {([1, 2, 3] as const).map(phase => {
                          const phaseSlots = editForm.enrollmentSlots.filter(s => s.phase === phase);
                          const phaseLabel = phase === 1 ? 'Phase 1 — Pre-registration' : phase === 2 ? 'Phase 2 — Open Registration' : 'Phase 3 — Change of Matriculation';
                          const phaseBorder = phase === 1 ? 'border-indigo-300 bg-indigo-50' : phase === 2 ? 'border-teal-300 bg-teal-50' : 'border-amber-300 bg-amber-50';
                          const phaseText = phase === 1 ? 'text-indigo-800' : phase === 2 ? 'text-teal-800' : 'text-amber-800';
                          const isPhase3 = phase === 3;
                          return (
                            <div key={phase} className={`rounded-lg border p-3 space-y-2 ${phaseBorder} ${isPhase3 ? 'sm:col-span-2' : ''}`}>
                              <div className="flex items-center justify-between">
                                <p className={`text-xs font-bold ${phaseText}`}>{phaseLabel}</p>
                                {isPhase3 && <span className="text-xs text-amber-700 bg-amber-100 border border-amber-300 rounded px-2 py-0.5">Open to all students</span>}
                              </div>
                              <div className={`grid gap-2 ${isPhase3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
                              {phaseSlots.map(slot => {
                                const gi = editForm.enrollmentSlots.findIndex(s => s.phase === phase && s.day === slot.day);
                                const isOpen = isPhase3 || slot.day === 4;
                                return (
                                  <div key={slot.day} className="bg-white rounded border border-gray-200 p-2 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs font-bold w-10 shrink-0 ${phaseText}`}>{isPhase3 ? `Date ${slot.day}` : `Day ${slot.day}`}</span>
                                      <Input type="date" value={slot.date}
                                        onChange={e => setEditForm(f => { const s = [...f.enrollmentSlots]; s[gi] = { ...s[gi], date: e.target.value }; return { ...f, enrollmentSlots: s }; })}
                                        className="h-7 text-xs flex-1" />
                                      {isOpen && !isPhase3 && <span className="text-xs text-muted-foreground font-medium">All batches</span>}
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
                                          {slot.idPrefixes.length === 0 && <span className="text-xs text-muted-foreground italic">No prefixes yet</span>}
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
            );
          })}

          {state.terms.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">
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
