import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Building2, BookOpen, GraduationCap, AlertCircle, Search } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { College, Department, DegreeProgram } from '@/lib/types';

type CollegeForm = { name: string; abbreviation: string };
type DeptForm = { name: string; abbreviation: string; collegeId: string };
type ProgForm = { name: string; abbreviation: string; collegeId: string; totalUnits: string; degreeType: string };

const emptyCollege: CollegeForm = { name: '', abbreviation: '' };
const emptyDept: DeptForm = { name: '', abbreviation: '', collegeId: '' };
const emptyProg: ProgForm = { name: '', abbreviation: '', collegeId: '', totalUnits: '', degreeType: '' };

const degreeLabel = (type?: string) => {
  if (type === 'bachelors') return "Bachelor's";
  if (type === 'masters') return "Master's";
  if (type === 'doctorate') return 'Doctorate';
  if (type === 'associate_certificate') return 'Associate / Certificate';
  return null;
};

export default function AdminAcademicUnits() {
  const {
    state,
    addCollege, updateCollege, deleteCollege,
    addDepartment, updateDepartment, deleteDepartment,
    addDegreeProgram, updateDegreeProgram, deleteDegreeProgram,
  } = useApp();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('colleges');

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
      setCollegeError('Name and abbreviation are required.'); return;
    }
    if (editCollege) { updateCollege(editCollege.id, collegeForm); toast.success('College updated'); }
    else { addCollege(collegeForm); toast.success('College added'); }
    setCollegeDialogOpen(false); setEditCollege(null); setCollegeForm(emptyCollege); setCollegeError('');
  };

  const openEditCollege = (col: College) => { setCollegeForm({ name: col.name, abbreviation: col.abbreviation }); setEditCollege(col); setCollegeError(''); setCollegeDialogOpen(true); };
  const openAddCollege = () => { setCollegeForm(emptyCollege); setEditCollege(null); setCollegeError(''); setCollegeDialogOpen(true); };

  // ── Departments ───────────────────────────────────────────
  const handleSaveDept = () => {
    if (!deptForm.name.trim() || !deptForm.abbreviation.trim() || !deptForm.collegeId) {
      setDeptError('Name, abbreviation, and college are required.'); return;
    }
    if (editDept) { updateDepartment(editDept.id, deptForm); toast.success('Department updated'); }
    else { addDepartment(deptForm); toast.success('Department added'); }
    setDeptDialogOpen(false); setEditDept(null); setDeptForm(emptyDept); setDeptError('');
  };

  const openEditDept = (dept: Department) => { setDeptForm({ name: dept.name, abbreviation: dept.abbreviation, collegeId: dept.collegeId }); setEditDept(dept); setDeptError(''); setDeptDialogOpen(true); };
  const openAddDept = () => { setDeptForm(emptyDept); setEditDept(null); setDeptError(''); setDeptDialogOpen(true); };

  // ── Degree Programs ───────────────────────────────────────
  const handleSaveProg = () => {
    if (!progForm.name.trim() || !progForm.abbreviation.trim() || !progForm.collegeId) {
      setProgError('Name, abbreviation, and college are required.'); return;
    }
    const data = { ...progForm, totalUnits: progForm.totalUnits ? parseInt(progForm.totalUnits) : undefined, degreeType: (progForm.degreeType as DegreeProgram['degreeType']) || undefined };
    if (editProg) { updateDegreeProgram(editProg.id, data); toast.success('Degree program updated'); }
    else { addDegreeProgram(data); toast.success('Degree program added'); }
    setProgDialogOpen(false); setEditProg(null); setProgForm(emptyProg); setProgError('');
  };

  const openEditProg = (prog: DegreeProgram) => { setProgForm({ name: prog.name, abbreviation: prog.abbreviation, collegeId: prog.collegeId ?? '', totalUnits: prog.totalUnits != null ? String(prog.totalUnits) : '', degreeType: prog.degreeType ?? '' }); setEditProg(prog); setProgError(''); setProgDialogOpen(true); };
  const openAddProg = () => { setProgForm(emptyProg); setEditProg(null); setProgError(''); setProgDialogOpen(true); };

  // ── Filtered data ─────────────────────────────────────────
  const q = search.trim().toLowerCase();
  const filteredColleges = q ? state.colleges.filter(c => c.name.toLowerCase().includes(q) || c.abbreviation.toLowerCase().includes(q)) : state.colleges;
  const filteredDepts = q ? state.departments.filter(d => d.name.toLowerCase().includes(q) || d.abbreviation.toLowerCase().includes(q)) : state.departments;
  const filteredProgs = q ? state.degreePrograms.filter(p => p.name.toLowerCase().includes(q) || p.abbreviation.toLowerCase().includes(q)) : state.degreePrograms;

  const handleAdd = () => {
    if (activeTab === 'colleges') openAddCollege();
    else if (activeTab === 'departments') openAddDept();
    else openAddProg();
  };

  const addLabel = activeTab === 'colleges' ? 'Add College' : activeTab === 'departments' ? 'Add Department' : 'Add Degree Program';

  return (
    <PortalLayout title="Academic Units">
      <div className="space-y-5">

        {/* Top bar */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="relative flex-1 min-w-0 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search colleges, departments, or programs..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 ml-auto" onClick={handleAdd}>
            <Plus className="w-4 h-4" /> {addLabel}
          </Button>
        </div>

        {/* Stat cards — Rooms style */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-sm">
          <div className="portal-panel overflow-hidden">
            <div className="portal-panel-header"><span className="text-xs font-bold">Colleges</span><Building2 className="w-4 h-4" /></div>
            <div className="px-3 py-3 bg-background"><p className="text-2xl font-bold text-foreground">{state.colleges.length}</p></div>
          </div>
          <div className="portal-panel overflow-hidden">
            <div className="portal-panel-header"><span className="text-xs font-bold">Departments</span><BookOpen className="w-4 h-4" /></div>
            <div className="px-3 py-3 bg-background"><p className="text-2xl font-bold text-foreground">{state.departments.length}</p></div>
          </div>
          <div className="portal-panel overflow-hidden">
            <div className="portal-panel-header"><span className="text-xs font-bold">Programs</span><GraduationCap className="w-4 h-4" /></div>
            <div className="px-3 py-3 bg-background"><p className="text-2xl font-bold text-foreground">{state.degreePrograms.length}</p></div>
          </div>
        </div>

        <Tabs defaultValue="colleges" onValueChange={setActiveTab}>
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
            {filteredColleges.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border py-16 text-center">
                <Building2 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">{q ? `No colleges match "${q}"` : 'No colleges yet'}</p>
                {!q && <Button className="mt-4 gap-2" onClick={openAddCollege}><Plus className="w-4 h-4" /> Add First College</Button>}
              </div>
            ) : (
              <div className="portal-panel overflow-hidden">
                <div className="portal-panel-header">
                  <Building2 className="w-4 h-4" />
                  Colleges
                  <Badge className="ml-1 bg-primary-foreground/15 text-primary-foreground border-0 text-xs">{filteredColleges.length}</Badge>
                </div>
                <div className="p-4 bg-background">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredColleges.map(col => {
                      const deptCount = state.departments.filter(d => d.collegeId === col.id).length;
                      const progCount = state.degreePrograms.filter(p => p.collegeId === col.id).length;
                      return (
                        <div key={col.id} className="flex items-start justify-between p-3 rounded-lg border border-border bg-muted/20">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                              {col.abbreviation}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{col.name}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <Badge className="text-xs bg-muted text-muted-foreground border-0">{col.abbreviation}</Badge>
                                <span className="text-xs text-muted-foreground">{deptCount} dept{deptCount !== 1 ? 's' : ''}</span>
                                <span className="text-xs text-muted-foreground">{progCount} program{progCount !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => openEditCollege(col)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"><Trash2 className="w-3 h-3" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete {col.name}?</AlertDialogTitle>
                                  <AlertDialogDescription>This will remove the college. Departments and programs under it will need to be re-assigned.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { deleteCollege(col.id); toast.success('College deleted'); }}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Departments Tab ── */}
          <TabsContent value="departments" className="mt-4 space-y-3">
            {filteredDepts.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border py-16 text-center">
                <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">{q ? `No departments match "${q}"` : 'No departments yet'}</p>
                {!q && <Button className="mt-4 gap-2" onClick={openAddDept}><Plus className="w-4 h-4" /> Add First Department</Button>}
              </div>
            ) : (
              <>
                {state.colleges.map(col => {
                  const depts = filteredDepts.filter(d => d.collegeId === col.id);
                  if (depts.length === 0) return null;
                  return (
                    <div key={col.id} className="portal-panel overflow-hidden">
                      <div className="portal-panel-header">
                        <Building2 className="w-4 h-4" />
                        {col.name}
                        <Badge className="ml-1 bg-primary-foreground/15 text-primary-foreground border-0 text-xs">{depts.length} dept{depts.length !== 1 ? 's' : ''}</Badge>
                      </div>
                      <div className="p-4 bg-background">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {depts.map(dept => (
                            <div key={dept.id} className="flex items-start justify-between p-3 rounded-lg border border-border bg-muted/20">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                  {dept.abbreviation}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{dept.name}</p>
                                  <span className="text-xs text-muted-foreground">{dept.abbreviation}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => openEditDept(dept)}><Pencil className="w-3 h-3" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"><Trash2 className="w-3 h-3" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete {dept.name}?</AlertDialogTitle>
                                      <AlertDialogDescription>This will remove the department. Programs under it will be unlinked.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { deleteDepartment(dept.id); toast.success('Department deleted'); }}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Orphan departments */}
                {filteredDepts.filter(d => !state.colleges.find(c => c.id === d.collegeId)).length > 0 && (
                  <div className="rounded-xl border border-amber-300 overflow-hidden">
                    <div className="bg-amber-500 text-white px-4 py-2.5 font-bold text-sm flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> Unassigned Departments
                    </div>
                    <div className="p-4 bg-background grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredDepts.filter(d => !state.colleges.find(c => c.id === d.collegeId)).map(dept => (
                        <div key={dept.id} className="flex items-start justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-xs flex-shrink-0">{dept.abbreviation}</div>
                            <p className="font-medium text-sm truncate">{dept.name}</p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => openEditDept(dept)}><Pencil className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => { deleteDepartment(dept.id); toast.success('Department deleted'); }}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Degree Programs Tab ── */}
          <TabsContent value="programs" className="mt-4 space-y-3">
            {filteredProgs.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border py-16 text-center">
                <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">{q ? `No programs match "${q}"` : 'No degree programs yet'}</p>
                {!q && <Button className="mt-4 gap-2" onClick={openAddProg}><Plus className="w-4 h-4" /> Add First Degree Program</Button>}
              </div>
            ) : (
              <>
                {state.colleges.map(college => {
                  const progs = filteredProgs.filter(p => p.collegeId === college.id);
                  if (progs.length === 0) return null;
                  return (
                    <div key={college.id} className="portal-panel overflow-hidden">
                      <div className="portal-panel-header">
                        <GraduationCap className="w-4 h-4" />
                        {college.name}
                        <Badge className="ml-1 bg-primary-foreground/15 text-primary-foreground border-0 text-xs">{progs.length} program{progs.length !== 1 ? 's' : ''}</Badge>
                      </div>
                      <div className="p-4 bg-background">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {progs.map(prog => (
                            <div key={prog.id} className="flex items-start justify-between p-3 rounded-lg border border-border bg-muted/20">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs flex-shrink-0 text-center leading-tight px-1">
                                  {prog.abbreviation}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{prog.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {prog.abbreviation}
                                    {prog.totalUnits != null && <span className="ml-1">· {prog.totalUnits} units</span>}
                                  </p>
                                  {degreeLabel(prog.degreeType) && (
                                    <Badge className="text-xs mt-0.5 bg-purple-100 text-purple-700 border-purple-200">
                                      {degreeLabel(prog.degreeType)}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => openEditProg(prog)}><Pencil className="w-3 h-3" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"><Trash2 className="w-3 h-3" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete {prog.name}?</AlertDialogTitle>
                                      <AlertDialogDescription>This will remove the degree program from the system.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { deleteDegreeProgram(prog.id); toast.success('Program deleted'); }}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Unassigned programs */}
                {filteredProgs.filter(p => !p.collegeId).length > 0 && (
                  <div className="rounded-xl border border-amber-300 overflow-hidden">
                    <div className="bg-amber-500 text-white px-4 py-2.5 font-bold text-sm flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" /> Unassigned Programs
                    </div>
                    <div className="p-4 bg-background grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredProgs.filter(p => !p.collegeId).map(prog => (
                        <div key={prog.id} className="flex items-start justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-xs flex-shrink-0">{prog.abbreviation}</div>
                            <p className="font-medium text-sm truncate">{prog.name}</p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => openEditProg(prog)}><Pencil className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => { deleteDegreeProgram(prog.id); toast.success('Program deleted'); }}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── College Dialog ── */}
      <Dialog open={collegeDialogOpen} onOpenChange={v => { setCollegeDialogOpen(v); if (!v) { setEditCollege(null); setCollegeForm(emptyCollege); setCollegeError(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editCollege ? 'Edit College' : 'Add College'}</DialogTitle></DialogHeader>
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
          <DialogHeader><DialogTitle>{editDept ? 'Edit Department' : 'Add Department'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label>Department Name *</Label><Input value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Computer Science" /></div>
            <div><Label>Abbreviation *</Label><Input value={deptForm.abbreviation} onChange={e => setDeptForm(f => ({ ...f, abbreviation: e.target.value }))} placeholder="e.g. CS" /></div>
            <div>
              <Label>College *</Label>
              <SearchableSelect
                value={deptForm.collegeId}
                onValueChange={v => setDeptForm(f => ({ ...f, collegeId: v }))}
                placeholder="Select college..."
                options={state.colleges.map(col => ({ value: col.id, label: col.name }))}
              />
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
          <DialogHeader><DialogTitle>{editProg ? 'Edit Degree Program' : 'Add Degree Program'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label>Program Name *</Label><Input value={progForm.name} onChange={e => setProgForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. BS Computer Science" /></div>
            <div><Label>Abbreviation *</Label><Input value={progForm.abbreviation} onChange={e => setProgForm(f => ({ ...f, abbreviation: e.target.value }))} placeholder="e.g. BSCS" /></div>
            <div>
              <Label>College *</Label>
              <SearchableSelect
                value={progForm.collegeId}
                onValueChange={v => setProgForm(f => ({ ...f, collegeId: v }))}
                placeholder="Select college..."
                options={state.colleges.map(col => ({ value: col.id, label: col.name }))}
              />
            </div>
            <div>
              <Label>Total Units Required to Graduate</Label>
              <Input type="number" min={0} max={500} value={progForm.totalUnits} onChange={e => setProgForm(f => ({ ...f, totalUnits: e.target.value }))} placeholder="e.g. 150" />
              <p className="text-xs text-muted-foreground mt-1">Used to determine Freshman / Sophomore / Junior / Senior standing.</p>
            </div>
            <div>
              <Label>Degree Type</Label>
              <SearchableSelect
                value={progForm.degreeType}
                onValueChange={v => setProgForm(f => ({ ...f, degreeType: v }))}
                placeholder="Select degree type..."
                options={[
                  { value: 'bachelors', label: "Bachelor's Degree" },
                  { value: 'masters', label: "Master's Degree" },
                  { value: 'doctorate', label: 'Doctorate / PhD' },
                  { value: 'associate_certificate', label: 'Associate Degree' },
                ]}
              />
              <p className="text-xs text-muted-foreground mt-1">Affects standing classification and plan of study options.</p>
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
