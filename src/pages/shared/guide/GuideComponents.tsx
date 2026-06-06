import React, { createContext, useContext } from 'react';
import { AlertTriangle, Info, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { TUTORIAL_DATA } from '../VideoTutorialData';
import { TIPS_FIL } from '../TipsFilData';
import type { Role } from '../../../lib/types';

/* ─── Language context ──────────────────────────────────────── */
export const LangContext = createContext<'en' | 'fil'>('en');
export const useLang = () => useContext(LangContext);
export function tx(lang: 'en' | 'fil', en: string, fil: string) {
  return lang === 'en' ? en : fil;
}

/* ─── Tips role context (set once per guide file) ───────────── */
const TipsRoleContext = createContext<Role | null>(null);
export function TipsRoleProvider({ role, children }: { role: Role; children: React.ReactNode }) {
  return <TipsRoleContext.Provider value={role}>{children}</TipsRoleContext.Provider>;
}

/* ─── Tips / Do's & Don'ts panel ───────────────────────────── */
export function TipsPanel({
  warn, dos, donts,
  warnFil, dosFil, dontsFil,
}: {
  warn?: string; dos: string[]; donts: string[];
  warnFil?: string; dosFil?: string[]; dontsFil?: string[];
}) {
  const lang = useLang();
  const displayWarn  = lang === 'fil' && warnFil  ? warnFil  : warn;
  const displayDos   = lang === 'fil' && dosFil   ? dosFil   : dos;
  const displayDonts = lang === 'fil' && dontsFil ? dontsFil : donts;
  return (
    <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Warning */}
      {displayWarn && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          backgroundColor: '#fffbeb', border: '1px solid #fcd34d',
          borderRadius: 8, padding: '10px 14px',
        }}>
          <AlertTriangle size={15} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
            <strong style={{ color: '#92400e' }}>{lang === 'fil' ? 'Babala: ' : 'Warning: '}</strong>{displayWarn}
          </div>
        </div>
      )}
      {/* Do's & Don'ts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{
          backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 8, padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <CheckCircle size={14} style={{ color: '#16a34a' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#15803d', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {lang === 'fil' ? 'Mga Dapat' : "Do's"}
            </span>
          </div>
          {displayDos.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: i < displayDos.length - 1 ? 8 : 0 }}>
              <div style={{ minWidth: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e', marginTop: 5, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#166534', lineHeight: 1.55 }}>{d}</span>
            </div>
          ))}
        </div>
        <div style={{
          backgroundColor: '#fff1f2', border: '1px solid #fecdd3',
          borderRadius: 8, padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <XCircle size={14} style={{ color: '#dc2626' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#b91c1c', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {lang === 'fil' ? 'Mga Hindi Dapat' : "Don'ts"}
            </span>
          </div>
          {displayDonts.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: i < displayDonts.length - 1 ? 8 : 0 }}>
              <div style={{ minWidth: 6, height: 6, borderRadius: '50%', backgroundColor: '#ef4444', marginTop: 5, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.55 }}>{d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Module section wrapper ────────────────────────────────── */
export function ModuleSection({
  id, navIndex = 0, title, titleFil, path, icon, children,
}: {
  id: string; navIndex?: number; title: string; titleFil: string;
  path?: string; icon?: React.ReactNode; children: React.ReactNode;
}) {
  const lang = useLang();
  const role = useContext(TipsRoleContext);
  const tips    = role !== null ? TUTORIAL_DATA[role]?.[navIndex - 1] : null;
  const tipsFil = role !== null ? TIPS_FIL[role]?.[navIndex - 1]      : null;

  return (
    <div id={id} className="page-break" style={{
      border: '1px solid #e5e7eb', borderRadius: 12,
      overflow: 'hidden', marginBottom: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* Module header bar */}
      <div style={{
        background: 'linear-gradient(135deg, #7f1d2e 0%, #1e5c3a 100%)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {icon && (
          <div style={{
            width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 15 }}>
            {lang === 'en' ? title : titleFil}
          </div>
          {path && (
            <code style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
              {path}
            </code>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: 1,
          textTransform: 'uppercase', fontWeight: 700,
        }}>
          Module {navIndex > 0 ? `#${navIndex}` : ''}
        </div>
      </div>
      {/* Content */}
      <div style={{ padding: '20px 22px', backgroundColor: 'white' }}>
        {children}
        {tips && (
          <TipsPanel
            warn={tips.warn}         dos={tips.dos}         donts={tips.donts}
            warnFil={tipsFil?.warnFil} dosFil={tipsFil?.dosFil} dontsFil={tipsFil?.dontsFil}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Two-column layout ─────────────────────────────────────── */
export function TwoCol({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

/* ─── Sub-heading ───────────────────────────────────────────── */
export function SubHead({ en, fil }: { en: string; fil: string }) {
  const lang = useLang();
  return (
    <div style={{
      fontWeight: 800, fontSize: 13, color: '#1e5c3a',
      borderLeft: '4px solid #1e5c3a', paddingLeft: 10,
      marginTop: 18, marginBottom: 10,
    }}>
      {lang === 'en' ? en : fil}
    </div>
  );
}

/* ─── Restriction callout ───────────────────────────────────── */
export function Restriction({ en, fil }: { en: string; fil: string }) {
  const lang = useLang();
  return (
    <div style={{
      display: 'flex', gap: 10, backgroundColor: '#fff7ed',
      border: '1px solid #fed7aa', borderRadius: 8,
      padding: '10px 14px', marginBottom: 14,
    }}>
      <AlertTriangle size={15} style={{ color: '#ea580c', flexShrink: 0, marginTop: 2 }} />
      <div style={{ fontSize: 12, color: '#9a3412', lineHeight: 1.55 }}>
        <strong>{lang === 'en' ? 'Restrictions: ' : 'Mga Paghihigpit: '}</strong>
        {lang === 'en' ? en : fil}
      </div>
    </div>
  );
}

/* ─── Info/tip callout ──────────────────────────────────────── */
export function InfoBox({ en, fil }: { en: string; fil: string }) {
  const lang = useLang();
  return (
    <div style={{
      display: 'flex', gap: 10, backgroundColor: '#eff6ff',
      border: '1px solid #bfdbfe', borderRadius: 8,
      padding: '10px 14px', marginBottom: 14,
    }}>
      <Info size={15} style={{ color: '#2563eb', flexShrink: 0, marginTop: 2 }} />
      <div style={{ fontSize: 12, color: '#1e3a8a', lineHeight: 1.55 }}>
        {lang === 'en' ? en : fil}
      </div>
    </div>
  );
}

/* ─── Numbered steps ────────────────────────────────────────── */
export function Steps({ items }: { items: { en: string; fil: string }[] }) {
  const lang = useLang();
  return (
    <div style={{ marginBottom: 16 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
          <div style={{
            minWidth: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7f1d2e, #1e5c3a)',
            color: 'white', fontWeight: 800, fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
          }}>{i + 1}</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, paddingTop: 3, color: '#1a1a2e' }}>
            {lang === 'en' ? item.en : item.fil}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Linear flowchart (horizontal, wrapping) ──────────────── */
export type NodeType = 'start' | 'step' | 'decision' | 'success' | 'reject' | 'end';
export interface FNode { label: { en: string; fil: string }; type: NodeType }

const NODE_STYLE: Record<NodeType, { bg: string; border: string; text: string; radius: number | string }> = {
  start:    { bg: '#7f1d2e', border: '#7f1d2e', text: 'white', radius: 20 },
  step:     { bg: '#f8fafc', border: '#94a3b8', text: '#1e293b', radius: 6 },
  decision: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', radius: 4 },
  success:  { bg: '#f0fdf4', border: '#22c55e', text: '#166534', radius: 6 },
  reject:   { bg: '#fff1f2', border: '#f43f5e', text: '#9f1239', radius: 6 },
  end:      { bg: '#1e5c3a', border: '#1e5c3a', text: 'white', radius: 20 },
};

export function FlowChart({ nodes }: { nodes: FNode[] }) {
  const lang = useLang();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4,
      padding: '14px', backgroundColor: '#f8fafc', borderRadius: 8,
      border: '1px solid #e2e8f0', marginBottom: 16,
    }}>
      {nodes.map((node, i) => {
        const s = NODE_STYLE[node.type];
        const isDec = node.type === 'decision';
        return (
          <React.Fragment key={i}>
            <div style={{
              padding: '7px 13px',
              backgroundColor: s.bg, border: `2px solid ${s.border}`,
              color: s.text, fontSize: 11, fontWeight: 700,
              borderRadius: s.radius, textAlign: 'center',
              minWidth: 72, lineHeight: 1.35,
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
            }}>
              {isDec ? '◆ ' : ''}{node.label[lang]}
            </div>
            {i < nodes.length - 1 && (
              <ChevronRight size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Branch flowchart (decision → yes/no outcomes) ─────────── */
export function BranchFlow({
  trigger, condition, yes, no,
  yesLabel = { en: 'Yes', fil: 'Oo' },
  noLabel  = { en: 'No',  fil: 'Hindi' },
}: {
  trigger:  { en: string; fil: string };
  condition: { en: string; fil: string };
  yes:      { en: string; fil: string };
  no:       { en: string; fil: string };
  yesLabel?: { en: string; fil: string };
  noLabel?:  { en: string; fil: string };
}) {
  const lang = useLang();
  return (
    <div style={{
      padding: '16px', backgroundColor: '#f8fafc', borderRadius: 8,
      border: '1px solid #e2e8f0', marginBottom: 16,
    }}>
      {/* Trigger */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <div style={{
          padding: '7px 18px', backgroundColor: '#7f1d2e', color: 'white',
          borderRadius: 20, fontSize: 11, fontWeight: 700,
        }}>
          {trigger[lang]}
        </div>
      </div>
      {/* Arrow down */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <div style={{ width: 2, height: 14, backgroundColor: '#94a3b8' }} />
      </div>
      {/* Decision diamond */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <div style={{
          padding: '7px 16px', backgroundColor: '#eff6ff',
          border: '2px solid #3b82f6', color: '#1e40af',
          borderRadius: 4, fontSize: 11, fontWeight: 700,
        }}>
          ◆ {condition[lang]}
        </div>
      </div>
      {/* Branches */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginTop: 4 }}>
        {/* YES branch */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 130 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 40, height: 2, backgroundColor: '#22c55e' }} />
            <span style={{ fontSize: 10, color: '#15803d', fontWeight: 800 }}>{yesLabel[lang]}</span>
          </div>
          <div style={{ width: 2, height: 10, backgroundColor: '#22c55e' }} />
          <div style={{
            padding: '7px 12px', backgroundColor: '#f0fdf4',
            border: '2px solid #22c55e', color: '#166534',
            borderRadius: 6, fontSize: 11, fontWeight: 700, textAlign: 'center',
          }}>
            {yes[lang]}
          </div>
        </div>
        {/* NO branch */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 130 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: '#be123c', fontWeight: 800 }}>{noLabel[lang]}</span>
            <div style={{ width: 40, height: 2, backgroundColor: '#f43f5e' }} />
          </div>
          <div style={{ width: 2, height: 10, backgroundColor: '#f43f5e' }} />
          <div style={{
            padding: '7px 12px', backgroundColor: '#fff1f2',
            border: '2px solid #f43f5e', color: '#9f1239',
            borderRadius: 6, fontSize: 11, fontWeight: 700, textAlign: 'center',
          }}>
            {no[lang]}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Portal illustration frame ─────────────────────────────── */
export function PortalIllustration({
  activeNavIndex = 0,
  title,
  children,
}: {
  activeNavIndex?: number;
  title: string;
  children?: React.ReactNode;
}) {
  const NAV_Y = [18, 36, 54, 72, 90, 108, 126, 144];
  return (
    <div style={{ marginBottom: 16 }}>
      <svg
        viewBox="0 0 380 200"
        style={{ width: '100%', maxWidth: 380, height: 200, borderRadius: 8, border: '1px solid #e5e7eb', display: 'block' }}
      >
        {/* Background */}
        <rect width="380" height="200" fill="#f1f5f9" rx="8" />
        {/* Sidebar */}
        <rect width="72" height="200" fill="#6d1728" rx="8 0 0 8" />
        {/* Logo area */}
        <circle cx="36" cy="14" r="8" fill="rgba(255,255,255,0.2)" />
        {/* Nav items */}
        {NAV_Y.map((y, i) => (
          <rect
            key={i} x="8" y={y + 16} width="56" height="10" rx="5"
            fill={i === activeNavIndex ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.18)'}
          />
        ))}
        {/* Content pane */}
        <rect x="78" y="6" width="296" height="188" fill="white" rx="6" />
        {/* Top bar */}
        <rect x="78" y="6" width="296" height="30" fill="#7f1d2e" rx="6 6 0 0" />
        <rect x="88" y="16" width="100" height="10" rx="5" fill="rgba(255,255,255,0.75)" />
        <rect x="338" y="12" width="28" height="18" rx="9" fill="rgba(255,255,255,0.15)" />
        {/* Module content slot */}
        {children}
        {/* Bottom label */}
        <text x="374" y="196" fontSize="8" fill="#9ca3af" textAnchor="end" fontFamily="sans-serif">
          {title}
        </text>
      </svg>
    </div>
  );
}

/* ─── Illustration helpers ──────────────────────────────────── */

/** 4 stat cards (Dashboard style) */
export function IllusCards() {
  return (
    <>
      {[0, 1, 2, 3].map(i => (
        <g key={i}>
          <rect x={86 + i * 72} y="46" width="64" height="44" rx="5" fill="white" stroke="#e5e7eb" />
          <rect x={94 + i * 72} y="54" width="36" height="7" rx="3" fill={i % 2 === 0 ? '#7f1d2e' : '#1e5c3a'} opacity="0.4" />
          <rect x={94 + i * 72} y="67" width="24" height="12" rx="3" fill={i % 2 === 0 ? '#7f1d2e' : '#1e5c3a'} opacity="0.7" />
        </g>
      ))}
      <rect x="86" y="102" width="284" height="38" rx="5" fill="white" stroke="#e5e7eb" />
      {[0, 1, 2, 3, 4].map(i => (
        <g key={i}>
          <rect x={94 + i * 56} y="110" width="44" height="7" rx="3" fill="#e5e7eb" />
          <rect x={94 + i * 56} y="123" width={20 + i * 8} height="8" rx="3" fill="#7f1d2e" opacity={0.4 + i * 0.1} />
        </g>
      ))}
      <rect x="86" y="150" width="284" height="30" rx="5" fill="white" stroke="#e5e7eb" />
      {[0, 1, 2].map(i => (
        <rect key={i} x={94 + i * 96} y="160" width="80" height="8" rx="3" fill="#e5e7eb" />
      ))}
    </>
  );
}

/** Table with rows */
export function IllusTable({ rows = 4, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <>
      {/* Header row */}
      <rect x="86" y="44" width="284" height="20" rx="4 4 0 0" fill="#7f1d2e" opacity="0.85" />
      {Array.from({ length: cols }).map((_, c) => (
        <rect key={c} x={94 + c * (260 / cols)} y="50" width={240 / cols - 8} height="8" rx="3" fill="rgba(255,255,255,0.7)" />
      ))}
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <g key={r}>
          <rect x="86" y={64 + r * 22} width="284" height="20" fill={r % 2 === 0 ? 'white' : '#f9fafb'} stroke="#e5e7eb" />
          {Array.from({ length: cols }).map((_, c) => (
            <rect key={c} x={94 + c * (260 / cols)} y={70 + r * 22} width={c === cols - 1 ? 32 : 240 / cols - 12} height="8" rx="3"
              fill={c === cols - 1 ? '#1e5c3a' : '#d1d5db'} opacity={c === cols - 1 ? 0.7 : 1} />
          ))}
        </g>
      ))}
      {/* Add button */}
      <rect x="314" y="156" width="52" height="20" rx="10" fill="#7f1d2e" />
      <rect x="322" y="163" width="36" height="6" rx="3" fill="rgba(255,255,255,0.8)" />
    </>
  );
}

/** Form fields */
export function IllusForm({ fields = 5 }: { fields?: number }) {
  return (
    <>
      {Array.from({ length: fields }).map((_, i) => (
        <g key={i}>
          <rect x="88" y={44 + i * 24} width={i % 2 === 0 ? 70 : 55} height="7" rx="3" fill="#d1d5db" />
          <rect x="88" y={54 + i * 24} width="280" height="13" rx="4" fill="white" stroke="#e5e7eb" />
          <rect x="94" y={57 + i * 24} width={80 + (i * 20)} height="7" rx="3" fill="#9ca3af" opacity="0.5" />
        </g>
      ))}
      <rect x="88" y={44 + fields * 24 + 4} width="70" height="20" rx="10" fill="#7f1d2e" />
      <rect x="96" y={50 + fields * 24 + 4} width="54" height="8" rx="3" fill="rgba(255,255,255,0.8)" />
    </>
  );
}

/** Grade grid */
export function IllusGradeGrid() {
  const grades = ['1.0', '1.5', '2.0', '1.75', '1.25', '2.25', '1.5', '2.5'];
  return (
    <>
      <rect x="86" y="44" width="284" height="18" rx="4 4 0 0" fill="#7f1d2e" opacity="0.85" />
      {['Student', 'Midterm', 'Final', 'Grade'].map((h, i) => (
        <text key={i} x={96 + i * 68} y="57" fontSize="7" fill="white" fontFamily="sans-serif" fontWeight="bold">{h}</text>
      ))}
      {grades.map((g, i) => (
        <g key={i}>
          <rect x="86" y={62 + i * 16} width="284" height="14" fill={i % 2 === 0 ? 'white' : '#f9fafb'} stroke="#e5e7eb" />
          <rect x="94" y={65 + i * 16} width="50" height="8" rx="3" fill="#d1d5db" />
          <text x="166" y={72 + i * 16} fontSize="8" fill="#374151" fontFamily="sans-serif" textAnchor="middle">—</text>
          <text x="236" y={72 + i * 16} fontSize="8" fill="#374151" fontFamily="sans-serif" textAnchor="middle">—</text>
          <rect x="264" y={65 + i * 16} width="28" height="8" rx="3" fill="#1e5c3a" opacity="0.5" />
        </g>
      ))}
      <rect x="310" y="168" width="56" height="18" rx="9" fill="#1e5c3a" />
      <rect x="318" y="174" width="40" height="6" rx="3" fill="rgba(255,255,255,0.8)" />
    </>
  );
}

/** Weekly timetable */
export function IllusTimetable() {
  const days = ['M', 'T', 'W', 'Th', 'F', 'S'];
  const classes = [
    { col: 0, row: 0, h: 2, color: '#7f1d2e' },
    { col: 1, row: 1, h: 1, color: '#1e5c3a' },
    { col: 2, row: 0, h: 2, color: '#7f1d2e' },
    { col: 3, row: 2, h: 1, color: '#1e3a8a' },
    { col: 4, row: 0, h: 2, color: '#7f1d2e' },
    { col: 0, row: 2, h: 1, color: '#1e5c3a' },
  ];
  const CW = 44, CH = 22, startX = 96, startY = 54;
  return (
    <>
      {/* Header row */}
      <rect x="86" y="44" width="284" height="18" rx="4 4 0 0" fill="#7f1d2e" opacity="0.85" />
      {days.map((d, i) => (
        <text key={i} x={startX + i * CW + CW / 2} y="57" fontSize="8" fill="white" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">{d}</text>
      ))}
      {/* Grid lines */}
      {[0, 1, 2, 3].map(r => (
        <rect key={r} x="86" y={startY + r * CH} width="284" height={CH} fill={r % 2 === 0 ? '#f9fafb' : 'white'} stroke="#e5e7eb" />
      ))}
      {/* Class blocks */}
      {classes.map((c, i) => (
        <rect
          key={i}
          x={startX + c.col * CW + 2}
          y={startY + c.row * CH + 2}
          width={CW - 4}
          height={c.h * CH - 4}
          rx="3"
          fill={c.color}
          opacity="0.75"
        />
      ))}
    </>
  );
}

/** Consent / status list */
export function IllusConsentList() {
  const statuses = [
    { color: '#f59e0b', label: 'Pending' },
    { color: '#22c55e', label: 'Approved' },
    { color: '#f43f5e', label: 'Denied' },
    { color: '#f59e0b', label: 'Pending' },
  ];
  return (
    <>
      <rect x="86" y="44" width="284" height="18" rx="4 4 0 0" fill="#7f1d2e" opacity="0.85" />
      <rect x="94" y="50" width="80" height="7" rx="3" fill="rgba(255,255,255,0.7)" />
      {statuses.map((s, i) => (
        <g key={i}>
          <rect x="86" y={62 + i * 28} width="284" height="22" fill={i % 2 === 0 ? 'white' : '#f9fafb'} stroke="#e5e7eb" />
          <circle cx="100" cy={73 + i * 28} r="7" fill={s.color} opacity="0.3" />
          <rect x="112" y={67 + i * 28} width="100" height="7" rx="3" fill="#d1d5db" />
          <rect x="112" y={77 + i * 28} width="60" height="6" rx="3" fill="#e5e7eb" />
          <rect x="302" y={70 + i * 28} width="58" height="14" rx="7" fill={s.color} opacity="0.2" stroke={s.color} strokeWidth="1" />
          <rect x="310" y={74 + i * 28} width="40" height="6" rx="3" fill={s.color} opacity="0.6" />
        </g>
      ))}
    </>
  );
}

/** Plan of study checklist */
export function IllusPlanOfStudy() {
  const items = [
    { done: true, pct: 100 },
    { done: true, pct: 100 },
    { done: false, pct: 60 },
    { done: false, pct: 30 },
    { done: false, pct: 0 },
  ];
  return (
    <>
      <rect x="86" y="44" width="284" height="18" rx="4 4 0 0" fill="#7f1d2e" opacity="0.85" />
      <rect x="94" y="50" width="100" height="7" rx="3" fill="rgba(255,255,255,0.7)" />
      {items.map((item, i) => (
        <g key={i}>
          <rect x="86" y={64 + i * 24} width="284" height="20" fill={i % 2 === 0 ? 'white' : '#f9fafb'} stroke="#e5e7eb" />
          <circle cx="100" cy={74 + i * 24} r="8" fill={item.done ? '#1e5c3a' : 'white'} stroke={item.done ? '#1e5c3a' : '#d1d5db'} />
          {item.done && <text x="100" y={77 + i * 24} fontSize="8" fill="white" textAnchor="middle" fontFamily="sans-serif">✓</text>}
          <rect x="114" y={70 + i * 24} width="120" height="7" rx="3" fill="#d1d5db" />
          <rect x="240" y={70 + i * 24} width="100" height="6" rx="3" fill="#e5e7eb" />
          <rect x="240" y={70 + i * 24} width={item.pct} height="6" rx="3" fill={item.pct === 100 ? '#1e5c3a' : '#7f1d2e'} opacity="0.5" />
        </g>
      ))}
    </>
  );
}

/** Star rating rows (evaluation) */
export function IllusEvaluation() {
  const rows = [4.5, 3.8, 4.2, 4.7, 3.5];
  return (
    <>
      <rect x="86" y="44" width="284" height="18" rx="4 4 0 0" fill="#7f1d2e" opacity="0.85" />
      <rect x="94" y="50" width="100" height="7" rx="3" fill="rgba(255,255,255,0.7)" />
      {rows.map((r, i) => (
        <g key={i}>
          <rect x="86" y={64 + i * 24} width="284" height="20" fill={i % 2 === 0 ? 'white' : '#f9fafb'} stroke="#e5e7eb" />
          <rect x="94" y={70 + i * 24} width="100" height="7" rx="3" fill="#d1d5db" />
          {[0, 1, 2, 3, 4].map(s => (
            <text key={s} x={208 + s * 16} y={75 + i * 24} fontSize="11" fill={s < Math.floor(r) ? '#fbbf24' : '#e5e7eb'} fontFamily="sans-serif">★</text>
          ))}
          <text x="296" y={75 + i * 24} fontSize="9" fill="#374151" fontFamily="sans-serif">{r}</text>
        </g>
      ))}
    </>
  );
}

/** Banner / formal request form illustration */
export function IllusBannerRequest({
  requestType = 'Appeal',
  badge = '#7f1d2e',
}: {
  requestType?: string;
  badge?: string;
}) {
  return (
    <>
      {/* Top bar already provided by PortalIllustration */}
      {/* Request type badge */}
      <rect x="86" y="44" width="284" height="22" rx="4 4 0 0" fill={badge} opacity="0.88" />
      <rect x="94" y="51" width={Math.min(requestType.length * 5.8, 180)} height="8" rx="3" fill="rgba(255,255,255,0.8)" />
      <rect x={280} y="51" width="80" height="8" rx="10" fill="rgba(255,255,255,0.25)" />

      {/* Status pill */}
      <rect x="300" y="48" width="62" height="16" rx="8" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.45)" />
      <rect x="308" y="53" width="42" height="6" rx="3" fill="rgba(255,255,255,0.7)" />

      {/* Form fields */}
      {[0, 1, 2].map(i => (
        <g key={i}>
          <rect x="86" y={74 + i * 26} width={55 + i * 10} height="6" rx="3" fill="#d1d5db" />
          <rect x="86" y={84 + i * 26} width="284" height="12" rx="3" fill="white" stroke="#e5e7eb" />
          <rect x="92" y={87 + i * 26} width={90 + i * 25} height="6" rx="3" fill="#9ca3af" opacity="0.5" />
        </g>
      ))}

      {/* Reason textarea */}
      <rect x="86" y="162" width="284" height="24" rx="3" fill="white" stroke="#e5e7eb" />
      <rect x="92" y="167" width="200" height="6" rx="3" fill="#9ca3af" opacity="0.4" />
      <rect x="92" y="176" width="140" height="6" rx="3" fill="#9ca3af" opacity="0.25" />

      {/* Submit button */}
      <rect x="86" y="148" width="80" height="10" rx="3" fill="#d1d5db" opacity="0.6" />
      {/* (submit button at bottom) */}
      <rect x="286" y="148" width="84" height="14" rx="7" fill={badge} />
      <rect x="296" y="152" width="64" height="6" rx="3" fill="rgba(255,255,255,0.8)" />
    </>
  );
}

/** Section role header banner */
export function RoleBanner({ en, fil, color = '#7f1d2e' }: { en: string; fil: string; color?: string }) {
  const lang = useLang();
  return (
    <div className="page-break" style={{
      background: `linear-gradient(135deg, ${color} 0%, #1e5c3a 100%)`,
      color: 'white', borderRadius: 12, padding: '20px 26px',
      marginTop: 32, marginBottom: 24,
    }}>
      <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0.3 }}>
        {lang === 'en' ? en : fil}
      </div>
      <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
        {lang === 'en' ? 'Module-by-Module Guide' : 'Gabay sa Bawat Module'}
      </div>
    </div>
  );
}
