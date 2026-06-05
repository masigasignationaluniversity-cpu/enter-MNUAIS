import {
  ModuleSection, Steps, Restriction, InfoBox, FlowChart, BranchFlow,
  PortalIllustration, IllusCards, IllusTable, IllusConsentList,
  IllusPlanOfStudy, IllusEvaluation, IllusForm, IllusBannerRequest, SubHead, TwoCol,
} from './GuideComponents';

export default function StudentGuide() {
  return (
    <>
      {/* ── 1. Dashboard ─────────────────────────────── */}
      <ModuleSection id="stu-dashboard" navIndex={1} title="Dashboard" titleFil="Dashboard" path="/student/dashboard">
        <Restriction
          en="Student only. All data is personal to your account — you cannot see other students' information."
          fil="Para sa Estudyante lamang. Lahat ng datos ay personal sa inyong account — hindi mo makikita ang impormasyon ng ibang mga estudyante."
        />
        <TwoCol
          left={
            <>
              <SubHead en="What it shows" fil="Ano ang ipinapakita" />
              <Steps items={[
                { en: 'Log in as a student. You are brought to your Dashboard.', fil: 'Mag-login bilang estudyante. Dadalhin ka sa inyong Dashboard.' },
                { en: 'View your stats: enrolled subjects this term, pending evaluations, cumulative GWA, and pending consents.', fil: 'Tingnan ang inyong mga stats: enrolled na asignatura ngayong termino, mga naghihintay na ebalwasyon, cumulative GWA, at mga naghihintay na consent.' },
                { en: 'See your Current Enrollment list — all officially enrolled subjects for this term.', fil: 'Tingnan ang inyong listahan ng Kasalukuyang Enrollment — lahat ng opisyal na enrolled na asignatura ngayong termino.' },
                { en: 'Check the Grade Status notice at the bottom to know if your grades are viewable.', fil: 'Suriin ang Grade Status notice sa ibaba para malaman kung nakikita na ang inyong mga grado.' },
                { en: 'Portal announcements appear at the top of your dashboard.', fil: 'Ang mga anunsyo ng portal ay lumalabas sa tuktok ng inyong dashboard.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={0} title="Student Dashboard">
              <IllusCards />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Login', fil: 'Mag-login' }, type: 'start' },
          { label: { en: 'View stats', fil: 'Tingnan ang stats' }, type: 'step' },
          { label: { en: 'Check enrollment', fil: 'Suriin ang enrollment' }, type: 'step' },
          { label: { en: 'Check grade status', fil: 'Suriin ang katayuan ng grado' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 2. Enlistment ────────────────────────────── */}
      <ModuleSection id="stu-enlistment" navIndex={2} title="Enlistment" titleFil="Enlistment" path="/student/enlistment">
        <Restriction
          en="Student only. The Enlistment window must be open. You cannot enlist in sections with scheduling conflicts. Prerequisites must be satisfied. Some sections require COI, Dept Consent, or OCS Consent before enlisting."
          fil="Para sa Estudyante lamang. Ang Enlistment window ay kailangang bukas. Hindi ka maaaring mag-enlist sa mga seksiyon na may salungatan sa iskedyul. Ang mga prerequisite ay kailangang natutugunan na. Ang ilang mga seksiyon ay nangangailangan ng COI, Dept Consent, o OCS Consent bago mag-enlist."
        />
        <TwoCol
          left={
            <>
              <SubHead en="How to enlist" fil="Paano mag-enlist" />
              <Steps items={[
                { en: 'Go to Enlistment when the window is open (check Dashboard for status).', fil: 'Pumunta sa Enlistment kapag bukas ang window (suriin ang Dashboard para sa katayuan).' },
                { en: 'Browse available course sections. Use search and filters (department, course code, time) to narrow results.', fil: 'Mag-browse ng mga available na seksiyon ng kurso. Gamitin ang paghahanap at mga filter (departamento, code ng kurso, oras) para paliitin ang mga resulta.' },
                { en: 'If a section requires consent (COI/Dept/OCS), request it first via My Consents BEFORE enlisting.', fil: 'Kung ang isang seksiyon ay nangangailangan ng consent (COI/Dept/OCS), hilingin ito muna sa pamamagitan ng My Consents BAGO mag-enlist.' },
                { en: 'Click "Add to Cart" on the sections you want to take.', fil: 'I-click ang "Add to Cart" sa mga seksiyon na gusto mong kunin.' },
                { en: 'View your cart — check for schedule conflicts and unit load.', fil: 'Tingnan ang inyong cart — suriin ang mga salungatan sa iskedyul at unit load.' },
                { en: 'Click "Submit Enlistment" to finalize your request.', fil: 'I-click ang "Submit Enlistment" para tapusin ang inyong kahilingan.' },
                { en: 'Wait for OCS to process official enrollment. Check your enrolled subjects on the Dashboard.', fil: 'Maghintay sa OCS na iproseso ang opisyal na enrollment. Suriin ang inyong mga enrolled na asignatura sa Dashboard.' },
              ]} />
              <InfoBox en="Adding to cart does NOT guarantee enrollment — OCS must process your enlistment to make it official." fil="Ang pagdaragdag sa cart ay HINDI naggigarantiya ng enrollment — kailangan iproseso ng OCS ang inyong enlistment para maging opisyal ito." />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={1} title="Enlistment">
              <IllusTable rows={4} cols={3} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Window opens', fil: 'Bumukas ang window' }, type: 'start' },
          { label: { en: 'Browse sections', fil: 'I-browse ang mga seksiyon' }, type: 'step' },
          { label: { en: 'Get consents', fil: 'Kumuha ng mga consent' }, type: 'step' },
          { label: { en: 'Add to cart', fil: 'Idagdag sa cart' }, type: 'step' },
          { label: { en: 'Submit', fil: 'Isumite' }, type: 'step' },
          { label: { en: 'OCS enrolls', fil: 'Nag-enroll ang OCS' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 3. Prerogatives ──────────────────────────── */}
      <ModuleSection id="stu-prerogatives" navIndex={3} title="Prerogatives" titleFil="Mga Prerogative" path="/student/prerogatives">
        <Restriction
          en="Student only. The Prerogative window must be open. Prerogatives are for sections that are full OR restricted. You cannot submit a prerogative if you are already enrolled in that section."
          fil="Para sa Estudyante lamang. Ang Prerogative window ay kailangang bukas. Ang mga prerogative ay para sa mga seksiyon na puno NA o naka-restrict. Hindi ka maaaring magsumite ng prerogative kung naka-enroll ka na sa seksiyong iyon."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Requesting a prerogative" fil="Paghiling ng prerogative" />
              <Steps items={[
                { en: 'Go to Prerogatives when the window is open.', fil: 'Pumunta sa Prerogatives kapag bukas ang window.' },
                { en: 'Search for the section you want to request a prerogative for.', fil: 'Hanapin ang seksiyon na gusto mong hilingin ang prerogative.' },
                { en: 'Click "Request Prerogative" and enter your reason for the request.', fil: 'I-click ang "Request Prerogative" at ilagay ang inyong dahilan para sa kahilingan.' },
                { en: 'The faculty assigned to that section will review and approve or deny your request.', fil: 'Ang gurong itinalaga sa seksiyong iyon ay susuriin at magaapruba o magtatanggal ng inyong kahilingan.' },
                { en: 'Track the status of your request in this same module.', fil: 'Subaybayan ang katayuan ng inyong kahilingan sa parehong module na ito.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={2} title="Prerogatives">
              <IllusConsentList />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <BranchFlow
          trigger={{ en: 'Submit prerogative request', fil: 'Magsumite ng prerogative request' }}
          condition={{ en: 'Faculty approves?', fil: 'Inaprubahan ng guro?' }}
          yes={{ en: 'Enrolled in section', fil: 'Naka-enroll sa seksiyon' }}
          no={{ en: 'Request denied', fil: 'Tinanggihan ang kahilingan' }}
        />
      </ModuleSection>

      {/* ── 4. My Consents ───────────────────────────── */}
      <ModuleSection id="stu-consent" navIndex={4} title="My Consents" titleFil="Aking mga Consent" path="/student/consent">
        <Restriction
          en="Student only. Only applicable to courses that require COI, Dept Consent, or OCS Consent. You must obtain all required consents BEFORE submitting your enlistment for that section."
          fil="Para sa Estudyante lamang. Naaangkop lamang sa mga kursong nangangailangan ng COI, Dept Consent, o OCS Consent. Kailangan mong makuha ang lahat ng kinakailangang consent BAGO isumite ang inyong enlistment para sa seksiyong iyon."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Requesting and tracking consents" fil="Paghiling at pagsubaybay ng mga consent" />
              <Steps items={[
                { en: 'Go to My Consents. You will see all your consent requests and their statuses.', fil: 'Pumunta sa My Consents. Makikita mo ang lahat ng iyong mga kahilingan sa consent at ang kanilang mga katayuan.' },
                { en: 'Click "Request Consent" to start a new request.', fil: 'I-click ang "Request Consent" para magsimula ng bagong kahilingan.' },
                { en: 'Select the section you need consent for, and the type (COI / Dept / OCS).', fil: 'Piliin ang seksiyon na kailangan mo ang consent, at ang uri (COI / Dept / OCS).' },
                { en: 'Enter a reason if required and submit.', fil: 'Ilagay ang dahilan kung kinakailangan at isumite.' },
                { en: 'Track the status: Pending → Approved / Denied.', fil: 'Subaybayan ang katayuan: Pending → Approved / Denied.' },
                { en: 'Once Approved, go to Enlistment to enlist in that section.', fil: 'Kapag Approved na, pumunta sa Enlistment para mag-enlist sa seksiyong iyon.' },
              ]} />
              <InfoBox en="COI is reviewed by Faculty, Dept Consent by the Dept Head, and OCS Consent by the OCS staff." fil="Ang COI ay sinusuri ng Guro, Dept Consent ng Pinuno ng Departamento, at OCS Consent ng OCS staff." />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={3} title="My Consents">
              <IllusConsentList />
            </PortalIllustration>
          }
        />
        <SubHead en="Consent Types" fil="Mga Uri ng Consent" />
        <FlowChart nodes={[
          { label: { en: 'COI = Faculty', fil: 'COI = Guro' }, type: 'step' },
          { label: { en: 'Dept = Dept Head', fil: 'Dept = Pinuno ng Dept' }, type: 'step' },
          { label: { en: 'OCS = OCS Staff', fil: 'OCS = OCS Staff' }, type: 'step' },
        ]} />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <BranchFlow
          trigger={{ en: 'Request consent for a section', fil: 'Humiling ng consent para sa seksiyon' }}
          condition={{ en: 'Consent approved?', fil: 'Inaprubahan ang consent?' }}
          yes={{ en: 'Go to Enlistment to enlist', fil: 'Pumunta sa Enlistment para mag-enlist' }}
          no={{ en: 'Cannot enlist — request again or choose another section', fil: 'Hindi maaaring mag-enlist — humiling ulit o pumili ng ibang seksiyon' }}
        />
      </ModuleSection>

      {/* ── 5. My Grades ─────────────────────────────── */}
      <ModuleSection id="stu-grades" navIndex={5} title="My Grades" titleFil="Aking mga Grado" path="/student/grades">
        <Restriction
          en="Student only. Grades are LOCKED until you complete ALL faculty evaluations for this term AND the faculty has submitted grades AND the admin has released them. No exceptions."
          fil="Para sa Estudyante lamang. Ang mga grado ay NAKA-LOCK hanggang hindi mo nakumpleto ang LAHAT ng ebalwasyon ng guro ngayong termino AT naisumite ng guro ang mga grado AT inilabas ng admin ang mga ito. Walang pagbubukod."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Viewing your grades" fil="Pagtingin sa inyong mga grado" />
              <Steps items={[
                { en: 'Go to My Grades.', fil: 'Pumunta sa My Grades.' },
                { en: 'Select the term from the dropdown to view grades for that semester.', fil: 'Piliin ang termino mula sa dropdown para makita ang mga grado para sa semestreng iyon.' },
                { en: 'If grades are locked, you will see a notice explaining why (pending evaluations or unreleased grades).', fil: 'Kung naka-lock ang mga grado, makikita mo ang isang abiso na nagpapaliwanag kung bakit (mga naghihintay na ebalwasyon o mga hindi pa inilalabasna grado).' },
                { en: 'Complete all faculty evaluations (SET module) if they are the blocking issue.', fil: 'Kumpletuhin ang lahat ng ebalwasyon ng guro (SET module) kung iyon ang humahadlang.' },
                { en: 'Once unlocked, view your grades, term GWA, and cumulative GWA.', fil: 'Kapag na-unlock na, tingnan ang inyong mga grado, term GWA, at cumulative GWA.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={4} title="My Grades">
              <IllusTable rows={4} cols={3} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <BranchFlow
          trigger={{ en: 'Open My Grades', fil: 'Buksan ang My Grades' }}
          condition={{ en: 'All evaluations done + grades released?', fil: 'Lahat ng ebalwasyon tapos + inilabas na ang mga grado?' }}
          yes={{ en: 'Grades visible', fil: 'Nakikita ang mga grado' }}
          no={{ en: 'Complete SET first', fil: 'Kumpletuhin muna ang SET' }}
        />
      </ModuleSection>

      {/* ── 6. Plan of Study ─────────────────────────── */}
      <ModuleSection id="stu-plan-of-study" navIndex={6} title="Plan of Study" titleFil="Plano ng Pag-aaral" path="/student/plan-of-study">
        <Restriction
          en="Student only. This is read-only for students — the content is managed by OCS. Contact OCS if you find any discrepancy in your required courses."
          fil="Para sa Estudyante lamang. Ito ay read-only para sa mga estudyante — ang nilalaman ay pinamamahalaan ng OCS. Makipag-ugnayan sa OCS kung may natagpuan kang pagkakaiba sa inyong mga kinakailangang kurso."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Reading your plan of study" fil="Pagbabasa ng inyong plano ng pag-aaral" />
              <Steps items={[
                { en: 'Go to Plan of Study.', fil: 'Pumunta sa Plan of Study.' },
                { en: 'You will see all required courses for your degree program organized by year level and semester.', fil: 'Makikita mo ang lahat ng kinakailangang kurso para sa inyong degree program na nakaayos ayon sa antas ng taon at semestre.' },
                { en: 'Courses you have passed show a green checkmark. Courses in progress show a yellow indicator.', fil: 'Ang mga kursong naipasa mo na ay nagpapakita ng green checkmark. Ang mga kurso sa proseso ay nagpapakita ng yellow indicator.' },
                { en: 'Track your total units completed vs. total required to graduate.', fil: 'Subaybayan ang inyong kabuuang units na nakumpleto kumpara sa kabuuang kailangan para mag-graduate.' },
                { en: 'Use Apply for Graduation button when all requirements are met.', fil: 'Gamitin ang Apply for Graduation button kapag natutugunan na ang lahat ng kinakailangan.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={5} title="Plan of Study">
              <IllusPlanOfStudy />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Open module', fil: 'Buksan ang module' }, type: 'start' },
          { label: { en: 'View by year/sem', fil: 'Tingnan sa taon/sem' }, type: 'step' },
          { label: { en: 'Check progress', fil: 'Suriin ang progreso' }, type: 'step' },
          { label: { en: 'All done?', fil: 'Lahat tapos?' }, type: 'decision' },
          { label: { en: 'Apply for Graduation', fil: 'Mag-apply para sa Graduation' }, type: 'success' },
          { label: { en: 'Continue studying', fil: 'Magpatuloy sa pag-aaral' }, type: 'reject' },
        ]} />
      </ModuleSection>

      {/* ── 7. Specialization ────────────────────────── */}
      <ModuleSection id="stu-specialization" navIndex={7} title="Specialization" titleFil="Espesyalisasyon" path="/student/specialization">
        <Restriction
          en="Student only. Only available if your degree program has defined specializations. You can only submit one specialization application — contact OCS to change after submission."
          fil="Para sa Estudyante lamang. Available lamang kung ang inyong degree program ay may mga tinukoy na espesyalisasyon. Maaari ka lamang magsumite ng isang aplikasyon sa espesyalisasyon — makipag-ugnayan sa OCS para baguhin pagkatapos ng pagsusumite."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Applying for specialization" fil="Pag-aplay para sa espesyalisasyon" />
              <Steps items={[
                { en: 'Go to Specialization.', fil: 'Pumunta sa Specialization.' },
                { en: 'View available specialization tracks for your degree program.', fil: 'Tingnan ang mga available na specialization track para sa inyong degree program.' },
                { en: 'Click on the track you want to apply for and review its required courses.', fil: 'I-click ang track na gusto mong i-apply at suriin ang mga kinakailangang kurso nito.' },
                { en: 'Select the specialization courses you plan to take.', fil: 'Piliin ang mga specialization na kurso na plano mong kunin.' },
                { en: 'Click "Apply" to submit your application to OCS for review.', fil: 'I-click ang "Apply" para isumite ang inyong aplikasyon sa OCS para sa pagsusuri.' },
                { en: 'Track your application status: Pending → Approved / Denied.', fil: 'Subaybayan ang katayuan ng inyong aplikasyon: Pending → Approved / Denied.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={6} title="Specialization">
              <IllusConsentList />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <BranchFlow
          trigger={{ en: 'Submit specialization application', fil: 'Isumite ang aplikasyon sa espesyalisasyon' }}
          condition={{ en: 'OCS approves plan?', fil: 'Inaprubahan ng OCS ang plano?' }}
          yes={{ en: 'Track activated for enrollment', fil: 'Nai-activate ang track para sa enrollment' }}
          no={{ en: 'Denied — revise and resubmit', fil: 'Tinanggihan — baguhin at muling isumite' }}
        />
      </ModuleSection>

      {/* ── 8. SET (Evaluation) ──────────────────────── */}
      <ModuleSection id="stu-evaluation" navIndex={8} title="SET — Faculty Evaluation" titleFil="SET — Ebalwasyon ng Guro" path="/student/evaluation">
        <Restriction
          en="Student only. The FIC Evaluation window must be open. You MUST complete all evaluations to unlock your grades. Responses are completely anonymous — your faculty will only see aggregated scores."
          fil="Para sa Estudyante lamang. Ang FIC Evaluation window ay kailangang bukas. KAILANGAN mong kumpletuhin ang lahat ng ebalwasyon para ma-unlock ang inyong mga grado. Ang mga sagot ay ganap na anonymous — ang inyong guro ay makikita lamang ang pinagsama-samang mga marka."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Completing faculty evaluation" fil="Pagkumpleto ng ebalwasyon ng guro" />
              <Steps items={[
                { en: 'Go to SET (Evaluation) when the FIC window is open.', fil: 'Pumunta sa SET (Evaluation) kapag bukas ang FIC window.' },
                { en: 'You will see a list of faculty/sections you must evaluate.', fil: 'Makikita mo ang listahan ng mga guro/seksiyon na dapat mong suriin.' },
                { en: 'Click on a faculty member to open the evaluation form for that section.', fil: 'I-click ang isang miyembro ng guro para buksan ang evaluation form para sa seksiyong iyon.' },
                { en: 'Rate each question on a scale (e.g. 1–5). Answer all questions.', fil: 'Markahan ang bawat tanong sa isang sukat (hal. 1–5). Sagutin ang lahat ng tanong.' },
                { en: 'Add optional open-ended comments in the text box.', fil: 'Magdagdag ng opsyonal na open-ended na mga komento sa text box.' },
                { en: 'Click Submit to complete that faculty\'s evaluation.', fil: 'I-click ang Submit para kumpletuhin ang ebalwasyon ng gurong iyon.' },
                { en: 'Repeat for all faculty on your list. Once all are done, your grades will be unlocked.', fil: 'Ulitin para sa lahat ng guro sa inyong listahan. Kapag lahat ay tapos na, ma-unlock ang inyong mga grado.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={7} title="SET Evaluation">
              <IllusEvaluation />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Window opens', fil: 'Bumukas ang window' }, type: 'start' },
          { label: { en: 'Open SET', fil: 'Buksan ang SET' }, type: 'step' },
          { label: { en: 'Rate each faculty', fil: 'Markahan ang bawat guro' }, type: 'step' },
          { label: { en: 'Submit each form', fil: 'Isumite ang bawat form' }, type: 'step' },
          { label: { en: 'All done', fil: 'Lahat tapos' }, type: 'step' },
          { label: { en: 'Grades unlocked', fil: 'Na-unlock ang mga grado' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 9. My Profile ────────────────────────────── */}
      <ModuleSection id="stu-profile" navIndex={9} title="My Profile" titleFil="Aking Profile" path="/student/profile">
        <Restriction
          en="Student only. Profile information (name, program, student number) is managed by Admin/OCS — you cannot edit it directly. Contact Admin for corrections."
          fil="Para sa Estudyante lamang. Ang impormasyon ng profile (pangalan, programa, numero ng estudyante) ay pinamamahalaan ng Admin/OCS — hindi mo ito maaaring direktang i-edit. Makipag-ugnayan sa Admin para sa mga pagwawasto."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Viewing your profile" fil="Pagtingin sa inyong profile" />
              <Steps items={[
                { en: 'Go to My Profile.', fil: 'Pumunta sa My Profile.' },
                { en: 'View your personal information: full name, student number, program, college, year level.', fil: 'Tingnan ang inyong personal na impormasyon: buong pangalan, numero ng estudyante, programa, kolehiyo, antas ng taon.' },
                { en: 'View your academic standing: current GWA, total units completed, academic status.', fil: 'Tingnan ang inyong akademikong katayuan: kasalukuyang GWA, kabuuang units na nakumpleto, akademikong katayuan.' },
                { en: 'View your enrollment history across all previous terms.', fil: 'Tingnan ang inyong kasaysayan ng enrollment sa lahat ng nakaraang termino.' },
                { en: 'If you need to change your password, use the change password option in your profile.', fil: 'Kung kailangan mong baguhin ang inyong password, gamitin ang opsyon sa pagpapalit ng password sa inyong profile.' },
              ]} />
              <InfoBox en="If your name, student number, or program information is incorrect, contact the Admin or OCS immediately." fil="Kung ang inyong pangalan, numero ng estudyante, o impormasyon ng programa ay mali, makipag-ugnayan agad sa Admin o OCS." />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={8} title="My Profile">
              <IllusForm fields={5} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Open My Profile', fil: 'Buksan ang My Profile' }, type: 'start' },
          { label: { en: 'View personal info', fil: 'Tingnan ang personal na impormasyon' }, type: 'step' },
          { label: { en: 'View academic standing', fil: 'Tingnan ang akademikong katayuan' }, type: 'step' },
          { label: { en: 'View enrollment history', fil: 'Tingnan ang kasaysayan ng enrollment' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 10. Appeal to Enlist – Permanent Disqualification ─ */}
      <ModuleSection id="stu-appeal-disq" navIndex={10}
        title="Appeal to Enlist — Permanent Disqualification"
        titleFil="Apela para Mag-enlist — Permanenteng Diskwalipikasyon"
        path="/student/banner-requests → Appeal to Enlist">
        <Restriction
          en="Student only. Only available to students who have been permanently disqualified from the university. This is a formal appeal — submission does NOT guarantee reinstatement. OCS reviews and decides each case. The Enlistment window must be open, and the appeal must be submitted before the deadline indicated by OCS."
          fil="Para sa Estudyante lamang. Available lamang sa mga estudyanteng permanenteng nadiskwalipika mula sa unibersidad. Ito ay isang pormal na apela — ang pagsusumite ay HINDI naggigarantiya ng muling pagkuha. Sinusuri at pinagpapasyahan ng OCS ang bawat kaso. Ang Enlistment window ay kailangang bukas, at ang apela ay kailangang isumite bago ang deadline na ipinahiwatig ng OCS."
        />
        <TwoCol
          left={
            <>
              <SubHead en="How to submit an appeal" fil="Paano magsumite ng apela" />
              <Steps items={[
                { en: 'Go to Banner Requests (accessible via the sidebar or Enlistment module).', fil: 'Pumunta sa Banner Requests (accessible sa pamamagitan ng sidebar o Enlistment module).' },
                { en: 'Click "New Request" and choose Appeal to Enlist with Permanent Disqualification.', fil: 'I-click ang "New Request" at piliin ang Appeal to Enlist with Permanent Disqualification.' },
                { en: 'Fill in your student number, name, and the term you are appealing for.', fil: 'Punan ang inyong numero ng estudyante, pangalan, at termino na inyong inaapela.' },
                { en: 'State clearly the grounds for your appeal in the Reason field. Attach supporting documents if the form allows.', fil: 'Malinaw na ilagay ang batayan ng inyong apela sa field na Dahilan. Mag-attach ng mga supporting na dokumento kung pinapayagan ng form.' },
                { en: 'Click Submit. You will receive a reference number for tracking.', fil: 'I-click ang Submit. Makakatanggap ka ng reference number para sa pagsubaybay.' },
                { en: 'Track the status of your appeal in the Banner Requests list: Pending → Approved / Denied.', fil: 'Subaybayan ang katayuan ng inyong apela sa listahan ng Banner Requests: Pending → Approved / Denied.' },
                { en: 'If approved, OCS will manually process your enrollment. Check your Dashboard.', fil: 'Kung inaprubahan, manu-manong ipoproseso ng OCS ang inyong enrollment. Suriin ang inyong Dashboard.' },
              ]} />
              <InfoBox
                en="A Permanent Disqualification (PD) is a serious academic standing — gather all supporting documents (medical certificates, clearances, letters of appeal, etc.) before submitting."
                fil="Ang Permanenteng Diskwalipikasyon (PD) ay isang seryosong akademikong katayuan — tipunin ang lahat ng supporting na dokumento (mga medikal na sertipiko, mga clearance, mga liham ng apela, atbp.) bago magsumite."
              />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={9} title="Appeal — Perm. Disqualification">
              <IllusBannerRequest requestType="Appeal to Enlist — PD" badge="#7f1d2e" />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Open Banner Requests', fil: 'Buksan ang Banner Requests' }, type: 'start' },
          { label: { en: 'Select PD Appeal type', fil: 'Piliin ang uri ng PD Appeal' }, type: 'step' },
          { label: { en: 'Fill form & reason', fil: 'Punan ang form at dahilan' }, type: 'step' },
          { label: { en: 'Attach documents', fil: 'Mag-attach ng mga dokumento' }, type: 'step' },
          { label: { en: 'Submit', fil: 'Isumite' }, type: 'step' },
          { label: { en: 'OCS reviews', fil: 'Sinusuri ng OCS' }, type: 'decision' },
          { label: { en: 'Enrolled', fil: 'Naka-enroll' }, type: 'success' },
          { label: { en: 'Denied', fil: 'Tinanggihan' }, type: 'reject' },
        ]} />
        <BranchFlow
          trigger={{ en: 'Appeal submitted to OCS', fil: 'Isinumite ang apela sa OCS' }}
          condition={{ en: 'Grounds sufficient?', fil: 'Sapat ba ang batayan?' }}
          yes={{ en: 'OCS approves — processes enrollment', fil: 'Inaprubahan ng OCS — ipinoproseso ang enrollment' }}
          no={{ en: 'Denied — student notified with reason', fil: 'Tinanggihan — inaabisuhan ang estudyante na may dahilan' }}
        />
      </ModuleSection>

      {/* ── 11. Request for Late Enrollment ──────────── */}
      <ModuleSection id="stu-late-enrollment" navIndex={11}
        title="Request for Late Enrollment"
        titleFil="Kahilingan para sa Huling Enrollment"
        path="/student/banner-requests → Late Enrollment">
        <Restriction
          en="Student only. Late enrollment requests are only accepted after the regular enrollment window has closed AND within the late enrollment period set by Admin. A valid reason is required. Approved late enrollees are still subject to late enrollment fees as set by the institution."
          fil="Para sa Estudyante lamang. Ang mga kahilingan para sa huling enrollment ay tinatanggap lamang pagkatapos masara ang regular na enrollment window AT sa loob ng late enrollment period na itinakda ng Admin. Kinakailangan ang isang wastong dahilan. Ang mga inaprobahang late enrollee ay napapailalim pa rin sa mga bayad sa late enrollment ayon sa itinakda ng institusyon."
        />
        <TwoCol
          left={
            <>
              <SubHead en="How to submit a late enrollment request" fil="Paano magsumite ng kahilingan para sa huling enrollment" />
              <Steps items={[
                { en: 'Go to Banner Requests in the sidebar.', fil: 'Pumunta sa Banner Requests sa sidebar.' },
                { en: 'Click "New Request" and select Request for Late Enrollment.', fil: 'I-click ang "New Request" at piliin ang Request for Late Enrollment.' },
                { en: 'Enter your student number, name, the term, and your intended course load.', fil: 'Ilagay ang inyong numero ng estudyante, pangalan, ang termino, at inyong nilalayon na course load.' },
                { en: 'Enter a clear and valid reason for missing the regular enrollment period (e.g. hospitalization, family emergency, delayed scholarship grant).', fil: 'Ilagay ang malinaw at wastong dahilan para sa pagkawala ng regular na enrollment period (hal. ospital, emerhensiya sa pamilya, naantala na scholarship grant).' },
                { en: 'Upload supporting documents in the attachment section.', fil: 'Mag-upload ng mga supporting na dokumento sa seksyon ng attachment.' },
                { en: 'Click Submit. You will receive a tracking number.', fil: 'I-click ang Submit. Makakatanggap ka ng tracking number.' },
                { en: 'OCS will review your request. If approved, you will be enrolled in your listed sections.', fil: 'Susuriin ng OCS ang inyong kahilingan. Kung inaprubahan, iko-enroll ka sa inyong mga nakalista na seksiyon.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={9} title="Late Enrollment Request">
              <IllusBannerRequest requestType="Late Enrollment Request" badge="#1e5c3a" />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Regular window closes', fil: 'Nagsara ang regular na window' }, type: 'start' },
          { label: { en: 'Select Late Enrollment', fil: 'Piliin ang Late Enrollment' }, type: 'step' },
          { label: { en: 'Fill reason & attach docs', fil: 'Punan ang dahilan at mag-attach ng docs' }, type: 'step' },
          { label: { en: 'Submit', fil: 'Isumite' }, type: 'step' },
          { label: { en: 'OCS reviews', fil: 'Sinusuri ng OCS' }, type: 'decision' },
          { label: { en: 'Enrolled late', fil: 'Naka-enroll nang huli' }, type: 'success' },
          { label: { en: 'Denied', fil: 'Tinanggihan' }, type: 'reject' },
        ]} />
        <BranchFlow
          trigger={{ en: 'Late enrollment request submitted', fil: 'Isinumite ang kahilingan sa late enrollment' }}
          condition={{ en: 'Within late period & valid reason?', fil: 'Nasa loob ng late period at wastong dahilan?' }}
          yes={{ en: 'OCS enrolls & notes late fee', fil: 'Ino-enroll ng OCS at binibigyang-pansin ang late fee' }}
          no={{ en: 'Request denied', fil: 'Tinanggihan ang kahilingan' }}
        />
      </ModuleSection>

      {/* ── 12. Change, Adding, Dropping (DRP) Request ── */}
      <ModuleSection id="stu-change-add-drop" navIndex={12}
        title="Change, Adding, Dropping (DRP) Request"
        titleFil="Kahilingan sa Pagpapalit, Pagdaragdag, Pag-drop (DRP)"
        path="/student/banner-requests → Change / Add / Drop">
        <Restriction
          en="Student only. The Change/Add/Drop window must be open (set by Admin in Term Control). You may only drop a subject if it does not violate minimum load requirements. Adding a subject requires an available slot in the target section. Dropping a subject is final and may affect your GWA computation for the term."
          fil="Para sa Estudyante lamang. Ang Change/Add/Drop window ay kailangang bukas (itinakda ng Admin sa Term Control). Maaari ka lamang mag-drop ng asignatura kung hindi nito nilalabag ang mga kinakailangan sa minimum na load. Ang pagdaragdag ng asignatura ay nangangailangan ng available na slot sa target na seksiyon. Ang pag-drop ng asignatura ay pangwakas at maaaring makaapekto sa inyong GWA computation para sa termino."
        />
        <TwoCol
          left={
            <>
              <SubHead en="How to submit a change/add/drop request" fil="Paano magsumite ng kahilingan sa pagpapalit/pagdaragdag/pag-drop" />
              <Steps items={[
                { en: 'Go to Banner Requests. Confirm the Change/Add/Drop window is open.', fil: 'Pumunta sa Banner Requests. Kumpirmahin na bukas ang Change/Add/Drop window.' },
                { en: 'Click "New Request" and select Change, Adding, Dropping (DRP) Request.', fil: 'I-click ang "New Request" at piliin ang Change, Adding, Dropping (DRP) Request.' },
                { en: 'Select your request type: Change section, Add subject, or Drop subject.', fil: 'Piliin ang uri ng inyong kahilingan: Palitan ang seksiyon, Dagdag na asignatura, o Mag-drop ng asignatura.' },
                { en: 'For Change: select current section and desired new section.', fil: 'Para sa Pagpapalit: piliin ang kasalukuyang seksiyon at ang ninanais na bagong seksiyon.' },
                { en: 'For Add: select the course/section you want to add to your load.', fil: 'Para sa Pagdaragdag: piliin ang kurso/seksiyon na gusto mong idagdag sa inyong load.' },
                { en: 'For Drop: select the enrolled subject you wish to drop and enter your reason.', fil: 'Para sa Pag-drop: piliin ang enrolled na asignatura na gusto mong i-drop at ilagay ang inyong dahilan.' },
                { en: 'Submit. OCS will review and process. Check Banner Requests for the status.', fil: 'Isumite. Susuriin at ipoproseso ng OCS. Suriin ang Banner Requests para sa katayuan.' },
              ]} />
              <InfoBox
                en="A DROP (DRP) grade will appear on your TOR for any subject you drop. Contact OCS to confirm the exact grade notation used by your institution."
                fil="Ang isang DROP (DRP) na grado ay lilitaw sa inyong TOR para sa anumang asignatura na inyong dine-drop. Makipag-ugnayan sa OCS para kumpirmahin ang eksaktong notasyon ng grado na ginagamit ng inyong institusyon."
              />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={9} title="Change / Add / Drop Request">
              <IllusBannerRequest requestType="Change / Add / Drop" badge="#92400e" />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow — Drop" fil="Daloy ng Proseso — Pag-drop" />
        <FlowChart nodes={[
          { label: { en: 'Open Banner Requests', fil: 'Buksan ang Banner Requests' }, type: 'start' },
          { label: { en: 'Select Drop type', fil: 'Piliin ang uri ng Drop' }, type: 'step' },
          { label: { en: 'Choose subject & reason', fil: 'Piliin ang asignatura at dahilan' }, type: 'step' },
          { label: { en: 'Submit', fil: 'Isumite' }, type: 'step' },
          { label: { en: 'OCS processes', fil: 'Ipinoproseso ng OCS' }, type: 'step' },
          { label: { en: 'DRP recorded', fil: 'Naitala ang DRP' }, type: 'end' },
        ]} />
        <BranchFlow
          trigger={{ en: 'Change/Add/Drop request submitted', fil: 'Isinumite ang kahilingan sa Change/Add/Drop' }}
          condition={{ en: 'Window open & requirements met?', fil: 'Bukas ang window at natutugunan ang mga kinakailangan?' }}
          yes={{ en: 'OCS approves & updates enrollment', fil: 'Inaprubahan ng OCS at ina-update ang enrollment' }}
          no={{ en: 'Denied — reason provided', fil: 'Tinanggihan — ibinigay ang dahilan' }}
        />
      </ModuleSection>
    </>
  );
}
