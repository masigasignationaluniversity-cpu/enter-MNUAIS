import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Unlock, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import type { PrerogativeStatus } from '@/lib/types';

const statusBadge = (s: PrerogativeStatus) => {
  const map = { pending: 'bg-yellow-100 text-yellow-800 border-yellow-200', approved: 'bg-green-100 text-green-800 border-green-200', denied: 'bg-red-100 text-red-800 border-red-200' };
  return <Badge className={`text-xs border ${map[s]}`}>{s.toUpperCase()}</Badge>;
};

export default function OCSPrerogatives() {
  const { state } = useApp();
  const [termFilter, setTermFilter] = useState(state.terms.find(t => t.isActive)?.id ?? 'all');
  const [search, setSearch] = useState('');

  const dept = state.currentUser?.department ?? '';
  const deptCourseIds = new Set(dept ? state.courses.filter(c => c.department === dept).map(c => c.id) : state.courses.map(c => c.id));

  const progs = state.prerogatives.filter(p => {
    if (termFilter !== 'all' && p.termId !== termFilter) return false;
    const sec = state.sections.find(s => s.id === p.sectionId);
    if (!sec || !deptCourseIds.has(sec.courseId)) return false;
    return true;
  });

  const filterProgs = (list: typeof progs) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(p => {
      const student = state.users.find(u => u.id === p.studentId);
      const sec = state.sections.find(s => s.id === p.sectionId);
      const course = sec ? state.courses.find(c => c.id === sec.courseId) : undefined;
      return student?.name.toLowerCase().includes(q) || student?.studentNumber?.toLowerCase().includes(q) || course?.code.toLowerCase().includes(q);
    });
  };

  const pending   = progs.filter(p => p.status === 'pending');
  const processed = progs.filter(p => p.status !== 'pending');

  const getStudent = (id: string) => state.users.find(u => u.id === id);
  const getSection = (id: string) => state.sections.find(s => s.id === id);
  const getCourse  = (secId: string) => { const sec = state.sections.find(s => s.id === secId); return sec ? state.courses.find(c => c.id === sec.courseId) : undefined; };
  const getFaculty = (secId: string) => { const sec = state.sections.find(s => s.id === secId); return sec ? state.users.find(u => u.id === sec.facultyId) : undefined; };

  const PrgCard = ({ prg }: { prg: typeof progs[0] }) => {
    const student = getStudent(prg.studentId);
    const section = getSection(prg.sectionId);
    const course  = getCourse(prg.sectionId);
    const faculty = getFaculty(prg.sectionId);
    if (!student || !section || !course) return null;
    return (
      <div className="border rounded-md px-4 py-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="font-semibold text-sm">{student.name}</p>
                <p className="text-xs text-muted-foreground">{student.studentNumber}</p>
              </div>
            </div>
            <p className="text-sm font-medium text-primary">{course.code} — {course.title} (Sec {section.sectionCode})</p>
            <p className="text-xs text-muted-foreground">FIC: {faculty?.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Slots: {section.enrolled}/{section.slots} (FULL)</p>
            <p className="text-xs italic text-muted-foreground mt-1.5">"{prg.reason}"</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {statusBadge(prg.status)}
            <p className="text-xs text-muted-foreground">{prg.requestedAt}</p>
            {prg.processedAt && <p className="text-xs text-muted-foreground">Processed: {prg.processedAt}</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <PortalLayout role="ocs" userName={state.currentUser?.name ?? ''}>
      <div className="space-y-4">

        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Unlock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Prerogatives Overview
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">View all student prerogative requests (processed by faculty)</p>
          </div>
          <Select value={termFilter} onValueChange={setTermFilter}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="All terms" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              {state.terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* ── Stats row ────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b pb-3">
          <span>Pending: <strong className="text-yellow-700">{pending.length}</strong></span>
          <span>Approved: <strong className="text-green-700">{progs.filter(p => p.status === 'approved').length}</strong></span>
          <span>Denied: <strong className="text-red-700">{progs.filter(p => p.status === 'denied').length}</strong></span>
          <span>Total: <strong className="text-foreground">{progs.length}</strong></span>
        </div>

        {/* ── Search ──────────────────────────────────────────────── */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by student name, ID, or course code..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* ── Pending ──────────────────────────────────────────────── */}
        <div className="rounded-md overflow-hidden border border-border">
          <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Pending Requests</span>
            {pending.length > 0 && <Badge className="bg-yellow-300 text-yellow-900 text-xs border-0">{pending.length}</Badge>}
          </div>
          <div className="p-3 space-y-2 bg-background">
            {filterProgs(pending).length === 0 ? (
              <div className="py-10 text-center">
                <Clock className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No pending prerogatives.</p>
                <p className="text-muted-foreground text-sm mt-1">All prerogative requests have been processed by faculty.</p>
              </div>
            ) : (
              filterProgs(pending).map(p => <PrgCard key={p.id} prg={p} />)
            )}
          </div>
        </div>

        {/* ── All Records ──────────────────────────────────────────── */}
        <div className="rounded-md overflow-hidden border border-border">
          <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> All Prerogative Records
            </span>
            <span className="text-primary-foreground/70 text-xs font-normal">{progs.length} total</span>
          </div>
          <div className="p-3 space-y-2 bg-background">
            {filterProgs(progs).length === 0 ? (
              <div className="py-10 text-center">
                <Unlock className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">No prerogative records.</p>
              </div>
            ) : (
              filterProgs(progs).map(p => <PrgCard key={p.id} prg={p} />)
            )}
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}
