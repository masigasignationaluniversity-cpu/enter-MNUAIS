import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  units: '3', labUnits: '', department: '',
  isPE: false, isNSTP: false,
  requiresCOI: false, requiresDeptConsent: false, requiresOCSConsent: false,
  prerequisites: [] as string[],
  corequisites: [] as string[],
  minUnitsRequired: '',
};

export default function OCSCourses() {
  const { state, addCourse, updateCourse, deleteCourse } = useApp();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showPrereqPicker, setShowPrereqPicker] = useState(false);
  const [showCoreqPicker, setShowCoreqPicker] = useState(false);
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
    setShowPrereqPicker(false);
    setShowCoreqPicker(false);
    setReqSearch('');
    setCoreqSearch('');
    setOpen(true);
  };
  const openEdit = (c: Course) => {
    setForm({
      code: c.code, title: c.title, type: c.type,
      units: String(c.units), labUnits: String(c.labUnits ?? ''),
      department: c.department, isPE: c.isPE, isNSTP: c.isNSTP,
      requiresCOI: c.requiresCOI ?? false,
      requiresDeptConsent: c.requiresDeptConsent ?? false,
      requiresOCSConsent: c.requiresOCSConsent ?? false,
      prerequisites: c.prerequisites ?? [],
      corequisites: c.corequisites ?? [],
      minUnitsRequired: c.minUnitsRequired != null ? String(c.minUnitsRequired) : '',
    });
    setEditing(c);
    setShowPrereqPicker(false);
    setShowCoreqPicker(false);
    setReqSearch('');
    setCoreqSearch('');
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.code || !form.title) return;
    const data = {
      code: form.code.trim(), title: form.title.trim(),
      type: form.type, units: parseInt(form.units) || 3,
      labUnits: form.type === 'Lab' || form.type === 'Lec+Lab' ? (parseInt(form.labUnits) || undefined) : undefined,
      department: form.department.trim(), isPE: form.isPE, isNSTP: form.isNSTP,
      requiresCOI: form.requiresCOI,
      requiresDeptConsent: form.requiresDeptConsent,
      requiresOCSConsent: form.requiresOCSConsent,
      prerequisites: form.prerequisites,
      corequisites: form.corequisites,
      minUnitsRequired: (!form.isPE && !form.isNSTP && form.minUnitsRequired) ? (parseInt(form.minUnitsRequired) || undefined) : undefined,
    };
    if (editing) {
      updateCourse(editing.id, data);
    } else {
      addCourse(data);
    }
    setOpen(false);
  };

  const togglePrereq = (courseId: string) => {
    setForm(f => ({
      ...f,
      prerequisites: f.prerequisites.includes(courseId)
        ? f.prerequisites.filter(x => x !== courseId)
        : [...f.prerequisites, courseId],
    }));
  };

  const toggleCoreq = (courseId: string) => {
    setForm(f => ({
      ...f,
      corequisites: f.corequisites.includes(courseId)
        ? f.corequisites.filter(x => x !== courseId)
        : [...f.corequisites, courseId],
    }));
  };

  const availableForReq = state.courses.filter(c =>
    (form.department ? c.department === form.department : false) &&
    (editing ? c.id !== editing.id : true)
  );

  return (
    <PortalLayout role="ocs" userName={state.currentUser?.name ?? ''}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" /> Course Management
            </h1>
            <p className="text-gray-600 mt-1">{filtered.length} {dept ? `${dept} ` : ''}courses</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search courses..." className="pl-9 w-52" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button className="bg-primary text-white gap-2" onClick={openAdd}>
              <Plus className="w-4 h-4" /> Add Course
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
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
                  const prereqs = (course.prerequisites ?? []).map(id => state.courses.find(c => c.id === id)?.code).filter(Boolean);
                  const coreqs = (course.corequisites ?? []).map(id => state.courses.find(c => c.id === id)?.code).filter(Boolean);
                  return (
                    <TableRow key={course.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-mono font-semibold text-sm text-primary">{course.code}</TableCell>
                      <TableCell className="font-medium">{course.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          course.type === 'Lec' ? 'border-blue-200 text-blue-700' :
                          course.type === 'Lab' ? 'border-purple-200 text-purple-700' :
                          course.type === 'Lec+Lab' ? 'border-green-200 text-green-700' :
                          'border-orange-200 text-orange-700'
                        }>{course.type}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{course.units}{course.labUnits ? `+${course.labUnits}` : ''}</TableCell>
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
                          {prereqs.length > 0 && <div className="text-orange-700"><span className="font-medium">Pre: </span>{prereqs.join(', ')}</div>}
                          {coreqs.length > 0 && <div className="text-purple-700"><span className="font-medium">Co: </span>{coreqs.join(', ')}</div>}
                          {course.minUnitsRequired != null && !course.isPE && !course.isNSTP && (
                            <div className="text-blue-700"><span className="font-medium">Min units: </span>{course.minUnitsRequired}</div>
                          )}
                          {prereqs.length === 0 && coreqs.length === 0 && !course.minUnitsRequired && <span className="text-gray-400">—</span>}
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
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={open} onOpenChange={v => !v && setOpen(false)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Edit Course' : 'Add New Course'}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Course Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. CS 301" /></div>
                <div>
                  <Label>Type *</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as CourseType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['Lec','Lab','Recitation','Lec+Lab'] as CourseType[]).map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Course Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Data Structures and Algorithms" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Units *</Label><Input type="number" min={1} max={6} value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} /></div>
                {(form.type === 'Lab' || form.type === 'Lec+Lab') && (
                  <div><Label>Lab Units</Label><Input type="number" min={1} max={3} value={form.labUnits} onChange={e => setForm(f => ({ ...f, labUnits: e.target.value }))} /></div>
                )}
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
                <div className="mb-1">
                  <Label className="text-sm font-medium block">Prerequisites</Label>
                  <p className="text-xs text-muted-foreground">Courses that must be passed before enrolling. Referenced in COI, Dept Consent &amp; OCS Consent processing.</p>
                </div>
                {/* Selected badges */}
                {form.prerequisites.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {form.prerequisites.map(id => {
                      const c = state.courses.find(x => x.id === id);
                      return (
                        <Badge key={id} className="bg-orange-100 text-orange-800 border border-orange-200 gap-1 pr-1">
                          <span className="font-mono">{c?.code ?? id}</span>
                          <button type="button" onClick={() => togglePrereq(id)} className="hover:text-red-700 ml-0.5">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                ) : (
                  !showPrereqPicker && <p className="text-xs text-muted-foreground italic mb-2">None set</p>
                )}
                {/* Picker toggle */}
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setShowPrereqPicker(v => !v); setReqSearch(''); }}>
                  {showPrereqPicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showPrereqPicker ? 'Hide list' : 'Add prerequisite'}
                </Button>
                {showPrereqPicker && (
                  <div className="mt-2 border rounded-lg p-2 space-y-1 bg-background">
                    <Input placeholder="Search courses…" value={reqSearch} onChange={e => setReqSearch(e.target.value)} className="h-7 text-xs mb-1" />
                    <div className="max-h-36 overflow-y-auto space-y-0.5">
                      {availableForReq.filter(c => !reqSearch || c.code.toLowerCase().includes(reqSearch.toLowerCase()) || c.title.toLowerCase().includes(reqSearch.toLowerCase())).map(c => (
                        <div key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-accent p-1 rounded" onClick={() => togglePrereq(c.id)}>
                          <input type="checkbox" readOnly checked={form.prerequisites.includes(c.id)} className="pointer-events-none" />
                          <span className="text-sm font-mono text-primary">{c.code}</span>
                          <span className="text-xs text-muted-foreground truncate">{c.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Corequisites */}
              <div>
                <div className="mb-1">
                  <Label className="text-sm font-medium block">Corequisites</Label>
                  <p className="text-xs text-muted-foreground">Courses that must be enrolled simultaneously. Also referenced in consent processing.</p>
                </div>
                {/* Selected badges */}
                {form.corequisites.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {form.corequisites.map(id => {
                      const c = state.courses.find(x => x.id === id);
                      return (
                        <Badge key={id} className="bg-purple-100 text-purple-800 border border-purple-200 gap-1 pr-1">
                          <span className="font-mono">{c?.code ?? id}</span>
                          <button type="button" onClick={() => toggleCoreq(id)} className="hover:text-red-700 ml-0.5">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                ) : (
                  !showCoreqPicker && <p className="text-xs text-muted-foreground italic mb-2">None set</p>
                )}
                {/* Picker toggle */}
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setShowCoreqPicker(v => !v); setCoreqSearch(''); }}>
                  {showCoreqPicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showCoreqPicker ? 'Hide list' : 'Add corequisite'}
                </Button>
                {showCoreqPicker && (
                  <div className="mt-2 border rounded-lg p-2 space-y-1 bg-background">
                    <Input placeholder="Search courses…" value={coreqSearch} onChange={e => setCoreqSearch(e.target.value)} className="h-7 text-xs mb-1" />
                    <div className="max-h-36 overflow-y-auto space-y-0.5">
                      {availableForReq.filter(c => !coreqSearch || c.code.toLowerCase().includes(coreqSearch.toLowerCase()) || c.title.toLowerCase().includes(coreqSearch.toLowerCase())).map(c => (
                        <div key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-accent p-1 rounded" onClick={() => toggleCoreq(c.id)}>
                          <input type="checkbox" readOnly checked={form.corequisites.includes(c.id)} className="pointer-events-none" />
                          <span className="text-sm font-mono text-primary">{c.code}</span>
                          <span className="text-xs text-muted-foreground truncate">{c.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
