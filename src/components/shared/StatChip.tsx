import { LucideIcon } from 'lucide-react';

interface StatChipProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  colorClass?: string; // e.g. 'bg-yellow-100 text-yellow-700'
}

/** Compact stat chip row item — replaces plain "Label: value" text rows. */
export function StatChip({ icon: Icon, value, label, colorClass = 'bg-primary/10 text-primary' }: StatChipProps) {
  return (
    <div className="dash-stat-sm">
      <div className={`dash-stat-sm-icon ${colorClass}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div>
        <p className="dash-stat-sm-value">{value}</p>
        <p className="dash-stat-sm-label">{label}</p>
      </div>
    </div>
  );
}
