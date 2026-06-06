import type { Role } from '../../lib/types';

export interface TipsFil {
  warnFil?: string;
  dosFil: string[];
  dontsFil: string[];
}

/* ─── ADMIN (10 modules) ───────────────────────────────── */
const ADMIN_FIL: TipsFil[] = [
  {
    // 1 Dashboard
    warnFil: 'Ang lahat ng datos sa pahinang ito ay read-only. Ang mga pagbabago ay dapat gawin sa kani-kanilang mga module.',
    dosFil: [
      'Suriin ang dashboard sa simula ng bawat termino',
      'Gamitin ang enrollment bars para matukoy ang sobrang-puno na seksyon',
      'Kumpirmahin ang Active Term bago magbukas ng anumang control window',
    ],
    dontsFil: [
      'Huwag ibahagi ang admin login credentials',
      'Huwag gamitin ang bilang sa dashboard bilang opisyal na datos ng enrollment',
      'Huwag balewalain ang zero-enrollment warning sa mga aktibong seksyon',
    ],
  },
  {
    // 2 Dashboard Content
    warnFil: 'Ang mga anunsyo ay makikita ng LAHAT ng gumagamit ng napiling role. Suriin nang mabuti bago i-save.',
    dosFil: [
      'Gamitin ang anunsyo para sa mga paalala tungkol sa termino at sistema',
      'I-toggle off ang mga role na hindi nangangailangan ng mensahe',
      'I-save lamang pagkatapos ng masusing pagsusuri',
    ],
    dontsFil: [
      'Huwag mag-paste ng sensitibong datos (ID, password) sa anunsyo',
      'Huwag hayaang aktibo ang lumang anunsyo mula sa nakaraang termino',
      'Huwag gamitin ang anunsyo bilang kapalit ng direktang komunikasyon',
    ],
  },
  {
    // 3 Term Control
    warnFil: 'ISANG termino lamang ang maaaring maging aktibo sa isang pagkakataon. Ang pagtatakda ng bagong aktibong termino ay magsasara ng nakaraang termino.',
    dosFil: [
      'Buksan ang mga window sa tamang pagkakasunod: Enlistment → Enrollment → Grades',
      'Isara agad ang mga window kapag tapos na ang panahon',
      'Makipag-ugnayan sa OCS bago magbukas/magsara ng mga window',
    ],
    dontsFil: [
      'Huwag magtakda ng bagong aktibong termino habang tumatakbo pa ang enrollment',
      'Huwag buksan ang Grade Submission bago magsara ang enrollment',
      'Huwag burahin ang termino na may mga naka-enroll na estudyante',
    ],
  },
  {
    // 4 User Management
    warnFil: 'Ang CSV import ay mag-o-override ng umiiral na impormasyon ng gumagamit batay sa username. Suriin ang file nang mabuti bago mag-import.',
    dosFil: [
      'Gamitin ang format na APELYIDO, PANGALAN, GITNANG PANGALAN para sa pangalan',
      'I-download at gamitin ang opisyal na CSV template para sa bulk import',
      'Mag-reset ng password agad pagkatapos ng bulk import',
    ],
    dontsFil: [
      'Huwag gumawa ng duplicate na username',
      'Huwag mag-delete ng aktibong gumagamit nang hindi muna ina-archive ang kanilang datos',
      'Huwag magtalaga ng maling role sa isang gumagamit',
    ],
  },
  {
    // 5 Curriculum Management
    warnFil: 'Ang pag-edit ng curriculum na may naka-enroll na mga estudyante ay maaaring makaapekto sa kanilang rekord. Kumonsulta sa OCS bago gumawa ng mga pagbabago.',
    dosFil: [
      'Gumawa ng bagong curriculum revision kaysa mag-edit ng umiiral na bersyon',
      'Tiyaking tama ang unit load bago ilathala ang curriculum',
      'I-link ang curriculum sa tamang programa at taon ng pagpasok',
    ],
    dontsFil: [
      'Huwag mag-edit ng curriculum na ginagamit na ng mga aktibong estudyante',
      'Huwag mag-delete ng pre-requisite nang hindi isinasaalang-alang ang apekto nito',
      'Huwag mag-duplicate ng course code sa loob ng parehong curriculum',
    ],
  },
  {
    // 6 Course Management
    warnFil: 'Ang pag-edit ng course code o unit na may umiiral na seksyon ay maaaring makagulo sa enrollment records.',
    dosFil: [
      'Gumamit ng pare-parehong format ng course code sa lahat ng departamento',
      'Itala ang lahat ng pre-requisite nang tama bago i-save ang kurso',
      'I-archive ang lumang kurso kaysa i-delete ang mga ito',
    ],
    dontsFil: [
      'Huwag baguhin ang unit value ng kurso habang bukas ang enrollment',
      "Huwag gumamit ng parehong course code para sa iba't ibang kurso",
      'Huwag mag-delete ng kurso na may kasalukuyang grade records',
    ],
  },
  {
    // 7 Academic Programs
    warnFil: 'Ang pagbabago sa programa ay maaaring makaapekto sa curriculum mapping ng mga estudyante. Kumpirmahin sa Registrar bago gumawa ng pagbabago.',
    dosFil: [
      'Tiyaking naka-link nang tama ang programa sa tamang kolehiyo',
      'I-update ang programa code kapag nagbago ang opisyal na pangalan',
      'Panatilihing aktibo lamang ang mga programa na kasalukuyang tinatanggap ng mag-aaral',
    ],
    dontsFil: [
      'Huwag mag-delete ng programa na may aktibong mag-aaral',
      'Huwag mag-duplicate ng programme code',
      'Huwag baguhin ang programa ng estudyante nang walang opisyal na kahilingan',
    ],
  },
  {
    // 8 Grade Viewing
    warnFil: 'Ang mga grades na nakikita dito ay opisyal na rekord. Huwag baguhin ang mga ito nang walang sapat na awtoridad.',
    dosFil: [
      'Gamitin ang grade filter para madaling mahanap ang mga rekord ng estudyante',
      'I-export ang grades para sa opisyal na dokumentasyon',
      'I-verify ang mga grade discrepancy kasama ang faculty at OCS',
    ],
    dontsFil: [
      'Huwag baguhin ang grade nang walang naaangkop na proseso ng pagwawasto',
      'Huwag ibahagi ang grade records ng estudyante nang walang pahintulot',
      'Huwag mag-download ng bulk grade data nang walang lehitimong dahilan',
    ],
  },
  {
    // 9 Section Management
    warnFil: 'Ang pagsasara ng isang seksyon na may mga naka-enroll na estudyante ay maaaring makaapekto sa kanilang enrollment status.',
    dosFil: [
      'Itakda ang tamang kapasidad ng seksyon bago buksan ang enrollment',
      'Mag-assign ng faculty sa bawat seksyon bago magsimula ang klase',
      'Suriin ang schedule conflicts bago kumpirmahin ang seksyon',
    ],
    dontsFil: [
      'Huwag baguhin ang schedule ng seksyon kapag nagsimula na ang klase',
      'Huwag mag-delete ng seksyon na may grade records',
      'Huwag mag-assign ng dalawang seksyon sa iisang faculty sa magkakatugmang oras',
    ],
  },
  {
    // 10 Reports & Logs
    warnFil: 'Ang mga report at log ay naglalaman ng sensitibong datos. Panatilihin ang kumpidensyalidad ng lahat ng mga rekord.',
    dosFil: [
      'Regular na i-export ang mga log para sa audit trail',
      'Gamitin ang mga filter para makuha ang eksaktong datos na kailangan',
      'I-secure ang mga na-export na file gamit ang naaangkop na access controls',
    ],
    dontsFil: [
      'Huwag ibahagi ang system logs sa hindi awtorisadong mga tao',
      'Huwag baguhin o burahin ang mga log entry',
      'Huwag mag-export ng bulk student data nang walang opisyal na kahilingan',
    ],
  },
];

/* ─── OCS (15 modules) ─────────────────────────────────── */
const OCS_FIL: TipsFil[] = [
  {
    // 1 OCS Dashboard
    warnFil: 'Ang mga stat card ay live data. Ang mabilis na pagtaas ng mga bilang ay maaaring magpahiwatig ng mga isyu sa enrollment.',
    dosFil: [
      'Suriin ang dashboard sa umpisa ng bawat araw ng trabaho',
      'Gamitin ang mga alert para maiwasang ma-miss ang mga deadline',
      'I-coordinate sa Admin para sa mga isyu na nangangailangan ng system-level na solusyon',
    ],
    dontsFil: [
      'Huwag ipagpaliban ang pagtugon sa mga enrollment alert',
      'Huwag kalimutang suriin ang listahan ng mga estudyanteng walang enlisted subjects',
      'Huwag saluhin ang mga kahilingan nang walang pagpapatunay sa kasalukuyang data',
    ],
  },
  {
    // 2 Enrollment Dashboard
    warnFil: 'Ang enrollment status ng estudyante ay maaari lamang baguhin sa loob ng enrollment window. Makipag-koordinasyon sa Admin para sa mga extension.',
    dosFil: [
      'Gamitin ang enrollment dashboard para i-monitor ang daily enrollment progress',
      'I-process ang mga may overload request agad para maiwasan ang bottleneck',
      'Mag-notify ng mga estudyante na may incomplete enrollment',
    ],
    dontsFil: [
      'Huwag mag-approve ng enrollment nang walang kumpleto na bayad na kumpirmasyon',
      'Huwag mag-bypass ng enrollment window para sa isang estudyante nang walang Admin approval',
      'Huwag baguhin ang enrollment status nang walang dokumentasyon',
    ],
  },
  {
    // 3 Section Management (OCS)
    warnFil: 'Ang pagbabago ng kapasidad ng seksyon habang bukas ang enrollment ay maaaring makalikha ng hindi inaasahang overload.',
    dosFil: [
      'Kumpirmahin ang lahat ng seksyon na may nakatalagang faculty bago buksan ang enrollment',
      'Mag-set ng realistically na kapasidad ng seksyon batay sa classroom size',
      'I-update ang schedule ng seksyon agad kung may pagbabago',
    ],
    dontsFil: [
      'Huwag mag-delete ng seksyon na may mga naka-enroll na estudyante',
      'Huwag baguhin ang oras ng klase kapag nagsimula na ang termino',
      'Huwag lumampas sa kapasidad ng seksyon nang walang Faculty/Dept Head approval',
    ],
  },
  {
    // 4 Pre-Enlistment / Enlistment
    warnFil: 'Ang Pre-Enlistment ay hindi pa enrollment. Dapat pa ring mag-enroll ang estudyante sa loob ng enrollment window upang makumpirma ang kanilang schedule.',
    dosFil: [
      'Buksan ang Pre-Enlistment window nang may sapat na abiso para sa mga estudyante',
      'Suriin ang mga conflict ng enlisted subjects ng estudyante bago mag-approve',
      'Mag-extend ng enlistment window para sa mga may espesyal na kaso',
    ],
    dontsFil: [
      'Huwag ipagpalit ang Pre-Enlistment sa Enrollment',
      'Huwag mag-approve ng enlistment na may schedule conflict',
      'Huwag buksan ang enlistment nang walang sapat na seksyon na available',
    ],
  },
  {
    // 5 Enrollment Processing
    warnFil: 'Ang pagproseso ng enrollment ay panghuling hakbang. Siguraduhing kumpleto na ang lahat ng kinakailangan bago kumpirmahin.',
    dosFil: [
      'I-verify ang bayad na kumpirmasyon bago i-process ang enrollment',
      'Kumpirmahin na naka-enlist ang estudyante sa lahat ng required na kurso',
      'Mag-issue ng enrollment slip pagkatapos ng matagumpay na enrollment',
    ],
    dontsFil: [
      'Huwag mag-process ng enrollment nang walang bayad na kumpirmasyon',
      'Huwag mag-enroll ng estudyante sa kurso na wala pang pre-requisite',
      'Huwag baguhin ang enrollment ng estudyante pagkatapos ng enrollment deadline',
    ],
  },
  {
    // 6 Grade Upload
    warnFil: 'Ang grade upload ay panghuling aksyon. Siguraduhin na tama ang lahat ng grade bago i-upload dahil limitado ang pagwawasto pagkatapos.',
    dosFil: [
      'Gamitin ang opisyal na template para sa grade upload',
      'I-verify ang grade format (1.0–5.0 scale) bago mag-upload',
      'Mag-notify ng faculty kung may mga grade na hindi natanggap',
    ],
    dontsFil: [
      'Huwag mag-upload ng grades pagkatapos ng opisyal na deadline nang walang extension',
      'Huwag baguhin ang grade ng estudyante nang walang approved change-of-grade form',
      'Huwag mag-upload ng incomplete grade sheet',
    ],
  },
  {
    // 7 Grade Encoding
    warnFil: 'Ang manual na grade encoding ay sensitibo. Dapat may sumuporta na dokumento (pirma ng faculty) para sa bawat entry.',
    dosFil: [
      'I-double check ang bawat grade entry bago i-save',
      'Itago ang mga supporting documents ng grade encoding',
      'Mag-log ng dahilan para sa bawat manual na grade entry',
    ],
    dontsFil: [
      'Huwag mag-encode ng grade nang walang written authorization mula sa faculty',
      'Huwag mag-override ng grade nang walang proper documentation',
      'Huwag hayaan ang ibang tao na mag-encode gamit ang iyong account',
    ],
  },
  {
    // 8 Evaluation Management
    warnFil: 'Ang mga evaluation result ay kumpidensyal. Huwag ibahagi ang mga indibidwal na resulta sa mga hindi awtorisadong tao.',
    dosFil: [
      'Buksan ang evaluation window sa tamang oras ng termino',
      'Siguraduhing alam ng mga estudyante kung paano mag-evaluate',
      'I-export ang mga resulta para sa Faculty Performance Review',
    ],
    dontsFil: [
      'Huwag ipakita ang indibidwal na evaluation score sa mga estudyante',
      'Huwag buksan ang evaluation pagkatapos ng opisyal na evaluation period',
      'Huwag baguhin ang evaluation responses ng estudyante',
    ],
  },
  {
    // 9 Prerogative Enlistment
    warnFil: 'Ang Prerogative Enlistment ay para lamang sa mga espesyal na kaso. Bawat approval ay dapat may malinaw na dokumentasyon at dahilan.',
    dosFil: [
      'Kumpirmahin ang legitimacy ng bawat prerogative request',
      'I-document ang dahilan ng bawat prerogative approval',
      'Mag-notify ng estudyante at faculty pagkatapos ng approval',
    ],
    dontsFil: [
      'Huwag mag-approve ng prerogative enrollment nang walang sapat na dahilan',
      'Huwag gamitin ang prerogative para ma-bypass ang mga opisyal na patakaran',
      'Huwag mag-enlist ng estudyante sa fully-closed na seksyon nang walang Faculty/Dept Head consent',
    ],
  },
  {
    // 10 Student Banner Requests - Appeal for PD
    warnFil: 'Ang Appeal for Permanent Disqualification ay isang seryosong kahilingan. Dapat suriin nang mabuti ang akademikong rekord bago aprubahan.',
    dosFil: [
      'Suriin ang buong akademikong kasaysayan ng estudyante bago mag-review',
      'Siguruhing kumpleto ang lahat ng required na dokumento ng kahilingan',
      'I-notify ang estudyante ng desisyon sa loob ng itinakdang oras',
    ],
    dontsFil: [
      'Huwag mag-approve ng appeal nang walang sapat na ebidensya',
      'Huwag balewalain ang mga deadline sa pagsusuri ng appeal',
      'Huwag mag-proceso ng appeal nang walang pumirmang faculty recommendation',
    ],
  },
  {
    // 11 Late Enrollment
    warnFil: 'Ang late enrollment ay may kaukulang multa. Siguraduhing alam ng estudyante ang mga karagdagang singil bago i-process.',
    dosFil: [
      'I-verify ang dahilan ng late enrollment bago aprubahan',
      'Siguraduhing naka-bayad ang late enrollment fee',
      'I-document ang lahat ng approved late enrollment',
    ],
    dontsFil: [
      'Huwag mag-process ng late enrollment nang walang required na bayad',
      'Huwag mag-approve ng late enrollment pagkatapos ng opisyal na deadline nang walang Admin override',
      'Huwag balewalain ang enrollment limit ng seksyon para sa late enrollees',
    ],
  },
  {
    // 12 Change / Adding / Dropping
    warnFil: 'Ang mga kahilingan para sa Change/Add/Drop ay may mga deadline na dapat sundin. Ang mga kahilingang lampas sa deadline ay maaaring hindi na maaprubahan.',
    dosFil: [
      'I-verify na ang pagbabago ay hindi lalampas sa maximum na unit load',
      'Kumpirmahin na may available na slot ang seksyong gustong pasukin',
      'I-update agad ang enrollment record pagkatapos ng pag-apruba',
    ],
    dontsFil: [
      'Huwag mag-approve ng Add/Drop pagkatapos ng opisyal na deadline',
      'Huwag mag-allow ng dropping ng lahat ng subjects ng estudyante nang walang proper documentation',
      'Huwag mag-process ng Change/Add/Drop nang walang pirma ng estudyante',
    ],
  },
  {
    // 13 Withdrawal / Dropping
    warnFil: 'Ang Withdrawal bago ang midterm ay nagdudulot ng WP o WF depende sa standing ng estudyante. Ipaliwanag ito nang maayos bago payagan ang withdrawal.',
    dosFil: [
      'Ipaliwanag sa estudyante ang kaibahan ng WP at WF',
      'Siguraduhing nakuha ang pirma ng estudyante at ng faculty sa withdrawal form',
      'I-document ang petsa at dahilan ng withdrawal',
    ],
    dontsFil: [
      'Huwag payagan ang withdrawal nang walang counseling sa estudyante',
      'Huwag baguhin ang WP/WF designation nang walang sapat na dahilan',
      'Huwag mag-process ng withdrawal pagkatapos ng deadline nang walang Admin approval',
    ],
  },
  {
    // 14 Certificate & Document Requests
    warnFil: 'Ang mga opisyal na dokumento ay may kaukulang bayad at processing time. I-set ang tamang expectations sa mga estudyante.',
    dosFil: [
      'I-verify ang pagkakakilanlan ng estudyante bago mag-release ng dokumento',
      'Sundin ang opisyal na processing time para sa bawat uri ng dokumento',
      'Mag-issue ng resibo para sa lahat ng bayad na dokumento',
    ],
    dontsFil: [
      'Huwag mag-release ng opisyal na dokumento nang walang wastong authorization',
      'Huwag mag-promise ng mabilis na pagproseso kung hindi ito posible',
      'Huwag baguhin ang nilalaman ng opisyal na dokumento',
    ],
  },
  {
    // 15 OCS Reports
    warnFil: 'Ang mga OCS report ay naglalaman ng sensitibong datos ng estudyante. Pangalagaan ang privacy ng lahat ng rekord.',
    dosFil: [
      'Regular na i-generate ang mga enrollment at grade reports para sa admin review',
      'Gamitin ang mga filter para makuha ang eksaktong datos na kailangan',
      'I-store nang ligtas ang lahat ng na-export na report',
    ],
    dontsFil: [
      'Huwag ibahagi ang bulk student data nang walang opisyal na autoridad',
      'Huwag gumawa ng report gamit ang hindi verified na datos',
      'Huwag mag-delete ng archived reports',
    ],
  },
];

/* ─── FACULTY (8 modules) ──────────────────────────────── */
const FACULTY_FIL: TipsFil[] = [
  {
    // 1 Faculty Dashboard
    warnFil: 'Ang iyong dashboard ay nagpapakita ng live na datos. Suriin ang iyong load at mga deadline ng grade submission nang regular.',
    dosFil: [
      'Suriin ang dashboard bago magsimula ng bawat linggo ng klase',
      'Bigyang-pansin ang mga notification tungkol sa grade submission deadline',
      'I-coordinate sa OCS para sa anumang isyu sa iyong teaching load',
    ],
    dontsFil: [
      'Huwag balewalain ang mga deadline alert sa dashboard',
      'Huwag magbigay ng grade sa seksyon na hindi mo hawak',
      'Huwag mag-login gamit ang credentials ng ibang faculty',
    ],
  },
  {
    // 2 My Schedule / Load
    warnFil: 'Ang iyong schedule ay opisyal na rekord. Kung may error sa iyong load, makipag-ugnayan agad sa OCS o Department Head.',
    dosFil: [
      'I-verify ang iyong complete na load sa simula ng bawat termino',
      'Iulat agad ang anumang discrepancy sa iyong schedule',
      'Gamitin ang schedule view para i-plan ang iyong mga consultation hours',
    ],
    dontsFil: [
      'Huwag magpakita ng klase sa seksyon na wala sa iyong opisyal na load',
      'Huwag baguhin ang iyong schedule nang walang OCS approval',
      'Huwag balewalain ang seksyon na may zero-enrollment sa iyong load',
    ],
  },
  {
    // 3 Grade Encoding
    warnFil: 'Ang pag-encode ng grade ay permanenteng aksyon pagkatapos ng submission. Suriin ang bawat grade ng dalawang beses bago isumite.',
    dosFil: [
      'I-save ang draft ng grades nang regular habang nag-e-encode',
      'Gamitin ang tamang grade scale (1.0 = Excellent, 5.0 = Failed)',
      'I-verify ang listahan ng estudyante bago simulan ang grade encoding',
    ],
    dontsFil: [
      'Huwag mag-submit ng grades na hindi pa nakumpirma',
      'Huwag magbigay ng grade sa estudyante na hindi naka-enroll sa iyong seksyon',
      'Huwag hayaan ang ibang tao na mag-encode ng grades para sa iyo',
    ],
  },
  {
    // 4 Grade Submission
    warnFil: 'Ang Grade Submission ay PANGHULING. Hindi na maaaring baguhin ang mga grade pagkatapos ng submission nang walang OCS-approved Change of Grade form.',
    dosFil: [
      'Suriin ang LAHAT ng grades bago pindutin ang Submit',
      'Isumite ang grades bago o sa opisyal na deadline',
      'Itago ang kopya ng iyong submitted grades para sa iyong talaan',
    ],
    dontsFil: [
      'Huwag mag-submit kung hindi pa kumpleto ang lahat ng grades',
      'Huwag isumite ang grades para sa ibang faculty',
      'Huwag mag-antay sa huling sandali para maiwasan ang teknikal na problema',
    ],
  },
  {
    // 5 Student List
    warnFil: 'Ang listahan ng estudyante ay opisyal na rekord ng enrollment. Hindi ka maaaring magbigay ng grade sa estudyanteng hindi naka-enroll sa iyong seksyon.',
    dosFil: [
      'I-verify ang listahan ng estudyante sa simula ng termino',
      'Iulat sa OCS ang anumang estudyante na dumadalo ngunit hindi naka-enroll',
      'Gamitin ang listahan para sa attendance at grade management',
    ],
    dontsFil: [
      'Huwag magbigay ng grade sa estudyanteng hindi naka-enroll',
      'Huwag ibahagi ang opisyal na listahan ng estudyante sa labas',
      'Huwag balewalain ang mga estudyanteng idinagdag o binawas sa iyong listahan',
    ],
  },
  {
    // 6 Evaluation Results
    warnFil: 'Ang iyong evaluation results ay kumpidensyal at para lamang sa iyong pagbabago at pagpapabuti bilang guro.',
    dosFil: [
      'Gamitin ang mga resulta para mapabuti ang iyong pagtuturo',
      'Suriin ang mga pattern sa feedback ng estudyante',
      'Kumonsulta sa Department Head para sa mga kritikal na isyu sa evaluation',
    ],
    dontsFil: [
      'Huwag itanong sa mga estudyante kung sino ang nagbigay ng negatibong feedback',
      'Huwag gamitin ang evaluation results bilang batayan para sa pagbabago ng grade',
      'Huwag ibahagi ang iyong evaluation scores sa labas ng departamento',
    ],
  },
  {
    // 7 Profile / Account
    warnFil: 'Ang impormasyon sa iyong profile ay ginagamit para sa opisyal na rekord. Siguraduhing tama ang lahat ng datos.',
    dosFil: [
      'I-update ang iyong profile information kapag nagbago ang iyong datos',
      'Mag-change ng password nang regular para sa seguridad',
      'Makipag-ugnayan sa Admin para sa mga pagbabago sa designation o departamento',
    ],
    dontsFil: [
      'Huwag ibahagi ang iyong login credentials kahit kanino',
      'Huwag gumamit ng simpleng password na madaling hulaan',
      'Huwag mag-edit ng profile information na nasa opisyal na talaan',
    ],
  },
  {
    // 8 Faculty Evaluation Forms
    warnFil: 'Ang evaluation form ay ginagamit ng mga estudyante para suriin ang iyong pagtuturo. Ang mga resulta ay makikita ng Dept Head at OCS.',
    dosFil: [
      'Hilingin sa mga estudyante na makumpleto ang evaluation sa tamang oras',
      'Gamitin ang evaluation bilang pagkakataon para mapabuti ang iyong pagtuturo',
      'Itanong sa OCS kung hindi mo makita ang iyong evaluation status',
    ],
    dontsFil: [
      'Huwag pilitin ang mga estudyante na magbigay ng positibong evaluation',
      'Huwag gamitin ang evaluation period para mag-coerce ng anumang uri',
      'Huwag balewalain ang mga resulta ng evaluation',
    ],
  },
];

/* ─── STUDENT (12 modules) ─────────────────────────────── */
const STUDENT_FIL: TipsFil[] = [
  {
    // 1 Student Dashboard
    warnFil: 'Ang iyong dashboard ay nagpapakita ng real-time na datos. Ang mga deadline ay mahigpit na sinusunod.',
    dosFil: [
      'Suriin ang dashboard araw-araw para sa mga update at deadline',
      'Bigyang-pansin ang mga notification tungkol sa enrollment at grades',
      'Makipag-ugnayan sa OCS para sa anumang concern na makikita sa dashboard',
    ],
    dontsFil: [
      'Huwag balewalain ang mga deadline alert sa dashboard',
      'Huwag mag-assume na awtomatikong naka-enroll ka sa mga subject na iyong in-enlist',
      'Huwag ibahagi ang iyong login credentials kahit kanino',
    ],
  },
  {
    // 2 My Profile
    warnFil: 'Ang iyong personal na impormasyon ay ginagamit para sa opisyal na rekord. Ang mga maling datos ay maaaring makaapekto sa iyong enrollment at dokumento.',
    dosFil: [
      'Regular na suriin ang iyong profile information para sa katumpakan',
      'Iulat sa OCS ang anumang error sa iyong personal na impormasyon',
      'Mag-update ng profile photo na propesyonal at malinaw',
    ],
    dontsFil: [
      'Huwag ibahagi ang iyong account credentials kahit kanino',
      'Huwag magpretend na ibang estudyante kapag nagse-submit ng mga kahilingan',
      'Huwag gumamit ng hindi propesyonal na profile photo',
    ],
  },
  {
    // 3 Enlistment
    warnFil: 'Ang Enlistment ay hindi pa enrollment. Kailangan mo pang mag-enroll sa loob ng enrollment window upang makumpirma ang iyong schedule.',
    dosFil: [
      'Suriin ang iyong curriculum checklist bago mag-enlist',
      'I-enlist ang lahat ng required na kurso para sa termino',
      'Mag-enlist ng kaagad sa pagbubukas ng enlistment window',
    ],
    dontsFil: [
      'Huwag mag-enlist ng kurso na wala pa kang pre-requisite',
      'Huwag kalimutang mag-enroll pagkatapos ng enlistment',
      'Huwag mag-enlist ng higit sa maximum na unit load nang walang OCS approval',
    ],
  },
  {
    // 4 Enrollment Status
    warnFil: 'Ang iyong enrollment status ay kailangang maging "Enrolled" para maging opisyal ang iyong enrollment para sa termino.',
    dosFil: [
      'Kumpirmahin ang iyong enrollment status pagkatapos mag-enroll',
      'Itago ang kopya ng iyong enrollment slip',
      'Iulat sa OCS ang anumang discrepancy sa iyong enrollment',
    ],
    dontsFil: [
      'Huwag mag-assume na naka-enroll ka nang hindi nakita ang "Enrolled" status',
      'Huwag lumipas ang enrollment deadline nang walang aksyon',
      'Huwag mag-attend ng klase na hindi ka naka-enroll',
    ],
  },
  {
    // 5 My Grades
    warnFil: 'Ang mga grades na nakikita sa portal ay opisyal. Ang Grade of 5.0 ay kabiguan at maaaring kailanganin ng retake.',
    dosFil: [
      'Suriin ang iyong grades pagkatapos ng bawat termino',
      'Mag-inquire sa OCS kung may discrepancy ka sa iyong grades',
      'Itago ang kopya ng iyong grades para sa iyong talaan',
    ],
    dontsFil: [
      'Huwag mag-assume na naging pass ka nang hindi mo nakita ang iyong grade',
      'Huwag direktang makipag-usap sa faculty para baguhin ang grade nang walang OCS involvement',
      'Huwag balewalain ang failing grade — suriin ang iyong academic standing',
    ],
  },
  {
    // 6 Graduation Application
    warnFil: 'Ang Graduation Application ay isang seryosong proseso. Siguraduhing kumpleto na ang lahat ng academic requirements bago mag-apply.',
    dosFil: [
      'I-verify ang iyong curriculum checklist bago mag-apply para sa graduation',
      'Mag-apply sa loob ng itinakdang period ng graduation application',
      'Makipag-ugnayan sa OCS para sa anumang tanong tungkol sa iyong graduation status',
    ],
    dontsFil: [
      'Huwag mag-apply para sa graduation kung may remaining na required courses pa',
      'Huwag mag-assume na awtomatiko kang nag-graduate nang hindi mo natatanggap ang kumpirmasyon',
      'Huwag balewalain ang mga notification tungkol sa iyong graduation application',
    ],
  },
  {
    // 7 Evaluation of Faculty
    warnFil: 'Ang iyong evaluation ay kumpidensyal. Maaaring hindi mo ma-access ang iyong grades hangga\'t hindi mo nakukumpleto ang evaluation.',
    dosFil: [
      'Maging tapat at makabuluhan sa iyong mga sagot',
      'Kumpletuhin ang evaluation para sa LAHAT ng iyong mga guro',
      'Gamitin ang evaluation bilang pagkakataon para maibahagi ang iyong karanasan',
    ],
    dontsFil: [
      'Huwag mag-random na pumili ng mga sagot',
      'Huwag hayaan ang iyong personal na saloobin na makaapekto sa iyong maingat na pagsusuri',
      'Huwag laktawan ang evaluation — ito ay nakakaapekto sa kalidad ng edukasyon',
    ],
  },
  {
    // 8 Banner Request - Appeal for PD
    warnFil: 'Ang Appeal for Permanent Disqualification ay isang seryosong kahilingan. Siguraduhing may malinaw at matibay na dahilan ang iyong apela.',
    dosFil: [
      'Maghanda ng kompletong dokumentasyon para sa iyong apela',
      'Kumonsulta sa iyong academic adviser bago mag-file ng apela',
      'Sundin ang itinakdang proseso at mga deadline',
    ],
    dontsFil: [
      'Huwag mag-file ng apela nang walang sapat na dahilan at dokumentasyon',
      'Huwag mag-assume na awtomatikong maaprubahan ang iyong apela',
      'Huwag i-bypass ang opisyal na proseso ng apela',
    ],
  },
  {
    // 9 Banner Request - Late Enrollment
    warnFil: 'Ang Late Enrollment ay may kaukulang multa at napapailalim sa availability ng seksyon. Hindi garantisado ang iyong mga subject.',
    dosFil: [
      'Mag-file ng kahilingan para sa late enrollment sa lalong madaling panahon',
      'Maghanda ng valid na dahilan at dokumentasyon para sa iyong kahilingan',
      'Bayaran ang late enrollment fee agad pagkatapos ng approval',
    ],
    dontsFil: [
      'Huwag mag-delay ng pagha-file ng late enrollment request',
      'Huwag mag-expect na makuha mo ang iyong nais na schedule',
      'Huwag mag-file ng late enrollment nang walang sapat na dahilan',
    ],
  },
  {
    // 10 Banner Request - Change/Add/Drop
    warnFil: 'Ang Change/Add/Drop ay may mahigpit na deadline. Ang mga kahilingang lampas sa deadline ay karaniwang hindi na tinatanggap.',
    dosFil: [
      'Mag-file ng kahilingan para sa Add/Drop sa loob ng opisyal na period',
      'Kumpirmahin na may available na slot ang seksyong nais mong pumasok',
      'Makipag-ugnayan sa iyong adviser bago mag-drop ng subject',
    ],
    dontsFil: [
      'Huwag mag-drop ng subject nang walang konsultasyon sa adviser',
      'Huwag magtanggal ng lahat ng subjects nang walang proper documentation',
      'Huwag mag-assume na awtomatikong na-drop ang subject kapag hindi ka pumupunta',
    ],
  },
  {
    // 11 Banner Request - Withdrawal
    warnFil: 'Ang Withdrawal bago ang midterm ay nagdudulot ng WP o WF. Ang WF ay nakakaapekto sa iyong GWA. Kumonsulta sa adviser bago mag-withdraw.',
    dosFil: [
      'Kumonsulta sa adviser bago magdesisyong mag-withdraw',
      'Alamin kung ikaw ay magtatanggap ng WP o WF batay sa iyong kasalukuyang standing',
      'Sundin ang opisyal na proseso ng withdrawal',
    ],
    dontsFil: [
      'Huwag umalis sa klase nang walang opisyal na withdrawal',
      'Huwag mag-withdraw sa huling sandali nang walang sapat na dahilan',
      'Huwag balewalain ang epekto ng WF sa iyong GWA at academic standing',
    ],
  },
  {
    // 12 Requesting Official Documents
    warnFil: 'Ang mga opisyal na dokumento ay may processing time at bayad. Planuhin nang maaga lalo na para sa mga mahahalagang deadline.',
    dosFil: [
      'Mag-request ng dokumento nang maaga para maiwasan ang rush fee',
      'Suriin ang uri ng dokumento na kailangan mo bago mag-request',
      'Itago ang iyong resibo ng bayad para sa dokumento',
    ],
    dontsFil: [
      'Huwag mag-request ng dokumento sa huling sandali',
      'Huwag mag-expect na matatanggap mo agad ang opisyal na dokumento',
      'Huwag magpadala ng ibang tao para kumuha ng dokumento nang walang authorization letter',
    ],
  },
];

/* ─── DEPARTMENT HEAD (4 modules) ──────────────────────── */
const DEPT_HEAD_FIL: TipsFil[] = [
  {
    // 1 Dept Head Dashboard
    warnFil: 'Ang iyong dashboard ay nagpapakita ng real-time na datos para sa iyong departamento. Suriin ito nang regular para matugunan agad ang mga isyu.',
    dosFil: [
      'Suriin ang dashboard sa simula ng bawat linggo',
      'Bigyang-pansin ang mga pending consent requests',
      'Makipag-koordinasyon sa OCS para sa mga isyu na nangangailangan ng sistema',
    ],
    dontsFil: [
      'Huwag balewalain ang mga pending na consent requests',
      'Huwag mag-approve ng mga kahilingan nang walang sapat na impormasyon',
      'Huwag hayaang lampas ang mga deadline sa pagsusuri ng mga consent',
    ],
  },
  {
    // 2 Consent Management
    warnFil: 'Ang iyong approval o rejection ng consent ay panghuling desisyon. Suriin nang mabuti ang bawat kahilingan bago magdesisyon.',
    dosFil: [
      'Suriin ang academic record ng estudyante bago mag-approve o mag-reject',
      'Mag-respond sa lahat ng consent requests sa loob ng 24-48 na oras',
      'Magbigay ng malinaw na dahilan para sa bawat rejection',
    ],
    dontsFil: [
      'Huwag mag-approve ng consent nang walang maingat na pagsusuri',
      'Huwag balewalain o ipagpaliban ang mga consent requests',
      'Huwag mag-approve ng consent para sa estudyante na malinaw na hindi kwalipikado',
    ],
  },
  {
    // 3 Faculty Load
    warnFil: 'Ang faculty load ay dapat sumunod sa minimum at maximum na unit requirement. Ang sobrang-daming load ay maaaring makaapekto sa kalidad ng pagtuturo.',
    dosFil: [
      'Regular na suriin ang load ng bawat faculty member sa iyong departamento',
      'Tiyaking may sapat na faculty para sa lahat ng seksyon sa termino',
      'I-balance ang load sa pagitan ng mga faculty para sa patas na distribusyon',
    ],
    dontsFil: [
      'Huwag mag-assign ng sobrang daming load sa isang faculty',
      'Huwag mag-assign ng faculty sa kurso na labas sa kanilang espesyalidad nang walang sapat na dahilan',
      'Huwag kalimutang mag-update ng faculty load pagkatapos ng mga pagbabago sa seksyon',
    ],
  },
  {
    // 4 Department Reports
    warnFil: 'Ang mga departamento report ay naglalaman ng sensitibong datos ng faculty at estudyante. Pangalagaan ang kumpidensyalidad ng lahat ng impormasyon.',
    dosFil: [
      'Regular na i-generate ang mga report para sa departamento review',
      'Gamitin ang mga report para mapabuti ang mga kurso at serbisyo ng departamento',
      'I-store nang ligtas ang lahat ng na-export na report',
    ],
    dontsFil: [
      'Huwag ibahagi ang sensitibong datos ng faculty sa hindi awtorisadong mga tao',
      'Huwag gumawa ng report batay sa hindi verified na datos',
      'Huwag gamitin ang mga report para mag-single out ng indibidwal nang hindi makatuwiran',
    ],
  },
];

export const TIPS_FIL: Record<Role, TipsFil[]> = {
  admin: ADMIN_FIL,
  ocs: OCS_FIL,
  faculty: FACULTY_FIL,
  student: STUDENT_FIL,
  department_head: DEPT_HEAD_FIL,
};
