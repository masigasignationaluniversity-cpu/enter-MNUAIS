import { useApp } from '../../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Printer, ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { Role } from '../../lib/types';

/* ─────────────────────────────────────────────────────────────
   Reusable mini-components for the guide layout
───────────────────────────────────────────────────────────── */

function Box({ children, color = '#7f1d2e' }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{
      padding: '8px 14px', borderRadius: 8, fontSize: 11.5,
      border: `2px solid ${color}`, backgroundColor: color + '18',
      color: '#1a1a2e', fontWeight: 600, textAlign: 'center', minWidth: 90, lineHeight: 1.35,
    }}>
      {children}
    </div>
  );
}

function Arrow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', color: '#7f1d2e', flexShrink: 0 }}>
      <div style={{ width: 24, height: 2, backgroundColor: '#7f1d2e' }} />
      <ChevronRight size={14} style={{ marginLeft: -6 }} />
    </div>
  );
}

function FlowRow({ steps, color }: { steps: string[]; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, margin: '8px 0' }}>
      {steps.map((s, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Box color={color}>{s}</Box>
          {i < steps.length - 1 && <Arrow />}
        </span>
      ))}
    </div>
  );
}

function SectionHeader({ title, subtitle, color = '#7f1d2e' }: { title: string; subtitle?: string; color?: string }) {
  return (
    <div style={{
      backgroundColor: color, color: 'white', padding: '10px 18px',
      borderRadius: 8, marginTop: 28, marginBottom: 12,
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4,
    }}>
      <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: 0.3 }}>{title}</span>
      {subtitle && <span style={{ fontSize: 11, opacity: 0.85, fontStyle: 'italic' }}>{subtitle}</span>}
    </div>
  );
}

function FeatureTable({ rows }: { rows: { feature: string; en: string; fil: string }[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, marginBottom: 8 }}>
      <thead>
        <tr style={{ backgroundColor: '#f5f5f5' }}>
          <th style={thStyle}>Feature / Tampok</th>
          <th style={thStyle}>What it does (English)</th>
          <th style={thStyle}>Paliwanag (Filipino)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
            <td style={{ ...tdStyle, fontWeight: 700, color: '#7f1d2e' }}>{r.feature}</td>
            <td style={tdStyle}>{r.en}</td>
            <td style={{ ...tdStyle, color: '#1e5c3a' }}>{r.fil}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const thStyle: React.CSSProperties = {
  padding: '7px 10px', border: '1px solid #e0e0e0',
  textAlign: 'left', fontWeight: 700, fontSize: 11,
};
const tdStyle: React.CSSProperties = {
  padding: '6px 10px', border: '1px solid #e5e5e5',
  verticalAlign: 'top', lineHeight: 1.5,
};

function Step({ n, en, fil }: { n: number; en: string; fil: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
      <div style={{
        minWidth: 24, height: 24, borderRadius: '50%', backgroundColor: '#7f1d2e',
        color: 'white', fontWeight: 800, fontSize: 12, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
      }}>{n}</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 12, color: '#1a1a1a' }}>{en}</div>
        <div style={{ fontSize: 11.5, color: '#1e5c3a', marginTop: 1 }}>{fil}</div>
      </div>
    </div>
  );
}

function Tip({ en, fil }: { en: string; fil: string }) {
  return (
    <div style={{
      backgroundColor: '#fffbeb', border: '1px solid #fbbf24',
      borderRadius: 7, padding: '8px 12px', marginBottom: 8, fontSize: 11.5,
    }}>
      <span style={{ fontWeight: 700, color: '#92400e' }}>Tip: </span>
      <span style={{ color: '#78350f' }}>{en}</span>
      <span style={{ color: '#065f46' }}> / {fil}</span>
    </div>
  );
}

function Note({ en, fil }: { en: string; fil: string }) {
  return (
    <div style={{
      backgroundColor: '#eff6ff', border: '1px solid #93c5fd',
      borderRadius: 7, padding: '8px 12px', marginBottom: 8, fontSize: 11.5,
    }}>
      <span style={{ fontWeight: 700, color: '#1e40af' }}>Note: </span>
      <span style={{ color: '#1e3a8a' }}>{en}</span>
      <span style={{ color: '#065f46' }}> / {fil}</span>
    </div>
  );
}

function SubHead({ en, fil }: { en: string; fil: string }) {
  return (
    <div style={{
      borderLeft: '4px solid #1e5c3a', paddingLeft: 10,
      marginTop: 18, marginBottom: 8,
    }}>
      <span style={{ fontWeight: 800, fontSize: 12.5, color: '#1e5c3a' }}>{en}</span>
      <span style={{ fontSize: 11.5, color: '#7f1d2e', marginLeft: 6, fontStyle: 'italic' }}>/ {fil}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Role-specific guide content
───────────────────────────────────────────────────────────── */

function AdminGuide() {
  const sec = '#1e5c3a';
  return (
    <>
      <SectionHeader title="Quick Start  /  Mabilis na Simula" subtitle="Complete these steps to set up the portal" color="#7f1d2e" />
      <Step n={1} en="Go to Portal Settings — set your institution name, portal name, and logo." fil="Pumunta sa Portal Settings — itakda ang pangalan ng institusyon, portal, at logo." />
      <Step n={2} en="Go to Academic Units — add Colleges, Departments, and Degree Programs." fil="Pumunta sa Academic Units — magdagdag ng Kolehiyo, Departamento, at Programa." />
      <Step n={3} en="Go to Rooms — add all classrooms and laboratories your institution uses." fil="Pumunta sa Rooms — idagdag ang lahat ng silid-aralan at laboratoryo." />
      <Step n={4} en="Go to Term Control — create a new academic term and activate it." fil="Pumunta sa Term Control — gumawa ng bagong akademikong termino at i-activate ito." />
      <Step n={5} en="Go to User Management — import or manually add students, faculty, and OCS staff." fil="Pumunta sa User Management — mag-import o manu-manong magdagdag ng mga estudyante, guro, at kawani." />
      <Step n={6} en="In Term Control, enable Enlistment and other controls when ready." fil="Sa Term Control, i-enable ang Enlistment at iba pang kontrol kung handa na." />

      <SubHead en="Setup Workflow" fil="Daloy ng Pag-set Up" />
      <FlowRow steps={['Portal Settings', 'Academic Units', 'Rooms', 'Term Control', 'Add Users', 'Enable Controls']} color="#7f1d2e" />

      <SectionHeader title="Feature Reference  /  Gabay sa Tampok" color={sec} />
      <FeatureTable rows={[
        { feature: 'Dashboard', en: 'Overview of active term stats: students, faculty, sections, enrollment.', fil: 'Pangkalahatang-tanaw ng aktibong termino: bilang ng estudyante, guro, seksiyon, at enrolled.' },
        { feature: 'Term Control', en: 'Create and manage academic terms. Set enlistment, enrollment, grade submission, and evaluation windows. Configure per-term deadlines.', fil: 'Gumawa at pamahalaan ang mga akademikong termino. Itakda ang mga window para sa enlistment, enrollment, pagsusumite ng grado, at ebalwasyon.' },
        { feature: 'User Management', en: 'Add, edit, and deactivate user accounts. Import bulk users via CSV. Manage roles (admin, OCS, faculty, student, dept head).', fil: 'Magdagdag, mag-edit, at mag-deactivate ng mga user account. Mag-import ng maraming user gamit ang CSV. Pamahalaan ang mga tungkulin.' },
        { feature: 'Report Cards', en: 'Generate and review student grade report cards per term.', fil: 'Gumawa at suriin ang mga report card ng estudyante bawat termino.' },
        { feature: 'Academic Units', en: 'Manage Colleges, Departments, and Degree Programs. Link them to OCS staff and faculty.', fil: 'Pamahalaan ang mga Kolehiyo, Departamento, at Programa. I-link sa mga OCS staff at guro.' },
        { feature: 'Rooms', en: 'Add and manage classrooms and labs used for scheduling sections.', fil: 'Magdagdag at pamahalaan ang mga silid-aralan at laboratoryo para sa iskedyul ng mga seksiyon.' },
        { feature: 'Password Tickets', en: 'Review and approve password reset requests submitted by users. Generate temporary passwords.', fil: 'Suriin at aprubahan ang mga kahilingan para sa pag-reset ng password. Gumawa ng pansamantalang password.' },
        { feature: 'Graduation Settings', en: 'Configure graduation eligibility: minimum GWA, required units, honors thresholds.', fil: 'I-configure ang mga kinakailangan para sa graduation: minimum GWA, required na units, pamantayan sa karangalan.' },
        { feature: 'Portal Settings', en: 'Customize portal name, tagline, institution name, logo, and system-wide feature flags.', fil: 'I-customize ang pangalan ng portal, tagline, institusyon, logo, at mga system-wide na feature.' },
        { feature: 'Dashboard Content', en: 'Edit announcements and welcome messages displayed on all user dashboards.', fil: 'I-edit ang mga anunsyo at mensahe ng pagbati na ipinapakita sa lahat ng dashboard.' },
      ]} />

      <SectionHeader title="CSV Import Format  /  Format ng CSV Import" color="#7f1d2e" />
      <p style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>
        When importing users via CSV, the file must have these required columns / Kapag nag-iimport ng mga user sa pamamagitan ng CSV, kailangan ang mga column na ito:
      </p>
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, marginBottom: 8 }}>
        <strong>Required:</strong> lastname, firstname, username, password<br />
        <strong>Optional:</strong> middlename, extension, email, role, studentNumber, employeeId, college, department, program<br />
        <strong>Roles:</strong> student | faculty | ocs | admin | department_head<br />
        <strong>Example row:</strong> dela Cruz,Juan,Santos,Jr.,jdelacruz,Pass123!,juan@uni.edu,student,2024-10001,,College of Forestry,,BS Forestry
      </div>
      <Note en="The 'name' column is still accepted for backward compatibility." fil="Ang lumang 'name' column ay tinatanggap pa rin para sa compatibility." />
      <Tip en="Download the CSV template from User Management → Import CSV → Download Template." fil="I-download ang CSV template mula sa User Management → Import CSV → Download Template." />

      <SectionHeader title="Term Controls Explained  /  Paliwanag sa Term Controls" color={sec} />
      <FeatureTable rows={[
        { feature: 'Enlistment Open', en: 'Students can add sections to their cart and submit for enlistment.', fil: 'Maaaring magdagdag ang mga estudyante ng mga seksiyon at magsumite para sa enlistment.' },
        { feature: 'Enrollment Open', en: 'OCS can officially enroll students. Generates official enrollment record.', fil: 'Maaaring opisyal na mag-enroll ang OCS ng mga estudyante.' },
        { feature: 'Grade Submission', en: 'Faculty can encode and submit final grades for their sections.', fil: 'Maaaring mag-encode at magsumite ng mga panghuling grado ang mga guro.' },
        { feature: 'FIC Evaluation', en: 'Students can submit their Faculty-in-Charge evaluation (SET).', fil: 'Maaaring isumite ng mga estudyante ang kanilang ebalwasyon ng guro (SET).' },
        { feature: 'Prerogative Open', en: 'Students can request special enrollment (prerogative) outside regular enlistment.', fil: 'Maaaring humingi ng espesyal na enrollment ang mga estudyante (prerogative).' },
      ]} />

      <Tip en="Always set term dates (enlistment from/until, grading window) before opening any control." fil="Itakda lagi ang mga petsa ng termino bago buksan ang anumang kontrol." />
    </>
  );
}

function OCSGuide() {
  const sec = '#1e5c3a';
  return (
    <>
      <SectionHeader title="Quick Start  /  Mabilis na Simula" subtitle="OCS workflow per term" color="#7f1d2e" />
      <Step n={1} en="Ensure the Admin has activated an academic term." fil="Tiyakin na nag-activate ang Admin ng akademikong termino." />
      <Step n={2} en="Go to Courses — add all courses offered by your college/department." fil="Pumunta sa Courses — magdagdag ng lahat ng kursong inaalok ng inyong kolehiyo/departamento." />
      <Step n={3} en="Go to Sections — create sections for each course, assign faculty, set schedules and slots." fil="Pumunta sa Sections — gumawa ng mga seksiyon para sa bawat kurso, mag-assign ng guro, itakda ang iskedyul at bilang ng slot." />
      <Step n={4} en="When enlistment is open, monitor student activity and review OCS Consent requests." fil="Kapag bukas ang enlistment, bantayan ang aktibidad ng mga estudyante at suriin ang mga kahilingan sa OCS Consent." />
      <Step n={5} en="After enlistment, process Change & Drop requests and manage prerogatives." fil="Pagkatapos ng enlistment, iproseso ang mga Change & Drop request at pamahalaan ang mga prerogative." />
      <Step n={6} en="At end of term, review Grade & Enrollment — verify grade submissions and manage removal grades." fil="Sa katapusan ng termino, suriin ang Grade & Enrollment — i-verify ang pagsusumite ng grado at pamahalaan ang mga removal grade." />

      <SubHead en="Enlistment Preparation Flow" fil="Daloy ng Paghahanda ng Enlistment" />
      <FlowRow steps={['Add Courses', 'Add Sections', 'Set Schedule', 'Open Enlistment', 'Review Consents', 'Process Enrollment']} color={sec} />

      <SubHead en="End-of-Term Grading Flow" fil="Daloy ng Pag-grade sa Katapusan ng Termino" />
      <FlowRow steps={['Open Grade Submission', 'Faculty Encodes', 'OCS Verifies', 'Grades Released', 'Recon Requests', 'Final Record']} color="#7f1d2e" />

      <SectionHeader title="Feature Reference  /  Gabay sa Tampok" color={sec} />
      <FeatureTable rows={[
        { feature: 'Course Overview', en: 'View all courses and their enrollment statistics for the active term.', fil: 'Tingnan ang lahat ng kurso at kanilang enrollment statistics para sa aktibong termino.' },
        { feature: 'Courses', en: 'Add, edit, and manage courses. Set prerequisites, corequisites, type, units, and consent requirements.', fil: 'Magdagdag, mag-edit, at pamahalaan ang mga kurso. Itakda ang mga prerequi­site, corequisite, uri, units, at kinakailangang consent.' },
        { feature: 'Sections', en: 'Create and manage course sections. Assign faculty, set schedules (days, time, room), and control slot counts.', fil: 'Gumawa at pamahalaan ang mga seksiyon ng kurso. Mag-assign ng guro, itakda ang iskedyul (araw, oras, silid), at kontrolin ang bilang ng slot.' },
        { feature: 'OCS Consents', en: 'Review and act on student requests for OCS Consent (special permission to enlist).', fil: 'Suriin at aksyunan ang mga kahilingan ng estudyante para sa OCS Consent.' },
        { feature: 'Students', en: 'View all students in your college scope. Check enrollment status, plan of study progress, and grades.', fil: 'Tingnan ang lahat ng estudyante sa inyong kolehiyo. Suriin ang katayuan ng enrollment, progreso ng plan of study, at mga grado.' },
        { feature: 'Grade & Enrollment', en: 'Manage enrollment records, override grades, handle incomplete/removal entries, and view grade distributions.', fil: 'Pamahalaan ang mga rekord ng enrollment, i-override ang mga grado, hawakan ang mga incomplete/removal entry.' },
        { feature: 'Plan of Study', en: 'Configure required courses per degree program for graduation tracking.', fil: 'I-configure ang mga kinakailangang kurso bawat programa para sa pagsubaybay ng graduation.' },
        { feature: 'Specialization', en: 'Review and approve student specialization/track applications.', fil: 'Suriin at aprubahan ang mga aplikasyon ng estudyante para sa espesyalisasyon/track.' },
        { feature: 'Graduation Applications', en: 'Process student applications for graduation. Verify eligibility and recommend for graduation.', fil: 'Iproseso ang mga aplikasyon ng estudyante para sa graduation. I-verify ang kwalipikasyon.' },
        { feature: 'Reconsideration', en: 'Review student requests for grade reconsideration submitted after grade release.', fil: 'Suriin ang mga kahilingan ng estudyante para sa muling pagsasaalang-alang ng grado.' },
        { feature: 'Change & Drop', en: 'Process change of section or dropping of subject requests. Approve or deny based on guidelines.', fil: 'Iproseso ang mga kahilingan para sa pagpapalit ng seksiyon o pag-drop ng asignatura.' },
      ]} />

      <Tip en="Use the Sections bulk tools to efficiently set up many sections at the start of each term." fil="Gamitin ang mga bulk tool sa Sections para mahusay na mag-set up ng maraming seksiyon sa simula ng bawat termino." />
      <Note en="Courses, Sections, and Consents are scoped to your assigned college. You only see data within your scope." fil="Ang Courses, Sections, at Consents ay nakasakop sa inyong kolehiyo lamang. Makikita lamang ang datos sa loob ng inyong saklaw." />
    </>
  );
}

function FacultyGuide() {
  const sec = '#1e5c3a';
  return (
    <>
      <SectionHeader title="Quick Start  /  Mabilis na Simula" subtitle="Your workflow each term" color="#7f1d2e" />
      <Step n={1} en="Log in and check My Classes to see your assigned sections for the active term." fil="Mag-login at tingnan ang My Classes para makita ang inyong mga seksiyon sa aktibong termino." />
      <Step n={2} en="Review Consents — approve or deny student COI requests for your sections." fil="Suriin ang Consents — aprubahan o tanggihan ang mga kahilingan ng estudyante para sa COI (Consent of Instructor)." />
      <Step n={3} en="View My Timetable for a weekly schedule overview of all your sections." fil="Tingnan ang My Timetable para sa pangkalahatang lingguhang iskedyul ng inyong mga seksiyon." />
      <Step n={4} en="Manage Prerogatives — students may request special enrollment in your sections." fil="Pamahalaan ang Prerogatives — maaaring humingi ng espesyal na enrollment ang mga estudyante sa inyong seksiyon." />
      <Step n={5} en="At end of term, go to Grade Encoding — input final grades and submit when complete." fil="Sa katapusan ng termino, pumunta sa Grade Encoding — ilagay ang mga panghuling grado at isumite pagkatapos." />
      <Step n={6} en="If needed, handle Removal/Completion grades for students with incomplete marks." fil="Kung kinakailangan, hawakan ang Removal/Completion grades para sa mga estudyanteng may incomplete marks." />

      <SubHead en="Grade Encoding Flow" fil="Daloy ng Pag-encode ng Grado" />
      <FlowRow steps={['End of Term', 'Grade Encoding opens', 'Input Grades', 'Review', 'Submit', 'OCS Sees Grades']} color="#7f1d2e" />

      <SubHead en="COI Consent Flow" fil="Daloy ng COI Consent" />
      <FlowRow steps={['Student requests COI', 'Faculty Reviews', 'Approve / Deny', 'Student Enlists']} color={sec} />

      <SectionHeader title="Feature Reference  /  Gabay sa Tampok" color={sec} />
      <FeatureTable rows={[
        { feature: 'My Classes', en: 'View all sections assigned to you for the active term. See enrolled student counts and grade submission status.', fil: 'Tingnan ang lahat ng seksiyon na itinalaga sa inyo sa aktibong termino. Tingnan ang bilang ng enrolled na estudyante at katayuan ng pagsusumite ng grado.' },
        { feature: 'My Timetable', en: 'Visual weekly schedule showing your teaching schedule including lab/recitation components.', fil: 'Visual na lingguhang iskedyul na nagpapakita ng inyong iskedyul sa pagtuturo kasama ang lab/recitation.' },
        { feature: 'Grade Encoding', en: 'Encode final grades for each student in your sections. Submit grades when all entries are complete. Supports numeric and S/U grading.', fil: 'Mag-encode ng mga panghuling grado para sa bawat estudyante sa inyong mga seksiyon. Isumite ang mga grado pagkatapos matapos ang lahat ng entry.' },
        { feature: 'Prerogatives', en: 'Review student prerogative requests for your sections. Approve or deny special enrollments.', fil: 'Suriin ang mga prerogative request ng estudyante para sa inyong mga seksiyon. Aprubahan o tanggihan ang espesyal na enrollment.' },
        { feature: 'Consents (COI)', en: 'Review and act on student Consent of Instructor (COI) requests. Approve to allow the student to enlist.', fil: 'Suriin at aksyunan ang mga kahilingan ng estudyante para sa Consent of Instructor (COI). Aprubahan para mapayagan ang estudyante na mag-enlist.' },
        { feature: 'Removal/Completion', en: 'Enter removal exam or completion grades for students who received an Incomplete mark in a previous term.', fil: 'Ilagay ang mga grado sa removal exam o completion para sa mga estudyanteng nakatanggap ng Incomplete mark sa nakaraang termino.' },
        { feature: 'Student Evaluations', en: 'View aggregated Faculty Evaluation (SET) results submitted by your students. Track response rates and average ratings.', fil: 'Tingnan ang pinagsama-samang resulta ng Faculty Evaluation (SET) na isinumite ng inyong mga estudyante.' },
      ]} />

      <Tip en="Grades cannot be seen by students until they complete their evaluation AND the admin releases grades." fil="Hindi makikita ng mga estudyante ang kanilang mga grado hanggang hindi nila natapos ang ebalwasyon AT hindi pa inilalabas ng admin ang mga grado." />
      <Note en="Once submitted, grades can only be changed by OCS. Contact your OCS for any corrections." fil="Kapag naisumite na ang mga grado, tanging ang OCS lamang ang makapag-aayos nito. Makipag-ugnayan sa inyong OCS para sa anumang pagwawasto." />
    </>
  );
}

function StudentGuide() {
  const sec = '#1e5c3a';
  return (
    <>
      <SectionHeader title="Quick Start  /  Mabilis na Simula" subtitle="Your enlistment guide each term" color="#7f1d2e" />
      <Step n={1} en="Log in and check your Dashboard for announcements and your current enrollment status." fil="Mag-login at suriin ang inyong Dashboard para sa mga anunsyo at katayuan ng inyong enrollment." />
      <Step n={2} en="Go to Enlistment when it is open — browse available sections and add them to your cart." fil="Pumunta sa Enlistment kapag bukas na ito — i-browse ang mga available na seksiyon at idagdag sa inyong cart." />
      <Step n={3} en="If a course requires COI or Dept Consent, go to My Consents to request approval first." fil="Kung ang isang kurso ay nangangailangan ng COI o Dept Consent, pumunta sa My Consents para humingi ng approval muna." />
      <Step n={4} en="Submit your enlistment from the cart. Wait for official enrollment confirmation from OCS." fil="Isumite ang inyong enlistment mula sa cart. Maghintay ng opisyal na kumpirmasyon ng enrollment mula sa OCS." />
      <Step n={5} en="At end of term, complete Student Evaluation (SET) for each of your faculty/classes." fil="Sa katapusan ng termino, kumpletuhin ang Student Evaluation (SET) para sa bawat isa sa inyong mga guro/klase." />
      <Step n={6} en="After completing SET, view your grades in My Grades once the faculty has submitted them." fil="Pagkatapos kumpletuhin ang SET, tingnan ang inyong mga grado sa My Grades kapag naisumite na ng guro." />

      <SubHead en="Enlistment Flow" fil="Daloy ng Enlistment" />
      <FlowRow steps={['Enlistment Opens', 'Browse Sections', 'Add to Cart', 'Get Consents (if needed)', 'Submit', 'OCS Enrolls', 'View Enrolled']} color="#7f1d2e" />

      <SubHead en="Grade Viewing Flow" fil="Daloy ng Pagtingin sa Grado" />
      <FlowRow steps={['End of Term', 'Complete SET', 'Faculty Submits Grades', 'Admin Releases', 'View in My Grades']} color={sec} />

      <SectionHeader title="Feature Reference  /  Gabay sa Tampok" color={sec} />
      <FeatureTable rows={[
        { feature: 'Dashboard', en: 'See your current enrollment, pending evaluations, cumulative GWA, and announcements.', fil: 'Tingnan ang inyong kasalukuyang enrollment, mga naghihintay na ebalwasyon, cumulative GWA, at mga anunsyo.' },
        { feature: 'Enlistment', en: 'Browse course sections available for the active term. Add to cart, then submit. View your weekly timetable and enrolled subjects.', fil: 'I-browse ang mga seksiyong available para sa aktibong termino. Idagdag sa cart, pagkatapos ay isumite. Tingnan ang inyong lingguhang iskedyul at enrolled na asignatura.' },
        { feature: 'Prerogatives', en: 'Request special enrollment (prerogative) for a section — used when regular enlistment is closed or a section is full.', fil: 'Humiling ng espesyal na enrollment (prerogative) para sa isang seksiyon — ginagamit kapag sarado na ang regular na enlistment o puno na ang seksiyon.' },
        { feature: 'My Consents', en: 'Track and request COI (Consent of Instructor), Dept Consent, or OCS Consent required for specific courses.', fil: 'Subaybayan at humiling ng COI, Dept Consent, o OCS Consent na kailangan para sa mga tiyak na kurso.' },
        { feature: 'My Grades', en: 'View your grades per term once released. Requires completing faculty evaluation (SET) first.', fil: 'Tingnan ang inyong mga grado bawat termino kapag inilabas na. Kailangan munang kumpletuhin ang ebalwasyon ng guro (SET).' },
        { feature: 'Plan of Study', en: 'Track your progress toward graduation. See required courses, what you have passed, and what remains.', fil: 'Subaybayan ang inyong progreso patungo sa graduation. Tingnan ang mga kinakailangang kurso, ang mga naipasa na, at ang mga natitira.' },
        { feature: 'Specialization', en: 'Apply for a specialization or academic track within your degree program (if available).', fil: 'Mag-apply para sa espesyalisasyon o academic track sa loob ng inyong programa (kung available).' },
        { feature: 'SET (Evaluation)', en: 'Complete the Student Evaluation of Teachers (SET) for each faculty in your enrolled sections.', fil: 'Kumpletuhin ang Student Evaluation of Teachers (SET) para sa bawat guro sa inyong enrolled na mga seksiyon.' },
        { feature: 'My Profile', en: 'View your student profile, program, GWA, and academic standing.', fil: 'Tingnan ang inyong profile bilang estudyante, programa, GWA, at katayuang akademiko.' },
      ]} />

      <Tip en="Add sections to your cart early — slots are limited and fill up fast during enlistment." fil="Magdagdag ng mga seksiyon sa inyong cart nang maaga — limitado ang mga slot at mabilis itong mapuno sa panahon ng enlistment." />
      <Note en="You must complete ALL faculty evaluations to unlock grade viewing. There are no exceptions." fil="Kailangan ninyong kumpletuhin ang LAHAT ng ebalwasyon ng guro para ma-unlock ang pagtingin sa grado. Walang pagbubukod." />
      <Note en="If a section requires COI or Dept Consent, request it BEFORE the enlistment deadline." fil="Kung ang isang seksiyon ay nangangailangan ng COI o Dept Consent, hingin ito BAGO ang deadline ng enlistment." />

      <SectionHeader title="Consent Types  /  Mga Uri ng Consent" color="#7f1d2e" />
      <FeatureTable rows={[
        { feature: 'COI', en: 'Consent of Instructor — required for courses where faculty must personally approve each student.', fil: 'Pahintulot ng Guro — kailangan para sa mga kursong nangangailangan ng personal na pahintulot ng guro.' },
        { feature: 'Dept Consent', en: 'Department Consent — required for restricted courses; approved by the Department Head.', fil: 'Pahintulot ng Departamento — kailangan para sa mga naka-restriksiyon na kurso; inaprubahan ng Pinuno ng Departamento.' },
        { feature: 'OCS Consent', en: 'Office of the College Secretary Consent — required for certain courses approved at the college level.', fil: 'Pahintulot ng OCS — kailangan para sa ilang kursong inaprubahan sa antas ng kolehiyo.' },
      ]} />
    </>
  );
}

function DeptHeadGuide() {
  const sec = '#1e5c3a';
  return (
    <>
      <SectionHeader title="Quick Start  /  Mabilis na Simula" subtitle="Your main responsibilities" color="#7f1d2e" />
      <Step n={1} en="Log in and check your Dashboard for pending consent requests — these need timely action." fil="Mag-login at suriin ang inyong Dashboard para sa mga naghihintay na consent request — nangangailangan ito ng napapanahong aksyon." />
      <Step n={2} en="Go to Dept Consent — review and approve or deny student requests for department-restricted courses." fil="Pumunta sa Dept Consent — suriin at aprubahan o tanggihan ang mga kahilingan ng estudyante para sa mga naka-restriksiyon na kurso ng departamento." />
      <Step n={3} en="Go to Courses — add new courses or update existing courses for your department." fil="Pumunta sa Courses — magdagdag ng mga bagong kurso o i-update ang mga kasalukuyang kurso para sa inyong departamento." />
      <Step n={4} en="Go to Sections — view and manage sections of your department's courses for the active term." fil="Pumunta sa Sections — tingnan at pamahalaan ang mga seksiyon ng mga kurso ng inyong departamento para sa aktibong termino." />

      <SubHead en="Dept Consent Approval Flow" fil="Daloy ng Pag-apruba ng Dept Consent" />
      <FlowRow steps={['Student Requests Consent', 'Dept Head Notified', 'Review Request', 'Approve / Deny', 'Student Can Enlist']} color="#7f1d2e" />

      <SubHead en="Course & Section Management Flow" fil="Daloy ng Pamamahala ng Kurso at Seksiyon" />
      <FlowRow steps={['OCS Creates Term', 'Dept Head Adds Courses', 'Assigns to Sections', 'OCS Finalizes', 'Enlistment Opens']} color={sec} />

      <SectionHeader title="Feature Reference  /  Gabay sa Tampok" color={sec} />
      <FeatureTable rows={[
        { feature: 'Dashboard', en: 'Overview of pending and approved consent requests, department course count, and active sections for the current term.', fil: 'Pangkalahatang-tanaw ng mga naghihintay at naaprobahang consent request, bilang ng kurso ng departamento, at aktibong mga seksiyon.' },
        { feature: 'Dept Consent', en: 'Review student requests for Department Consent for restricted courses. Approve or deny with optional remarks.', fil: 'Suriin ang mga kahilingan ng estudyante para sa Dept Consent para sa mga naka-restriksiyon na kurso. Aprubahan o tanggihan nang may opsyonal na komento.' },
        { feature: 'Sections', en: 'View and manage all sections of courses belonging to your department. See schedule, faculty, and enrollment per section.', fil: 'Tingnan at pamahalaan ang lahat ng seksiyon ng mga kurso sa inyong departamento. Tingnan ang iskedyul, guro, at enrollment bawat seksiyon.' },
        { feature: 'Courses', en: 'Add and edit courses under your department. Set prerequisites, corequisites, course type, units, and consent flags.', fil: 'Magdagdag at mag-edit ng mga kurso sa inyong departamento. Itakda ang mga prerequisite, corequisite, uri ng kurso, units, at mga consent flag.' },
      ]} />

      <Tip en="Check the Dashboard daily during enlistment period — consent requests from students require prompt action." fil="Suriin ang Dashboard araw-araw sa panahon ng enlistment — ang mga consent request ng estudyante ay nangangailangan ng mabilis na aksyon." />
      <Note en="You can only manage courses and sections within your assigned department." fil="Maaari lamang ninyong pamahalaan ang mga kurso at seksiyon sa loob ng inyong itinalagang departamento." />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Role labels & colors
───────────────────────────────────────────────────────────── */

const ROLE_INFO: Record<Role, { label: string; labelFil: string; badgeColor: string }> = {
  admin: { label: 'System Administrator', labelFil: 'System Administrator', badgeColor: '#7f1d2e' },
  ocs: { label: 'OCS Staff', labelFil: 'Kawani ng OCS', badgeColor: '#1e5c3a' },
  faculty: { label: 'Faculty Member', labelFil: 'Miyembro ng Guro', badgeColor: '#1d4ed8' },
  student: { label: 'Student', labelFil: 'Estudyante', badgeColor: '#92400e' },
  department_head: { label: 'Department Head', labelFil: 'Pinuno ng Departamento', badgeColor: '#6b21a8' },
};

/* ─────────────────────────────────────────────────────────────
   Main export
───────────────────────────────────────────────────────────── */

export default function UserGuide() {
  const { state } = useApp();
  const navigate = useNavigate();
  const user = state.currentUser;
  const ps = state.portalSettings;

  const role = (user?.role ?? 'student') as Role;
  const info = ROLE_INFO[role];

  const GuideBody = {
    admin: AdminGuide,
    ocs: OCSGuide,
    faculty: FacultyGuide,
    student: StudentGuide,
    department_head: DeptHeadGuide,
  }[role] ?? StudentGuide;

  const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      {/* ── Print CSS injected into head ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          .guide-page { max-width: 100% !important; padding: 0 !important; }
          .page-break { break-before: page; }
          @page { size: A4; margin: 1.5cm; }
        }
        @media screen {
          .guide-page { max-width: 860px; margin: 0 auto; padding: 24px 20px 60px; }
        }
      `}</style>

      {/* ── Screen-only toolbar ── */}
      <div className="no-print" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'hsl(var(--sidebar-background))',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
      }}>
        <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/10 gap-1.5"
          onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back / Bumalik
        </Button>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>|</span>
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600 }}>
          User Guide — {info.label}
        </span>
        <div style={{ flex: 1 }} />
        <Button size="sm" className="gap-1.5 bg-white/15 hover:bg-white/25 text-white border border-white/20"
          onClick={() => window.print()}>
          <Printer size={14} /> Print / Save as PDF
        </Button>
      </div>

      {/* ── Guide body ── */}
      <div className="guide-page" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: '#1a1a2e', lineHeight: 1.6 }}>

        {/* ── COVER ── */}
        <div style={{
          background: 'linear-gradient(135deg, hsl(348 58% 24%) 0%, hsl(158 46% 24%) 100%)',
          borderRadius: 12, padding: '40px 40px 36px', marginBottom: 32, color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Logo / icon */}
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '3px solid rgba(255,255,255,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {ps.logoUrl
                ? <img src={ps.logoUrl} alt="Logo" style={{ width: 74, height: 74, borderRadius: '50%', objectFit: 'cover' }} crossOrigin="anonymous" />
                : <GraduationCap size={38} style={{ color: 'rgba(255,255,255,0.9)' }} />
              }
            </div>
            {/* Title block */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0.5, lineHeight: 1.2 }}>
                {ps.portalName || 'University AIS'}
              </div>
              {ps.institutionName && (
                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>{ps.institutionName}</div>
              )}
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{
                  backgroundColor: info.badgeColor, color: 'white',
                  padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: '1.5px solid rgba(255,255,255,0.4)',
                }}>
                  {info.label}
                </span>
                <span style={{ fontSize: 12, opacity: 0.75 }}>{info.labelFil}</span>
              </div>
            </div>
            {/* Right block */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 900, opacity: 0.95 }}>User Guide</div>
              <div style={{ fontSize: 14, opacity: 0.75, marginTop: 2 }}>Gabay ng Gumagamit</div>
              {user && (
                <div style={{ fontSize: 11.5, opacity: 0.65, marginTop: 8 }}>{user.name}</div>
              )}
              <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>{today}</div>
            </div>
          </div>

          {/* Description band */}
          <div style={{
            marginTop: 24, padding: '12px 16px',
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: 8, fontSize: 12.5, lineHeight: 1.6,
          }}>
            This guide explains how to use the <strong>{ps.portalName || 'portal'}</strong> as a <strong>{info.label}</strong>.
            It is bilingual — English instructions are followed by their Filipino translation in{' '}
            <span style={{ color: '#6ee7b7' }}>green</span>.{' '}
            You can print this page or save it as PDF using the button above.
            <br />
            <span style={{ color: '#6ee7b7', fontSize: 11.5 }}>
              Ang gabay na ito ay nagpapaliwanag kung paano gamitin ang {ps.portalName || 'portal'} bilang isang {info.labelFil}.
              Maaaring i-print o i-save bilang PDF gamit ang pindutan sa itaas.
            </span>
          </div>
        </div>

        {/* ── ROLE CONTENT ── */}
        <GuideBody />

        {/* ── GENERAL SECTION ── */}
        <div className="page-break">
          <SectionHeader title="General Tips  /  Pangkalahatang Mga Tip" subtitle="For all users / Para sa lahat ng gumagamit" color="#374151" />
          <FeatureTable rows={[
            { feature: 'Login / Sign In', en: 'Use your assigned username and password. Contact admin for account issues.', fil: 'Gamitin ang inyong itinalagang username at password. Makipag-ugnayan sa admin para sa mga isyu sa account.' },
            { feature: 'Forgot Password', en: 'Click "Forgot password?" on the login page, enter your username, verify your identity, and get a ticket number to present to admin.', fil: 'I-click ang "Forgot password?" sa login page, ilagay ang inyong username, i-verify ang pagkakakilanlan, at makakuha ng ticket number para ipakita sa admin.' },
            { feature: 'Session Timeout', en: 'You will be automatically logged out after a period of inactivity. Save your work regularly.', fil: 'Awtomatiko kayong ma-logout pagkatapos ng ilang oras ng kawalan ng aktibidad. I-save ang inyong trabaho nang regular.' },
            { feature: 'Navigation', en: 'Use the left sidebar to navigate between sections. The sidebar can be collapsed for more workspace.', fil: 'Gamitin ang kaliwang sidebar para mag-navigate sa pagitan ng mga seksyon. Maaaring i-collapse ang sidebar para sa mas malaking espasyo.' },
            { feature: 'Data Scope', en: 'You only see data relevant to your role and assignment (college, department, etc.).', fil: 'Makikita lamang ang datos na may kaugnayan sa inyong tungkulin at takdang-gawain.' },
          ]} />

          <SectionHeader title="Contact & Support  /  Pakikipag-ugnayan at Tulong" color="#7f1d2e" />
          <div style={{
            backgroundColor: '#fdf8ff', border: '1px solid #e9d5ff', borderRadius: 8,
            padding: '14px 18px', fontSize: 12.5, lineHeight: 1.7,
          }}>
            <p><strong>For technical issues / Para sa mga teknikal na isyu:</strong> Contact your System Administrator.</p>
            <p style={{ color: '#1e5c3a' }}>Makipag-ugnayan sa inyong System Administrator para sa mga teknikal na isyu.</p>
            <p style={{ marginTop: 8 }}><strong>For enrollment concerns / Para sa mga alalahanin sa enrollment:</strong> Contact the Office of the College Secretary (OCS).</p>
            <p style={{ color: '#1e5c3a' }}>Makipag-ugnayan sa Opisina ng Kalihim ng Kolehiyo (OCS) para sa mga alalahanin sa enrollment.</p>
            <p style={{ marginTop: 8 }}><strong>For grade concerns / Para sa mga alalahanin sa grado:</strong> Contact your Faculty member first, then OCS if needed.</p>
            <p style={{ color: '#1e5c3a' }}>Makipag-ugnayan muna sa inyong Guro, pagkatapos ay sa OCS kung kinakailangan.</p>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 40, paddingTop: 16, borderTop: '2px solid #e5e7eb',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            flexWrap: 'wrap', gap: 8,
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#7f1d2e' }}>{ps.portalName || 'University AIS'}</div>
              {ps.institutionName && <div style={{ fontSize: 11, color: '#6b7280' }}>{ps.institutionName}</div>}
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af' }}>
              <div>User Guide — {info.label}</div>
              <div>Generated: {today}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
