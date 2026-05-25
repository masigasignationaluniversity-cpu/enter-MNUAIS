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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Building2, BookOpen, GraduationCap, AlertCircle } from 'lucide-react';
import type { College, Department, DegreeProgram } from '@/lib/types';

type CollegeForm = { name: string; abbreviation: string };
type DeptForm = { name: string; abbreviation: string; collegeId: string };
type ProgForm = { name: string; abbreviation: string; departmentId: string; totalUnits: string };

const emptyCollege: CollegeForm = { name: '', abbreviation: '' };
const emptyDept: DeptForm = { name: '', abbreviation: '', collegeId: '' };
const emptyProg: ProgForm = { name: '', abbreviation: '', departmentId: '', totalUnits: '' };

export default function AdminAcademicUnits() {
  const {
    state,
    addCollege, updateCollege, deleteCollege,
    addDepartment, updateDepartment, deleteDepartment,
    addDegreeProgram, updateDegreeProgram, deleteDegreeProgram,
  } = useApp();

  // College state
  const [collegeForm, setCollegeForm] = useState<CollegeForm>(emptyCollege);
  const [editCollege, setEditCollege] = useState<College | null>(null);
  const [collegeDialogOpen, setCollegeDialogOpen] = useState(false);
  const [collegeError, setCollegeError] = useState('');

  // Department state
  const [deptForm, setDeptForm] = useState<DeptForm>(emptyDept);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [deptError, setDeptError] = useState('');

  // Program state
  const [progForm, setProgForm] = useState<ProgForm>(emptyProg);
  const [editProg, setEditProg] = useState<DegreeProgram | null>(null);
  const [progDialogOpen, setProgDialogOpen] = useState(false);
  const [progError, setProgError] = useState('');

  // ── Colleges ──────────────────────────────────────────────
  const handleSaveCollege = () => {
    if (!collegeForm.name.trim() || !collegeForm.abbreviation.trim()) {
      setCollegeError('Name and abbreviation are required.');
      return;
    }
    if (editCollege) {
      updateCollege(editCollege.id, collegeForm);
    } else {
      addCollege(collegeForm);
    }
    setCollegeDialogOpen(false);
    setEditCollege(null);
    setCollegeForm(emptyCollege);
    setCollegeError('');
  };

  const openEditCollege = (col: College) => {
    setCollegeForm({ name: col.name, abbreviation: col.abbreviation });
    setEditCollege(col);
    setCollegeError('');
    setCollegeDialogOpen(true);
  };

  const openAddCollege = () => {
    setCollegeForm(emptyCollege);
    setEditCollege(null);
    setCollegeError('');
    setCollegeDialogOpen(true);
  };

  // ── Departments ───────────────────────────────────────────
  const handleSaveDept = () => {
    if (!deptForm.name.trim() || !deptForm.abbreviation.trim() || !deptForm.collegeId) {
      setDeptError('Name, abbreviation, and college are required.');
      return;
    }
    if (editDept) {
      updateDepartment(editDept.id, deptForm);
    } else {
      addDepartment(deptForm);
    }
    setDeptDialogOpen(false);
    setEditDept(null);
    setDeptForm(emptyDept);
    setDeptError('');
  };

  const openEditDept = (dept: Department) => {
    setDeptForm({ name: dept.name, abbreviation: dept.abbreviation, collegeId: dept.collegeId });
    setEditDept(dept);
    setDeptError('');
    setDeptDialogOpen(true);
  };

  const openAddDept = () => {
    setDeptForm(emptyDept);
    setEditDept(null);
    setDeptError('');
    setDeptDialogOpen(true);
  };

  // ── Degree Programs ───────────────────────────────────────
  const handleSaveProg = () => {
    if (!progForm.name.trim() || !progForm.abbreviation.trim() || !progForm.departmentId) {
      setProgError('Name, abbreviation, and department are required.');
      return;
    }
    if (editProg) {
      updateDegreeProgram(editProg.id, { ...progForm, totalUnits: progForm.totalUnits ? parseInt(progForm.totalUnits) : undefined });
    } else {
      addDegreeProgram({ ...progForm, totalUnits: progForm.totalUnits ? parseInt(progForm.totalUnits) : undefined });
    }
    setProgDialogOpen(false);
    setEditProg(null);
    setProgForm(emptyProg);
    setProgError('');
  };

  const openEditProg = (prog: DegreeProgram) => {
    setProgForm({ name: prog.name, abbreviation: prog.abbreviation, departmentId: prog.departmentId, totalUnits: prog.totalUnits != null ? String(prog.totalUnits) : '' });
    setEditProg(prog);
    setProgError('');
    setProgDialogOpen(true);
  };

  const openAddProg = () => {
    setProgForm(emptyProg);
    setEditProg(null);
    setProgError('');
    setProgDialogOpen(true);
  };

  return (
    <PortalLayout title="Academic Units">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Manage colleges, departments, and degree programs used across the system.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Colleges', count: state.colleges.length, icon: <Building2 className="w-5 h-5 text-primary" />, bg: 'bg-primary/5' },
            { label: 'Departments', count: state.departments.length, icon: <BookOpen className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50' },
            { label: 'Degree Programs', count: state.degreePrograms.length, icon: <GraduationCap className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50' },
          ].map(s => (
            <Card key={s.label} className={`${s.bg} border-0`}>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                {s.icon}
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.count}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="colleges">
          <TabsList className="bg-muted">
            <TabsTrigger value="colleges" className="flex items-center gap-1">
              <Building2 size={14} /> Colleges ({state.colleges.length})
            </TabsTrigger>
            <TabsTrigger value="departments" className="flex items-center gap-1">
              <BookOpen size={14} /> Departments ({state.departments.length})
            </TabsTrigger>
            <TabsTrigger value="programs" className="flex items-center gap-1">
              <GraduationCap size={14} /> Degree Programs ({state.degreePrograms.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Colleges Tab ── */}
          <TabsContent value="colleges" className="mt-4">
            <div className="flex justify-end mb-3">
              <Button className="bg-primary text-primary-foreground gap-2" onClick={openAddCollege}>
                <Plus className="w-4 h-4" /> Add College
              </Button>
            </div>
            {state.colleges.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">No colleges yet. Add one to get started.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {state.colleges.map(col => {
                  const deptCount = state.departments.filter(d => d.collegeId === col.id).length;
                  return (
                    <Card key={col.id} className="portal-card">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {col.abbreviation}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{col.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge className="text-xs bg-muted text-muted-foreground border-0">{col.abbreviation}</Badge>
                            <span className="text-xs text-muted-foreground">{deptCount} dept{deptCount !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => openEditCollege(col)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {col.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove the college. Departments and programs under it will need to be re-assigned.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteCollege(col.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Departments Tab ── */}
          <TabsContent value="departments" className="mt-4">
            <div className="flex justify-end mb-3">
              <Button className="bg-primary text-primary-foreground gap-2" onClick={openAddDept}>
                <Plus className="w-4 h-4" /> Add Department
              </Button>
            </div>
            {state.departments.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">No departments yet.</p>
            ) : (
              <div className="space-y-3">
                {state.colleges.map(col => {
                  const depts = state.departments.filter(d => d.collegeId === col.id);
                  if (depts.length === 0) return null;
                  return (
                    <div key={col.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        <p className="text-sm font-semibold text-foreground">{col.name}</p>
                        <Badge className="text-xs bg-primary/10 text-primary border-0">{col.abbreviation}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                        {depts.map(dept => {
                          const progCount = state.degreePrograms.filter(p => p.departmentId === dept.id).length;
                          return (
                            <Card key={dept.id} className="portal-card">
                              <CardContent className="p-3 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                  {dept.abbreviation}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{dept.name}</p>
                                  <span className="text-xs text-muted-foreground">{progCount} program{progCount !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => openEditDept(dept)}>
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10">
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete {dept.name}?</AlertDialogTitle>
                                        <AlertDialogDescription>This will remove the department. Programs under it will be unlinked.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteDepartment(dept.id)}>Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {/* Orphan departments (no college match) */}
                {state.departments.filter(d => !state.colleges.find(c => c.id === d.collegeId)).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 ml-1">Unassigned</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {state.departments.filter(d => !state.colleges.find(c => c.id === d.collegeId)).map(dept => (
                        <Card key={dept.id} className="portal-card border-dashed">
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-xs flex-shrink-0">{dept.abbreviation}</div>
                            <p className="flex-1 text-sm">{dept.name}</p>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => openEditDept(dept)}><Pencil className="w-3 h-3" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => deleteDepartment(dept.id)}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Degree Programs Tab ── */}
          <TabsContent value="programs" className="mt-4">
            <div className="flex justify-end mb-3">
              <Button className="bg-primary text-primary-foreground gap-2" onClick={openAddProg}>
                <Plus className="w-4 h-4" /> Add Degree Program
              </Button>
            </div>
            {state.degreePrograms.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">No degree programs yet.</p>
            ) : (
              <div className="space-y-4">
                {state.departments.map(dept => {
                  const progs = state.degreePrograms.filter(p => p.departmentId === dept.id);
                  if (progs.length === 0) return null;
                  const college = state.colleges.find(c => c.id === dept.collegeId);
                  return (
                    <div key={dept.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <p className="text-sm font-semibold text-foreground">{dept.name}</p>
                        {college && <Badge className="text-xs bg-blue-50 text-blue-700 border-0">{college.abbreviation}</Badge>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                        {progs.map(prog => (
                          <Card key={prog.id} className="portal-card">
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs flex-shrink-0 text-center leading-tight px-1">
                                {prog.abbreviation}
                              </div>
              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{prog.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {prog.abbreviation}
                                  {prog.totalUnits != null && <span className="ml-1">· {prog.totalUnits} units required</span>}
                                </p>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => openEditProg(prog)}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete {prog.name}?</AlertDialogTitle>
                                      <AlertDialogDescription>This will remove the degree program from the system.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteDegreeProgram(prog.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {/* Orphan programs */}
                {state.degreePrograms.filter(p => !state.departments.find(d => d.id === p.departmentId)).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Unassigned Programs</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {state.degreePrograms.filter(p => !state.departments.find(d => d.id === p.departmentId)).map(prog => (
                        <Card key={prog.id} className="portal-card border-dashed">
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-xs flex-shrink-0">{prog.abbreviation}</div>
                            <p className="flex-1 text-sm">{prog.name}</p>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => openEditProg(prog)}><Pencil className="w-3 h-3" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => deleteDegreeProgram(prog.id)}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── College Dialog ── */}
      <Dialog open={collegeDialogOpen} onOpenChange={v => { setCollegeDialogOpen(v); if (!v) { setEditCollege(null); setCollegeForm(emptyCollege); setCollegeError(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editCollege ? 'Edit College' : 'Add College'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label>College Name *</Label><Input value={collegeForm.name} onChange={e => setCollegeForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. College of Computer Studies" /></div>
            <div><Label>Abbreviation *</Label><Input value={collegeForm.abbreviation} onChange={e => setCollegeForm(f => ({ ...f, abbreviation: e.target.value }))} placeholder="e.g. CCS" /></div>
            {collegeError && <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 rounded p-2"><AlertCircle size={12} />{collegeError}</div>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setCollegeDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleSaveCollege}>{editCollege ? 'Save Changes' : 'Add College'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Department Dialog ── */}
      <Dialog open={deptDialogOpen} onOpenChange={v => { setDeptDialogOpen(v); if (!v) { setEditDept(null); setDeptForm(emptyDept); setDeptError(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label>Department Name *</Label><Input value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Computer Science" /></div>
            <div><Label>Abbreviation *</Label><Input value={deptForm.abbreviation} onChange={e => setDeptForm(f => ({ ...f, abbreviation: e.target.value }))} placeholder="e.g. CS" /></div>
            <div>
              <Label>College *</Label>
              <Select value={deptForm.collegeId} onValueChange={v => setDeptForm(f => ({ ...f, collegeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select college..." /></SelectTrigger>
                <SelectContent>
                  {state.colleges.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.abbreviation})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {deptError && <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 rounded p-2"><AlertCircle size={12} />{deptError}</div>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setDeptDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleSaveDept}>{editDept ? 'Save Changes' : 'Add Department'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Degree Program Dialog ── */}
      <Dialog open={progDialogOpen} onOpenChange={v => { setProgDialogOpen(v); if (!v) { setEditProg(null); setProgForm(emptyProg); setProgError(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editProg ? 'Edit Degree Program' : 'Add Degree Program'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label>Program Name *</Label><Input value={progForm.name} onChange={e => setProgForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. BS Computer Science" /></div>
            <div><Label>Abbreviation *</Label><Input value={progForm.abbreviation} onChange={e => setProgForm(f => ({ ...f, abbreviation: e.target.value }))} placeholder="e.g. BSCS" /></div>
            <div>
              <Label>Department *</Label>
              <Select value={progForm.departmentId} onValueChange={v => setProgForm(f => ({ ...f, departmentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
                <SelectContent>
                  {state.departments.map(d => {
                    const col = state.colleges.find(c => c.id === d.collegeId);
                    return <SelectItem key={d.id} value={d.id}>{d.name}{col ? ` (${col.abbreviation})` : ''}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Total Units Required to Graduate</Label>
              <Input
                type="number" min={0} max={500}
                value={progForm.totalUnits}
                onChange={e => setProgForm(f => ({ ...f, totalUnits: e.target.value }))}
                placeholder="e.g. 150 (used for year classification)"
              />
              <p className="text-xs text-muted-foreground mt-1">Used to determine Freshman / Sophomore / Junior / Senior standing.</p>
            </div>
            {progError && <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 rounded p-2"><AlertCircle size={12} />{progError}</div>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setProgDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleSaveProg}>{editProg ? 'Save Changes' : 'Add Program'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
