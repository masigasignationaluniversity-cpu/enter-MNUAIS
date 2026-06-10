import { useRef, useState } from 'react';
import { Download, GitBranch } from 'lucide-react';
import type { Course } from '@/lib/types';

type CourseStatus = 'passed' | 'in_progress' | 'failed' | 'not_taken';

interface PlanFlowchartProps {
  courses: Course[];
  getStatus: (id: string) => CourseStatus;
  studentName: string;
}

const BOX_W = 136;
const BOX_H = 58;
const COL_GAP = 72;
const ROW_GAP = 16;
const MARGIN_X = 28;
const MARGIN_Y = 28;
const COL_STEP = BOX_W + COL_GAP;
const ROW_STEP = BOX_H + ROW_GAP;

const CATEGORY_ORDER = ['Major', 'Specialized', 'Thesis', 'GE', 'Elective GE', 'HK/PE/NSTP'];

const STATUS_STYLE: Record<CourseStatus, { fill: string; stroke: string; text: string; sub: string; badge: string }> = {
  passed:      { fill: '#dcfce7', stroke: '#16a34a', text: '#15803d', sub: '#166534', badge: '#bbf7d0' },
  in_progress: { fill: '#dbeafe', stroke: '#2563eb', text: '#1d4ed8', sub: '#1e40af', badge: '#bfdbfe' },
  failed:      { fill: '#fee2e2', stroke: '#dc2626', text: '#b91c1c', sub: '#991b1b', badge: '#fecaca' },
  not_taken:   { fill: '#f8fafc', stroke: '#cbd5e1', text: '#334155', sub: '#64748b', badge: '#e2e8f0' },
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
      const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const iw = pw - 20;
      const ih = Math.min(iw * ratio, ph - 20);
      pdf.addImage(imgData, 'PNG', 10, 10, iw, ih);
      pdf.save(`${studentName.replace(/\s+/g, '_')}_program_flowchart.pdf`);
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
    <div>
      {/* Portal-panel-header style bar */}
      <div className="portal-panel-header flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-white/80" />
          <span>Program Flowchart</span>
          <span className="text-white/50 text-xs font-normal ml-1">
            {courses.length} courses · arrows show prerequisites
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 flex-wrap">
            {LEGEND.map(([status, label]) => {
              const s = STATUS_STYLE[status];
              return (
                <span key={status} className="flex items-center gap-1.5 text-xs text-white/70">
                  <span
                    style={{
                      display: 'inline-block',
                      width: 12,
                      height: 12,
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
          <button
            onClick={exportPDF}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-lg px-3 py-1.5 transition-all disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Scrollable Flowchart — fills panel width, scrolls horizontally if needed */}
      <div className="w-full overflow-x-auto bg-card" style={{ minHeight: Math.min(svgH + 48, 520) }}>
        <div
          ref={ref}
          style={{ background: '#ffffff', display: 'inline-block', minWidth: '100%' }}
        >
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            width={svgW}
            height={svgH}
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block', minWidth: svgW }}
          >
            <defs>
              <marker id="arrowhead-fc" markerWidth="9" markerHeight="9" refX="8" refY="3.5" orient="auto">
                <path d="M0,0 L0,7 L9,3.5 z" fill="#94a3b8" />
              </marker>
              <filter id="box-shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#00000018" />
              </filter>
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
              const code = c.code.length > 15 ? c.code.slice(0, 15) + '…' : c.code;
              const title = c.title.length > 26 ? c.title.slice(0, 26) + '…' : c.title;
              const cat = (c.category ?? 'Major');
              return (
                <g key={c.id} filter="url(#box-shadow)">
                  {/* Main box */}
                  <rect
                    x={bx} y={by}
                    width={BOX_W} height={BOX_H}
                    rx={7} ry={7}
                    fill={st.fill}
                    stroke={st.stroke}
                    strokeWidth={1.5}
                  />
                  {/* Top accent bar */}
                  <rect
                    x={bx} y={by}
                    width={BOX_W} height={4}
                    rx={7} ry={7}
                    fill={st.stroke}
                    opacity={0.5}
                  />
                  {/* Course code */}
                  <text
                    x={pos.x} y={by + 20}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight="700"
                    fill={st.text}
                    fontFamily="system-ui, -apple-system, sans-serif"
                  >
                    {code}
                  </text>
                  {/* Course title */}
                  <text
                    x={pos.x} y={by + 34}
                    textAnchor="middle"
                    fontSize={8.5}
                    fill={st.text}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    opacity={0.8}
                  >
                    {title}
                  </text>
                  {/* Units · Category */}
                  <text
                    x={pos.x} y={by + BOX_H - 6}
                    textAnchor="middle"
                    fontSize={7.5}
                    fill={st.sub}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    opacity={0.7}
                  >
                    {c.units}u · {cat}
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
