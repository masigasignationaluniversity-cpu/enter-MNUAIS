import { useState, useRef, useEffect } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2, BookOpen, Lock, ChevronDown, ChevronUp, X, Upload, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { Course, CourseType, CourseCategory } from '@/lib/types';

const emptyForm = {
  code: '', title: '', type: 'Lec' as CourseType,
  category: 'Major' as CourseCategory,
  units: '3', department: '',
  isPE: false, isNSTP: false,
  requiresCOI: false, requiresDeptConsent: false, requiresOCSConsent: false,
  prerequisites: [] as string[][],
  corequisites: [] as string[][],
  minUnitsRequired: '',
  minYearStanding: '' as '' | 'Freshman' | 'Sophomore' | 'Junior' | 'Senior',
};

export default function OCSCourses() {
  const { state, addCourse, updateCourse, deleteCourse, loadCourses } = useApp();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [prereqPickerGroupIdx, setPrereqPickerGroupIdx] = useState<number | null>(null);
  const [coreqPickerGroupIdx, setCoreqPickerGroupIdx] = useState<number | null>(null);
  const [reqSearch, setReqSearch] = useState('');
  const [coreqSearch, setCoreqSearch] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<(Omit<Course, 'id'> & { _prereqRaw: string; _coreqRaw: string })[]>([]);
  const [importing, setImporting] = useState(false);
  const [upsertMode, setUpsertMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dept = state.currentUser?.department ?? '';

  // Force-refresh courses from DB whenever this page is visited
  useEffect(() => { loadCourses(); }, [loadCourses]);

  const filtered = state.courses.filter(c =>
    (!dept || c.department === dept) &&
    (c.code.toLowerCase().includes(search.toLowerCase()) ||
     c.title.toLowerCase().includes(search.toLowerCase()) ||
     c.department.toLowerCase().includes(search.toLowerCase()))
  );

  const openAdd = () => {
    setForm({ ...emptyForm, department: dept });
    setEditing(null);
    setPrereqPickerGroupIdx(null);
    setCoreqPickerGroupIdx(null);
    setReqSearch('');
    setCoreqSearch('');
    setOpen(true);
  };
  const openEdit = (c: Course) => {
    setForm({
      code: c.code, title: c.title, type: c.type,
      category: c.category ?? 'Major',
      units: String(c.units),
      department: c.department, isPE: c.isPE, isNSTP: c.isNSTP,
      requiresCOI: c.requiresCOI ?? false,
      requiresDeptConsent: c.requiresDeptConsent ?? false,
      requiresOCSConsent: c.requiresOCSConsent ?? false,
      prerequisites: c.prerequisites ?? [],
      corequisites: c.corequisites ?? [],
      minUnitsRequired: c.minUnitsRequired != null ? String(c.minUnitsRequired) : '',
      minYearStanding: c.minYearStanding ?? '',
    });
    setEditing(c);
    setPrereqPickerGroupIdx(null);
    setCoreqPickerGroupIdx(null);
    setReqSearch('');
    setCoreqSearch('');
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.code || !form.title) return;
    const data = {
      code: form.code.trim(), title: form.title.trim(),
      type: form.type, category: form.category, units: parseInt(form.units) || 3,
      department: form.department.trim(), isPE: form.isPE, isNSTP: form.isNSTP,
      requiresCOI: form.requiresCOI,
      requiresDeptConsent: form.requiresDeptConsent,
      requiresOCSConsent: form.requiresOCSConsent,
      prerequisites: form.prerequisites.filter(g => g.length > 0),
      corequisites: form.corequisites.filter(g => g.length > 0),
      minUnitsRequired: (!form.isPE && !form.isNSTP && form.minUnitsRequired) ? (parseInt(form.minUnitsRequired) || undefined) : undefined,
      minYearStanding: (!form.isPE && !form.isNSTP && form.minYearStanding) ? form.minYearStanding : undefined,
    };
    if (editing) {
      updateCourse(editing.id, data);
    } else {
      addCourse(data);
    }
    setOpen(false);
  };

  // --- Prereq group helpers ---
  const addPrereqGroup = () => {
    setForm(f => ({ ...f, prerequisites: [...f.prerequisites, []] }));
    setPrereqPickerGroupIdx(form.prerequisites.length);
    setReqSearch('');
  };
  const removePrereqGroup = (gi: number) => {
    setForm(f => ({ ...f, prerequisites: f.prerequisites.filter((_, i) => i !== gi) }));
    setPrereqPickerGroupIdx(null);
  };
  const addPrereqToGroup = (gi: number, courseId: string) => {
    setForm(f => ({
      ...f,
      prerequisites: f.prerequisites.map((g, i) => i === gi && !g.includes(courseId) ? [...g, courseId] : g),
    }));
  };
  const removePrereqFromGroup = (gi: number, courseId: string) => {
    setForm(f => ({
      ...f,
      prerequisites: f.prerequisites.map((g, i) => i === gi ? g.filter(x => x !== courseId) : g),
    }));
  };

  // --- Coreq group helpers ---
  const addCoreqGroup = () => {
    setForm(f => ({ ...f, corequisites: [...f.corequisites, []] }));
    setCoreqPickerGroupIdx(form.corequisites.length);
    setCoreqSearch('');
  };
  const removeCoreqGroup = (gi: number) => {
    setForm(f => ({ ...f, corequisites: f.corequisites.filter((_, i) => i !== gi) }));
    setCoreqPickerGroupIdx(null);
  };
  const addCoreqToGroup = (gi: number, courseId: string) => {
    setForm(f => ({
      ...f,
      corequisites: f.corequisites.map((g, i) => i === gi && !g.includes(courseId) ? [...g, courseId] : g),
    }));
  };
  const removeCoreqFromGroup = (gi: number, courseId: string) => {
    setForm(f => ({
      ...f,
      corequisites: f.corequisites.map((g, i) => i === gi ? g.filter(x => x !== courseId) : g),
    }));
  };

  // All courses available as prereq/coreq candidates
  const availableForReq = state.courses.filter(c => editing ? c.id !== editing.id : true);

  // ── CSV helpers ─────────────────────────────────────────────────────────────
  const parseCSV = (text: string): Record<string, string>[] => {
    const clean = text.replace(/^\uFEFF/, ''); // strip UTF-8 BOM
    const lines = clean.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const parseRow = (line: string): string[] => {
      const fields: string[] = [];
      let cur = '';
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
        else if (ch === ',' && !inQ) { fields.push(cur); cur = ''; }
        else { cur += ch; }
      }
      fields.push(cur);
      return fields;
    };
    const headers = parseRow(lines[0]);
    return lines.slice(1).map(l => {
      const vals = parseRow(l);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h.trim()] = (vals[i] ?? '').trim(); });
      return obj;
    }).filter(o => Object.values(o).some(v => v));
  };

  const toCSVString = (rows: Record<string, unknown>[], headers: string[]): string => {
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return [headers.map(h => `"${h}"`).join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  // Uses a combined course lookup: existing state.courses + currentBatch (code→id map)
  const resolveReqString = (raw: string, lookup: Map<string, string>): string[][] => {
    if (!raw?.trim()) return [];
    return raw.split(/\bOR\b/i)
      .map(group => group.split(',').map(code => {
        const id = lookup.get(code.trim().toUpperCase());
        return id ?? '';
      }).filter(Boolean))
      .filter(g => g.length > 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const raw = parseCSV(evt.target?.result as string);
        // Build a code-to-ID lookup from existing courses
        const existingLookup = new Map<string, string>(
          state.courses.map(c => [c.code.toUpperCase(), c.id])
        );
        const parsed = raw.map(row => {
          const code = (row['Code'] ?? '').trim();
          const title = (row['Title'] ?? '').trim();
          if (!code || !title) return null;
          return {
            code,
            title,
            type: (row['Type'] || 'Lec').trim() as CourseType,
            category: (row['Category'] || 'Major').trim() as CourseCategory,
            units: parseInt(row['Units'] || '3') || 3,
            labUnits: row['Lab Units'] ? (parseInt(row['Lab Units']) || undefined) : undefined,
            department: (row['Department'] || dept).trim(),
            isPE: (row['Is PE'] ?? '').toLowerCase() === 'yes',
            isNSTP: (row['Is NSTP'] ?? '').toLowerCase() === 'yes',
            requiresCOI: (row['Requires COI'] ?? '').toLowerCase() === 'yes',
            requiresDeptConsent: (row['Dept Consent'] ?? '').toLowerCase() === 'yes',
            requiresOCSConsent: (row['OCS Consent'] ?? '').toLowerCase() === 'yes',
            minUnitsRequired: row['Min Units'] ? (parseInt(row['Min Units']) || undefined) : undefined,
            minYearStanding: (['Freshman','Sophomore','Junior','Senior'].includes((row['Min Standing'] ?? '').trim())
              ? (row['Min Standing'] ?? '').trim() : undefined) as Course['minYearStanding'],
            _prereqRaw: (row['Prerequisites'] ?? '').trim(),
            _coreqRaw: (row['Corequisites'] ?? '').trim(),
            prerequisites: resolveReqString(row['Prerequisites'] ?? '', existingLookup),
            corequisites: resolveReqString(row['Corequisites'] ?? '', existingLookup),
          };
        }).filter(Boolean) as (Omit<Course, 'id'> & { _prereqRaw: string; _coreqRaw: string })[];
        setImportRows(parsed);
      } catch (err) {
        console.error(err);
        toast.error('Failed to read file. Make sure it is a valid .csv file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    setImporting(true);
    const existingCoursesByCode = new Map(state.courses.map(c => [c.code.toLowerCase(), c]));
    let added = 0;
    let updated = 0;
    for (const row of importRows) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { _prereqRaw: _p, _coreqRaw: _c, ...courseData } = row as any;
      void _p; void _c;
      const existing = existingCoursesByCode.get(row.code.toLowerCase());
      if (existing) {
        if (upsertMode) { updateCourse(existing.id, courseData); updated++; }
      } else {
        addCourse(courseData);
        added++;
      }
    }
    setImporting(false);
    setImportDialogOpen(false);
    setImportRows([]);
    setUpsertMode(false);
    const parts: string[] = [];
    if (added > 0) parts.push(`${added} new course${added !== 1 ? 's' : ''} added`);
    if (updated > 0) parts.push(`${updated} existing course${updated !== 1 ? 's' : ''} updated`);
    if (parts.length === 0) parts.push('No changes made — all courses already exist and update mode was off');
    toast.success(parts.join(', ') + '.');
  };

  const handleDownloadTemplate = () => {
    const headers = ['Code','Title','Type','Category','Units','Lab Units','Department','Is PE','Is NSTP','Requires COI','Dept Consent','OCS Consent','Min Units','Min Standing','Prerequisites','Corequisites'];
    const rows = [
      { Code:'CS 101', Title:'Introduction to Computing', Type:'Lec', Category:'Major', Units:3, 'Lab Units':'', Department: dept||'Your Department', 'Is PE':'No', 'Is NSTP':'No', 'Requires COI':'No', 'Dept Consent':'No', 'OCS Consent':'No', 'Min Units':'', 'Min Standing':'', Prerequisites:'', Corequisites:'' },
      { Code:'CS 102', Title:'Data Structures', Type:'Lec', Category:'Major', Units:3, 'Lab Units':'', Department: dept||'Your Department', 'Is PE':'No', 'Is NSTP':'No', 'Requires COI':'No', 'Dept Consent':'No', 'OCS Consent':'No', 'Min Units':12, 'Min Standing':'Sophomore', Prerequisites:'CS 101', Corequisites:'' },
      { Code:'CS 201', Title:'Algorithms', Type:'Lec', Category:'Major', Units:3, 'Lab Units':'', Department: dept||'Your Department', 'Is PE':'No', 'Is NSTP':'No', 'Requires COI':'No', 'Dept Consent':'No', 'OCS Consent':'No', 'Min Units':30, 'Min Standing':'Junior', Prerequisites:'CS 101,CS 102 OR CS 200', Corequisites:'' },
    ];
    downloadCSV(toCSVString(rows, headers), 'courses_import_template.csv');
    toast.success('Template downloaded.');
  };

  const handleExportFull = () => {
    const fmtGroups = (groups: string[][] | undefined) => {
      if (!groups?.length) return '';
      return groups.map(g => g.map(id => state.courses.find(x => x.id === id)?.code ?? id).join(',')).join(' OR ');
    };
    const headers = ['Code','Title','Type','Category','Units','Lab Units','Department','Is PE','Is NSTP','Requires COI','Dept Consent','OCS Consent','Min Units','Min Standing','Prerequisites','Corequisites'];
    const rows = filtered.map(c => ({
      Code: c.code, Title: c.title, Type: c.type, Category: c.category ?? 'Major',
      Units: c.units, 'Lab Units': c.labUnits ?? '',
      Department: c.department,
      'Is PE': c.isPE ? 'Yes' : 'No', 'Is NSTP': c.isNSTP ? 'Yes' : 'No',
      'Requires COI': c.requiresCOI ? 'Yes' : 'No',
      'Dept Consent': c.requiresDeptConsent ? 'Yes' : 'No',
      'OCS Consent': c.requiresOCSConsent ? 'Yes' : 'No',
      'Min Units': c.minUnitsRequired ?? '',
      'Min Standing': c.minYearStanding ?? '',
      Prerequisites: fmtGroups(c.prerequisites),
      Corequisites: fmtGroups(c.corequisites),
    }));
    downloadCSV(toCSVString(rows, headers), `courses_${dept || 'all'}.csv`);
    toast.success(`Exported ${rows.length} courses.`);
  };

  const role = (state.currentUser?.role === 'department_head' ? 'depthead' : 'ocs') as Parameters<typeof PortalLayout>[0]['role'];

  return (
    <PortalLayout role={role} userName={state.currentUser?.name ?? ''}>
      <div className="space-y-4">
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search courses..." className="pl-9 w-full sm:w-52" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button className="bg-primary text-white gap-2 flex-shrink-0" onClick={openAdd}>
              <Plus className="w-4 h-4" /> Add Course
            </Button>
            <Button variant="outline" className="gap-2 flex-shrink-0" onClick={handleExportFull}>
              <Download className="w-4 h-4" /> Export .csv
            </Button>
            <Button variant="outline" className="gap-2 flex-shrink-0" onClick={() => setImportDialogOpen(true)}>
              <Upload className="w-4 h-4" /> Import .csv
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="portal-panel">
          <div className="portal-panel-header">Courses</div>
          <div className="p-0 bg-background">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Units</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Pre/Co-req</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(course => {
                  // Normalize: flat string[] → [[...]], string[][] stays as-is
                  const toGroups = (val: string[][] | undefined): string[][] => {
                    if (!Array.isArray(val) || val.length === 0) return [];
                    if (typeof val[0] === 'string') return [val as unknown as string[]];
                    return val;
                  };
                  // Render prereq/coreq groups as "A AND B  OR  C"
                  const renderGroups = (groups: string[][] | undefined, color: string) => {
                    const g = toGroups(groups);
                    if (!g.length) return null;
                    return (
                      <div className={`text-xs ${color}`}>
                        {g.map((grp, gi) => (
                          <span key={gi}>
                            {gi > 0 && <span className="font-bold mx-1">OR</span>}
                            {grp.map((id, ci) => (
                              <span key={id}>
                                {ci > 0 && <span className="mx-0.5 text-muted-foreground">+</span>}
                                <span className="font-mono">{state.courses.find(c => c.id === id)?.code ?? id}</span>
                              </span>
                            ))}
                          </span>
                        ))}
                      </div>
                    );
                  };
                  return (
                    <TableRow key={course.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-mono font-semibold text-sm text-primary">{course.code}</TableCell>
                      <TableCell className="font-medium">{course.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          course.type === 'Lec' ? 'border-blue-200 text-blue-700' :
                          course.type === 'Lab' ? 'border-purple-200 text-purple-700' :
                          course.type === 'Lec+Lab' ? 'border-green-200 text-green-700' :
                          course.type === 'Lec+Rec' ? 'border-teal-200 text-teal-700' :
                          course.type === 'Thesis' ? 'border-amber-200 text-amber-700' :
                          course.type === 'Thesis 1' ? 'border-amber-300 text-amber-800 bg-amber-50' :
                          course.type === 'Thesis 2' ? 'border-orange-300 text-orange-800 bg-orange-50' :
                          course.type === 'Internship' ? 'border-rose-200 text-rose-700' :
                          'border-orange-200 text-orange-700'
                        }>{course.type}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{course.units}</TableCell>
                      <TableCell className="text-sm text-gray-600">{course.department}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {course.category && course.category !== 'Major' && (
                            <Badge className={`text-xs ${
                              course.category === 'GE' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                              course.category === 'Elective GE' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                              course.category === 'HK/PE/NSTP' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' :
                              course.category === 'Specialized' ? 'bg-violet-100 text-violet-700 border-violet-200' :
                              course.category === 'Thesis' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                              'bg-gray-100 text-gray-700'
                            }`}>{course.category}</Badge>
                          )}
                          {(!course.category || course.category === 'Major') && (
                            <Badge className="text-xs bg-gray-100 text-gray-700 border-gray-200">Major</Badge>
                          )}
                          {course.isPE && <Badge className="bg-blue-100 text-blue-700 text-xs">PE</Badge>}
                          {course.isNSTP && <Badge className="bg-green-100 text-green-700 text-xs">NSTP</Badge>}
                          {course.requiresCOI && <Badge className="bg-amber-100 text-amber-700 text-xs border border-amber-200">COI</Badge>}
                          {course.requiresDeptConsent && <Badge className="bg-orange-100 text-orange-700 text-xs border border-orange-200">DC</Badge>}
                          {course.requiresOCSConsent && <Badge className="bg-red-100 text-red-700 text-xs border border-red-200">OCS</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {(course.prerequisites?.length ?? 0) > 0 && <div><span className="font-medium text-orange-700">Pre: </span>{renderGroups(course.prerequisites, 'text-orange-700')}</div>}
                          {(course.corequisites?.length ?? 0) > 0 && <div><span className="font-medium text-purple-700">Co: </span>{renderGroups(course.corequisites, 'text-purple-700')}</div>}
                          {course.minUnitsRequired != null && !course.isPE && !course.isNSTP && (
                            <div className="text-blue-700"><span className="font-medium">Min units: </span>{course.minUnitsRequired}</div>
                          )}
                          {course.minYearStanding && !course.isPE && !course.isNSTP && (
                            <div className="text-violet-700"><span className="font-medium">Min standing: </span>{course.minYearStanding}</div>
                          )}
                          {(!course.prerequisites?.length) && (!course.corequisites?.length) && !course.minUnitsRequired && !course.minYearStanding && <span className="text-gray-400">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => openEdit(course)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {course.code}?</AlertDialogTitle>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 text-white" onClick={() => deleteCourse(course.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <BookOpen className="w-8 h-8 opacity-30" />
                        <p className="text-sm font-medium">No courses found{dept ? ` for "${dept}"` : ''}.</p>
                        <p className="text-xs">Use <strong>Add Course</strong> to add one manually, or <strong>Import .csv</strong> to bulk-import from a spreadsheet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </div>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={open} onOpenChange={v => !v && setOpen(false)}>
          <DialogContent className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Edit Course' : 'Add New Course'}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Course Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. CS 301" /></div>
                <div>
                  <Label>Type *</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as CourseType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {([
                        ['Lec', 'Lecture'],
                        ['Lab', 'Laboratory'],
                        ['Recitation', 'Recitation'],
                        ['Lec+Lab', 'Lec + Lab'],
                        ['Lec+Rec', 'Lec + Rec'],
                        ['Thesis', 'Thesis (generic)'],
                        ['Thesis 1', 'Thesis Part 1  —  S/U only'],
                        ['Thesis 2', 'Thesis Part 2  —  Numeric grades'],
                        ['Internship', 'Internship / Practicum'],
                      ] as [CourseType, string][]).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as CourseCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['GE', 'Elective GE', 'HK/PE/NSTP', 'Major', 'Specialized', 'Thesis'] as CourseCategory[]).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Course Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Data Structures and Algorithms" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Units *</Label><Input type="number" min={1} max={6} value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} /></div>
              </div>
              {!form.isPE && !form.isNSTP && (
                <div>
                  <Label>Minimum Units Required Before Enlistment <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <p className="text-xs text-muted-foreground mb-1.5">Student must have passed at least this many total units before enlisting. Leave blank if no minimum.</p>
                  <Input
                    type="number" min={0} max={200}
                    placeholder="e.g. 60"
                    value={form.minUnitsRequired}
                    onChange={e => setForm(f => ({ ...f, minUnitsRequired: e.target.value }))}
                  />
                </div>
              )}
              {!form.isPE && !form.isNSTP && (
                <div>
                  <Label>Minimum Year Standing Required <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <p className="text-xs text-muted-foreground mb-1.5">Student must be at least this year classification (based on units passed) to enlist.</p>
                  <Select value={form.minYearStanding || '_none'} onValueChange={v => setForm(f => ({ ...f, minYearStanding: v === '_none' ? '' : v as typeof f.minYearStanding }))}>
                    <SelectTrigger><SelectValue placeholder="No minimum year standing" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— No minimum —</SelectItem>
                      <SelectItem value="Freshman">Freshman (&lt;25% of program units)</SelectItem>
                      <SelectItem value="Sophomore">Sophomore (25–50%)</SelectItem>
                      <SelectItem value="Junior">Junior (50–75%)</SelectItem>
                      <SelectItem value="Senior">Senior (≥75%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Department</Label>
                {dept ? (
                  <div className="flex items-center gap-2 mt-1.5 px-3 py-2 rounded-md border bg-muted/50 text-sm">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-foreground">{dept}</span>
                    <span className="text-xs text-muted-foreground ml-auto">Auto-filled from your account</span>
                  </div>
                ) : (
                  <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Computer Science" />
                )}
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2"><Switch checked={form.isPE} onCheckedChange={v => setForm(f => ({ ...f, isPE: v }))} /><Label>PE Course</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.isNSTP} onCheckedChange={v => setForm(f => ({ ...f, isNSTP: v }))} /><Label>NSTP Course</Label></div>
              </div>

              {/* Consent Requirements */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium block">Required Consents Before Enlistment</Label>
                <p className="text-xs text-muted-foreground">Students must have an approved consent before they can enlist in this course.</p>
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.requiresCOI} onCheckedChange={v => setForm(f => ({ ...f, requiresCOI: v }))} id="req-coi" />
                    <Label htmlFor="req-coi" className="text-sm cursor-pointer">Requires <span className="font-semibold text-amber-700">COI</span> (Consent of Instructor)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.requiresDeptConsent} onCheckedChange={v => setForm(f => ({ ...f, requiresDeptConsent: v }))} id="req-dc" />
                    <Label htmlFor="req-dc" className="text-sm cursor-pointer">Requires <span className="font-semibold text-orange-700">Dept Consent</span></Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.requiresOCSConsent} onCheckedChange={v => setForm(f => ({ ...f, requiresOCSConsent: v }))} id="req-ocs" />
                    <Label htmlFor="req-ocs" className="text-sm cursor-pointer">Requires <span className="font-semibold text-red-700">OCS Consent</span></Label>
                  </div>
                </div>
              </div>

              {/* Prerequisites */}
              <div>
                <div className="mb-2">
                  <Label className="text-sm font-medium block">Prerequisites</Label>
                  <p className="text-xs text-muted-foreground">Courses that must be passed. Groups are separated by <span className="font-semibold text-orange-600">OR</span> — students satisfy ANY one group. Courses within a group are <span className="font-semibold">AND</span> (all required).</p>
                </div>
                {form.prerequisites.length === 0 && <p className="text-xs text-muted-foreground italic mb-2">None set</p>}
                <div className="space-y-2">
                  {form.prerequisites.map((group, gi) => (
                    <div key={gi}>
                      {gi > 0 && (
                        <div className="flex items-center gap-2 my-1.5">
                          <div className="flex-1 border-t border-border" />
                          <span className="text-xs font-bold text-orange-600 px-1">OR</span>
                          <div className="flex-1 border-t border-border" />
                        </div>
                      )}
                      <div className="border border-orange-200 rounded-lg p-2 bg-orange-50/30 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1 min-h-[22px]">
                          {group.map((id, ci) => {
                            const c = state.courses.find(x => x.id === id);
                            return (
                              <span key={id} className="flex items-center gap-0.5">
                                {ci > 0 && <span className="text-xs font-semibold text-muted-foreground mx-1">AND</span>}
                                <Badge className="bg-orange-100 text-orange-800 border border-orange-200 gap-0.5 pr-1 text-xs">
                                  <span className="font-mono">{c?.code ?? id}</span>
                                  <button type="button" onClick={() => removePrereqFromGroup(gi, id)} className="hover:text-red-700 ml-0.5">
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </Badge>
                              </span>
                            );
                          })}
                          {group.length === 0 && <span className="text-xs text-muted-foreground italic">Empty — add a course below</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline flex items-center gap-0.5"
                            onClick={() => { setPrereqPickerGroupIdx(prereqPickerGroupIdx === gi ? null : gi); setReqSearch(''); }}
                          >
                            {prereqPickerGroupIdx === gi ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {prereqPickerGroupIdx === gi ? 'Close picker' : `Add${group.length > 0 ? ' AND course' : ' course'}`}
                          </button>
                          <span className="text-muted-foreground text-xs mx-1">·</span>
                          <button type="button" className="text-xs text-destructive hover:underline" onClick={() => removePrereqGroup(gi)}>
                            Remove group
                          </button>
                        </div>
                        {prereqPickerGroupIdx === gi && (
                          <div className="border rounded-md p-1.5 bg-background mt-1">
                            <Input placeholder="Search courses…" value={reqSearch} onChange={e => setReqSearch(e.target.value)} className="h-7 text-xs mb-1" />
                            <div className="max-h-28 overflow-y-auto space-y-0.5">
                              {availableForReq.filter(c =>
                                !group.includes(c.id) &&
                                (!reqSearch || c.code.toLowerCase().includes(reqSearch.toLowerCase()) || c.title.toLowerCase().includes(reqSearch.toLowerCase()))
                              ).map(c => (
                                <div key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-accent p-1 rounded" onClick={() => addPrereqToGroup(gi, c.id)}>
                                  <span className="text-xs font-mono text-primary">{c.code}</span>
                                  <span className="text-xs text-muted-foreground truncate">{c.title}</span>
                                </div>
                              ))}
                              {availableForReq.filter(c => !group.includes(c.id)).length === 0 && (
                                <p className="text-xs text-muted-foreground p-1">No more courses available.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2 h-7 text-xs gap-1 border-orange-200 text-orange-700 hover:bg-orange-50" onClick={addPrereqGroup}>
                  <Plus className="w-3 h-3" />
                  {form.prerequisites.length === 0 ? 'Add prerequisite' : 'Add OR alternative'}
                </Button>
              </div>

              {/* Corequisites */}
              <div>
                <div className="mb-2">
                  <Label className="text-sm font-medium block">Corequisites</Label>
                  <p className="text-xs text-muted-foreground">Courses that must be enrolled simultaneously. Groups are <span className="font-semibold text-purple-600">OR</span> — any one group is enough.</p>
                </div>
                {form.corequisites.length === 0 && <p className="text-xs text-muted-foreground italic mb-2">None set</p>}
                <div className="space-y-2">
                  {form.corequisites.map((group, gi) => (
                    <div key={gi}>
                      {gi > 0 && (
                        <div className="flex items-center gap-2 my-1.5">
                          <div className="flex-1 border-t border-border" />
                          <span className="text-xs font-bold text-purple-600 px-1">OR</span>
                          <div className="flex-1 border-t border-border" />
                        </div>
                      )}
                      <div className="border border-purple-200 rounded-lg p-2 bg-purple-50/30 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1 min-h-[22px]">
                          {group.map((id, ci) => {
                            const c = state.courses.find(x => x.id === id);
                            return (
                              <span key={id} className="flex items-center gap-0.5">
                                {ci > 0 && <span className="text-xs font-semibold text-muted-foreground mx-1">AND</span>}
                                <Badge className="bg-purple-100 text-purple-800 border border-purple-200 gap-0.5 pr-1 text-xs">
                                  <span className="font-mono">{c?.code ?? id}</span>
                                  <button type="button" onClick={() => removeCoreqFromGroup(gi, id)} className="hover:text-red-700 ml-0.5">
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </Badge>
                              </span>
                            );
                          })}
                          {group.length === 0 && <span className="text-xs text-muted-foreground italic">Empty — add a course below</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline flex items-center gap-0.5"
                            onClick={() => { setCoreqPickerGroupIdx(coreqPickerGroupIdx === gi ? null : gi); setCoreqSearch(''); }}
                          >
                            {coreqPickerGroupIdx === gi ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {coreqPickerGroupIdx === gi ? 'Close picker' : `Add${group.length > 0 ? ' AND course' : ' course'}`}
                          </button>
                          <span className="text-muted-foreground text-xs mx-1">·</span>
                          <button type="button" className="text-xs text-destructive hover:underline" onClick={() => removeCoreqGroup(gi)}>
                            Remove group
                          </button>
                        </div>
                        {coreqPickerGroupIdx === gi && (
                          <div className="border rounded-md p-1.5 bg-background mt-1">
                            <Input placeholder="Search courses…" value={coreqSearch} onChange={e => setCoreqSearch(e.target.value)} className="h-7 text-xs mb-1" />
                            <div className="max-h-28 overflow-y-auto space-y-0.5">
                              {availableForReq.filter(c =>
                                !group.includes(c.id) &&
                                (!coreqSearch || c.code.toLowerCase().includes(coreqSearch.toLowerCase()) || c.title.toLowerCase().includes(coreqSearch.toLowerCase()))
                              ).map(c => (
                                <div key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-accent p-1 rounded" onClick={() => addCoreqToGroup(gi, c.id)}>
                                  <span className="text-xs font-mono text-primary">{c.code}</span>
                                  <span className="text-xs text-muted-foreground truncate">{c.title}</span>
                                </div>
                              ))}
                              {availableForReq.filter(c => !group.includes(c.id)).length === 0 && (
                                <p className="text-xs text-muted-foreground p-1">No more courses available.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2 h-7 text-xs gap-1 border-purple-200 text-purple-700 hover:bg-purple-50" onClick={addCoreqGroup}>
                  <Plus className="w-3 h-3" />
                  {form.corequisites.length === 0 ? 'Add corequisite' : 'Add OR alternative'}
                </Button>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="flex-1 bg-primary text-white" onClick={handleSubmit}>{editing ? 'Save Changes' : 'Add Course'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={v => { if (!v) { setImportDialogOpen(false); setImportRows([]); setUpsertMode(false); } }}>
          <DialogContent className="w-full sm:max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Import Courses from CSV
              </DialogTitle>
            </DialogHeader>

            {importRows.length === 0 ? (
              /* ── Upload area (initial state) ── */
              <div className="flex flex-col gap-4 py-2">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-10 flex flex-col items-center gap-5 text-center bg-muted/20">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-semibold text-base text-foreground">Upload a CSV file with course data</p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Required:</span>{' '}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">Code</code>,{' '}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">Title</code>
                      {' · '}
                      <span className="font-medium text-foreground">Optional:</span>{' '}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">Type</code>,{' '}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">Category</code>,{' '}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">Units</code>,{' '}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">Department</code>,{' '}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">Prerequisites</code>...
                    </p>
                    {dept && (
                      <p className="text-sm text-orange-600 font-medium">
                        Department must match your assigned department name exactly.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3 flex-wrap justify-center">
                    <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4" /> Choose CSV File
                    </Button>
                    <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5" onClick={handleDownloadTemplate}>
                      <Download className="w-4 h-4" /> Download Template
                    </Button>
                  </div>
                </div>

                {/* Format guide */}
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 space-y-1.5">
                  <div className="font-semibold text-sm">CSV Column Reference</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
                    <div><code className="font-bold">Code</code> — Course code (required)</div>
                    <div><code className="font-bold">Title</code> — Course title (required)</div>
                    <div><code className="font-bold">Type</code> — Lec, Lab, Lec+Lab, Thesis, Internship…</div>
                    <div><code className="font-bold">Category</code> — Major, GE, Elective GE, HK/PE/NSTP…</div>
                    <div><code className="font-bold">Units</code> — Lecture units (number)</div>
                    <div><code className="font-bold">Lab Units</code> — Lab units if separate (number)</div>
                    <div><code className="font-bold">Department</code> — Department name</div>
                    <div><code className="font-bold">Is PE / Is NSTP</code> — Yes or No</div>
                    <div><code className="font-bold">Min Units</code> — Minimum units before enrolling</div>
                    <div><code className="font-bold">Min Standing</code> — Freshman / Sophomore / Junior / Senior</div>
                    <div><code className="font-bold">Prerequisites</code> — e.g. <code>CS101,CS102 OR CS110</code></div>
                    <div><code className="font-bold">Corequisites</code> — Same format as prerequisites</div>
                  </div>
                  <p className="text-blue-600 italic">
                    Prerequisite notation: comma = AND within a group, OR = alternative group. Example: "CS101,CS102 OR CS110" = (CS101 AND CS102) OR CS110
                  </p>
                </div>
              </div>
            ) : (
              /* ── Preview table (after file is parsed) ── */
              <div className="flex-1 overflow-hidden flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm text-muted-foreground">
                    Found <strong>{importRows.length}</strong> course{importRows.length !== 1 ? 's' : ''}.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Switch checked={upsertMode} onCheckedChange={setUpsertMode} />
                    <span className="text-sm font-medium">Update existing courses</span>
                    <span className="text-xs text-muted-foreground">{upsertMode ? '(existing will be overwritten)' : '(existing will be skipped)'}</span>
                  </label>
                </div>
                <div className="overflow-auto flex-1 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs py-2 whitespace-nowrap">Code</TableHead>
                        <TableHead className="text-xs py-2">Title</TableHead>
                        <TableHead className="text-xs py-2">Type</TableHead>
                        <TableHead className="text-xs py-2">Category</TableHead>
                        <TableHead className="text-xs py-2 text-center">Units</TableHead>
                        <TableHead className="text-xs py-2">Department</TableHead>
                        <TableHead className="text-xs py-2">Pre-req</TableHead>
                        <TableHead className="text-xs py-2">Co-req</TableHead>
                        <TableHead className="text-xs py-2 whitespace-nowrap">Min Standing</TableHead>
                        <TableHead className="text-xs py-2">Flags</TableHead>
                        <TableHead className="text-xs py-2">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importRows.map((row, i) => {
                        const isDuplicate = state.courses.some(c => c.code.toLowerCase() === row.code.toLowerCase());
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const r = row as any;
                        return (
                          <TableRow key={i} className={isDuplicate ? 'opacity-50' : ''}>
                            <TableCell className="text-xs font-mono font-semibold text-primary py-1.5 whitespace-nowrap">{row.code}</TableCell>
                            <TableCell className="text-xs py-1.5 max-w-[160px] truncate">{row.title}</TableCell>
                            <TableCell className="text-xs py-1.5">{row.type}</TableCell>
                            <TableCell className="text-xs py-1.5">{row.category}</TableCell>
                            <TableCell className="text-xs py-1.5 text-center">{row.units}{row.labUnits ? `+${row.labUnits}` : ''}</TableCell>
                            <TableCell className="text-xs py-1.5 max-w-[100px] truncate">{row.department}</TableCell>
                            <TableCell className="text-xs py-1.5 font-mono max-w-[120px] truncate text-orange-700">{r._prereqRaw || '—'}</TableCell>
                            <TableCell className="text-xs py-1.5 font-mono max-w-[120px] truncate text-purple-700">{r._coreqRaw || '—'}</TableCell>
                            <TableCell className="text-xs py-1.5 whitespace-nowrap">{row.minYearStanding || (row.minUnitsRequired ? `${row.minUnitsRequired}u` : '—')}</TableCell>
                            <TableCell className="text-xs py-1.5">
                              <div className="flex gap-1 flex-wrap">
                                {row.isPE && <Badge className="text-xs bg-blue-100 text-blue-700">PE</Badge>}
                                {row.isNSTP && <Badge className="text-xs bg-green-100 text-green-700">NSTP</Badge>}
                                {row.requiresCOI && <Badge className="text-xs bg-amber-100 text-amber-700">COI</Badge>}
                                {!row.isPE && !row.isNSTP && !row.requiresCOI && <span className="text-muted-foreground">—</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs py-1.5">
                              {isDuplicate
                                ? upsertMode
                                  ? <Badge className="text-xs bg-amber-100 text-amber-700">Update</Badge>
                                  : <Badge className="text-xs bg-orange-100 text-orange-700">Skip</Badge>
                                : <Badge className="text-xs bg-emerald-100 text-emerald-700">New</Badge>
                              }
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="gap-1" onClick={() => { setImportRows([]); setUpsertMode(false); fileInputRef.current?.click(); }}>
                    <X className="w-3.5 h-3.5" /> Choose Different File
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => { setImportDialogOpen(false); setImportRows([]); }}>Cancel</Button>
                  <Button
                    className="flex-1 bg-primary text-primary-foreground gap-2"
                    onClick={handleImportConfirm}
                    disabled={importing}
                  >
                    <Upload className="w-4 h-4" />
                    {importing ? 'Importing...' : (() => {
                      const newCount = importRows.filter(r => !state.courses.some(c => c.code.toLowerCase() === r.code.toLowerCase())).length;
                      const updateCount = upsertMode ? importRows.length - newCount : 0;
                      if (newCount > 0 && updateCount > 0) return `Add ${newCount} + Update ${updateCount}`;
                      if (newCount > 0) return `Import ${newCount} New Course${newCount !== 1 ? 's' : ''}`;
                      if (updateCount > 0) return `Update ${updateCount} Course${updateCount !== 1 ? 's' : ''}`;
                      return 'Nothing to Import';
                    })()}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
}
