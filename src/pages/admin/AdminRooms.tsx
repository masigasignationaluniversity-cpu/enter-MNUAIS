import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, DoorOpen, Search, Building2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Room } from '@/lib/types';

const emptyForm = {
  name: '',
  building: '',
  capacity: '',
  collegeId: '',
};

export default function AdminRooms() {
  const { state, addRoom, updateRoom, deleteRoom } = useApp();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const setF = (k: keyof typeof emptyForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => {
    setEditRoom(null);
    setForm(emptyForm);
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditRoom(room);
    setForm({
      name: room.name,
      building: room.building ?? '',
      capacity: room.capacity != null ? String(room.capacity) : '',
      collegeId: room.collegeId,
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { setFormError('Room name is required.'); return; }
    if (!form.collegeId) { setFormError('College is required.'); return; }
    setFormError('');
    const data: Omit<Room, 'id'> = {
      name: form.name.trim(),
      building: form.building.trim() || undefined,
      capacity: form.capacity ? parseInt(form.capacity) || undefined : undefined,
      collegeId: form.collegeId,
    };
    if (editRoom) {
      updateRoom(editRoom.id, data);
      toast.success('Room updated');
    } else {
      addRoom(data);
      toast.success('Room added');
    }
    setDialogOpen(false);
    setForm(emptyForm);
    setEditRoom(null);
  };

  const handleDelete = (roomId: string) => {
    deleteRoom(roomId);
    toast.success('Room deleted');
  };

  const rooms = state.rooms ?? [];
  const filteredRooms = search.trim()
    ? rooms.filter(r => {
        const college = state.colleges.find(c => c.id === r.collegeId);
        const q = search.toLowerCase();
        return r.name.toLowerCase().includes(q) ||
          (r.building ?? '').toLowerCase().includes(q) ||
          (college?.name ?? '').toLowerCase().includes(q);
      })
    : rooms;

  // Group by college
  const collegeGroups = state.colleges.map(college => ({
    college,
    rooms: filteredRooms.filter(r => r.collegeId === college.id),
  })).filter(g => g.rooms.length > 0);

  const unassigned = filteredRooms.filter(r => !state.colleges.find(c => c.id === r.collegeId));

  return (
    <PortalLayout role="admin" userName={state.currentUser?.name ?? ''}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DoorOpen className="w-6 h-6 text-primary" /> Room Management
            </h1>
            <p className="text-gray-600 mt-1">Manage rooms available for class scheduling by OCS</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Room
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by room name, building, or college..."
            className="pl-9 max-w-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-md overflow-hidden border border-border">
            <div className="bg-primary text-primary-foreground px-3 py-2.5 flex items-center justify-between">
              <span className="text-xs font-bold">Total Rooms</span>
              <DoorOpen className="w-4 h-4" />
            </div>
            <div className="px-3 py-3 bg-background">
              <p className="text-2xl font-bold text-foreground">{rooms.length}</p>
            </div>
          </div>
          <div className="rounded-md overflow-hidden border border-border">
            <div className="bg-primary text-primary-foreground px-3 py-2.5 flex items-center justify-between">
              <span className="text-xs font-bold">Colleges with Rooms</span>
              <Building2 className="w-4 h-4" />
            </div>
            <div className="px-3 py-3 bg-background">
              <p className="text-2xl font-bold text-foreground">{state.colleges.filter(c => rooms.some(r => r.collegeId === c.id)).length}</p>
            </div>
          </div>
        </div>

        {/* No rooms */}
        {rooms.length === 0 && (
          <div className="rounded-md overflow-hidden border border-dashed border-border">
            <div className="py-12 text-center bg-background">
              <DoorOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="font-medium text-gray-500">No rooms added yet</p>
              <p className="text-sm text-gray-400 mt-1">Add rooms to make them available for section scheduling</p>
              <Button className="mt-4 gap-2" onClick={openAdd}>
                <Plus className="w-4 h-4" /> Add First Room
              </Button>
            </div>
          </div>
        )}

        {/* Grouped by college */}
        {collegeGroups.map(({ college, rooms: collegeRooms }) => (
          <div key={college.id} className="rounded-md overflow-hidden border border-border">
            <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {college.name}
              <Badge className="ml-1 bg-primary-foreground/15 text-primary-foreground border-0 text-xs">{collegeRooms.length} room{collegeRooms.length !== 1 ? 's' : ''}</Badge>
            </div>
            <div className="p-4 bg-background">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {collegeRooms.map(room => (
                  <div key={room.id} className="flex items-start justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                    <div>
                      <p className="font-semibold text-sm">{room.name}</p>
                      {room.building && <p className="text-xs text-gray-500">{room.building}</p>}
                      {room.capacity != null && (
                        <p className="text-xs text-gray-400 mt-0.5">Capacity: {room.capacity}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(room)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{room.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove the room. Existing sections using this room will not be affected.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => handleDelete(room.id)}>
                              Delete
                            </AlertDialogAction>
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

        {/* Unassigned rooms */}
        {unassigned.length > 0 && (
          <div className="rounded-md overflow-hidden border border-yellow-300">
            <div className="bg-yellow-600 text-white px-4 py-2.5 font-bold text-sm">Unassigned Rooms ({unassigned.length})</div>
            <div className="p-4 bg-background">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unassigned.map(room => (
                  <div key={room.id} className="flex items-start justify-between p-3 rounded-lg border border-yellow-200 bg-yellow-50/50">
                    <div>
                      <p className="font-semibold text-sm">{room.name}</p>
                      {room.building && <p className="text-xs text-gray-500">{room.building}</p>}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(room)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-3 h-3" />
                          </Button>
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
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setFormError(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
          </DialogHeader>
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
                <SelectTrigger>
                  <SelectValue placeholder="Select college..." />
                </SelectTrigger>
                <SelectContent>
                  {state.colleges.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.colleges.length === 0 && (
                <p className="text-xs text-yellow-600 mt-1">No colleges found. Add colleges in Academic Units first.</p>
              )}
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary text-white" onClick={handleSave}>
                {editRoom ? 'Save Changes' : 'Add Room'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
