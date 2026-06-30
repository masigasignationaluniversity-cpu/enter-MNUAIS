import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { DollarSign, Save, Info, Copy } from 'lucide-react';
import type { TermFeeSchedule } from '@/lib/types';

type FeeForm = Record<keyof TermFeeSchedule, string>;

const FEE_FIELDS: [keyof TermFeeSchedule, string, string][] = [
  ['tuitionPerUnit',       'Tuition per Academic Unit',        'Multiplied by the number of enrolled academic units.'],
  ['nstpTuition',          'NSTP Tuition',                     'Applied once per term when the student has NSTP units.'],
  ['admissionFees',        'Admission Fees',                   'Flat fee per term.'],
  ['entranceFees',         'Entrance Fees',                    'Flat fee per term.'],
  ['registrationFees',     'Registration Fees',                'Flat fee per term.'],
  ['libraryFees',          'Library Fees',                     'Flat fee per term.'],
  ['labFeePerUnit',        'Lab Fee per Lab Unit',             'Multiplied by the number of lab units (labUnits) per enrolled course.'],
  ['computerFees',         'Computer Fees',                    'Flat fee per term.'],
  ['athleticFees',         'Athletic Fees',                    'Flat fee per term.'],
  ['culturalFees',         'Cultural Fees',                    'Flat fee per term.'],
  ['medicalDentalFees',    'Medical and Dental Fees',          'Flat fee per term.'],
  ['guidanceFees',         'Guidance Fees',                    'Flat fee per term.'],
  ['handbookFees',         'Handbook Fees',                    'Flat fee per term.'],
  ['schoolIdFees',         'School ID Fees',                   'Flat fee per term.'],
  ['developmentFees',      'Development Fees',                 'Flat fee per term.'],
  ['edf',                  'EDF',                              'Flat fee per term.'],
  ['changeOfMatriculation','Change of Matriculation',          'Flat fee per term.'],
  ['depositFee',           'Deposit Fee',                      'Flat fee per term.'],
];

const GROUPS: { label: string; fields: (keyof TermFeeSchedule)[] }[] = [
  { label: 'Tuition',      fields: ['tuitionPerUnit', 'nstpTuition', 'labFeePerUnit'] },
  { label: 'Registration & Admission', fields: ['admissionFees', 'entranceFees', 'registrationFees'] },
  { label: 'School Fees',  fields: ['libraryFees', 'computerFees', 'athleticFees', 'culturalFees', 'medicalDentalFees', 'guidanceFees'] },
  { label: 'Miscellaneous', fields: ['handbookFees', 'schoolIdFees', 'developmentFees', 'edf', 'changeOfMatriculation', 'depositFee'] },
];

const empty = (): FeeForm => Object.fromEntries(FEE_FIELDS.map(([k]) => [k, '0'])) as FeeForm;

const fromSchedule = (fs?: TermFeeSchedule): FeeForm =>
  fs
    ? Object.fromEntries(FEE_FIELDS.map(([k]) => [k, String(fs[k] ?? 0)])) as FeeForm
    : empty();

const toSchedule = (f: FeeForm): TermFeeSchedule =>
  Object.fromEntries(FEE_FIELDS.map(([k]) => [k, parseFloat(f[k]) || 0])) as unknown as TermFeeSchedule;

const fmtPHP = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const sum = (f: FeeForm, keys: (keyof TermFeeSchedule)[]) =>
  keys.reduce((s, k) => s + (parseFloat(f[k]) || 0), 0);

export default function AdminFeeSchedule() {
  const { state, updateTermSettings } = useApp();

  const terms = [...state.terms].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
  const activeTerm = terms.find(t => t.isActive) ?? terms[0];

  const [selectedTermId, setSelectedTermId] = useState(activeTerm?.id ?? '');
  const [form, setForm] = useState<FeeForm>(() => {
    const t = terms.find(t => t.id === selectedTermId);
    return fromSchedule(t?.feeSchedule);
  });
  const [saving, setSaving] = useState(false);

  const selectedTerm = state.terms.find(t => t.id === selectedTermId);

  const handleTermChange = (termId: string) => {
    setSelectedTermId(termId);
    const t = state.terms.find(t => t.id === termId);
    setForm(fromSchedule(t?.feeSchedule));
  };

  const setField = (key: keyof TermFeeSchedule, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!selectedTermId) { toast.error('Select a term first.'); return; }
    setSaving(true);
    try {
      updateTermSettings(selectedTermId, { feeSchedule: toSchedule(form) });
      toast.success('Fee schedule saved successfully.');
    } catch { toast.error('Failed to save. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleCopyFrom = (sourceTermId: string) => {
    const src = state.terms.find(t => t.id === sourceTermId);
    if (src?.feeSchedule) {
      setForm(fromSchedule(src.feeSchedule));
      toast.success(`Copied fee schedule from ${src.name}.`);
    }
  };

  // Summary totals (for a sample 18-unit, 0 lab-unit student)
  const sampleUnits = 18;
  const tuitionSample = (parseFloat(form.tuitionPerUnit) || 0) * sampleUnits;
  const otherFlatSum = sum(form, ['admissionFees', 'entranceFees', 'registrationFees', 'libraryFees',
    'computerFees', 'athleticFees', 'culturalFees', 'medicalDentalFees', 'guidanceFees',
    'handbookFees', 'schoolIdFees', 'developmentFees', 'edf', 'changeOfMatriculation', 'depositFee']);
  const totalSample = tuitionSample + otherFlatSum;

  const infoFor = (key: keyof TermFeeSchedule) => FEE_FIELDS.find(([k]) => k === key)?.[2] ?? '';
  const labelFor = (key: keyof TermFeeSchedule) => FEE_FIELDS.find(([k]) => k === key)?.[1] ?? key;

  return (
    <PortalLayout>
      <div className="space-y-5">

        {/* Header */}
        <div className="portal-panel p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="font-bold text-lg text-foreground flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" /> Fee Schedule
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure enrollment fee amounts per term. Fees are used to compute the Certificate of Registration (Form 5)
              and are applied when OCS records student payments.
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {/* Copy from another term */}
            {terms.filter(t => t.id !== selectedTermId && t.feeSchedule).length > 0 && (
              <SearchableSelect
                value=""
                onValueChange={handleCopyFrom}
                placeholder="Select a term to copy from..."
                options={state.terms.filter(t => t.id !== selectedTermId).map(t => ({ value: t.id, label: t.name }))}
              />
            )}
            <SearchableSelect
              value={selectedTermId}
              onValueChange={handleTermChange}
              triggerClassName="w-52 h-9"
              placeholder="Select term..."
              options={state.terms.map(t => ({ value: t.id, label: `${t.name}${t.isActive ? ' (Active)' : ''}` }))}
            />
          </div>
        </div>

        {!selectedTermId ? (
          <div className="portal-panel p-12 text-center text-muted-foreground text-sm">Select a term to configure its fee schedule.</div>
        ) : (
          <>
            {/* Preview card */}
            <div className="portal-panel p-4 bg-primary/5 border-primary/20">
              <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">Sample Assessment Preview — {sampleUnits} Academic Units, 0 Lab Units</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Tuition</p>
                  <p className="font-bold text-sm text-foreground">{fmtPHP(tuitionSample)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Other Fees</p>
                  <p className="font-bold text-sm text-foreground">{fmtPHP(otherFlatSum)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-bold text-base text-primary">{fmtPHP(totalSample)}</p>
                </div>
              </div>
            </div>

            {/* Fee groups */}
            {GROUPS.map(group => (
              <div key={group.label} className="portal-panel p-4 space-y-3">
                <h2 className="font-semibold text-sm text-foreground border-b pb-2">{group.label}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.fields.map(key => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs font-medium">{labelFor(key)} <span className="text-muted-foreground">(₱)</span></Label>
                      <Input
                        type="number" min={0} step="0.01"
                        value={form[key]}
                        onChange={e => setField(key, e.target.value)}
                        className="h-9 text-sm font-mono"
                        placeholder="0.00"
                      />
                      <p className="text-[10px] text-muted-foreground flex items-start gap-1">
                        <Info size={10} className="mt-0.5 flex-shrink-0" />{infoFor(key)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Save */}
            <div className="flex justify-end gap-3">
              <Button
                className="gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={15} /> {saving ? 'Saving...' : `Save Fee Schedule — ${selectedTerm?.name}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  );
}
