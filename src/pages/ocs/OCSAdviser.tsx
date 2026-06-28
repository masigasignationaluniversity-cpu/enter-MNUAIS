import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import PortalLayout from '@/components/shared/PortalLayout';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, UserCog, UserX } from 'lucide-react';
import { toast } from 'sonner';

type TabValue = 'no_adviser' | 'has_adviser';

export default function OCSAdviser() {
  const { state, updateUser } = useApp();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabValue>('no_adviser');
  const [saving, setSaving] = useState<string | null>(null);

  const me = state.currentUser!;
  const ocsCollegeName = (() => {
    if (!me.college) return '';
    const c = state.colleges.find(cc => cc.id === me.college || cc.name === me.college);
    return c?.name ?? me.college;
  })();

  const isInCollege = (u: typeof state.users[0]) => {
    if (!ocsCollegeName) return true;
    const c = state.colleges.find(cc => cc.id === u.college || cc.name === u.college);
    return (c?.name ?? u.college ?? '') === ocsCollegeName;
  };

  const allStudents = useMemo(() =>
    state.users
      .filter(u => u.role === 'student' && isInCollege(u))
      .sort((a, b) => a.name.localeCompare(b.name)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [state.users, state.colleges, ocsCollegeName]);

  const noAdviserCount = allStudents.filter(s => !s.adviserId).length;
  const hasAdviserCount = allStudents.filter(s => !!s.adviserId).length;

  const students = useMemo(() =>
    allStudents
      .filter(u => {
        if (tab === 'no_adviser') return !u.adviserId;
        return !!u.adviserId;
      })
      .filter(u => {
        if (!search) return true;
        const q = search.toLowerCase();
        return u.name.toLowerCase().includes(q) ||
          (u.studentNumber ?? '').toLowerCase().includes(q) ||
          (u.program ?? '').toLowerCase().includes(q);
      }),
  [allStudents, tab, search]);

  const facultyOptions = useMemo(() =>
    state.users
      .filter(u => u.role === 'faculty' && isInCollege(u))
      .sort((a, b) => a.name.localeCompare(b.name)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [state.users, state.colleges, ocsCollegeName]);

  const handleAssign = async (studentId: string, adviserId: string) => {
    setSaving(studentId);
    try {
      await updateUser(studentId, { adviserId: adviserId === '_none' ? '' : adviserId });
      toast.success('Adviser assigned.');
    } catch {
      toast.error('Failed to assign adviser.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <PortalLayout role="ocs" currentPath="/ocs/adviser">
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold">Student Adviser Assignment</h1>
            {ocsCollegeName && (
              <p className="text-sm text-muted-foreground mt-0.5">{ocsCollegeName} — {allStudents.length} student{allStudents.length !== 1 ? 's' : ''}</p>
            )}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, student no., program..."
              className="pl-8 h-9 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {facultyOptions.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
            No faculty members found for this college. Add faculty users first.
          </div>
        )}

        <Tabs value={tab} onValueChange={v => setTab(v as TabValue)}>
          <TabsList className="h-9">
            <TabsTrigger value="no_adviser" className="text-xs">
              <UserX className="w-3.5 h-3.5 mr-1" />
              No Adviser Yet <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{noAdviserCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="has_adviser" className="text-xs">
              <UserCog className="w-3.5 h-3.5 mr-1" />
              Has Adviser <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{hasAdviserCount}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Student No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Program</TableHead>
                <TableHead className="w-64">Assigned Adviser</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                    No students found.
                  </TableCell>
                </TableRow>
              ) : students.map(student => {
                const adviser = student.adviserId
                  ? state.users.find(u => u.id === student.adviserId)
                  : null;
                return (
                  <TableRow key={student.id}>
                    <TableCell className="font-mono text-xs">{student.studentNumber ?? '—'}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{student.name}</div>
                      <div className="md:hidden text-xs text-muted-foreground mt-0.5">{student.program ?? '—'}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{student.program ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={student.adviserId ?? '_none'}
                          onValueChange={val => handleAssign(student.id, val)}
                          disabled={saving === student.id}
                        >
                          <SelectTrigger className="h-8 text-xs w-52">
                            <SelectValue placeholder="— No adviser —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">— No adviser —</SelectItem>
                            {facultyOptions.map(f => (
                              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {adviser && (
                          <Badge variant="outline" className="text-xs hidden lg:flex">
                            <UserCog className="w-3 h-3 mr-1" />
                            {adviser.name.split(' ')[0]}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </PortalLayout>
  );
}
