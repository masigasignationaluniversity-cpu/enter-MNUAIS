import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Video, ChevronRight, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { TUTORIAL_DATA } from './VideoTutorialData';
import type { TModule, IlluType, NodeType } from './VideoTutorialData';
import type { Role } from '../../lib/types';

/* ─── Frame types ────────────────────────────────────────────── */
type FrameType = 'overview' | 'flowchart' | 'tips';
const FRAMES: FrameType[] = ['overview', 'flowchart', 'tips'];
const FRAME_LABELS: Record<FrameType, string> = { overview: 'Overview', flowchart: 'Flowchart', tips: 'Tips' };
const FRAME_DURATION: Record<FrameType, number> = { overview: 7, flowchart: 9, tips: 7 };

/* ─── SVG Illustrations ──────────────────────────────────────── */
const SIDEBAR_W = 52;
const SBG = '#6b0f1f';
const SCONTENT = '#f8f9fa';

function PortalShell({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <svg viewBox="0 0 340 142" style={{ width: '100%', borderRadius: 8, overflow: 'hidden', display: 'block' }}>
      <rect width="340" height="142" fill={SCONTENT} />
      {/* Sidebar */}
      <rect width={SIDEBAR_W} height="142" fill={accent} />
      <rect x="10" y="12" width="32" height="8" rx="4" fill="rgba(255,255,255,0.85)" />
      {[40, 58, 76, 94, 112].map((y, i) => (
        <g key={i}>
          <rect x="8" y={y} width="36" height="12" rx="3" fill={i === 0 ? 'rgba(255,255,255,0.25)' : 'transparent'} />
          <rect x="12" y={y + 3} width="20" height="6" rx="3" fill="rgba(255,255,255,0.5)" />
        </g>
      ))}
      {/* Top bar */}
      <rect x={SIDEBAR_W} y="0" width={340 - SIDEBAR_W} height="22" fill="white" />
      <rect x={SIDEBAR_W} y="22" width={340 - SIDEBAR_W} height="1" fill="#e5e7eb" />
      <rect x={SIDEBAR_W + 8} y="7" width="80" height="8" rx="3" fill="#e5e7eb" />
      <rect x="290" y="6" width="42" height="10" rx="5" fill={accent} opacity="0.15" />
      <rect x="297" y="9" width="28" height="4" rx="2" fill={accent} opacity="0.6" />
      {/* Content area */}
      {children}
    </svg>
  );
}

function IlluDashboard({ accent }: { accent: string }) {
  const cards = [
    { x: 60, y: 30, label: 'Students', val: '1,248' },
    { x: 150, y: 30, label: 'Faculty', val: '84' },
    { x: 240, y: 30, label: 'Sections', val: '210' },
    { x: 60, y: 88, label: 'Courses', val: '96' },
  ];
  return (
    <PortalShell accent={accent}>
      {cards.map((c, i) => (
        <g key={i}>
          <rect x={c.x} y={c.y} width="82" height="48" rx="5" fill="white" stroke="#e5e7eb" />
          <rect x={c.x + 6} y={c.y + 6} width="24" height="24" rx="4" fill={accent} opacity="0.12" />
          <rect x={c.x + 10} y={c.y + 12} width="14" height="12" rx="3" fill={accent} opacity="0.5" />
          <text x={c.x + 36} y={c.y + 18} fontSize="7" fill="#6b7280" fontFamily="sans-serif">{c.label}</text>
          <text x={c.x + 36} y={c.y + 30} fontSize="11" fontWeight="700" fill="#111827" fontFamily="sans-serif">{c.val}</text>
        </g>
      ))}
      {/* Progress bar row */}
      <rect x="60" y="142" width="270" height="0" />
    </PortalShell>
  );
}

function IlluTable({ accent }: { accent: string }) {
  const rows = ['Alice Reyes', 'Ben Santos', 'Clara Tiu', 'David Cruz'];
  return (
    <PortalShell accent={accent}>
      <rect x={SIDEBAR_W + 4} y="27" width="282" height="11" rx="2" fill={accent} opacity="0.1" />
      <rect x={SIDEBAR_W + 8} y="30" width="60" height="5" rx="2" fill={accent} opacity="0.5" />
      <rect x={SIDEBAR_W + 90} y="30" width="50" height="5" rx="2" fill="#9ca3af" />
      <rect x={SIDEBAR_W + 160} y="30" width="40" height="5" rx="2" fill="#9ca3af" />
      {rows.map((r, i) => (
        <g key={i}>
          <rect x={SIDEBAR_W + 4} y={41 + i * 22} width="282" height="20" rx="2" fill={i % 2 === 0 ? 'white' : '#f9fafb'} stroke="#f3f4f6" />
          <text x={SIDEBAR_W + 12} y={41 + i * 22 + 13} fontSize="8" fill="#374151" fontFamily="sans-serif">{r}</text>
          <rect x={SIDEBAR_W + 180} y={41 + i * 22 + 5} width="36" height="10" rx="5" fill={accent} opacity="0.12" />
          <rect x={SIDEBAR_W + 185} y={41 + i * 22 + 8} width="24" height="4" rx="2" fill={accent} opacity="0.5" />
        </g>
      ))}
    </PortalShell>
  );
}

function IlluForm({ accent }: { accent: string }) {
  const fields = ['Course Code', 'Title', 'Units', 'Year Level'];
  return (
    <PortalShell accent={accent}>
      {fields.map((f, i) => (
        <g key={i}>
          <text x={SIDEBAR_W + 10} y={35 + i * 26} fontSize="7" fill="#6b7280" fontFamily="sans-serif">{f}</text>
          <rect x={SIDEBAR_W + 10} y={38 + i * 26} width="200" height="14" rx="3" fill="white" stroke="#d1d5db" />
          <rect x={SIDEBAR_W + 14} y={43 + i * 26} width={40 + Math.random() * 60} height="4" rx="2" fill="#e5e7eb" />
        </g>
      ))}
      <rect x={SIDEBAR_W + 10} y="140" width="60" height="0" />
      <rect x="250" y="126" width="80" height="14" rx="7" fill={accent} />
      <rect x="261" y="131" width="58" height="4" rx="2" fill="rgba(255,255,255,0.8)" />
    </PortalShell>
  );
}

function IlluGrades({ accent }: { accent: string }) {
  const grades = [['1.25', '1.50', '2.00'], ['1.75', '1.00', '1.25'], ['2.50', '3.00', 'INC']];
  return (
    <PortalShell accent={accent}>
      <rect x={SIDEBAR_W + 4} y="27" width="282" height="11" rx="2" fill={accent} opacity="0.1" />
      {['Student', 'Subject 1', 'Subject 2', 'Subject 3'].map((h, i) => (
        <text key={i} x={SIDEBAR_W + 10 + i * 68} y="35" fontSize="7" fill="#6b7280" fontFamily="sans-serif">{h}</text>
      ))}
      {grades.map((row, ri) => (
        <g key={ri}>
          <rect x={SIDEBAR_W + 4} y={40 + ri * 28} width="282" height="26" rx="2" fill={ri % 2 === 0 ? 'white' : '#f9fafb'} stroke="#f3f4f6" />
          <text x={SIDEBAR_W + 10} y={40 + ri * 28 + 16} fontSize="8" fill="#374151" fontFamily="sans-serif">{`Student ${ri + 1}`}</text>
          {row.map((g, ci) => (
            <g key={ci}>
              <rect x={SIDEBAR_W + 78 + ci * 68} y={40 + ri * 28 + 6} width="40" height="14" rx="3"
                fill={g === 'INC' ? '#fef3c7' : parseFloat(g) > 3 ? '#fee2e2' : '#f0fdf4'} stroke={g === 'INC' ? '#fbbf24' : parseFloat(g) > 3 ? '#fca5a5' : '#86efac'} />
              <text x={SIDEBAR_W + 90 + ci * 68} y={40 + ri * 28 + 16} fontSize="8" fontWeight="700"
                fill={g === 'INC' ? '#92400e' : parseFloat(g) > 3 ? '#991b1b' : '#15803d'} fontFamily="sans-serif">{g}</text>
            </g>
          ))}
        </g>
      ))}
    </PortalShell>
  );
}

function IlluTimetable({ accent }: { accent: string }) {
  const days = ['M', 'T', 'W', 'Th', 'F'];
  const blocks = [
    { d: 0, t: 0, span: 2, label: 'MATH 101' },
    { d: 2, t: 1, span: 2, label: 'CS 201' },
    { d: 4, t: 0, span: 1, label: 'ENG 1' },
    { d: 1, t: 2, span: 2, label: 'PHYS 1' },
  ];
  const CW = 46, CH = 20, SX = SIDEBAR_W + 30, SY = 32;
  return (
    <PortalShell accent={accent}>
      {days.map((d, i) => (
        <text key={i} x={SX + i * CW + CW / 2 - 4} y={SY - 4} fontSize="7" fill="#6b7280" fontFamily="sans-serif">{d}</text>
      ))}
      {[0, 1, 2, 3].map(r => (
        <rect key={r} x={SX} y={SY + r * CH} width={CW * 5} height={CH} fill={r % 2 === 0 ? '#f9fafb' : 'white'} stroke="#f3f4f6" />
      ))}
      {blocks.map((b, i) => (
        <g key={i}>
          <rect x={SX + b.d * CW + 1} y={SY + b.t * CH + 1} width={CW - 2} height={CH * b.span - 2} rx="3" fill={accent} opacity="0.75" />
          <text x={SX + b.d * CW + CW / 2 - 12} y={SY + b.t * CH + CH / 2 + 3} fontSize="6" fill="white" fontFamily="sans-serif">{b.label}</text>
        </g>
      ))}
    </PortalShell>
  );
}

function IlluConsents({ accent }: { accent: string }) {
  const items = [
    { label: 'MATH 101 — COI', status: 'Approved', col: '#15803d', bg: '#f0fdf4' },
    { label: 'CS 201 — Dept', status: 'Pending', col: '#92400e', bg: '#fef3c7' },
    { label: 'PHYS 1 — OCS', status: 'Denied', col: '#991b1b', bg: '#fee2e2' },
    { label: 'ENG 10 — COI', status: 'Pending', col: '#92400e', bg: '#fef3c7' },
  ];
  return (
    <PortalShell accent={accent}>
      {items.map((item, i) => (
        <g key={i}>
          <rect x={SIDEBAR_W + 6} y={30 + i * 26} width="282" height="22" rx="4" fill="white" stroke="#e5e7eb" />
          <text x={SIDEBAR_W + 14} y={30 + i * 26 + 14} fontSize="8" fill="#374151" fontFamily="sans-serif">{item.label}</text>
          <rect x="290" y={30 + i * 26 + 4} width="46" height="14" rx="7" fill={item.bg} />
          <text x="293" y={30 + i * 26 + 14} fontSize="7" fill={item.col} fontFamily="sans-serif">{item.status}</text>
        </g>
      ))}
    </PortalShell>
  );
}

function IlluPlan({ accent }: { accent: string }) {
  const rows = [
    { y: '1st Year - 1st Sem', done: true },
    { y: '1st Year - 2nd Sem', done: true },
    { y: '2nd Year - 1st Sem', done: false },
    { y: '2nd Year - 2nd Sem', done: false },
  ];
  return (
    <PortalShell accent={accent}>
      {rows.map((r, i) => (
        <g key={i}>
          <text x={SIDEBAR_W + 12} y={36 + i * 26} fontSize="7" fill="#6b7280" fontFamily="sans-serif">{r.y}</text>
          <rect x={SIDEBAR_W + 8} y={38 + i * 26} width="282" height="18" rx="3" fill={r.done ? '#f0fdf4' : 'white'} stroke={r.done ? '#86efac' : '#e5e7eb'} />
          {[0, 1, 2].map(j => (
            <g key={j}>
              <rect x={SIDEBAR_W + 14 + j * 88} y={41 + i * 26} width="80" height="12" rx="3" fill={r.done ? '#dcfce7' : '#f3f4f6'} />
              <rect x={SIDEBAR_W + 18 + j * 88} y={44 + i * 26} width="40" height="6" rx="3" fill={r.done ? '#86efac' : '#d1d5db'} />
            </g>
          ))}
        </g>
      ))}
    </PortalShell>
  );
}

function IlluEvaluation({ accent }: { accent: string }) {
  const qs = ['Teaching Effectiveness', 'Subject Mastery', 'Classroom Management'];
  return (
    <PortalShell accent={accent}>
      {qs.map((q, i) => (
        <g key={i}>
          <text x={SIDEBAR_W + 10} y={36 + i * 32} fontSize="7.5" fill="#374151" fontFamily="sans-serif">{q}</text>
          {[0, 1, 2, 3, 4].map(s => (
            <g key={s}>
              <circle cx={SIDEBAR_W + 16 + s * 18} cy={46 + i * 32} r="7"
                fill={s < 4 ? accent : '#e5e7eb'} opacity={s < 4 ? (0.4 + s * 0.15) : 1} />
              <text x={SIDEBAR_W + 13 + s * 18} y={49 + i * 32} fontSize="8" fill={s < 4 ? 'white' : '#9ca3af'} fontFamily="sans-serif">★</text>
            </g>
          ))}
        </g>
      ))}
    </PortalShell>
  );
}

function IlluBanner({ accent }: { accent: string }) {
  return (
    <PortalShell accent={accent}>
      <rect x={SIDEBAR_W + 6} y="28" width="284" height="20" rx="4 4 0 0" fill={accent} opacity="0.85" />
      <rect x={SIDEBAR_W + 12} y="33" width="120" height="8" rx="3" fill="rgba(255,255,255,0.8)" />
      <rect x="286" y="30" width="70" height="16" rx="8" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" />
      <rect x="291" y="36" width="58" height="5" rx="2" fill="rgba(255,255,255,0.7)" />
      {[0, 1, 2].map(i => (
        <g key={i}>
          <rect x={SIDEBAR_W + 10} y={54 + i * 22} width="150" height="7" rx="2" fill="white" stroke="#e5e7eb" />
          <rect x={SIDEBAR_W + 14} y={57 + i * 22} width="70" height="3" rx="1" fill="#e5e7eb" />
          <rect x={SIDEBAR_W + 174} y={54 + i * 22} width="116" height="7" rx="2" fill="white" stroke="#e5e7eb" />
          <rect x={SIDEBAR_W + 178} y={57 + i * 22} width="60" height="3" rx="1" fill="#e5e7eb" />
        </g>
      ))}
      <rect x="250" y="126" width="90" height="14" rx="7" fill={accent} />
      <rect x="260" y="130" width="70" height="5" rx="2" fill="rgba(255,255,255,0.8)" />
    </PortalShell>
  );
}

function IlluProfile({ accent }: { accent: string }) {
  return (
    <PortalShell accent={accent}>
      <circle cx={SIDEBAR_W + 36} cy="65" r="24" fill={accent} opacity="0.15" />
      <circle cx={SIDEBAR_W + 36} cy="60" r="12" fill={accent} opacity="0.4" />
      <rect x={SIDEBAR_W + 18} y="80" width="36" height="6" rx="3" fill={accent} opacity="0.3" />
      {[
        { l: 'Student Number', v: '2023-XXXXX' },
        { l: 'Program', v: 'BS Computer Science' },
        { l: 'College', v: 'College of Engineering' },
        { l: 'GWA', v: '1.45 — Good Standing' },
      ].map((f, i) => (
        <g key={i}>
          <text x={SIDEBAR_W + 76} y={33 + i * 24} fontSize="7" fill="#9ca3af" fontFamily="sans-serif">{f.l}</text>
          <text x={SIDEBAR_W + 76} y={44 + i * 24} fontSize="8.5" fontWeight="600" fill="#111827" fontFamily="sans-serif">{f.v}</text>
        </g>
      ))}
    </PortalShell>
  );
}

function Illustration({ type, accent }: { type: IlluType; accent: string }) {
  if (type === 'dashboard') return <IlluDashboard accent={accent} />;
  if (type === 'table') return <IlluTable accent={accent} />;
  if (type === 'form') return <IlluForm accent={accent} />;
  if (type === 'grades') return <IlluGrades accent={accent} />;
  if (type === 'timetable') return <IlluTimetable accent={accent} />;
  if (type === 'consents') return <IlluConsents accent={accent} />;
  if (type === 'plan') return <IlluPlan accent={accent} />;
  if (type === 'evaluation') return <IlluEvaluation accent={accent} />;
  if (type === 'banner') return <IlluBanner accent={accent} />;
  return <IlluProfile accent={accent} />;
}

/* ─── Animated Flowchart ─────────────────────────────────────── */
const NODE_COLORS: Record<NodeType, { bg: string; border: string; text: string }> = {
  start:    { bg: '#1e3a8a', border: '#3b82f6', text: 'white' },
  step:     { bg: '#1e293b', border: '#475569', text: '#e2e8f0' },
  decision: { bg: '#451a03', border: '#f59e0b', text: '#fde68a' },
  success:  { bg: '#052e16', border: '#22c55e', text: '#86efac' },
  reject:   { bg: '#3f0000', border: '#ef4444', text: '#fca5a5' },
};
const NODE_SHAPES: Record<NodeType, string> = {
  start: 'pill', step: 'rect', decision: 'diamond', success: 'rect', reject: 'rect',
};

function FlowNode({ label, type, delay, accent }: { label: string; type: NodeType; delay: number; accent: string }) {
  const c = NODE_COLORS[type];
  const shape = NODE_SHAPES[type];
  const borderColor = type === 'start' ? accent : c.border;
  return (
    <div style={{
      animation: `ftNodeIn 0.45s ${delay}s both`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative',
    }}>
      <div style={{
        padding: shape === 'pill' ? '5px 18px' : '7px 14px',
        borderRadius: shape === 'pill' ? '999px' : shape === 'diamond' ? '4px' : '7px',
        transform: shape === 'diamond' ? 'rotate(45deg)' : 'none',
        backgroundColor: c.bg,
        border: `1.5px solid ${borderColor}`,
        color: c.text,
        fontSize: 11.5,
        fontWeight: 600,
        textAlign: 'center',
        boxShadow: `0 0 10px ${borderColor}44`,
        minWidth: 90,
        maxWidth: 160,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ transform: shape === 'diamond' ? 'rotate(-45deg)' : 'none', lineHeight: 1.35, fontSize: 11 }}>
          {label}
        </span>
      </div>
    </div>
  );
}

function FlowArrow({ delay, label }: { delay: number; label?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
      animation: `ftNodeIn 0.3s ${delay}s both`,
    }}>
      {label && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 1 }}>{label}</span>}
      <div style={{ width: 1.5, height: 14, backgroundColor: 'rgba(255,255,255,0.2)' }} />
      <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '5px solid rgba(255,255,255,0.3)' }} />
    </div>
  );
}

function AnimatedFlowchart({ mod, animKey }: { mod: TModule; animKey: string }) {
  return (
    <div key={animKey} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '12px 0' }}>
      {mod.flow.map((node, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <FlowNode label={node.l} type={node.t} delay={i * 0.38} accent={mod.accent} />
          {i < mod.flow.length - 1 && (
            <FlowArrow delay={i * 0.38 + 0.2} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Frame renderers ────────────────────────────────────────── */
function OverviewFrame({ mod }: { mod: TModule }) {
  return (
    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Illustration */}
      <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Illustration type={mod.illu} accent={mod.accent} />
      </div>
      {/* Steps */}
      <div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          How it works
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {mod.steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', animation: `ftNodeIn 0.4s ${i * 0.08}s both` }}>
              <div style={{
                minWidth: 22, height: 22, borderRadius: '50%',
                background: `linear-gradient(135deg, ${mod.accent} 0%, rgba(30,92,58,0.9) 100%)`,
                color: 'white', fontWeight: 800, fontSize: 11,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 7, padding: '6px 10px', color: 'rgba(255,255,255,0.85)',
                fontSize: 12.5, lineHeight: 1.5, flex: 1,
              }}>{step}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FlowchartFrame({ mod, animKey }: { mod: TModule; animKey: string }) {
  return (
    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
        Process Flowchart
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { type: 'start' as NodeType, label: 'Start' },
          { type: 'step' as NodeType, label: 'Step' },
          { type: 'decision' as NodeType, label: 'Decision' },
          { type: 'success' as NodeType, label: 'Success' },
          { type: 'reject' as NodeType, label: 'Deny' },
        ].map(({ type, label }) => {
          const c = NODE_COLORS[type];
          return (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c.bg, border: `1.5px solid ${c.border}` }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{label}</span>
            </div>
          );
        })}
      </div>
      {/* Flowchart */}
      <div style={{
        backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)',
        overflowY: 'auto', flex: 1, maxHeight: 320,
      }}>
        <AnimatedFlowchart mod={mod} animKey={animKey} />
      </div>
    </div>
  );
}

function TipsFrame({ mod }: { mod: TModule }) {
  return (
    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Warning box */}
      {mod.warn && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: 8, padding: '10px 12px',
          animation: 'ftNodeIn 0.4s 0s both',
        }}>
          <AlertTriangle size={16} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, color: '#fde68a', lineHeight: 1.55 }}>{mod.warn}</div>
        </div>
      )}

      {/* Do's and Don'ts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Do's */}
        <div style={{
          backgroundColor: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 8, padding: '10px 12px',
          animation: 'ftNodeIn 0.4s 0.1s both',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <CheckCircle size={14} style={{ color: '#22c55e' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#86efac', letterSpacing: 0.5, textTransform: 'uppercase' }}>Do's</span>
          </div>
          {mod.dos.map((d, i) => (
            <div key={i} style={{
              display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: i < mod.dos.length - 1 ? 7 : 0,
              animation: `ftNodeIn 0.35s ${0.15 + i * 0.08}s both`,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#22c55e', marginTop: 5, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{d}</span>
            </div>
          ))}
        </div>

        {/* Don'ts */}
        <div style={{
          backgroundColor: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 8, padding: '10px 12px',
          animation: 'ftNodeIn 0.4s 0.15s both',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <XCircle size={14} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fca5a5', letterSpacing: 0.5, textTransform: 'uppercase' }}>Don'ts</span>
          </div>
          {mod.donts.map((d, i) => (
            <div key={i} style={{
              display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: i < mod.donts.length - 1 ? 7 : 0,
              animation: `ftNodeIn 0.35s ${0.2 + i * 0.08}s both`,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#ef4444', marginTop: 5, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main modal ─────────────────────────────────────────────── */
const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrator', ocs: 'OCS Staff',
  faculty: 'Faculty', student: 'Student', department_head: 'Dept Head',
};

export default function VideoTutorialModal({ onClose }: { onClose: () => void }) {
  const { state } = useApp();
  const role = (state.currentUser?.role ?? 'student') as Role;
  const modules = TUTORIAL_DATA[role] ?? TUTORIAL_DATA.student;

  const [modIdx, setModIdx] = useState(0);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const frame = FRAMES[frameIdx] as FrameType;
  const duration = FRAME_DURATION[frame];
  const mod = modules[modIdx];

  const totalFrames = modules.length * FRAMES.length;
  const currentFrame = modIdx * FRAMES.length + frameIdx;

  const goNextFrame = useCallback(() => {
    setElapsed(0);
    if (frameIdx < FRAMES.length - 1) {
      setFrameIdx(f => f + 1);
    } else if (modIdx < modules.length - 1) {
      setModIdx(m => m + 1);
      setFrameIdx(0);
    } else {
      setModIdx(0); setFrameIdx(0);
    }
  }, [frameIdx, modIdx, modules.length]);

  const goPrevFrame = useCallback(() => {
    setElapsed(0);
    if (frameIdx > 0) {
      setFrameIdx(f => f - 1);
    } else if (modIdx > 0) {
      setModIdx(m => m - 1);
      setFrameIdx(FRAMES.length - 1);
    }
  }, [frameIdx, modIdx]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setElapsed(e => {
          if (e >= duration) { goNextFrame(); return 0; }
          return e + 0.1;
        });
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, goNextFrame, duration]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNextFrame();
      if (e.key === 'ArrowLeft') goPrevFrame();
      if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, goNextFrame, goPrevFrame]);

  const animKey = `${modIdx}-${frameIdx}`;

  return (
    <>
      <style>{`
        @keyframes ftNodeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .vt-sidebar::-webkit-scrollbar { width: 3px; }
        .vt-sidebar::-webkit-scrollbar-track { background: transparent; }
        .vt-sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
        .vt-content::-webkit-scrollbar { width: 4px; }
        .vt-content::-webkit-scrollbar-track { background: transparent; }
        .vt-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9998, backdropFilter: 'blur(6px)' }} />

      {/* Modal */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{
          width: '100%', maxWidth: 880, height: 600,
          backgroundColor: '#080f1a',
          borderRadius: 16, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 30px 100px rgba(0,0,0,0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>

          {/* Title bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px',
            backgroundColor: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#ef4444', cursor: 'pointer' }} onClick={onClose} />
              <div style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <div style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#22c55e' }} />
            </div>
            <Video size={12} style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 4 }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
              Video Tutorial — {ROLE_LABEL[role]}
            </span>
            <div style={{ flex: 1 }} />
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 2, display: 'flex' }}>
              <X size={13} />
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

            {/* Sidebar */}
            <div className="vt-sidebar" style={{
              width: 190, flexShrink: 0,
              backgroundColor: 'rgba(0,0,0,0.35)',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              overflowY: 'auto', padding: '6px 0',
            }}>
              {modules.map((m, i) => (
                <button key={i} onClick={() => { setModIdx(i); setFrameIdx(0); setElapsed(0); }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '8px 12px',
                    border: 'none', cursor: 'pointer',
                    backgroundColor: i === modIdx ? 'rgba(255,255,255,0.08)' : 'transparent',
                    borderLeft: `3px solid ${i === modIdx ? m.accent : 'transparent'}`,
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize: 11.5, fontWeight: i === modIdx ? 700 : 500, color: i === modIdx ? 'white' : 'rgba(255,255,255,0.4)', lineHeight: 1.35 }}>
                    {i + 1}. {m.title}
                  </div>
                  {i === modIdx && (
                    <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
                      {FRAMES.map((f, fi) => (
                        <div key={f} style={{
                          height: 3, flex: 1, borderRadius: 2,
                          backgroundColor: fi === frameIdx ? m.accent : fi < frameIdx ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                          transition: 'background-color 0.2s',
                        }} />
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Main content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

              {/* Module header + frame tabs */}
              <div style={{
                padding: '10px 16px 0', flexShrink: 0,
                background: `linear-gradient(135deg, ${mod.accent}22 0%, transparent 100%)`,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{mod.title}</div>
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{mod.sub}</div>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                    {modIdx + 1}/{modules.length}
                  </div>
                </div>
                {/* Frame tabs */}
                <div style={{ display: 'flex', gap: 2 }}>
                  {FRAMES.map((f, fi) => (
                    <button key={f} onClick={() => { setFrameIdx(fi); setElapsed(0); }}
                      style={{
                        padding: '5px 14px', border: 'none', cursor: 'pointer',
                        borderRadius: '6px 6px 0 0',
                        backgroundColor: fi === frameIdx ? 'rgba(255,255,255,0.1)' : 'transparent',
                        color: fi === frameIdx ? 'white' : 'rgba(255,255,255,0.35)',
                        fontSize: 12, fontWeight: fi === frameIdx ? 700 : 500,
                        borderBottom: fi === frameIdx ? `2px solid ${mod.accent}` : '2px solid transparent',
                        transition: 'all 0.15s',
                      }}>
                      {FRAME_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame content */}
              <div className="vt-content" key={animKey} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {frame === 'overview' && <OverviewFrame mod={mod} />}
                {frame === 'flowchart' && <FlowchartFrame mod={mod} animKey={animKey} />}
                {frame === 'tips' && <TipsFrame mod={mod} />}
              </div>

              {/* Player controls */}
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.55)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                padding: '8px 16px', flexShrink: 0,
              }}>
                {/* Progress bar (full journey) */}
                <div
                  onClick={e => {
                    const rect = (e.target as HTMLElement).closest('.vt-prog')?.getBoundingClientRect();
                    if (!rect) return;
                    const pct = (e.clientX - rect.left) / rect.width;
                    const totalF = modules.length * FRAMES.length;
                    const fi = Math.floor(pct * totalF);
                    setModIdx(Math.floor(fi / FRAMES.length));
                    setFrameIdx(fi % FRAMES.length);
                    setElapsed(0);
                  }}
                  className="vt-prog"
                  style={{
                    width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 2, marginBottom: 9, cursor: 'pointer', overflow: 'hidden',
                  }}
                >
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: `linear-gradient(90deg, ${mod.accent}, #1e5c3a)`,
                    width: `${((currentFrame + elapsed / duration) / totalFrames) * 100}%`,
                    transition: 'width 0.1s linear',
                  }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Prev */}
                  <button onClick={goPrevFrame} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'white', display: 'flex' }}>
                    <SkipBack size={13} />
                  </button>

                  {/* Play/Pause */}
                  <button onClick={() => setPlaying(p => !p)} style={{ background: mod.accent, border: 'none', borderRadius: 8, padding: '5px 14px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 11.5 }}>
                    {playing ? <Pause size={13} /> : <Play size={13} />}
                    {playing ? 'Pause' : 'Play'}
                  </button>

                  {/* Next */}
                  <button onClick={goNextFrame} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'white', display: 'flex' }}>
                    <SkipForward size={13} />
                  </button>

                  <div style={{ flex: 1 }} />

                  {/* Frame indicator */}
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {FRAMES.map((f, fi) => (
                      <div key={f} style={{
                        width: fi === frameIdx ? 20 : 6, height: 6, borderRadius: 3,
                        backgroundColor: fi === frameIdx ? mod.accent : fi < frameIdx ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)',
                        transition: 'width 0.3s, background-color 0.2s',
                      }} />
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'rgba(255,255,255,0.25)', fontSize: 10.5 }}>
                    <ChevronRight size={9} />
                    <span>{Math.ceil(duration - elapsed)}s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
