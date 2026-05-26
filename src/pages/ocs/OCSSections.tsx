import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { PlusCircle, Users, Clock, MapPin, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { Day, Section } from '../../lib/types';

const DAYS: Day[] = ['M', 'T', 'W', 'Th', 'F', 'S'];
const TIMES = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'];

type SectionForm = {
  courseId: string; facultyId: string; sectionCode: string; slots: number;
  days: Day[]; startTime: string; endTime: string; room: string;
  hasLab: boolean; labDays: Day[]; labStart: string; labEnd: string; labRoom: string;
};

const emptyForm: SectionForm = {
  courseId: '', facultyId: '', sectionCode: 'A', slots: 35,
  days: [], startTime: '07:30', endTime: '09:00', room: '',
  hasLab: false, labDays: [], labStart: '13:00', labEnd: '16:00', labRoom: '',
};

function sectionToForm(sec: Section): SectionForm {
  return {
    courseId: sec.courseId, facultyId: sec.facultyId, sectionCode: sec.sectionCode,
    slots: sec.slots, days: sec.schedule.days, startTime: sec.schedule.startTime,
    endTime: sec.schedule.endTime, room: sec.schedule.room,
    hasLab: !!sec.labSchedule, labDays: sec.labSchedule?.days ?? [],
    labStart: sec.labSchedule?.startTime ?? '13:00', labEnd: sec.labSchedule?.endTime ?? '16:00',
    labRoom: sec.labSchedule?.room ?? '',
  };
}

export default function OCSSections() {
  const { state, addSection, updateSection, deleteSection, getActiveTerm } = useApp();
  const { toast } = useToast();
  const ocsUser = state.currentUser;
  const activeTerm = getActiveTerm();
  const [addOpen, setAddOpen] = useState(false);
  const [editSection, setEditSection] = useState<Section | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<SectionForm>(emptyForm);
  const [editForm, setEditForm] = useState<SectionForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // College-based filtering (OCS users now have `college` instead of `department`)
  const ocsCollege = ocsUser?.college
    ? state.colleges.find(c => c.name === ocsUser.college) ?? null
    : null;
  // All departments belonging to the OCS user's college
  const collegeDeptNames = new Set(
    ocsCollege
      ? state.departments.filter(d => d.collegeId === ocsCollege.id).map(d => d.name)
      : []
  );
  const collegeCourseIds = new Set(
    ocsCollege
      ? state.courses.filter(c => collegeDeptNames.has(c.department)).map(c => c.id)
      : state.courses.map(c => c.id)
  );
  const collegeCourses = ocsCollege
    ? state.courses.filter(c => collegeDeptNames.has(c.department))
    : state.courses;
  const collegeFaculty = state.users.filter(u =>
    u.role === 'faculty' && (!ocsCollege || u.college === ocsUser?.college)
  );
  // Rooms filtered by college
  const collegeRooms = (state.rooms ?? []).filter(r =>
    !ocsCollege || r.collegeId === ocsCollege.id
  );

  const activeSections = activeTerm
    ? state.sections.filter(s => s.termId === activeTerm.id && collegeCourseIds.has(s.courseId))
    : [];

  const filtered = activeSections.filter(s => {
    const course = state.courses.find(c => c.id === s.courseId);
    const faculty = state.users.find(u => u.id === s.facultyId);
    return !search || course?.code.toLowerCase().includes(search.toLowerCase()) ||
      course?.title.toLowerCase().includes(search.toLowerCase()) ||
      faculty?.name.toLowerCase().includes(search.toLowerCase());
  });

  const toggleDay = (day: Day, f: SectionForm, setF: (fn: (prev: SectionForm) => SectionForm) => void, isLab = false) => {
    if (isLab) {
      setF(prev => ({ ...prev, labDays: prev.labDays.includes(day) ? prev.labDays.filter(d => d !== day) : [...prev.labDays, day] }));
    } else {
      setF(prev => ({ ...prev, days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day] }));
    }
  };

  const buildSectionData = (f: SectionForm) => {
    const course = state.courses.find(c => c.id === f.courseId);
    return {
      courseId: f.courseId,
      termId: activeTerm!.id,
      sectionCode: f.sectionCode,
      facultyId: f.facultyId,
      slots: f.slots,
      enrolled: 0,
      schedule: { days: f.days, startTime: f.startTime, endTime: f.endTime, room: f.room },
      labSchedule: (f.hasLab || course?.type === 'Lec+Lab' || course?.type === 'Lab') && f.labDays.length > 0
        ? { days: f.labDays, startTime: f.labStart, endTime: f.labEnd, room: f.labRoom }
        : undefined,
    };
  };

  const handleAdd = async () => {
    if (!form.courseId || !form.facultyId || form.days.length === 0 || !form.room) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      addSection(buildSectionData(form));
      toast({ title: 'Section added successfully' });
      setAddOpen(false);
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editSection) return;
    if (!editForm.courseId || !editForm.facultyId || editForm.days.length === 0 || !editForm.room) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const data = buildSectionData(editForm);
      updateSection(editSection.id, {
        courseId: data.courseId, sectionCode: data.sectionCode,
        facultyId: data.facultyId, slots: data.slots,
        schedule: data.schedule, labSchedule: data.labSchedule,
      });
      toast({ title: 'Section updated' });
      setEditSection(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sectionId: string) => {
    setSaving(true);
    try {
      deleteSection(sectionId);
      toast({ title: 'Section deleted' });
    } finally {
      setSaving(false);
    }
  };

  const formatSchedule = (s: { days: string[]; startTime: string; endTime: string; room: string }) =>
    `${s.days.join('')} ${s.startTime}–${s.endTime} (${s.room})`;

  // Shared form fields renderer
  const renderFormFields = (f: SectionForm, setF: (fn: (prev: SectionForm) => SectionForm) => void) => {
    const selectedCourse = state.courses.find(c => c.id === f.courseId);
    const requiresLab = selectedCourse?.type === 'Lec+Lab' || selectedCourse?.type === 'Lab';
    const showLab = requiresLab || f.hasLab;
    return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label>Course</Label>
          <Select value={f.courseId} onValueChange={v => {
            const course = state.courses.find(c => c.id === v);
            setF(prev => ({
              ...prev,
              courseId: v,
              hasLab: course?.type === 'Lec+Lab' || course?.type === 'Lab' ? true : prev.hasLab,
            }));
          }}>
            <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
            <SelectContent>
              {collegeCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title} ({c.type})</SelectItem>)}
            </SelectContent>
          </Select>
          {requiresLab && <p className="text-xs text-secondary font-medium">Lab schedule is required for this course type.</p>}
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Faculty</Label>
          <Select value={f.facultyId} onValueChange={v => setF(prev => ({ ...prev, facultyId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
            <SelectContent>
              {collegeFaculty.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
              {collegeFaculty.length === 0 && (
                <SelectItem value="_none" disabled>No faculty found for college</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Section Code</Label>
          <Input value={f.sectionCode} onChange={e => setF(prev => ({ ...prev, sectionCode: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Slots</Label>
          <Input type="number" min={1} value={f.slots} onChange={e => setF(prev => ({ ...prev, slots: +e.target.value }))} />
        </div>
      </div>
      {/* Lecture Schedule */}
      <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-3">
        <p className="font-semibold text-sm">Lecture Schedule</p>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Days</Label>
          <div className="flex gap-1.5 flex-wrap">
            {DAYS.map(d => (
              <button key={d} type="button" onClick={() => toggleDay(d, f, setF)}
                className={`w-10 h-8 rounded-md text-xs font-semibold border transition-colors
                  ${f.days.includes(d) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Start</Label>
            <Select value={f.startTime} onValueChange={v => setF(prev => ({ ...prev, startTime: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">End</Label>
            <Select value={f.endTime} onValueChange={v => setF(prev => ({ ...prev, endTime: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Room</Label>
            {collegeRooms.length > 0 ? (
              <Select value={f.room} onValueChange={v => setF(prev => ({ ...prev, room: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select room..." /></SelectTrigger>
                <SelectContent>
                  {collegeRooms.map(r => (
                    <SelectItem key={r.id} value={r.name}>{r.name}{r.building ? ` (${r.building})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input className="h-8 text-xs" value={f.room} onChange={e => setF(prev => ({ ...prev, room: e.target.value }))} placeholder="e.g. CS-101" />
            )}
          </div>
        </div>
      </div>
      {/* Lab Schedule — auto-shown for Lec+Lab or Lab type courses */}
      <div className={`p-3 rounded-lg border space-y-3 ${requiresLab ? 'bg-secondary/5 border-secondary/40' : 'bg-muted/40 border-border'}`}>
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">
            Lab Schedule {requiresLab && <span className="text-xs text-secondary font-normal ml-1">(Required — {selectedCourse?.type})</span>}
          </p>
          {!requiresLab && (
            <button
              type="button"
              className="text-xs text-primary underline"
              onClick={() => setF(prev => ({ ...prev, hasLab: !prev.hasLab }))}
            >
              {showLab ? 'Remove Lab' : '+ Add Lab Schedule'}
            </button>
          )}
        </div>
        {showLab && (
          <>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Days</Label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d, f, setF, true)}
                  className={`w-10 h-8 rounded-md text-xs font-semibold border transition-colors
                    ${f.labDays.includes(d) ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-background text-foreground border-border hover:bg-muted'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Start</Label>
              <Select value={f.labStart} onValueChange={v => setF(prev => ({ ...prev, labStart: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End</Label>
              <Select value={f.labEnd} onValueChange={v => setF(prev => ({ ...prev, labEnd: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lab Room</Label>
              {collegeRooms.length > 0 ? (
                <Select value={f.labRoom} onValueChange={v => setF(prev => ({ ...prev, labRoom: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select room..." /></SelectTrigger>
                  <SelectContent>
                    {collegeRooms.map(r => (
                      <SelectItem key={r.id} value={r.name}>{r.name}{r.building ? ` (${r.building})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input className="h-8 text-xs" value={f.labRoom} onChange={e => setF(prev => ({ ...prev, labRoom: e.target.value }))} placeholder="e.g. CS-Lab1" />
              )}
            </div>
          </div>
          </>
        )}
      </div>
    </div>
    );
  };

  return (
    <PortalLayout title="Section Management">
      <div className="space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Input placeholder="Search sections..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-secondary hover:bg-secondary/90 gap-2" disabled={!activeTerm}>
                <PlusCircle size={16} /> Add Section
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Section — {activeTerm?.name}</DialogTitle>
              </DialogHeader>
              <div className="mt-2">
                {renderFormFields(form, setForm)}
                <Button className="w-full mt-4 bg-secondary hover:bg-secondary/90" onClick={handleAdd} disabled={saving}>
                  {saving ? 'Adding...' : 'Add Section'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Section Dialog */}
        {editSection && (
          <Dialog open onOpenChange={v => !v && setEditSection(null)}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Section — {state.courses.find(c => c.id === editSection.courseId)?.code} Sec {editSection.sectionCode}</DialogTitle>
              </DialogHeader>
              <div className="mt-2">
                {renderFormFields(editForm, setEditForm)}
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setEditSection(null)}>Cancel</Button>
                  <Button className="flex-1 bg-primary text-white" onClick={handleEditSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {activeTerm ? `${activeTerm.name} — Sections (${filtered.length})` : 'No Active Term'}
              {ocsCollege && <span className="ml-2 text-sm font-normal text-muted-foreground">({ocsCollege.name})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Course', 'Sec', 'Faculty', 'Slots', 'Schedule', 'Lab Schedule', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(sec => {
                    const course = state.courses.find(c => c.id === sec.courseId);
                    const faculty = state.users.find(u => u.id === sec.facultyId);
                    const sectionEnrollments = state.enrollments.filter(e => e.sectionId === sec.id && e.status !== 'dropped');
                    const totalEnlisted = sectionEnrollments.length;
                    const finalizedCount = sectionEnrollments.filter(e => e.status === 'enrolled').length;
                    const pct = Math.round((totalEnlisted / sec.slots) * 100);
                    return (
                      <tr key={sec.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-foreground">{course?.code}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-32">{course?.title}</p>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-foreground">{sec.sectionCode}</td>
                        <td className="py-2.5 px-3 text-muted-foreground text-xs">{faculty?.name}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <Users size={12} className="text-muted-foreground" />
                            <span className="text-foreground font-medium">{totalEnlisted}/{sec.slots}</span>
                          </div>
                          <div className="text-xs mt-0.5 text-muted-foreground">
                            {finalizedCount} finalized
                          </div>
                          <div className={`text-xs mt-0.5 ${pct >= 90 ? 'text-destructive' : 'text-muted-foreground'}`}>{pct}%</div>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1"><Clock size={10} />{formatSchedule(sec.schedule)}</div>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground">
                          {sec.labSchedule
                            ? <div className="flex items-center gap-1"><MapPin size={10} />{formatSchedule(sec.labSchedule)}</div>
                            : <span className="text-muted-foreground/50">—</span>
                          }
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge className={pct >= 100 ? 'bg-red-100 text-red-700 border-red-300 text-xs' : pct >= 90 ? 'bg-yellow-100 text-yellow-700 border-yellow-300 text-xs' : 'bg-green-100 text-green-700 border-green-300 text-xs'}>
                            {pct >= 100 ? 'Full' : pct >= 90 ? 'Almost Full' : 'Open'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                              onClick={() => { setEditSection(sec); setEditForm(sectionToForm(sec)); }}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50" disabled={saving}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Section {sec.sectionCode}?</AlertDialogTitle>
                                </AlertDialogHeader>
                                <p className="text-sm text-gray-600 px-6">This will permanently remove the section. Enrolled students will retain their enrollment records.</p>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-red-600 text-white" onClick={() => handleDelete(sec.id)}>
                                    Delete Section
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No sections found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
