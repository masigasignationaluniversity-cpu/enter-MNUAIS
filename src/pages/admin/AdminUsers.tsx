import { useState, useRef } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, ArrowLeftRight, Eye, EyeOff, AlertCircle, CloudUpload, ShieldBan, ShieldCheck, Upload, Download, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Role, User } from '@/lib/types';

const roleColors: Record<string, string> = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  ocs: 'bg-blue-100 text-blue-800 border-blue-200',
  faculty: 'bg-secondary/10 text-secondary-foreground border-secondary/20',
  student: 'bg-purple-100 text-purple-800 border-purple-200',
  department_head: 'bg-amber-100 text-amber-800 border-amber-200',
};

interface CsvRow {
  name: string; username: string; password: string; email: string;
  role: Role; studentNumber: string; employeeId: string;
  college: string; department: string; program: string;
  error?: string;
}

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
};

const parseCsv = (text: string): CsvRow[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[\s_-]/g, ''));
  const idx = (key: string) => headers.indexOf(key);
  const VALID_ROLES: Role[] = ['admin', 'ocs', 'faculty', 'student', 'department_head'];
  return lines.slice(1).map(line => {
    const vals = parseCsvLine(line);
    const get = (key: string) => vals[idx(key)]?.trim() ?? '';
    const name = get('name');
    const username = get('username');
    const password = get('password');
    const rawRole = get('role').toLowerCase().replace(/\s+/g, '_');
    const role: Role = VALID_ROLES.includes(rawRole as Role) ? rawRole as Role : 'student';
    const error = !name ? 'Missing name' : !username ? 'Missing username' : !password ? 'Missing password' : undefined;
    return {
      name, username, password, email: get('email'), role,
      studentNumber: get('studentnumber') || get('student_number') || get('studentno'),
      employeeId: get('employeeid') || get('employee_id') || get('empid'),
      college: get('college'), department: get('department'), program: get('program'),
      error,
    };
  });
};

const downloadCsvTemplate = () => {
  const lines = [
    'name,username,password,email,role,studentNumber,employeeId,college,department,program',
    'Juan dela Cruz,jdelacruz,Pass123!,juan@uni.edu,student,2024-10001,,College of Forestry,,BS Forestry',
    'Maria Santos,msantos,Pass456!,maria@uni.edu,faculty,,EMP-001,College of Science,,',
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'users_import_template.csv'; a.click();
  URL.revokeObjectURL(url);
};

const emptyForm = {
  name: '', username: '', password: '', newPassword: '', email: '',
  role: 'student' as Role, department: '', college: '', program: '',
  studentNumber: '', employeeId: '',
};

export default function AdminUsers() {
  const { state, addUser, updateUser, removeUser, syncUsersToCloud, transferStudent } = useApp();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [transferUser, setTransferUser] = useState<User | null>(null);
  const [transferProgram, setTransferProgram] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [showAddPass, setShowAddPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  // CSV import state
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setF = (k: keyof typeof emptyForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      const { synced, failed } = await syncUsersToCloud();
      const failedMsg = failed > 0 ? ` ${failed} failed.` : '';
      toast.success('Sync complete', { description: `${synced} user(s) synced to cloud.${failedMsg}` });
    } catch (err) {
      toast.error('Sync failed', { description: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setSyncLoading(false);
    }
  };

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
    if (form.role === 'ocs' && !form.college) { setFormError('College is required for OCS users.'); return; }
    if (form.role === 'ocs' && !form.department) { setFormError('Department is required for OCS users.'); return; }
    if (form.role === 'department_head' && !form.college) { setFormError('College is required for Department Heads.'); return; }
    if (form.role === 'department_head' && !form.department) { setFormError('Department is required for Department Heads.'); return; }
    setLoading(true); setFormError('');
    try {
      // Resolve department name and program name from IDs (ignore _none sentinel)
      const deptName = form.department && form.department !== '_none'
        ? (state.departments.find(d => d.id === form.department)?.name ?? form.department)
        : undefined;
      const progName = form.program && form.program !== '_none'
        ? (state.degreePrograms.find(p => p.id === form.program)?.name ?? form.program)
        : undefined;
      const collegeName = form.college && form.college !== '_none'
        ? (state.colleges.find(c => c.id === form.college)?.name ?? form.college)
        : undefined;
      await addUser({
        name: form.name, username: form.username, password: form.password,
        email: form.email, role: form.role,
        department: deptName || undefined,
        college: collegeName || undefined,
        program: progName || undefined,
        studentNumber: form.studentNumber || undefined,
        employeeId: form.employeeId || undefined,
        status: 'active',
      });
      setForm(emptyForm);
      setAddOpen(false);
      toast.success('User added', { description: `${form.name} has been added successfully.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add user.';
      setFormError(msg);
      toast.error('Failed to add user', { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editUser || !form.name || !form.username) { setFormError('Name and username are required.'); return; }
    if (editUser.role === 'ocs' && !form.college) { setFormError('College is required for OCS users.'); return; }
    if (editUser.role === 'ocs' && !form.department) { setFormError('Department is required for OCS users.'); return; }
    if (editUser.role === 'department_head' && !form.college) { setFormError('College is required for Department Heads.'); return; }
    if (editUser.role === 'department_head' && !form.department) { setFormError('Department is required for Department Heads.'); return; }
    setLoading(true); setFormError('');
    try {
      const deptName = form.department && form.department !== '_none'
        ? (state.departments.find(d => d.id === form.department)?.name ?? form.department)
        : undefined;
      const progName = form.program && form.program !== '_none'
        ? (state.degreePrograms.find(p => p.id === form.program)?.name ?? form.program)
        : undefined;
      const collegeName = form.college && form.college !== '_none'
        ? (state.colleges.find(c => c.id === form.college)?.name ?? form.college)
        : undefined;
      await updateUser(editUser.id, {
        name: form.name,
        username: form.username,
        email: form.email,
        newPassword: form.newPassword || undefined,
        department: deptName || undefined,
        college: collegeName || undefined,
        program: progName || undefined,
        studentNumber: form.studentNumber || undefined,
        employeeId: form.employeeId || undefined,
      });
      toast.success('User updated', { description: `${form.name} has been updated.` });
      setEditUser(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update user.';
      setFormError(msg);
      toast.error('Failed to update user', { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (u: User) => {
    setFormError('');
    // Try to match department name back to an ID
    const deptId = state.departments.find(d => d.name === u.department)?.id ?? u.department ?? '';
    const progId = state.degreePrograms.find(p => p.name === u.program)?.id ?? u.program ?? '';
    // Try to match college name back to an ID
    const collegeId = state.colleges.find(c => c.name === u.college)?.id ?? u.college ?? '';
    setForm({ ...emptyForm, name: u.name, username: u.username, email: u.email || '', role: u.role, department: deptId, college: collegeId, program: progId, studentNumber: u.studentNumber || '', employeeId: u.employeeId || '' });
    setEditUser(u);
  };

  const handleRemove = async (userId: string) => {
    await removeUser(userId);
  };

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length === 0) { toast.error('No data found in CSV. Check format and try again.'); return; }
      setCsvRows(rows);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCsvImport = async () => {
    const valid = csvRows.filter(r => !r.error);
    if (valid.length === 0) { toast.error('No valid rows to import.'); return; }
    setCsvImporting(true);
    let imported = 0; let failed = 0;
    for (const row of valid) {
      try {
        await addUser({
          name: row.name, username: row.username, password: row.password,
          email: row.email || undefined, role: row.role,
          studentNumber: row.studentNumber || undefined,
          employeeId: row.employeeId || undefined,
          college: row.college || undefined,
          department: row.department || undefined,
          program: row.program || undefined,
          status: 'active',
        });
        imported++;
      } catch { failed++; }
    }
    toast.success(`Imported ${imported} user(s) successfully.`, { description: failed > 0 ? `${failed} row(s) failed.` : undefined });
    setCsvImporting(false);
    setCsvOpen(false);
    setCsvRows([]);
  };

  // Role-based form fields
  const renderRoleFields = (role: Role, isEdit = false) => {
    if (role === 'admin') {
      // Admin: name, username, password, email only
      return null;
    }
    if (role === 'ocs') {
      const selectedCollege = form.college && form.college !== '_none'
        ? state.colleges.find(c => c.id === form.college) ?? null
        : null;
      const availableDepts = selectedCollege
        ? state.departments.filter(d => d.collegeId === selectedCollege.id)
        : [];
      return (
        <>
          <div>
            <Label>College <span className="text-red-500">*</span></Label>
            <Select value={form.college} onValueChange={v => { setF('college', v); setF('department', ''); }}>
              <SelectTrigger><SelectValue placeholder="Select college..." /></SelectTrigger>
              <SelectContent>
                {state.colleges.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!form.college && <p className="text-xs text-red-500 mt-1">College is required for OCS users.</p>}
          </div>
          <div>
            <Label>Department <span className="text-red-500">*</span></Label>
            <Select value={form.department} onValueChange={v => setF('department', v)} disabled={availableDepts.length === 0}>
              <SelectTrigger><SelectValue placeholder={availableDepts.length === 0 ? 'Select college first...' : 'Select department...'} /></SelectTrigger>
              <SelectContent>
                {availableDepts.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.college && !form.department && <p className="text-xs text-red-500 mt-1">Department is required for OCS users.</p>}
          </div>
        </>
      );
    }
    if (role === 'faculty') {
      const selectedCollege = form.college && form.college !== '_none'
        ? state.colleges.find(c => c.id === form.college) ?? null : null;
      const availableDepts = selectedCollege
        ? state.departments.filter(d => d.collegeId === selectedCollege.id)
        : state.departments;
      return (
        <>
          <div>
            <Label>Employee ID</Label>
            <Input value={form.employeeId} onChange={e => setF('employeeId', e.target.value)} placeholder="e.g. EMP-001" />
          </div>
          <div>
            <Label>College <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Select value={form.college || '_none'} onValueChange={v => { setF('college', v === '_none' ? '' : v); setF('department', ''); }}>
              <SelectTrigger><SelectValue placeholder="Select college..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— All Colleges —</SelectItem>
                {state.colleges.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Department <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Select value={form.department || '_none'} onValueChange={v => setF('department', v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— None —</SelectItem>
                {availableDepts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </>
      );
    }
    if (role === 'department_head') {
      const selectedCollege = form.college && form.college !== '_none'
        ? state.colleges.find(c => c.id === form.college) ?? null
        : null;
      const availableDepts = selectedCollege
        ? state.departments.filter(d => d.collegeId === selectedCollege.id)
        : [];
      return (
        <>
          <div>
            <Label>Employee ID</Label>
            <Input value={form.employeeId} onChange={e => setF('employeeId', e.target.value)} placeholder="e.g. EMP-001" />
          </div>
          <div>
            <Label>College <span className="text-red-500">*</span></Label>
            <Select value={form.college} onValueChange={v => { setF('college', v); setF('department', ''); }}>
              <SelectTrigger><SelectValue placeholder="Select college..." /></SelectTrigger>
              <SelectContent>
                {state.colleges.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Department <span className="text-red-500">*</span></Label>
            <Select value={form.department} onValueChange={v => setF('department', v)} disabled={availableDepts.length === 0}>
              <SelectTrigger><SelectValue placeholder={availableDepts.length === 0 ? 'Select college first...' : 'Select department...'} /></SelectTrigger>
              <SelectContent>
                {availableDepts.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.college && !form.department && <p className="text-xs text-red-500 mt-1">Department is required for Department Heads.</p>}
          </div>
        </>
      );
    }
    if (role === 'student') {
      const selectedCollege = form.college && form.college !== '_none'
        ? state.colleges.find(c => c.id === form.college) ?? null : null;
      const availableDepts = selectedCollege
        ? state.departments.filter(d => d.collegeId === selectedCollege.id)
        : state.departments;
      const availablePrograms = selectedCollege
        ? state.degreePrograms.filter(p => {
            const dept = state.departments.find(d => d.id === p.departmentId);
            return dept?.collegeId === selectedCollege.id;
          })
        : state.degreePrograms;
      return (
        <>
          <div>
            <Label>Student Number</Label>
            <Input value={form.studentNumber} onChange={e => setF('studentNumber', e.target.value)} placeholder="e.g. 2024-10001" />
          </div>
          <div>
            <Label>College <span className="text-muted-foreground text-xs">(optional — filters programs below)</span></Label>
            <Select value={form.college || '_none'} onValueChange={v => {
              setF('college', v === '_none' ? '' : v);
              setF('program', ''); setF('department', '');
            }}>
              <SelectTrigger><SelectValue placeholder="Select college..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— All Colleges —</SelectItem>
                {state.colleges.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Degree Program</Label>
            <Select value={form.program} onValueChange={handleProgramChange}>
              <SelectTrigger><SelectValue placeholder="Select program..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— None —</SelectItem>
                {availablePrograms.map(p => {
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
                {availableDepts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
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
      {formError && (
        <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 rounded p-2 border border-destructive/20">
          <AlertCircle size={12} className="flex-shrink-0" /> {formError}
        </div>
      )}
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
          <Select value={form.role} onValueChange={v => { setF('role', v); setForm(f => ({ ...f, department: '', college: '', program: '', yearLevel: '1', studentNumber: '', employeeId: '' })); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="ocs">OCS</SelectItem>
              <SelectItem value="faculty">Faculty</SelectItem>
              <SelectItem value="department_head">Department Head</SelectItem>
              <SelectItem value="student">Student</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setF('email', e.target.value)} placeholder="e.g. user@university.edu" /></div>

      {/* Role-specific fields */}
      {renderRoleFields(isEdit && editUser ? editUser.role : form.role, isEdit)}

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
      <div key={u.id} className={`portal-panel transition-colors ${isSelected ? 'border-primary bg-primary/5' : ''}`}>
        <div className="p-4">
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
                {u.status === 'permanently_disqualified' && <Badge className="text-xs bg-red-100 text-red-700 border-red-300">Perm. Disqualified</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">@{u.username}</p>
              {u.email && <p className="text-xs text-muted-foreground/70 truncate">{u.email}</p>}
              <div className="flex gap-2 flex-wrap mt-1 text-xs text-muted-foreground">
                {u.studentNumber && <span>#{u.studentNumber}</span>}
                {u.program && <span className="truncate max-w-[120px]">{u.program}</span>}
                {u.employeeId && <span>{u.employeeId}</span>}
                {u.college && <span className="truncate max-w-[100px] text-blue-600">{u.college}</span>}
                {u.department && <span className="truncate max-w-[100px]">{u.department}</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1 items-end flex-shrink-0">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => openEdit(u)} title="Edit user">
                <Pencil className="w-3 h-3" />
              </Button>
              {role === 'student' && (
                <>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-purple-600 hover:bg-purple-50" title="Transfer program" onClick={() => { setTransferUser(u); setTransferProgram(u.program || ''); }}>
                    <ArrowLeftRight className="w-3 h-3" />
                  </Button>
                  {/* Permanent Disqualification Toggle */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-7 w-7 p-0 ${u.status === 'permanently_disqualified' ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'}`}
                        title={u.status === 'permanently_disqualified' ? 'Reinstate student' : 'Permanently disqualify'}
                      >
                        {u.status === 'permanently_disqualified' ? <ShieldCheck className="w-3 h-3" /> : <ShieldBan className="w-3 h-3" />}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {u.status === 'permanently_disqualified' ? `Reinstate ${u.name}?` : `Permanently Disqualify ${u.name}?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {u.status === 'permanently_disqualified'
                            ? 'This will restore the student\'s enlistment privileges and change their status back to active.'
                            : 'This will permanently disqualify the student and block all enlistment actions. The OCS can reconsider this decision.'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className={u.status === 'permanently_disqualified' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}
                          onClick={() => updateUser(u.id, { status: u.status === 'permanently_disqualified' ? 'active' : 'permanently_disqualified' })}
                        >
                          {u.status === 'permanently_disqualified' ? 'Reinstate' : 'Disqualify'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
        </div>
      </div>
    );
  };

  return (
    <PortalLayout title="User Management">
      <div className="space-y-6">
        <div className="flex items-center flex-wrap gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Manage all system users and their credentials.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search users..." className="pl-9 w-52" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button
              variant="outline"
              className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={handleSync}
              disabled={syncLoading}
            >
              <CloudUpload className="w-4 h-4" />
              {syncLoading ? 'Syncing...' : 'Sync to Cloud'}
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              onClick={() => setCsvOpen(true)}
            >
              <Upload className="w-4 h-4" /> Import CSV
            </Button>
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
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setSelected([])}>Clear</Button>
          </div>
        )}

        <Tabs defaultValue="student">
          <TabsList className="bg-muted flex-wrap h-auto">
            {(['admin', 'ocs', 'department_head', 'faculty', 'student'] as Role[]).map(r => (
              <TabsTrigger key={r} value={r} className="capitalize text-xs">
                {r === 'department_head' ? 'Dept Head' : r} ({byRole(r).length})
              </TabsTrigger>
            ))}
          </TabsList>
          {(['admin', 'ocs', 'department_head', 'faculty', 'student'] as Role[]).map(role => (
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

        {/* CSV Import dialog */}
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
        <Dialog open={csvOpen} onOpenChange={v => { setCsvOpen(v); if (!v) setCsvRows([]); }}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" /> Import Users from CSV
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-5 text-center space-y-3">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <div>
                  <p className="text-sm font-medium">Upload a CSV file with user data</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Required columns: <code className="bg-muted px-1 rounded">name, username, password</code> &nbsp;·&nbsp;
                    Optional: <code className="bg-muted px-1 rounded">email, role, studentNumber, employeeId, college, department, program</code>
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4" /> Choose CSV File
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={downloadCsvTemplate}>
                    <Download className="w-4 h-4" /> Download Template
                  </Button>
                </div>
              </div>

              {csvRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      Preview — {csvRows.length} row(s)
                      <span className="ml-2 text-emerald-600 font-normal">{csvRows.filter(r => !r.error).length} valid</span>
                      {csvRows.filter(r => r.error).length > 0 && (
                        <span className="ml-2 text-destructive font-normal">{csvRows.filter(r => r.error).length} with errors</span>
                      )}
                    </p>
                    <Button size="sm" variant="ghost" className="text-xs text-muted-foreground h-7" onClick={() => setCsvRows([])}>
                      Clear
                    </Button>
                  </div>
                  <div className="rounded-xl border overflow-hidden">
                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full text-xs">
                        <thead className="bg-muted border-b sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold w-6"></th>
                            <th className="px-3 py-2 text-left font-semibold">Name</th>
                            <th className="px-3 py-2 text-left font-semibold">Username</th>
                            <th className="px-3 py-2 text-left font-semibold">Role</th>
                            <th className="px-3 py-2 text-left font-semibold">College</th>
                            <th className="px-3 py-2 text-left font-semibold">Department</th>
                            <th className="px-3 py-2 text-left font-semibold">Program / Student#</th>
                            <th className="px-3 py-2 text-left font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {csvRows.map((row, i) => (
                            <tr key={i} className={row.error ? 'bg-red-50' : 'hover:bg-muted/40'}>
                              <td className="px-3 py-2 text-center">
                                {row.error
                                  ? <XCircle className="w-3.5 h-3.5 text-destructive mx-auto" />
                                  : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />}
                              </td>
                              <td className="px-3 py-2 font-medium">{row.name || <span className="text-muted-foreground italic">—</span>}</td>
                              <td className="px-3 py-2">{row.username || <span className="text-muted-foreground italic">—</span>}</td>
                              <td className="px-3 py-2 capitalize">{row.role}</td>
                              <td className="px-3 py-2">{row.college || '—'}</td>
                              <td className="px-3 py-2">{row.department || '—'}</td>
                              <td className="px-3 py-2">{row.program || row.studentNumber || row.employeeId || '—'}</td>
                              <td className="px-3 py-2">
                                {row.error
                                  ? <span className="text-destructive">{row.error}</span>
                                  : <span className="text-emerald-600 font-medium">Ready</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1" onClick={() => { setCsvOpen(false); setCsvRows([]); }}>Cancel</Button>
                    <Button
                      className="flex-1 gap-2"
                      disabled={csvImporting || csvRows.every(r => !!r.error)}
                      onClick={handleCsvImport}
                    >
                      <Upload className="w-4 h-4" />
                      {csvImporting ? 'Importing...' : `Import ${csvRows.filter(r => !r.error).length} User(s)`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

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
