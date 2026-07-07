import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { SearchableSelect } from '../../components/ui/searchable-select';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { PlusCircle, Users, Clock, MapPin, Pencil, Trash2, EyeOff, X, FlaskConical, Plus, Minus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Day, Section, CourseCategory } from '../../lib/types';

const DAYS: Day[] = ['M', 'T', 'W', 'Th', 'F', 'S'];
const TIMES: string[] = (() => {
  const arr: string[] = [];
  for (let h = 7; h <= 21; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 21 && m > 0) break;
      arr.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return arr;
})();
function fmt12(t: string): string {
  if (!t) return t;
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

// ── Types ──────────────────────────────────────────────────────────────────────
type LabGroup = {
  sectionCode: string;
  facultyId: string;
  slots: number;
  days: Day[]; startTime: string; endTime: string; room: string;
};

type SectionForm = {
  courseId: string; facultyId: string; facultyHidden: boolean; sectionCode: string; slots: number;
  days: Day[]; startTime: string; endTime: string; room: string;
  // Legacy single-section lab fields (for edit of old records)
  labDays: Day[]; labStart: string; labEnd: string; labRoom: string;
  // New multi-lab fields
  labSlotsPerClass: number;
  labGroups: LabGroup[];
};

const emptyLabGroup = (sectionCode: string, facultyId: string, slots: number): LabGroup => ({
  sectionCode, facultyId, slots, days: [], startTime: '13:00', endTime: '16:00', room: '',
});

const emptyForm: SectionForm = {
  courseId: '', facultyId: '', facultyHidden: false, sectionCode: 'A', slots: 35,
  days: [], startTime: '07:30', endTime: '09:00', room: '',
  labDays: [], labStart: '13:00', labEnd: '16:00', labRoom: '',
  labSlotsPerClass: 25, labGroups: [],
};

function sectionToForm(sec: Section, childSections: Section[] = []): SectionForm {
  return {
    courseId: sec.courseId, facultyId: sec.facultyId,
    facultyHidden: sec.facultyHidden ?? false,
    sectionCode: sec.sectionCode,
    slots: sec.slots, days: sec.schedule.days, startTime: sec.schedule.startTime,
    endTime: sec.schedule.endTime, room: sec.schedule.room,
    labDays: sec.labSchedule?.days ?? [],
    labStart: sec.labSchedule?.startTime ?? '13:00', labEnd: sec.labSchedule?.endTime ?? '16:00',
    labRoom: sec.labSchedule?.room ?? '',
    labSlotsPerClass: childSections.length > 0 ? childSections[0].slots : 25,
    labGroups: childSections.map(cs => ({
      sectionCode: cs.sectionCode,
      facultyId: cs.facultyId,
      slots: cs.slots,
      days: cs.schedule.days,
      startTime: cs.schedule.startTime,
      endTime: cs.schedule.endTime,
      room: cs.schedule.room,
    })),
  };
}

/** Auto-generate lab group list based on lecture slots ÷ labSlotsPerClass */
function genLabGroups(lectureCode: string, lectureSlots: number, labSlots: number, facultyId: string, existing: LabGroup[]): LabGroup[] {
  const count = Math.max(1, Math.ceil(lectureSlots / labSlots));
  return Array.from({ length: count }, (_, i) => {
    const code = `${lectureCode}-L${i + 1}`;
    return existing[i] ?? emptyLabGroup(code, facultyId, labSlots);
  });
}

export default function OCSSections() {
  const { state, addSection, updateSection, deleteSection, getActiveTerm } = useApp();
  const ocsUser = state.currentUser;
  const activeTerm = getActiveTerm();
  const [selectedTermId, setSelectedTermId] = useState<string>(() => activeTerm?.id ?? state.terms[0]?.id ?? '');
  const [addOpen, setAddOpen] = useState(false);
  const [editSection, setEditSection] = useState<Section | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [form, setForm] = useState<SectionForm>(emptyForm);
  const [editForm, setEditForm] = useState<SectionForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const selectedTerm = state.terms.find(t => t.id === selectedTermId) ?? null;

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
    u.role === 'faculty' && (!ocsCollege || u.college === ocsUser?.college)
  );
  // Rooms filtered by college
  const collegeRooms = (state.rooms ?? []).filter(r =>
    !ocsCollege || r.collegeId === ocsCollege.id
  );

  const activeSections = selectedTermId
    ? state.sections.filter(s => s.termId === selectedTermId && scopedCourseIds.has(s.courseId) && s.sectionCode !== '__MANUAL__')
    : [];

  const filtered = activeSections.filter(s => {
    if (s.parentSectionId) return false; // child lab/rec sections shown under their parent lecture
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
      <SearchableSelect
        value={value}
        onValueChange={onChange}
        triggerClassName="h-8 text-xs"
        placeholder={placeholder}
        options={[
          { value: 'TBA', label: 'TBA (To be Announced)' },
          ...collegeRooms.map(r => ({ value: r.name, label: `${r.name}${r.building ? ` (${r.building})` : ''}` })),
        ]}
      />
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
          <SearchableSelect
            value={startTime}
            onValueChange={onStart}
            triggerClassName="h-8 text-xs"
            placeholder="Start..."
            options={TIMES.map(t => ({ value: t, label: fmt12(t) }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">End</Label>
          <SearchableSelect
            value={endTime}
            onValueChange={onEnd}
            triggerClassName="h-8 text-xs"
            placeholder="End..."
            options={TIMES.map(t => ({ value: t, label: fmt12(t) }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Room</Label>
          <RoomSelect value={room} onChange={onRoom} />
        </div>
      </div>
    </div>
  );

  // Shared form fields renderer
  const renderFormFields = (f: SectionForm, setF: (fn: (prev: SectionForm) => SectionForm) => void, isEdit = false) => {
    const selectedCourse = state.courses.find(c => c.id === f.courseId);
    const courseType = selectedCourse?.type;
    const isThesisOrInternship = courseType === 'Thesis' || courseType === 'Thesis 1' || courseType === 'Thesis 2' || courseType === 'Internship' || courseType === 'Seminar';
    const hasDualSchedule = courseType === 'Lec+Lab' || courseType === 'Lec+Rec';
    const isLabType = courseType === 'Lab' || courseType === 'Recitation';
    const secondLabel = courseType === 'Lec+Rec' ? 'Recitation Schedule' : 'Lab Schedule';
    const secondColor = courseType === 'Lec+Rec' ? 'border-teal-200 bg-teal-50/30' : 'border-secondary/40 bg-secondary/5';

    // Sync lab groups when lecture slots or labSlotsPerClass changes
    const syncLabGroups = (slots: number, labSlots: number, sectionCode: string, facultyId: string, current: LabGroup[]) =>
      genLabGroups(sectionCode, slots, labSlots, facultyId, current);

    return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label>Course</Label>
          <SearchableSelect
            value={f.courseId}
            onValueChange={v => setF(prev => ({ ...prev, courseId: v, days: [], labDays: [], labGroups: [] }))}
            placeholder="Select course"
            options={scopedCourses.map(c => ({ value: c.id, label: `${c.code} — ${c.title} (${c.type})` }))}
          />
          {isThesisOrInternship && (
            <p className="text-xs text-amber-600 font-medium">No fixed schedule — student consults faculty directly.</p>
          )}
          {hasDualSchedule && !isEdit && (
            <p className="text-xs text-secondary font-medium">Lab/Recitation groups will be generated automatically based on lecture slots ÷ slots per lab class.</p>
          )}
        </div>

        {/* Faculty selector + TBA toggle */}
        <div className="space-y-1.5 col-span-2">
          <Label>Faculty in Charge {hasDualSchedule && !isEdit ? '(Lecture)' : ''}</Label>
          <SearchableSelect
            value={f.facultyId}
            onValueChange={v => setF(prev => ({ ...prev, facultyId: v }))}
            placeholder="Select faculty"
            options={[
              ...scopedFaculty.map(u => ({ value: u.id, label: u.name })),
              ...(scopedFaculty.length === 0 ? [{ value: '_none', label: 'No faculty found for college', disabled: true }] : []),
            ]}
          />
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
          <Input value={f.sectionCode}
            onChange={e => setF(prev => {
              const newCode = e.target.value;
              return {
                ...prev, sectionCode: newCode,
                labGroups: prev.labGroups.length
                  ? syncLabGroups(prev.slots, prev.labSlotsPerClass, newCode, prev.facultyId, prev.labGroups)
                  : prev.labGroups,
              };
            })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Lecture Slots</Label>
          <Input type="number" min={1} value={f.slots}
            onChange={e => setF(prev => {
              const slots = +e.target.value;
              return {
                ...prev, slots,
                labGroups: (hasDualSchedule && !isEdit && prev.labGroups.length)
                  ? syncLabGroups(slots, prev.labSlotsPerClass, prev.sectionCode, prev.facultyId, prev.labGroups)
                  : prev.labGroups,
              };
            })}
          />
        </div>
      </div>

      {/* Schedule panels */}
      {isThesisOrInternship ? (
        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 text-sm text-amber-700">
          No fixed class schedule for Thesis / Internship courses. Students and faculty arrange consultation times independently.
        </div>
      ) : hasDualSchedule && isEdit ? (
        // Edit mode: show lecture schedule + lab groups (multi) or legacy single-lab
        <>
          <ScheduleBlock
            label="Lecture Schedule"
            days={f.days} startTime={f.startTime} endTime={f.endTime} room={f.room}
            onDayToggle={d => setF(prev => ({ ...prev, days: prev.days.includes(d) ? prev.days.filter(x => x !== d) : [...prev.days, d] }))}
            onStart={v => setF(prev => ({ ...prev, startTime: v }))}
            onEnd={v => setF(prev => ({ ...prev, endTime: v }))}
            onRoom={v => setF(prev => ({ ...prev, room: v }))}
          />
          {f.labGroups.length > 0 ? (
            // Multi-group edit (new sections with child sections)
            <div className={`border rounded-lg p-3 space-y-3 ${secondColor}`}>
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-secondary" />
                <p className="font-semibold text-sm">{courseType === 'Lec+Rec' ? 'Recitation' : 'Lab'} Groups</p>
              </div>
              <div className="space-y-3">
                {f.labGroups.map((grp, idx) => (
                  <div key={idx} className="border border-border rounded-md p-3 space-y-2 bg-background">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">{courseType === 'Lec+Rec' ? 'Rec' : 'Lab'} {idx + 1}</Badge>
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Section Code</Label>
                          <Input className="h-7 text-xs" value={grp.sectionCode}
                            onChange={e => setF(prev => { const groups = [...prev.labGroups]; groups[idx] = { ...groups[idx], sectionCode: e.target.value }; return { ...prev, labGroups: groups }; })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Slots</Label>
                          <Input className="h-7 text-xs" type="number" min={1} value={grp.slots}
                            onChange={e => setF(prev => { const groups = [...prev.labGroups]; groups[idx] = { ...groups[idx], slots: +e.target.value }; return { ...prev, labGroups: groups }; })} />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Faculty in Charge</Label>
                      <SearchableSelect
                        value={grp.facultyId || f.facultyId || '_same'}
                        onValueChange={v => setF(prev => { const groups = [...prev.labGroups]; groups[idx] = { ...groups[idx], facultyId: v === '_same' || v === f.facultyId ? '' : v }; return { ...prev, labGroups: groups }; })}
                        triggerClassName="h-7 text-xs"
                        placeholder="Same as Lecture"
                        options={[
                          { value: f.facultyId || '_same', label: f.facultyId ? (scopedFaculty.find(u => u.id === f.facultyId)?.name ?? 'Same as Lecture') : '— Same as Lecture —' },
                          ...scopedFaculty.filter(u => u.id !== f.facultyId).map(u => ({ value: u.id, label: u.name })),
                        ]}
                      />
                    </div>
                    <ScheduleBlock
                      label={`${courseType === 'Lec+Rec' ? 'Recitation' : 'Lab'} Schedule`}
                      color="border-secondary/20 bg-transparent"
                      days={grp.days} startTime={grp.startTime} endTime={grp.endTime} room={grp.room}
                      onDayToggle={d => setF(prev => { const groups = [...prev.labGroups]; groups[idx] = { ...groups[idx], days: groups[idx].days.includes(d) ? groups[idx].days.filter(x => x !== d) : [...groups[idx].days, d] }; return { ...prev, labGroups: groups }; })}
                      onStart={v => setF(prev => { const groups = [...prev.labGroups]; groups[idx] = { ...groups[idx], startTime: v }; return { ...prev, labGroups: groups }; })}
                      onEnd={v => setF(prev => { const groups = [...prev.labGroups]; groups[idx] = { ...groups[idx], endTime: v }; return { ...prev, labGroups: groups }; })}
                      onRoom={v => setF(prev => { const groups = [...prev.labGroups]; groups[idx] = { ...groups[idx], room: v }; return { ...prev, labGroups: groups }; })}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Legacy single-lab edit (old sections with labSchedule field)
            <ScheduleBlock
              label={secondLabel}
              color={secondColor}
              days={f.labDays} startTime={f.labStart} endTime={f.labEnd} room={f.labRoom}
              onDayToggle={d => setF(prev => ({ ...prev, labDays: prev.labDays.includes(d) ? prev.labDays.filter(x => x !== d) : [...prev.labDays, d] }))}
              onStart={v => setF(prev => ({ ...prev, labStart: v }))}
              onEnd={v => setF(prev => ({ ...prev, labEnd: v }))}
              onRoom={v => setF(prev => ({ ...prev, labRoom: v }))}
            />
          )}
        </>
      ) : hasDualSchedule && !isEdit ? (
        // Add mode: lecture schedule + multi-lab groups
        <>
          <ScheduleBlock
            label="Lecture Schedule"
            days={f.days} startTime={f.startTime} endTime={f.endTime} room={f.room}
            onDayToggle={d => setF(prev => ({ ...prev, days: prev.days.includes(d) ? prev.days.filter(x => x !== d) : [...prev.days, d] }))}
            onStart={v => setF(prev => ({ ...prev, startTime: v }))}
            onEnd={v => setF(prev => ({ ...prev, endTime: v }))}
            onRoom={v => setF(prev => ({ ...prev, room: v }))}
          />

          {/* Lab/Rec Groups */}
          <div className="border border-secondary/40 bg-secondary/5 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-secondary" />
                <p className="font-semibold text-sm">{courseType === 'Lec+Rec' ? 'Recitation' : 'Lab'} Groups</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Label className="shrink-0">Slots / group:</Label>
                <Input type="number" min={1} className="h-7 w-20 text-xs"
                  value={f.labSlotsPerClass}
                  onChange={e => setF(prev => {
                    const labSlots = +e.target.value || 1;
                    return {
                      ...prev, labSlotsPerClass: labSlots,
                      labGroups: prev.labGroups.length
                        ? syncLabGroups(prev.slots, labSlots, prev.sectionCode, prev.facultyId, prev.labGroups)
                        : prev.labGroups,
                    };
                  })}
                />
                <Button type="button" size="sm" className="h-7 text-xs bg-secondary hover:bg-secondary/90"
                  onClick={() => setF(prev => ({
                    ...prev,
                    labGroups: syncLabGroups(prev.slots, prev.labSlotsPerClass, prev.sectionCode, prev.facultyId, prev.labGroups),
                  }))}>
                  Generate {Math.ceil(f.slots / (f.labSlotsPerClass || 1))} group{Math.ceil(f.slots / (f.labSlotsPerClass || 1)) !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>

            {f.labGroups.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Click "Generate" to auto-create lab groups, or add them manually.</p>
            )}

            <div className="space-y-3">
              {f.labGroups.map((grp, idx) => (
                <div key={idx} className="border border-border rounded-md p-3 space-y-2 bg-background">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">{courseType === 'Lec+Rec' ? 'Rec' : 'Lab'} {idx + 1}</Badge>
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Section Code</Label>
                        <Input className="h-7 text-xs" value={grp.sectionCode}
                          onChange={e => setF(prev => {
                            const groups = [...prev.labGroups];
                            groups[idx] = { ...groups[idx], sectionCode: e.target.value };
                            return { ...prev, labGroups: groups };
                          })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Slots</Label>
                        <Input className="h-7 text-xs" type="number" min={1} value={grp.slots}
                          onChange={e => setF(prev => {
                            const groups = [...prev.labGroups];
                            groups[idx] = { ...groups[idx], slots: +e.target.value };
                            return { ...prev, labGroups: groups };
                          })} />
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
                      onClick={() => setF(prev => ({ ...prev, labGroups: prev.labGroups.filter((_, i) => i !== idx) }))}>
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Lab FIC */}
                  <div className="space-y-1">
                    <Label className="text-[10px]">Faculty in Charge</Label>
                    <SearchableSelect
                      value={grp.facultyId || f.facultyId || '_same'}
                      onValueChange={v => setF(prev => {
                        const groups = [...prev.labGroups];
                        groups[idx] = { ...groups[idx], facultyId: v === '_same' || v === f.facultyId ? '' : v };
                        return { ...prev, labGroups: groups };
                      })}
                      triggerClassName="h-7 text-xs"
                      placeholder="Same as Lecture"
                      options={[
                        { value: f.facultyId || '_same', label: f.facultyId ? (scopedFaculty.find(u => u.id === f.facultyId)?.name ?? 'Same as Lecture') : '— Same as Lecture —' },
                        ...scopedFaculty.filter(u => u.id !== f.facultyId).map(u => ({ value: u.id, label: u.name })),
                      ]}
                    />
                  </div>

                  {/* Lab schedule */}
                  <ScheduleBlock
                    label={`${courseType === 'Lec+Rec' ? 'Recitation' : 'Lab'} Schedule`}
                    color="border-secondary/20 bg-transparent"
                    days={grp.days} startTime={grp.startTime} endTime={grp.endTime} room={grp.room}
                    onDayToggle={d => setF(prev => {
                      const groups = [...prev.labGroups];
                      groups[idx] = { ...groups[idx], days: groups[idx].days.includes(d) ? groups[idx].days.filter(x => x !== d) : [...groups[idx].days, d] };
                      return { ...prev, labGroups: groups };
                    })}
                    onStart={v => setF(prev => { const groups = [...prev.labGroups]; groups[idx] = { ...groups[idx], startTime: v }; return { ...prev, labGroups: groups }; })}
                    onEnd={v => setF(prev => { const groups = [...prev.labGroups]; groups[idx] = { ...groups[idx], endTime: v }; return { ...prev, labGroups: groups }; })}
                    onRoom={v => setF(prev => { const groups = [...prev.labGroups]; groups[idx] = { ...groups[idx], room: v }; return { ...prev, labGroups: groups }; })}
                  />
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" size="sm" className="w-full text-xs gap-1.5"
              onClick={() => setF(prev => ({
                ...prev,
                labGroups: [...prev.labGroups, emptyLabGroup(
                  `${prev.sectionCode}-L${prev.labGroups.length + 1}`,
                  prev.facultyId,
                  prev.labSlotsPerClass,
                )],
              }))}>
              <Plus className="w-3 h-3" /> Add {courseType === 'Lec+Rec' ? 'Recitation' : 'Lab'} Group Manually
            </Button>
          </div>
        </>
      ) : (
        <ScheduleBlock
          label={isLabType ? (courseType === 'Recitation' ? 'Recitation Schedule' : 'Lab Schedule') : 'Lecture Schedule'}
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
    const isThesisOrInternship = course?.type === 'Thesis' || course?.type === 'Thesis 1' || course?.type === 'Thesis 2' || course?.type === 'Internship' || course?.type === 'Seminar';
    const hasDualSchedule = course?.type === 'Lec+Lab' || course?.type === 'Lec+Rec';
    return {
      courseId: f.courseId,
      termId: selectedTermId,
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
    const isThesisOrInternship = course?.type === 'Thesis' || course?.type === 'Thesis 1' || course?.type === 'Thesis 2' || course?.type === 'Internship' || course?.type === 'Seminar';
    const hasDualSchedule = course?.type === 'Lec+Lab' || course?.type === 'Lec+Rec';

    if (!form.courseId || !form.facultyId) {
      toast.error('Missing fields', { description: 'Please select course and faculty.' });
      return;
    }
    if (!isThesisOrInternship && (form.days.length === 0 || !form.room)) {
      toast.error('Missing fields', { description: 'Please fill lecture schedule and room.' });
      return;
    }
    if (hasDualSchedule && form.labGroups.length === 0) {
      toast.error('Missing lab groups', { description: 'Please generate or add at least one lab/recitation group.' });
      return;
    }
    if (hasDualSchedule) {
      const incompleteGroup = form.labGroups.find(g => g.days.length === 0 || !g.room);
      if (incompleteGroup) {
        toast.error('Incomplete lab group', { description: `Please fill schedule and room for group "${incompleteGroup.sectionCode}".` });
        return;
      }
    }
    setSaving(true);
    try {
      if (hasDualSchedule) {
        // Create lecture section first (sectionType: 'lecture'), get its ID
        const lectureId = addSection({
          courseId: form.courseId,
          termId: selectedTermId,
          sectionCode: form.sectionCode,
          facultyId: form.facultyId,
          facultyHidden: form.facultyHidden,
          slots: form.slots,
          enrolled: 0,
          schedule: { days: form.days, startTime: form.startTime, endTime: form.endTime, room: form.room },
          sectionType: 'lecture',
        });
        // Create each lab/recitation child section
        const childType = course?.type === 'Lec+Rec' ? 'recitation' : 'lab';
        for (const grp of form.labGroups) {
          addSection({
            courseId: form.courseId,
            termId: selectedTermId,
            sectionCode: grp.sectionCode,
            facultyId: grp.facultyId || form.facultyId,
            facultyHidden: false,
            slots: grp.slots,
            enrolled: 0,
            schedule: { days: grp.days, startTime: grp.startTime, endTime: grp.endTime, room: grp.room },
            sectionType: childType,
            parentSectionId: lectureId,
          });
        }
        toast.success(`Lecture section + ${form.labGroups.length} ${childType} group${form.labGroups.length !== 1 ? 's' : ''} added successfully`);
      } else {
        addSection(buildSectionData(form));
        toast.success('Section added successfully');
      }
      setAddOpen(false);
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editSection) return;
    const course = state.courses.find(c => c.id === editForm.courseId);
    const isThesisOrInternship = course?.type === 'Thesis' || course?.type === 'Thesis 1' || course?.type === 'Thesis 2' || course?.type === 'Internship' || course?.type === 'Seminar';
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
      // Update child lab/rec sections from labGroups
      if (editForm.labGroups.length > 0) {
        const childSections = state.sections.filter(s => s.parentSectionId === editSection.id);
        editForm.labGroups.forEach((grp, idx) => {
          if (childSections[idx]) {
            updateSection(childSections[idx].id, {
              sectionCode: grp.sectionCode,
              facultyId: grp.facultyId || editForm.facultyId,
              slots: grp.slots,
              schedule: { days: grp.days, startTime: grp.startTime, endTime: grp.endTime, room: grp.room },
            });
          }
        });
      }
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
    `${s.days.join('')} ${fmt12(s.startTime)}–${fmt12(s.endTime)} (${s.room})`;

  return (
    <PortalLayout title="Section Management">
      <div className="space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Term selector */}
          <SearchableSelect
            value={selectedTermId}
            onValueChange={v => { setSelectedTermId(v); setSearch(''); setFilterCategory(''); }}
            triggerClassName="w-52 h-9 text-sm font-medium"
            placeholder="Select term..."
            options={state.terms.map(t => ({ value: t.id, label: `${t.name}${t.isActive ? ' (Active)' : ''}` }))}
          />
          <div className="relative flex-1 min-w-48">
            <Input placeholder="Search sections..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {/* Category filter */}
          <SearchableSelect
            value={filterCategory || '__all__'}
            onValueChange={v => setFilterCategory(v === '__all__' ? '' : v)}
            triggerClassName="w-36 h-9 text-sm"
            placeholder="All Categories"
            options={[
              { value: '__all__', label: 'All Categories' },
              ...(['Major','GE','Elective GE','HK/PE/NSTP','Specialized','Thesis','Seminar','Internship/Practicum'] as CourseCategory[]).map(c => ({ value: c, label: c })),
            ]}
          />
          {filterCategory && (
            <Button variant="ghost" size="sm" className="h-9 px-2 text-xs text-muted-foreground gap-1" onClick={() => setFilterCategory('')}>
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-secondary hover:bg-secondary/90 gap-2" disabled={!selectedTermId}>
                <PlusCircle size={16} /> Add Section
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Add New Section — {selectedTerm?.name ?? 'Select a term'}</DialogTitle>
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Edit Section — {state.courses.find(c => c.id === editSection.courseId)?.code} Sec {editSection.sectionCode}</DialogTitle>
              </DialogHeader>
              <div className="mt-2">
                {renderFormFields(editForm, setEditForm, true)}
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setEditSection(null)}>Cancel</Button>
                  <Button className="flex-1 bg-primary text-foreground" onClick={handleEditSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <div className="portal-panel">
          <div className="portal-panel-header">
            {selectedTerm ? `${selectedTerm.name} — Sections (${filtered.length})` : 'No Term Selected'}
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
                        <td className="py-2.5 px-3 font-mono text-foreground">
                          <div className="flex items-center gap-1.5">
                            {sec.sectionType === 'lecture' && (
                              <span className="text-[9px] font-sans font-semibold uppercase tracking-wide text-primary bg-primary/10 rounded px-1 py-0.5">Lec</span>
                            )}
                            {(sec.sectionType === 'lab' || sec.sectionType === 'recitation') && (
                              <span className={`text-[9px] font-sans font-semibold uppercase tracking-wide rounded px-1 py-0.5 ${sec.sectionType === 'recitation' ? 'text-teal-700 bg-teal-100' : 'text-secondary bg-secondary/10'}`}>
                                {sec.sectionType === 'recitation' ? 'Rec' : 'Lab'}
                              </span>
                            )}
                            <span>{sec.sectionCode}</span>
                          </div>
                          {sec.parentSectionId && (() => {
                            const parent = state.sections.find(s => s.id === sec.parentSectionId);
                            return parent ? (
                              <span className="text-[10px] text-muted-foreground font-sans">
                                under {parent.sectionCode}
                              </span>
                            ) : null;
                          })()}
                        </td>
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
                          {(() => {
                            // New: child lab/rec sections hold the lab schedule
                            const childSections = state.sections.filter(s => s.parentSectionId === sec.id);
                            if (childSections.length > 0) {
                              return (
                                <div className="flex flex-col gap-0.5">
                                  {childSections.map(cs => (
                                    <div key={cs.id} className="flex items-center gap-1">
                                      <MapPin size={10} />
                                      <span className="font-mono mr-0.5">{cs.sectionCode}:</span>
                                      {cs.schedule.days.length > 0 ? formatSchedule(cs.schedule) : <span className="italic">Flexible</span>}
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            // Legacy: labSchedule field on the section itself
                            if (sec.labSchedule) {
                              return <div className="flex items-center gap-1"><MapPin size={10} />{formatSchedule(sec.labSchedule)}</div>;
                            }
                            // Child sections (lab/rec rows) don't need a lab schedule column
                            if (sec.parentSectionId) return null;
                            return <span className="text-muted-foreground/50">—</span>;
                          })()}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge className={pct >= 100 ? 'bg-red-100 text-red-700 border-red-300 text-xs' : pct >= 90 ? 'bg-yellow-100 text-yellow-700 border-yellow-300 text-xs' : 'bg-green-100 text-green-700 border-green-300 text-xs'}>
                            {pct >= 100 ? 'Full' : pct >= 90 ? 'Almost Full' : 'Open'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                              onClick={() => { const children = state.sections.filter(s => s.parentSectionId === sec.id); setEditSection(sec); setEditForm(sectionToForm(sec, children)); }}>
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
                                  <AlertDialogAction className="bg-red-600 text-foreground" onClick={() => handleDelete(sec.id)}>
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
