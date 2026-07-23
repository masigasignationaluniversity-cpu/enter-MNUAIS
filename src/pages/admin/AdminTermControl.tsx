import { useState, useRef } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AppDialog } from '@/components/ui/app-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Pencil, Trash2, X, ChevronDown, ChevronRight,
  ShoppingCart, GraduationCap, ClipboardCheck, BookOpen, FileText,
  Clock, CalendarDays, Users, AlertTriangle, Settings,
  ToggleLeft, ToggleRight, Unlock, Star, BookMarked, Save, GripVertical, Layers,
  ListOrdered, Power, Sparkles, Upload, Download, CheckCircle2, XCircle,
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/sonner';

// OCS consent: all 4 OCS types share one window
const ADMIN_CONSENT_KEYS = ['COI / Department Consent', 'OCS Consent'] as const;

// ── CSV Import (Term Arrangement) ───────────────────────────────────────────
interface TermCsvRow {
  name: string; academicYear: string; semester: '1st' | '2nd' | 'Mid-Term'; maxUnits: string;
  error?: string;
}
const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
};
const parseTermCsv = (text: string): TermCsvRow[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[\s_-]/g, ''));
  const idx = (key: string) => headers.indexOf(key);
  return lines.slice(1).map(line => {
    const vals = parseCsvLine(line);
    const get = (key: string) => vals[idx(key)]?.trim() ?? '';
    const name = get('termname') || get('name');
    const academicYear = get('academicyear') || get('ay');
    const rawSemester = get('semester').toLowerCase();
    const semester: '1st' | '2nd' | 'Mid-Term' = rawSemester.includes('2nd') ? '2nd'
      : rawSemester.includes('mid') || rawSemester.includes('summer') ? 'Mid-Term' : '1st';
    const maxUnits = get('maxunits') || '21';
    const error = !name ? 'Missing Term Name' : !academicYear ? 'Missing Academic Year' : undefined;
    return { name, academicYear, semester, maxUnits, error };
  });
};
const downloadTermCsvTemplate = () => {
  const lines = [
    'Term Name,Academic Year,Semester,Max Units',
    '# GUIDE: Term Name* | Academic Year* (e.g. 2025-2026) | Semester* (1st, 2nd, or Mid-Term) | Max Units (default 21)',
    '1st Sem 2025-2026,2025-2026,1st,21',
    '2nd Sem 2025-2026,2025-2026,2nd,21',
    'Mid-Year 2025-2026,2025-2026,Mid-Term,9',
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'terms_import_template.csv'; a.click();
  URL.revokeObjectURL(url);
};

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
    <div className={`rounded-lg border ${STATUS_BADGE[status]} px-2.5 py-1.5 flex items-center gap-2`}>
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-foreground truncate">{label}</p>
        {(from || until) ? (
          <p className="text-[10px] text-muted-foreground truncate">{fmt(from)} → {fmt(until)}</p>
        ) : (
          <p className="text-[10px] text-muted-foreground">No dates set — automatically closed</p>
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
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-all ${
        value
          ? 'bg-green-50 border-green-300 text-green-800 hover:bg-green-100'
          : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
      }`}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span className="hidden sm:inline">{label}</span>
      {value
        ? <ToggleRight className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
        : <ToggleLeft className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
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
      <div className={`grid gap-3 ${hideFrom ? 'grid-cols-1 sm:max-w-sm' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {!hideFrom && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Opens</p>
            <Input type="datetime-local" value={from} onChange={e => onFrom(e.target.value)} className="h-10 text-sm w-full" />
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Deadline</p>
          <Input type="datetime-local" value={until} onChange={e => onUntil(e.target.value)} className="h-10 text-sm w-full" />
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
        <div className="px-4 pb-4 pt-1 space-y-4 bg-muted">
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
  underloadFrom: string; underloadUntil: string; underloadApprovalUntil: string;
  graduationFrom: string; graduationUntil: string;
  geElectiveFrom: string; geElectiveUntil: string;
  geElectiveChangeUntil: string;
  geElectiveApprovalUntil: string;
  consentWindows: Record<string, { from: string; until: string }>;
  enrollmentSlots: Array<{ phase: 1 | 2 | 3; day: number; date: string; idPrefixes: string[]; input: string; startTime: string; endTime: string }>;
};

const emptySlots = (): EditForm['enrollmentSlots'] => [
  { phase: 1, day: 1, date: '', idPrefixes: [], input: '', startTime: '', endTime: '' },
  { phase: 1, day: 2, date: '', idPrefixes: [], input: '', startTime: '', endTime: '' },
  { phase: 1, day: 3, date: '', idPrefixes: [], input: '', startTime: '', endTime: '' },
  { phase: 1, day: 4, date: '', idPrefixes: [], input: '', startTime: '', endTime: '' },
  { phase: 2, day: 1, date: '', idPrefixes: [], input: '', startTime: '', endTime: '' },
  { phase: 2, day: 2, date: '', idPrefixes: [], input: '', startTime: '', endTime: '' },
  { phase: 2, day: 3, date: '', idPrefixes: [], input: '', startTime: '', endTime: '' },
  { phase: 2, day: 4, date: '', idPrefixes: [], input: '', startTime: '', endTime: '' },
  { phase: 3, day: 1, date: '', idPrefixes: [], input: '', startTime: '', endTime: '' },
  { phase: 3, day: 2, date: '', idPrefixes: [], input: '', startTime: '', endTime: '' },
  { phase: 3, day: 3, date: '', idPrefixes: [], input: '', startTime: '', endTime: '' },
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
  underloadFrom: '', underloadUntil: '', underloadApprovalUntil: '',
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
  // Drag reorder (Term Arrangement tab)
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  // CSV Import (Term Arrangement tab)
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<TermCsvRow[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Set Active Term tab
  const currentActiveTerm = state.terms.find(t => t.isActive);
  const [pendingActiveId, setPendingActiveId] = useState<string>('');
  const [activateConfirmOpen, setActivateConfirmOpen] = useState(false);

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

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const rows = parseTermCsv(text);
      if (rows.length === 0) { toast.error('No data found in CSV. Check format and try again.'); return; }
      setCsvRows(rows);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCsvImport = () => {
    const valid = csvRows.filter(r => !r.error);
    if (valid.length === 0) { toast.error('No valid rows to import.'); return; }
    setCsvImporting(true);
    for (const row of valid) {
      addTerm({
        name: row.name, academicYear: row.academicYear, semester: row.semester,
        isActive: false, maxUnits: parseInt(row.maxUnits) || 21,
        controls: { enlistmentOpen: false, enrollmentOpen: false, ficEvalOpen: false, gradeSubmissionOpen: false, prerogativeOpen: false },
      });
    }
    toast.success(`${valid.length} term${valid.length !== 1 ? 's' : ''} imported successfully.`);
    setCsvImporting(false);
    setCsvOpen(false);
    setCsvRows([]);
  };

  const handleSaveEdit = (termId: string) => {
    const slots = editForm.enrollmentSlots
      .filter(s => s.date)
      .map(s => ({ phase: s.phase, day: s.day, date: s.date, idPrefixes: s.idPrefixes, startTime: s.startTime || undefined, endTime: s.endTime || undefined }));
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
      underloadApprovalUntil: editForm.underloadApprovalUntil || undefined,
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
      if (idx !== -1) base[idx] = { ...base[idx], date: s.date, idPrefixes: s.idPrefixes, startTime: s.startTime ?? '', endTime: s.endTime ?? '' };
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
      underloadApprovalUntil: term.underloadApprovalUntil ?? '',
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

  const pendingTerm = state.terms.find(t => t.id === pendingActiveId);
  const selectedTerm = state.terms.find(t => t.id === pendingActiveId);
  const openActivateConfirm = () => {
    if (!pendingActiveId || pendingActiveId === currentActiveTerm?.id) return;
    setActivateConfirmOpen(true);
  };
  const confirmActivate = () => {
    if (!pendingActiveId) return;
    setActiveTerm(pendingActiveId);
    setActivateConfirmOpen(false);
    toast.success(`${pendingTerm?.name ?? 'Term'} is now the active term`);
  };

  return (
    <PortalLayout role="admin" userName={state.currentUser?.name ?? ''}>
      <div className="space-y-5">

        <Tabs defaultValue="arrangement">
          <TabsList className="bg-muted h-auto p-1">
            <TabsTrigger value="arrangement" className="gap-1.5 text-sm px-4 py-2">
              <ListOrdered className="w-4 h-4" /> Term Arrangement
            </TabsTrigger>
            <TabsTrigger value="activate" className="gap-1.5 text-sm px-4 py-2">
              <Power className="w-4 h-4" /> Set Active Term
            </TabsTrigger>
          </TabsList>

          {/* ══════════════════════════ TAB 1: TERM ARRANGEMENT ══════════════════════════ */}
          <TabsContent value="arrangement" className="space-y-5 mt-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2.5 max-w-2xl">
                <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Drag terms by the handle to reorder them. This tab is for arrangement only — this order controls how terms
                  appear in every dropdown across all portals, and the sequence used when generating grade PDFs
                  (transcripts, report cards). To configure windows and activate a term, use the <strong>Set Active Term</strong> tab.
                  {' '}<span className="font-medium text-foreground">{state.terms.length} term{state.terms.length !== 1 ? 's' : ''} configured.</span>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" className="gap-2" onClick={() => setCsvOpen(true)}>
                  <Upload className="w-4 h-4" /> Import CSV
                </Button>
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
                        <SearchableSelect
                          value={form.semester}
                          onValueChange={v => setForm(f => ({ ...f, semester: v as '1st' | '2nd' | 'Mid-Term' }))}
                          placeholder="Select semester..."
                          options={[
                            { value: '1st', label: '1st Semester' },
                            { value: '2nd', label: '2nd Semester' },
                            { value: 'Mid-Term', label: 'Mid-Term / Summer' },
                          ]}
                        />
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
            </div>

            {/* Term Reorder List — arrangement only, no settings here */}
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {state.terms.map(term => {
                const sectionCount = state.sections.filter(s => s.termId === term.id && s.sectionCode !== '__MANUAL__').length;
                const studentCount = new Set(state.enrollments.filter(e => e.termId === term.id && state.users.some(u => u.id === e.studentId)).map(e => e.studentId)).size;
                return (
                  <div
                    key={term.id}
                    draggable
                    onDragStart={() => handleDragStart(term.id)}
                    onDragOver={e => handleDragOver(e, term.id)}
                    onDrop={e => handleDrop(e, term.id)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 px-4 py-3 bg-background transition-all ${
                      dragOverId === term.id ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' :
                      dragId === term.id ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground" title="Drag to reorder">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">{term.name}</span>
                      <span className="text-xs text-muted-foreground">A.Y. {term.academicYear}</span>
                      {term.isActive
                        ? <Badge className="bg-green-500/90 text-white border-0 text-[10px] px-1.5 py-0">Active</Badge>
                        : <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0">Inactive</Badge>}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                        {sectionCount} section{sectionCount !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                        {studentCount} enrolled
                      </span>
                    </div>
                    {!term.isActive && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 px-1.5 h-7 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></Button>
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
                );
              })}

              {state.terms.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                  <CalendarDays className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No terms yet</p>
                  <p className="text-sm">Click "New Term" or "Import CSV" to create your first academic term.</p>
                </div>
              )}
            </div>

            {/* CSV Import Dialog */}
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
            <Dialog open={csvOpen} onOpenChange={v => { setCsvOpen(v); if (!v) setCsvRows([]); }}>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Import Terms from CSV
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-5 text-center space-y-3">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground/50" />
                    <div>
                      <p className="text-sm font-medium">Upload a CSV file with term data</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Required columns: <code className="bg-muted px-1 rounded">Term Name, Academic Year</code>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Optional: <code className="bg-muted px-1 rounded">Semester (1st/2nd/Mid-Term), Max Units</code>
                      </p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4" /> Choose CSV File
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={downloadTermCsvTemplate}>
                        <Download className="w-4 h-4" /> Download Template
                      </Button>
                    </div>
                  </div>

                  {csvRows.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">
                          Preview — {csvRows.length} row(s)
                          <span className="ml-2 text-emerald-600 font-normal">{csvRows.filter(r => !r.error).length} valid</span>
                          {csvRows.filter(r => r.error).length > 0 && (
                            <span className="ml-2 text-destructive font-normal">{csvRows.filter(r => r.error).length} with errors</span>
                          )}
                        </p>
                        <Button size="sm" variant="ghost" className="text-xs text-muted-foreground h-7" onClick={() => setCsvRows([])}>
                          Clear
                        </Button>
                      </div>
                      <div className="inner-table">
                        <div className="overflow-x-auto max-h-64">
                          <table className="w-full text-xs">
                            <thead className="bg-muted border-b sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold w-6"></th>
                                <th className="px-3 py-2 text-left font-semibold">Term Name</th>
                                <th className="px-3 py-2 text-left font-semibold">Academic Year</th>
                                <th className="px-3 py-2 text-left font-semibold">Semester</th>
                                <th className="px-3 py-2 text-left font-semibold">Max Units</th>
                                <th className="px-3 py-2 text-left font-semibold">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {csvRows.map((row, i) => (
                                <tr key={i} className={row.error ? 'bg-red-50' : 'hover:bg-muted/40'}>
                                  <td className="px-3 py-2 text-center">
                                    {row.error
                                      ? <XCircle className="w-3.5 h-3.5 text-destructive mx-auto" />
                                      : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />}
                                  </td>
                                  <td className="px-3 py-2 font-medium">{row.name || <span className="text-muted-foreground italic">—</span>}</td>
                                  <td className="px-3 py-2">{row.academicYear || <span className="text-muted-foreground italic">—</span>}</td>
                                  <td className="px-3 py-2">{row.semester}</td>
                                  <td className="px-3 py-2">{row.maxUnits}</td>
                                  <td className="px-3 py-2">
                                    {row.error
                                      ? <span className="text-destructive">{row.error}</span>
                                      : <span className="text-emerald-600 font-medium">Ready</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" className="flex-1" onClick={() => { setCsvOpen(false); setCsvRows([]); }}>Cancel</Button>
                        <Button
                          className="flex-1 gap-2"
                          disabled={csvImporting || csvRows.every(r => !!r.error)}
                          onClick={handleCsvImport}
                        >
                          <Upload className="w-4 h-4" />
                          {csvImporting ? 'Importing...' : `Import ${csvRows.filter(r => !r.error).length} Term(s)`}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>


          {/* ══════════════════════════ TAB 2: SET ACTIVE TERM ══════════════════════════ */}
          <TabsContent value="activate" className="mt-4">
            <div className="max-w-4xl mx-auto space-y-5">
              {/* Current active term hero */}
              <div className="portal-panel">
                <div className="portal-panel-header">
                  <div className="flex items-center gap-2"><Sparkles size={14} /> Currently Active Term</div>
                </div>
                <div className="px-6 py-6 bg-primary/5 text-center">
                  {currentActiveTerm ? (
                    <>
                      <p className="text-2xl font-bold text-foreground">{currentActiveTerm.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">A.Y. {currentActiveTerm.academicYear}</p>
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <Badge className="bg-green-500/90 text-white border-0 gap-1"><Power className="w-3 h-3" /> Active</Badge>
                        <Badge variant="outline" className="text-muted-foreground">
                          {state.sections.filter(s => s.termId === currentActiveTerm.id && s.sectionCode !== '__MANUAL__').length} sections
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <>
                      <CalendarDays className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground font-medium">No active term set</p>
                      <p className="text-xs text-muted-foreground mt-1">Select a term below to activate it.</p>
                    </>
                  )}
                </div>
              </div>

              {/* Term switcher */}
              <div className="portal-panel">
                <div className="portal-panel-header">
                  <div className="flex items-center gap-2"><Power size={14} /> Switch Active Term</div>
                </div>
                <div className="px-6 py-6 bg-background space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Choose which term should be active across the system. Only one term can be active at a time —
                    students, faculty, and OCS staff will see this term as the current one for enlistment, grading, and dashboards.
                  </p>
                  <div className="space-y-1.5">
                    <Label>Select Term</Label>
                    <SearchableSelect
                      value={pendingActiveId}
                      onValueChange={v => { setPendingActiveId(v); setEditTerm(null); }}
                      placeholder="Choose a term..."
                      options={state.terms.map(t => ({
                        value: t.id,
                        label: `${t.name} (A.Y. ${t.academicYear})${t.isActive ? ' — Currently Active' : ''}`,
                      }))}
                    />
                  </div>
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                    disabled={!pendingActiveId || pendingActiveId === currentActiveTerm?.id}
                    onClick={openActivateConfirm}
                  >
                    <Power className="w-4 h-4" /> Set as Active Term
                  </Button>
                  {state.terms.length === 0 && (
                    <p className="text-xs text-center text-muted-foreground italic">No terms configured yet — create one in the Term Arrangement tab.</p>
                  )}
                </div>
              </div>

              {/* Selected term options — appear once a term is chosen above */}
              {selectedTerm && (
                <div className="portal-panel">
                  <div className="portal-panel-header">
                    <div className="flex items-center gap-2"><Settings size={14} /> Options — {selectedTerm.name}</div>
                  </div>
                  <div className="bg-background">
                    {/* Quick Control Toggles */}
                    <div className="px-6 py-3 border-b border-border">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Manual Overrides</p>
                      <div className="flex flex-wrap gap-1.5">
                        <ControlToggle
                          label="Enlistment" icon={ShoppingCart}
                          value={selectedTerm.controls?.enlistmentOpen ?? false}
                          onToggle={() => updateTermControls(selectedTerm.id, { enlistmentOpen: !(selectedTerm.controls?.enlistmentOpen ?? false) })}
                        />
                        <ControlToggle
                          label="Prerogatives" icon={Unlock}
                          value={selectedTerm.controls?.prerogativeOpen ?? false}
                          onToggle={() => updateTermControls(selectedTerm.id, { prerogativeOpen: !(selectedTerm.controls?.prerogativeOpen ?? false) })}
                        />
                        <ControlToggle
                          label="SET Eval" icon={Star}
                          value={selectedTerm.controls?.ficEvalOpen ?? false}
                          onToggle={() => updateTermControls(selectedTerm.id, { ficEvalOpen: !(selectedTerm.controls?.ficEvalOpen ?? false) })}
                        />
                        <ControlToggle
                          label="Grade Entry" icon={BookMarked}
                          value={selectedTerm.controls?.gradeSubmissionOpen ?? false}
                          onToggle={() => updateTermControls(selectedTerm.id, { gradeSubmissionOpen: !(selectedTerm.controls?.gradeSubmissionOpen ?? false) })}
                        />
                      </div>
                    </div>

                    {/* Window Status Summary */}
                    <div className="px-6 py-3 bg-muted/20 grid grid-cols-1 sm:grid-cols-2 gap-1.5 border-b border-border">
                      <WindowRow icon={ClipboardCheck} label="Finalize Enlistment" from={selectedTerm.finalizeWindowStart} until={selectedTerm.finalizeWindowEnd} color="text-indigo-600" />
                      <WindowRow icon={Unlock} label="Prerogatives" from={selectedTerm.prerogativeFrom} until={selectedTerm.prerogativeUntil} color="text-purple-600" />
                      <WindowRow icon={Star} label="SET Evaluation" from={selectedTerm.evaluationFrom} until={selectedTerm.evaluationUntil} color="text-amber-600" />
                      <WindowRow icon={BookOpen} label="Grade Encoding" from={selectedTerm.encodingFrom} until={selectedTerm.encodingUntil} color="text-green-600" />
                      <WindowRow icon={FileText} label="Change & Drop" from={selectedTerm.changeDropFrom} until={selectedTerm.changeDropUntil} color="text-rose-600" />
                      <WindowRow icon={Layers} label="Specialization" from={selectedTerm.specializationFrom} until={selectedTerm.specializationUntil} color="text-pink-600" />
                      {selectedTerm.semester !== 'Mid-Term' && (
                        <WindowRow icon={FileText} label="Underload Applications" from={selectedTerm.underloadFrom} until={selectedTerm.underloadUntil} color="text-orange-600" />
                      )}
                      <WindowRow icon={GraduationCap} label="Graduation Applications" from={selectedTerm.graduationFrom} until={selectedTerm.graduationUntil} color="text-violet-600" />
                      <WindowRow icon={BookMarked} label="GE Electives" from={selectedTerm.geElectiveFrom} until={selectedTerm.geElectiveUntil} color="text-teal-600" />
                    </div>

                    {/* Action row: Full settings + Delete */}
                    <div className="px-6 py-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={editTerm === selectedTerm.id ? 'secondary' : 'outline'}
                        className="gap-1.5"
                        onClick={() => editTerm === selectedTerm.id ? setEditTerm(null) : openEdit(selectedTerm)}
                      >
                        <Settings className="w-3.5 h-3.5" /> {editTerm === selectedTerm.id ? 'Hide Full Settings' : 'Full Settings'}
                      </Button>
                      {!selectedTerm.isActive && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 gap-1.5">
                              <Trash2 className="w-3.5 h-3.5" /> Delete Term
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{selectedTerm.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove this term along with all its sections, enrollments, and grade records.
                                Course catalog entries will not be affected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { deleteTerm(selectedTerm.id); setPendingActiveId(''); }}>Delete Term</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>

                    {/* Full Settings Form (expanded inline) */}
                    {editTerm === selectedTerm.id && (
                      <div className="p-5 bg-muted/10 border-t border-border space-y-3">
                        {/* Section A: General */}
                        <SectionBlock title="General Settings" icon={Settings} color="border-border bg-muted/20">
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
                        <SectionBlock title="Student Enlistment Windows" icon={ShoppingCart} color="border-border bg-muted/20">
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
                            <Input type="datetime-local" value={editForm.unfinalizedDeadline} onChange={e => setEF('unfinalizedDeadline', e.target.value)} className="h-10 text-sm w-full sm:max-w-sm" />
                            <p className="text-xs text-muted-foreground italic">After this date, enlisted-but-not-finalized students are auto-dropped.</p>
                          </div>
                        </SectionBlock>

                        {/* Section C: Student Requests */}
                        <SectionBlock title="Student Request Windows" icon={FileText} color="border-border bg-muted/20">
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
                            <Input type="datetime-local" value={editForm.requestDeadline} onChange={e => setEF('requestDeadline', e.target.value)} className="h-10 text-sm w-full sm:max-w-sm" />
                            <p className="text-xs text-muted-foreground italic">After this date, OCS cannot approve or deny any student requests.</p>
                          </div>
                        </SectionBlock>

                        {/* Section D: Faculty & Evaluation */}
                        <SectionBlock title="Faculty & Evaluation Windows" icon={GraduationCap} color="border-border bg-muted/20">
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
                        <SectionBlock title="Specialization Planner" icon={Layers} color="border-border bg-muted/20">
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

                        {/* Section F: Underload Application Window — not applicable for Mid-Term */}
                        {selectedTerm.semester !== 'Mid-Term' && (
                          <SectionBlock title="Underload Application Window" icon={FileText} color="border-border bg-muted/20">
                            <DatePair label="Student Application Window (after enlistment, students with <15 units may apply)"
                              from={editForm.underloadFrom} until={editForm.underloadUntil}
                              onFrom={v => setEF('underloadFrom', v)} onUntil={v => setEF('underloadUntil', v)}
                              icon={FileText}
                              hint="Students who enlisted fewer than 15 academic units can submit an underload application during this window. Leave blank to disable."
                            />
                            <DatePair label="OCS Approval Deadline (last day OCS can approve or deny underload applications)"
                              from="" until={editForm.underloadApprovalUntil}
                              onFrom={() => {}} onUntil={v => setEF('underloadApprovalUntil', v)}
                              icon={ClipboardCheck}
                              hideFrom
                              hint="After this date, OCS cannot approve or deny pending underload applications."
                            />
                          </SectionBlock>
                        )}

                        {/* Section F2: Graduation Application Window */}
                        <SectionBlock title="Graduation Application Window" icon={GraduationCap} color="border-border bg-muted/20">
                          <DatePair label="Graduation Application Window (students apply for graduation during this period)"
                            from={editForm.graduationFrom} until={editForm.graduationUntil}
                            onFrom={v => setEF('graduationFrom', v)} onUntil={v => setEF('graduationUntil', v)}
                            icon={GraduationCap}
                            hint="Students who have met their graduation requirements can submit a graduation application during this window. Leave blank to disable."
                          />
                        </SectionBlock>

                        {/* Section G: GE Elective Planner */}
                        <SectionBlock title="GE Elective Planner" icon={BookMarked} color="border-border bg-muted/20">
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
                        <SectionBlock title="OCS Consent Windows" icon={ClipboardCheck} color="border-border bg-muted/20">
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

                        {/* Section I: Enrollment Schedule */}
                        <SectionBlock title="Enrollment Schedule by Student ID" icon={Users} color="border-border bg-muted/20">
                          <p className="text-xs text-muted-foreground">Set dates per phase and day. Phases 1–2: assign student ID prefixes (Day 4 open to all). Phase 3 is Change of Matriculation — open to all students on the set dates.</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {([1, 2, 3] as const).map(phase => {
                              const phaseSlots = editForm.enrollmentSlots.filter(s => s.phase === phase);
                              const phaseLabel = phase === 1 ? 'Phase 1 — Pre-registration' : phase === 2 ? 'Phase 2 — Open Registration' : 'Phase 3 — Change of Matriculation';
                              const phaseBorder = phase === 1 ? 'border-primary/30 bg-primary/5' : phase === 2 ? 'border-secondary/30 bg-secondary/5' : 'border-amber-200 bg-amber-50';
                              const phaseText = phase === 1 ? 'text-primary' : phase === 2 ? 'text-secondary' : 'text-amber-800';
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
                                      <div key={slot.day} className="bg-background rounded border border-border p-2 space-y-1.5">
                                        <div className="flex items-center gap-2">
                                          <span className={`text-xs font-bold w-10 shrink-0 ${phaseText}`}>{isPhase3 ? `Date ${slot.day}` : `Day ${slot.day}`}</span>
                                          <Input type="date" value={slot.date}
                                            onChange={e => setEditForm(f => { const s = [...f.enrollmentSlots]; s[gi] = { ...s[gi], date: e.target.value }; return { ...f, enrollmentSlots: s }; })}
                                            className="h-7 text-xs flex-1" />
                                          {isOpen && !isPhase3 && <span className="text-xs text-muted-foreground font-medium">All batches</span>}
                                        </div>
                                        <div className="flex gap-2 pl-12">
                                          <div className="flex-1">
                                            <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />Start time</p>
                                            <Input type="time" value={slot.startTime}
                                              onChange={e => setEditForm(f => { const s = [...f.enrollmentSlots]; s[gi] = { ...s[gi], startTime: e.target.value }; return { ...f, enrollmentSlots: s }; })}
                                              className="h-7 text-xs" />
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />End time</p>
                                            <Input type="time" value={slot.endTime}
                                              onChange={e => setEditForm(f => { const s = [...f.enrollmentSlots]; s[gi] = { ...s[gi], endTime: e.target.value }; return { ...f, enrollmentSlots: s }; })}
                                              className="h-7 text-xs" />
                                          </div>
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
                          <Button size="sm" className="bg-primary text-primary-foreground px-6" onClick={() => handleSaveEdit(selectedTerm.id)}>
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Confirm activation dialog */}
        <AppDialog
          open={activateConfirmOpen}
          onOpenChange={setActivateConfirmOpen}
          intent="warning"
          title="Switch Active Term?"
          description={
            currentActiveTerm ? (
              <>This will deactivate <strong>{currentActiveTerm.name}</strong> and make <strong>{pendingTerm?.name}</strong> the active term across all portals.</>
            ) : (
              <>This will make <strong>{pendingTerm?.name}</strong> the active term across all portals.</>
            )
          }
          confirmLabel="Confirm & Activate"
          onConfirm={confirmActivate}
        >
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-start gap-2 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Enlistment, grading, and dashboard views for students, faculty, and OCS will immediately switch to{' '}
              <strong>{pendingTerm?.name}</strong> (A.Y. {pendingTerm?.academicYear}). Existing term-specific windows and controls are preserved and unaffected.
            </p>
          </div>
        </AppDialog>
      </div>
    </PortalLayout>
  );
}
