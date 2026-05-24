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
import { PlusCircle, Users, Clock, MapPin } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { Day } from '../../lib/types';

const DAYS: Day[] = ['M', 'T', 'W', 'Th', 'F', 'S'];
const TIMES = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'];

export default function OCSSections() {
  const { state, addSection, getActiveTerm } = useApp();
  const { toast } = useToast();
  const activeTerm = getActiveTerm();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    courseId: '', facultyId: '', sectionCode: 'A', slots: 35,
    days: [] as Day[], startTime: '07:30', endTime: '09:00', room: '',
    hasLab: false, labDays: [] as Day[], labStart: '13:00', labEnd: '16:00', labRoom: '',
  });

  const activeSections = activeTerm
    ? state.sections.filter(s => s.termId === activeTerm.id)
    : [];

  const filtered = activeSections.filter(s => {
    const course = state.courses.find(c => c.id === s.courseId);
    const faculty = state.users.find(u => u.id === s.facultyId);
    return !search || course?.code.toLowerCase().includes(search.toLowerCase()) ||
      course?.title.toLowerCase().includes(search.toLowerCase()) ||
      faculty?.name.toLowerCase().includes(search.toLowerCase());
  });

  const toggleDay = (day: Day, isLab = false) => {
    if (isLab) {
      setForm(f => ({ ...f, labDays: f.labDays.includes(day) ? f.labDays.filter(d => d !== day) : [...f.labDays, day] }));
    } else {
      setForm(f => ({ ...f, days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day] }));
    }
  };

  const handleAdd = () => {
    if (!form.courseId || !form.facultyId || form.days.length === 0 || !form.room) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    const course = state.courses.find(c => c.id === form.courseId);
    addSection({
      courseId: form.courseId,
      termId: activeTerm!.id,
      sectionCode: form.sectionCode,
      facultyId: form.facultyId,
      slots: form.slots,
      enrolled: 0,
      schedule: { days: form.days, startTime: form.startTime, endTime: form.endTime, room: form.room },
      labSchedule: (form.hasLab || course?.type === 'Lec+Lab' || course?.type === 'Lab') && form.labDays.length > 0
        ? { days: form.labDays, startTime: form.labStart, endTime: form.labEnd, room: form.labRoom }
        : undefined,
    });
    toast({ title: 'Section added successfully' });
    setOpen(false);
    setForm({ courseId: '', facultyId: '', sectionCode: 'A', slots: 35, days: [], startTime: '07:30', endTime: '09:00', room: '', hasLab: false, labDays: [], labStart: '13:00', labEnd: '16:00', labRoom: '' });
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-secondary hover:bg-secondary/90 gap-2" disabled={!activeTerm}>
                <PlusCircle size={16} /> Add Section
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Section — {activeTerm?.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label>Course</Label>
                    <Select value={form.courseId} onValueChange={v => setForm(f => ({ ...f, courseId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                      <SelectContent>
                        {state.courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Faculty</Label>
                    <Select value={form.facultyId} onValueChange={v => setForm(f => ({ ...f, facultyId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
                      <SelectContent>
                        {state.users.filter(u => u.role === 'faculty').map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Section Code</Label>
                    <Input value={form.sectionCode} onChange={e => setForm(f => ({ ...f, sectionCode: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Slots</Label>
                    <Input type="number" min={1} value={form.slots} onChange={e => setForm(f => ({ ...f, slots: +e.target.value }))} />
                  </div>
                </div>
                {/* Lecture Schedule */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-3">
                  <p className="font-semibold text-sm text-foreground">Lecture Schedule</p>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Days</Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAYS.map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDay(d)}
                          className={`w-10 h-8 rounded-md text-xs font-semibold border transition-colors
                            ${form.days.includes(d) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Start</Label>
                      <Select value={form.startTime} onValueChange={v => setForm(f => ({ ...f, startTime: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">End</Label>
                      <Select value={form.endTime} onValueChange={v => setForm(f => ({ ...f, endTime: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Room</Label>
                      <Input className="h-8 text-xs" value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="e.g. CS-101" />
                    </div>
                  </div>
                </div>
                {/* Lab Schedule */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-3">
                  <p className="font-semibold text-sm text-foreground">Lab Schedule (optional)</p>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Days</Label>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAYS.map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDay(d, true)}
                          className={`w-10 h-8 rounded-md text-xs font-semibold border transition-colors
                            ${form.labDays.includes(d) ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-background text-foreground border-border hover:bg-muted'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Start</Label>
                      <Select value={form.labStart} onValueChange={v => setForm(f => ({ ...f, labStart: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">End</Label>
                      <Select value={form.labEnd} onValueChange={v => setForm(f => ({ ...f, labEnd: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Room</Label>
                      <Input className="h-8 text-xs" value={form.labRoom} onChange={e => setForm(f => ({ ...f, labRoom: e.target.value }))} placeholder="e.g. CS-Lab1" />
                    </div>
                  </div>
                </div>
                <Button className="w-full bg-secondary hover:bg-secondary/90" onClick={handleAdd}>Add Section</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {activeTerm ? `${activeTerm.name} — Sections (${filtered.length})` : 'No Active Term'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Course', 'Sec', 'Faculty', 'Slots', 'Schedule', 'Lab Schedule', 'Status'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(sec => {
                    const course = state.courses.find(c => c.id === sec.courseId);
                    const faculty = state.users.find(u => u.id === sec.facultyId);
                    const pct = Math.round((sec.enrolled / sec.slots) * 100);
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
                            <span className="text-foreground font-medium">{sec.enrolled}/{sec.slots}</span>
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
