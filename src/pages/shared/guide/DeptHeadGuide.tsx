import {
  ModuleSection, Steps, Restriction, InfoBox, FlowChart, BranchFlow,
  PortalIllustration, IllusCards, IllusTable, IllusConsentList,
  SubHead, TwoCol,
  TipsRoleProvider,
} from './GuideComponents';

export default function DeptHeadGuide() {
  return (
    <TipsRoleProvider role="department_head">
      {/* ── 1. Dashboard ─────────────────────────────── */}
      <ModuleSection id="dh-dashboard" navIndex={1} title="Dashboard" titleFil="Dashboard" path="/depthead/dashboard">
        <Restriction
          en="Department Head only. All data is scoped to your assigned department. You cannot see other departments' data."
          fil="Para sa Pinuno ng Departamento lamang. Lahat ng datos ay nakasakop sa inyong itinalagang departamento. Hindi mo makikita ang datos ng ibang mga departamento."
        />
        <TwoCol
          left={
            <>
              <SubHead en="What it shows" fil="Ano ang ipinapakita" />
              <Steps items={[
                { en: 'Log in as Department Head. You are taken to your Dashboard.', fil: 'Mag-login bilang Pinuno ng Departamento. Dadalhin ka sa inyong Dashboard.' },
                { en: 'View stats: pending dept consents, approved consents, department course count, active sections.', fil: 'Tingnan ang mga stats: naghihintay na dept consents, mga inaprobahang consent, bilang ng kurso ng departamento, aktibong mga seksiyon.' },
                { en: 'Click any stat card to navigate directly to that module.', fil: 'I-click ang anumang stat card para direktang pumunta sa seksiyong iyon.' },
                { en: 'If there are pending consent requests, a yellow alert banner will appear — act on these promptly.', fil: 'Kung may mga naghihintay na consent request, lilitaw ang yellow alert banner — aksyunan ito nang maaga.' },
                { en: 'Use Quick Action buttons at the bottom for fast navigation to key modules.', fil: 'Gamitin ang mga Quick Action na pindutan sa ibaba para sa mabilis na pag-navigate sa mga pangunahing module.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={0} title="Dept Head Dashboard">
              <IllusCards />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Login', fil: 'Mag-login' }, type: 'start' },
          { label: { en: 'View stats', fil: 'Tingnan ang stats' }, type: 'step' },
          { label: { en: 'Pending consents?', fil: 'May pending consents?' }, type: 'decision' },
          { label: { en: 'Act on consents', fil: 'Kumilos sa mga consent' }, type: 'success' },
          { label: { en: 'Monitor sections', fil: 'Subaybayan ang mga seksiyon' }, type: 'reject' },
        ]} />
      </ModuleSection>

      {/* ── 2. Dept Consent ──────────────────────────── */}
      <ModuleSection id="dh-consents" navIndex={2} title="Dept Consent" titleFil="Dept Consent" path="/depthead/consents">
        <Restriction
          en="Department Head only. Only courses under your department with requiresDeptConsent = true will generate consent requests. You must act on requests within the enlistment window — unanswered requests are considered denied after the window closes."
          fil="Para sa Pinuno ng Departamento lamang. Ang mga kurso lamang sa ilalim ng inyong departamento na may requiresDeptConsent = true ang magge-generate ng mga consent request. Kailangan mong aksyunan ang mga kahilingan sa loob ng enlistment window — ang mga hindi nasagot na kahilingan ay itinuturing na tinanggihan pagkatapos masara ang window."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Reviewing department consent requests" fil="Pagsusuri ng mga kahilingan sa consent ng departamento" />
              <Steps items={[
                { en: 'Go to Dept Consent. You will see all pending requests for your department\'s courses.', fil: 'Pumunta sa Dept Consent. Makikita mo ang lahat ng naghihintay na kahilingan para sa mga kurso ng inyong departamento.' },
                { en: 'Click a request to see: student name, student number, course code, section, and reason.', fil: 'I-click ang isang kahilingan para makita ang: pangalan ng estudyante, numero ng estudyante, code ng kurso, seksiyon, at dahilan.' },
                { en: 'Verify the student meets any departmental requirements for that course.', fil: 'I-verify na natutugunan ng estudyante ang anumang kinakailangan ng departamento para sa kursong iyon.' },
                { en: 'Click "Approve" to allow the student to enlist in that section.', fil: 'I-click ang "Approve" para payagan ang estudyante na mag-enlist sa seksiyong iyon.' },
                { en: 'Click "Deny" to reject the request. You may optionally add a reason.', fil: 'I-click ang "Deny" para tanggihan ang kahilingan. Maaari kang mag-opsyonal na magdagdag ng dahilan.' },
                { en: 'The student is notified of your decision via their My Consents page.', fil: 'Inaabisuhan ang estudyante ng inyong desisyon sa pamamagitan ng kanilang My Consents page.' },
              ]} />
              <InfoBox en="Tip: During enlistment period, check your Dept Consent module at least twice daily to avoid students missing their enlistment window." fil="Tip: Sa panahon ng enlistment, suriin ang inyong Dept Consent module nang kahit dalawang beses sa isang araw para maiwasang makaligtaan ng mga estudyante ang kanilang enlistment window." />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={1} title="Dept Consent">
              <IllusConsentList />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <BranchFlow
          trigger={{ en: 'Student requests Dept Consent', fil: 'Estudyante humihiling ng Dept Consent' }}
          condition={{ en: 'Meets dept requirements?', fil: 'Natutugunan ang mga kinakailangan ng dept?' }}
          yes={{ en: 'Approve — student can enlist', fil: 'Aprubahan — maaaring mag-enlist ang estudyante' }}
          no={{ en: 'Deny with reason', fil: 'Tanggihan na may dahilan' }}
        />
      </ModuleSection>

      {/* ── 3. Sections ──────────────────────────────── */}
      <ModuleSection id="dh-sections" navIndex={3} title="Sections" titleFil="Mga Seksiyon" path="/depthead/sections">
        <Restriction
          en="Department Head — view only. You can see sections for your department's courses but section creation and editing is managed by OCS. Contact OCS for any scheduling or section changes."
          fil="Pinuno ng Departamento — tingnan lamang. Maaari kang makakita ng mga seksiyon para sa mga kurso ng inyong departamento ngunit ang paglikha at pag-edit ng seksiyon ay pinamamahalaan ng OCS. Makipag-ugnayan sa OCS para sa anumang pagbabago sa iskedyul o seksiyon."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Viewing department sections" fil="Pagtingin sa mga seksiyon ng departamento" />
              <Steps items={[
                { en: 'Go to Sections.', fil: 'Pumunta sa Sections.' },
                { en: 'View all sections for your department\'s courses in the active term.', fil: 'Tingnan ang lahat ng mga seksiyon para sa mga kurso ng inyong departamento sa aktibong termino.' },
                { en: 'Check schedule (day, time, room), faculty assignment, and enrollment per section.', fil: 'Suriin ang iskedyul (araw, oras, silid), assignment ng guro, at enrollment bawat seksiyon.' },
                { en: 'Use the search bar to filter by course code or faculty name.', fil: 'Gamitin ang search bar para mag-filter ayon sa code ng kurso o pangalan ng guro.' },
                { en: 'If you need changes, contact OCS directly.', fil: 'Kung kailangan ng mga pagbabago, makipag-ugnayan sa OCS direkta.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={2} title="Sections">
              <IllusTable rows={4} cols={3} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Open Sections', fil: 'Buksan ang Sections' }, type: 'start' },
          { label: { en: 'Filter by course', fil: 'Mag-filter sa kurso' }, type: 'step' },
          { label: { en: 'View schedule & enrollment', fil: 'Tingnan ang iskedyul at enrollment' }, type: 'step' },
          { label: { en: 'Contact OCS if change needed', fil: 'Makipag-ugnayan sa OCS kung kailangan ng pagbabago' }, type: 'end' },
        ]} />
      </ModuleSection>

      {/* ── 4. Courses ───────────────────────────────── */}
      <ModuleSection id="dh-courses" navIndex={4} title="Courses" titleFil="Mga Kurso" path="/depthead/courses">
        <Restriction
          en="Department Head only. You can only add and edit courses belonging to your assigned department. Prerequisites and corequisites must already exist in the system before linking."
          fil="Para sa Pinuno ng Departamento lamang. Maaari ka lamang magdagdag at mag-edit ng mga kursong kabilang sa inyong itinalagang departamento. Ang mga prerequisite at corequisite ay kailangang mayroon na sa sistema bago i-link."
        />
        <TwoCol
          left={
            <>
              <SubHead en="Managing department courses" fil="Pamamahala ng mga kurso ng departamento" />
              <Steps items={[
                { en: 'Go to Courses.', fil: 'Pumunta sa Courses.' },
                { en: 'View all courses currently in your department\'s catalog.', fil: 'Tingnan ang lahat ng mga kurso na kasalukuyang nasa katalogo ng inyong departamento.' },
                { en: 'Click "Add Course" to create a new course for your department.', fil: 'I-click ang "Add Course" para gumawa ng bagong kurso para sa inyong departamento.' },
                { en: 'Fill in course details: code, type, title, units, lab units, year level, consent flags.', fil: 'Punan ang mga detalye ng kurso: code, uri, pamagat, units, lab units, antas ng taon, consent flags.' },
                { en: 'Add prerequisites and corequisites if applicable.', fil: 'Magdagdag ng mga prerequisite at corequisite kung naaangkop.' },
                { en: 'Click Save. The course is available for OCS to add sections.', fil: 'I-click ang Save. Ang kurso ay available na para sa OCS na magdagdag ng mga seksiyon.' },
                { en: 'To edit: click the edit icon on an existing course row.', fil: 'Para mag-edit: i-click ang edit icon sa isang kasalukuyang row ng kurso.' },
              ]} />
            </>
          }
          right={
            <PortalIllustration activeNavIndex={3} title="Courses">
              <IllusTable rows={4} cols={3} />
            </PortalIllustration>
          }
        />
        <SubHead en="Process Flow" fil="Daloy ng Proseso" />
        <FlowChart nodes={[
          { label: { en: 'Add Course', fil: 'Magdagdag ng Kurso' }, type: 'start' },
          { label: { en: 'Fill details', fil: 'Punan ang mga detalye' }, type: 'step' },
          { label: { en: 'Set consent flags', fil: 'Itakda ang consent flags' }, type: 'step' },
          { label: { en: 'Add prerequisites', fil: 'Magdagdag ng prerequisites' }, type: 'step' },
          { label: { en: 'Save', fil: 'I-save' }, type: 'step' },
          { label: { en: 'OCS adds sections', fil: 'Nagdagdag ng seksiyon ang OCS' }, type: 'end' },
        ]} />
      </ModuleSection>
    </TipsRoleProvider>
  );
}
