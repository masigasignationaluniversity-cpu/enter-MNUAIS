import { useState } from 'react';
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
import { Plus, Search, Pencil, Trash2, BookOpen, Lock, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { Course, CourseType } from '@/lib/types';

const emptyForm = {
  code: '', title: '', type: 'Lec' as CourseType,
  units: '3', department: '',
  isPE: false, isNSTP: false,
  requiresCOI: false, requiresDeptConsent: false, requiresOCSConsent: false,
  prerequisites: [] as string[][],
  corequisites: [] as string[][],
  minUnitsRequired: '',
  minYearStanding: '' as '' | 'Freshman' | 'Sophomore' | 'Junior' | 'Senior',
};

export default function OCSCourses() {
  const { state, addCourse, updateCourse, deleteCourse } = useApp();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [prereqPickerGroupIdx, setPrereqPickerGroupIdx] = useState<number | null>(null);
  const [coreqPickerGroupIdx, setCoreqPickerGroupIdx] = useState<number | null>(null);
  const [reqSearch, setReqSearch] = useState('');
  const [coreqSearch, setCoreqSearch] = useState('');

  const dept = state.currentUser?.department ?? '';

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
      type: form.type, units: parseInt(form.units) || 3,
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


  return (
    <PortalLayout role="ocs" userName={state.currentUser?.name ?? ''}>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search courses..." className="pl-9 w-full sm:w-52" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button className="bg-primary text-white gap-2 flex-shrink-0" onClick={openAdd}>
              <Plus className="w-4 h-4" /> Add Course
            </Button>
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
                          course.type === 'Internship' ? 'border-rose-200 text-rose-700' :
                          'border-orange-200 text-orange-700'
                        }>{course.type}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{course.units}</TableCell>
                      <TableCell className="text-sm text-gray-600">{course.department}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
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
                  <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">No courses found.</TableCell></TableRow>
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
                        ['Thesis', 'Thesis'],
                        ['Internship', 'Internship / Practicum'],
                      ] as [CourseType, string][]).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
      </div>
    </PortalLayout>
  );
}
