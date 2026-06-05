import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { PlusCircle, Users, Clock, MapPin, Pencil, Trash2, EyeOff, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Day, Section, CourseCategory } from '../../lib/types';

const DAYS: Day[] = ['M', 'T', 'W', 'Th', 'F', 'S'];
const TIMES = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'];

type SectionForm = {
  courseId: string; facultyId: string; facultyHidden: boolean; sectionCode: string; slots: number;
  days: Day[]; startTime: string; endTime: string; room: string;
  labDays: Day[]; labStart: string; labEnd: string; labRoom: string;
};

const emptyForm: SectionForm = {
  courseId: '', facultyId: '', facultyHidden: false, sectionCode: 'A', slots: 35,
  days: [], startTime: '07:30', endTime: '09:00', room: '',
  labDays: [], labStart: '13:00', labEnd: '16:00', labRoom: '',
};

function sectionToForm(sec: Section): SectionForm {
  return {
    courseId: sec.courseId, facultyId: sec.facultyId,
    facultyHidden: sec.facultyHidden ?? false,
    sectionCode: sec.sectionCode,
    slots: sec.slots, days: sec.schedule.days, startTime: sec.schedule.startTime,
    endTime: sec.schedule.endTime, room: sec.schedule.room,
    labDays: sec.labSchedule?.days ?? [],
    labStart: sec.labSchedule?.startTime ?? '13:00', labEnd: sec.labSchedule?.endTime ?? '16:00',
    labRoom: sec.labSchedule?.room ?? '',
  };
}

export default function OCSSections() {
  const { state, addSection, updateSection, deleteSection, getActiveTerm } = useApp();
  const ocsUser = state.currentUser;
  const activeTerm = getActiveTerm();
  const [addOpen, setAddOpen] = useState(false);
  const [editSection, setEditSection] = useState<Section | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [form, setForm] = useState<SectionForm>(emptyForm);
  const [editForm, setEditForm] = useState<SectionForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Department-based filtering (OCS users are scoped to their department; college is used as fallback)
  const ocsDept = ocsUser?.department ?? '';
  const ocsCollege = ocsUser?.college
    ? state.colleges.find(c => c.name === ocsUser.college) ?? null
    : null;
  // All departments belonging to the OCS user's college (for fallback)
  const collegeDeptNames = new Set(
    ocsCollege
      ? state.departments.filter(d => d.collegeId === ocsCollege.id).map(d => d.name)
      : []
  );
  // Primary: filter by OCS user's own department; fallback to college if no department set
  const scopedCourseIds = new Set(
    ocsDept
      ? state.courses.filter(c => c.department === ocsDept).map(c => c.id)
      : ocsCollege
        ? state.courses.filter(c => collegeDeptNames.has(c.department)).map(c => c.id)
        : state.courses.map(c => c.id)
  );
  const scopedCourses = ocsDept
    ? state.courses.filter(c => c.department === ocsDept)
    : ocsCollege
      ? state.courses.filter(c => collegeDeptNames.has(c.department))
      : state.courses;
  const scopedFaculty = state.users.filter(u =>
    u.role === 'faculty' && (
      ocsDept ? u.department === ocsDept
      : !ocsCollege || u.college === ocsUser?.college
    )
  );
  // Rooms filtered by college
  const collegeRooms = (state.rooms ?? []).filter(r =>
    !ocsCollege || r.collegeId === ocsCollege.id
  );

  const activeSections = activeTerm
    ? state.sections.filter(s => s.termId === activeTerm.id && scopedCourseIds.has(s.courseId))
    : [];

  const filtered = activeSections.filter(s => {
    const course = state.courses.find(c => c.id === s.courseId);
    const faculty = state.users.find(u => u.id === s.facultyId);
    return (
      (!filterCategory || course?.category === filterCategory) &&
      (!search || course?.code.toLowerCase().includes(search.toLowerCase()) ||
        course?.title.toLowerCase().includes(search.toLowerCase()) ||
        faculty?.name.toLowerCase().includes(search.toLowerCase()))
    );
  });

  // Reusable room selector (with TBA option)
  const RoomSelect = ({ value, onChange, placeholder = 'Select room...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    collegeRooms.length > 0 ? (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="TBA">TBA (To be Announced)</SelectItem>
          {collegeRooms.map(r => (
            <SelectItem key={r.id} value={r.name}>{r.name}{r.building ? ` (${r.building})` : ''}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : (
      <Input className="h-8 text-xs" value={value} onChange={e => onChange(e.target.value)} placeholder="e.g. CS-101 or TBA" />
    )
  );

  // Reusable schedule block (days + start + end + room)
  const ScheduleBlock = ({
    label, color = 'border-border bg-muted/40',
    days, startTime, endTime, room,
    onDayToggle, onStart, onEnd, onRoom,
  }: {
    label: string; color?: string;
    days: Day[]; startTime: string; endTime: string; room: string;
    onDayToggle: (d: Day) => void;
    onStart: (v: string) => void;
    onEnd: (v: string) => void;
    onRoom: (v: string) => void;
  }) => (
    <div className={`p-3 rounded-lg border space-y-3 ${color}`}>
      <p className="font-semibold text-sm">{label}</p>
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Days</Label>
        <div className="flex gap-1.5 flex-wrap">
          {DAYS.map(d => (
            <button key={d} type="button" onClick={() => onDayToggle(d)}
              className={`w-10 h-8 rounded-md text-xs font-semibold border transition-colors
                ${days.includes(d) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Start</Label>
          <Select value={startTime} onValueChange={onStart}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">End</Label>
          <Select value={endTime} onValueChange={onEnd}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Room</Label>
          <RoomSelect value={room} onChange={onRoom} />
        </div>
      </div>
    </div>
  );

  // Shared form fields renderer
  const renderFormFields = (f: SectionForm, setF: (fn: (prev: SectionForm) => SectionForm) => void) => {
    const selectedCourse = state.courses.find(c => c.id === f.courseId);
    const courseType = selectedCourse?.type;
    const isThesisOrInternship = courseType === 'Thesis' || courseType === 'Thesis 1' || courseType === 'Thesis 2' || courseType === 'Internship';
    const hasDualSchedule = courseType === 'Lec+Lab' || courseType === 'Lec+Rec';
    const secondLabel = courseType === 'Lec+Rec' ? 'Recitation Schedule' : 'Lab Schedule';
    const secondColor = courseType === 'Lec+Rec' ? 'border-teal-200 bg-teal-50/30' : 'border-secondary/40 bg-secondary/5';

    return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label>Course</Label>
          <Select value={f.courseId} onValueChange={v => setF(prev => ({ ...prev, courseId: v, days: [], labDays: [] }))}>
            <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
            <SelectContent>
              {scopedCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title} ({c.type})</SelectItem>)}
            </SelectContent>
          </Select>
          {isThesisOrInternship && (
            <p className="text-xs text-amber-600 font-medium">No fixed schedule — student consults faculty directly.</p>
          )}
          {hasDualSchedule && (
            <p className="text-xs text-secondary font-medium">{secondLabel} is required for this course type.</p>
          )}
        </div>

        {/* Faculty selector + TBA toggle */}
        <div className="space-y-1.5 col-span-2">
          <Label>Faculty in Charge</Label>
          <Select value={f.facultyId} onValueChange={v => setF(prev => ({ ...prev, facultyId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
            <SelectContent>
              {scopedFaculty.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
              {scopedFaculty.length === 0 && (
                <SelectItem value="_none" disabled>No faculty found for college</SelectItem>
              )}
            </SelectContent>
          </Select>
          {/* Hide faculty toggle */}
          <div className="flex items-center gap-2 pt-0.5">
            <Switch
              id={`faculty-hidden-${f.courseId}`}
              checked={f.facultyHidden}
              onCheckedChange={v => setF(prev => ({ ...prev, facultyHidden: v }))}
            />
            <label htmlFor={`faculty-hidden-${f.courseId}`} className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
              <EyeOff className="w-3 h-3" />
              Show faculty as <span className="font-semibold text-foreground">To be Announced</span> to students
            </label>
          </div>
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

      {/* Schedule panels — based on course type */}
      {isThesisOrInternship ? (
        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 text-sm text-amber-700">
          No fixed class schedule for Thesis / Internship courses. Students and faculty arrange consultation times independently.
        </div>
      ) : hasDualSchedule ? (
        <>
          <ScheduleBlock
            label="Lecture Schedule"
            days={f.days} startTime={f.startTime} endTime={f.endTime} room={f.room}
            onDayToggle={d => setF(prev => ({ ...prev, days: prev.days.includes(d) ? prev.days.filter(x => x !== d) : [...prev.days, d] }))}
            onStart={v => setF(prev => ({ ...prev, startTime: v }))}
            onEnd={v => setF(prev => ({ ...prev, endTime: v }))}
            onRoom={v => setF(prev => ({ ...prev, room: v }))}
          />
          <ScheduleBlock
            label={secondLabel}
            color={secondColor}
            days={f.labDays} startTime={f.labStart} endTime={f.labEnd} room={f.labRoom}
            onDayToggle={d => setF(prev => ({ ...prev, labDays: prev.labDays.includes(d) ? prev.labDays.filter(x => x !== d) : [...prev.labDays, d] }))}
            onStart={v => setF(prev => ({ ...prev, labStart: v }))}
            onEnd={v => setF(prev => ({ ...prev, labEnd: v }))}
            onRoom={v => setF(prev => ({ ...prev, labRoom: v }))}
          />
        </>
      ) : (
        <ScheduleBlock
          label={courseType === 'Lab' ? 'Lab Schedule' : courseType === 'Recitation' ? 'Recitation Schedule' : 'Lecture Schedule'}
          days={f.days} startTime={f.startTime} endTime={f.endTime} room={f.room}
          onDayToggle={d => setF(prev => ({ ...prev, days: prev.days.includes(d) ? prev.days.filter(x => x !== d) : [...prev.days, d] }))}
          onStart={v => setF(prev => ({ ...prev, startTime: v }))}
          onEnd={v => setF(prev => ({ ...prev, endTime: v }))}
          onRoom={v => setF(prev => ({ ...prev, room: v }))}
        />
      )}
    </div>
    );
  };

  const buildSectionData = (f: SectionForm) => {
    const course = state.courses.find(c => c.id === f.courseId);
    const isThesisOrInternship = course?.type === 'Thesis' || course?.type === 'Thesis 1' || course?.type === 'Thesis 2' || course?.type === 'Internship';
    const hasDualSchedule = course?.type === 'Lec+Lab' || course?.type === 'Lec+Rec';
    return {
      courseId: f.courseId,
      termId: activeTerm!.id,
      sectionCode: f.sectionCode,
      facultyId: f.facultyId,
      facultyHidden: f.facultyHidden,
      slots: f.slots,
      enrolled: 0,
      schedule: isThesisOrInternship
        ? { days: [], startTime: '', endTime: '', room: 'TBA' }
        : { days: f.days, startTime: f.startTime, endTime: f.endTime, room: f.room },
      labSchedule: (!isThesisOrInternship && hasDualSchedule && f.labDays.length > 0)
        ? { days: f.labDays, startTime: f.labStart, endTime: f.labEnd, room: f.labRoom }
        : undefined,
    };
  };

  const handleAdd = async () => {
    const course = state.courses.find(c => c.id === form.courseId);
    const isThesisOrInternship = course?.type === 'Thesis' || course?.type === 'Thesis 1' || course?.type === 'Thesis 2' || course?.type === 'Internship';
    if (!form.courseId || !form.facultyId) {
      toast.error('Missing fields', { description: 'Please select course and faculty.' });
      return;
    }
    if (!isThesisOrInternship && (form.days.length === 0 || !form.room)) {
      toast.error('Missing fields', { description: 'Please fill schedule and room.' });
      return;
    }
    setSaving(true);
    try {
      addSection(buildSectionData(form));
      toast.success('Section added successfully');
      setAddOpen(false);
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editSection) return;
    const course = state.courses.find(c => c.id === editForm.courseId);
    const isThesisOrInternship = course?.type === 'Thesis' || course?.type === 'Thesis 1' || course?.type === 'Thesis 2' || course?.type === 'Internship';
    if (!editForm.courseId || !editForm.facultyId) {
      toast.error('Missing fields', { description: 'Please select course and faculty.' });
      return;
    }
    if (!isThesisOrInternship && (editForm.days.length === 0 || !editForm.room)) {
      toast.error('Missing fields', { description: 'Please fill schedule and room.' });
      return;
    }
    setSaving(true);
    try {
      const data = buildSectionData(editForm);
      updateSection(editSection.id, {
        courseId: data.courseId, sectionCode: data.sectionCode,
        facultyId: data.facultyId, facultyHidden: data.facultyHidden,
        slots: data.slots,
        schedule: data.schedule, labSchedule: data.labSchedule,
      });
      toast.success('Section updated');
      setEditSection(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sectionId: string) => {
    setSaving(true);
    try {
      deleteSection(sectionId);
      toast.success('Section deleted');
    } finally {
      setSaving(false);
    }
  };

  const formatSchedule = (s: { days: string[]; startTime: string; endTime: string; room: string }) =>
    `${s.days.join('')} ${s.startTime}–${s.endTime} (${s.room})`;

  return (
    <PortalLayout title="Section Management">
      <div className="space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Input placeholder="Search sections..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {/* Category filter */}
          <Select value={filterCategory || '__all__'} onValueChange={v => setFilterCategory(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Categories</SelectItem>
              {(['Major','GE','Elective GE','HK/PE/NSTP','Specialized','Thesis'] as CourseCategory[]).map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filterCategory && (
            <Button variant="ghost" size="sm" className="h-9 px-2 text-xs text-muted-foreground gap-1" onClick={() => setFilterCategory('')}>
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-secondary hover:bg-secondary/90 gap-2" disabled={!activeTerm}>
                <PlusCircle size={16} /> Add Section
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

        <div className="portal-panel">
          <div className="portal-panel-header">
            {activeTerm ? `${activeTerm.name} — Sections (${filtered.length})` : 'No Active Term'}
            {ocsCollege && <span className="ml-2 text-sm font-normal opacity-80">({ocsCollege.name})</span>}
          </div>
          <div className="bg-background">
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
                        <td className="py-2.5 px-3 text-muted-foreground text-xs">
                          <span>{faculty?.name}</span>
                          {sec.facultyHidden && (
                            <span className="ml-1 inline-flex items-center gap-0.5 text-amber-600 font-medium text-[10px]">
                              <EyeOff className="w-3 h-3" /> TBA to students
                            </span>
                          )}
                        </td>
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
                          {sec.schedule.days.length === 0
                            ? <span className="italic text-amber-600">Flexible</span>
                            : <div className="flex items-center gap-1"><Clock size={10} />{formatSchedule(sec.schedule)}</div>}
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
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
