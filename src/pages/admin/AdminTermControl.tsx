import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { CalendarDays, BookOpen, ClipboardList, Star, Award, CheckCircle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const controlDefs = [
  { key: 'enlistmentOpen' as const, label: 'Enlistment', desc: 'Allow students to enlist in class sections.', icon: <BookOpen size={18} /> },
  { key: 'enrollmentOpen' as const, label: 'Enrollment', desc: 'Allow students to finalize enrollment.', icon: <ClipboardList size={18} /> },
  { key: 'ficEvalOpen' as const, label: 'FIC Evaluation', desc: 'Allow students to submit faculty evaluations.', icon: <Star size={18} /> },
  { key: 'gradeSubmissionOpen' as const, label: 'Grade Submission', desc: 'Allow faculty to submit grades to students.', icon: <Award size={18} /> },
];

export default function AdminTermControl() {
  const { state, updateTermControls, setActiveTerm } = useApp();
  const { toast } = useToast();

  const handleToggle = (termId: string, key: keyof typeof state.terms[0]['controls'], val: boolean) => {
    updateTermControls(termId, { [key]: val });
    toast({ title: `${val ? 'Opened' : 'Closed'} successfully`, description: `Control has been updated.` });
  };

  const handleSetActive = (termId: string) => {
    setActiveTerm(termId);
    toast({ title: 'Active term updated', description: 'Students and faculty will now see this term.' });
  };

  return (
    <PortalLayout title="Term Control">
      <div className="space-y-6 max-w-3xl">
        <p className="text-muted-foreground text-sm">
          Manage each academic term and control which academic processes are currently open.
        </p>

        {state.terms.map(term => (
          <Card key={term.id} className={`border-2 transition-colors ${term.isActive ? 'border-secondary' : 'border-border'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <CalendarDays size={20} className={term.isActive ? 'text-secondary' : 'text-muted-foreground'} />
                  <div>
                    <CardTitle className="text-base">{term.name}</CardTitle>
                    <CardDescription>AY {term.academicYear} — {term.semester} Semester</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {term.isActive ? (
                    <Badge className="bg-secondary text-secondary-foreground flex items-center gap-1">
                      <CheckCircle size={12} /> Active Term
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetActive(term.id)}
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      Set as Active
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {controlDefs.map(ctrl => (
                  <div key={ctrl.key} className="flex items-start justify-between p-3 rounded-lg bg-muted/40 border border-border gap-3">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 ${term.controls[ctrl.key] ? 'text-secondary' : 'text-muted-foreground'}`}>
                        {ctrl.icon}
                      </span>
                      <div>
                        <Label htmlFor={`${term.id}-${ctrl.key}`} className="font-semibold text-sm cursor-pointer">
                          {ctrl.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">{ctrl.desc}</p>
                      </div>
                    </div>
                    <Switch
                      id={`${term.id}-${ctrl.key}`}
                      checked={term.controls[ctrl.key]}
                      onCheckedChange={v => handleToggle(term.id, ctrl.key, v)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PortalLayout>
  );
}
