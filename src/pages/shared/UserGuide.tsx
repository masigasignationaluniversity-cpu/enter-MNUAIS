import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Printer, ArrowLeft, Languages } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useApp } from '../../contexts/AppContext';
import type { Role } from '../../lib/types';

import { LangContext, RoleBanner } from './guide/GuideComponents';
import AdminGuide from './guide/AdminGuide';
import OCSGuide from './guide/OCSGuide';
import FacultyGuide from './guide/FacultyGuide';
import StudentGuide from './guide/StudentGuide';
import DeptHeadGuide from './guide/DeptHeadGuide';

/* ─────────────────────────────────────────────────────────────
   Role metadata
───────────────────────────────────────────────────────────── */

const ROLE_META: Record<Role, {
  label: { en: string; fil: string };
  color: string;
  modules: { en: string; fil: string }[];
}> = {
  admin: {
    label: { en: 'System Administrator', fil: 'System Administrator' },
    color: '#7f1d2e',
    modules: [
      { en: 'Dashboard', fil: 'Dashboard' },
      { en: 'Dashboard Content', fil: 'Nilalaman ng Dashboard' },
      { en: 'Term Control', fil: 'Kontrol ng Termino' },
      { en: 'User Management', fil: 'Pamamahala ng mga Gumagamit' },
      { en: 'Report Cards', fil: 'Mga Report Card' },
      { en: 'Academic Units', fil: 'Mga Akademikong Unit' },
      { en: 'Rooms', fil: 'Mga Silid' },
      { en: 'Password Tickets', fil: 'Mga Password Ticket' },
      { en: 'Graduation Settings', fil: 'Mga Setting ng Graduation' },
      { en: 'Portal Settings', fil: 'Mga Setting ng Portal' },
    ],
  },
  ocs: {
    label: { en: 'OCS Staff', fil: 'Kawani ng OCS' },
    color: '#1e5c3a',
    modules: [
      { en: 'Dashboard', fil: 'Dashboard' },
      { en: 'Course Overview', fil: 'Pangkalahatang-tanaw ng Kurso' },
      { en: 'Courses', fil: 'Mga Kurso' },
      { en: 'Sections', fil: 'Mga Seksiyon' },
      { en: 'OCS Consents', fil: 'Mga OCS Consent' },
      { en: 'Students', fil: 'Mga Estudyante' },
      { en: 'Grade & Enrollment', fil: 'Grado at Enrollment' },
      { en: 'Plan of Study', fil: 'Plano ng Pag-aaral' },
      { en: 'Specialization', fil: 'Espesyalisasyon' },
      { en: 'Graduation Applications', fil: 'Mga Aplikasyon sa Graduation' },
      { en: 'Reconsideration', fil: 'Muling Pagsasaalang-alang' },
      { en: 'Change & Drop', fil: 'Pagpapalit at Pag-drop' },
    ],
  },
  faculty: {
    label: { en: 'Faculty Member', fil: 'Miyembro ng Guro' },
    color: '#1d4ed8',
    modules: [
      { en: 'Dashboard', fil: 'Dashboard' },
      { en: 'My Classes', fil: 'Aking mga Klase' },
      { en: 'My Timetable', fil: 'Aking Iskedyul' },
      { en: 'Grade Encoding', fil: 'Pag-encode ng Grado' },
      { en: 'Prerogatives', fil: 'Mga Prerogative' },
      { en: 'Consents (COI)', fil: 'Mga Consent (COI)' },
      { en: 'Removal / Completion', fil: 'Removal / Completion' },
      { en: 'Student Evaluations', fil: 'Mga Ebalwasyon ng Estudyante' },
    ],
  },
  student: {
    label: { en: 'Student', fil: 'Estudyante' },
    color: '#92400e',
    modules: [
      { en: 'Dashboard', fil: 'Dashboard' },
      { en: 'Enlistment', fil: 'Enlistment' },
      { en: 'Prerogatives', fil: 'Mga Prerogative' },
      { en: 'My Consents', fil: 'Aking mga Consent' },
      { en: 'My Grades', fil: 'Aking mga Grado' },
      { en: 'Plan of Study', fil: 'Plano ng Pag-aaral' },
      { en: 'Specialization', fil: 'Espesyalisasyon' },
      { en: 'SET — Faculty Evaluation', fil: 'SET — Ebalwasyon ng Guro' },
      { en: 'My Profile', fil: 'Aking Profile' },
    ],
  },
  department_head: {
    label: { en: 'Department Head', fil: 'Pinuno ng Departamento' },
    color: '#6b21a8',
    modules: [
      { en: 'Dashboard', fil: 'Dashboard' },
      { en: 'Dept Consent', fil: 'Dept Consent' },
      { en: 'Sections', fil: 'Mga Seksiyon' },
      { en: 'Courses', fil: 'Mga Kurso' },
    ],
  },
};

const GUIDE_CONTENT: Record<Role, React.ComponentType> = {
  admin: AdminGuide,
  ocs: OCSGuide,
  faculty: FacultyGuide,
  student: StudentGuide,
  department_head: DeptHeadGuide,
};

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */

export default function UserGuide() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [lang, setLang] = useState<'en' | 'fil'>('en');

  const user = state.currentUser;
  const ps = state.portalSettings;
  const role = (user?.role ?? 'student') as Role;
  const meta = ROLE_META[role];
  const GuideContent = GUIDE_CONTENT[role] ?? StudentGuide;

  const today = new Date().toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <LangContext.Provider value={lang}>
      {/* ── Print & page CSS ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .guide-wrap { max-width: 100% !important; padding: 0 !important; }
          body { margin: 0; background: white; -webkit-print-color-adjust: exact; color-adjust: exact; }
          .page-break { break-before: page; }
          @page { size: A4; margin: 1.2cm 1.5cm; }
        }
        @media screen {
          .guide-wrap { max-width: 900px; margin: 0 auto; padding: 24px 20px 80px; }
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Sticky toolbar (screen only) ── */}
      <div className="no-print" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'hsl(var(--sidebar-background))',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
        flexWrap: 'wrap',
      }}>
        <Button variant="ghost" size="sm"
          className="text-white/80 hover:text-white hover:bg-white/10 gap-1.5 flex-shrink-0"
          onClick={() => navigate(-1)}>
          <ArrowLeft size={14} />
          {lang === 'en' ? 'Back' : 'Bumalik'}
        </Button>

        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>|</span>

        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600 }}>
          {lang === 'en' ? 'User Guide' : 'Gabay ng Gumagamit'} — {meta.label[lang]}
        </span>

        <div style={{ flex: 1 }} />

        {/* Language toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderRadius: 8, padding: 3, border: '1px solid rgba(255,255,255,0.15)',
        }}>
          <button
            onClick={() => setLang('en')}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', border: 'none',
              backgroundColor: lang === 'en' ? 'white' : 'transparent',
              color: lang === 'en' ? '#7f1d2e' : 'rgba(255,255,255,0.65)',
              transition: 'all 0.15s',
            }}
          >EN</button>
          <button
            onClick={() => setLang('fil')}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', border: 'none',
              backgroundColor: lang === 'fil' ? 'white' : 'transparent',
              color: lang === 'fil' ? '#7f1d2e' : 'rgba(255,255,255,0.65)',
              transition: 'all 0.15s',
            }}
          >FIL</button>
        </div>

        <Button size="sm"
          className="gap-1.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 flex-shrink-0"
          onClick={() => window.print()}>
          <Printer size={13} />
          {lang === 'en' ? 'Print / Save PDF' : 'I-print / I-save bilang PDF'}
        </Button>
      </div>

      {/* ── Guide body ── */}
      <div className="guide-wrap" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: '#1a1a2e', lineHeight: 1.6 }}>

        {/* ══ COVER PAGE ══════════════════════════════════════════ */}
        <div style={{
          background: 'linear-gradient(135deg, hsl(348 58% 24%) 0%, hsl(158 46% 24%) 100%)',
          borderRadius: 14, padding: '40px 40px 36px', marginBottom: 32, color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 22, flexWrap: 'wrap' }}>
            {/* Logo */}
            <div style={{
              width: 88, height: 88, borderRadius: '50%', flexShrink: 0,
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '3px solid rgba(255,255,255,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {ps.logoUrl
                ? <img src={ps.logoUrl} alt="Logo" crossOrigin="anonymous"
                    style={{ width: 82, height: 82, borderRadius: '50%', objectFit: 'cover' }} />
                : <GraduationCap size={40} style={{ color: 'rgba(255,255,255,0.9)' }} />
              }
            </div>

            {/* Title block */}
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.15 }}>
                {ps.portalName || 'University AIS'}
              </div>
              {ps.institutionName && (
                <div style={{ fontSize: 13, opacity: 0.78, marginTop: 3 }}>{ps.institutionName}</div>
              )}
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{
                  backgroundColor: meta.color, padding: '4px 14px',
                  borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: '1.5px solid rgba(255,255,255,0.35)',
                }}>
                  {meta.label[lang]}
                </span>
                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  {lang === 'en' ? 'Portal User Guide' : 'Gabay ng Gumagamit ng Portal'}
                </span>
              </div>
            </div>

            {/* Right block */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {user && <div style={{ fontSize: 13, opacity: 0.75 }}>{user.name}</div>}
              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{today}</div>
              <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>
                {lang === 'en' ? 'Language: English' : 'Wika: Filipino'}
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{
            marginTop: 24, padding: '14px 18px',
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: 10, fontSize: 12.5, lineHeight: 1.65,
          }}>
            {lang === 'en'
              ? <>This guide covers all <strong>{meta.modules.length} modules</strong> available to you as a <strong>{meta.label.en}</strong>. Each section includes step-by-step instructions, access restrictions, a process flowchart, and a UI illustration. Use the <strong>Print / Save PDF</strong> button above to download a copy.</>
              : <>Ang gabay na ito ay sumasaklaw sa lahat ng <strong>{meta.modules.length} module</strong> na available sa inyo bilang isang <strong>{meta.label.fil}</strong>. Ang bawat seksyon ay may kasamang step-by-step na mga instruksyon, mga paghihigpit sa access, daloy ng proseso, at ilustrasyon ng UI. Gamitin ang pindutang <strong>I-print / I-save bilang PDF</strong> sa itaas para mag-download ng kopya.</>
            }
          </div>

          {/* Module index */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, opacity: 0.65, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
              {lang === 'en' ? 'Modules in this guide' : 'Mga Module sa gabay na ito'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {meta.modules.map((m, i) => (
                <span key={i} style={{
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  padding: '3px 10px', borderRadius: 14, fontSize: 11, fontWeight: 600,
                }}>
                  {i + 1}. {m[lang]}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ══ ROLE BANNER ══════════════════════════════════════════ */}
        <RoleBanner
          en={`${meta.label.en} — All Modules`}
          fil={`${meta.label.fil} — Lahat ng Module`}
          color={meta.color}
        />

        {/* ══ GUIDE CONTENT ════════════════════════════════════════ */}
        <GuideContent />

        {/* ══ GENERAL TIPS ════════════════════════════════════════ */}
        <div className="page-break" style={{
          border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden',
          marginBottom: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #374151, #1f2937)',
            padding: '14px 20px',
          }}>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 15 }}>
              {lang === 'en' ? 'General Tips & Support' : 'Pangkalahatang Mga Tip at Suporta'}
            </div>
          </div>
          <div style={{ padding: '20px 22px', backgroundColor: 'white' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {[
                {
                  en: { t: 'Forgot Password', b: 'Click "Forgot password?" on the login page, enter your username, verify identity, then bring the ticket number to the Admin.' },
                  fil: { t: 'Nakalimutan ang Password', b: 'I-click ang "Forgot password?" sa login page, ilagay ang inyong username, i-verify ang pagkakakilanlan, pagkatapos ay dalhin ang ticket number sa Admin.' },
                },
                {
                  en: { t: 'Session Timeout', b: 'You are logged out after inactivity. Save work before stepping away. Log back in to resume.' },
                  fil: { t: 'Session Timeout', b: 'Nilo-logout ka pagkatapos ng kawalan ng aktibidad. I-save ang trabaho bago umalis. Mag-login ulit para magpatuloy.' },
                },
                {
                  en: { t: 'Data Scope', b: 'You only see data relevant to your role and assigned college/department. This is by design.' },
                  fil: { t: 'Saklaw ng Datos', b: 'Nakikita mo lamang ang datos na may kaugnayan sa inyong tungkulin at itinalagang kolehiyo/departamento. Ito ay sadyang disenyo.' },
                },
                {
                  en: { t: 'Navigation', b: 'Use the left sidebar to move between modules. Collapse it with the toggle button for more screen space.' },
                  fil: { t: 'Pag-navigate', b: 'Gamitin ang kaliwang sidebar para lumipat sa pagitan ng mga module. I-collapse ito gamit ang toggle button para sa mas malaking espasyo.' },
                },
              ].map((item, i) => (
                <div key={i} style={{
                  backgroundColor: '#f8fafc', borderRadius: 8, padding: '12px 14px',
                  border: '1px solid #e5e7eb',
                }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: '#7f1d2e', marginBottom: 6 }}>
                    {lang === 'en' ? item.en.t : item.fil.t}
                  </div>
                  <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.55 }}>
                    {lang === 'en' ? item.en.b : item.fil.b}
                  </div>
                </div>
              ))}
            </div>

            {/* Contact info */}
            <div style={{
              backgroundColor: '#fdf8ff', border: '1px solid #e9d5ff',
              borderRadius: 8, padding: '14px 18px', fontSize: 12.5,
            }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#6b21a8', marginBottom: 10 }}>
                {lang === 'en' ? 'Who to Contact' : 'Sino ang Dapat Makipag-ugnayan'}
              </div>
              {[
                {
                  en: { who: 'System Admin', for: 'Account issues, password resets, portal settings, user creation.' },
                  fil: { who: 'System Admin', for: 'Mga isyu sa account, pag-reset ng password, mga setting ng portal, paglikha ng gumagamit.' },
                },
                {
                  en: { who: 'OCS', for: 'Enrollment concerns, grade questions, section schedules, plan of study, graduation.' },
                  fil: { who: 'OCS', for: 'Mga alalahanin sa enrollment, mga tanong sa grado, iskedyul ng seksiyon, plano ng pag-aaral, graduation.' },
                },
                {
                  en: { who: 'Faculty', for: 'COI requests for their courses, grade concerns before submission.' },
                  fil: { who: 'Guro', for: 'Mga kahilingan sa COI para sa kanilang mga kurso, mga alalahanin sa grado bago isumite.' },
                },
                {
                  en: { who: 'Department Head', for: 'Dept Consent approvals for department-restricted courses.' },
                  fil: { who: 'Pinuno ng Departamento', for: 'Mga pag-apruba ng Dept Consent para sa mga kursong naka-restrict sa departamento.' },
                },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                  <span style={{
                    backgroundColor: '#6b21a8', color: 'white',
                    padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                    flexShrink: 0, marginTop: 2,
                  }}>
                    {lang === 'en' ? row.en.who : row.fil.who}
                  </span>
                  <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                    {lang === 'en' ? row.en.for : row.fil.for}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 32, paddingTop: 16, borderTop: '2px solid #e5e7eb',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          flexWrap: 'wrap', gap: 8,
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#7f1d2e' }}>
              {ps.portalName || 'University AIS'}
            </div>
            {ps.institutionName && (
              <div style={{ fontSize: 11, color: '#6b7280' }}>{ps.institutionName}</div>
            )}
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af' }}>
            <div>{lang === 'en' ? 'User Guide' : 'Gabay ng Gumagamit'} — {meta.label[lang]}</div>
            <div>{lang === 'en' ? `Generated: ${today}` : `Nagawa: ${today}`}</div>
          </div>
        </div>

      </div>
    </LangContext.Provider>
  );
}
