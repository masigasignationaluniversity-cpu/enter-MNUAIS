import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, ArrowUp, ArrowLeftRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import type { Role, User } from '@/lib/types';

const roleColors: Record<string, string> = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  ocs: 'bg-blue-100 text-blue-800 border-blue-200',
  faculty: 'bg-secondary/10 text-secondary-foreground border-secondary/20',
  student: 'bg-purple-100 text-purple-800 border-purple-200',
};

const emptyForm = {
  name: '', username: '', password: '', newPassword: '', email: '',
  role: 'student' as Role, department: '', program: '', yearLevel: '1',
  studentNumber: '', employeeId: '',
};

export default function AdminUsers() {
  const { state, addUser, updateUser, removeUser, promoteStudents, transferStudent } = useApp();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [transferUser, setTransferUser] = useState<User | null>(null);
  const [transferProgram, setTransferProgram] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [showAddPass, setShowAddPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const setF = (k: keyof typeof emptyForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const byRole = (role: Role) => state.users.filter(u => u.role === role && u.status !== 'inactive' &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())));

  // When program changes, auto-fill department from degree program's department
  const handleProgramChange = (progId: string) => {
    setF('program', progId);
    const prog = state.degreePrograms.find(p => p.id === progId);
    if (prog) {
      const dept = state.departments.find(d => d.id === prog.departmentId);
      if (dept) setF('department', dept.id);
    }
  };

  const handleAdd = async () => {
    if (!form.name || !form.username || !form.password) { setFormError('Name, username and password are required.'); return; }
    setLoading(true); setFormError('');
    try {
      // Resolve department name and program name from IDs (ignore _none sentinel)
      const deptName = form.department && form.department !== '_none'
        ? (state.departments.find(d => d.id === form.department)?.name ?? form.department)
        : undefined;
      const progName = form.program && form.program !== '_none'
        ? (state.degreePrograms.find(p => p.id === form.program)?.name ?? form.program)
        : undefined;
      await addUser({
        name: form.name, username: form.username, password: form.password,
        email: form.email, role: form.role,
        department: deptName || undefined,
        program: progName || undefined,
        yearLevel: form.yearLevel ? parseInt(form.yearLevel) : undefined,
        studentNumber: form.studentNumber || undefined,
        employeeId: form.employeeId || undefined,
        status: 'active',
      });
      setForm(emptyForm);
      setAddOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add user.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editUser || !form.name || !form.username) { setFormError('Name and username are required.'); return; }
    setLoading(true); setFormError('');
    try {
      const deptName = form.department && form.department !== '_none'
        ? (state.departments.find(d => d.id === form.department)?.name ?? form.department)
        : undefined;
      const progName = form.program && form.program !== '_none'
        ? (state.degreePrograms.find(p => p.id === form.program)?.name ?? form.program)
        : undefined;
      await updateUser(editUser.id, {
        name: form.name,
        username: form.username,
        email: form.email,
        newPassword: form.newPassword || undefined,
        department: deptName || undefined,
        program: progName || undefined,
        yearLevel: form.yearLevel ? parseInt(form.yearLevel) : undefined,
        studentNumber: form.studentNumber || undefined,
        employeeId: form.employeeId || undefined,
      });
      setEditUser(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update user.');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (u: User) => {
    setFormError('');
    // Try to match department name back to an ID
    const deptId = state.departments.find(d => d.name === u.department)?.id ?? u.department ?? '';
    const progId = state.degreePrograms.find(p => p.name === u.program)?.id ?? u.program ?? '';
    setForm({ ...emptyForm, name: u.name, username: u.username, email: u.email || '', role: u.role, department: deptId, program: progId, yearLevel: String(u.yearLevel || ''), studentNumber: u.studentNumber || '', employeeId: u.employeeId || '' });
    setEditUser(u);
  };

  const handleRemove = async (userId: string) => {
    await removeUser(userId);
  };

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Role-based form fields
  const renderRoleFields = (role: Role, isEdit = false) => {
    if (role === 'admin') {
      // Admin: name, username, password, email only
      return null;
    }
    if (role === 'ocs') {
      return (
        <div>
          <Label>Department</Label>
          <Select value={form.department} onValueChange={v => setF('department', v)}>
            <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">— None —</SelectItem>
              {state.departments.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (role === 'faculty') {
      return (
        <>
          <div>
            <Label>Employee ID</Label>
            <Input value={form.employeeId} onChange={e => setF('employeeId', e.target.value)} placeholder="e.g. EMP-001" />
          </div>
          <div>
            <Label>Department</Label>
            <Select value={form.department} onValueChange={v => setF('department', v)}>
              <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— None —</SelectItem>
                {state.departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      );
    }
    if (role === 'student') {
      return (
        <>
          <div>
            <Label>Student Number</Label>
            <Input value={form.studentNumber} onChange={e => setF('studentNumber', e.target.value)} placeholder="e.g. 2024-10001" />
          </div>
          <div>
            <Label>Year Level</Label>
            <Select value={form.yearLevel || '1'} onValueChange={v => setF('yearLevel', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map(y => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Degree Program</Label>
            <Select value={form.program} onValueChange={handleProgramChange}>
              <SelectTrigger><SelectValue placeholder="Select program..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— None —</SelectItem>
                {state.degreePrograms.map(p => {
                  const dept = state.departments.find(d => d.id === p.departmentId);
                  const col = dept ? state.colleges.find(c => c.id === dept.collegeId) : null;
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{col ? ` — ${col.abbreviation}` : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Department <span className="text-muted-foreground text-xs">(auto-filled from program)</span></Label>
            <Select value={form.department} onValueChange={v => setF('department', v)}>
              <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— None —</SelectItem>
                {state.departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      );
    }
    return null;
  };

  // Shared base form fields (common to all roles)
  const renderFormFields = (isEdit = false) => (
    <div className="space-y-3 mt-2">
      <div><Label>Full Name *</Label><Input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g. Juan dela Cruz" /></div>
      <div>
        <Label>Username *</Label>
        <Input value={form.username} onChange={e => setF('username', e.target.value)} placeholder="e.g. jdelacruz" />
      </div>
      {!isEdit ? (
        <div>
          <Label>Password *</Label>
          <div className="relative">
            <Input type={showAddPass ? 'text' : 'password'} value={form.password} onChange={e => setF('password', e.target.value)} />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowAddPass(v => !v)}>
              {showAddPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <Label>New Password <span className="text-muted-foreground text-xs">(leave blank to keep current)</span></Label>
          <div className="relative">
            <Input type={showNewPass ? 'text' : 'password'} value={form.newPassword} onChange={e => setF('newPassword', e.target.value)} placeholder="Enter new password to change..." />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowNewPass(v => !v)}>
              {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      )}
      {!isEdit && (
        <div>
          <Label>Role *</Label>
          <Select value={form.role} onValueChange={v => { setF('role', v); setForm(f => ({ ...f, department: '', program: '', yearLevel: '1', studentNumber: '', employeeId: '' })); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="ocs">OCS</SelectItem>
              <SelectItem value="faculty">Faculty</SelectItem>
              <SelectItem value="student">Student</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setF('email', e.target.value)} placeholder="e.g. user@university.edu" /></div>

      {/* Role-specific fields */}
      {renderRoleFields(isEdit && editUser ? editUser.role : form.role, isEdit)}

      {formError && (
        <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 rounded p-2">
          <AlertCircle size={12} /> {formError}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={() => { if (isEdit) setEditUser(null); else setAddOpen(false); setFormError(''); }} disabled={loading}>Cancel</Button>
        <Button className="flex-1 bg-primary text-primary-foreground" onClick={isEdit ? handleEdit : handleAdd} disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add User'}
        </Button>
      </div>
    </div>
  );

  const userCard = (u: User, role: Role) => {
    const isSelected = selected.includes(u.id);
    return (
      <Card key={u.id} className={`transition-colors ${isSelected ? 'border-primary bg-primary/5' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {role === 'student' && (
              <input type="checkbox" className="mt-1 cursor-pointer" checked={isSelected} onChange={() => toggleSelect(u.id)} />
            )}
            <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
              {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-foreground truncate">{u.name}</p>
                <Badge className={`text-xs ${roleColors[role]}`}>{role}</Badge>
                {u.status === 'transferred' && <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300">Transferred</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">@{u.username}</p>
              {u.email && <p className="text-xs text-muted-foreground/70 truncate">{u.email}</p>}
              <div className="flex gap-2 flex-wrap mt-1 text-xs text-muted-foreground">
                {u.studentNumber && <span>#{u.studentNumber}</span>}
                {u.yearLevel && <span>Yr {u.yearLevel}</span>}
                {u.program && <span className="truncate max-w-[120px]">{u.program}</span>}
                {u.employeeId && <span>{u.employeeId}</span>}
                {u.department && <span className="truncate max-w-[100px]">{u.department}</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1 items-end flex-shrink-0">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => openEdit(u)} title="Edit user">
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
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deactivate {u.name}?</AlertDialogTitle>
                    <AlertDialogDescription>This will prevent the user from logging in. This action can be reversed by re-adding the user.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleRemove(u.id)}>Deactivate</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <PortalLayout title="User Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Manage all system users and their credentials.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search users..." className="pl-9 w-52" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) { setForm(emptyForm); setFormError(''); } }}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground gap-2"><Plus className="w-4 h-4" /> Add User</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
                {renderFormFields(false)}
              </DialogContent>
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
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setSelected([])}>Clear</Button>
          </div>
        )}

        <Tabs defaultValue="student">
          <TabsList className="bg-muted">
            {(['admin', 'ocs', 'faculty', 'student'] as Role[]).map(r => (
              <TabsTrigger key={r} value={r} className="capitalize">{r} ({byRole(r).length})</TabsTrigger>
            ))}
          </TabsList>
          {(['admin', 'ocs', 'faculty', 'student'] as Role[]).map(role => (
            <TabsContent key={role} value={role} className="mt-4">
              {byRole(role).length === 0
                ? <p className="text-muted-foreground text-center py-8">No {role} users found.</p>
                : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{byRole(role).map(u => userCard(u, role))}</div>
              }
            </TabsContent>
          ))}
        </Tabs>

        {/* Edit user dialog */}
        {editUser && (
          <Dialog open onOpenChange={v => { if (!v) { setEditUser(null); setFormError(''); } }}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Edit: {editUser.name}</DialogTitle></DialogHeader>
              {renderFormFields(true)}
            </DialogContent>
          </Dialog>
        )}

        {/* Transfer dialog */}
        {transferUser && (
          <Dialog open onOpenChange={v => !v && setTransferUser(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Transfer: {transferUser.name}</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <Label>New Program</Label>
                  <Select value={transferProgram} onValueChange={setTransferProgram}>
                    <SelectTrigger><SelectValue placeholder="Select new program..." /></SelectTrigger>
                    <SelectContent>
                      {state.degreePrograms.map(p => (
                        <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setTransferUser(null)}>Cancel</Button>
                  <Button className="flex-1 bg-primary text-primary-foreground" onClick={() => {
                    if (transferProgram) { transferStudent(transferUser.id, transferProgram); setTransferUser(null); }
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
