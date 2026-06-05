import {
  ModuleSection, Steps, Restriction, InfoBox, FlowChart, BranchFlow,
  PortalIllustration, IllusCards, IllusTable, IllusGradeGrid,
  IllusTimetable, IllusConsentList, IllusEvaluation, SubHead, TwoCol,
  TipsRoleProvider,
} from './GuideComponents';

export default function FacultyGuide() {
  return (
    <TipsRoleProvider role="faculty">
      {/* ── 1. Dashboard ─────────────────────────────── */}
      <ModuleSection id="fac-dashboard" navIndex={1} title="Dashboard" titleFil="Dashboard" path="/faculty/dashboard">
        <Restriction
          en="Faculty only. Stats and class list are scoped to your assigned sections in the active term."
          fil="Para sa Guro lamang. Ang mga stats at listahan ng klase ay nakasakop sa inyong itinalagang mga seksiyon sa aktibong termino."
        />
        <TwoCol
          left={
            <>
              <SubHead en="What it shows" fil="Ano ang ipinapakita" />
              <Steps items={[
                { en: 'Log in as Faculty. You are taken to the Dashboard.', fil: 'Mag-login bilang Guro. Dadalhin ka sa Dashboard.' },
                { en: 'View your stats: active sections, total students, average evaluation rating, grades submitted count.', fil: 'Tingnan ang inyong mga stats: aktibong seksiyon, kabuuang estudyante, average na rating ng ebalwasyon, bilang ng mga naipasang grado.' },
                { en: 'Scroll to My Classes to see all your assigned sections and their enrollment counts.', fil: 'Mag-scroll sa My Classes para makita ang lahat ng inyong mga itinalagang seksiyon at bilang ng kanilang enrollment.' },
                { en: 'View the Student Evaluations panel for a quick summary of ratings this term.', fil: 'Tingnan ang Student Evaluations panel para sa maikling buod ng mga rating ngayong termino.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={0} title="Faculty Dashboard">
              <IllusCards />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Login', fil: 'Mag-login' }, type: 'start' },
          { label: { en: 'View stats', fil: 'Tingnan ang stats' }, type: 'step' },
          { label: { en: 'Check classes', fil: 'Suriin ang mga klase' }, type: 'step' },
          { label: { en: 'Act on items', fil: 'Kumilos sa mga item' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 2. My Classes ────────────────────────────── */}
      <ModuleSection id="fac-classes" navIndex={2} title="My Classes" titleFil="Aking mga Klase" path="/faculty/classes">
        <Restriction
          en="Faculty only. Shows only sections assigned to you for the active term. Sections from previous terms are not shown here."
          fil="Para sa Guro lamang. Ipinapakita lamang ang mga seksiyon na itinalaga sa inyo para sa aktibong termino. Ang mga seksiyon mula sa mga nakaraang termino ay hindi ipinapakita dito."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Viewing your class roster" fil="Pagtingin sa inyong class roster" />
              <Steps items={[
                { en: 'Go to My Classes. See a list of all your sections this term.', fil: 'Pumunta sa My Classes. Makita ang listahan ng lahat ng inyong mga seksiyon ngayong termino.' },
                { en: 'Click on a section to see the full roster of enrolled students.', fil: 'I-click ang isang seksiyon para makita ang buong roster ng mga enrolled na estudyante.' },
                { en: 'View each student\'s name, student number, and enrollment status.', fil: 'Tingnan ang pangalan ng bawat estudyante, numero ng estudyante, at katayuan ng enrollment.' },
                { en: 'Use the Export button to download the class list as CSV for records.', fil: 'Gamitin ang Export button para i-download ang class list bilang CSV para sa mga rekord.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={1} title="My Classes">
              <IllusTable rows={5} cols={3} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Open My Classes', fil: 'Buksan ang My Classes' }, type: 'start' },
          { label: { en: 'Select section', fil: 'Piliin ang seksiyon' }, type: 'step' },
          { label: { en: 'View roster', fil: 'Tingnan ang roster' }, type: 'step' },
          { label: { en: 'Export CSV', fil: 'I-export ang CSV' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 3. My Timetable ──────────────────────────── */}
      <ModuleSection id="fac-timetable" navIndex={3} title="My Timetable" titleFil="Aking Iskedyul" path="/faculty/timetable">
        <Restriction
          en="Faculty only. Displays your teaching schedule for the active term only. Contact OCS if there are conflicts in your schedule."
          fil="Para sa Guro lamang. Ipinapakita ang inyong iskedyul sa pagtuturo para sa aktibong termino lamang. Makipag-ugnayan sa OCS kung may mga salungatan sa inyong iskedyul."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Using the timetable" fil="Paggamit ng iskedyul" />
              <Steps items={[
                { en: 'Go to My Timetable.', fil: 'Pumunta sa My Timetable.' },
                { en: 'You will see a weekly grid from Monday to Saturday.', fil: 'Makikita mo ang lingguhang grid mula Lunes hanggang Sabado.' },
                { en: 'Your sections appear as colored blocks at their assigned time and day.', fil: 'Ang inyong mga seksiyon ay lumalabas bilang mga may kulay na bloke sa kanilang itinalagang oras at araw.' },
                { en: 'Click on a block to see course code, section, room assignment, and student count.', fil: 'I-click ang isang bloke para makita ang code ng kurso, seksiyon, assignment ng silid, at bilang ng estudyante.' },
                { en: 'Lab sections are shown in a different color from lecture sections.', fil: 'Ang mga lab na seksiyon ay ipinapakita sa ibang kulay kaysa sa mga lecture na seksiyon.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={2} title="My Timetable">
              <IllusTimetable />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Open Timetable', fil: 'Buksan ang Timetable' }, type: 'start' },
          { label: { en: 'View weekly grid', fil: 'Tingnan ang lingguhang grid' }, type: 'step' },
          { label: { en: 'Click a block', fil: 'I-click ang isang bloke' }, type: 'step' },
          { label: { en: 'View section info', fil: 'Tingnan ang impormasyon ng seksiyon' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 4. Grade Encoding ────────────────────────── */}
      <ModuleSection id="fac-grades" navIndex={4} title="Grade Encoding" titleFil="Pag-encode ng Grado" path="/faculty/grades">
        <Restriction
          en="Faculty only. The Grade Submission window must be open (set by Admin in Term Control) before you can encode grades. Once submitted, grades cannot be changed without OCS intervention. Only faculty assigned to that section can encode its grades."
          fil="Para sa Guro lamang. Ang Grade Submission window ay kailangang bukas (itinakda ng Admin sa Term Control) bago ka makapag-encode ng mga grado. Kapag naisumite na, hindi na maaaring baguhin ang mga grado nang walang interbensyon ng OCS. Ang guro lamang na itinalaga sa seksiyong iyon ang maaaring mag-encode ng mga grado nito."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Encoding and submitting grades" fil="Pag-encode at pagsusumite ng mga grado" />
              <Steps items={[
                { en: 'Go to Grade Encoding. Verify the Grade Submission window is open.', fil: 'Pumunta sa Grade Encoding. I-verify na bukas ang Grade Submission window.' },
                { en: 'Select the section you want to grade from the dropdown.', fil: 'Piliin ang seksiyong gusto mong grado-an mula sa dropdown.' },
                { en: 'You will see a roster of enrolled students with grade input fields.', fil: 'Makikita mo ang roster ng mga enrolled na estudyante na may mga input field para sa grado.' },
                { en: 'Enter grades for each student. Supported values: 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0, INC, DRP, S, U.', fil: 'Ilagay ang mga grado para sa bawat estudyante. Mga tinatanggap na halaga: 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0, INC, DRP, S, U.' },
                { en: 'Review all entries carefully before submitting.', fil: 'Maingat na suriin ang lahat ng entry bago isumite.' },
                { en: 'Click "Submit Grades". A confirmation dialog will appear — confirm to finalize.', fil: 'I-click ang "Submit Grades". Lilitaw ang dialog ng kumpirmasyon — kumpirmahin para tapusin.' },
              ]} />
              <InfoBox en="Grades are only visible to students AFTER they complete all evaluations AND the admin releases them." fil="Ang mga grado ay makikita lamang ng mga estudyante PAGKATAPOS nilang kumpletuhin ang lahat ng ebalwasyon AT inilabas ng admin ang mga ito." />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={3} title="Grade Encoding">
              <IllusGradeGrid />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Window opens', fil: 'Bumukas ang window' }, type: 'start' },
          { label: { en: 'Select section', fil: 'Piliin ang seksiyon' }, type: 'step' },
          { label: { en: 'Input grades', fil: 'Ilagay ang mga grado' }, type: 'step' },
          { label: { en: 'Review roster', fil: 'Suriin ang roster' }, type: 'step' },
          { label: { en: 'Submit', fil: 'Isumite' }, type: 'step' },
          { label: { en: 'OCS receives', fil: 'Tatanggap ang OCS' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 5. Prerogatives ──────────────────────────── */}
      <ModuleSection id="fac-prerogatives" navIndex={5} title="Prerogatives" titleFil="Mga Prerogative" path="/faculty/prerogatives">
        <Restriction
          en="Faculty only. You can only act on prerogative requests for your own sections. The Prerogative window must be open for students to submit requests."
          fil="Para sa Guro lamang. Maaari ka lamang kumilos sa mga prerogative request para sa iyong sariling mga seksiyon. Ang Prerogative window ay kailangang bukas para makapag-submit ng mga kahilingan ang mga estudyante."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Reviewing prerogative requests" fil="Pagsusuri ng mga prerogative request" />
              <Steps items={[
                { en: 'Go to Prerogatives. See all pending requests for your sections.', fil: 'Pumunta sa Prerogatives. Makita ang lahat ng naghihintay na kahilingan para sa inyong mga seksiyon.' },
                { en: 'Click a request to view student details and the reason for the prerogative.', fil: 'I-click ang isang kahilingan para makita ang detalye ng estudyante at dahilan ng prerogative.' },
                { en: 'Check if the section still has available slots.', fil: 'Suriin kung mayroon pa ring available na slot ang seksiyon.' },
                { en: 'Click Approve to enroll the student despite slot restrictions.', fil: 'I-click ang Approve para mag-enroll ng estudyante kahit may mga paghihigpit sa slot.' },
                { en: 'Click Deny if the section is truly full or the student does not meet requirements.', fil: 'I-click ang Deny kung talagang puno ang seksiyon o hindi natutugunan ng estudyante ang mga kinakailangan.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={4} title="Prerogatives">
              <IllusConsentList />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <BranchFlow
          trigger={{ en: 'Student requests prerogative', fil: 'Estudyante humihiling ng prerogative' }}
          condition={{ en: 'Approved by faculty?', fil: 'Inaprubahan ng guro?' }}
          yes={{ en: 'Student enrolled in section', fil: 'Naka-enroll ang estudyante sa seksiyon' }}
          no={{ en: 'Request denied', fil: 'Tinanggihan ang kahilingan' }}
        />
      </ModuleSection>

      {/* ── 6. Consents (COI) ────────────────────────── */}
      <ModuleSection id="fac-consents" navIndex={6} title="Consents (COI)" titleFil="Mga Consent (COI)" path="/faculty/consents">
        <Restriction
          en="Faculty only. Consent of Instructor (COI) requests come only from courses you teach that have requiresCOI = true. You can only act on requests for your own sections."
          fil="Para sa Guro lamang. Ang mga kahilingan sa Consent of Instructor (COI) ay nagmumula lamang sa mga kursong tinuturuan mo na may requiresCOI = true. Maaari ka lamang kumilos sa mga kahilingan para sa iyong sariling mga seksiyon."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Reviewing COI requests" fil="Pagsusuri ng mga kahilingan sa COI" />
              <Steps items={[
                { en: 'Go to Consents. View pending COI requests for your sections.', fil: 'Pumunta sa Consents. Tingnan ang mga naghihintay na kahilingan sa COI para sa inyong mga seksiyon.' },
                { en: 'Click a request to see the student\'s name, ID, and reason for requesting COI.', fil: 'I-click ang isang kahilingan para makita ang pangalan, ID, at dahilan ng estudyante para sa kahilingan ng COI.' },
                { en: 'Click Approve to allow the student to enlist in your section.', fil: 'I-click ang Approve para payagan ang estudyante na mag-enlist sa inyong seksiyon.' },
                { en: 'Click Deny with a reason if appropriate.', fil: 'I-click ang Deny na may dahilan kung naaangkop.' },
                { en: 'Approved student can then proceed to enlist via the Enlistment module.', fil: 'Ang inaprobahang estudyante ay maaari nang mag-enlist sa pamamagitan ng Enlistment module.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={5} title="Consents (COI)">
              <IllusConsentList />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <BranchFlow
          trigger={{ en: 'Student requests COI', fil: 'Estudyante humihiling ng COI' }}
          condition={{ en: 'Faculty approves?', fil: 'Inaprubahan ng guro?' }}
          yes={{ en: 'Student can enlist', fil: 'Maaaring mag-enlist ang estudyante' }}
          no={{ en: 'Cannot enlist', fil: 'Hindi maaaring mag-enlist' }}
        />
      </ModuleSection>

      {/* ── 7. Removal/Completion ────────────────────── */}
      <ModuleSection id="fac-removal" navIndex={7} title="Removal / Completion" titleFil="Removal / Completion" path="/faculty/removal-grades">
        <Restriction
          en="Faculty only. Only applies to students who received an INC (Incomplete) or conditional grade in a previous term. A special removal/completion window must be open."
          fil="Para sa Guro lamang. Naaangkop lamang sa mga estudyanteng nakatanggap ng INC (Incomplete) o conditional na grado sa isang nakaraang termino. Ang espesyal na removal/completion window ay kailangang bukas."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Entering a removal or completion grade" fil="Paglalagay ng removal o completion na grado" />
              <Steps items={[
                { en: 'Go to Removal/Completion. See students with INC grades from your sections.', fil: 'Pumunta sa Removal/Completion. Tingnan ang mga estudyanteng may INC na grado mula sa inyong mga seksiyon.' },
                { en: 'Click the row for the student whose INC you are resolving.', fil: 'I-click ang row para sa estudyanteng ire-resolve ang INC.' },
                { en: 'Enter the removal exam grade or completion grade.', fil: 'Ilagay ang grado sa removal exam o completion na grado.' },
                { en: 'Click Save. The system computes the final grade based on the removal grade.', fil: 'I-click ang Save. Kinukuwenta ng sistema ang panghuling grado batay sa removal grade.' },
                { en: 'The INC is resolved and the student\'s academic record is updated.', fil: 'Nalutas ang INC at ang akademikong rekord ng estudyante ay naa-update.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={6} title="Removal / Completion">
              <IllusTable rows={4} cols={3} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'INC exists', fil: 'Mayroong INC' }, type: 'start' },
          { label: { en: 'Window opens', fil: 'Bumukas ang window' }, type: 'step' },
          { label: { en: 'Enter removal grade', fil: 'Ilagay ang removal grade' }, type: 'step' },
          { label: { en: 'System computes', fil: 'Kinukuwenta ng sistema' }, type: 'step' },
          { label: { en: 'INC resolved', fil: 'Nalutas ang INC' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 8. Student Evaluations ───────────────────── */}
      <ModuleSection id="fac-evaluations" navIndex={8} title="Student Evaluations" titleFil="Mga Ebalwasyon ng Estudyante" path="/faculty/evaluations">
        <Restriction
          en="Faculty only. Read-only — you cannot modify evaluation results. Responses are anonymous: you see aggregated scores only, not individual student responses."
          fil="Para sa Guro lamang. Read-only — hindi mo maaaring baguhin ang mga resulta ng ebalwasyon. Ang mga sagot ay anonymous: makikita mo lamang ang pinagsama-samang mga marka, hindi ang mga indibidwal na sagot ng estudyante."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Viewing your evaluations" fil="Pagtingin sa inyong mga ebalwasyon" />
              <Steps items={[
                { en: 'Go to Student Evaluations.', fil: 'Pumunta sa Student Evaluations.' },
                { en: 'Select the term (defaults to active term).', fil: 'Piliin ang termino (default ay aktibong termino).' },
                { en: 'View your overall average rating and per-question averages.', fil: 'Tingnan ang inyong pangkalahatang average na rating at mga average bawat tanong.' },
                { en: 'See response rate per section: how many enrolled students submitted evaluations.', fil: 'Tingnan ang response rate bawat seksiyon: ilang enrolled na estudyante ang nagsumite ng mga ebalwasyon.' },
                { en: 'Use section tabs to view ratings per individual section.', fil: 'Gamitin ang mga tab ng seksiyon para tingnan ang mga rating bawat indibidwal na seksiyon.' },
              ]} />
              <InfoBox en="Evaluation results become visible to you only after the FIC Evaluation window closes for the term." fil="Ang mga resulta ng ebalwasyon ay magiging visible sa inyo pagkatapos lamang masara ang FIC Evaluation window para sa termino." />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={7} title="Student Evaluations">
              <IllusEvaluation />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Window closes', fil: 'Nagsara ang window' }, type: 'start' },
          { label: { en: 'Select term', fil: 'Piliin ang termino' }, type: 'step' },
          { label: { en: 'View ratings', fil: 'Tingnan ang mga rating' }, type: 'step' },
          { label: { en: 'Check per section', fil: 'Suriin bawat seksiyon' }, type: 'step' },
          { label: { en: 'Use for improvement', fil: 'Gamitin para sa pagpapabuti' }, type: 'end' },
        ]} />
      </ModuleSection>
    </TipsRoleProvider>
  );
}
