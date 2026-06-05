import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, ChevronRight, Video } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { Role } from '../../lib/types';

/* ─── Slide data types ───────────────────────────────────────── */
interface Slide {
  title: string;
  subtitle: string;
  steps: string[];
  accent: string;
  icon: string;
}

/* ─── Role slide decks ───────────────────────────────────────── */
const SLIDES: Record<Role, Slide[]> = {
  admin: [
    {
      title: 'Dashboard',
      subtitle: 'Overview of system-wide statistics and term controls.',
      steps: ['Log in as Admin.', 'View total counts: students, faculty, courses, sections.', 'Check Active Term and system control statuses.', 'Scroll for enrollment progress bars per section.'],
      accent: '#7f1d2e', icon: '📊',
    },
    {
      title: 'Dashboard Content',
      subtitle: 'Edit portal-wide announcements shown to all users.',
      steps: ['Click Dashboard Content in the sidebar.', 'Edit the announcement text.', 'Toggle visibility per role.', 'Click Save Changes — live immediately.'],
      accent: '#1e5c3a', icon: '📝',
    },
    {
      title: 'Term Control',
      subtitle: 'Create and activate academic terms; open/close control windows.',
      steps: ['Go to Term Control → Add Term.', 'Enter name, academic year, and date range.', 'Click Set Active to make it the running term.', 'Open control windows: Enlistment, Enrollment, Grade Submission, Evaluation, Prerogative.'],
      accent: '#7f1d2e', icon: '📅',
    },
    {
      title: 'User Management',
      subtitle: 'Add, edit, and manage all portal user accounts.',
      steps: ['Click Add User and fill in Last Name, First Name, Middle Name, Extension.', 'Enter username, email, password, and role.', 'Fill in college, department, program as applicable.', 'For bulk creation, use Import CSV with the provided template.'],
      accent: '#1e5c3a', icon: '👥',
    },
    {
      title: 'Report Cards',
      subtitle: 'View and print student report cards per term.',
      steps: ['Go to Report Cards.', 'Select the academic term.', 'Filter by college, department, or program.', 'Click a student to view and print their report card.'],
      accent: '#7f1d2e', icon: '📄',
    },
    {
      title: 'Academic Units',
      subtitle: 'Manage colleges, departments, and degree programs.',
      steps: ['First add Colleges, then Departments linked to colleges.', 'Finally add Programs linked to departments.', 'Edit or delete using action icons in each row.', 'All units must exist before adding users with those assignments.'],
      accent: '#1e5c3a', icon: '🏛️',
    },
    {
      title: 'Rooms',
      subtitle: 'Add and manage classrooms and laboratories.',
      steps: ['Click Add Room.', 'Enter room name/code and seating capacity.', 'Select type: Lecture, Laboratory, or Special.', 'Click Save — available immediately for OCS section scheduling.'],
      accent: '#7f1d2e', icon: '🚪',
    },
    {
      title: 'Password Tickets',
      subtitle: 'Review and resolve user password reset requests.',
      steps: ['Go to Password Tickets to see open tickets.', 'Click a ticket and verify the user\'s identity answer.', 'Click Resolve and enter a temporary password.', 'Inform the user to change their password on next login.'],
      accent: '#1e5c3a', icon: '🔑',
    },
    {
      title: 'Graduation Settings',
      subtitle: 'Set GWA thresholds, required units, and honors bands.',
      steps: ['Go to Graduation Settings.', 'Set minimum GWA for graduation eligibility.', 'Set required total units to graduate.', 'Configure Summa, Magna, Cum Laude GWA bands. Click Save.'],
      accent: '#7f1d2e', icon: '🎓',
    },
    {
      title: 'Portal Settings',
      subtitle: 'Customize the portal name, logo, and global feature flags.',
      steps: ['Go to Portal Settings.', 'Enter Portal Name, Institution Name, and Tagline.', 'Upload a Logo image.', 'Toggle global features and click Save Settings.'],
      accent: '#1e5c3a', icon: '⚙️',
    },
  ],

  ocs: [
    {
      title: 'Dashboard',
      subtitle: 'Overview of your college\'s courses, sections, and consents.',
      steps: ['Log in as OCS. View college stats.', 'Check Active Term Sections for enrollment progress.', 'Review Pending OCS Consents and act promptly.', 'Welcome message and announcements appear at the top.'],
      accent: '#1e5c3a', icon: '📊',
    },
    {
      title: 'Course Overview',
      subtitle: 'Monitor all sections and enrollment in the active term.',
      steps: ['Go to Course Overview for a read-only view.', 'Use search to filter by course code, title, or faculty.', 'View enrollment count vs. capacity per section.', 'Click a section to see enrolled students.'],
      accent: '#7f1d2e', icon: '📋',
    },
    {
      title: 'Courses',
      subtitle: 'Add and manage courses for your college.',
      steps: ['Click Add Course.', 'Fill in code, type, title, units, year level.', 'Set consent flags: COI, Dept Consent, OCS Consent.', 'Add prerequisites and corequisites. Click Save.'],
      accent: '#1e5c3a', icon: '📚',
    },
    {
      title: 'Sections',
      subtitle: 'Create sections for the active term.',
      steps: ['An active term must exist first.', 'Click Add Section → select the course.', 'Assign faculty, set schedule (days/time/room) and slots.', 'Click Save — section is now available for enlistment.'],
      accent: '#7f1d2e', icon: '🗂️',
    },
    {
      title: 'OCS Consents',
      subtitle: 'Review and decide on OCS consent requests.',
      steps: ['Go to OCS Consents to see pending requests.', 'Click a request to view student details and reason.', 'Click Approve to allow enlistment, or Deny with a reason.', 'Student is notified via My Consents.'],
      accent: '#1e5c3a', icon: '✅',
    },
    {
      title: 'Students',
      subtitle: 'View academic records of students in your college.',
      steps: ['Go to Students. Search by name or student number.', 'Click a student to open their academic record.', 'View enrollment history, GWA, grades per term, plan of study.', 'Export TOR or grade summary as needed.'],
      accent: '#7f1d2e', icon: '👤',
    },
    {
      title: 'Grade & Enrollment',
      subtitle: 'Override grades and manually manage enrollment.',
      steps: ['Select a term and section.', 'To override a grade: click the grade cell, enter new grade, save with justification.', 'To enroll manually: Add Enrollment → search student → select section.', 'To drop: find enrollment → click Drop → confirm.'],
      accent: '#1e5c3a', icon: '📝',
    },
    {
      title: 'Plan of Study',
      subtitle: 'Configure required courses per degree program.',
      steps: ['Select a Degree Program.', 'Add required courses for each year level and semester.', 'Mark each course as required or elective.', 'Students now track progress against this plan.'],
      accent: '#7f1d2e', icon: '📋',
    },
    {
      title: 'Specialization',
      subtitle: 'Review and decide on student specialization applications.',
      steps: ['Go to Specialization to see pending applications.', 'Click a request to see proposed track and course plan.', 'Review against program requirements.', 'Approve or Deny with remarks.'],
      accent: '#1e5c3a', icon: '🎯',
    },
    {
      title: 'Graduation Applications',
      subtitle: 'Process student graduation applications.',
      steps: ['Go to Graduation Applications.', 'Click an application to review GWA, units, course completion.', 'Verify eligibility against Graduation Settings.', 'Click Approve or Deny with remarks.'],
      accent: '#7f1d2e', icon: '🎓',
    },
    {
      title: 'Reconsideration',
      subtitle: 'Handle student grade appeal requests.',
      steps: ['Go to Reconsideration. View pending requests.', 'Click a request to read the student\'s reason for appeal.', 'Coordinate with the faculty for clarification if needed.', 'Approve (update grade) or Deny with reason.'],
      accent: '#1e5c3a', icon: '🔄',
    },
    {
      title: 'Change & Drop',
      subtitle: 'Process change-section and drop-subject requests.',
      steps: ['Go to Change & Drop. View pending requests.', 'For Change: verify new section slot availability.', 'For Drop: confirm the window is open.', 'Approve → enrollment updated; Deny with reason if needed.'],
      accent: '#7f1d2e', icon: '🔀',
    },
    {
      title: 'Appeal to Enlist (PD)',
      subtitle: 'Review appeals from permanently disqualified students.',
      steps: ['Go to Banner Requests → PD Appeal queue.', 'Review grounds, history, and attached documents.', 'Consult Dean/Registrar per institutional policy.', 'Approve (manually enroll) or Deny with documented reason.'],
      accent: '#1e5c3a', icon: '📨',
    },
    {
      title: 'Request for Late Enrollment',
      subtitle: 'Process late enrollment requests within the late window.',
      steps: ['Go to Banner Requests → Late Enrollment queue.', 'Verify stated reason and supporting documents.', 'Confirm requested sections have available slots.', 'Approve (enroll + note late fee) or Deny with reason.'],
      accent: '#7f1d2e', icon: '⏰',
    },
    {
      title: 'Change / Add / Drop (DRP)',
      subtitle: 'Process formal change, add, and drop subject requests.',
      steps: ['Go to Banner Requests → Change/Add/Drop queue.', 'Identify type: Change, Add, or Drop.', 'Verify slot availability and window status.', 'Approve → enrollment updated; a DRP grade is recorded for drops.'],
      accent: '#1e5c3a', icon: '📑',
    },
  ],

  faculty: [
    {
      title: 'Dashboard',
      subtitle: 'Your teaching overview for the active term.',
      steps: ['Log in as Faculty.', 'View stats: active sections, total students, evaluation rating, grades submitted.', 'Check My Classes panel for assigned sections.', 'Review Student Evaluations panel for this term\'s summary.'],
      accent: '#1d4ed8', icon: '📊',
    },
    {
      title: 'My Classes',
      subtitle: 'View your assigned class rosters this term.',
      steps: ['Go to My Classes.', 'Click on a section to see the full roster.', 'View student names, student numbers, and enrollment status.', 'Use Export to download the class list as CSV.'],
      accent: '#7f1d2e', icon: '👩‍🏫',
    },
    {
      title: 'My Timetable',
      subtitle: 'Weekly teaching schedule for the active term.',
      steps: ['Go to My Timetable.', 'View weekly grid from Monday to Saturday.', 'Colored blocks show your sections at their assigned time/day.', 'Click a block to see course code, section, room, and student count.'],
      accent: '#1d4ed8', icon: '📅',
    },
    {
      title: 'Grade Encoding',
      subtitle: 'Encode and submit grades when the submission window is open.',
      steps: ['Verify the Grade Submission window is open (check Dashboard).', 'Select the section to grade.', 'Enter grades: 1.0–3.0, 5.0, INC, DRP, S, U.', 'Review carefully, then click Submit Grades and confirm.'],
      accent: '#7f1d2e', icon: '📝',
    },
    {
      title: 'Prerogatives',
      subtitle: 'Approve or deny student prerogative requests for your sections.',
      steps: ['Go to Prerogatives when the window is open.', 'Click a request to view student details and reason.', 'Check if the section still has available slots.', 'Click Approve to enroll or Deny if the section is full.'],
      accent: '#1d4ed8', icon: '🔓',
    },
    {
      title: 'Consents (COI)',
      subtitle: 'Review Consent of Instructor requests for your courses.',
      steps: ['Go to Consents. View pending COI requests.', 'Click a request to see the student\'s name and reason.', 'Click Approve to allow enlistment.', 'Click Deny with a reason if not appropriate.'],
      accent: '#7f1d2e', icon: '✅',
    },
    {
      title: 'Removal / Completion',
      subtitle: 'Resolve INC (Incomplete) grades when the window opens.',
      steps: ['The removal/completion window must be open.', 'Find the student with an INC grade.', 'Enter the removal exam or completion grade.', 'Click Save — system computes and records the final grade.'],
      accent: '#1d4ed8', icon: '🔄',
    },
    {
      title: 'Student Evaluations',
      subtitle: 'View aggregated evaluation scores from your students.',
      steps: ['Results are visible only after the FIC window closes.', 'Select the term from the dropdown.', 'View overall average rating and per-question averages.', 'Check response rate and per-section breakdown.'],
      accent: '#7f1d2e', icon: '⭐',
    },
  ],

  student: [
    {
      title: 'Dashboard',
      subtitle: 'Your personal academic overview for the active term.',
      steps: ['Log in as a student.', 'View enrolled subjects, pending evaluations, GWA, and pending consents.', 'Check Current Enrollment list for your official subjects.', 'Check Grade Status notice to know if grades are viewable.'],
      accent: '#92400e', icon: '📊',
    },
    {
      title: 'Enlistment',
      subtitle: 'Enlist in course sections when the window is open.',
      steps: ['Wait for the Enlistment window to open (check Dashboard).', 'Browse sections — filter by department, code, or time.', 'Obtain required consents (COI/Dept/OCS) via My Consents first.', 'Add sections to cart, check for conflicts, then click Submit Enlistment.'],
      accent: '#7f1d2e', icon: '📋',
    },
    {
      title: 'Prerogatives',
      subtitle: 'Request enrollment in full or restricted sections.',
      steps: ['Go to Prerogatives when the window is open.', 'Search for the target section.', 'Click Request Prerogative and enter your reason.', 'Wait for faculty decision — track status here.'],
      accent: '#92400e', icon: '🔓',
    },
    {
      title: 'My Consents',
      subtitle: 'Request and track COI, Dept, and OCS consents.',
      steps: ['Go to My Consents to see all requests and statuses.', 'Click Request Consent — select section and consent type.', 'COI goes to Faculty, Dept goes to Dept Head, OCS goes to OCS.', 'Once Approved, proceed to Enlistment to enlist.'],
      accent: '#7f1d2e', icon: '✅',
    },
    {
      title: 'My Grades',
      subtitle: 'View your grades after completing all faculty evaluations.',
      steps: ['Complete ALL faculty evaluations (SET module) first.', 'Go to My Grades — grades unlock after evaluations AND admin release.', 'Select the term from the dropdown.', 'View grades, term GWA, and cumulative GWA.'],
      accent: '#92400e', icon: '📝',
    },
    {
      title: 'Plan of Study',
      subtitle: 'Track your degree program progress course by course.',
      steps: ['Go to Plan of Study.', 'View required courses organized by year level and semester.', 'Green checkmarks = passed; yellow = in progress.', 'When all requirements are met, use Apply for Graduation.'],
      accent: '#7f1d2e', icon: '📋',
    },
    {
      title: 'Specialization',
      subtitle: 'Apply for a degree track or specialization.',
      steps: ['Go to Specialization — available if your program has tracks.', 'Click the track you want and review its required courses.', 'Select your planned specialization courses.', 'Click Apply — OCS will review and notify you.'],
      accent: '#92400e', icon: '🎯',
    },
    {
      title: 'SET — Faculty Evaluation',
      subtitle: 'Evaluate your faculty to unlock your grades.',
      steps: ['Go to SET when the FIC window is open.', 'Click each faculty member to open their evaluation form.', 'Rate all questions (1–5) and add optional comments.', 'Submit each form — once all are done, your grades are unlocked.'],
      accent: '#7f1d2e', icon: '⭐',
    },
    {
      title: 'My Profile',
      subtitle: 'View your personal and academic information.',
      steps: ['Go to My Profile.', 'View name, student number, program, college, and year level.', 'Check academic standing: GWA, units completed, status.', 'For corrections, contact Admin. Change password here if needed.'],
      accent: '#92400e', icon: '👤',
    },
    {
      title: 'Appeal to Enlist (PD)',
      subtitle: 'Submit a formal appeal if you have a Permanent Disqualification.',
      steps: ['Go to Banner Requests → Appeal to Enlist with PD.', 'Fill in student number, name, term, and grounds for appeal.', 'Attach all supporting documents.', 'Submit — OCS will review and notify you of the decision.'],
      accent: '#7f1d2e', icon: '📨',
    },
    {
      title: 'Request for Late Enrollment',
      subtitle: 'Request enrollment after the regular window has closed.',
      steps: ['Go to Banner Requests → Request for Late Enrollment.', 'Enter your name, term, intended load, and reason for lateness.', 'Upload supporting documents (medical cert, emergency letter, etc.).', 'Submit — OCS reviews; if approved, they process your enrollment.'],
      accent: '#92400e', icon: '⏰',
    },
    {
      title: 'Change / Add / Drop (DRP)',
      subtitle: 'Request to change sections, add subjects, or drop subjects.',
      steps: ['Go to Banner Requests → Change/Add/Drop (window must be open).', 'Select request type: Change section, Add subject, or Drop subject.', 'Fill in the relevant details and reason.', 'Submit — OCS will review and update your enrollment.'],
      accent: '#7f1d2e', icon: '📑',
    },
  ],

  department_head: [
    {
      title: 'Dashboard',
      subtitle: 'Overview of your department\'s consents, courses, and sections.',
      steps: ['Log in as Department Head.', 'View stats: pending consents, active sections, department courses.', 'A yellow alert appears if consent requests are pending — act promptly.', 'Use Quick Action buttons for fast navigation.'],
      accent: '#6b21a8', icon: '📊',
    },
    {
      title: 'Dept Consent',
      subtitle: 'Approve or deny dept consent requests for your courses.',
      steps: ['Go to Dept Consent. See all pending requests.', 'Click a request: view student name, course, section, and reason.', 'Verify the student meets departmental requirements.', 'Approve (student can enlist) or Deny with reason.'],
      accent: '#7f1d2e', icon: '✅',
    },
    {
      title: 'Sections',
      subtitle: 'Monitor sections for your department\'s courses (view only).',
      steps: ['Go to Sections.', 'View all sections for your department\'s courses this term.', 'Check schedule, faculty assignment, and enrollment per section.', 'Contact OCS directly for any scheduling changes needed.'],
      accent: '#6b21a8', icon: '🗂️',
    },
    {
      title: 'Courses',
      subtitle: 'Add and manage courses for your department.',
      steps: ['Click Add Course.', 'Fill in code, type, title, units, year level, and consent flags.', 'Add prerequisites and corequisites if applicable.', 'Click Save — OCS can now add sections for this course.'],
      accent: '#7f1d2e', icon: '📚',
    },
  ],
};

/* ─── Slide renderer ─────────────────────────────────────────── */
function SlideView({ slide, index, total }: { slide: Slide; index: number; total: number }) {
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      animation: 'slideIn 0.35s cubic-bezier(0.4,0,0.2,1)',
    }}>
      {/* Slide header */}
      <div style={{
        background: `linear-gradient(135deg, ${slide.accent} 0%, rgba(30,92,58,0.9) 100%)`,
        padding: '22px 28px 18px', flexShrink: 0, position: 'relative',
      }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 4, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
          Module {index + 1} of {total}
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1.2 }}>
          {slide.title}
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', marginTop: 5, lineHeight: 1.5 }}>
          {slide.subtitle}
        </div>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 4, marginTop: 14, flexWrap: 'wrap' }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              width: i === index ? 20 : 6, height: 6, borderRadius: 3,
              backgroundColor: i === index ? 'white' : 'rgba(255,255,255,0.25)',
              transition: 'width 0.3s',
            }} />
          ))}
        </div>
      </div>

      {/* Steps area */}
      <div style={{ flex: 1, padding: '22px 28px', overflowY: 'auto', backgroundColor: '#0f172a' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>
          Step-by-step
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {slide.steps.map((step, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              animation: `fadeUp 0.4s ${i * 0.07}s both`,
            }}>
              <div style={{
                minWidth: 26, height: 26, borderRadius: '50%',
                background: `linear-gradient(135deg, ${slide.accent}, rgba(30,92,58,0.9))`,
                color: 'white', fontWeight: 800, fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
              }}>{i + 1}</div>
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '8px 12px',
                color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 1.55, flex: 1,
              }}>
                {step}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main modal ─────────────────────────────────────────────── */
export default function VideoTutorialModal({ onClose }: { onClose: () => void }) {
  const { state } = useApp();
  const role = (state.currentUser?.role ?? 'student') as Role;
  const slides = SLIDES[role] ?? SLIDES.student;

  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const SLIDE_DURATION = 8; // seconds per slide
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goNext = useCallback(() => {
    setCurrent(c => (c + 1) % slides.length);
    setElapsed(0);
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrent(c => (c - 1 + slides.length) % slides.length);
    setElapsed(0);
  }, [slides.length]);

  // Auto-advance timer
  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setElapsed(e => {
          if (e >= SLIDE_DURATION) {
            goNext();
            return 0;
          }
          return e + 0.1;
        });
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, goNext]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, goNext, goPrev]);

  const slide = slides[current];

  const ROLE_LABEL: Record<Role, string> = {
    admin: 'System Administrator',
    ocs: 'OCS Staff',
    faculty: 'Faculty Member',
    student: 'Student',
    department_head: 'Department Head',
  };

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(18px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tutorial-sidebar::-webkit-scrollbar { width: 4px; }
        .tutorial-sidebar::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); }
        .tutorial-sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
          zIndex: 9998, backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}>
        <div style={{
          width: '100%', maxWidth: 820, height: 580,
          backgroundColor: '#0f172a',
          borderRadius: 16, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 80px rgba(0,0,0,0.7)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>

          {/* ── Title bar ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px',
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0,
          }}>
            {/* Traffic light dots */}
            <div style={{ display: 'flex', gap: 6, marginRight: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444', cursor: 'pointer' }} onClick={onClose} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#22c55e' }} />
            </div>
            <Video size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
              Video Tutorial — {ROLE_LABEL[role]}
            </span>
            <div style={{ flex: 1 }} />
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.4)', padding: 4, display: 'flex', alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* ── Body: sidebar + main ── */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

            {/* Sidebar — module list */}
            <div
              className="tutorial-sidebar"
              style={{
                width: 200, flexShrink: 0,
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRight: '1px solid rgba(255,255,255,0.07)',
                overflowY: 'auto', padding: '8px 0',
              }}
            >
              {slides.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrent(i); setElapsed(0); }}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '9px 14px', border: 'none', cursor: 'pointer',
                    backgroundColor: i === current ? 'rgba(255,255,255,0.1)' : 'transparent',
                    borderLeft: `3px solid ${i === current ? s.accent : 'transparent'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    fontSize: 11.5, fontWeight: i === current ? 700 : 500,
                    color: i === current ? 'white' : 'rgba(255,255,255,0.45)',
                    lineHeight: 1.35,
                  }}>
                    {i + 1}. {s.title}
                  </div>
                </button>
              ))}
            </div>

            {/* Main slide area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <SlideView key={current} slide={slide} index={current} total={slides.length} />
              </div>

              {/* ── Player controls ── */}
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                padding: '10px 20px',
                flexShrink: 0,
              }}>
                {/* Seek/progress bar */}
                <div
                  style={{
                    width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.12)',
                    borderRadius: 2, marginBottom: 10, cursor: 'pointer', overflow: 'hidden',
                  }}
                  onClick={e => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    const newSlide = Math.floor(pct * slides.length);
                    setCurrent(Math.max(0, Math.min(slides.length - 1, newSlide)));
                    setElapsed(0);
                  }}
                >
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: `linear-gradient(90deg, ${slide.accent}, #1e5c3a)`,
                    width: `${((current + elapsed / SLIDE_DURATION) / slides.length) * 100}%`,
                    transition: 'width 0.1s linear',
                  }} />
                </div>

                {/* Buttons row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={goPrev} style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: 'white',
                    display: 'flex', alignItems: 'center',
                  }}>
                    <SkipBack size={14} />
                  </button>

                  <button
                    onClick={() => setPlaying(p => !p)}
                    style={{
                      background: slide.accent, border: 'none',
                      borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                      color: 'white', display: 'flex', alignItems: 'center', gap: 6,
                      fontWeight: 700, fontSize: 12,
                    }}
                  >
                    {playing ? <Pause size={14} /> : <Play size={14} />}
                    {playing ? 'Pause' : 'Play'}
                  </button>

                  <button onClick={goNext} style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: 'white',
                    display: 'flex', alignItems: 'center',
                  }}>
                    <SkipForward size={14} />
                  </button>

                  <div style={{ flex: 1 }} />

                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    {current + 1} / {slides.length}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                    <ChevronRight size={10} />
                    <span>next in {Math.ceil(SLIDE_DURATION - elapsed)}s</span>
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
