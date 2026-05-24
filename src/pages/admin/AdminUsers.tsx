import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, ArrowUp, ArrowLeftRight, UserCheck, Users, GraduationCap, BookOpen } from 'lucide-react';
import type { Role, User } from '@/lib/types';

const roleColors: Record<string, string> = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  ocs: 'bg-blue-100 text-blue-800 border-blue-200',
  faculty: 'bg-secondary/10 text-secondary-foreground border-secondary/20',
  student: 'bg-purple-100 text-purple-800 border-purple-200',
};
const roleIcons: Record<string, React.ElementType> = {
  admin: UserCheck,
  ocs: BookOpen,
  faculty: GraduationCap,
  student: Users,
};

const emptyForm = { name: '', username: '', password: '', email: '', role: 'student' as Role, department: '', program: '', yearLevel: '1', studentNumber: '', employeeId: '' };

export default function AdminUsers() {
  const { state, addUser, updateUser, removeUser, promoteStudents } = useApp();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [transferUser, setTransferUser] = useState<User | null>(null);
  const [transferProgram, setTransferProgram] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<string[]>([]);

  const byRole = (role: Role) => state.users.filter(u => u.role === role && u.status !== 'inactive' &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())));

  const handleAdd = () => {
    if (!form.name || !form.username || !form.password) return;
    addUser({
      name: form.name, username: form.username, password: form.password,
      email: form.email, role: form.role,
      department: form.department || undefined,
      program: form.program || undefined,
      yearLevel: form.yearLevel ? parseInt(form.yearLevel) : undefined,
      studentNumber: form.studentNumber || undefined,
      employeeId: form.employeeId || undefined,
      status: 'active',
    });
    setForm(emptyForm);
    setAddOpen(false);
  };

  const handleEdit = () => {
    if (!editUser) return;
    updateUser(editUser.id, {
      name: form.name, email: form.email,
      department: form.department || undefined,
      program: form.program || undefined,
      yearLevel: form.yearLevel ? parseInt(form.yearLevel) : undefined,
      studentNumber: form.studentNumber || undefined,
      employeeId: form.employeeId || undefined,
    });
    setEditUser(null);
  };

  const openEdit = (u: User) => {
    setForm({ ...emptyForm, name: u.name, username: u.username, password: u.password, email: u.email || '', role: u.role, department: u.department || '', program: u.program || '', yearLevel: String(u.yearLevel || ''), studentNumber: u.studentNumber || '', employeeId: u.employeeId || '' });
    setEditUser(u);
  };

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const userCard = (u: User, role: Role) => {
    const Icon = roleIcons[role];
    const isSelected = selected.includes(u.id);
    return (
      <div key={u.id} className={`p-4 border rounded-lg hover:border-primary/30 transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
        <div className="flex items-start gap-3">
          {role === 'student' && (
            <input type="checkbox" className="mt-1 cursor-pointer" checked={isSelected} onChange={() => toggleSelect(u.id)} />
          )}
          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
            {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900 truncate">{u.name}</p>
              <Badge className={`text-xs ${roleColors[role]}`}>{role}</Badge>
            </div>
            <p className="text-xs text-gray-500">@{u.username}</p>
            {u.email && <p className="text-xs text-gray-400 truncate">{u.email}</p>}
            <div className="flex gap-2 flex-wrap mt-1 text-xs text-gray-500">
              {u.studentNumber && <span>#{u.studentNumber}</span>}
              {u.yearLevel && <span>Year {u.yearLevel}</span>}
              {u.program && <span className="truncate max-w-[120px]">{u.program}</span>}
              {u.employeeId && <span>{u.employeeId}</span>}
              {u.department && <span>{u.department}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => openEdit(u)}>
              <Pencil className="w-3 h-3" />
            </Button>
            {role === 'student' && (
              <>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-orange-600 hover:bg-orange-50" title="Promote year level" onClick={() => promoteStudents([u.id])}>
                  <ArrowUp className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-purple-600 hover:bg-purple-50" title="Transfer program" onClick={() => { setTransferUser(u); setTransferProgram(u.program || ''); }}>
                  <ArrowLeftRight className="w-3 h-3" />
                </Button>
              </>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate {u.name}?</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={() => removeUser(u.id)}>Deactivate</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {role === 'student' && <div className="flex items-center gap-1 mt-2 ml-7">
          <Icon className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-400">{u.status === 'transferred' ? '🔄 Transferred' : '✓ Active'}</span>
        </div>}
      </div>
    );
  };

  const formDialog = (open: boolean, onClose: () => void, title: string, onSubmit: () => void, isEdit = false) => (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div><Label>Full Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          {!isEdit && <>
            <div><Label>Username *</Label><Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></div>
            <div><Label>Password *</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
            <div>
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as Role }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="ocs">OCS</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>}
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div><Label>Department</Label><Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></div>
          {(form.role === 'student' || isEdit) && <>
            <div><Label>Student Number</Label><Input value={form.studentNumber} onChange={e => setForm(f => ({ ...f, studentNumber: e.target.value }))} /></div>
            <div><Label>Program</Label><Input value={form.program} onChange={e => setForm(f => ({ ...f, program: e.target.value }))} /></div>
            <div><Label>Year Level</Label><Input type="number" min={1} max={5} value={form.yearLevel} onChange={e => setForm(f => ({ ...f, yearLevel: e.target.value }))} /></div>
          </>}
          {(form.role === 'faculty' || isEdit) && (
            <div><Label>Employee ID</Label><Input value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} /></div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-primary text-white" onClick={onSubmit}>{isEdit ? 'Save Changes' : 'Add User'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <PortalLayout role="admin" userName={state.currentUser?.name ?? ''}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage all system users</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search users..." className="pl-9 w-52" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-white gap-2"><Plus className="w-4 h-4" /> Add User</Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <span className="text-sm font-medium text-primary">{selected.length} student(s) selected</span>
            <Button size="sm" variant="outline" className="border-orange-400 text-orange-700 hover:bg-orange-50 gap-1"
              onClick={() => { promoteStudents(selected); setSelected([]); }}>
              <ArrowUp className="w-3 h-3" /> Promote All
            </Button>
            <Button size="sm" variant="ghost" className="text-gray-500" onClick={() => setSelected([])}>Clear</Button>
          </div>
        )}

        <Tabs defaultValue="student">
          <TabsList className="bg-gray-100">
            {(['admin', 'ocs', 'faculty', 'student'] as Role[]).map(r => (
              <TabsTrigger key={r} value={r} className="capitalize">{r} ({byRole(r).length})</TabsTrigger>
            ))}
          </TabsList>
          {(['admin', 'ocs', 'faculty', 'student'] as Role[]).map(role => (
            <TabsContent key={role} value={role} className="mt-4">
              {byRole(role).length === 0
                ? <p className="text-gray-400 text-center py-8">No {role} users found.</p>
                : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{byRole(role).map(u => userCard(u, role))}</div>
              }
            </TabsContent>
          ))}
        </Tabs>

        {/* Add user dialog */}
        {formDialog(addOpen, () => { setAddOpen(false); setForm(emptyForm); }, 'Add New User', handleAdd)}

        {/* Edit user dialog */}
        {editUser && formDialog(true, () => setEditUser(null), `Edit: ${editUser.name}`, handleEdit, true)}

        {/* Transfer dialog */}
        {transferUser && (
          <Dialog open onOpenChange={v => !v && setTransferUser(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Transfer: {transferUser.name}</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><Label>New Program</Label><Input value={transferProgram} onChange={e => setTransferProgram(e.target.value)} placeholder="e.g. BS Information Technology" /></div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setTransferUser(null)}>Cancel</Button>
                  <Button className="flex-1 bg-primary text-white" onClick={() => {
                    if (transferProgram) { updateUser(transferUser.id, { program: transferProgram, status: 'transferred' }); setTransferUser(null); }
                  }}>Transfer</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PortalLayout>
  );
}
