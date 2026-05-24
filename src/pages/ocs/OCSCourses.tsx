import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2, BookOpen } from 'lucide-react';
import type { Course, CourseType } from '@/lib/types';

const emptyForm = {
  code: '', title: '', type: 'Lec' as CourseType,
  units: '3', labUnits: '', department: '',
  isPE: false, isNSTP: false,
  prerequisites: [] as string[],
  corequisites: [] as string[],
};

export default function OCSCourses() {
  const { state, addCourse, updateCourse, deleteCourse } = useApp();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(emptyForm);

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
    setOpen(true);
  };
  const openEdit = (c: Course) => {
    setForm({
      code: c.code, title: c.title, type: c.type,
      units: String(c.units), labUnits: String(c.labUnits ?? ''),
      department: c.department, isPE: c.isPE, isNSTP: c.isNSTP,
      prerequisites: c.prerequisites ?? [],
      corequisites: c.corequisites ?? [],
    });
    setEditing(c);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.code || !form.title) return;
    const data = {
      code: form.code.trim(), title: form.title.trim(),
      type: form.type, units: parseInt(form.units) || 3,
      labUnits: form.type === 'Lab' || form.type === 'Lec+Lab' ? (parseInt(form.labUnits) || undefined) : undefined,
      department: form.department.trim(), isPE: form.isPE, isNSTP: form.isNSTP,
      prerequisites: form.prerequisites,
      corequisites: form.corequisites,
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

  const availableForReq = state.courses.filter(c => editing ? c.id !== editing.id : true);

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
                        <div className="flex gap-1">
                          {course.isPE && <Badge className="bg-blue-100 text-blue-700 text-xs">PE</Badge>}
                          {course.isNSTP && <Badge className="bg-green-100 text-green-700 text-xs">NSTP</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {prereqs.length > 0 && <div className="text-orange-700"><span className="font-medium">Pre: </span>{prereqs.join(', ')}</div>}
                          {coreqs.length > 0 && <div className="text-purple-700"><span className="font-medium">Co: </span>{coreqs.join(', ')}</div>}
                          {prereqs.length === 0 && coreqs.length === 0 && <span className="text-gray-400">—</span>}
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
              <div><Label>Department *</Label><Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} readOnly={!!dept} className={dept ? 'bg-gray-50 cursor-not-allowed' : ''} /></div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2"><Switch checked={form.isPE} onCheckedChange={v => setForm(f => ({ ...f, isPE: v }))} /><Label>PE Course</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.isNSTP} onCheckedChange={v => setForm(f => ({ ...f, isNSTP: v }))} /><Label>NSTP Course</Label></div>
              </div>

              {/* Prerequisites */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Prerequisites (must pass before enrolling)</Label>
                <div className="border rounded-lg p-3 max-h-36 overflow-y-auto space-y-1">
                  {availableForReq.map(c => (
                    <div key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded" onClick={() => togglePrereq(c.id)}>
                      <input type="checkbox" readOnly checked={form.prerequisites.includes(c.id)} className="pointer-events-none" />
                      <span className="text-sm font-mono text-primary">{c.code}</span>
                      <span className="text-xs text-gray-500">{c.title}</span>
                    </div>
                  ))}
                </div>
                {form.prerequisites.length > 0 && (
                  <p className="text-xs text-orange-600 mt-1">Selected: {form.prerequisites.map(id => state.courses.find(c => c.id === id)?.code).join(', ')}</p>
                )}
              </div>

              {/* Corequisites */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Corequisites (must be enrolled simultaneously)</Label>
                <div className="border rounded-lg p-3 max-h-36 overflow-y-auto space-y-1">
                  {availableForReq.map(c => (
                    <div key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded" onClick={() => toggleCoreq(c.id)}>
                      <input type="checkbox" readOnly checked={form.corequisites.includes(c.id)} className="pointer-events-none" />
                      <span className="text-sm font-mono text-primary">{c.code}</span>
                      <span className="text-xs text-gray-500">{c.title}</span>
                    </div>
                  ))}
                </div>
                {form.corequisites.length > 0 && (
                  <p className="text-xs text-purple-600 mt-1">Selected: {form.corequisites.map(id => state.courses.find(c => c.id === id)?.code).join(', ')}</p>
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
