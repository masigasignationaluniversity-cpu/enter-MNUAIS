import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Unlock, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { PrerogativeStatus } from '@/lib/types';

const statusBadge = (s: PrerogativeStatus) => {
  const map = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    denied: 'bg-red-100 text-red-800 border-red-200',
  };
  return <Badge className={`text-xs ${map[s]}`}>{s.toUpperCase()}</Badge>;
};

export default function OCSPrerogatives() {
  const { state } = useApp();
  const [termFilter, setTermFilter] = useState(state.terms.find(t => t.isActive)?.id ?? 'all');

  const progs = state.prerogatives.filter(p => termFilter === 'all' || p.termId === termFilter);
  const pending = progs.filter(p => p.status === 'pending');
  const processed = progs.filter(p => p.status !== 'pending');

  const getStudent = (id: string) => state.users.find(u => u.id === id);
  const getSection = (id: string) => state.sections.find(s => s.id === id);
  const getCourse = (secId: string) => {
    const sec = state.sections.find(s => s.id === secId);
    return sec ? state.courses.find(c => c.id === sec.courseId) : undefined;
  };
  const getFaculty = (secId: string) => {
    const sec = state.sections.find(s => s.id === secId);
    return sec ? state.users.find(u => u.id === sec.facultyId) : undefined;
  };

  const PrgCard = ({ prg }: { prg: typeof progs[0] }) => {
    const student = getStudent(prg.studentId);
    const section = getSection(prg.sectionId);
    const course = getCourse(prg.sectionId);
    const faculty = getFaculty(prg.sectionId);
    if (!student || !section || !course) return null;
    return (
      <Card className="portal-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                  {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{student.name}</p>
                  <p className="text-xs text-gray-500">{student.studentNumber}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-primary">{course.code} — {course.title} (Sec {section.sectionCode})</p>
              <p className="text-xs text-gray-500">FIC: {faculty?.name}</p>
              <p className="text-xs text-gray-500 mt-1">Slots: {section.enrolled}/{section.slots} (FULL)</p>
              <p className="text-xs text-gray-600 mt-2 max-w-xs italic">"{prg.reason}"</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {statusBadge(prg.status)}
              <p className="text-xs text-gray-400">{prg.requestedAt}</p>
              {prg.processedAt && <p className="text-xs text-gray-400">Processed: {prg.processedAt}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <PortalLayout role="ocs" userName={state.currentUser?.name ?? ''}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Unlock className="w-6 h-6 text-primary" /> Prerogatives Overview
            </h1>
            <p className="text-gray-600 mt-1">View all student prerogative requests (processed by faculty)</p>
          </div>
          <Select value={termFilter} onValueChange={setTermFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="All terms" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              {state.terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending', count: pending.length, icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
            { label: 'Approved', count: processed.filter(p => p.status === 'approved').length, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
            { label: 'Denied', count: processed.filter(p => p.status === 'denied').length, icon: XCircle, color: 'text-red-600 bg-red-50' },
          ].map(s => (
            <Card key={s.label} className={`${s.color} border-0`}>
              <CardContent className="pt-4 pb-4 text-center">
                <p className={`text-2xl font-bold ${s.color.split(' ')[0]}`}>{s.count}</p>
                <p className="text-xs text-gray-600 mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="pending">
          <TabsList><TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger><TabsTrigger value="all">All ({progs.length})</TabsTrigger></TabsList>
          <TabsContent value="pending" className="mt-4 space-y-3">
            {pending.length === 0 ? <p className="text-gray-400 text-center py-8">No pending prerogatives.</p> : pending.map(p => <PrgCard key={p.id} prg={p} />)}
          </TabsContent>
          <TabsContent value="all" className="mt-4 space-y-3">
            {progs.length === 0 ? <p className="text-gray-400 text-center py-8">No prerogative records.</p> : progs.map(p => <PrgCard key={p.id} prg={p} />)}
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
}
