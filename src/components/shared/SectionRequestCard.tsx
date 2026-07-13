import { ReactNode } from 'react';
import { ChevronDown, ChevronUp, BookOpen, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SectionRequestCardProps {
  courseCode: string;
  courseTitle: string;
  sectionCode: string;
  pendingCount: number;
  requestCount: number;
  enrolled?: number;
  slots?: number;
  units?: string;
  metaLine?: ReactNode;
  rightSlot?: ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * Shared collapsible card used by Faculty/DeptHead/OCS consent & prerogative
 * panels — one card per section, expandable to reveal the request table.
 */
export function SectionRequestCard({
  courseCode, courseTitle, sectionCode, pendingCount, requestCount,
  enrolled, slots, units, metaLine, rightSlot, isExpanded, onToggle, children,
}: SectionRequestCardProps) {
  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/20">
        <button className="flex items-start gap-3 flex-1 min-w-0 text-left" onClick={onToggle}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white mt-0.5" style={{ background: 'var(--gradient-header)' }}>
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{courseCode}</span>
              <Badge variant="outline" className="text-xs">Sec {sectionCode}</Badge>
              {pendingCount > 0 && <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">{pendingCount} pending</Badge>}
            </div>
            <p className="text-xs text-muted-foreground truncate">{courseTitle}</p>
            {metaLine && <p className="text-xs text-muted-foreground mt-0.5">{metaLine}</p>}
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              {enrolled !== undefined && slots !== undefined && (
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{enrolled}/{slots}</span>
              )}
              {units && <span>{units}</span>}
              <span>{requestCount} req</span>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          {rightSlot}
          <button onClick={onToggle} className="p-1 rounded hover:bg-muted/60">
            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
      </div>
      {isExpanded && <div className="bg-background">{children}</div>}
    </div>
  );
}
