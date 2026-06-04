import { useState, useRef } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, DoorOpen, Search, Building2, Upload, Download, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Room } from '@/lib/types';

// ── CSV helpers ──────────────────────────────────────────────────────────────
interface RoomCsvRow {
  name: string; building: string; capacity: string; college: string;
  error?: string;
}

const parseLine = (line: string): string[] => {
  const result: string[] = [];
  let cur = ''; let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
};

const parseRoomCsv = (text: string): RoomCsvRow[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return [];
  const hdrs = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[\s_-]/g, ''));
  const idx = (k: string) => hdrs.indexOf(k);
  return lines.slice(1).map(line => {
    const vals = parseLine(line);
    const get = (k: string) => vals[idx(k)]?.trim() ?? '';
    const name = get('name') || get('roomname') || get('room');
    const error = !name ? 'Missing room name' : undefined;
    return { name, building: get('building'), capacity: get('capacity'), college: get('college'), error };
  });
};

const downloadTemplate = () => {
  const lines = [
    'name,building,capacity,college',
    'Room 101,Main Building,40,College of Science',
    'Lab A,Science Hall,30,College of Engineering',
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'rooms_template.csv'; a.click();
  URL.revokeObjectURL(url);
};

// ── Main component ───────────────────────────────────────────────────────────
const emptyForm = { name: '', building: '', capacity: '', collegeId: '' };

export default function AdminRooms() {
  const { state, addRoom, updateRoom, deleteRoom } = useApp();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  // CSV import
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<RoomCsvRow[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const setF = (k: keyof typeof emptyForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setEditRoom(null); setForm(emptyForm); setFormError(''); setDialogOpen(true); };
  const openEdit = (room: Room) => {
    setEditRoom(room);
    setForm({ name: room.name, building: room.building ?? '', capacity: room.capacity != null ? String(room.capacity) : '', collegeId: room.collegeId });
    setFormError(''); setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { setFormError('Room name is required.'); return; }
    if (!form.collegeId) { setFormError('College is required.'); return; }
    setFormError('');
    const data: Omit<Room, 'id'> = {
      name: form.name.trim(), building: form.building.trim() || undefined,
      capacity: form.capacity ? parseInt(form.capacity) || undefined : undefined,
      collegeId: form.collegeId,
    };
    if (editRoom) { updateRoom(editRoom.id, data); toast.success('Room updated'); }
    else { addRoom(data); toast.success('Room added'); }
    setDialogOpen(false); setForm(emptyForm); setEditRoom(null);
  };

  const handleDelete = (roomId: string) => { deleteRoom(roomId); toast.success('Room deleted'); };

  // CSV import handlers
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseRoomCsv(ev.target?.result as string);
      if (!rows.length) { toast.error('No data found in CSV.'); return; }
      setCsvRows(rows);
    };
    reader.readAsText(file); e.target.value = '';
  };

  const handleCsvImport = async () => {
    const valid = csvRows.filter(r => !r.error);
    if (!valid.length) { toast.error('No valid rows to import.'); return; }
    setCsvImporting(true);
    let imported = 0; let failed = 0;
    for (const row of valid) {
      try {
        const college = state.colleges.find(c => c.name.toLowerCase() === row.college.toLowerCase());
        if (!college) { failed++; continue; }
        addRoom({
          name: row.name,
          building: row.building || undefined,
          capacity: row.capacity ? parseInt(row.capacity) || undefined : undefined,
          collegeId: college.id,
        });
        imported++;
      } catch { failed++; }
    }
    toast.success(`Imported ${imported} room(s).`, { description: failed > 0 ? `${failed} row(s) failed (check college names).` : undefined });
    setCsvImporting(false); setCsvOpen(false); setCsvRows([]);
  };

  const rooms = state.rooms ?? [];
  const filteredRooms = search.trim()
    ? rooms.filter(r => {
        const college = state.colleges.find(c => c.id === r.collegeId);
        const q = search.toLowerCase();
        return r.name.toLowerCase().includes(q) || (r.building ?? '').toLowerCase().includes(q) || (college?.name ?? '').toLowerCase().includes(q);
      })
    : rooms;

  const collegeGroups = state.colleges.map(college => ({
    college, rooms: filteredRooms.filter(r => r.collegeId === college.id),
  })).filter(g => g.rooms.length > 0);

  const unassigned = filteredRooms.filter(r => !state.colleges.find(c => c.id === r.collegeId));

  return (
    <PortalLayout role="admin" userName={state.currentUser?.name ?? ''}>
      <div className="space-y-5">

        {/* Top bar */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="relative flex-1 min-w-0 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by room name, building, or college..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => setCsvOpen(true)}>
              <Upload className="w-4 h-4" /> Import CSV
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" onClick={openAdd}>
              <Plus className="w-4 h-4" /> Add Room
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 max-w-xs">
          <div className="portal-panel">
            <div className="portal-panel-header"><span className="text-xs font-bold">Total Rooms</span><DoorOpen className="w-4 h-4" /></div>
            <div className="px-3 py-3 bg-background"><p className="text-2xl font-bold text-foreground">{rooms.length}</p></div>
          </div>
          <div className="portal-panel">
            <div className="portal-panel-header"><span className="text-xs font-bold">Colleges</span><Building2 className="w-4 h-4" /></div>
            <div className="px-3 py-3 bg-background"><p className="text-2xl font-bold text-foreground">{state.colleges.filter(c => rooms.some(r => r.collegeId === c.id)).length}</p></div>
          </div>
        </div>

        {/* Empty state */}
        {rooms.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-border py-16 text-center">
            <DoorOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-medium text-muted-foreground">No rooms added yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Add rooms to make them available for section scheduling</p>
            <div className="flex gap-2 justify-center mt-4">
              <Button variant="outline" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => setCsvOpen(true)}>
                <Upload className="w-4 h-4" /> Import CSV
              </Button>
              <Button className="gap-2" onClick={openAdd}><Plus className="w-4 h-4" /> Add First Room</Button>
            </div>
          </div>
        )}

        {/* Grouped by college */}
        {collegeGroups.map(({ college, rooms: cr }) => (
          <div key={college.id} className="portal-panel">
            <div className="portal-panel-header">
              <Building2 className="w-4 h-4" />
              {college.name}
              <Badge className="ml-1 bg-primary-foreground/15 text-primary-foreground border-0 text-xs">{cr.length} room{cr.length !== 1 ? 's' : ''}</Badge>
            </div>
            <div className="p-4 bg-background">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cr.map(room => (
                  <div key={room.id} className="flex items-start justify-between p-3 rounded-lg border border-border bg-muted/20">
                    <div>
                      <p className="font-semibold text-sm">{room.name}</p>
                      {room.building && <p className="text-xs text-muted-foreground">{room.building}</p>}
                      {room.capacity != null && <p className="text-xs text-muted-foreground/70 mt-0.5">Capacity: {room.capacity}</p>}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(room)}><Pencil className="w-3 h-3" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"><Trash2 className="w-3 h-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{room.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently remove the room. Existing sections using this room will not be affected.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => handleDelete(room.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {unassigned.length > 0 && (
          <div className="rounded-xl border border-amber-300 overflow-hidden">
            <div className="bg-amber-500 text-white px-4 py-2.5 font-bold text-sm flex items-center gap-2">
              <DoorOpen className="w-4 h-4" /> Unassigned Rooms ({unassigned.length})
            </div>
            <div className="p-4 bg-background grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {unassigned.map(room => (
                <div key={room.id} className="flex items-start justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                  <div>
                    <p className="font-semibold text-sm">{room.name}</p>
                    {room.building && <p className="text-xs text-muted-foreground">{room.building}</p>}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(room)}><Pencil className="w-3 h-3" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"><Trash2 className="w-3 h-3" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{room.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently remove the room.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => handleDelete(room.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setFormError(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Room Name <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Room 101, Lab A, Auditorium" value={form.name} onChange={e => setF('name', e.target.value)} />
            </div>
            <div>
              <Label>Building</Label>
              <Input placeholder="e.g. Main Building, Science Hall" value={form.building} onChange={e => setF('building', e.target.value)} />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input type="number" min={1} placeholder="e.g. 40" value={form.capacity} onChange={e => setF('capacity', e.target.value)} />
            </div>
            <div>
              <Label>College <span className="text-red-500">*</span></Label>
              <Select value={form.collegeId} onValueChange={v => setF('collegeId', v)}>
                <SelectTrigger><SelectValue placeholder="Select college..." /></SelectTrigger>
                <SelectContent>
                  {state.colleges.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {state.colleges.length === 0 && <p className="text-xs text-amber-600 mt-1">No colleges found. Add colleges in Academic Units first.</p>}
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleSave}>
                {editRoom ? 'Save Changes' : 'Add Room'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
      <Dialog open={csvOpen} onOpenChange={v => { setCsvOpen(v); if (!v) setCsvRows([]); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Import Rooms from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 text-center space-y-3">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">Upload a CSV file with room data</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Required: <code className="bg-muted px-1 rounded">name, college</code> &nbsp;·&nbsp;
                  Optional: <code className="bg-muted px-1 rounded">building, capacity</code>
                </p>
                <p className="text-xs text-amber-600 mt-1">College must match an existing college name exactly.</p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4" /> Choose CSV File
                </Button>
                <Button variant="outline" size="sm" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={downloadTemplate}>
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
                  <Button size="sm" variant="ghost" className="text-xs text-muted-foreground h-7" onClick={() => setCsvRows([])}>Clear</Button>
                </div>
                <div className="rounded-xl border overflow-hidden">
                  <div className="overflow-x-auto max-h-56">
                    <table className="w-full text-xs">
                      <thead className="bg-muted border-b sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left w-6"></th>
                          <th className="px-3 py-2 text-left font-semibold">Room Name</th>
                          <th className="px-3 py-2 text-left font-semibold">Building</th>
                          <th className="px-3 py-2 text-left font-semibold">Capacity</th>
                          <th className="px-3 py-2 text-left font-semibold">College</th>
                          <th className="px-3 py-2 text-left font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {csvRows.map((row, i) => {
                          const collegeMatch = row.college
                            ? state.colleges.find(c => c.name.toLowerCase() === row.college.toLowerCase())
                            : null;
                          const rowError = row.error || (!collegeMatch && row.college ? 'College not found' : !row.college ? 'Missing college' : '');
                          return (
                            <tr key={i} className={rowError ? 'bg-red-50' : 'hover:bg-muted/40'}>
                              <td className="px-3 py-2 text-center">
                                {rowError ? <XCircle className="w-3.5 h-3.5 text-destructive mx-auto" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />}
                              </td>
                              <td className="px-3 py-2 font-medium">{row.name || <span className="text-muted-foreground italic">—</span>}</td>
                              <td className="px-3 py-2">{row.building || '—'}</td>
                              <td className="px-3 py-2">{row.capacity || '—'}</td>
                              <td className="px-3 py-2">{row.college || '—'}</td>
                              <td className="px-3 py-2">
                                {rowError ? <span className="text-destructive">{rowError}</span> : <span className="text-emerald-600 font-medium">Ready</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => { setCsvOpen(false); setCsvRows([]); }}>Cancel</Button>
                  <Button
                    className="flex-1 gap-2 bg-primary text-primary-foreground"
                    disabled={csvImporting}
                    onClick={handleCsvImport}
                  >
                    <Upload className="w-4 h-4" />
                    {csvImporting ? 'Importing...' : `Import ${csvRows.filter(r => !r.error).length} Room(s)`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
