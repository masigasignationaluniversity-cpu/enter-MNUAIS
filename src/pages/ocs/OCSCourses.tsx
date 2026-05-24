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
import { Switch } from '../../components/ui/switch';
import { BookPlus, Search, FlaskConical, BookOpen, Repeat } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { CourseType } from '../../lib/types';

const typeIcons: Record<CourseType, React.ReactNode> = {
  Lec: <BookOpen size={12} />,
  Lab: <FlaskConical size={12} />,
  Recitation: <Repeat size={12} />,
  'Lec+Lab': <><BookOpen size={12} /><FlaskConical size={12} /></>,
};

const typeBadge: Record<CourseType, string> = {
  Lec: 'bg-primary/10 text-primary border-primary/30',
  Lab: 'bg-secondary/10 text-secondary border-secondary/30',
  Recitation: 'bg-purple-100 text-purple-700 border-purple-300',
  'Lec+Lab': 'bg-orange-100 text-orange-700 border-orange-300',
};

export default function OCSCourses() {
  const { state, addCourse } = useApp();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: '', title: '', units: 3, labUnits: 1,
    type: 'Lec' as CourseType, department: '', isPE: false, isNSTP: false
  });

  const filtered = state.courses.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.department.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!form.code || !form.title || !form.department) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    addCourse({
      ...form,
      labUnits: form.type === 'Lab' || form.type === 'Lec+Lab' ? form.labUnits : undefined
    });
    toast({ title: 'Course added', description: `${form.code} has been added.` });
    setOpen(false);
    setForm({ code: '', title: '', units: 3, labUnits: 1, type: 'Lec', department: '', isPE: false, isNSTP: false });
  };

  return (
    <PortalLayout title="Course Management">
      <div className="space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-secondary hover:bg-secondary/90 gap-2">
                <BookPlus size={16} /> Add Course
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Course</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Course Code *</Label>
                    <Input placeholder="e.g. CS 401" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as CourseType }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['Lec', 'Lab', 'Recitation', 'Lec+Lab'] as CourseType[]).map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Course Title *</Label>
                    <Input placeholder="Course title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Lec Units</Label>
                    <Input type="number" min={0} max={6} value={form.units} onChange={e => setForm(f => ({ ...f, units: +e.target.value }))} />
                  </div>
                  {(form.type === 'Lab' || form.type === 'Lec+Lab') && (
                    <div className="space-y-1.5">
                      <Label>Lab Units</Label>
                      <Input type="number" min={0} max={3} value={form.labUnits} onChange={e => setForm(f => ({ ...f, labUnits: +e.target.value }))} />
                    </div>
                  )}
                  <div className="space-y-1.5 col-span-2">
                    <Label>Department *</Label>
                    <Input placeholder="Department" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="pe" checked={form.isPE} onCheckedChange={v => setForm(f => ({ ...f, isPE: v, isNSTP: false }))} />
                    <Label htmlFor="pe" className="cursor-pointer">PE Course</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="nstp" checked={form.isNSTP} onCheckedChange={v => setForm(f => ({ ...f, isNSTP: v, isPE: false }))} />
                    <Label htmlFor="nstp" className="cursor-pointer">NSTP Course</Label>
                  </div>
                </div>
                <Button className="w-full bg-secondary hover:bg-secondary/90" onClick={handleAdd}>Add Course</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Courses ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide">Code</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide">Title</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide">Type</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide">Units</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide">Department</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(course => (
                    <tr key={course.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-foreground">{course.code}</td>
                      <td className="py-2.5 px-3 text-foreground">{course.title}</td>
                      <td className="py-2.5 px-3">
                        <Badge className={`text-xs flex items-center gap-1 w-fit ${typeBadge[course.type]}`}>
                          {typeIcons[course.type]} {course.type}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-foreground">
                        {course.units}{course.labUnits ? `+${course.labUnits}` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{course.department}</td>
                      <td className="py-2.5 px-3">
                        {course.isPE && <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-300">PE</Badge>}
                        {course.isNSTP && <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-300">NSTP</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No courses found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
