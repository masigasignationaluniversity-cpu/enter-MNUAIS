import {
  ModuleSection, Steps, Restriction, InfoBox, FlowChart, BranchFlow,
  PortalIllustration, IllusCards, IllusTable, IllusConsentList,
  IllusPlanOfStudy, IllusBannerRequest, SubHead, TwoCol,
} from './GuideComponents';

export default function OCSGuide() {
  return (
    <>
      {/* ── 1. Dashboard ─────────────────────────────── */}
      <ModuleSection id="ocs-dashboard" navIndex={1} title="Dashboard" titleFil="Dashboard" path="/ocs/dashboard">
        <Restriction
          en="OCS staff only. Data is scoped to your assigned college — you will only see courses and sections within your college."
          fil="Para sa OCS staff lamang. Ang datos ay nakasakop sa inyong itinalagang kolehiyo — makikita lamang ang mga kurso at seksiyon sa loob ng inyong kolehiyo."
        />
        <TwoCol
          left={
            <>
              <SubHead en="What it shows" fil="Ano ang ipinapakita" />
              <Steps items={[
                { en: 'View your college\'s course count, active sections, pending and approved OCS consents.', fil: 'Tingnan ang bilang ng mga kurso ng inyong kolehiyo, aktibong seksiyon, at mga naghihintay at naaprobahang OCS consent.' },
                { en: 'Check the Active Term Sections panel for enrollment progress per section.', fil: 'Suriin ang Active Term Sections panel para sa progreso ng enrollment bawat seksiyon.' },
                { en: 'Review the Pending OCS Consents panel — act on these promptly.', fil: 'Suriin ang Pending OCS Consents panel — aksyunan ito nang maaga.' },
                { en: 'Welcome message and portal announcements appear above the stats.', fil: 'Ang mensahe ng pagbati at mga anunsyo ng portal ay lumalabas sa itaas ng mga stats.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={0} title="OCS Dashboard">
              <IllusCards />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Login as OCS', fil: 'Mag-login bilang OCS' }, type: 'start' },
          { label: { en: 'View stats', fil: 'Tingnan ang stats' }, type: 'step' },
          { label: { en: 'Check pending consents', fil: 'Suriin ang pending consents' }, type: 'step' },
          { label: { en: 'Monitor enrollment', fil: 'Subaybayan ang enrollment' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 2. Course Overview ───────────────────────── */}
      <ModuleSection id="ocs-course-overview" navIndex={2} title="Course Overview" titleFil="Pangkalahatang-tanaw ng Kurso" path="/ocs/course-overview">
        <Restriction
          en="OCS only. Read-only overview of all sections and their enrollment for the active term."
          fil="OCS lamang. Read-only na pangkalahatang-tanaw ng lahat ng seksiyon at kanilang enrollment para sa aktibong termino."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Using course overview" fil="Paggamit ng pangkalahatang-tanaw ng kurso" />
              <Steps items={[
                { en: 'Go to Course Overview to see all sections in the current term.', fil: 'Pumunta sa Course Overview para makita ang lahat ng seksiyon sa kasalukuyang termino.' },
                { en: 'Use the search bar to filter by course code, title, or faculty name.', fil: 'Gamitin ang search bar para mag-filter ayon sa code ng kurso, pamagat, o pangalan ng guro.' },
                { en: 'View enrollment count vs. capacity per section.', fil: 'Tingnan ang bilang ng enrollment kumpara sa kapasidad bawat seksiyon.' },
                { en: 'Click a section row to see enrolled students in that section.', fil: 'I-click ang isang row ng seksiyon para makita ang mga enrolled na estudyante doon.' },
              ]} />
              <InfoBox en="Course Overview is a monitoring tool only — editing is done in Courses and Sections." fil="Ang Course Overview ay isang tool sa pagmamanman lamang — ang pag-edit ay ginagawa sa Courses at Sections." />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={1} title="Course Overview">
              <IllusTable rows={5} cols={3} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Open module', fil: 'Buksan ang module' }, type: 'start' },
          { label: { en: 'Filter/search', fil: 'Mag-filter/search' }, type: 'step' },
          { label: { en: 'View section', fil: 'Tingnan ang seksiyon' }, type: 'step' },
          { label: { en: 'View enrolled students', fil: 'Tingnan ang enrolled na estudyante' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 3. Courses ───────────────────────────────── */}
      <ModuleSection id="ocs-courses" navIndex={3} title="Courses" titleFil="Mga Kurso" path="/ocs/courses">
        <Restriction
          en="OCS only. Courses are scoped to your college. Prerequisites and corequisites must already exist before linking. Lab units are additional to lecture units."
          fil="OCS lamang. Ang mga kurso ay nakasakop sa inyong kolehiyo. Ang mga prerequisite at corequisite ay kailangang mayroon na bago i-link. Ang lab units ay karagdagang bilang sa lecture units."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Adding a course" fil="Pagdaragdag ng kurso" />
              <Steps items={[
                { en: 'Click "Add Course".', fil: 'I-click ang "Add Course".' },
                { en: 'Fill in Course Code (e.g. FORE 100), Type (Lecture/Lab/PE/NSTP), Category.', fil: 'Punan ang Course Code (hal. FORE 100), Uri (Lecture/Lab/PE/NSTP), Kategorya.' },
                { en: 'Enter Course Title, Units, Lab Units (if any), Min Year Level.', fil: 'Ilagay ang Course Title, Units, Lab Units (kung mayroon), Pinakamababang Antas ng Taon.' },
                { en: 'Assign to a Department from your college.', fil: 'Italaga sa isang Departamento mula sa inyong kolehiyo.' },
                { en: 'Set consent requirements: COI, Dept Consent, OCS Consent.', fil: 'Itakda ang mga kinakailangan sa consent: COI, Dept Consent, OCS Consent.' },
                { en: 'Add prerequisites and corequisites if applicable.', fil: 'Magdagdag ng mga prerequisite at corequisite kung naaangkop.' },
                { en: 'Click Save.', fil: 'I-click ang Save.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={2} title="Courses">
              <IllusTable rows={4} cols={3} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Add Course', fil: 'Magdagdag ng Kurso' }, type: 'start' },
          { label: { en: 'Enter details', fil: 'Ilagay ang detalye' }, type: 'step' },
          { label: { en: 'Set consent flags', fil: 'Itakda ang consent flags' }, type: 'step' },
          { label: { en: 'Add prerequisites', fil: 'Magdagdag ng prerequisites' }, type: 'step' },
          { label: { en: 'Save', fil: 'I-save' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 4. Sections ──────────────────────────────── */}
      <ModuleSection id="ocs-sections" navIndex={4} title="Sections" titleFil="Mga Seksiyon" path="/ocs/sections">
        <Restriction
          en="OCS only. An active term must exist before creating sections. The course must already be in the system. Faculty must have been added as users."
          fil="OCS lamang. Ang isang aktibong termino ay kailangang mayroon na bago gumawa ng mga seksiyon. Ang kurso ay kailangang mayroon na sa sistema. Ang guro ay kailangang naidagdag na bilang gumagamit."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Creating a section" fil="Paggawa ng seksiyon" />
              <Steps items={[
                { en: 'Click "Add Section".', fil: 'I-click ang "Add Section".' },
                { en: 'Select the Course from the dropdown.', fil: 'Piliin ang Kurso mula sa dropdown.' },
                { en: 'Enter the Section Code (e.g. "A", "B", "LAB-01").', fil: 'Ilagay ang Section Code (hal. "A", "B", "LAB-01").' },
                { en: 'Assign a Faculty member.', fil: 'Mag-assign ng miyembro ng Guro.' },
                { en: 'Set schedule: Days (M/T/W/Th/F/S), Start Time, End Time, Room.', fil: 'Itakda ang iskedyul: Araw (M/T/W/Th/F/S), Oras ng Simula, Oras ng Pagtatapos, Silid.' },
                { en: 'Enter the slot count (maximum enrollment).', fil: 'Ilagay ang bilang ng slot (maximum na enrollment).' },
                { en: 'Click Save.', fil: 'I-click ang Save.' },
              ]} />
              <InfoBox en="You can edit schedule, faculty, and slots after creating the section, as long as enrollment hasn't started." fil="Maaari kang mag-edit ng iskedyul, guro, at slots pagkatapos gumawa ng seksiyon, basta ang enrollment ay hindi pa nagsisimula." />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={3} title="Sections">
              <IllusTable rows={4} cols={3} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Select term', fil: 'Piliin ang termino' }, type: 'start' },
          { label: { en: 'Add Section', fil: 'Magdagdag ng Seksiyon' }, type: 'step' },
          { label: { en: 'Assign course & faculty', fil: 'Italaga ang kurso at guro' }, type: 'step' },
          { label: { en: 'Set schedule & slots', fil: 'Itakda ang iskedyul at slots' }, type: 'step' },
          { label: { en: 'Save', fil: 'I-save' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 5. OCS Consents ──────────────────────────── */}
      <ModuleSection id="ocs-consents" navIndex={5} title="OCS Consents" titleFil="Mga OCS Consent" path="/ocs/consents">
        <Restriction
          en="OCS only. Only shows consent requests for sections within your assigned college. Consents appear only when the course has requiresOCSConsent = true."
          fil="OCS lamang. Ipinapakita lamang ang mga kahilingan sa consent para sa mga seksiyon sa loob ng inyong itinalagang kolehiyo. Lumalabas ang mga consent kapag ang kurso ay may requiresOCSConsent = true."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Processing OCS consents" fil="Pagproseso ng mga OCS consent" />
              <Steps items={[
                { en: 'Go to OCS Consents. See all pending requests sorted by date.', fil: 'Pumunta sa OCS Consents. Makita ang lahat ng mga naghihintay na kahilingan na nakaayos ayon sa petsa.' },
                { en: 'Click on a request to see student details: name, section, course.', fil: 'I-click ang isang kahilingan para makita ang detalye ng estudyante: pangalan, seksiyon, kurso.' },
                { en: 'Review the student\'s reason (if any).', fil: 'Suriin ang dahilan ng estudyante (kung mayroon).' },
                { en: 'Click "Approve" to allow the student to enlist in that section.', fil: 'I-click ang "Approve" para payagan ang estudyante na mag-enlist sa seksiyong iyon.' },
                { en: 'Click "Deny" to reject the request. Optionally enter a reason.', fil: 'I-click ang "Deny" para tanggihan ang kahilingan. Opsyonal na ilagay ang dahilan.' },
                { en: 'The student is notified of the decision via their My Consents page.', fil: 'Inaabisuhan ang estudyante ng desisyon sa pamamagitan ng kanilang My Consents page.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={4} title="OCS Consents">
              <IllusConsentList />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <BranchFlow
          trigger={{ en: 'Student requests OCS Consent', fil: 'Estudyante humihiling ng OCS Consent' }}
          condition={{ en: 'Approved by OCS?', fil: 'Inaprubahan ng OCS?' }}
          yes={{ en: 'Student can enlist', fil: 'Maaaring mag-enlist ang estudyante' }}
          no={{ en: 'Request denied', fil: 'Tinanggihan ang kahilingan' }}
        />
      </ModuleSection>

      {/* ── 6. Students ──────────────────────────────── */}
      <ModuleSection id="ocs-students" navIndex={6} title="Students" titleFil="Mga Estudyante" path="/ocs/students">
        <Restriction
          en="OCS only. Scoped to your college — you only see students enrolled in programs under your college."
          fil="OCS lamang. Nakasakop sa inyong kolehiyo — makikita lamang ang mga estudyanteng naka-enroll sa mga programa sa ilalim ng inyong kolehiyo."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Viewing student records" fil="Pagtingin sa mga rekord ng estudyante" />
              <Steps items={[
                { en: 'Go to Students. Search by name or student number.', fil: 'Pumunta sa Students. Maghanap ayon sa pangalan o numero ng estudyante.' },
                { en: 'Click on a student to view their academic record.', fil: 'I-click ang isang estudyante para makita ang kanilang akademikong rekord.' },
                { en: 'View enrollment history, GWA, grades per term, plan of study progress.', fil: 'Tingnan ang kasaysayan ng enrollment, GWA, grado bawat termino, progreso ng plan of study.' },
                { en: 'Use export options to download TOR or grade summary.', fil: 'Gamitin ang mga opsyon sa pag-export para i-download ang TOR o buod ng grado.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={5} title="Students">
              <IllusTable rows={4} cols={3} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Search student', fil: 'Maghanap ng estudyante' }, type: 'start' },
          { label: { en: 'Open record', fil: 'Buksan ang rekord' }, type: 'step' },
          { label: { en: 'Review grades & history', fil: 'Suriin ang mga grado at kasaysayan' }, type: 'step' },
          { label: { en: 'Export if needed', fil: 'I-export kung kailangan' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 7. Grade & Enrollment ────────────────────── */}
      <ModuleSection id="ocs-grade-management" navIndex={7} title="Grade & Enrollment" titleFil="Grado at Enrollment" path="/ocs/grade-management">
        <Restriction
          en="OCS only. Grade changes require the grade submission window to be open OR can be overridden by OCS with justification. Enrollment changes (add/drop) must be within the enrollment or change-drop window."
          fil="OCS lamang. Ang mga pagbabago sa grado ay nangangailangan ng bukas na window ng pagsusumite ng grado O maaaring i-override ng OCS na may katwiran. Ang mga pagbabago sa enrollment (add/drop) ay dapat nasa loob ng window ng enrollment o change-drop."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Managing grades" fil="Pamamahala ng mga grado" />
              <Steps items={[
                { en: 'Go to Grade & Enrollment. Select a term and section.', fil: 'Pumunta sa Grade & Enrollment. Pumili ng termino at seksiyon.' },
                { en: 'View the grade roster for that section.', fil: 'Tingnan ang grade roster para sa seksiyong iyon.' },
                { en: 'To override a grade: click the grade cell, enter the new grade, save with justification.', fil: 'Para mag-override ng grado: i-click ang grade cell, ilagay ang bagong grado, i-save na may katwiran.' },
                { en: 'To enroll a student manually: click "Add Enrollment", search student, select section, confirm.', fil: 'Para manu-manong mag-enroll ng estudyante: i-click ang "Add Enrollment", maghanap ng estudyante, piliin ang seksiyon, kumpirmahin.' },
                { en: 'To drop a student: find their enrollment, click Drop, confirm.', fil: 'Para mag-drop ng estudyante: hanapin ang kanilang enrollment, i-click ang Drop, kumpirmahin.' },
                { en: 'To process an INC: set the grade as Incomplete; enter it in Removal/Completion when resolved.', fil: 'Para iproseso ang isang INC: itakda ang grado bilang Incomplete; ilagay ito sa Removal/Completion kapag nalutas na.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={6} title="Grade & Enrollment">
              <IllusTable rows={5} cols={3} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow (Grade Override)" fil="Daloy ng Proseso (Grade Override)" />
        <FlowChart nodes={[
          { label: { en: 'Select section', fil: 'Piliin ang seksiyon' }, type: 'start' },
          { label: { en: 'Find student', fil: 'Hanapin ang estudyante' }, type: 'step' },
          { label: { en: 'Edit grade', fil: 'I-edit ang grado' }, type: 'step' },
          { label: { en: 'Enter justification', fil: 'Ilagay ang katwiran' }, type: 'step' },
          { label: { en: 'Save override', fil: 'I-save ang override' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 8. Plan of Study ─────────────────────────── */}
      <ModuleSection id="ocs-plan-of-study" navIndex={8} title="Plan of Study" titleFil="Plano ng Pag-aaral" path="/ocs/plan-of-study">
        <Restriction
          en="OCS only. Setting up the plan of study requires knowing the degree program's required courses. Incorrect setup may affect graduation eligibility checks."
          fil="OCS lamang. Ang pag-set up ng plano ng pag-aaral ay nangangailangan ng kaalaman sa mga kinakailangang kurso ng programa. Ang maling pag-set up ay maaaring makaapekto sa pagsusuri ng kwalipikasyon sa graduation."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Configuring plan of study" fil="Pag-configure ng plano ng pag-aaral" />
              <Steps items={[
                { en: 'Go to Plan of Study. Select a Degree Program from the dropdown.', fil: 'Pumunta sa Plan of Study. Piliin ang Degree Program mula sa dropdown.' },
                { en: 'Add required courses for each year level and semester.', fil: 'Magdagdag ng mga kinakailangang kurso para sa bawat antas ng taon at semestre.' },
                { en: 'Mark each course as required or elective.', fil: 'Markahan ang bawat kurso bilang required o elective.' },
                { en: 'Students can now track their progress against this plan.', fil: 'Maaari nang subaybayan ng mga estudyante ang kanilang progreso laban sa planong ito.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={7} title="Plan of Study">
              <IllusPlanOfStudy />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Select program', fil: 'Piliin ang programa' }, type: 'start' },
          { label: { en: 'Add courses', fil: 'Magdagdag ng kurso' }, type: 'step' },
          { label: { en: 'Set year/sem', fil: 'Itakda ang taon/sem' }, type: 'step' },
          { label: { en: 'Mark required/elective', fil: 'Markahan bilang required/elective' }, type: 'step' },
          { label: { en: 'Save plan', fil: 'I-save ang plano' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 9. Specialization ────────────────────────── */}
      <ModuleSection id="ocs-specialization" navIndex={9} title="Specialization" titleFil="Espesyalisasyon" path="/ocs/specialization">
        <Restriction
          en="OCS only. You can only approve requests from students in programs under your college. Student must have submitted their specialization application first."
          fil="OCS lamang. Maaari lamang kang mag-apruba ng mga kahilingan mula sa mga estudyanteng nasa mga programa sa ilalim ng inyong kolehiyo. Ang estudyante ay kailangang nagsumite muna ng kanilang aplikasyon sa espesyalisasyon."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Reviewing specialization requests" fil="Pagsusuri ng mga kahilingan sa espesyalisasyon" />
              <Steps items={[
                { en: 'Go to Specialization. See all pending student applications.', fil: 'Pumunta sa Specialization. Tingnan ang lahat ng naghihintay na aplikasyon ng estudyante.' },
                { en: 'Click a request to see the student\'s proposed specialization/track and course plan.', fil: 'I-click ang isang kahilingan para makita ang iminumungkahing espesyalisasyon/track at plano ng kurso ng estudyante.' },
                { en: 'Review the proposed courses against your program requirements.', fil: 'Suriin ang mga iminumungkahing kurso laban sa mga kinakailangan ng inyong programa.' },
                { en: 'Click Approve or Deny. Add remarks if denying.', fil: 'I-click ang Approve o Deny. Magdagdag ng mga pangungusap kung tinatanggihan.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={8} title="Specialization">
              <IllusConsentList />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <BranchFlow
          trigger={{ en: 'Student submits specialization', fil: 'Estudyante nagsumite ng espesyalisasyon' }}
          condition={{ en: 'Plan meets requirements?', fil: 'Natutugunan ng plano ang mga kinakailangan?' }}
          yes={{ en: 'Approved — student notified', fil: 'Inaprubahan — inaabisuhan ang estudyante' }}
          no={{ en: 'Denied with remarks', fil: 'Tinanggihan na may mga pangungusap' }}
        />
      </ModuleSection>

      {/* ── 10. Graduation Applications ──────────────── */}
      <ModuleSection id="ocs-graduation" navIndex={10} title="Graduation Applications" titleFil="Mga Aplikasyon sa Graduation" path="/ocs/graduation-applications">
        <Restriction
          en="OCS only. Student must meet minimum GWA, required units, and have no pending incomplete grades. Graduation settings (GWA, units) must be configured by Admin first."
          fil="OCS lamang. Ang estudyante ay kailangang natutugunan ang minimum na GWA, kinakailangang units, at walang naghihintay na incomplete na grado. Ang mga setting ng graduation (GWA, units) ay kailangang i-configure ng Admin muna."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Processing graduation applications" fil="Pagproseso ng mga aplikasyon sa graduation" />
              <Steps items={[
                { en: 'Go to Graduation Applications. See all pending student applications.', fil: 'Pumunta sa Graduation Applications. Tingnan ang lahat ng naghihintay na aplikasyon ng estudyante.' },
                { en: 'Click an application to review student\'s records: GWA, units completed, course completion.', fil: 'I-click ang isang aplikasyon para suriin ang mga rekord ng estudyante: GWA, natapos na units, pagkumpleto ng kurso.' },
                { en: 'Verify eligibility against the Graduation Settings configured by Admin.', fil: 'I-verify ang kwalipikasyon laban sa Graduation Settings na na-configure ng Admin.' },
                { en: 'Click Approve to recommend for graduation, or Deny with remarks.', fil: 'I-click ang Approve para irekomenda para sa graduation, o Deny na may mga pangungusap.' },
                { en: 'Approved students appear in the graduation list.', fil: 'Ang mga inaprobahang estudyante ay lumalabas sa listahan ng graduation.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={9} title="Graduation Applications">
              <IllusConsentList />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <BranchFlow
          trigger={{ en: 'Student applies for graduation', fil: 'Estudyante nag-aplay para sa graduation' }}
          condition={{ en: 'Meets eligibility?', fil: 'Natutugunan ang kwalipikasyon?' }}
          yes={{ en: 'Approved for graduation', fil: 'Inaprubahan para sa graduation' }}
          no={{ en: 'Denied — inform student', fil: 'Tinanggihan — ipaalam sa estudyante' }}
        />
      </ModuleSection>

      {/* ── 11. Reconsideration ──────────────────────── */}
      <ModuleSection id="ocs-reconsideration" navIndex={11} title="Reconsideration" titleFil="Muling Pagsasaalang-alang" path="/ocs/reconsideration">
        <Restriction
          en="OCS only. Students can only submit reconsideration after grades have been released. Each reconsideration must be decided before the deadline set by Admin."
          fil="OCS lamang. Ang mga estudyante ay maaari lamang magsumite ng muling pagsasaalang-alang pagkatapos mailabas ang mga grado. Ang bawat muling pagsasaalang-alang ay dapat mapagdesisyunan bago ang deadline na itinakda ng Admin."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Handling reconsideration requests" fil="Paghawak ng mga kahilingan sa muling pagsasaalang-alang" />
              <Steps items={[
                { en: 'Go to Reconsideration. View all pending requests with student name, course, grade.', fil: 'Pumunta sa Reconsideration. Tingnan ang lahat ng naghihintay na kahilingan kasama ang pangalan ng estudyante, kurso, grado.' },
                { en: 'Click a request to read the student\'s reason for appeal.', fil: 'I-click ang isang kahilingan para basahin ang dahilan ng apela ng estudyante.' },
                { en: 'Coordinate with the concerned faculty for clarification if needed.', fil: 'Makipag-ugnayan sa may-kaugnayan na guro para sa paglilinaw kung kinakailangan.' },
                { en: 'If approved: enter the updated grade and save.', fil: 'Kung inaprubahan: ilagay ang na-update na grado at i-save.' },
                { en: 'If denied: click Deny and enter the reason.', fil: 'Kung tinanggihan: i-click ang Deny at ilagay ang dahilan.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={10} title="Reconsideration">
              <IllusConsentList />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <BranchFlow
          trigger={{ en: 'Student requests reconsideration', fil: 'Estudyante humihiling ng muling pagsasaalang-alang' }}
          condition={{ en: 'Request upheld?', fil: 'Tinanggap ang kahilingan?' }}
          yes={{ en: 'Update grade in system', fil: 'I-update ang grado sa sistema' }}
          no={{ en: 'Deny with reason', fil: 'Tanggihan na may dahilan' }}
        />
      </ModuleSection>

      {/* ── 12. Change & Drop ────────────────────────── */}
      <ModuleSection id="ocs-change-drop" navIndex={12} title="Change & Drop" titleFil="Pagpapalit at Pag-drop" path="/ocs/change-drop">
        <Restriction
          en="OCS only. Requests are only accepted within the Change & Drop window set in Term Control. Dropping a subject may affect a student's Load and eligibility."
          fil="OCS lamang. Ang mga kahilingan ay tinatanggap lamang sa loob ng Change & Drop window na itinakda sa Term Control. Ang pag-drop ng isang asignatura ay maaaring makaapekto sa Load ng estudyante at kwalipikasyon."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Processing change and drop requests" fil="Pagproseso ng mga kahilingan sa pagpapalit at pag-drop" />
              <Steps items={[
                { en: 'Go to Change & Drop. View all pending requests.', fil: 'Pumunta sa Change & Drop. Tingnan ang lahat ng naghihintay na kahilingan.' },
                { en: 'Click a request to view details: student name, current section, requested section (for change) or subject (for drop).', fil: 'I-click ang isang kahilingan para makita ang mga detalye: pangalan ng estudyante, kasalukuyang seksiyon, hiniling na seksiyon (para sa pagpapalit) o asignatura (para sa pag-drop).' },
                { en: 'Verify slot availability if it\'s a change request.', fil: 'I-verify ang availability ng slot kung ito ay kahilingan sa pagpapalit.' },
                { en: 'Click Approve. The enrollment record is updated automatically.', fil: 'I-click ang Approve. Ang rekord ng enrollment ay awtomatikong naa-update.' },
                { en: 'Click Deny with a reason if not approved.', fil: 'I-click ang Deny na may dahilan kung hindi inaprubahan.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={11} title="Change & Drop">
              <IllusConsentList />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <BranchFlow
          trigger={{ en: 'Student submits request', fil: 'Estudyante nagsumite ng kahilingan' }}
          condition={{ en: 'Within window & slots available?', fil: 'Nasa loob ng window at available ang slots?' }}
          yes={{ en: 'Approve & update enrollment', fil: 'Aprubahan at i-update ang enrollment' }}
          no={{ en: 'Deny request', fil: 'Tanggihan ang kahilingan' }}
        />
      </ModuleSection>

      {/* ── 13. Appeal to Enlist – PD (OCS side) ──────── */}
      <ModuleSection id="ocs-appeal-disq" navIndex={13}
        title="Process: Appeal to Enlist — Permanent Disqualification"
        titleFil="Pagproseso: Apela para Mag-enlist — Permanenteng Diskwalipikasyon"
        path="/ocs/banner-requests → PD Appeals">
        <Restriction
          en="OCS only. Only students flagged with a Permanent Disqualification (PD) academic standing will appear in this queue. Each appeal is a formal request — decisions must be documented and must comply with university academic policies."
          fil="OCS lamang. Ang mga estudyante lamang na may Permanenteng Diskwalipikasyon (PD) na akademikong katayuan ang lilitaw sa queue na ito. Ang bawat apela ay isang pormal na kahilingan — ang mga desisyon ay kailangang idokumento at kailangang sumunod sa mga patakaran ng unibersidad."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Reviewing a PD appeal" fil="Pagsusuri ng isang apela sa PD" />
              <Steps items={[
                { en: 'Go to Banner Requests → PD Appeal queue. View all pending submissions.', fil: 'Pumunta sa Banner Requests → PD Appeal queue. Tingnan ang lahat ng naghihintay na pagsusumite.' },
                { en: 'Click an appeal to open the full details: student name, student number, term applied for, stated grounds, and attached documents.', fil: 'I-click ang isang apela para buksan ang buong mga detalye: pangalan ng estudyante, numero ng estudyante, termino na inilapat, nakasaad na batayan, at mga attached na dokumento.' },
                { en: 'Review the student\'s academic history and verify the PD status is valid.', fil: 'Suriin ang akademikong kasaysayan ng estudyante at i-verify na valid ang PD status.' },
                { en: 'Consult the Dean or University Registrar as needed per institutional policy.', fil: 'Kumonsulta sa Dean o University Registrar kung kinakailangan ayon sa patakaran ng institusyon.' },
                { en: 'Click Approve to reinstate enlistment privileges. Enter your decision notes.', fil: 'I-click ang Approve para ibalik ang mga pribilehiyo sa enlistment. Ilagay ang inyong mga tala ng desisyon.' },
                { en: 'Click Deny to reject. Enter the reason. The student will be notified.', fil: 'I-click ang Deny para tanggihan. Ilagay ang dahilan. Inaabisuhan ang estudyante.' },
                { en: 'If approved, manually enroll the student in the requested sections from Grade & Enrollment.', fil: 'Kung inaprubahan, manu-manong i-enroll ang estudyante sa mga hiniling na seksiyon mula sa Grade & Enrollment.' },
              ]} />
              <InfoBox
                en="PD appeals must be decided within the late enrollment window. Approved cases require manual enrollment by OCS — students cannot self-enlist after a PD."
                fil="Ang mga apela sa PD ay kailangang mapagpasyahan sa loob ng late enrollment window. Ang mga inaprobahang kaso ay nangangailangan ng manu-manong enrollment ng OCS — ang mga estudyante ay hindi maaaring mag-self-enlist pagkatapos ng isang PD."
              />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={12} title="PD Appeal — OCS Review">
              <IllusBannerRequest requestType="PD Appeal Review" badge="#7f1d2e" />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Appeal received', fil: 'Natanggap ang apela' }, type: 'start' },
          { label: { en: 'Review docs', fil: 'Suriin ang docs' }, type: 'step' },
          { label: { en: 'Check academic history', fil: 'Suriin ang akademikong kasaysayan' }, type: 'step' },
          { label: { en: 'Consult Dean/Registrar', fil: 'Kumonsulta sa Dean/Registrar' }, type: 'step' },
          { label: { en: 'Grounds valid?', fil: 'Valid ba ang batayan?' }, type: 'decision' },
          { label: { en: 'Approve & enroll manually', fil: 'Aprubahan at manu-manong i-enroll' }, type: 'success' },
          { label: { en: 'Deny with reason', fil: 'Tanggihan na may dahilan' }, type: 'reject' },
        ]} />
        <BranchFlow
          trigger={{ en: 'PD appeal submitted by student', fil: 'Isinumite ng estudyante ang apela sa PD' }}
          condition={{ en: 'Appeal upheld by OCS/Dean?', fil: 'Tinanggap ng OCS/Dean ang apela?' }}
          yes={{ en: 'Reinstate & manually enroll', fil: 'Ibalik at manu-manong i-enroll' }}
          no={{ en: 'Deny — student advised to reapply next term', fil: 'Tanggihan — pinapayuhan ang estudyante na mag-aplay muli sa susunod na termino' }}
        />
      </ModuleSection>

      {/* ── 14. Late Enrollment (OCS side) ────────────── */}
      <ModuleSection id="ocs-late-enrollment" navIndex={14}
        title="Process: Request for Late Enrollment"
        titleFil="Pagproseso: Kahilingan para sa Huling Enrollment"
        path="/ocs/banner-requests → Late Enrollment">
        <Restriction
          en="OCS only. Late enrollment requests are only valid within the late enrollment window configured in Term Control. The student must present a justifiable reason. Late fees assessed by the institution apply to all approved late enrollees."
          fil="OCS lamang. Ang mga kahilingan para sa late enrollment ay valid lamang sa loob ng late enrollment window na na-configure sa Term Control. Ang estudyante ay kailangang magpakita ng makatarungang dahilan. Ang mga late fee na tinatasa ng institusyon ay naaangkop sa lahat ng inaprobahang late enrollee."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Processing a late enrollment request" fil="Pagproseso ng isang kahilingan sa late enrollment" />
              <Steps items={[
                { en: 'Go to Banner Requests → Late Enrollment queue.', fil: 'Pumunta sa Banner Requests → Late Enrollment queue.' },
                { en: 'Click a request. Review: student name, reason for lateness, intended load, supporting documents.', fil: 'I-click ang isang kahilingan. Suriin ang: pangalan ng estudyante, dahilan ng pagkaantala, nilalayon na load, mga supporting na dokumento.' },
                { en: 'Verify the documents support the stated reason (e.g. medical certificate matches the enrollment dates).', fil: 'I-verify na sinusuportahan ng mga dokumento ang nakasaad na dahilan (hal. ang medical certificate ay naaayon sa mga petsa ng enrollment).' },
                { en: 'Confirm the requested sections have available slots.', fil: 'Kumpirmahin na ang mga hiniling na seksiyon ay may available na slot.' },
                { en: 'Click Approve. OCS then processes enrollment from Grade & Enrollment.', fil: 'I-click ang Approve. Pagkatapos ay ipinoproseso ng OCS ang enrollment mula sa Grade & Enrollment.' },
                { en: 'Note the late fee in the student\'s record as required by institutional policy.', fil: 'Tandaan ang late fee sa rekord ng estudyante ayon sa kinakailangan ng patakaran ng institusyon.' },
                { en: 'Click Deny with a reason if the request does not meet requirements.', fil: 'I-click ang Deny na may dahilan kung hindi natutugunan ng kahilingan ang mga kinakailangan.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={12} title="Late Enrollment — OCS">
              <IllusBannerRequest requestType="Late Enrollment" badge="#1e5c3a" />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Request received', fil: 'Natanggap ang kahilingan' }, type: 'start' },
          { label: { en: 'Verify reason & docs', fil: 'I-verify ang dahilan at docs' }, type: 'step' },
          { label: { en: 'Check slot availability', fil: 'Suriin ang availability ng slot' }, type: 'step' },
          { label: { en: 'Valid within window?', fil: 'Valid ba sa loob ng window?' }, type: 'decision' },
          { label: { en: 'Approve & enroll + late fee', fil: 'Aprubahan at i-enroll + late fee' }, type: 'success' },
          { label: { en: 'Deny with reason', fil: 'Tanggihan na may dahilan' }, type: 'reject' },
        ]} />
        <BranchFlow
          trigger={{ en: 'Late enrollment request submitted', fil: 'Isinumite ang kahilingan sa late enrollment' }}
          condition={{ en: 'Reason valid & window open?', fil: 'Valid ba ang dahilan at bukas ba ang window?' }}
          yes={{ en: 'Approve — enroll & assess late fee', fil: 'Aprubahan — i-enroll at tasahin ang late fee' }}
          no={{ en: 'Deny — return to student', fil: 'Tanggihan — ibalik sa estudyante' }}
        />
      </ModuleSection>

      {/* ── 15. Change / Add / Drop (OCS side) ────────── */}
      <ModuleSection id="ocs-change-add-drop" navIndex={15}
        title="Process: Change, Adding, Dropping (DRP) Request"
        titleFil="Pagproseso: Kahilingan sa Pagpapalit, Pagdaragdag, Pag-drop (DRP)"
        path="/ocs/banner-requests → Change / Add / Drop">
        <Restriction
          en="OCS only. The Change/Add/Drop window must be open. For drops after the midterm: a DRP grade is recorded. For drops before the midterm deadline: WP or WF is recorded based on standing. Adding a subject is only possible if a slot is available in the target section."
          fil="OCS lamang. Ang Change/Add/Drop window ay kailangang bukas. Para sa mga drop pagkatapos ng midterm: isang DRP na grado ang naitala. Para sa mga drop bago ang midterm deadline: ang WP o WF ay naitala batay sa katayuan. Ang pagdaragdag ng asignatura ay posible lamang kung may available na slot sa target na seksiyon."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Processing change/add/drop requests" fil="Pagproseso ng mga kahilingan sa pagpapalit/pagdaragdag/pag-drop" />
              <Steps items={[
                { en: 'Go to Banner Requests → Change/Add/Drop queue. View all pending requests.', fil: 'Pumunta sa Banner Requests → Change/Add/Drop queue. Tingnan ang lahat ng naghihintay na kahilingan.' },
                { en: 'Click a request. Identify the type: Change, Add, or Drop.', fil: 'I-click ang isang kahilingan. Tukuyin ang uri: Pagpapalit, Pagdaragdag, o Pag-drop.' },
                { en: 'For CHANGE: verify new section has an available slot. Approve → system moves the student.', fil: 'Para sa PAGPAPALIT: i-verify na ang bagong seksiyon ay may available na slot. Aprubahan → inililipat ng sistema ang estudyante.' },
                { en: 'For ADD: confirm section slot availability. Approve → student is added to section.', fil: 'Para sa PAGDARAGDAG: kumpirmahin ang availability ng slot ng seksiyon. Aprubahan → idiniaragdag ang estudyante sa seksiyon.' },
                { en: 'For DROP: verify timing (before or after midterm). Record appropriate grade (DRP / WP / WF).', fil: 'Para sa PAG-DROP: i-verify ang timing (bago o pagkatapos ng midterm). Itala ang angkop na grado (DRP / WP / WF).' },
                { en: 'Click Approve. The enrollment record is updated automatically.', fil: 'I-click ang Approve. Ang rekord ng enrollment ay awtomatikong naa-update.' },
                { en: 'Click Deny with a reason if conditions are not met.', fil: 'I-click ang Deny na may dahilan kung hindi natutugunan ang mga kondisyon.' },
              ]} />
              <InfoBox
                en="DRP, WP, and WF grades are permanently recorded on the student's TOR. Double-check the drop timing before approving."
                fil="Ang DRP, WP, at WF na mga grado ay permanenteng naitala sa TOR ng estudyante. I-double-check ang timing ng drop bago aprubahan."
              />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={12} title="Change / Add / Drop — OCS">
              <IllusBannerRequest requestType="Change / Add / Drop" badge="#92400e" />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow — Drop" fil="Daloy ng Proseso — Pag-drop" />
        <FlowChart nodes={[
          { label: { en: 'Request received', fil: 'Natanggap ang kahilingan' }, type: 'start' },
          { label: { en: 'Identify type', fil: 'Tukuyin ang uri' }, type: 'step' },
          { label: { en: 'Before midterm?', fil: 'Bago ba ang midterm?' }, type: 'decision' },
          { label: { en: 'Record WP or WF', fil: 'Itala ang WP o WF' }, type: 'success' },
          { label: { en: 'Record DRP', fil: 'Itala ang DRP' }, type: 'reject' },
        ]} />
        <BranchFlow
          trigger={{ en: 'Change/Add/Drop request submitted', fil: 'Isinumite ang kahilingan sa Change/Add/Drop' }}
          condition={{ en: 'Requirements met & window open?', fil: 'Natutugunan ba ang mga kinakailangan at bukas ba ang window?' }}
          yes={{ en: 'Approve & update enrollment/grades', fil: 'Aprubahan at i-update ang enrollment/grado' }}
          no={{ en: 'Deny with reason', fil: 'Tanggihan na may dahilan' }}
        />
      </ModuleSection>
    </>
  );
}
