import type { ParsedResume } from './resume-sections';
import { buildResumeDoc, dataUrlToBytes } from './resume-doc-model';
import type { ResumeDocBlock } from './resume-doc-model';

const FONT_SIZE_NAME = 20;
const FONT_SIZE_TITLE = 13;
const FONT_SIZE_CONTACT = 9.5;
const FONT_SIZE_HEADING = 12;
const FONT_SIZE_BODY = 10.5;

const CONTENT_WIDTH_TWIP = 10205;
const BULLET_INDENT_TWIP = 280;
const LINE_SPACING_TWIPS = 288;
const NAME_AFTER_TWIP = 80;
const TITLE_AFTER_TWIP = 80;
const CONTACT_AFTER_TWIP = 160;
const HEADING_BEFORE_TWIP = 320;
const HEADING_AFTER_TWIP = 180;
const ITEM_AFTER_TWIP = 120;
const ITEM_LAST_AFTER_TWIP = 80;
const ITEM_BEFORE_TWIP = 200;

export async function generateResumeDocx(resume: ParsedResume, photoDataUrl?: string | null): Promise<Blob> {
  const blocks = buildResumeDoc(resume);
  return generateResumeDocxFromDoc(blocks, photoDataUrl);
}

export async function generateResumeDocxFromDoc(blocks: ResumeDocBlock[], photoDataUrl?: string | null): Promise<Blob> {
  const module = await import('docx');
  const {
    AlignmentType,
    BorderStyle,
    Document,
    ImageRun,
    Packer,
    Paragraph,
    Tab,
    TabStopType,
    TextRun,
    convertMillimetersToTwip,
  } = module;

  const children: InstanceType<typeof Paragraph>[] = [];

  if (photoDataUrl) {
    try {
      const { bytes, mime } = dataUrlToBytes(photoDataUrl);
      const type = mime.includes('png') ? 'png' : 'jpg';
      children.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 80 },
          children: [new ImageRun({ type, data: bytes, transformation: { width: 432, height: 432 } })],
        }),
      );
    } catch {
      // Ignore a photo that cannot be embedded and continue without it.
    }
  }

  const headingStyle: { before?: number; after?: number } = { before: HEADING_BEFORE_TWIP, after: HEADING_AFTER_TWIP };

  const itemParagraph = (item: Extract<ResumeDocBlock, { kind: 'item' }>) => {
    const runChildren: Array<InstanceType<typeof TextRun> | InstanceType<typeof Tab>> = [];
    runChildren.push(
      new TextRun({ text: item.text.trim(), bold: Boolean(item.bold), size: FONT_SIZE_BODY * 2, color: '111827' }),
    );
    if (item.right) {
      runChildren.push(new Tab());
      runChildren.push(new TextRun({ text: item.right, size: FONT_SIZE_BODY * 2, color: '4b5563' }));
    }
    const spacing = { after: item.spaceAfter ? ITEM_LAST_AFTER_TWIP : ITEM_AFTER_TWIP, before: item.spaceBefore ? ITEM_BEFORE_TWIP : 0, line: LINE_SPACING_TWIPS, lineRule: 'auto' as const };
    if (item.bullet) {
      return new Paragraph({
        bullet: { level: 0 },
        spacing,
        children: runChildren,
      });
    }
    return new Paragraph({
      spacing,
      tabStops: item.right ? [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH_TWIP }] : undefined,
      children: runChildren,
    });
  };

  for (const block of blocks) {
    if (block.kind === 'name') {
      children.push(
        new Paragraph({
          heading: 'Heading1',
          spacing: { after: NAME_AFTER_TWIP },
          children: [new TextRun({ text: block.text, bold: true, size: FONT_SIZE_NAME * 2, color: '000000' })],
        }),
      );
    } else if (block.kind === 'title') {
      children.push(
        new Paragraph({
          spacing: { after: TITLE_AFTER_TWIP },
          children: [new TextRun({ text: block.text, size: FONT_SIZE_TITLE * 2, color: '4b5563' })],
        }),
      );
    } else if (block.kind === 'contact') {
      children.push(
        new Paragraph({
          spacing: { after: CONTACT_AFTER_TWIP },
          children: [new TextRun({ text: block.text, size: FONT_SIZE_CONTACT * 2, color: '1f2937' })],
        }),
      );
    } else if (block.kind === 'skills') {
      const values = block.values.join(' · ');
      const runs: Array<InstanceType<typeof TextRun> | InstanceType<typeof Tab>> = [];
      if (block.label) {
        runs.push(new TextRun({ text: block.label, bold: true, size: FONT_SIZE_BODY * 2, color: '111827' }));
        runs.push(new Tab());
      }
      runs.push(new TextRun({ text: values, size: FONT_SIZE_BODY * 2, color: '111827' }));
      children.push(
        new Paragraph({
          spacing: { after: ITEM_AFTER_TWIP, line: LINE_SPACING_TWIPS, lineRule: 'auto' as const },
          tabStops: block.label ? [{ type: TabStopType.LEFT, position: 2400 }] : undefined,
          children: runs,
        }),
      );
    } else if (block.kind === 'section') {
      children.push(
        new Paragraph({
          heading: 'Heading2',
          spacing: headingStyle,
          border: {
            bottom: { color: '1a56db', size: 8, style: BorderStyle.SINGLE, space: 4 },
          },
          children: [
            new TextRun({ text: block.title.toUpperCase(), bold: true, size: FONT_SIZE_HEADING * 2, color: '1a56db' }),
          ],
        }),
      );
    } else {
      children.push(itemParagraph(block as Extract<ResumeDocBlock, { kind: 'item' }>));
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Arial', size: FONT_SIZE_BODY * 2 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
            margin: {
              top: convertMillimetersToTwip(15),
              right: convertMillimetersToTwip(15),
              bottom: convertMillimetersToTwip(15),
              left: convertMillimetersToTwip(15),
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}