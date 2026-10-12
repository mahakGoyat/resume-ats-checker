import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseResumeSections } from './resume-sections';
import {
  improvedFromParsed,
  improveResume,
  repairImprovedResume,
  sanitizeResumeText,
  validateImprovedResume,
  verifyImprovedResume,
  type ImprovedResume,
} from './resume-ai';
import { buildImprovedResumeDoc, cleanContactPart } from './resume-doc-model';

// All data below is FAKE — invented for the deterministic guard test.
const FAKE_PHONE = '+91 85720 82217';
const FAKE_EMAIL = 'arjun.sharma@example.com';
const FAKE_LINKEDIN = 'linkedin.com/in/arjun-sharma';
const FAKE_URL = 'github.com/arjun-sharma';

const FAKE_ORIGINAL_TEXT = [
  'ARJUN SHARMA',
  'Senior Software Engineer',
  `Gurugram, Haryana | ${FAKE_PHONE} | ${FAKE_EMAIL} | ${FAKE_LINKEDIN}`,
  '',
  'PROFESSIONAL SUMMARY',
  'Full-stack developer with 5 years of experience building web applications for fintech teams.',
  '',
  'TECHNICAL & PROFESSIONAL SKILLS',
  'Technical Skills: JavaScript, React, Node.js, TypeScript',
  'Tools & Platforms: Git, Docker, AWS, PostgreSQL',
  '',
  'KEY PROJECTS',
  'Project Alpha',
  'Tech: React, Node.js, PostgreSQL',
  '- Built a real-time dashboard used by 1,200 daily users.',
  '- Reduced average page load time by 40%.',
  '',
  'Project Beta',
  'Tech: TypeScript, Docker, AWS',
  '- Designed a CI/CD pipeline that cut release time from 2 hours to 20 minutes.',
  '- Led a team of 3 junior developers on the rewrite.',
  '',
  'Project Gamma',
  'Tech: React, Node.js',
  '- Migrated a legacy PHP app to a React front end.',
  '- Cut support tickets by 35% in the first quarter.',
  '',
  'Project Delta',
  'Tech: Python, PostgreSQL',
  '- Built a batch ETL job processing 2M rows nightly.',
  '- Added monitoring alerts that flagged 90% of failures early.',
  '',
  'EDUCATION & CERTIFICATIONS',
  'B.Sc. (Hons) Computer Science - DCRUST, Murthal - 2022',
  'Senior Secondary - DAV School - 2016',
  'PG Diploma in DevOps - Great Learning - 2023',
  'AWS Cloud Practitioner - Amazon - 2023',
  'Meta Front-End Developer Certificate - Coursera - 2024',
  '',
].join('\n');

function goodImprove(): ImprovedResume {
  return {
    header: {
      name: 'ARJUN SHARMA',
      title: 'Senior Software Engineer',
      location: 'Gurugram, Haryana',
      phone: FAKE_PHONE,
      email: FAKE_EMAIL,
      linkedin: FAKE_LINKEDIN,
      github: '',
      other: [],
    },
    sections: [
      { type: 'summary', title: 'PROFESSIONAL SUMMARY', items: [{ type: 'text', text: 'Full-stack developer with 5 years of experience building web applications for fintech teams.' }] },
      { type: 'skills', title: 'TECHNICAL & PROFESSIONAL SKILLS', items: [
        { type: 'skills-row', label: 'Technical Skills', values: ['JavaScript', 'React', 'Node.js', 'TypeScript'] },
        { type: 'skills-row', label: 'Tools & Platforms', values: ['Git', 'Docker', 'AWS', 'PostgreSQL'] },
      ] },
      { type: 'projects', title: 'KEY PROJECTS', items: [
        { type: 'entry', title: 'Project Alpha', subtitle: 'Tech: React, Node.js, PostgreSQL', right: '', bullets: ['Built a real-time dashboard used by 1,200 daily users.', 'Reduced average page load time by 40%.'] },
        { type: 'entry', title: 'Project Beta', subtitle: 'Tech: TypeScript, Docker, AWS', right: '', bullets: ['Designed a CI/CD pipeline that cut release time from 2 hours to 20 minutes.', 'Led a team of 3 junior developers on the rewrite.'] },
        { type: 'entry', title: 'Project Gamma', subtitle: 'Tech: React, Node.js', right: '', bullets: ['Migrated a legacy PHP app to a React front end.', 'Cut support tickets by 35% in the first quarter.'] },
        { type: 'entry', title: 'Project Delta', subtitle: 'Tech: Python, PostgreSQL', right: '', bullets: ['Built a batch ETL job processing 2M rows nightly.', 'Added monitoring alerts that flagged 90% of failures early.'] },
      ] },
      { type: 'education', title: 'EDUCATION & CERTIFICATIONS', items: [
        { type: 'edu', text: 'B.Sc. (Hons) Computer Science - DCRUST, Murthal', right: '2022' },
        { type: 'edu', text: 'Senior Secondary - DAV School', right: '2016' },
        { type: 'edu', text: 'PG Diploma in DevOps - Great Learning', right: '2023' },
        { type: 'edu', text: 'AWS Cloud Practitioner - Amazon', right: '2023' },
        { type: 'edu', text: 'Meta Front-End Developer Certificate - Coursera', right: '2024' },
      ] },
    ],
    suggestions: ['Lead with quantifiable results in each bullet.'],
  };
}

function badImprove(): ImprovedResume {
  const good = goodImprove();
  const bad = JSON.parse(JSON.stringify(good)) as ImprovedResume;
  bad.header.phone = '4918572082217'; // digit-compacted, mangled
  bad.header.email = 'not-the-right@example.com';
  bad.sections[0].title = 'SUMMARY'; // renamed heading
  // Merge project 3 into project 2 (removes one entry) and duplicate a bullet.
  bad.sections[2].items[1].bullets?.push('Led a team of 3 junior developers on the rewrite.');
  bad.sections[2].items.splice(2, 1);
  bad.sections[3].items[1].text = 'DAV School'; // drops the year
  bad.sections[3].items[1].right = '';
  return bad;
}

describe('sanitizeResumeText', () => {
  it('removes icon glyphs, private-use and control chars, and emoji', () => {
    const dirty = `A\uE000\uE600\uF0FF\u200B\uFEFF\u2600\u{1F600}resume\nwith\to\tspaces`;
    const clean = sanitizeResumeText(dirty);
    assert.ok(!clean.includes('\uE000'));
    assert.ok(!clean.includes('\u200B'));
    assert.ok(!clean.includes('\uFEFF'));
    assert.ok(!clean.includes('\u2600'));
    assert.ok(!clean.match(/\s{2,}/));
    assert.ok(clean.includes('resume'));
  });

  it('keeps the characters that matter inside phones, emails and URLs', () => {
    const clean = sanitizeResumeText(`Call ${FAKE_PHONE} or ${FAKE_EMAIL} at ${FAKE_URL}`);
    assert.ok(clean.includes('+91 85720 82217'));
    assert.ok(clean.includes('@example.com'));
    assert.ok(clean.includes('github.com/arjun-sharma'));
  });
});

describe('validateImprovedResume (zod)', () => {
  it('accepts a well-formed response', () => {
    const result = validateImprovedResume(goodImprove());
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.data.sections.length, 4);
  });

  it('rejects garbage so callers can fall back to the original', () => {
    const result = validateImprovedResume({ header: 'nope', sections: 42, suggestions: 'x' });
    assert.equal(result.ok, false);
    assert.ok(result.ok === false && result.error.length > 0);
  });
});

describe('verifyImprovedResume (deterministic guard)', () => {
  it('passes a faithful improved resume', () => {
    const issues = verifyImprovedResume(FAKE_ORIGINAL_TEXT, goodImprove());
    assert.deepEqual(issues, []);
  });

  it('flags mangled phones, dropped years, renamed sections, lost entries and duplicates', () => {
    const issues = verifyImprovedResume(FAKE_ORIGINAL_TEXT, badImprove());
    assert.ok(issues.some((issue) => issue.includes('phone')));
    assert.ok(issues.some((issue) => /2016|year|date/i.test(issue)));
    assert.ok(issues.some((issue) => issue.includes('Entry count')));
    assert.ok(issues.some((issue) => issue.includes('Duplicate line')));
  });
});

describe('repairImprovedResume / improvedFromParsed', () => {
  it('restores contact details verbatim and rebuilds structure when the guard fails', () => {
    const { result, notes } = repairImprovedResume(FAKE_ORIGINAL_TEXT, badImprove());
    assert.equal(result.header.phone, FAKE_PHONE);
    assert.equal(result.header.email, FAKE_EMAIL);
    assert.equal(result.header.linkedin, FAKE_LINKEDIN);
    assert.ok(notes.length > 0);
    assert.deepEqual(verifyImprovedResume(FAKE_ORIGINAL_TEXT, result), []);
  });

  it('never changes facts when used as a deterministic fallback', () => {
    const parsed = parseResumeSections(FAKE_ORIGINAL_TEXT);
    assert.equal(parsed.sections.length, 4);
    const doc = buildImprovedResumeDoc(goodImprove());
    assert.ok(doc.some((block) => block.kind === 'section' && block.title === 'TECHNICAL & PROFESSIONAL SKILLS'));
    assert.ok(doc.some((block) => block.kind === 'skills'));
  });
});

// Keep node:test and the async improveResume export referenced so the module
// surface we ship stays exercised by the runner.
describe('improveResume', () => {
  it('rejects empty input without calling the network', async () => {
    const outcome = await improveResume('   ');
    assert.equal(outcome.ok, false);
  });
});

describe('icon-glyph / mojibake residue in header (regression)', () => {
  const DIRTY_HEADER =
    'Q SUNSHINE SAINI\n' +
    'Digital Marketing & AI Specialist\n' +
    'Q Kaithal, Haryana, India | &, | & muskansaini06729@gmail.com | MB linkedin.com/in/suman-saini-0a6897423 | (€)\n\n' +
    'PROFESSIONAL SUMMARY\nMarketing pro.\n';

  it('cleanContactPart extracts the real field and drops pure junk', () => {
    assert.equal(cleanContactPart('Q Kaithal, Haryana, India'), 'Kaithal, Haryana, India');
    assert.equal(cleanContactPart('& muskansaini06729@gmail.com'), 'muskansaini06729@gmail.com');
    assert.equal(cleanContactPart('MB linkedin.com/in/suman-saini-0a6897423'), 'linkedin.com/in/suman-saini-0a6897423');
    assert.equal(cleanContactPart('&,'), '');
    assert.equal(cleanContactPart('(€)'), '');
    assert.equal(cleanContactPart('MB'), '');
    assert.equal(cleanContactPart('Kaithal, Haryana, India'), 'Kaithal, Haryana, India');
  });

  it('cleans the name and contact line that feed the improve preview/PDF/DOCX', () => {
    const parsed = parseResumeSections(DIRTY_HEADER);
    const improved = improvedFromParsed(parsed);
    assert.equal(improved.header.name, 'SUNSHINE SAINI');
    const repaired = repairImprovedResume(DIRTY_HEADER, { header: improved.header, sections: improved.sections, suggestions: [] }).result;
    assert.equal(repaired.header.name, 'SUNSHINE SAINI');
    assert.ok(repaired.header.email.includes('muskansaini06729@gmail.com'));

    const blocks = buildImprovedResumeDoc(repaired);
    const nameBlock = blocks.find((block) => block.kind === 'name');
    const contactBlock = blocks.find((block) => block.kind === 'contact');
    assert.equal(nameBlock && nameBlock.kind === 'name' ? nameBlock.text : '', 'SUNSHINE SAINI');
    assert.ok(contactBlock && contactBlock.kind === 'contact');
    const parts = contactBlock.kind === 'contact' ? contactBlock.text.split(' | ') : [];
    assert.ok(parts.includes('Kaithal, Haryana, India'));
    assert.ok(parts.some((part) => part.includes('muskansaini06729@gmail.com')));
    assert.ok(parts.some((part) => part.includes('linkedin.com/in/suman-saini-0a6897423')));
    for (const junk of ['Q', '&,', '&', 'MB', '(€)']) {
      assert.ok(!parts.includes(junk), `junk part leaked: ${junk}`);
    }
    // Name block always sits before the title block.
    const titleIndex = blocks.findIndex((block) => block.kind === 'title');
    assert.ok(nameBlock && titleIndex > blocks.indexOf(nameBlock));
  });
});