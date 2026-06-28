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
import { Plus, Search, Pencil, Trash2, ArrowLeftRight, Eye, EyeOff, AlertCircle, ShieldBan, ShieldCheck, Upload, Download, FileText, CheckCircle2, XCircle, UserX, UserCheck, Users } from 'lucide-react';
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
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[\s_-]/g, ''));
  const idx = (key: string) => headers.indexOf(key);
  const VALID_ROLES: Role[] = ['admin', 'ocs', 'faculty', 'student', 'department_head'];
  return lines.slice(1).map(line => {
    const vals = parseCsvLine(line);
    const get = (key: string) => vals[idx(key)]?.trim() ?? '';
    // Support new format (lastname, firstname, middlename, extension) or legacy (name)
    const lastName = get('lastname') || get('last_name') || get('surname');
    const firstName = get('firstname') || get('first_name');
    const middleName = get('middlename') || get('middle_name');
    const extension = get('extension') || get('ext') || get('suffix');
    const legacyName = get('name');
    const name = lastName && firstName
      ? [lastName + ',', firstName, middleName, extension].filter(Boolean).join(' ')
      : legacyName;
    const username = get('username');
    const password = get('password');
    const rawRole = get('role').toLowerCase().replace(/\s+/g, '_');
    const role: Role = VALID_ROLES.includes(rawRole as Role) ? rawRole as Role : 'student';
    const error = !name ? 'Missing name (lastname & firstname, or name)' : !username ? 'Missing username' : !password ? 'Missing password' : undefined;
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
    // Headers
    'lastname,firstname,middlename,extension,username,password,email,role,studentNumber,employeeId,college,department,program',
    // Instructions (column guide row — do not include in actual import)
    '# GUIDE: lastname* | firstname* | middlename | extension | username* | password* | email | role* | studentNumber (req for student) | employeeId | college* | department (req for faculty/dept_head) | program (req for student)',
    // Student example
    'dela Cruz,Juan,Santos,,jdelacruz,Pass123!,juan@uni.edu,student,2024-10001,,College of Forestry and Natural Resources,,"BS Forestry"',
    // Faculty example
    'Santos,Maria,Reyes,Jr.,msantos,Pass456!,maria@uni.edu,faculty,,EMP-001,College of Science,Department of Biology,',
    // OCS example
    'Reyes,Pedro,,,preyes,Pass789!,pedro@uni.edu,ocs,,,College of Engineering,,',
    // Department Head example
    'Cruz,Ana,,,acruz,Pass000!,ana@uni.edu,department_head,,EMP-002,College of Arts,Department of Literature,',
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'users_import_template.csv'; a.click();
  URL.revokeObjectURL(url);
};

const buildName = (f: { lastName: string; firstName: string; middleName: string; extension: string }) => {
  const parts = [f.lastName.trim() + ',', f.firstName.trim(), f.middleName.trim(), f.extension.trim()].filter(Boolean);
  return parts.join(' ');
};

const emptyForm = {
  lastName: '', firstName: '', middleName: '', extension: '',
  username: '', password: '', newPassword: '', email: '',
  role: 'student' as Role, department: '', college: '', program: '',
  studentNumber: '', employeeId: '',
  presentAddress: '', presentAddressTel: '',
  employer: '', employerTel: '',
  emergencyContact: '', emergencyContactTel: '',
  sex: '', civilStatus: '', countryOfCitizenship: 'Philippines', isEmployed: false,
};

export default function AdminUsers() {
  const { state, addUser, updateUser, removeUser, transferStudent } = useApp();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [transferUser, setTransferUser] = useState<User | null>(null);
  const [transferProgram, setTransferProgram] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [showAddPass, setShowAddPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  // CSV import state
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Filter dropdowns
  const [collegeFilter, setCollegeFilter] = useState<Record<Role, string>>({ admin: '', ocs: '', faculty: '', student: '', department_head: '' } as Record<Role, string>);
  const [programFilter, setProgramFilter] = useState('');
  // Deactivated accounts tab
  const [deactSearch, setDeactSearch] = useState('');
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  const setF = (k: keyof typeof emptyForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const byRole = (role: Role) => state.users.filter(u => {
    if (u.role !== role) return false;
    if (u.status === 'inactive') return false;
    const q = search.toLowerCase();
    if (q && !u.name.toLowerCase().includes(q) && !u.username.toLowerCase().includes(q)) return false;
    // College filter
    const cf = collegeFilter[role];
    if (cf) {
      const college = state.colleges.find(c => c.id === cf);
      if (college && u.college !== college.name) return false;
    }
    // Program filter (student only)
    if (role === 'student' && programFilter) {
      const prog = state.degreePrograms.find(p => p.id === programFilter);
      if (prog && u.program !== prog.name) return false;
    }
    return true;
  });

  // When program changes, auto-fill college from degree program's collegeId
  const handleProgramChange = (progId: string) => {
    setF('program', progId);
    const prog = state.degreePrograms.find(p => p.id === progId);
    if (prog?.collegeId && !form.college) {
      setF('college', prog.collegeId);
    }
  };

  const handleAdd = async () => {
    const builtName = buildName(form);
    if (!form.lastName || !form.firstName || !form.username || !form.password) { setFormError('Last name, first name, username and password are required.'); return; }
    if (form.role === 'ocs' && !form.college) { setFormError('College is required for OCS users.'); return; }
    if (form.role === 'faculty' && !form.college) { setFormError('College is required for Faculty.'); return; }
    if (form.role === 'faculty' && !form.department) { setFormError('Department is required for Faculty.'); return; }
    if (form.role === 'department_head' && !form.college) { setFormError('College is required for Department Heads.'); return; }
    if (form.role === 'department_head' && !form.department) { setFormError('Department is required for Department Heads.'); return; }
    if (form.role === 'student' && !form.studentNumber) { setFormError('Student number is required.'); return; }
    if (form.role === 'student' && !form.college) { setFormError('College is required for students.'); return; }
    if (form.role === 'student' && (!form.program || form.program === '_none')) { setFormError('Degree program is required for students.'); return; }
    if (form.role === 'student' && !form.presentAddress) { setFormError('Present address is required.'); return; }
    if (form.role === 'student' && !form.presentAddressTel) { setFormError('Present address tel. no. is required.'); return; }
    if (form.role === 'student' && !form.emergencyContact) { setFormError('Emergency contact person is required.'); return; }
    if (form.role === 'student' && !form.emergencyContactTel) { setFormError('Emergency contact tel. no. is required.'); return; }
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
        name: builtName, username: form.username, password: form.password,
        email: form.email, role: form.role,
        department: deptName || undefined,
        college: collegeName || undefined,
        program: progName || undefined,
        studentNumber: form.studentNumber || undefined,
        employeeId: form.employeeId || undefined,
        status: 'active',
        presentAddress: form.presentAddress || undefined,
        presentAddressTel: form.presentAddressTel || undefined,
        employer: form.isEmployed ? (form.employer || undefined) : undefined,
        employerTel: form.isEmployed ? (form.employerTel || undefined) : undefined,
        emergencyContact: form.emergencyContact || undefined,
        emergencyContactTel: form.emergencyContactTel || undefined,
        sex: form.sex || undefined,
        civilStatus: form.civilStatus || undefined,
        countryOfCitizenship: form.countryOfCitizenship || 'Philippines',
        isEmployed: form.isEmployed,
      });
      setForm(emptyForm);
      setAddOpen(false);
      toast.success('User added', { description: `${builtName} has been added successfully.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add user.';
      setFormError(msg);
      toast.error('Failed to add user', { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    const builtName = buildName(form);
    if (!editUser || !form.lastName || !form.firstName || !form.username) { setFormError('Last name, first name and username are required.'); return; }
    if (editUser.role === 'ocs' && !form.college) { setFormError('College is required for OCS users.'); return; }
    if (editUser.role === 'faculty' && !form.college) { setFormError('College is required for Faculty.'); return; }
    if (editUser.role === 'faculty' && !form.department) { setFormError('Department is required for Faculty.'); return; }
    if (editUser.role === 'department_head' && !form.college) { setFormError('College is required for Department Heads.'); return; }
    if (editUser.role === 'department_head' && !form.department) { setFormError('Department is required for Department Heads.'); return; }
    if (editUser.role === 'student' && !form.studentNumber) { setFormError('Student number is required.'); return; }
    if (editUser.role === 'student' && !form.college) { setFormError('College is required for students.'); return; }
    if (editUser.role === 'student' && (!form.program || form.program === '_none')) { setFormError('Degree program is required for students.'); return; }
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
        name: builtName,
        username: form.username,
        email: form.email,
        newPassword: form.newPassword || undefined,
        department: deptName || undefined,
        college: collegeName || undefined,
        program: progName || undefined,
        studentNumber: form.studentNumber || undefined,
        employeeId: form.employeeId || undefined,
        presentAddress: form.presentAddress || undefined,
        presentAddressTel: form.presentAddressTel || undefined,
        employer: form.isEmployed ? (form.employer || undefined) : undefined,
        employerTel: form.isEmployed ? (form.employerTel || undefined) : undefined,
        emergencyContact: form.emergencyContact || undefined,
        emergencyContactTel: form.emergencyContactTel || undefined,
        sex: form.sex || undefined,
        civilStatus: form.civilStatus || undefined,
        countryOfCitizenship: form.countryOfCitizenship || 'Philippines',
        isEmployed: form.isEmployed,
      });
      toast.success('User updated', { description: `${builtName} has been updated.` });
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
    // Parse stored name back into parts: "LASTNAME, FIRSTNAME MIDDLE EXT"
    const commaIdx = u.name.indexOf(',');
    let lastName = u.name, firstName = '', middleName = '', extension = '';
    if (commaIdx !== -1) {
      lastName = u.name.slice(0, commaIdx).trim();
      const rest = u.name.slice(commaIdx + 1).trim().split(' ').filter(Boolean);
      firstName = rest[0] ?? '';
      // Last token could be an extension (Jr., Sr., II, III, IV, V)
      const extPattern = /^(jr\.?|sr\.?|ii|iii|iv|v|vi)$/i;
      if (rest.length > 2 && extPattern.test(rest[rest.length - 1])) {
        extension = rest[rest.length - 1];
        middleName = rest.slice(1, -1).join(' ');
      } else {
        middleName = rest.slice(1).join(' ');
      }
    }
    setForm({ ...emptyForm, lastName, firstName, middleName, extension, username: u.username, email: u.email || '', role: u.role, department: deptId, college: collegeId, program: progId, studentNumber: u.studentNumber || '', employeeId: u.employeeId || '', presentAddress: u.presentAddress || '', presentAddressTel: u.presentAddressTel || '', employer: u.employer || '', employerTel: u.employerTel || '', emergencyContact: u.emergencyContact || '', emergencyContactTel: u.emergencyContactTel || '', sex: u.sex || '', civilStatus: u.civilStatus || '', countryOfCitizenship: u.countryOfCitizenship || 'Philippines', isEmployed: u.isEmployed ?? false });
    setEditUser(u);
  };

  const handleRemove = async (userId: string) => {
    await removeUser(userId);
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    let deleted = 0; let failed = 0;
    for (const id of selected) {
      try { await removeUser(id); deleted++; } catch { failed++; }
    }
    setBulkDeleting(false);
    setBulkDeleteOpen(false);
    setSelected([]);
    if (failed > 0) toast.error(`${failed} deletion(s) failed.`, { description: `${deleted} deleted successfully.` });
    else toast.success(`${deleted} user(s) deleted`, { description: 'All related data has been removed.' });
  };

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleDeactivate = async (userId: string) => {
    try {
      await updateUser(userId, { status: 'inactive' });
      toast.success('Account deactivated.', { description: 'Records are preserved and can be reactivated at any time.' });
    } catch { toast.error('Failed to deactivate account.'); }
    finally { setDeactivatingId(null); }
  };

  const handleReactivate = async (userId: string) => {
    try {
      await updateUser(userId, { status: 'active' });
      toast.success('Account reactivated.', { description: 'The user can now log in again.' });
    } catch { toast.error('Failed to reactivate account.'); }
    finally { setReactivatingId(null); }
  };

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
      return (
        <>
          <div>
            <Label>College <span className="text-red-500">*</span></Label>
            <Select value={form.college} onValueChange={v => setF('college', v)}>
              <SelectTrigger><SelectValue placeholder="Select college..." /></SelectTrigger>
              <SelectContent>
                {state.colleges.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!form.college && <p className="text-xs text-red-500 mt-1">College is required for OCS users.</p>}
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
            <Label>College <span className="text-red-500">*</span></Label>
            <Select value={form.college || '_none'} onValueChange={v => { setF('college', v === '_none' ? '' : v); setF('department', ''); }}>
              <SelectTrigger><SelectValue placeholder="Select college..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— Select College —</SelectItem>
                {state.colleges.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {!form.college && <p className="text-xs text-red-500 mt-1">College is required for faculty.</p>}
          </div>
          <div>
            <Label>Department <span className="text-red-500">*</span></Label>
            <Select value={form.department || '_none'} onValueChange={v => setF('department', v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— Select Department —</SelectItem>
                {availableDepts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {form.college && !form.department && <p className="text-xs text-red-500 mt-1">Department is required for faculty.</p>}
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
      const availablePrograms = selectedCollege
        ? state.degreePrograms.filter(p => p.collegeId === selectedCollege.id)
        : state.degreePrograms;
      return (
        <>
          <div>
            <Label>Student Number <span className="text-red-500">*</span></Label>
            <Input value={form.studentNumber} onChange={e => setF('studentNumber', e.target.value)} placeholder="e.g. 2024-10001" />
            {!form.studentNumber && <p className="text-xs text-red-500 mt-1">Student number is required.</p>}
          </div>
          <div>
            <Label>College <span className="text-red-500">*</span></Label>
            <Select value={form.college || '_none'} onValueChange={v => {
              setF('college', v === '_none' ? '' : v);
              setF('program', ''); setF('department', '');
            }}>
              <SelectTrigger><SelectValue placeholder="Select college..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— Select College —</SelectItem>
                {state.colleges.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {!form.college && <p className="text-xs text-red-500 mt-1">College is required.</p>}
          </div>
          <div>
            <Label>Degree Program <span className="text-red-500">*</span></Label>
            <Select value={form.program} onValueChange={handleProgramChange}>
              <SelectTrigger><SelectValue placeholder="Select program..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— Select Program —</SelectItem>
                {availablePrograms.map(p => {
                  const college = state.colleges.find(c => c.id === p.collegeId);
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{college ? ` — ${college.abbreviation}` : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {!form.program && <p className="text-xs text-red-500 mt-1">Degree program is required.</p>}
          </div>
          {/* ── Student Personal Info ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t">
            <div className="col-span-full text-xs font-semibold text-muted-foreground uppercase tracking-wide">Personal Information</div>
            <div>
              <Label>Sex</Label>
              <Select value={form.sex} onValueChange={v => setF('sex', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Civil Status</Label>
              <Select value={form.civilStatus} onValueChange={v => setF('civilStatus', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married">Married</SelectItem>
                  <SelectItem value="Widowed">Widowed</SelectItem>
                  <SelectItem value="Separated">Separated</SelectItem>
                  <SelectItem value="Divorced">Divorced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-full">
              <Label>Country of Citizenship</Label>
              <Select value={form.countryOfCitizenship} onValueChange={v => setF('countryOfCitizenship', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Philippines">Philippines</SelectItem>
                  <SelectItem value="United States">United States</SelectItem>
                  <SelectItem value="Japan">Japan</SelectItem>
                  <SelectItem value="China">China</SelectItem>
                  <SelectItem value="South Korea">South Korea</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                  <SelectItem value="Germany">Germany</SelectItem>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-full flex items-center gap-2">
              <input type="checkbox" id="isEmployed" checked={!!form.isEmployed} onChange={e => setF('isEmployed', e.target.checked)} className="w-4 h-4 accent-primary" />
              <Label htmlFor="isEmployed" className="cursor-pointer">Currently Employed</Label>
            </div>
          </div>
          {/* ── Student Contact & Emergency Info ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t">
            <div className="col-span-full text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Information</div>
            <div className="col-span-full">
              <Label>Present Address <span className="text-red-500">*</span></Label>
              <Input value={form.presentAddress} onChange={e => setF('presentAddress', e.target.value)} placeholder="e.g. 123 Main St, Quezon City" />
            </div>
            <div>
              <Label>Present Address Tel. No. <span className="text-red-500">*</span></Label>
              <Input value={form.presentAddressTel} onChange={e => setF('presentAddressTel', e.target.value)} placeholder="e.g. 09xxxxxxxxx" />
            </div>
            <div className="col-span-full text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t pt-2 mt-1">Employer</div>
            <div className="col-span-full">
              <Label>Employer / Name &amp; Address <span className="text-muted-foreground text-xs font-normal">(if any)</span></Label>
              <Input value={form.employer} onChange={e => setF('employer', e.target.value)} placeholder="e.g. Company Name, 456 Work Ave, Makati" disabled={!form.isEmployed} />
            </div>
            <div>
              <Label>Employer Tel. No. <span className="text-muted-foreground text-xs font-normal">(if any)</span></Label>
              <Input value={form.employerTel} onChange={e => setF('employerTel', e.target.value)} placeholder="e.g. 02-xxxxxxxx" disabled={!form.isEmployed} />
            </div>
            <div className="col-span-full text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t pt-2 mt-1">Emergency Contact</div>
            <div className="col-span-full">
              <Label>Emergency Contact Person <span className="text-red-500">*</span></Label>
              <Input value={form.emergencyContact} onChange={e => setF('emergencyContact', e.target.value)} placeholder="e.g. Maria dela Cruz" />
            </div>
            <div>
              <Label>Emergency Contact Tel. No. <span className="text-red-500">*</span></Label>
              <Input value={form.emergencyContactTel} onChange={e => setF('emergencyContactTel', e.target.value)} placeholder="e.g. 09xxxxxxxxx" />
            </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Last Name *</Label>
          <Input value={form.lastName} onChange={e => setF('lastName', e.target.value)} placeholder="e.g. dela Cruz" />
        </div>
        <div>
          <Label>First Name *</Label>
          <Input value={form.firstName} onChange={e => setF('firstName', e.target.value)} placeholder="e.g. Juan" />
        </div>
        <div>
          <Label>Middle Name <span className="text-muted-foreground text-xs font-normal">(if any)</span></Label>
          <Input value={form.middleName} onChange={e => setF('middleName', e.target.value)} placeholder="e.g. Santos" />
        </div>
        <div>
          <Label>Extension <span className="text-muted-foreground text-xs font-normal">(if any)</span></Label>
          <Input value={form.extension} onChange={e => setF('extension', e.target.value)} placeholder="e.g. Jr., Sr., III" />
        </div>
      </div>
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

  const userRow = (u: User, role: Role) => {
    const isSelected = selected.includes(u.id);
    return (
      <tr key={u.id} className={`border-b border-border/50 transition-colors hover:bg-muted/20 ${isSelected ? 'bg-primary/5' : ''}`}>
        <td className="px-3 py-2.5 w-8">
          <input type="checkbox" className="cursor-pointer" checked={isSelected} onChange={() => toggleSelect(u.id)} />
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs flex-shrink-0">
              {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate max-w-[180px]">{u.name}</p>
              <p className="text-xs text-muted-foreground">@{u.username}</p>
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5 text-xs text-muted-foreground/80 hidden sm:table-cell">{u.email || '—'}</td>
        <td className="px-3 py-2.5">
          <div className="flex flex-wrap gap-1">
            <Badge className={`text-xs ${roleColors[role]}`}>{role}</Badge>
            {u.status === 'transferred' && <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300">Transferred</Badge>}
            {u.status === 'permanently_disqualified' && <Badge className="text-xs bg-red-100 text-red-700 border-red-300">Perm. DQ</Badge>}
          </div>
        </td>
        <td className="px-3 py-2.5 text-xs text-muted-foreground hidden md:table-cell">
          {u.college ? <span className="text-blue-600 font-medium">{u.college}</span> : '—'}
        </td>
        <td className="px-3 py-2.5 text-xs text-muted-foreground hidden lg:table-cell max-w-[140px] truncate">
          {u.program || u.department || '—'}
        </td>
        <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono hidden md:table-cell">
          {u.studentNumber ? `#${u.studentNumber}` : u.employeeId || '—'}
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-0.5 justify-end">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => openEdit(u)} title="Edit">
              <Pencil className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-orange-500 hover:bg-orange-50" title="Deactivate" onClick={() => setDeactivatingId(u.id)}>
              <UserX className="w-3 h-3" />
            </Button>
            {role === 'student' && (
              <>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-purple-600 hover:bg-purple-50" title="Transfer" onClick={() => { setTransferUser(u); setTransferProgram(u.program || ''); }}>
                  <ArrowLeftRight className="w-3 h-3" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className={`h-7 w-7 p-0 ${u.status === 'permanently_disqualified' ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'}`}
                      title={u.status === 'permanently_disqualified' ? 'Reinstate' : 'Disqualify'}>
                      {u.status === 'permanently_disqualified' ? <ShieldCheck className="w-3 h-3" /> : <ShieldBan className="w-3 h-3" />}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{u.status === 'permanently_disqualified' ? `Reinstate ${u.name}?` : `Permanently Disqualify ${u.name}?`}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {u.status === 'permanently_disqualified'
                          ? 'This will restore the student\'s enlistment privileges.'
                          : 'This will permanently disqualify the student and block all enlistment actions.'}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className={u.status === 'permanently_disqualified' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}
                        onClick={() => updateUser(u.id, { status: u.status === 'permanently_disqualified' ? 'active' : 'permanently_disqualified' })}>
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
                  <AlertDialogDescription>This will prevent the user from logging in.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => handleRemove(u.id)}>Deactivate</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </td>
      </tr>
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
              className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              onClick={() => setCsvOpen(true)}
            >
              <Upload className="w-4 h-4" /> Import CSV
            </Button>
            <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) { setForm(emptyForm); setFormError(''); } }}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground gap-2"><Plus className="w-4 h-4" /> Add User</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
                {renderFormFields(false)}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <span className="text-sm font-medium text-destructive">{selected.length} user(s) selected</span>
            <Button size="sm" variant="ghost" className="text-muted-foreground h-7 text-xs" onClick={() => setSelected([])}>Clear</Button>
            <Button size="sm" variant="destructive" className="h-7 text-xs gap-1.5 ml-auto" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </Button>
          </div>
        )}

        {/* Bulk delete confirmation dialog */}
        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selected.length} user(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all selected users and remove <strong>all associated data</strong> — enrollments, grades, consents, evaluations, applications, and more — from the database. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleBulkDelete} disabled={bulkDeleting}>
                {bulkDeleting ? 'Deleting...' : `Delete ${selected.length} User(s)`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Tabs defaultValue="student">
          <TabsList className="bg-muted flex-wrap h-auto">
            {(['admin', 'ocs', 'department_head', 'faculty', 'student'] as Role[]).map(r => (
              <TabsTrigger key={r} value={r} className="capitalize text-xs"
                onClick={() => { setCollegeFilter(cf => ({ ...cf, [r]: '' })); setProgramFilter(''); }}>
                {r === 'department_head' ? 'Dept Head' : r} ({byRole(r).length})
              </TabsTrigger>
            ))}
            <TabsTrigger value="deactivated" className="text-xs gap-1.5">
              <UserX className="w-3 h-3" /> Deactivated
              {(() => {
                const cnt = state.users.filter(u => u.status === 'inactive').length;
                return cnt > 0 ? <span className="bg-destructive text-destructive-foreground rounded-full text-[9px] px-1.5 py-px leading-none">{cnt}</span> : null;
              })()}
            </TabsTrigger>
          </TabsList>
          {(['admin', 'ocs', 'department_head', 'faculty', 'student'] as Role[]).map(role => {
            const hasCollegeFilter = role !== 'admin';
            const filteredPrograms = collegeFilter[role]
              ? state.degreePrograms.filter(p => p.collegeId === collegeFilter[role])
              : state.degreePrograms;
            const collegesWithUsers = state.colleges.filter(c =>
              state.users.some(u => u.role === role && u.status !== 'inactive' && u.college === c.name)
            );
            const roleLabel = role === 'department_head' ? 'Department Heads' : role === 'ocs' ? 'OCS Staff' : role === 'admin' ? 'Administrators' : role === 'faculty' ? 'Faculty' : 'Students';
            const users = byRole(role);
            return (
              <TabsContent key={role} value={role} className="mt-3">
                <div className="portal-panel overflow-hidden">
                  {/* Header */}
                  <div className="portal-panel-header">
                    <Users className="w-4 h-4 text-white/80" />
                    <span>{roleLabel}</span>
                    <Badge className="ml-2 bg-white/20 text-white text-xs h-5 px-1.5">{users.length}</Badge>
                  </div>

                  {/* Filter bar */}
                  {hasCollegeFilter && collegesWithUsers.length > 0 && (
                    <div className="px-4 py-3 border-b border-border/50 flex flex-wrap gap-2 items-center">
                      <Select value={collegeFilter[role] || '_all'} onValueChange={v => {
                        setCollegeFilter(cf => ({ ...cf, [role]: v === '_all' ? '' : v }));
                        setProgramFilter('');
                      }}>
                        <SelectTrigger className="h-8 text-xs w-52 bg-background">
                          <SelectValue placeholder="All Colleges" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_all">All Colleges</SelectItem>
                          {collegesWithUsers.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {role === 'student' && (
                        <Select value={programFilter || '_all'} onValueChange={v => setProgramFilter(v === '_all' ? '' : v)}>
                          <SelectTrigger className="h-8 text-xs w-52 bg-background">
                            <SelectValue placeholder="All Programs" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_all">All Programs</SelectItem>
                            {filteredPrograms.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {(collegeFilter[role] || programFilter) && (
                        <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => { setCollegeFilter(cf => ({ ...cf, [role]: '' })); setProgramFilter(''); }}>
                          Clear filters
                        </Button>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">{users.length} user{users.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}

                  {/* Table or empty state */}
                  {users.length === 0 ? (
                    <div className="py-16 text-center flex flex-col items-center gap-3 text-muted-foreground">
                      <Users className="w-10 h-10 opacity-20" />
                      <p className="font-semibold text-sm">No {roleLabel.toLowerCase()} found{(collegeFilter[role] || programFilter) ? ' for the selected filter' : ''}.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/40">
                            <th className="px-3 py-2.5 w-8">
                              {(() => {
                                const allSelected = users.length > 0 && users.every(u => selected.includes(u.id));
                                const someSelected = users.some(u => selected.includes(u.id));
                                return (
                                  <input type="checkbox" className="cursor-pointer"
                                    checked={allSelected}
                                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                                    onChange={() => {
                                      if (allSelected) setSelected(s => s.filter(id => !users.map(u => u.id).includes(id)));
                                      else setSelected(s => [...new Set([...s, ...users.map(u => u.id)])]);
                                    }} />
                                );
                              })()}
                            </th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Email</th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">College</th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Program / Dept</th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">ID</th>
                            <th className="px-3 py-2.5 w-24" />
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(u => userRow(u, role))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}

          {/* ── Deactivated Accounts ──────────────────────────────── */}
          <TabsContent value="deactivated" className="mt-3 space-y-3">
            {(() => {
              const q = deactSearch.trim().toLowerCase();
              const all = state.users.filter(u => u.status === 'inactive');
              const filtered = q ? all.filter(u =>
                u.name.toLowerCase().includes(q) ||
                u.username.toLowerCase().includes(q) ||
                u.role.toLowerCase().includes(q) ||
                (u.college ?? '').toLowerCase().includes(q) ||
                (u.department ?? '').toLowerCase().includes(q) ||
                (u.program ?? '').toLowerCase().includes(q) ||
                (u.studentNumber ?? '').toLowerCase().includes(q) ||
                (u.employeeId ?? '').toLowerCase().includes(q)
              ) : all;
              return (
                <div className="portal-panel overflow-hidden">
                  <div className="portal-panel-header">
                    <UserX className="w-4 h-4 text-white/80" />
                    Deactivated Accounts
                    <Badge className="ml-2 bg-red-500/80 text-white text-xs h-5 px-1.5">{all.length}</Badge>
                  </div>
                  <div className="px-4 py-3 border-b border-border/50">
                    <div className="relative max-w-sm">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input className="pl-8 h-9 text-sm" placeholder="Search by name, role, college, ID…"
                        value={deactSearch} onChange={e => setDeactSearch(e.target.value)} />
                    </div>
                  </div>
                  {filtered.length === 0 ? (
                    <div className="py-16 text-center flex flex-col items-center gap-3 text-muted-foreground">
                      <UserCheck className="w-10 h-10 opacity-20" />
                      <p className="font-semibold text-sm">{q ? `No results for "${q}"` : 'No deactivated accounts'}</p>
                      <p className="text-xs opacity-70">All accounts are currently active.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/40">
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">College</th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Program / Dept</th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">ID</th>
                            <th className="px-3 py-2.5 w-24" />
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map(u => (
                            <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 bg-red-50/20 transition-colors">
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs flex-shrink-0">
                                    {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-sm text-foreground truncate max-w-[180px]">{u.name}</p>
                                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <Badge className={`text-xs ${roleColors[u.role] ?? 'bg-muted text-muted-foreground'}`}>{u.role}</Badge>
                              </td>
                              <td className="px-3 py-2.5 text-xs text-muted-foreground hidden md:table-cell">
                                {u.college ? <span className="text-blue-600 font-medium">{u.college}</span> : '—'}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-muted-foreground hidden lg:table-cell max-w-[140px] truncate">
                                {u.program || u.department || '—'}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono hidden md:table-cell">
                                {u.studentNumber ? `#${u.studentNumber}` : u.employeeId || '—'}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <div className="flex items-center gap-1 justify-end">
                                  <Button size="sm" variant="outline"
                                    className="h-7 text-xs gap-1 px-2.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                    onClick={() => setReactivatingId(u.id)}>
                                    <UserCheck className="w-3 h-3" /> Reactivate
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10">
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Permanently delete {u.name}?</AlertDialogTitle>
                                        <AlertDialogDescription>This will remove the account and <strong>all associated data</strong> permanently. This cannot be undone.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => handleRemove(u.id)}>Delete Permanently</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>

        {/* Deactivate confirmation */}
        <AlertDialog open={!!deactivatingId} onOpenChange={open => { if (!open) setDeactivatingId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><UserX className="w-4 h-4 text-orange-500" /> Deactivate Account</AlertDialogTitle>
              <AlertDialogDescription>
                {(() => { const u = state.users.find(x => x.id === deactivatingId); return u ? <>Deactivate <strong>{u.name}</strong>? They will no longer be able to log in. All records are preserved and the account can be reactivated.</> : 'Deactivate this account?'; })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-orange-500 text-white hover:bg-orange-600" onClick={() => deactivatingId && handleDeactivate(deactivatingId)}>Deactivate</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reactivate confirmation */}
        <AlertDialog open={!!reactivatingId} onOpenChange={open => { if (!open) setReactivatingId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-emerald-600" /> Reactivate Account</AlertDialogTitle>
              <AlertDialogDescription>
                {(() => { const u = state.users.find(x => x.id === reactivatingId); return u ? <>Reactivate <strong>{u.name}</strong>? They will be able to log in again.</> : 'Reactivate this account?'; })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => reactivatingId && handleReactivate(reactivatingId)}>Reactivate</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit user dialog */}
        {editUser && (
          <Dialog open onOpenChange={v => { if (!v) { setEditUser(null); setFormError(''); } }}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                    Required columns: <code className="bg-muted px-1 rounded">lastname, firstname, username, password</code>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Optional: <code className="bg-muted px-1 rounded">middlename, extension, email, role, studentNumber, employeeId, college, department, program</code>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Name format stored as: <span className="font-semibold text-foreground">LASTNAME, FIRSTNAME MIDDLENAME EXT</span> (e.g. <span className="font-mono text-primary">dela Cruz, Juan Santos Jr.</span>)
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Legacy <code className="bg-muted px-1 rounded">name</code> column is still supported for backward compatibility.
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
                  <div className="inner-table">
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
                <p className="text-xs text-muted-foreground">
                  Grades and completed courses will be preserved. The Plan of Study will reflect the new program's requirements.
                </p>
                <div>
                  <Label>New Program</Label>
                  <Select value={transferProgram} onValueChange={setTransferProgram}>
                    <SelectTrigger><SelectValue placeholder="Select new program..." /></SelectTrigger>
                    <SelectContent>
                      {state.degreePrograms.map(p => {
                        const college = state.colleges.find(c => c.id === p.collegeId);
                        return (
                          <SelectItem key={p.id} value={p.name}>
                            {p.name}{college ? ` — ${college.abbreviation}` : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setTransferUser(null)}>Cancel</Button>
                  <Button className="flex-1 bg-primary text-primary-foreground" onClick={() => {
                    if (transferProgram) {
                      const selectedProg = state.degreePrograms.find(p => p.name === transferProgram);
                      const newCollegeName = selectedProg?.collegeId
                        ? state.colleges.find(c => c.id === selectedProg.collegeId)?.name
                        : undefined;
                      transferStudent(transferUser.id, transferProgram, newCollegeName);
                      setTransferUser(null);
                      toast.success('Student transferred', { description: `${transferUser.name} has been transferred to ${transferProgram}.` });
                    }
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
