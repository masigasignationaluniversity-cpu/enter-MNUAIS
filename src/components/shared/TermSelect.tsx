import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Term {
  id: string;
  name: string;
  isActive?: boolean;
}

interface TermSelectProps {
  terms: Term[];
  value: string;
  onValueChange: (v: string) => void;
  includeAll?: boolean;
  className?: string;
}

export function TermSelect({ terms, value, onValueChange, includeAll, className }: TermSelectProps) {
  const selected = value === 'all' ? null : terms.find(t => t.id === value);
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm font-medium text-muted-foreground shrink-0">Semester:</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-56 sm:w-64">
          <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
            <span className="truncate text-sm">{selected ? selected.name : includeAll ? 'All Terms' : 'Select term'}</span>
            {selected?.isActive && (
              <span className="text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded shrink-0 leading-none">Active</span>
            )}
          </div>
        </SelectTrigger>
        <SelectContent>
          {includeAll && <SelectItem value="all">All Terms</SelectItem>}
          {terms.map(t => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
