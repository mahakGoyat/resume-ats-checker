import { Briefcase, GraduationCap, Cpu, Landmark, LineChart, Globe, Laptop, Users, Captions, Server, Wrench, Megaphone, Smartphone, PenLine, Clock3, Search, FileText, Palette, Layers, Hash, ListChecks, Download, Sheet, KeyRound, TextSearch, Binary, Gauge } from 'lucide-react';
import type { LandingData } from './templates';

export const KEYWORD_PAGES: Record<string, LandingData> = {
  freshers: {
    template: 'A',
    meta: {
      title: 'Resume Checker for Freshers — First Job Resume Tips | ScoreMyResume',
      description: 'Free resume check for freshers: no work history yet? See how education, projects, internships and role keywords should carry your first resume past an ATS.',
    },
    badge: 'no experience yet · that is the point',
    title: 'Build a first resume that still parses cleanly',
    sub: `Freshers face an unfair trade: you have the least material to work with, yet your first resume is read by the same software that screens twenty-year veterans. Because you cannot lean on a career section, every other part of your document has to do the heavy lifting, and the sections you choose matter more than the years you do not have. This page covers how a fresher resume gets read, and how to arrange education, projects and training so a parser finds them instantly.`,
    cards: [
      { title: 'Let education and projects carry the weight', icon: GraduationCap, text: `Without a long employment history, your Education, Projects and Certifications blocks become your evidence. Give each one a real heading, full dates, and details a machine can file, so the scaffold looks like the backbone of the document, not a placeholder.` },
      { title: 'Keep section names the software expects', icon: Captions, text: `Recruiters skim, but parsers look for familiar labels such as Education, Projects, Skills and Internships. A fresher resume with clever headings reads well to a person and poorly to a machine; the checker catches that mismatch before you send it.` },
      { title: 'Mine the posting for the role language', icon: Search, text: `A fresher posting usually repeats the same two or three skills in every bullet. Match those exact terms in your Projects and Skills sections, phrased honestly, and the keyword signal climbs with zero invented experience.` },
    ],
    cta: { label: 'before your first application', title: 'Send your fresher resume through the same checks a recruiter portal applies', text: `Drop your resume into the free checker now, optionally paste the job description you have saved, and see length, keywords, content, organization and scanning details all scored in one pass. Everything stays in your browser.` },
    related: [
      { href: '/resume-help/it-jobs', label: 'IT & tech resumes' },
      { href: '/resume-help/remote-jobs', label: 'Remote work resumes' },
      { href: '/resume-help/city/gurugram', label: 'Gurugram job market' },
      { href: '/resume-help/city/rohtak', label: 'Rohtak & freshers' },
    ],
    keywords: [
      'ATS resume checker',
      'fresher resume',
      'first job resume',
      'resume with no experience',
      'freshman CV',
      'education section',
      'projects section',
      'fresher CV India',
      'entry level resume',
      'campus placement resume',
    ],
    keywordsNote: `Below are the phrases a fresher resume usually needs to carry. Terms like fresher resume, first job resume and resume with no experience are the ones recruiters and parsing tools look for when there is little or no work history to lean on. Fold them into your Education and Projects sections, then run an ATS resume through the resume checker to see which terms actually matched.`,
    extra: [
      {
        heading: `How education carries a no-experience profile`,
        paragraphs: [
          `For a fresher resume, the Education section is not a formality, it is the backbone. Place it near the top with your degree, college, board or university, and the passing year clearly written. Recruiters in India read it before anything else, and an ATS reads it the same way, so a cleanly dated education block does real work.`,
          `Group class ten, twelve, your degree and any diploma into separate entries instead of one dense paragraph. Include relevant coursework and your percentage or CGPA where it is honest to do so. The goal is a freshman CV that an evaluator can scan in seconds and file under the right bracket without hunting for dates.`,
        ],
      },
      {
        heading: `What to put in projects when there is no job history`,
        paragraphs: [
          `Projects are the fresher resume equivalent of work experience. Whether it is a college mini-project, a final year thesis, an internship task or a hackathon build, give each one a name, a date, the stack or tools involved, and two lines about what it achieved. That shape lets a resume checker confirm the keywords the posting repeats.`,
          `Do not invent technologies or fake responsibilities to inflate the list. A resume with no experience earns trust by being specific about what you actually did, including coursework you made, components you wired and tools you learned on your own. Honest, dated projects parse cleanly and hold up in the campus placement interview that follows.`,
        ],
      },
    ],
    faqs: [
      { q: `What should a fresher resume contain when I have no work experience?`, a: `Lean on Education, Projects, Skills and Internships. Put your degree, passing year and relevant coursework near the top, then let two or three dated projects carry the bulk. Keep everything under plain headings so both an ATS resume scan and a recruiter find the same sections quickly.` },
      { q: `How do I write a first job resume that still passes an ATS?`, a: `Use standard section names and a single-column layout, and repeat the exact skills the posting asks for inside project bullets rather than in a lone skills list. Save the file as a text-layer PDF, then run your ATS resume through a free resume checker to confirm it parses before you apply.` },
      { q: `Is it okay to submit a resume with no experience at all?`, a: `Yes, most fresher openings expect exactly that. A resume with no experience should still show education, projects, training and skills in a readable order, because reviewers and parsing tools screen those sections rather than your missing career history. Structure it cleanly and the gap stops mattering.` },
      { q: `Which sections help my fresher CV score higher in a resume checker?`, a: `Education, Projects, Skills and Internships are the four sections a checker files first for fresh candidates. Date each entry, name the tools involved, and mirror the keywords from the posting. Weak contact headers and layout scrambles cost more points than thin content in a freshman CV.` },
      { q: `How long should my first resume be when I just finished college?`, a: `One page is the safe target for most fresher resumes. Add a second only when projects, training and certifications genuinely need the room and each line adds evidence. Recruiters spend seconds on entry-level applications, so lead with the strongest dated material.` },
    ],
  },

  itJobs: {
    template: 'B',
    meta: {
      title: 'ATS Resume Checker for IT & Tech Jobs | ScoreMyResume',
      description: 'Tech resumes love skill piles and tables — both trip up ATS parsers. Practical tips to make an IT resume scan cleanly while keeping the depth engineers want.',
    },
    badge: 'for developers, testers, analysts & infra folks',
    title: 'An IT resume that an ATS can actually read',
    sub: `Tech resumes fail differently from other resumes: not because they are empty, but because they are overloaded. Long skill lists, nested tables, two-column layouts, acronyms that appear only in the skills pile, and project descriptions that never say what the tool did. The opposite problem shows up too, a one-line skills section that never mentions the stack a job posting repeats. Both extremes lose points on the same five signals this checker scores.`,
    statValue: '5',
    statLabel: 'signals scored on every scan',
    statNote: `Length, keyword optimization, content, organization and scanning details are each graded separately. IT resumes usually trip on organization first, then keyword matching.`,
    tips: [
      { title: 'Repeat role terms inside bullets, not only in a skills block', text: `Past a skills section, a parser still wants to see the stack in context. Writing "built React dashboards consuming a GraphQL API" inside a project bullet matches a posting that asks for React, and it reads like experience instead of a list.` },
      { title: 'Give every tool a sentence around it', text: `Saying "AWS" gets filed, but saying "migrated a nightly batch job to AWS Lambda" tells the parser and the reader how you used it. One line of context turns a buzzword into a claim a human can verify.` },
      { title: 'Flatten columns and tables before uploading', text: `Many tech resumes use sidebars for skills or certifications. A two-column layout can merge tool names into the wrong field when extracted. One column, plain headings, and your skill tags become a normal Skills block.` },
      { title: 'Mirror the posting vocabulary', text: `If the listing says "software engineer" and your header says "developer," or it says "Python" and you wrote "py," the match is weaker than it needs to be. Use the title and terms the posting uses, where honest.` },
      { title: 'Let dates and deployments stay readable text', text: `Visual timelines, icons and graphs look great and extract terribly. Keep months and years as literal text, and mention platforms and environments inside the bullet where a recruiter naturally reads them.` },
    ],
    cta: { label: 'ready to see the report', title: 'Run your tech resume through the checker before the next application', text: `The free checker reads PDF, DOCX, image or text files entirely in this browser, and the keyword section shows exactly which posting terms matched and which did not. Re-scan after each edit to watch the bars respond.` },
    related: [
      { href: '/resume-help/freshers', label: 'First-job resumes' },
      { href: '/resume-help/digital-marketing', label: 'Marketing role resumes' },
      { href: '/resume-help/city/gurugram', label: 'Gurugram tech hub' },
      { href: '/resume-help/city/faridabad', label: 'Faridabad IT & BPO' },
    ],
    keywords: [
      'ATS resume checker',
      'IT resume',
      'software developer resume',
      'tech skills section',
      'two-column layout problem',
      'tech stack in bullet points',
      'keyword matching',
      'resume scanner for IT jobs',
      'IT resume format',
      'technologies in context',
    ],
    keywordsNote: `The phrases below make up the vocabulary an IT resume is usually measured against. Software developer resume, tech skills section and tech stack in bullet points are the terms recruiters and parsing tools hunt for, while two-column layout and keyword matching describe the failures this checker flags. Use each phrase in context so a resume scanner for IT jobs can confirm what your document claims.`,
    extra: [
      {
        heading: `Why a two-column layout sinks a tech resume`,
        paragraphs: [
          `Many software developer resume templates borrow a magazine look with skills in a narrow sidebar and projects in the main column. Extraction reads top to bottom first and left to right second, which means sidebar tools can land in the wrong field or vanish entirely. The result is a tech resume a person admires and a scanner misreads.`,
          `The fix is mechanical, not cosmetic. Move skills and certifications into the main flow under plain headings, and keep project bullets in one column. The two-column layout problem disappears the moment the document becomes a single reading order, and keyword matching improves because each tool in the tech stack finally sits next to the achievement that proves it was used.`,
        ],
      },
      {
        heading: `Putting the tech stack inside bullet points`,
        paragraphs: [
          `Postings name languages, frameworks and services so a resume scanner for IT jobs can match them. A skills table lists those words, while a project bullet proves them. Write the stack naturally inside the sentence, saying what you built, with which technologies and for what outcome, so the keyword appears with context a human can verify.`,
          `Limit the tech skills section to tools you use regularly and repeat the posting vocabulary where honest. If the role asks for Python and your bullet names the project language, that exact phrase strengthens the match. Over-stuffing a software developer resume with keywords for density alone backfires when the interview reaches the tools you merely listed once in a skills block.`,
        ],
      },
    ],
    faqs: [
      { q: `Why does a two-column layout fail an IT resume scan?`, a: `Parsers extract text in reading order, so a side column of skills can merge into the wrong section or drop entirely. Most software developer resume ATS issues start here. One column with plain headings keeps your tech skills section intact, and the resume scanner for IT jobs can then field every tool correctly.` },
      { q: `Where should the tech stack go on a software developer resume?`, a: `Put your main stack in a short tech skills section, then repeat the same tools inside project bullets with context. A keyword that appears only in a list is filed as a noun, while the same keyword inside a sentence about what you built is filed as evidence a hiring manager can verify.` },
      { q: `What is keyword matching and why does it matter for IT roles?`, a: `Keyword matching is how a checker compares the terms in your resume against the terms in the posting. Roles that ask for specific languages and platforms reward exact phrases, so mirror the posting wording where honest and keep the same tools inside bullets rather than only in a sidebar.` },
      { q: `How much does file format matter for an IT resume?`, a: `A fair amount, but the format is only the first filter. A text-layer PDF or DOCX parses reliably, then extraction checks headings, dates and single-column flow. Only after that does keyword matching and content depth decide whether your IT resume moves into the review pile.` },
      { q: `Should I keep acronyms like REST, CI/CD and SDK on my IT resume?`, a: `Yes, spell the full term once and keep the acronym after, like Representational State Transfer (REST). Tech recruiters live in these abbreviations and postings repeat them, so both forms serve your keyword matching while keeping the document readable for reviewers outside the platform.` },
    ],
  },

  governmentJobs: {
    template: 'C',
    meta: {
      title: 'Resume & Application Tips for Government Job Seekers | ScoreMyResume',
      description: 'Government applications mix forms, affidavits and education certificates with résumés. Honest, practical advice on formatting the resume part so it survives both portals.',
    },
    badge: 'examinations, forms, certificates and one résumé',
    title: 'Making the résumé part of a government application survive the portal',
    sub: `Government recruiting rarely works like a normal ATS cycle. There is a fast-filter stage of forms, eligibility checks, category declarations and certificate uploads, and then somewhere inside the application a résumé field that actually gets read, mostly by a person. This page is about that résumé field: how to keep it plain, current and correctly labelled so a clerk, an examiner and a department portal can all agree on what it says.`,
    pairs: [
      { title: 'The form is mandatory, the résumé is still yours', challenge: `Many candidates assume the online form replaces the document. In practice the form holds the eligibility record, while the résumé carries your achievements, training and experience in a readable order.`, solve: `Treat them as complementary: let the form state facts precisely, and let the résumé add the detail the form never asks for, dated and structured under plain headings.` },
      { title: 'Acronyms only after you spell them once', challenge: `Department abbreviations like HSSC, HSSPP or the many board initials mean nothing to a screening reader outside that office, and everything to someone inside it.`, solve: `Write the full name on first use with the short form in brackets, then use the short form in later bullets. The name signals your familiarity and the acronym makes the document skimmable.` },
      { title: 'Education sections stand in for job history', challenge: `Fresh government applicants often have certification-heavy profiles: board exams, degree, diploma, training batches. Dumping all of it into one dense block buries the headline qualification.`, solve: `Order education, training and certification as separate labelled blocks with passing year each, so the reviewer can confirm eligibility without hunting.` },
      { title: 'Design is an opportunity cost, not a bonus', challenge: `Creative layouts with photos, sidebars and decorative headers look impressive but can mis-file headings in extraction or print badly on a one-side paper evaluation.`, solve: `Government suitability documents reward clarity. One-column, conventional headings, generous spacing, and a clean PDF export is rarely the wrong move.` },
    ],
    faqs: [
      { q: 'Do government reviewers actually use an ATS?', a: `Some ministries and state agencies do, especially for posts receiving thousands of applications. Others lean on manual screens. The safest document satisfies both: parseable structure that is also easy for a human to skim.` },
      { q: 'Should I include caste, category or age details on the résumé?', a: `Declaration fields belong on the form, not the résumé, and requirements vary by notification. When in doubt, follow the specific notification for that post; privacy-wise, keep such identifiers off the document unless a field invites them.` },
      { q: 'What if the portal asks me to paste text instead of upload a file?', a: `Pasted text is a stripped copy of your document. Keep the original with standard headings and simple bullets, because that is what recruiters re-assemble when they print or export the shortlist.` },
      { q: 'How long should a government résumé be?', a: `One to two pages for most posts, matching the notification's format request if it specifies one. Multi-page attachments for research or senior roles are normal, but every page must add real, checkable content.` },
    ],
    cta: { label: 'documents you already have', title: 'Check the résumé you will attach to the next notification', text: `Run your document through the free checker to confirm the headings parse, the dates are readable, and the language is clean. Then keep it as the dependable copy you reuse for every form that follows.` },
    related: [
      { href: '/resume-help/freshers', label: 'Fresher resume tips' },
      { href: '/resume-help/city/panchkula', label: 'Panchkula & tricity' },
      { href: '/resume-help/city/karnal', label: 'Karnal government mix' },
      { href: '/resume-help/city/hisar', label: 'Hisar HR hiring' },
    ],
    keywords: [
      'government job resume',
      'government application portal',
      'certificate and eligibility proof',
      'resume for competitive exams',
      'Haryana government posts',
      'NCR government jobs',
      'formal resume format',
      'government notification resume',
      'departmental application',
      'sarkari resume CV',
    ],
    keywordsNote: `The words below are the ones that appear across government job applications. Government job resume, certificate and eligibility proof and resume for competitive exams describe the document that travels with every form, while Haryana government posts and NCR government jobs point at the market this page serves. Fold them into a formal resume format that a departmental portal and a screening clerk can both read without friction.`,
    extra: [
      {
        heading: `Pairing your resume with the application portal`,
        paragraphs: [
          `Government application portals usually handle eligibility filtering through forms, while the attached resume carries the achievements and training a form never asks for. Uploading a plain, correctly labelled document makes both stages easier. Name the post you are applying for in the header, so the reviewer can match your resume for competitive exams to the right notification.`,
          `Keep certificate and eligibility proof references consistent with the resume. Mention the degree, diploma or training you rely on in the education block with passing years, so the portal entry and the document agree exactly. A mismatch between the form and the attached resume is one of the most common reasons a government application slows or stalls at screening.`,
        ],
      },
      {
        heading: `Keeping a formal resume format for departmental review`,
        paragraphs: [
          `Government hiring in Haryana and the wider NCR leans on shortlisting panels, verification rounds and print evaluation more than typical ATS workflows. A formal resume format with one column, conventional headings and generous spacing prints cleanly on one side and files correctly during manual review. Design flourishes and two-column layouts rarely add points and often cost them.`,
          `Order education, training, experience and any relevant certificate details under plain English labels with clear dates. For a resume built around competitive exams, lead with the qualification the notification demands so a reviewer confirms eligibility in seconds. Acronyms for boards and departments belong with their full names spelled once and the short form kept in brackets.`,
        ],
      },
    ],
  },

  digitalMarketing: {
    template: 'D',
    meta: {
      title: 'Resume Checker for Digital Marketing Roles | ScoreMyResume',
      description: 'Marketing resumes must prove creativity and measure it. Tips to keep portfolio links, platforms and campaign results scannable for both a person and an ATS.',
    },
    badge: 'creative job, measurable document',
    title: 'A digital marketing resume that proves results, not just vocabulary',
    sub: `Digital marketing hires are asked for two contradictory things: a resume that shows campaign instincts, and a resume that a filtering tool can sort. The way to satisfy both is to stop selling adjectives and start filing numbers. Platform names, channel names and outcome figures belong in the same bullets, so a parser files the nouns and a hiring manager sees the proof.`,
    quote: { text: 'Every campaign bullet should be a sentence with a count in it: channel, action, result.', attribution: 'working rule for marketing resumes' },
    cards: [
      { title: 'Give each platform a context line', icon: Megaphone, text: `"Meta ads" files as a keyword; "scaled Meta prospecting campaigns for a D2C brand" files as experience. Mention the channel inside the achievement, not only in a tools row, and the paragraph reads like evidence.` },
      { title: 'Lead with outcome, then the channel', icon: LineChart, text: `Recruiters skim for growth. A bullet that opens with a real, honest result and closes with the channel and budget size carries the most information per line, for both the machine and the reader.` },
      { title: 'Keep the portfolio one clean line', icon: Globe, text: `A clickable URL typed as text at the top of your contact block survives parsing. A QR code, an image button or a shortened link hidden in a design mark often does not reach the recruiter's preview.` },
      { title: 'Match the posting channel list', icon: Smartphone, text: `If the role lists SEO, content, email and social, use those exact channel words in your relevant bullets. Role-specific synonyms like "organic growth" connect the dots; the exact phrase makes the match explicit.` },
    ],
    cta: { label: 'one upload, all five signals', title: 'See how your marketing resume scores before the next campaign pitch', text: `The checker scores length, keyword optimization, content, organization and scanning details, and its keyword section shows your match percentage for the channels you target. Free and fully local in the browser.` },
    related: [
      { href: '/resume-help/it-jobs', label: 'IT & tech resumes' },
      { href: '/resume-help/remote-jobs', label: 'Remote job resumes' },
      { href: '/resume-help/city/gurugram', label: 'Gurugram market' },
      { href: '/resume-help/city/sonipat', label: 'Sonipat employers' },
    ],
    keywords: [
      'digital marketing resume',
      'SEO and content marketing keywords',
      'campaign metrics',
      'portfolio links',
      'marketing ATS resume',
      'marketing resume keywords',
      'channel names in bullets',
      'ROI bullet points',
      'digital marketing CV India',
      'creative resume parser',
    ],
    keywordsNote: `These phrases form the toolkit a digital marketing resume is usually judged on. SEO and content marketing keywords show you can talk about discovery, while campaign metrics and portfolio links prove results a reviewer can actually check. A marketing ATS resume keeps all of it in scannable text, so platform names and counts survive extraction and reach the hiring team as evidence.`,
    extra: [
      {
        heading: `Turning campaign metrics into scannable bullets`,
        paragraphs: [
          `Digital marketing is a results discipline, and a marketing ATS resume rewards bullets that quantify output over bullets that only promise it. Open with a number, name the channel, and close with the campaign type: scaled Meta prospecting for a D2C label, cut cost per lead on Google Ads, or grew a newsletter from a few hundred to several thousand subscribers.`,
          `Keep every metric honest and repeat the same figure you can defend in the interview. A resume checker scores keywords and content separately, so a bullet with campaign metrics in text outperforms a chart or gauge image that extracts as nothing. Units, timeframes and platform names make each claim auditable and machine readable at the same time.`,
        ],
      },
      {
        heading: `Linking a portfolio that survives the parser`,
        paragraphs: [
          `Portfolio links belong at the top of the contact block as plain typed URLs, because image buttons and QR codes often stop at the parser. A single line listing your work samples, profile or case-study page keeps the reviewer one click from proof without breaking the resume reading flow, and labelling each link makes the destination obvious before the click happens.`,
          `Use platform names exactly as the posting writes them, whether that is Meta, Google Ads, HubSpot or WhatsApp Business. Pairing SEO and content marketing keywords with real portfolio links is the strongest honest signal a digital marketing resume can send, because it shows vocabulary and evidence in the same document, readable together by a person and a scanner.`,
        ],
      },
    ],
    faqs: [
      { q: `What should a digital marketing resume include about campaign metrics?`, a: `Lead each role or project bullet with one honest number, the channel involved and the campaign type. A line like cut cost per lead on Google Ads by a set margin in six months beats an adjective about growth. Metrics in text survive a marketing ATS resume and give the interview a defensible starting point.` },
      { q: `How do I add SEO and content marketing keywords without stuffing them?`, a: `Use the phrases where your work genuinely supports them, inside bullet context rather than a piled-up list. If a posting repeats organic traffic and content calendar, echo those exact terms in the projects that used them. Honest placement reads naturally and keeps the marketing ATS resume credible.` },
      { q: `Where should platform names and portfolio links go on my resume?`, a: `Platform names belong inside achievement bullets next to the result, while portfolio links go at the top of the contact block as readable text. QR codes and image buttons often fail parsing, so keep one clean clickable line that a recruiter preview can follow without leaving the document.` },
      { q: `Why does a digital marketing resume fail an ATS scanner?`, a: `Mostly because of invisible elements: charts, icons, gauge graphics and decorative fonts that extract as nothing, plus keywords hidden in a tools row with no context. Flatten to one column, write metrics and platform names as text, and the resume scans cleanly while staying creative in tone.` },
    ],
  },

  remoteJobs: {
    template: 'E',
    meta: {
      title: 'ATS-Friendly Resume for Remote & Work-From-Home Jobs | ScoreMyResume',
      description: 'Remote roles filter for timezone, tools and async discipline. Practical ATS tips to make work-from-home signals visible in your resume structure.',
    },
    badge: 'remote-ready · async · timezone-visible',
    title: 'A work-from-home resume that signals readiness at a glance',
    sub: `Remote hiring adds a filter regular roles do not have: location discipline. Recruiters screen for a convincing line about where you work, the hours you overlap, the tools you collaborate in and how you prove productivity without a desk to watch. A remote resume earns its place by answering those four questions in the first third of the document, without sacrificing the parsing quality a screening tool expects.`,
    rows: [
      { title: 'Put availability where a scanner finds it', icon: Clock3, text: `A line under your header stating the work mode and overlap window — "open to remote, IST with overlap to US-East" — answers the single most-filtered question in remote hiring. If the job is strictly remote, name the mode explicitly.` },
      { title: 'Show the collaboration stack in context', icon: Users, text: `Mentioning Slack, Zoom, Jira, Notion and similar tools in project bullets shows experience with the distributed workflow itself, not just a skills list. Double benefit: the tool names are exactly what remote postings repeat.` },
      { title: 'Lead outcomes, because hours are invisible', icon: Laptop, text: `Remote reviewers judge output, not office time. Structure each role bullet around what changed, for whom, and how it was measured, so the document stands on evidence you can defend in a video call.` },
      { title: 'Remove anything that says commute', icon: Wrench, text: `Office addresses, local-only credentials and references to on-site presence add noise to a remote application. Keep the city line for timezone context and cut the rest from the resume itself.` },
      { title: 'Mirror the posting mode language', icon: Globe, text: `If a role says "fully remote" or "hybrid", repeat that phrasing honestly in your summary line. Matching the mode term keeps your resume inside the recruiter's keyword net for remote roles specifically.` },
    ],
    cta: { label: 'before you hit apply', title: 'Confirm a remote resume reads clean before the interview round', text: `The free checker runs fully in the browser, scores all five signals, and its keyword view shows which remote-mode and tool terms matched your document. Fix once, reuse for every distributed team.` },
    related: [
      { href: '/resume-help/it-jobs', label: 'IT & tech roles' },
      { href: '/resume-help/digital-marketing', label: 'Marketing roles' },
      { href: '/resume-help/city/gurugram', label: 'Gurugram hub' },
      { href: '/resume-help/city/bahadurgarh', label: 'Bahadurgarh commute belt' },
    ],
    keywords: [
      'remote job resume',
      'work-from-home resume',
      'WFH signals',
      'timezone overlap',
      'async collaboration tools',
      'remote-friendly format',
      'remote readiness statement',
      'distributed team resume',
      'remote resume checker',
      'work from home CV',
    ],
    keywordsNote: `Remote roles filter on signals a normal resume never carries. Terms like remote job resume and work-from-home resume describe the document, while timezone overlap, async collaboration tools and a remote-friendly format are the specifics recruiters screen for. Place them near the top of the document so a reviewer and a parser both notice your readiness immediately.`,
    extra: [
      {
        heading: `Signaling timezone and async readiness`,
        paragraphs: [
          `The most filtered question in remote hiring is location and hours. A remote job resume should answer it in the first third with a line stating the work mode and the overlap window, for example open to remote with overlap to US-East or UK hours. That single line satisfies the screener and gives the hiring manager a realistic scheduling picture.`,
          `Async collaboration tools deserve context as well. Mentioning Slack, Zoom, Jira, Notion or Trello inside project bullets signals that you already practise distributed work, not just that you know the names. For a work-from-home resume, each tool mention doubles as a keyword and as evidence of the async discipline remote roles expect every single day.`,
        ],
      },
      {
        heading: `Structuring a remote-friendly format`,
        paragraphs: [
          `A remote-friendly format keeps the same one-column, plain-headed structure as any ATS-safe resume, because most distributed teams still route applications through a scanner. The difference is content order: location line, mode statement, collaboration tools, then outcome-led bullets. WFH signals belong near the top of the page rather than buried at the end of a skills list.`,
          `Remote reviewers judge output because office hours are invisible. Write each bullet around what changed, for whom and for what measured result, and cut references to on-site presence or daily commutes. A remote resume that reads cleanly, states overlap and proves async habits will outrank a general CV for the same distributed role every time.`,
        ],
      },
    ],
    faqs: [
      { q: `What makes a remote job resume different from a normal one?`, a: `It answers four extra questions up front: where you work, the hours you overlap, which collaboration tools you use, and how you prove output. A remote-friendly format keeps the first three near the top and lets outcome-led bullets carry the fourth, while staying parseable for the tool that screens distributed applications.` },
      { q: `How do I show timezone overlap on a work-from-home resume?`, a: `Add one line under your header naming the mode and the window, like open to remote, IST with overlap to US-East. That single phrase answers the most filtered question in remote hiring and counts as a clear WFH signal. Match the posting language, fully remote or hybrid, where your availability honestly fits.` },
      { q: `Which async collaboration tools should I list for remote jobs?`, a: `List the ones you actually use in distributed work such as Slack, Zoom, Jira, Notion or Trello, and mention each inside a project bullet rather than only in a skills row. The tool name then files as evidence of remote experience, and a resume scanner confirms the exact vocabulary remote postings repeat.` },
      { q: `Do remote employers still run an ATS check on resumes?`, a: `Most distributed teams do, even when the process feels more human than a mass corporate filter. That is why a work-from-home resume still needs a remote-friendly format with one column and real text. Keep it parseable like any ATS resume and place the location and tool signals where reviewers can see them quickly.` },
    ],
  },

  'software-engineer': {
    template: 'B',
    meta: {
      title: 'Software Engineer Resume Scanner — ATS Tips for Engineers | ScoreMyResume',
      description: 'A software engineer resume must balance systems depth with parsing. Tips on stack-in-context bullets, flattened layouts and title mirroring for ATS screens.',
    },
    badge: 'developers · SDEs · engineers · architects',
    title: 'An engineer resume the ATS parses and the interviewer respects',
    sub: `Engineering resumes live in a narrow band: too much depth and a parser buries the signal in nested tables; too little and the stack never appears outside a skills list. Screening tools read headers, dates, and the text nearest your project titles, so the winning move is to put tools into bullet context, keep the file mechanically clean, and let the same sentence serve the parser and the person reviewing it.`,
    statValue: '6',
    statLabel: 'checks in the scanning stage',
    statNote: `Header order, heading names, date format, single-column flow, table usage, and a real text layer are all verified before the keyword pass begins on this checker.`,
    tips: [
      { title: 'Write the stack into each project bullet', text: `"Built React dashboards consuming a GraphQL API" out-parses a skills row that only says React. The parser files the technology inside a project, and the interviewer sees that you used it, not just that you listed it.` },
      { title: 'Flatten sidebars before you upload', text: `Many engineering resumes put skills in a two-column sidebar. Extracted, that layout can merge tool names or split accent keywords. One column with a plain Skills block keeps your tools where the parser and recruiter both expect them.` },
      { title: 'Mirror the posting title and stack language', text: `If the role says "Java" and your resume says "J2SE", or the posting says "senior software engineer" and your header says "backend developer", weaken the match unnecessarily. Use the posting's exact terms where your experience is honest.` },
      { title: 'Keep dates and environments as literal text', text: `Timeline graphics and environment icons look impressive and extract badly. Write months and years normally, and mention cloud platforms, runtimes and CI tools inside bullets so they survive extraction with their context.` },
      { title: 'Demote the word-cloud skills header', text: `A long alphabet of technologies at the end adds length without evidence. Keep a short Skills block with the stack you actually use, and let project bullets carry the depth. The score moves when scannable depth replaces volume.` },
    ],
    cta: { label: 'one file, one pass', title: 'Scan your engineer resume on all five signals before the referral round', text: `Upload your latest resume as PDF, DOCX, image or text. The checker runs locally, grades length, keywords, content, organization and scanning, and flags the sidebar and title mismatches engineers trip on most.` },
    related: [
      { href: '/resume-help/it-jobs', label: 'IT & tech resumes' },
      { href: '/resume-help/remote-jobs', label: 'Remote engineer roles' },
      { href: '/resume-help/city/gurugram', label: 'Gurugram tech hub' },
      { href: '/resume-help/freshers', label: 'First-job resume tips' },
    ],
    keywords: [
      'software engineer resume scanner',
      'SDE resume',
      'engineering resume',
      'stack in bullets',
      'flatten sidebars',
      'title mirroring',
      'scanner for engineers',
      'software engineer ATS tips',
      'engineer resume format',
      'systems depth resume',
    ],
    keywordsNote: `Engineers apply through a scanner that reads structure before it reads depth. Software engineer resume scanner, SDE resume and engineering resume are the search phrases this page answers, while stack in bullets, flatten sidebars and title mirroring are the fixes that actually move the score. Use them together so a scanner for engineers files every tool under the right field.`,
    extra: [
      {
        heading: `Flattening sidebars and tables before upload`,
        paragraphs: [
          `Engineering resumes are the most likely of any profile to use a two-column sidebar for skills, and it is the layout most likely to scramble during extraction. A scanner for engineers reads top to bottom, so a side column of tool names can land beside the wrong section or vanish from the parse entirely. One column with a plain Skills block removes that risk.`,
          `Nested tables, timeline graphics and icon rows cause the same kind of damage. Months and years should stay literal text, and cloud platforms, runtimes and CI tools belong inside project bullets with context. An engineering resume that loses nothing in extraction keeps every label and date exactly where a software engineer resume scanner and a reviewer expect to find them.`,
        ],
      },
      {
        heading: `Mirroring the title and stack language`,
        paragraphs: [
          `Title mirroring is the cheapest scoring fix on a software engineer resume. If the posting says senior software engineer and your header says backend developer, or it says Python and you wrote py, you lose a match you deserved. Use the posting vocabulary where your experience honestly supports it, and keep the human truth of the title intact.`,
          `The same logic applies to the stack. Write the SDE resume with technologies inside project bullets, saying what you built and with which language, framework and infrastructure. Combined with a short tech skills section, this gives the scanner repeated consistent signals, and gives the interviewer a stack conversation they can actually verify in detail.`,
        ],
      },
    ],
    faqs: [
      { q: `How does a software engineer resume scanner read my file?`, a: `It first extracts the text layer, then checks heading order, dates and single-column flow before it looks at keywords. If your engineering resume uses sidebars or tables, tools can fall into the wrong fields. Flatten the layout, keep dates as text, and the scanner for engineers reliably files your stack.` },
      { q: `Where should the tech stack appear on an SDE resume?`, a: `Twice: in a short tech skills section naming what you use daily, and again inside project bullets. Stack in bullets carries more weight because it proves context. A software engineer resume scanner files the bullet mention as evidence, while a lone list entry reads only as a noun.` },
      { q: `What is title mirroring and when should I use it?`, a: `Title mirroring means using the posting exact role title and skill terms where your experience is honestly the same. If the role says backend engineer and your header says server developer, matching the wording strengthens the scan. Keep it honest, because invented titles fail the review that follows.` },
      { q: `Why do engineering resumes fail ATS scanners more often?`, a: `Engineers over-optimise for humans: density, acronyms, sidebars and visual timelines. A software engineer resume scanner filters on parseable structure first, so a file heavy with tables and icon rows scores poorly before keywords are even compared. Plain headings and stack-in-context bullets fix the largest share of failures.` },
      { q: `How short should the skills section be on an engineering resume?`, a: `Keep it to one or two lines naming the stack you actually use, and let project bullets carry the depth. A wall of technologies adds length without evidence and can push the resume past a comfortable size. The scanner for engineers scores scannable depth, not volume.` },
    ],
  },

  'data-analyst': {
    template: 'O',
    meta: {
      title: 'Data Analyst Resume Review — SQL, Excel & BI Tips | ScoreMyResume',
      description: 'Data analyst resumes lean on charts and icon rows that ATS parsers skip. Keep SQL, Excel, BI tools and every metric as scannable text with these fixes.',
    },
    badge: 'numbers first, formatting second',
    title: 'A data analyst resume that proves analysis in plain text',
    sub: `Data analyst candidates make one ironic mistake: they decorate the resume with charts, gauges and icon grids, which is exactly the content a scanner cannot read. The tools and figures that decide shortlists need to exist as selectable text. This page walks through turning every visual shorthand into literal, parseable evidence without losing the analytical signal.`,
    statValue: '3',
    statLabel: 'tools reviewers check before anything else',
    statNote: `SQL, Excel and one BI tool (Power BI, Tableau or Looker) lead nearly every analyst shortlist. Named in skill and project bullets, those three carry most of the keyword weight.`,
    tips: [
      { title: 'Replace gauge charts with a scored number row', text: `A dashboard-style graphic may look impressive to a person, but it extracts as nothing. Write the same figure as text — "cut order-fill time 18% across 40 warehouses" — and both the parser and the reader get the evidence.` },
      { title: 'Name SQL, Excel and one BI tool in context', text: `Say "queried 2M-row tables in SQL Server and built a Power BI dashboard for finance" instead of adding tools to a list. The context sentence files the tools and proves you used them together.` },
      { title: 'Spell metrics with units and timeframes', text: `"Converted 22% of trial users in Q3" beats "increased conversions". Units, percentages and periods make the claim auditable in an interview and give the keyword scan concrete nouns.` },
      { title: 'Mirror the exact analyst vocabulary', text: `If the posting repeats "data cleaning", "A/B testing" or "forecasting", use those phrases in your relevant bullets. Synonyms show understanding; the exact phrase makes the match explicit to the screener.` },
      { title: 'Keep portfolio links as typed URLs', text: `Tableau public URLs, dashboards and GitHub repos belong as plain text in your contact block. Image buttons and QR codes often stop at the parser, so the recruiter preview loses the only proof link on the page.` },
    ],
    cta: { label: 'before the portfolio link is judged', title: 'Run a data analyst resume past the same five-signal scan', text: `The free checker keeps your file in the browser, grades all five signals, and its keyword view shows whether SQL, Excel and the BI tool in the posting actually matched. Numbers stay your own.` },
    related: [
      { href: '/software-engineer-resume-scanner', label: 'Software engineer resumes' },
      { href: '/resume-help/it-jobs', label: 'IT & tech resumes' },
      { href: '/resume-help/city/faridabad', label: 'Faridabad IT & services' },
      { href: '/resume-help/city/gurugram', label: 'Gurugram analytics roles' },
    ],
    keywords: [
      'data analyst resume',
      'SQL Excel BI keywords',
      'metrics in text',
      'dashboards as links',
      'analytics CV',
      'analyst resume review',
      'analyst resume scanner',
      'query and dashboard bullets',
      'analytics portfolio links',
      'data resume ATS tips',
    ],
    keywordsNote: `Data analyst roles are decided on tools and metrics, and this keyword list names both. SQL, Excel and BI keywords and metrics in text describe how the evidence must appear, while dashboards as links is the one placement that survives parsing. Fold them into a data analyst resume so an analyst resume review finds concrete, readable proof on every line.`,
    extra: [
      {
        heading: `Writing SQL Excel and BI tools into context`,
        paragraphs: [
          `Reviewers check three tools before anything else: SQL, Excel and one BI platform such as Power BI, Tableau or Looker. Naming them in a sentence that shows use, like queried two-million-row tables in SQL and built a finance dashboard in Power BI, files the tools and proves they worked together. An analyst resume review looks for exactly that pairing.`,
          `Avoid a bare tools row where SQL appears once with no context. The same keyword inside a project bullet about data cleaning or reporting earns its place in an analytics CV and gives the interviewer a concrete implementation story. Context sentences also make the keyword scan for analyst roles more accurate, because tools appear next to their outcomes.`,
        ],
      },
      {
        heading: `Keeping metrics and dashboards as readable text`,
        paragraphs: [
          `Charts, gauges and icon grids look analytical but extract as nothing, so the strongest data analyst resume keeps every figure in plain sentences. Write the number with its unit and timeframe, such as reduced order-fill time by eighteen percent across forty warehouses, and the parser files an auditable claim instead of an empty graphic.`,
          `Dashboards belong as links, not images. Put Tableau Public, GitHub or a portfolio page in the contact block as typed text and label where it opens. Alongside metrics in text, those dashboards as links let the reviewer confirm the analysis you describe, while the resume keeps every piece of its machine-readable content intact.`,
        ],
      },
    ],
    faqs: [
      { q: `Which tools should a data analyst resume lead with?`, a: `SQL, Excel and one BI tool such as Power BI, Tableau or Looker. Reviewers and an analyst resume review both check for these before anything else. Name each inside a project bullet that explains use, and keep the same phrases the posting repeats so the keyword scan confirms the match.` },
      { q: `How do I put metrics in text instead of charts on my analyst resume?`, a: `Write every figure as a sentence with its unit and timeframe, like cut order-fill time by eighteen percent across forty warehouses. Charts and gauges extract as nothing for an ATS. Metrics in text read for a person, file for a parser and hold up in the interview that follows.` },
      { q: `Can I include dashboard links on an analytics CV?`, a: `Yes, and you should, as plain typed URLs in the contact block. A Tableau public link, GitHub repo or portfolio page labelled clearly beats an image, because dashboards as links survive parsing while screenshots do not. The hiring manager preview can then open the proof with one click.` },
      { q: `Why does a data analyst resume fail ATS screening?`, a: `The usual cause is analytic decoration: charts, gauges, icon grids and progress bars that extract as nothing, plus tools listed once in a skills row. That gives the parser no evidence. Replace visuals with SQL Excel and BI keywords in context, and the data resume parses cleanly with its numbers intact.` },
      { q: `Should I mirror the exact phrases from the job description?`, a: `Where honest, yes. If the posting repeats data cleaning, A/B testing or forecasting, use those phrases in your relevant bullets. Synonyms show understanding, but the exact term makes the analyst resume review match explicit, and the keyword scan for the role scores the wording directly.` },
    ],
  },

  canva: {
    template: 'I',
    meta: {
      title: 'Canva Resume Checker — Make a Canva CV ATS-Friendly | ScoreMyResume',
      description: 'Canva templates look great but often fail ATS parsing. Step-by-step fixes to export a Canva resume that keeps its design and gains a readable text layer.',
    },
    badge: 'pretty template, invisible text is the trap',
    title: 'Make a Canva resume that keeps its looks and passes the parser',
    sub: `Canva produces some of the most attractive resume templates on the internet, and some of the hardest for an ATS to read. The usual culprit is export: a beautifully designed PDF that is really a full-page image, or a template built around columns, icons and decorative fonts that collapse during extraction. You can keep 90% of the design and fix 100% of the compatibility with the ordered checks on this page.`,
    rows: [
      { title: 'Export as PDF, not PNG or JPG', icon: Download, text: `Choose the PDF download (usually "PDF Standard") so vector text survives. A PNG or JPG export turns the whole resume into one unreadable image for a parser, regardless of how clean the design looks.` },
      { title: 'Switch the template to a single column', icon: Layers, text: `Most portfolio-style Canva resumes are two columns. In the editor, drag the blocks into one column or pick a single-column template. Extraction reads top to bottom, and a two-column layout scrambles the order.` },
      { title: 'Replace decorative fonts for headings', icon: FileText, text: `Keep one expressive font for your name only, and use standard fonts like Inter, Lato or Arial for section headings and body text. Software rarely fails on the name; it trips on unreadable heading glyphs.` },
      { title: 'Strip icon-only labels and charts', icon: Palette, text: `Replace icon bullets and progress-bar skills with plain text. "Tableau · advanced" reads; a five-dot gauge reads as nothing. Every element that cannot be selected as text should become words.` },
      { title: 'Verify the text layer before sending', icon: TextSearch, text: `After export, open the PDF, select all and copy into a text editor. If words come through in a sensible order, the file is safe. Then run the finished file through this free checker to confirm it scans clean.` },
    ],
    cta: { label: 'last check before you send', title: 'Confirm your Canva export parses before the recruiter opens it', text: `Upload your exported Canva PDF here. The checker verifies the text layer and scanning details locally in your browser, so you know your design choice cost you nothing at the parser.` },
    related: [
      { href: '/best-file-format-for-ats', label: 'PDF vs Word formats' },
      { href: '/resume-help/freshers', label: 'Fresher resume tips' },
      { href: '/how-to-optimize-resume-keywords', label: 'Adding keywords' },
      { href: '/free-ats-resume-templates', label: 'Free ATS templates' },
    ],
    keywords: [
      'Canva resume',
      'Canva resume template',
      'export Canva resume as PDF',
      'Canva CV single column',
      'decorative fonts',
      'text layer verification',
      'Canva ATS resume check',
      'PDF export Canva',
      'scanned image resume',
      'select text resume check',
    ],
    keywordsNote: `Most Canva resume problems start and end at the export. Terms like Canva resume template and export Canva resume as PDF describe where the trouble lives, while Canva CV single column, decorative fonts and text layer verification name the exact fixes. Verify the text layer after exporting so a Canva ATS resume check never surprises you at application time.`,
    extra: [
      {
        heading: `Choosing the right Canva export`,
        paragraphs: [
          `Canva offers several download options and only one is safe for a resume. Choose the PDF download, usually labelled PDF Standard, so the text stays as vector type rather than a flattened image. Exporting as PNG or JPG turns the whole document into one picture a parser cannot read, no matter how clean the layout appears on screen.`,
          `If you edit in the browser or the mobile app, verify the file after download by selecting all the text and copying it into a note. Words in a sensible order mean the export kept its text layer. Confirm that step before submitting, because a Canva resume template can look perfect and still fail at the scanner.`,
        ],
      },
      {
        heading: `Making a single-column Canva CV`,
        paragraphs: [
          `Many popular Canva resume templates use a two-column sidebar that extraction scrambles. In the editor, drag the blocks into one flow or switch to a single-column template, so the reading order matches what a parser expects. A Canva CV single column keeps the design fonts and palette while making the text predictable for the scanner.`,
          `Decorative fonts deserve one exception and that is your name. Keep expressive lettering for the heading only and use standard typefaces like Inter, Lato or Arial for section titles and body text. Software rarely trips on a stylised name, but unreadable heading glyphs are a common cause of fields merging during a Canva ATS resume check.`,
        ],
      },
    ],
    faqs: [
      { q: `How do I export a Canva resume so it passes an ATS?`, a: `Use the PDF download, usually labelled PDF Standard, and never PNG or JPG. Verify the file after export by selecting all the text and copying it into a note; if the words arrive in order, the PDF kept its text layer. Then run the finished file through a Canva ATS resume check to confirm the scan.` },
      { q: `Why does my Canva resume look great but fail the scanner?`, a: `The most common reason is that the PDF downloaded as a full-page image, or the template uses columns and icon-only labels. Open the file, try to select the words, and replace anything that cannot be selected as text. Text layer verification fixes most Canva resume parsing failures before they reach a recruiter.` },
      { q: `Should I use decorative fonts on a Canva CV?`, a: `Limit expressive fonts to your name and keep standard typefaces such as Inter, Lato or Arial for headings and body text. A Canva CV single column with readable glyphs files cleanly, while flashy fonts cause heading text to merge or drop during extraction and cost points in the scan.` },
      { q: `Do two-column Canva resume templates ever parse correctly?`, a: `Rarely, because extraction reads top to bottom and a side column of skills lands beside the wrong section. The safest fix is to drag blocks into one column or pick a single-column template. This keeps the visual identity while giving the parser a predictable order for the rest of the resume.` },
      { q: `What counts as a text layer verification for my Canva resume?`, a: `Open the exported PDF in a reader, press select all, copy and paste into a blank note. If the text arrives as sentences in a sensible order, the file has a working text layer. If you get nothing or one large empty selection, export again as a proper PDF and re-check before applying.` },
    ],
  },

  'file-format': {
    template: 'A',
    meta: {
      title: 'Best File Format for ATS — PDF vs Word vs DOCX | ScoreMyResume',
      description: 'Which resume file format passes an ATS? Compare PDF text-layer, DOCX, legacy .doc, image scans and Google Drive exports, with a clear pick for every scenario.',
    },
    badge: 'the file decides more than most people think',
    title: 'PDF vs Word: the format that keeps your resume readable',
    sub: `Before any recruiter reads a word, the file has to open, extract and hold a text layer. The format you choose decides that first step, and it is the step most resumes fail at. This page compares the formats job portals actually accept, and gives a concrete pick for each scenario without pretending there is a single universally perfect choice.`,
    cards: [
      { title: 'Text-layer PDF as the default', icon: Sheet, text: `A PDF exported from the same app you typed in keeps a real text layer, one page flow, and constant formatting. It is the safest default for most applications, provided the export is not a scan or an image.` },
      { title: 'DOCX as the close second', icon: FileText, text: `Word's modern format opens everywhere and many portals parse it reliably. It also invites accidental two-column or table layouts more often than a focused PDF export does, so check the plain-text preview before you upload.` },
      { title: 'Legacy .doc and standalone scans are risky', icon: Binary, text: `Old .doc files and standalone image scans are the two formats that most often produce empty parses. If you only have a scan, the resume is effectively a photo and the checker will tell you so directly.` },
      { title: 'Google Docs export without the mess', icon: Download, text: `If you edit in Google Docs, choose File → Download → PDF Document, then verify the text layer. Avoid "Web page" exports, which rearrange sections, and screenshots, which carry no text at all.` },
    ],
    cta: { label: 'sixty seconds to be sure', title: 'Check the text layer of your chosen file before you apply', text: `Upload the exact file you will send. The free checker reports scanning details and organization locally in your browser, so a format mistake shows up before the portal ever sees it.` },
    related: [
      { href: '/canva-resume-ats-friendly', label: 'Canva resume fixes' },
      { href: '/how-to-optimize-resume-keywords', label: 'Keyword placement' },
      { href: '/resume-help/freshers', label: 'Fresher resume tips' },
      { href: '/free-ats-resume-templates', label: 'Free ATS templates' },
    ],
    keywords: [
      'resume file format',
      'PDF vs Word for ATS',
      'DOCX resume',
      'text-layer PDF',
      'scanned resume images',
      'best format for application portals',
      'ATS file format',
      'plain text resume',
      'Google Docs PDF export',
      'file format checker',
    ],
    keywordsNote: `The file decides whether a recruiter ever reads a word, so resume file format deserves a page of its own. Terms like PDF vs Word for ATS, DOCX resume and text-layer PDF describe the safe choices, while scanned resume images and best format for application portals name the risky ones. Check the text layer of whichever file you decide to send.`,
    extra: [
      {
        heading: `Why a text-layer PDF is the safe default`,
        paragraphs: [
          `A PDF typed and exported straight from an editor keeps selectable text, one page flow and constant formatting, which is why a text-layer PDF is the safest resume file format for most applications. The phrase text-layer matters: the same document, once printed and scanned or exported as an image, carries no readable text at all.`,
          `Portals and screening tools open PDFs differently, but almost all of them can extract a genuine text layer. When you compare PDF vs Word for ATS, the PDF wins on stability because formatting rarely shifts between systems. Keep the file small and the layout simple, and the export carries the document exactly as you designed it, section by section.`,
        ],
      },
      {
        heading: `When DOCX and plain text still make sense`,
        paragraphs: [
          `A DOCX resume is a strong close second and many company systems parse it reliably, though it invites more accidental layouts than a focused PDF export. If a portal asks you to paste text or upload a Word file, keep the original headings simple so the stripped copy re-assembles into something a reviewer can actually read.`,
          `Some older portals still prefer legacy .doc, and a few application forms accept only text; neither needs a fancy document. The best format for application portals is the one the portal names, plus a compatible fallback like a text-layer PDF. A scanned resume image, by contrast, is the one file format that nearly always produces an empty parse, so it belongs nowhere near an application.`,
        ],
      },
    ],
    faqs: [
      { q: `Should I send a PDF or a Word document for an ATS?`, a: `A text-layer PDF is the safer default because formatting stays stable and almost every parser reads it. A DOCX resume parses reliably too and is the right choice when a portal names it explicitly. Avoid images and scans, which carry no extractable resume file format text at all.` },
      { q: `Why do scanned resume images fail ATS checks?`, a: `A scan is a photo of the document, so it contains zero selectable text. The parser opens the file, finds no words and reads an empty input. If the only copy you have is a scan, re-create it in a text editor or run OCR, then verify the outcome with a file format checker before applying.` },
      { q: `What is the best format for application portals that ask for text?`, a: `When a portal invites pasted text or an attachment field, prepare both: a clean resume file format for the upload and a plain-text copy without bullets or tables for the text box. Keep headings standard and simple so whichever version the recruiter reconstructs is still readable.` },
      { q: `Does a Google Docs export keep a proper resume file format?`, a: `Yes, choose File, Download and then PDF Document, rather than a web page export or a screenshot. After downloading, verify the text layer by selecting all the words in the PDF. A DOCX resume exported from Google Docs works too, as long as you avoid the messy web-page versions portals struggle with.` },
    ],
  },

  keywords: {
    template: 'J',
    meta: {
      title: 'How to Add Resume Keywords That ATS Uses | ScoreMyResume',
      description: 'Resume keywords decide the match score. A practical method to mine postings, place exact phrases, and keep every keyword honest and in-context.',
    },
    badge: 'match the posting, never invent the skill',
    title: 'How to add resume keywords an ATS will score in your favor',
    sub: `Keyword optimization is the difference between a resume that describes you and a resume that matches the role. The practical version is simple: read what the posting repeats, place those exact phrases where your experience supports them, and keep every term in a sentence so the parser files it as evidence instead of a list. This page turns that loop into four repeatable steps.`,
    cards: [
      { title: 'Mine the posting for its repeated terms', icon: Hash, text: `Open the job description and list every tool, skill and responsibility that appears more than once. Those repetitions are the screener's checklist. The keyword finder on this site automates the count and ranks them for you.` },
      { title: 'Place exact phrases inside bullets', icon: KeyRound, text: `A rule to remember: the keyword belongs in a bullet, not only in a skills block. "Led SQL performance audits" files the term and proves real use, which reads far better than a lone SQL badge in the sidebar.` },
      { title: 'Keep the stacking honest', icon: ListChecks, text: `Use the exact wording only where your experience genuinely supports it. Invented matches can pass a scanner and still collapse in the interview question that follows, which is the one place no keyword helps.` },
      { title: 'Re-measure after every edit', icon: Gauge, text: `Tailoring is a session, not a one-time task: paste the posting, edit, re-scan and watch the keyword bar respond. That loop — read, place, verify — is the whole method behind a good match percentage.` },
    ],
    cta: { label: 'the loop, free', title: 'Turn a posting into a keyword list and check your match today', text: `Open the keyword finder to rank the repeated terms in any job description, tailor honestly, then run your resume through the checker with the same text to see the match percentage move. All local in your browser.` },
    related: [
      { href: '/best-file-format-for-ats', label: 'PDF vs Word formats' },
      { href: '/resume-help/it-jobs', label: 'IT & tech keywords' },
      { href: '/resume-help/digital-marketing', label: 'Marketing keywords' },
      { href: '/free-ats-resume-templates', label: 'Free ATS templates' },
    ],
    keywords: [
      'resume keywords',
      'how to add keywords to resume',
      'job description keyword mining',
      'exact phrase matching',
      'honest keyword use',
      'keyword re-scan loop',
      'ATS keyword match',
      'keyword placement in bullets',
      'resume keyword finder',
      'posting vocabulary matching',
    ],
    keywordsNote: `Resume keywords are the terms that decide a match score, and the list below shows the ones this page teaches. Job description keyword mining, exact phrase matching and honest keyword use name the method, while the keyword re-scan loop is the habit that makes it work. Learn how to add keywords to a resume without ever padding a single line.`,
    extra: [
      {
        heading: `Mining a job description for repeat terms`,
        paragraphs: [
          `Job description keyword mining is a counting exercise before it is a writing exercise. Open the posting and note every tool, skill and responsibility that appears more than once, because repetition usually marks the screener checklist. A keyword finder ranks those repeats for you, saving the manual tally and pointing to the terms worth placing in your resume.`,
          `Mined words are only useful when they meet your real experience. After a second read, separate the terms you genuinely used from the ones you only recognise. That honest split is what separates resume keywords that survive an interview from a pile of phrases that match a scanner and nothing else at all.`,
        ],
      },
      {
        heading: `Placing keywords and re-scanning until they land`,
        paragraphs: [
          `Placement beats volume. A keyword in a bullet with context, such as conducted SQL performance audits for the finance team, files the term and proves use, while the same word parked in a skills row adds little. Exact phrase matching works the same way: repeat the posting wording where your work supports it, not loosely-synonymous inventions.`,
          `Tailoring is a loop, not a one-time pass. Paste the posting, edit, re-scan and watch the keyword bar respond, then repeat until the matches reflect your real stack. That keyword re-scan loop is the entire method behind a good match percentage, and it is the reason this page exists for anyone learning how to add keywords to a resume.`,
        ],
      },
    ],
    faqs: [
      { q: `How do I add keywords to a resume without keyword stuffing?`, a: `Place each term inside a bullet that proves real use, not in a long stacked list. If the posting repeats cloud migration and your project did it, write the phrase inside the sentence. Resume keywords work when they match evidence, and honest keyword use keeps the document readable for the interview that follows.` },
      { q: `What is job description keyword mining and how do I do it?`, a: `It is reading the posting for terms that appear more than once, because repetition usually marks the checklist a screener applies. List those tools, skills and responsibilities, then rank them. A keyword finder automates the tally and shows you exactly which posting vocabulary deserves a place in your resume.` },
      { q: `Does exact phrase matching matter more than synonyms?`, a: `Exact phrase matching scores a direct hit, while a synonym only signals understanding, so use the posting wording where your experience honestly supports it. Pair the phrase with context inside a project bullet. Without that, a game of resume keywords produces a match on paper and no interview value.` },
      { q: `When should I re-scan my resume for keywords?`, a: `Re-scan after every edit, not just at the end. Paste the new posting, tweak the bullets, run the check and watch the keyword bar respond. That keyword re-scan loop is what converts a general CV into a tailored match, and it catches drifted terms before you hit submit on an application.` },
      { q: `Do ATS tools weight resume keywords differently?`, a: `Yes, systems vary in how they weight section, frequency and exact phrases, and some even flag heavily-filled resumes as stuffed. The safe approach stays the same everywhere: honest keyword use, in-context placement and a keyword re-scan loop. Tool settings never change that core strategy.` },
    ],
  },
};