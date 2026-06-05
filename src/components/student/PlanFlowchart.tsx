import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { Course } from '@/lib/types';

type CourseStatus = 'passed' | 'in_progress' | 'failed' | 'not_taken';

interface PlanFlowchartProps {
  courses: Course[];
  getStatus: (id: string) => CourseStatus;
  studentName: string;
}

const BOX_W = 118;
const BOX_H = 50;
const COL_GAP = 68;
const ROW_GAP = 14;
const MARGIN_X = 24;
const MARGIN_Y = 24;
const COL_STEP = BOX_W + COL_GAP;
const ROW_STEP = BOX_H + ROW_GAP;

const CATEGORY_ORDER = ['Major', 'Specialized', 'Thesis', 'GE', 'Elective GE', 'HK/PE/NSTP'];

const STATUS_STYLE: Record<CourseStatus, { fill: string; stroke: string; text: string; sub: string }> = {
  passed:      { fill: '#dcfce7', stroke: '#16a34a', text: '#15803d', sub: '#166534' },
  in_progress: { fill: '#dbeafe', stroke: '#2563eb', text: '#1d4ed8', sub: '#1e40af' },
  failed:      { fill: '#fee2e2', stroke: '#dc2626', text: '#b91c1c', sub: '#991b1b' },
  not_taken:   { fill: '#f8fafc', stroke: '#94a3b8', text: '#334155', sub: '#64748b' },
};

/** Topological level assignment — max prereq level + 1 */
function assignLevels(courses: Course[]): Map<string, number> {
  const ids = new Set(courses.map(c => c.id));
  const levelMap = new Map<string, number>();
  courses.forEach(c => levelMap.set(c.id, 0));

  let changed = true;
  let iters = 0;
  while (changed && iters < courses.length + 2) {
    changed = false;
    iters++;
    courses.forEach(c => {
      const prereqs = (c.prerequisites ?? []).flat().filter(id => ids.has(id));
      if (prereqs.length > 0) {
        const maxPre = Math.max(...prereqs.map(id => levelMap.get(id) ?? 0));
        const next = maxPre + 1;
        if (next > (levelMap.get(c.id) ?? 0)) {
          levelMap.set(c.id, next);
          changed = true;
        }
      }
    });
  }
  return levelMap;
}

export default function PlanFlowchart({ courses, getStatus, studentName }: PlanFlowchartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  if (courses.length === 0) return null;

  // ── Layout ─────────────────────────────────────────────────────────────────
  const levelMap = assignLevels(courses);
  const maxLevel = Math.max(...Array.from(levelMap.values()));

  // Group by level and sort within each group
  const byLevel = new Map<number, Course[]>();
  for (let i = 0; i <= maxLevel; i++) byLevel.set(i, []);
  courses.forEach(c => byLevel.get(levelMap.get(c.id) ?? 0)!.push(c));
  byLevel.forEach(arr =>
    arr.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.category ?? 'Major');
      const bi = CATEGORY_ORDER.indexOf(b.category ?? 'Major');
      if (ai !== bi) return ai - bi;
      return a.code.localeCompare(b.code);
    })
  );

  // Build position map: id → center {x, y}
  const posMap = new Map<string, { x: number; y: number }>();
  for (let level = 0; level <= maxLevel; level++) {
    const arr = byLevel.get(level) ?? [];
    const cx = MARGIN_X + level * COL_STEP + BOX_W / 2;
    arr.forEach((c, row) => {
      posMap.set(c.id, { x: cx, y: MARGIN_Y + row * ROW_STEP + BOX_H / 2 });
    });
  }

  const maxRows = Math.max(...Array.from(byLevel.values()).map(a => a.length));
  const svgW = MARGIN_X * 2 + (maxLevel + 1) * COL_STEP - COL_GAP + MARGIN_X;
  const svgH = MARGIN_Y * 2 + maxRows * ROW_STEP - ROW_GAP + MARGIN_Y;

  // ── Edges ──────────────────────────────────────────────────────────────────
  const ids = new Set(courses.map(c => c.id));
  const edges: { from: string; to: string }[] = [];
  courses.forEach(c =>
    (c.prerequisites ?? []).flat().forEach(prereqId => {
      if (ids.has(prereqId)) edges.push({ from: prereqId, to: c.id });
    })
  );

  // ── PDF Export ─────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    if (!ref.current) return;
    setExporting(true);
    try {
      const [html2canvas, jspdfMod] = await Promise.all([
        import('html2canvas').then(m => m.default),
        import('jspdf'),
      ]);
      const jsPDF = jspdfMod.default ?? jspdfMod.jsPDF;
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const iw = pw - 20;
      const ih = Math.min(iw * ratio, ph - 20);
      pdf.addImage(imgData, 'PNG', 10, 10, iw, ih);
      pdf.save(`${studentName.replace(/\s+/g, '_')}_plan_flowchart.pdf`);
    } catch (e) {
      console.error('PDF export error', e);
    } finally {
      setExporting(false);
    }
  };

  const LEGEND: [CourseStatus, string][] = [
    ['passed', 'Passed'],
    ['in_progress', 'In Progress'],
    ['failed', 'Failed'],
    ['not_taken', 'Not Taken'],
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-base">Program Flowchart</h3>
          <p className="text-xs text-muted-foreground">
            {courses.length} required courses &middot; arrows indicate prerequisites
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 flex-wrap">
            {LEGEND.map(([status, label]) => {
              const s = STATUS_STYLE[status];
              return (
                <span key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    style={{
                      display: 'inline-block',
                      width: 13,
                      height: 13,
                      background: s.fill,
                      border: `1.5px solid ${s.stroke}`,
                      borderRadius: 3,
                      flexShrink: 0,
                    }}
                  />
                  {label}
                </span>
              );
            })}
          </div>
          <Button onClick={exportPDF} disabled={exporting} className="gap-2" size="sm">
            <Download className="w-4 h-4" />
            {exporting ? 'Generating…' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Scrollable Flowchart */}
      <div className="overflow-auto border rounded-lg bg-white shadow-sm">
        <div
          ref={ref}
          style={{
            background: '#ffffff',
            display: 'inline-block',
            padding: `${MARGIN_Y}px ${MARGIN_X}px`,
          }}
        >
          <svg
            width={svgW}
            height={svgH}
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
          >
            <defs>
              <marker
                id="arrowhead-fc"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
              </marker>
            </defs>

            {/* ── Arrows ── */}
            {edges.map(({ from, to }) => {
              const src = posMap.get(from);
              const dst = posMap.get(to);
              if (!src || !dst) return null;
              const x1 = src.x + BOX_W / 2;
              const y1 = src.y;
              const x2 = dst.x - BOX_W / 2;
              const y2 = dst.y;
              const midX = (x1 + x2) / 2;
              return (
                <path
                  key={`${from}-${to}`}
                  d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  fill="none"
                  markerEnd="url(#arrowhead-fc)"
                />
              );
            })}

            {/* ── Course Boxes ── */}
            {courses.map(c => {
              const pos = posMap.get(c.id);
              if (!pos) return null;
              const status = getStatus(c.id);
              const st = STATUS_STYLE[status];
              const bx = pos.x - BOX_W / 2;
              const by = pos.y - BOX_H / 2;
              const code = c.code.length > 13 ? c.code.slice(0, 13) + '…' : c.code;
              const title = c.title.length > 24 ? c.title.slice(0, 24) + '…' : c.title;
              const cat = (c.category ?? 'Major');
              return (
                <g key={c.id}>
                  {/* Box shadow */}
                  <rect
                    x={bx + 2} y={by + 2}
                    width={BOX_W} height={BOX_H}
                    rx={6} ry={6}
                    fill="#00000011"
                  />
                  {/* Main box */}
                  <rect
                    x={bx} y={by}
                    width={BOX_W} height={BOX_H}
                    rx={6} ry={6}
                    fill={st.fill}
                    stroke={st.stroke}
                    strokeWidth={1.5}
                  />
                  {/* Course code */}
                  <text
                    x={pos.x} y={by + 17}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight="700"
                    fill={st.text}
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {code}
                  </text>
                  {/* Course title */}
                  <text
                    x={pos.x} y={by + 30}
                    textAnchor="middle"
                    fontSize={8.5}
                    fill={st.text}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    opacity={0.85}
                  >
                    {title}
                  </text>
                  {/* Units · Category */}
                  <text
                    x={pos.x} y={by + BOX_H - 5}
                    textAnchor="middle"
                    fontSize={7.5}
                    fill={st.sub}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    opacity={0.75}
                  >
                    {c.units}u &middot; {cat}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
