import {
  ModuleSection, Steps, Restriction, InfoBox, FlowChart, BranchFlow,
  PortalIllustration, IllusCards, IllusTable, IllusForm, SubHead, TwoCol,
  TipsRoleProvider,
} from './GuideComponents';

export default function AdminGuide() {
  return (
    <TipsRoleProvider role="admin">
      {/* ── 1. Dashboard ─────────────────────────────── */}
      <ModuleSection id="admin-dashboard" navIndex={1} title="Dashboard" titleFil="Dashboard" path="/admin/dashboard">
        <Restriction
          en="Accessible to System Administrators only."
          fil="Para lamang sa mga System Administrator."
        />
        <TwoCol
          left={
            <>
              <SubHead en="What it shows" fil="Ano ang ipinapakita" />
              <Steps items={[
                { en: 'Log in as Admin. You are automatically taken to the Dashboard.', fil: 'Mag-login bilang Admin. Awtomatiko kang dadalhin sa Dashboard.' },
                { en: 'View total counts: students, faculty, offered courses, active sections.', fil: 'Tingnan ang kabuuang bilang: estudyante, guro, inaalok na kurso, aktibong seksiyon.' },
                { en: 'Check the active term name, academic year, and system control statuses.', fil: 'Suriin ang pangalan ng aktibong termino, akademikong taon, at katayuan ng mga kontrol.' },
                { en: 'Scroll down to see section-by-section enrollment progress bars.', fil: 'Mag-scroll pababa para makita ang progress bar ng enrollment bawat seksiyon.' },
              ]} />
              <InfoBox en="The Dashboard refreshes every time you navigate back to it. No manual refresh needed." fil="Ang Dashboard ay nire-refresh sa bawat pagbabalik sa page. Hindi na kailangang manu-manong i-refresh." />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={0} title="Admin Dashboard">
              <IllusCards />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Login', fil: 'Mag-login' }, type: 'start' },
          { label: { en: 'Dashboard loads', fil: 'Dashboard naglo-load' }, type: 'step' },
          { label: { en: 'View Stats', fil: 'Tingnan ang Stats' }, type: 'step' },
          { label: { en: 'View Controls', fil: 'Tingnan ang Kontrol' }, type: 'step' },
          { label: { en: 'Navigate', fil: 'Mag-navigate' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 2. Dashboard Content ─────────────────────── */}
      <ModuleSection id="admin-dashboard-content" navIndex={2} title="Dashboard Content" titleFil="Nilalaman ng Dashboard" path="/admin/dashboard-content">
        <Restriction
          en="Admin only. Edits affect the welcome message and announcements visible on ALL user dashboards."
          fil="Admin lamang. Ang mga pag-edit ay nakakaapekto sa mensahe ng pagbati at mga anunsyo na makikita sa LAHAT ng dashboard ng mga gumagamit."
        />
        <TwoCol
          left={
            <>
              <SubHead en="How to edit announcements" fil="Paano mag-edit ng mga anunsyo" />
              <Steps items={[
                { en: 'Click "Dashboard Content" in the sidebar.', fil: 'I-click ang "Dashboard Content" sa sidebar.' },
                { en: 'Edit the portal-wide announcement text in the text area provided.', fil: 'I-edit ang pangkalahatang anunsyo ng portal sa text area na ibinigay.' },
                { en: 'Toggle visibility switches per role (e.g. show to students only).', fil: 'I-toggle ang mga visibility switch bawat tungkulin (hal. ipakita sa mga estudyante lamang).' },
                { en: 'Click Save Changes. The announcement appears immediately on all dashboards.', fil: 'I-click ang Save Changes. Agad na lalabas ang anunsyo sa lahat ng dashboard.' },
                { en: 'To remove an announcement, clear the text and save again.', fil: 'Para alisin ang isang anunsyo, linisin ang text at i-save ulit.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={1} title="Dashboard Content">
              <IllusForm fields={4} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Open module', fil: 'Buksan ang module' }, type: 'start' },
          { label: { en: 'Edit content', fil: 'I-edit ang nilalaman' }, type: 'step' },
          { label: { en: 'Set visibility', fil: 'Itakda ang visibility' }, type: 'step' },
          { label: { en: 'Save Changes', fil: 'I-save ang Pagbabago' }, type: 'step' },
          { label: { en: 'Live on dashboards', fil: 'Live sa mga dashboard' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 3. Term Control ──────────────────────────── */}
      <ModuleSection id="admin-terms" navIndex={3} title="Term Control" titleFil="Kontrol ng Termino" path="/admin/terms">
        <Restriction
          en="Admin only. Only one term can be marked as Active at a time. Opening a control (e.g. Enlistment) makes it available to all users immediately."
          fil="Admin lamang. Isang termino lamang ang maaaring markahan bilang Aktibo sa isang pagkakataon. Ang pagbubukas ng isang kontrol (hal. Enlistment) ay agad itong maaaring gamitin ng lahat ng gumagamit."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Creating a new term" fil="Paggawa ng bagong termino" />
              <Steps items={[
                { en: 'Go to Term Control → click "Add Term".', fil: 'Pumunta sa Term Control → i-click ang "Add Term".' },
                { en: 'Enter the term name (e.g. "First Semester"), academic year, and date range.', fil: 'Ilagay ang pangalan ng termino (hal. "First Semester"), akademikong taon, at petsa ng saklaw.' },
                { en: 'Click Save. The term is created as Inactive.', fil: 'I-click ang Save. Ang termino ay gagawin bilang Inactive.' },
                { en: 'Click "Set Active" to make it the current running term.', fil: 'I-click ang "Set Active" para gawin itong kasalukuyang termino.' },
                { en: 'Once active, open each control window when ready: Enlistment, Enrollment, Grade Submission, FIC Evaluation, Prerogative.', fil: 'Kapag aktibo na, buksan ang bawat window ng kontrol kapag handa na: Enlistment, Enrollment, Grade Submission, FIC Evaluation, Prerogative.' },
              ]} />
              <InfoBox en="Term controls are real-time — toggling affects all users instantly." fil="Ang mga kontrol ng termino ay real-time — ang pag-toggle ay agad na nakakaapekto sa lahat ng gumagamit." />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={2} title="Term Control">
              <IllusForm fields={4} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Add Term', fil: 'Magdagdag ng Termino' }, type: 'start' },
          { label: { en: 'Set name & dates', fil: 'Itakda ang pangalan at petsa' }, type: 'step' },
          { label: { en: 'Activate Term', fil: 'I-activate ang Termino' }, type: 'step' },
          { label: { en: 'Open Enlistment', fil: 'Buksan ang Enlistment' }, type: 'step' },
          { label: { en: 'Open Enrollment', fil: 'Buksan ang Enrollment' }, type: 'step' },
          { label: { en: 'Open Grade Sub.', fil: 'Buksan ang Grade Sub.' }, type: 'step' },
          { label: { en: 'Term Running', fil: 'Termino Tumatakbo' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 4. User Management ───────────────────────── */}
      <ModuleSection id="admin-users" navIndex={4} title="User Management" titleFil="Pamamahala ng mga Gumagamit" path="/admin/users">
        <Restriction
          en="Admin only. Passwords are hashed; admins cannot view existing passwords — only reset them. Role changes take effect on next login."
          fil="Admin lamang. Ang mga password ay naka-hash; hindi makikita ng admin ang mga kasalukuyang password — maaari lamang itong i-reset. Ang mga pagbabago sa tungkulin ay magkakabisa sa susunod na pag-login."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Adding a user manually" fil="Manu-manong pagdaragdag ng gumagamit" />
              <Steps items={[
                { en: 'Click "Add User" button.', fil: 'I-click ang "Add User" na pindutan.' },
                { en: 'Fill in: Last Name, First Name, Middle Name (if any), Extension (Jr./Sr./III).', fil: 'Punan ang: Apelyido, Pangalan, Gitnang Pangalan (kung mayroon), Extension (Jr./Sr./III).' },
                { en: 'Enter username, email, and initial password.', fil: 'Ilagay ang username, email, at paunang password.' },
                { en: 'Select role: admin, ocs, faculty, student, or department_head.', fil: 'Pumili ng tungkulin: admin, ocs, faculty, student, o department_head.' },
                { en: 'Fill in college, department, program, student number, or employee ID as applicable.', fil: 'Punan ang kolehiyo, departamento, programa, numero ng estudyante, o employee ID kung naaangkop.' },
                { en: 'Click Save. The user can now log in.', fil: 'I-click ang Save. Maaari nang mag-login ang gumagamit.' },
              ]} />
              <SubHead en="Importing via CSV" fil="Pag-import gamit ang CSV" />
              <Steps items={[
                { en: 'Click "Import CSV" → download the template.', fil: 'I-click ang "Import CSV" → i-download ang template.' },
                { en: 'Fill required columns: lastname, firstname, username, password.', fil: 'Punan ang mga kinakailangang column: lastname, firstname, username, password.' },
                { en: 'Optional: middlename, extension, email, role, studentNumber, employeeId, college, department, program.', fil: 'Opsyonal: middlename, extension, email, role, studentNumber, employeeId, college, department, program.' },
                { en: 'Upload the file. Review the preview then click Confirm Import.', fil: 'I-upload ang file. Suriin ang preview pagkatapos ay i-click ang Confirm Import.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={3} title="User Management">
              <IllusTable rows={4} cols={3} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow (Manual Add)" fil="Daloy ng Proseso (Manu-manong Pagdaragdag)" />
        <FlowChart nodes={[
          { label: { en: 'Click Add User', fil: 'I-click ang Add User' }, type: 'start' },
          { label: { en: 'Fill form fields', fil: 'Punan ang form' }, type: 'step' },
          { label: { en: 'Select role', fil: 'Piliin ang tungkulin' }, type: 'step' },
          { label: { en: 'Validate inputs', fil: 'I-validate ang inputs' }, type: 'decision' },
          { label: { en: 'Save user', fil: 'I-save ang gumagamit' }, type: 'success' },
          { label: { en: 'Fix errors', fil: 'Ayusin ang mga error' }, type: 'reject' },
        ]} />
        <BranchFlow
          trigger={{ en: 'CSV Import', fil: 'CSV Import' }}
          condition={{ en: 'All rows valid?', fil: 'Lahat ng row valid?' }}
          yes={{ en: 'Import all users', fil: 'I-import ang lahat ng gumagamit' }}
          no={{ en: 'Show row errors', fil: 'Ipakita ang mga error sa row' }}
        />
      </ModuleSection>

      {/* ── 5. Report Cards ──────────────────────────── */}
      <ModuleSection id="admin-reportcard" navIndex={5} title="Report Cards" titleFil="Mga Report Card" path="/admin/reportcard">
        <Restriction
          en="Admin only. Grades must have been submitted by faculty to appear on report cards."
          fil="Admin lamang. Ang mga grado ay kailangang naisumite na ng guro para lumabas sa mga report card."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Generating report cards" fil="Paggawa ng mga report card" />
              <Steps items={[
                { en: 'Go to Report Cards in the sidebar.', fil: 'Pumunta sa Report Cards sa sidebar.' },
                { en: 'Select the academic term from the dropdown.', fil: 'Piliin ang akademikong termino mula sa dropdown.' },
                { en: 'Filter by college, department, or program if needed.', fil: 'Mag-filter ayon sa kolehiyo, departamento, o programa kung kinakailangan.' },
                { en: 'Click on a student to view their full report card.', fil: 'I-click ang isang estudyante para makita ang kanilang buong report card.' },
                { en: 'Use the Print button to export as PDF.', fil: 'Gamitin ang Print button para i-export bilang PDF.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={4} title="Report Cards">
              <IllusTable rows={5} cols={3} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Select term', fil: 'Piliin ang termino' }, type: 'start' },
          { label: { en: 'Filter students', fil: 'I-filter ang estudyante' }, type: 'step' },
          { label: { en: 'Select student', fil: 'Piliin ang estudyante' }, type: 'step' },
          { label: { en: 'View report card', fil: 'Tingnan ang report card' }, type: 'step' },
          { label: { en: 'Print / Export PDF', fil: 'I-print / Export PDF' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 6. Academic Units ────────────────────────── */}
      <ModuleSection id="admin-academic-units" navIndex={6} title="Academic Units" titleFil="Mga Akademikong Unit" path="/admin/academic-units">
        <Restriction
          en="Admin only. Colleges, Departments, and Programs must be set up BEFORE adding users with those assignments. Deleting a college will cascade to related departments and programs."
          fil="Admin lamang. Ang mga Kolehiyo, Departamento, at Programa ay dapat itakda BAGO magdagdag ng mga gumagamit na may ganitong itinalaga. Ang pagtanggal ng kolehiyo ay makakaapekto sa mga kaugnay na departamento at programa."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Setting up academic units" fil="Pag-set up ng mga akademikong unit" />
              <Steps items={[
                { en: 'Go to Academic Units. You will see three tabs: Colleges, Departments, Programs.', fil: 'Pumunta sa Academic Units. Makikita ang tatlong tab: Colleges, Departments, Programs.' },
                { en: 'First, add Colleges (e.g. "College of Forestry and Natural Resources").', fil: 'Una, magdagdag ng mga Kolehiyo (hal. "College of Forestry and Natural Resources").' },
                { en: 'Then add Departments and assign each to a College.', fil: 'Pagkatapos ay magdagdag ng mga Departamento at italaga ang bawat isa sa isang Kolehiyo.' },
                { en: 'Finally, add Programs (degree programs) and assign each to a Department.', fil: 'Sa wakas, magdagdag ng mga Programa (degree programs) at italaga ang bawat isa sa isang Departamento.' },
                { en: 'Edit or delete items using the action icons in each row.', fil: 'I-edit o tanggalin ang mga item gamit ang mga action icon sa bawat row.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={5} title="Academic Units">
              <IllusTable rows={4} cols={2} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Add Colleges', fil: 'Magdagdag ng Kolehiyo' }, type: 'start' },
          { label: { en: 'Add Departments', fil: 'Magdagdag ng Departamento' }, type: 'step' },
          { label: { en: 'Link to College', fil: 'I-link sa Kolehiyo' }, type: 'step' },
          { label: { en: 'Add Programs', fil: 'Magdagdag ng Programa' }, type: 'step' },
          { label: { en: 'Link to Dept', fil: 'I-link sa Departamento' }, type: 'step' },
          { label: { en: 'Done', fil: 'Tapos' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 7. Rooms ─────────────────────────────────── */}
      <ModuleSection id="admin-rooms" navIndex={7} title="Rooms" titleFil="Mga Silid" path="/admin/rooms">
        <Restriction
          en="Admin only. Rooms must exist before OCS can assign them to sections."
          fil="Admin lamang. Ang mga silid ay kailangang mayroon na bago maaaring italaga ng OCS ang mga ito sa mga seksiyon."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Adding a room" fil="Pagdaragdag ng silid" />
              <Steps items={[
                { en: 'Click "Add Room".', fil: 'I-click ang "Add Room".' },
                { en: 'Enter the room name/code (e.g. "F101", "Computer Lab A").', fil: 'Ilagay ang pangalan/code ng silid (hal. "F101", "Computer Lab A").' },
                { en: 'Enter seating capacity.', fil: 'Ilagay ang kakayahan sa pagkaupo.' },
                { en: 'Select type: Lecture, Laboratory, or Special.', fil: 'Piliin ang uri: Lecture, Laboratory, o Special.' },
                { en: 'Click Save.', fil: 'I-click ang Save.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={6} title="Rooms">
              <IllusTable rows={5} cols={3} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Click Add Room', fil: 'I-click ang Add Room' }, type: 'start' },
          { label: { en: 'Enter details', fil: 'Ilagay ang detalye' }, type: 'step' },
          { label: { en: 'Set capacity', fil: 'Itakda ang kapasidad' }, type: 'step' },
          { label: { en: 'Select type', fil: 'Piliin ang uri' }, type: 'step' },
          { label: { en: 'Save', fil: 'I-save' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 8. Password Tickets ──────────────────────── */}
      <ModuleSection id="admin-password-tickets" navIndex={8} title="Password Tickets" titleFil="Mga Password Ticket" path="/admin/password-tickets">
        <Restriction
          en="Admin only. A ticket must exist (submitted by the user via the login page) before it can be processed."
          fil="Admin lamang. Ang isang ticket ay kailangang mayroon na (isinumite ng gumagamit sa pamamagitan ng login page) bago ito maiproseso."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Resolving a password reset" fil="Paglutas ng pag-reset ng password" />
              <Steps items={[
                { en: 'Go to Password Tickets. You see a list of open tickets.', fil: 'Pumunta sa Password Tickets. Makikita ang listahan ng mga bukas na ticket.' },
                { en: 'Review the ticket: verify username, identity answer provided by user.', fil: 'Suriin ang ticket: i-verify ang username, sagot sa pagkakakilanlan na ibinigay ng gumagamit.' },
                { en: 'Click "Resolve" on a ticket.', fil: 'I-click ang "Resolve" sa isang ticket.' },
                { en: 'Enter a temporary password and confirm.', fil: 'Ilagay ang pansamantalang password at kumpirmahin.' },
                { en: 'Ticket is marked resolved. Inform the user of their temporary password.', fil: 'Ang ticket ay minarkahan bilang resolved. Ipaalam sa gumagamit ang kanilang pansamantalang password.' },
                { en: 'The user should change their password on next login.', fil: 'Dapat baguhin ng gumagamit ang kanilang password sa susunod na pag-login.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={7} title="Password Tickets">
              <IllusTable rows={4} cols={3} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <BranchFlow
          trigger={{ en: 'Ticket submitted by user', fil: 'Ticket isinumite ng gumagamit' }}
          condition={{ en: 'Identity verified?', fil: 'Na-verify ang pagkakakilanlan?' }}
          yes={{ en: 'Issue temp password & resolve', fil: 'Mag-isyu ng temp password at i-resolve' }}
          no={{ en: 'Mark as declined', fil: 'Markahan bilang declined' }}
        />
      </ModuleSection>

      {/* ── 9. Graduation Settings ───────────────────── */}
      <ModuleSection id="admin-graduation" navIndex={9} title="Graduation Settings" titleFil="Mga Setting ng Graduation" path="/admin/graduation-settings">
        <Restriction
          en="Admin only. Settings affect graduation eligibility checks for ALL programs unless overridden per program."
          fil="Admin lamang. Ang mga setting ay nakakaapekto sa pagsusuri ng kwalipikasyon sa graduation para sa LAHAT ng programa maliban kung pina-override bawat programa."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Configuring graduation requirements" fil="Pag-configure ng mga kinakailangan sa graduation" />
              <Steps items={[
                { en: 'Go to Graduation Settings.', fil: 'Pumunta sa Graduation Settings.' },
                { en: 'Set the minimum GWA threshold for graduation eligibility.', fil: 'Itakda ang minimum na GWA para sa kwalipikasyon sa graduation.' },
                { en: 'Set required total units to graduate.', fil: 'Itakda ang kinakailangang kabuuang units para mag-graduate.' },
                { en: 'Configure honors thresholds: Summa, Magna, Cum Laude GWA ranges.', fil: 'I-configure ang mga pamantayan sa karangalan: Summa, Magna, Cum Laude GWA ranges.' },
                { en: 'Click Save. These settings are applied when OCS processes graduation applications.', fil: 'I-click ang Save. Ang mga setting na ito ay inilalapat kapag ipinroseso ng OCS ang mga aplikasyon sa graduation.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={8} title="Graduation Settings">
              <IllusForm fields={5} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Open Settings', fil: 'Buksan ang Settings' }, type: 'start' },
          { label: { en: 'Set GWA min', fil: 'Itakda ang min GWA' }, type: 'step' },
          { label: { en: 'Set units req.', fil: 'Itakda ang req. units' }, type: 'step' },
          { label: { en: 'Set honors bands', fil: 'Itakda ang honors bands' }, type: 'step' },
          { label: { en: 'Save', fil: 'I-save' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 10. Portal Settings ──────────────────────── */}
      <ModuleSection id="admin-portal-settings" navIndex={10} title="Portal Settings" titleFil="Mga Setting ng Portal" path="/admin/portal-settings">
        <Restriction
          en="Admin only. Portal name and institution name appear on all pages including the login screen."
          fil="Admin lamang. Ang pangalan ng portal at institusyon ay lumalabas sa lahat ng pahina kasama ang login screen."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Customizing the portal" fil="Pag-customize ng portal" />
              <Steps items={[
                { en: 'Go to Portal Settings.', fil: 'Pumunta sa Portal Settings.' },
                { en: 'Enter the Portal Name shown in the browser tab and header.', fil: 'Ilagay ang Portal Name na ipinapakita sa browser tab at header.' },
                { en: 'Enter the Institution Name (your university/school name).', fil: 'Ilagay ang Institution Name (pangalan ng inyong unibersidad/paaralan).' },
                { en: 'Enter a Tagline (short description of the portal).', fil: 'Ilagay ang isang Tagline (maikling paglalarawan ng portal).' },
                { en: 'Upload a Logo: click the logo area, select an image file, confirm upload.', fil: 'Mag-upload ng Logo: i-click ang logo area, pumili ng image file, kumpirmahin ang upload.' },
                { en: 'Enable or disable global features (e.g. prerogatives, specialization).', fil: 'I-enable o i-disable ang mga global na feature (hal. prerogatives, specialization).' },
                { en: 'Click Save Settings.', fil: 'I-click ang Save Settings.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={9} title="Portal Settings">
              <IllusForm fields={5} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Open Settings', fil: 'Buksan ang Settings' }, type: 'start' },
          { label: { en: 'Edit name & tagline', fil: 'I-edit ang pangalan at tagline' }, type: 'step' },
          { label: { en: 'Upload logo', fil: 'Mag-upload ng logo' }, type: 'step' },
          { label: { en: 'Toggle features', fil: 'I-toggle ang features' }, type: 'step' },
          { label: { en: 'Save', fil: 'I-save' }, type: 'end' },
        ]} />
      </ModuleSection>
    </TipsRoleProvider>
  );
}
