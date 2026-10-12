import { Factory, SlidersHorizontal, FileCheck2, Train, Landmark, Wrench, Truck, Store, GraduationCap, Briefcase } from 'lucide-react';
import type { LandingData } from './templates';

export const CITY_PAGES_PART1: Record<string, LandingData> = {
  gurugram: {
    template: 'F',
    meta: {
      title: 'ATS Resume Tips for Gurugram Job Seekers | ScoreMyResume',
      description: 'Gurugram is the NCR IT, consulting and BFSI hub. Practical resume advice for the city’s competitive corporate gateways, from Cyber City to Manesar.',
    },
    badge: 'gurugram · gurgaon · NCR corporate corridor',
    title: 'Gurugram: every role has a queue, so the resume must survive the filter',
    sub: `Gurugram hires at a scale almost no other Indian city matches. The corporate towers along Cyber City, Udyog Vihar, Golf Course Road and the Manesar belt pull talent from Delhi and across the NCR, and a single posting routinely collects hundreds of applications in a day. That volume is exactly why so many Gurugram recruiters rely on resume filtering before a person ever opens the file. A candidate from another town, mid-industry-switch, or fresh from campus all face the same gate: a document that parses cleanly, matches the role language, and still reads like a genuine professional summary. This page is written for that gate.`,
    pairs: [
      { title: 'The corporate gateway is software first', challenge: `Gurugram MNCs and consultancies lean on the same recruiting stack, from application portals to automated shortlisting. The resume that looks best in print can be the one that files worst in extraction.`, solve: `Keep the layout conventional: one column, familiar headings, literal dates and text-only contact details, so the machine files what the shortlister later prints.` },
      { title: 'MNC and startup vocabulary split the city', challenge: `A global consulting firm and a Manesar scale-up want different language for the same work. The consulting resume needs frameworks and compliance terms; the startup resume needs velocity and outcome language.`, solve: `Tailor the keyword set to each posting. Keep one strong base version, then swap the role-term bullets to the sector vocabulary the current shortlist actually asks for.` },
      { title: 'The commuter candidate is judged on the document twice', challenge: `Many Gurugram applicants live in Delhi, Faridabad, Rewari or further out. On paper, the location line is the first impression before scheduling ever begins.`, solve: `State a realistic base or work mode honestly in the contact line. A truthful two-line profile beats a vague summary when the conversation turns to joining time and daily travel.` },
    ],
    faqs: [
      { q: 'How does Gurugram hiring differ from startup hiring elsewhere?', a: `The city runs both extremes at once: process-heavy corporate recruiting and fast decision-making startups. The same resume rarely optimizes for both, so keep a corporate version and a startup version, and check each against the posting before sending.` },
      { q: 'Should I mention my hometown or relocation status?', a: `Yes, and honestly. Gurugram recruiters commonly ask about relocation and joining time because housing and traffic shape decisions. A short "open to Gurugram / NCR roles" line prevents a promising profile being dropped at screening.` },
      { q: 'What are the most common weak signals Gurugram recruiters see?', a: `Two-page resumes holding one page of content, skills piled with no context, and contact details embedded in a header image. All three are exactly what an ATS score exposes in seconds.` },
    ],
    cta: { label: 'gurugram-specific check', title: 'Run the resume you are sending to a Gurugram posting', text: `The free checker scores all five signals locally, and with a job description pasted it shows which NCR-posting keywords matched and which did not. Re-scan after every edit and re-apply with confidence.` },
    related: [
      { href: '/resume-help/it-jobs', label: 'IT & tech roles' },
      { href: '/resume-help/city/faridabad', label: 'Faridabad · NCR' },
      { href: '/resume-help/city/palwal-sohna', label: 'Palwal · Sohna corridor' },
      { href: '/resume-help/remote-jobs', label: 'Work-from-home options' },
    ],
    keywords: [
      'Gurugram resume tips',
      'NCR job seeker',
      'Cyber City careers',
      'Manesar corporate roles',
      'Gurugram IT jobs',
      'BFSI resume keywords',
      'NCR application portal',
      'Gurugram relocation resume',
      'consulting resume tips',
      'startup vs corporate resume',
      'ATS resume Gurugram',
      'Gurugram joining time',
    ],
    keywordsNote: `These Gurugram resume tips track the NCR job market as it actually runs: fast postings, crowded application portals and shortlisting filters. Keep this keyword set beside you when you tailor a resume for a Cyber City, Golf Course Road or Manesar corporate role, and expect each application to favour a slightly different mix of terms.`,
    extra: [
      {
        heading: 'Keyword matching for NCR application portals',
        paragraphs: [
          `Every large Gurugram employer runs applications through an applicant tracking system before a recruiter ever opens the file. That makes keyword matching a Gurugram resume skill in its own right: take the exact terms from the posting, place them in the summary and bullet lines, and keep every phrase true to what you actually did at work.`,
          `The NCR posting vocabulary varies by tower. Cyber City consultancies want framework and delivery language, while Manesar and Udyog Vihar plants want output and safety terms. Keep one strong base resume, then adjust a handful of role bullets per application so the portal match rises without the document becoming a keyword list. Resist the urge to stuff skills into a sidebar, where extraction can bury them.`,
        ],
      },
      {
        heading: 'Relocation and joining lines that survive screening',
        paragraphs: [
          `Gurugram recruiters screen outsiders by practical signals: commuting base, work mode and joining time. Put an honest line near the top, such as "Currently Delhi-based, open to Gurugram and NCR roles with two weeks notice," so the shortlist does not drop you on an assumption. The same line signals that you understand how the NCR labour market moves, which is itself a positive read.`,
          `Application portals let candidates add availability and current location fields. Fill them rather than leaving them blank, because an empty field reads as an uncommitted application. When offers come, mention realistic joining time for your notice period and travel, since Gurugram firms often decide between two shortlisted profiles on that single detail. Tailor it per posting and keep it accurate, because a verified offer letter should never contradict the resume.`,
        ],
      },
    ],
  },

  faridabad: {
    template: 'G',
    meta: {
      title: 'ATS Resume Tips for Faridabad Job Seekers | ScoreMyResume',
      description: 'Manufacturing backbone with a growing IT and BPO layer. Practical resume advice for Faridabad’s industrial and services hiring mix.',
    },
    badge: 'faridabad · NCR industrial & services mix',
    title: 'Faridabad: manufacturing roots, services future, one resume in two dialects',
    sub: `Faridabad sits on the Delhi border with a split personality. Heavy manufacturing, fabrication and engineering plants still absorb a large share of local hiring, while BPO, IT services and corporate support roles have filled the same job boards for years. A Faridabad job seeker often has to write one resume that speaks both dialects: plant-floor discipline with measurable output, and the cleaner, keyword-driven language of a services role. This page walks through keeping that balance without letting either audience feel ignored.`,
    quote: { text: 'Industrial resumes prove output; services resumes prove process. The strongest Faridabad resumes show both in the same chronological order.', attribution: 'the two-dialect rule' },
    cards: [
      { title: 'Quantify plant work like a services candidate would', icon: Factory, text: `"Supervised sheet-metal line" becomes evidence when you add shifts handled, output improved, or rework reduced. Measurement language is the common currency that lets an industrial profile compete inside a services ATS.` },
      { title: 'Mirror the exact role title from the posting', icon: SlidersHorizontal, text: `Whether a board says "production supervisor" or "operations executive," use its phrasing in your most relevant bullet. Faridabad portals fill with standardized titles, and matching them raises keyword match directly.` },
      { title: 'Keep certifications and training visible', icon: FileCheck2, text: `Industrial postings often ask for trade certificates, machine operation courses or safety training. List them under Training with the issuing body and year, so a screening checklist can tick them off.` },
      { title: 'Bridge the Delhi commute honestly', icon: Train, text: `Faridabad feeds Delhi jobs too, so state your openness on the location line: "Faridabad-based, open to NCR." Recruiters on both sides read that single line as your joining-time signal.` },
    ],
    cta: { label: 'for the next application', title: 'Check the resume you are sending from a Faridabad posting', text: `The free checker highlights length, keywords, content, organization and scanning issues, and shows your match against a posting in one view. Local to your browser, repeatable as often as you edit.` },
    related: [
      { href: '/resume-help/city/gurugram', label: 'Gurugram · NCR' },
      { href: '/resume-help/city/bahadurgarh', label: 'Bahadurgarh · Delhi NCR' },
      { href: '/resume-help/it-jobs', label: 'IT & tech roles' },
      { href: '/resume-help/freshers', label: 'Fresher resumes' },
    ],
    keywords: [
      'Faridabad resume tips',
      'NCR industrial jobs',
      'Faridabad manufacturing roles',
      'Faridabad BPO jobs',
      'sheet metal plant resume',
      'quality inspection resume',
      'engineering sales Faridabad',
      'ATS resume Faridabad',
      'Faridabad Delhi commute jobs',
      'production supervisor resume',
      'operations executive resume',
      'Faridabad HR screening',
    ],
    keywordsNote: `These Faridabad resume tips cover the city's two-sided market: traditional manufacturing and plant roles on one side, and the growing IT, operations and BPO layer on the other. Use the keyword set to keep one document readable to industrial shortlists and the cleaner portal filters that increasingly decide NCR hiring.`,
    extra: [
      {
        heading: 'One resume, two Faridabad dialects',
        paragraphs: [
          `Faridabad hiring splits between plant-floor and services roles, and the resume that serves both keeps measurement language in every section. A fabrication or sheet-metal role becomes evidence when you add output, rejection rates or shifts handled, while a BPO or operations bullet stays tight, keyword-aligned and process-driven. Two profiles in separate files are fine, but most Faridabad candidates send one, so build the document that reads competently to both audiences.`,
          `Industrial employers verify: the issuing body, the exact designation, and the years behind each claim. List trade certificates, machine operation courses and safety training under a dated Training section, and name the plant or company precisely in each role line. A clean, conventional layout also keeps the same document safe when it crosses into a services portal.`,
        ],
      },
      {
        heading: 'NCR distance, honest on the resume',
        paragraphs: [
          `Faridabad feeds Delhi and Gurugram with daily commuters, so recruiters on both sides of the border read one line before anything else. Write "Faridabad-based, open to NCR roles" plainly in the contact block and mention flexibility about work mode. That honesty is a joining-time signal far stronger than a vague summary. Keep it accurate; interview logistics and shift reporting will check it.`,
          `When a job board asks for current location and experience level, fill the fields rather than skipping them. Trade and operations roles in the NCR belt screen on these exact lines. And whether the posting says production supervisor or operations executive, mirror its phrasing in the relevant bullet so the shortlist match is explicit at a glance.`,
        ],
      },
    ],
    faqs: [
      { q: 'Which Faridabad resumes suit manufacturing roles best?', a: `Manufacturing shortlists want evidence: output figures, machine types handled, rejection and rework rates, and certified training. Keep the layout single-column and conventional, state the plant and exact designation on each role, and list every trade certificate with the issuing body and year.` },
      { q: 'How should Faridabad job seekers write a resume for BPO and operations roles?', a: `BPO and operations hiring filters on process language and exact titles. Mirror the posting wording, keep bullets short and chronology clean, and put education and typing or software skills in standard headings. One polished document can serve both the industrial and services sides of Faridabad hiring.` },
      { q: 'Should I mention my Delhi or NCR commute on a Faridabad resume?', a: `Yes, briefly and honestly. A line such as "Faridabad-based, open to Delhi and other NCR roles" answers the joining and travel question before screening raises it. It prevents a well-matched profile from being dropped on the basis of location alone.` },
      { q: 'What weak signals get Faridabad resumes rejected in ATS screening?', a: `Unlabelled dates, skills buried in sidebars or images, and generic titles like "executive" that match nothing. Recruiters cross-check certificate details and designation wording, so vague lines fail both the machine pass and the manual review that follows.` },
      { q: 'How do I prepare a Faridabad resume for both plant and services audiences?', a: `Keep one base document with standard headings, then tailor a few bullets per application. Use measurement language for industrial posts and mirror the exact job-board title for operations or BPO posts. The same conventional layout survives both a factory foreman's review and an application portal.` },
    ],
  },

  panchkula: {
    template: 'H',
    meta: {
      title: 'ATS Resume Tips for Panchkula Job Seekers | ScoreMyResume',
      description: 'Panchkula anchors the Chandigarh tricity white-collar and government hiring. Resume advice for administrative, professional and state roles.',
    },
    badge: 'panchkula · chandigarh tricity · steady structured hiring',
    title: 'Panchkula: where tricity white-collar and state hiring share the boards',
    sub: `Panchkula is the ordered corner of the Chandigarh tricity, and its hiring reflects the region's character: steady, structured, and split between professional white-collar roles and state or administrative work. Because the workforce commutes freely among Panchkula, Chandigarh and Mohali, a Panchkula resume is often read by employers across all three cities. Format consistency matters more than local flavor, since the same document may land in a private firm's portal and a government shortlist in the same week.`,
    statValue: '3',
    statLabel: 'cities in the tricity recruiting loop',
    statNote: `Panchkula, Chandigarh and Mohali share one labor market. A resume built once with clean structure and standard headings can circulate across all three without revision.`,
    tips: [
      { title: 'Write for the shared tricity market', text: `Label your location as "Panchkula / tricity" and leave room for roles across all three cities. Employers already treat the belt as one pool, so the resume should not overcommit to one town's boundary.` },
      { title: 'Keep administrative language tight', text: `Tricity professional roles reward concision: short bullets, standard headings, clean date formats. That structure reads like someone who can handle coordination work on the first pass.` },
      { title: 'Let government and private sections share a neutral frame', text: `If you are open to both state notifications and private roles, keep the factual blocks neutral: education, training, experience, each clearly dated. Add only notification-specific extras at application time.` },
      { title: 'Match the designation wording', text: `Mirror the exact wording of each application, whether "executive assistant," "office manager" or "section officer." Tricity shortlists filter by title keywords more than almost any other field.` },
    ],
    cta: { label: 'tricity-ready document', title: 'One clean check across all five signals', text: `Run your Panchkula resume through the free checker, paste the posting you are chasing, and the match view tells you which tricity-posting terms landed. Nothing leaves your browser.` },
    related: [
      { href: '/resume-help/government-jobs', label: 'Government applications' },
      { href: '/resume-help/city/ambala', label: 'Ambala · services belt' },
      { href: '/resume-help/city/karnal', label: 'Karnal · govt mix' },
      { href: '/resume-help/freshers', label: 'Fresher resume tips' },
    ],
    keywords: [
      'Panchkula resume tips',
      'Chandigarh tricity jobs',
      'tricity white-collar hiring',
      'Panchkula administrative roles',
      'government job resume Panchkula',
      'HR screening tricity',
      'office manager resume tips',
      'executive assistant resume',
      'Panchkula Chandigarh Mohali jobs',
      'section officer application resume',
      'corporate hiring tricity',
      'one document tricity market',
    ],
    keywordsNote: `These Panchkula resume tips are written for the tricity labour market, where Panchkula, Chandigarh and Mohali recruit from a single shared pool. Keep the keyword set close while you tailor a document for white-collar corporate roles, administrative postings or the structured state shortlists that still screen heavily by designation wording.`,
    extra: [
      {
        heading: 'A tricity resume travels to all three cities',
        paragraphs: [
          `Because the workforce moves freely across Panchkula, Chandigarh and Mohali, most employers treat the belt as one hiring pool. Write your location as "Panchkula / tricity" and avoid wording that locks you to a single town boundary. A consistent, conventional structure with standard headings lets the same document circulate through corporate portals and formal shortlists without revision.`,
          `HR screening in the tricity is fast but structured, and it leans on the exact designation field. If the application says executive assistant, office manager or section officer, mirror that wording in the matching bullet. Keep dates literal, education clearly dated, and every section headed by a label a parser recognises. That small discipline is what separates a tricity-clean resume from one that reads local but files badly.`,
        ],
      },
      {
        heading: 'White-collar and government on the same page',
        paragraphs: [
          `Panchkula resumes mostly land in two camps: private professional roles and state or administrative applications. You can serve both with a neutral frame, since each camp adds only a couple of notification-specific extras at submission time. Keep the blocks factual, chronological and free of graphics, which both corporate ATS filters and government suitability checks reward equally.`,
          `For private white-collar posts, lead with the role title the posting uses and keep the summary two lines. For state shortlists, ensure education and training read in full and are precisely dated, since eligibility checks verify them line by line. The same base resume, lightly adjusted, covers both Panchkula shortlists and tricity corporate screening on the same week.`,
        ],
      },
    ],
    faqs: [
      { q: 'How should a Panchkula resume be formatted for tricity HR screening?', a: `Tricity HR screening moves quickly, so format matters more than flair. Use one column, standard headings, literal dates and a two-line summary. If the resume reads cleanly after extraction, it reads cleanly to the desk reviewer on the other side of the table.` },
      { q: 'Can one resume cover Panchkula, Chandigarh and Mohali jobs?', a: `Yes. Employers across the tricity recruit from the same pool, so a single, conventionally structured document works everywhere. Label your base as "Panchkula / tricity," keep education and experience clearly dated, and only adjust title wording per posting rather than rewriting the whole file.` },
      { q: 'What keywords matter for Panchkula white-collar roles?', a: `Designation keywords matter most: mirror the application wording, whether that is executive assistant, office manager, coordinator or section officer. Around them, keep soft-skill lines honest and role-specific, because tricity shortlists filter by title terms more than any other field.` },
      { q: 'Which resume mistakes fail Panchkula state and administrative shortlists?', a: `Missing dates are the biggest offender, followed by graphics and two-column layouts that break in extraction, and vague headings like "experience" instead of the role title. Government screening verifies eligibility line by line, so precise education and training entries are non-negotiable.` },
      { q: 'Should Panchkula freshers write their resume differently?', a: `A fresher in the tricity should lead with education and training, in full and precisely dated, and use project or internship bullets to demonstrate the job title keywords they are chasing. Keep it one page, honest, and formatted so a portal extracts every heading correctly.` },
    ],
  },

  ambala: {
    template: 'I',
    meta: {
      title: 'ATS Resume Tips for Ambala Job Seekers | ScoreMyResume',
      description: 'Ambala’s services, transport and trade economy values practical, honest resumes. Advice for professional, technical and engineering-sales roles.',
    },
    badge: 'ambala · a market that checks the details',
    title: 'Ambala: resumes built for recruiters who verify everything',
    sub: `Ambala sits at the junction of the Grand Trunk Road and twin cantonments, and its economy stays practical: trading houses, transport and logistics firms, service workshops, engineering sales, and a steady professional layer serving the military towns and surrounding district. Employers here are detail-checkers. They verify issuing authorities, exact titles, years and sign-offs. An Ambala resume earns trust by being precise, conventional and complete, which happens to be exactly what parsing rewards too.`,
    rows: [
      { title: 'Name the issuing body and year on every certificate', icon: Landmark, text: `From ITI and diploma credentials to shop-floor training, Ambala recruiters verify provenance. "Certificate in diesel mechanics, Govt. ITI Ambala, 2021" checks the box and files cleanly under Education and Training.` },
      { title: 'Split technical sales into product and territory', icon: Wrench, text: `A technical sales profile should open with the product categories handled and territory covered, then move to the metrics, revenue share, dealer network, collection cycles. Both halves matter, in that order.` },
      { title: 'Date every trade and transport role literally', icon: Truck, text: `Logistics and trading roles are judged on tenure and span. Literal start and end dates, one line per role, and honest descriptions of routes or markets served keep the history audit-ready.` },
      { title: 'Keep a printed-clean version alongside the emailed one', icon: FileCheck2, text: `Many Ambala small and mid-sized employers still pass the resume around on paper. Keep your standard document equally legible printed and parsed: black text, no low-contrast panels, no columns that collapse in extraction.` },
      { title: 'Mirror the exact vacancy language', icon: Store, text: `Whether a board says "counter sales executive," "service engineer" or "transport manager," use that phrasing in the relevant bullet, so the shortlist match is explicit to the software and the person cross-checking.` },
    ],
    cta: { label: 'audit before you apply', title: 'A quick five-signal scan catches the details Ambala employers verify', text: `The free checker runs locally, scores length, keywords, content, organization and scanning, and highlights the certificate and date gaps a detail-checking recruiter would ask about.` },
    related: [
      { href: '/resume-help/city/panchkula', label: 'Panchkula · tricity' },
      { href: '/resume-help/city/karnal', label: 'Karnal · govt & corporate' },
      { href: '/resume-help/freshers', label: 'Fresher resumes' },
      { href: '/resume-help/digital-marketing', label: 'Marketing roles' },
    ],
    keywords: [
      'Ambala resume tips',
      'Ambala services jobs',
      'Ambala trade and commerce',
      'cantonment market job roles',
      'logistics resume Ambala',
      'technical sales resume',
      'engineering sales Ambala',
      'ITI diploma resume tips',
      'transport manager resume',
      'counter sales executive resume',
      'Ambala ATS resume check',
      'military station jobs Ambala',
    ],
    keywordsNote: `These Ambala resume tips speak to a market that verifies what it reads. Trade houses, transport firms, engineering sales and the cantonment-adjacent services layer all check certificates, exact titles and dates, so this keyword set pairs with a precise, conventional resume built to survive that scrutiny and any parsing software it meets.`,
    extra: [
      {
        heading: 'Precision is the Ambala hiring test',
        paragraphs: [
          `Ambala employers across trade, services and engineering sales verify details before they trust a resume. Name the issuing body and year on every certificate, give literal start and end dates for each role, and write the exact designation the vacancy uses. A precise document files cleanly and reads like the work of someone who keeps records properly.`,
          `The cantonment and Grand Trunk Road belt supports transport, logistics, warehousing and trading roles where tenure and route data matter. Date every role literally and describe the markets or routes served in plain terms. For technical sales, open with product categories and territory before moving to revenue, dealer network and collection figures. Spell out figures as numbers so both the eye and the parser read them consistently.`,
        ],
      },
      {
        heading: 'Detail-checking employers and the ATS meet on the same page',
        paragraphs: [
          `Many Ambala small and mid-sized firms still pass resumes around on paper, while the newer job boards run the same file through parsing. The format that survives both is plain: black text, no low-contrast panels, no columns that collapse, and contact details written as literal text rather than embedded in a header image. In this market the printed copy and the parsed copy should read identically.`,
          `When a vacancy says counter sales executive, service engineer or transport manager, mirror that phrase in the relevant bullet so the shortlist match is explicit in software and to the person cross-checking. Add a short cover note confirming you are Ambala-based or open to the district belt, which answers the geography question early. Honest answers here save everyone a wasted round of calls.`,
        ],
      },
    ],
    faqs: [
      { q: 'How do Ambala employers check resume claims?', a: `Ambala trade and services employers routinely verify certificate issuing authorities, exact designations and employment years before an offer. Keep every credential dated with the issuing body, list ITI, diploma and training entries under Education and Training, and never inflate tenure, because verification is part of the local hiring habit.` },
      { q: 'What should a technical sales resume for Ambala include first?', a: `Open with product categories handled and territory covered, then move to revenue share, dealer network and collection cycles. That order matches how engineering sales managers in Ambala read a resume: scope first, proof second, and always with literal dates on each role line.` },
      { q: 'Are certificates important in Ambala job applications?', a: `Very. Industrial, transport and trading posts around the cantonment and services belt ask for trade certificates, machine training and safety or ITI credentials. List them with the issuing authority and year under Training so a screening checklist can tick each one off in seconds.` },
      { q: 'Should my Ambala resume be formatted for paper printouts too?', a: `Yes. Many Ambala small and mid-sized employers print resumes and pass them around before deciding on interviews. Use black text, standard headings, one column and literal contact details so the file reads cleanly on paper and survives parsing with the same quality.` },
      { q: 'How do I get my Ambala resume past an ATS score check?', a: `Keep the structure conventional so extraction files headings correctly, mirror the vacancy designation in at least one bullet, and make certificates and dates explicit text. Run the document through a score check after every edit and refine one weak signal at a time before applying.` },
    ],
  },

  sonipat: {
    template: 'J',
    meta: {
      title: 'ATS Resume Tips for Sonipat Job Seekers | ScoreMyResume',
      description: 'Sonipat pairs an expanding education and IT-park layer with industrial hiring. Resume advice for the Rajiv Gandhi Education City workforce and plants.',
    },
    badge: 'sonipat · education city & industrial belt',
    title: 'Sonipat: education and industry in one town, one resume',
    sub: `Sonipat has become two markets in one town. The industrial side hires manufacturing and agro profiles with verifiable skills; the knowledge side, anchored around the Rajiv Gandhi Education City belt, IT parks and corporate campuses, draws freshers and young professionals. A Sonipat resume is strongest when it can face both directions: disciplined and verifiable for the plant or warehouse shortlist, structured and keyword-matched for the newer knowledge-economy roles.`,
    cards: [
      { title: 'Lead with the education asset while it is fresh', icon: GraduationCap, text: `Recent graduate? Put Education high on the page with specialization, percentage or CGPA where comfortable, and the passing year as literal text so the parser files it first.` },
      { title: 'Count industrial tasks the way a plant counts them', icon: Factory, text: `Batch sizes, machines handled, output and shift patterns are the Sonipat factory language. Put a measure on the everyday task and the industrial half of the market reads you instantly.` },
      { title: 'Keep knowledge-economy keywords inside bullets', icon: Briefcase, text: `For IT-park and corporate roles, weave role terms into project or internship bullets with context. A standalone skills list reads thinner than the same terms demonstrated in a bullet.` },
    ],
    cta: { label: 'both markets, one check', title: 'Confirm your Sonipat resume reads for industry and knowledge roles', text: `The free checker scores all five signals and, with a posting pasted, shows your keyword match for either market. One document, two audiences, one clean scan.` },
    related: [
      { href: '/resume-help/freshers', label: 'Fresher resumes' },
      { href: '/resume-help/city/rohtak', label: 'Rohtak · fresher hub' },
      { href: '/resume-help/city/gurugram', label: 'Gurugram · NCR' },
      { href: '/resume-help/digital-marketing', label: 'Marketing roles' },
    ],
    keywords: [
      'Sonipat resume tips',
      'Rajiv Gandhi Education City jobs',
      'Sonipat fresher resume',
      'Sonipat IT park careers',
      'Sonipat industrial roles',
      'Haryana NCR job market',
      'manufacturing resume Sonipat',
      'campus placement resume tips',
      'agro processing roles',
      'engineering fresher resume',
      'warehouse logistics Sonipat',
      'ATS score Sonipat',
    ],
    keywordsNote: `These Sonipat resume tips cover a town with two labour markets in one: the industrial belt hiring verifiable plant and logistics skills, and the education and IT-park side drawing freshers and young professionals. Use the keyword set for either direction, then mirror the specific job-board wording when you submit from Sonipat to Haryana and NCR postings.`,
    extra: [
      {
        heading: 'Two Sonipat markets, one structured resume',
        paragraphs: [
          `Sonipat's industrial side and its knowledge side want different proof. Plants and warehouses around the district read output, machines handled, batch sizes and shift patterns, while hiring near the Rajiv Gandhi Education City and IT park corridors looks for structured education, projects and polished role language. A single conventional resume can serve both when the facts stay verifiable and the headings stay standard.`,
          `If you are a recent graduate, lead with education while it will be read: specialization, percentage or CGPA where comfortable, and the passing year as literal text. Demonstrate the role keywords you want inside project or internship bullets with real context, because a bare skills list reads thinner than the same terms proven in a sentence.`,
        ],
      },
      {
        heading: 'NCR proximity reads as flexibility',
        paragraphs: [
          `Sonipat sits close enough to Delhi and the NCR corridor that recruiters ask about travel, work mode and joining time early. A short location line, such as "Sonipat-based, open to NCR roles," answers that question before screening asks it. For professionals, keep the commute honest and the availability line consistent with what an interviewer will later verify.`,
          `Freshers arriving from the education belt have one advantage worth stating: a crisp campus record with internships, projects and soft skills that map to the role. Align every claimed keyword with the posting text and keep the roles you mention demonstrable in an interview. Structured, truthful and conventional is the Sonipat standard, whether you target a plant or a university-corridor role.`,
        ],
      },
    ],
    faqs: [
      { q: 'How should Sonipat freshers structure their resume?', a: `Put education high on the page with specialization, percentage or CGPA where comfortable, and the passing year as literal text. Then show the role keywords you want inside project or internship bullets, keeping the document to one page and every heading standard enough for a parser to recognise.` },
      { q: 'What do Sonipat industrial employers check in a resume?', a: `Plant and warehouse shortlists around Sonipat verify practical detail: machines handled, batch sizes, output and shift patterns, plus trade certificates with issuing bodies and years. Mirror the vacancy title in the relevant bullet and keep the layout single-column so the file parses cleanly and prints clearly.` },
      { q: 'How important are keywords for Rajiv Gandhi Education City roles?', a: `Very. Campus and IT-park roles filter by the exact terms in the posting. Pull that phrasing into your project, internship and summary bullets with genuine context, rather than dumping a standalone skill list that reads thin and fails a detailed match check.` },
      { q: 'Does Sonipat proximity to the NCR matter on a resume?', a: `Yes. Recruiters treating Sonipat as part of the wider Haryana and NCR job market ask about travel and joining time. A truthful location line such as "Sonipat-based, open to NCR roles" answers the question before screening raises it and keeps your profile moving.` },
      { q: 'How do I improve a Sonipat resume that fails the ATS score?', a: `Score all five signals first, then fix the weakest one. Flatten any sidebar or two-column layout, make dates literal text, mirror the posting wording, and replace vague headings with exact designations. Re-scan after each edit before you submit from a Sonipat posting.` },
    ],
  },
};