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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { UserPlus, Search } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { Role } from '../../lib/types';

const roleBadge: Record<Role, string> = {
  admin: 'bg-primary text-primary-foreground',
  ocs: 'bg-secondary text-secondary-foreground',
  faculty: 'bg-maroon-700 text-primary-foreground',
  student: 'bg-green-600 text-primary-foreground',
};

export default function AdminUsers() {
  const { state, addUser } = useApp();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '', email: '', role: 'student' as Role, department: '' });

  const roles: Role[] = ['admin', 'ocs', 'faculty', 'student'];
  const filtered = (role: Role) =>
    state.users.filter(u => u.role === role && (
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
    ));

  const handleAdd = () => {
    if (!form.name || !form.username || !form.password) return;
    addUser(form);
    toast({ title: 'User added', description: `${form.name} has been created.` });
    setOpen(false);
    setForm({ name: '', username: '', password: '', email: '', role: 'student', department: '' });
  };

  const UserCard = ({ u }: { u: typeof state.users[0] }) => {
    const initials = u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{u.name}</p>
          <p className="text-xs text-muted-foreground">@{u.username} {u.studentNumber ? `• ${u.studentNumber}` : ''} {u.employeeId ? `• ${u.employeeId}` : ''}</p>
        </div>
        <Badge className={`text-xs flex-shrink-0 ${roleBadge[u.role]}`}>{u.role}</Badge>
      </div>
    );
  };

  return (
    <PortalLayout title="User Management">
      <div className="space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 gap-2">
                <UserPlus size={16} /> Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label>Full Name</Label>
                    <Input placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Username</Label>
                    <Input placeholder="Username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Password</Label>
                    <Input type="password" placeholder="Password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v as Role }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Department (optional)</Label>
                    <Input placeholder="Department" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
                  </div>
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleAdd}>Add User</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="student">
          <TabsList className="bg-muted">
            {roles.map(r => (
              <TabsTrigger key={r} value={r} className="capitalize">
                {r} ({filtered(r).length})
              </TabsTrigger>
            ))}
          </TabsList>
          {roles.map(r => (
            <TabsContent key={r} value={r}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base capitalize">{r} Accounts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {filtered(r).length > 0
                      ? filtered(r).map(u => <UserCard key={u.id} u={u} />)
                      : <p className="text-sm text-muted-foreground py-4 text-center">No {r} accounts found.</p>
                    }
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </PortalLayout>
  );
}
