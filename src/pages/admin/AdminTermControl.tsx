import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Plus, Pencil, Check, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const CONTROLS = [
  { key: 'enlistmentOpen', label: 'Enlistment' },
  { key: 'enrollmentOpen', label: 'Enrollment' },
  { key: 'ficEvalOpen', label: 'FIC Evaluation' },
  { key: 'gradeSubmissionOpen', label: 'Grade Submission' },
  { key: 'prerogativeOpen', label: 'Prerogatives' },
] as const;

export default function AdminTermControl() {
  const { state, updateTermControls, updateTermSettings, setActiveTerm, addTerm, deleteTerm } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editTerm, setEditTerm] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', academicYear: '', semester: '1st' as '1st' | '2nd' | 'Summer', dropDeadline: '', maxUnits: '21' });
  const [editForm, setEditForm] = useState<{ dropDeadline: string; maxUnits: string }>({ dropDeadline: '', maxUnits: '21' });

  const handleAdd = () => {
    if (!form.name || !form.academicYear) return;
    addTerm({
      name: form.name,
      academicYear: form.academicYear,
      semester: form.semester,
      isActive: false,
      dropDeadline: form.dropDeadline,
      maxUnits: parseInt(form.maxUnits) || 21,
      controls: { enlistmentOpen: false, enrollmentOpen: false, ficEvalOpen: false, gradeSubmissionOpen: false, prerogativeOpen: false },
    });
    setForm({ name: '', academicYear: '', semester: '1st', dropDeadline: '', maxUnits: '21' });
    setAddOpen(false);
  };

  const handleSaveEdit = (termId: string) => {
    updateTermSettings(termId, {
      dropDeadline: editForm.dropDeadline,
      maxUnits: parseInt(editForm.maxUnits) || 21,
    });
    setEditTerm(null);
  };

  const openEdit = (term: typeof state.terms[0]) => {
    setEditForm({ dropDeadline: term.dropDeadline ?? '', maxUnits: String(term.maxUnits ?? 21) });
    setEditTerm(term.id);
  };

  return (
    <PortalLayout role="admin" userName={state.currentUser?.name ?? ''}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Term Control</h1>
            <p className="text-gray-600 mt-1">Manage academic terms and module access</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
                <Plus className="w-4 h-4" /> Add Term
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Add New Term</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Term Name</Label>
                  <Input placeholder="e.g. 1st Semester 2025-2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Academic Year</Label>
                  <Input placeholder="e.g. 2025-2026" value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} />
                </div>
                <div>
                  <Label>Semester</Label>
                  <Select value={form.semester} onValueChange={v => setForm(f => ({ ...f, semester: v as '1st' | '2nd' | 'Summer' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st">1st Semester</SelectItem>
                      <SelectItem value="2nd">2nd Semester</SelectItem>
                      <SelectItem value="Summer">Summer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Drop Deadline</Label>
                  <Input type="date" value={form.dropDeadline} onChange={e => setForm(f => ({ ...f, dropDeadline: e.target.value }))} />
                </div>
                <div>
                  <Label>Max Units per Student (excl. PE/NSTP)</Label>
                  <Input type="number" min={1} max={30} value={form.maxUnits} onChange={e => setForm(f => ({ ...f, maxUnits: e.target.value }))} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button className="flex-1 bg-primary text-white" onClick={handleAdd}>Add Term</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {state.terms.map(term => (
            <Card key={term.id} className={`portal-card border-2 ${term.isActive ? 'border-green-500' : 'border-gray-200'}`}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{term.name}</CardTitle>
                    {term.isActive ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200">● Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">Inactive</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(term)}>
                      <Pencil className="w-3 h-3" /> Edit Settings
                    </Button>
                    {!term.isActive && (
                      <Button size="sm" variant="outline" className="border-green-500 text-green-700 hover:bg-green-50 gap-1" onClick={() => setActiveTerm(term.id)}>
                        <Check className="w-3 h-3" /> Set Active
                      </Button>
                    )}
                    {!term.isActive && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{term.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove the term. Enrollment and grade records linked to this term will remain but the term itself cannot be recovered.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTerm(term.id)}>
                              Delete Term
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                  <span>A.Y. {term.academicYear}</span>
                  <span>Drop Deadline: {term.dropDeadline ? new Date(term.dropDeadline).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not set'}</span>
                  <span>Max Units: {term.maxUnits ?? '—'}</span>
                </div>
              </CardHeader>

              {editTerm === term.id && (
                <div className="mx-6 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                  <p className="font-medium text-blue-800 text-sm">Edit Term Settings</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Drop Deadline</Label>
                      <Input type="date" value={editForm.dropDeadline} onChange={e => setEditForm(f => ({ ...f, dropDeadline: e.target.value }))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Max Regular Units</Label>
                      <Input type="number" min={1} max={30} value={editForm.maxUnits} onChange={e => setEditForm(f => ({ ...f, maxUnits: e.target.value }))} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditTerm(null)}>Cancel</Button>
                    <Button size="sm" className="bg-primary text-white" onClick={() => handleSaveEdit(term.id)}>Save</Button>
                  </div>
                </div>
              )}

              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CONTROLS.map(ctrl => (
                    <div key={ctrl.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {term.controls[ctrl.key]
                          ? <CheckCircle className="w-4 h-4 text-green-500" />
                          : <XCircle className="w-4 h-4 text-red-400" />}
                        <span className="text-sm font-medium">{ctrl.label}</span>
                      </div>
                      <Switch
                        checked={term.controls[ctrl.key]}
                        onCheckedChange={val => updateTermControls(term.id, { [ctrl.key]: val })}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PortalLayout>
  );
}
