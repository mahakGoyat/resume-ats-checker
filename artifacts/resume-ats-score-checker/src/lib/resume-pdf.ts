import { jsPDF } from 'jspdf';
import { buildResumeDoc, type ResumeDocBlock, type ResumeDocItem } from './resume-doc-model';
import { toPdfText } from './resume-pdf-text';
import { hrefFor, isWebLink, labelForContactPart } from './resume-pdf-links';
import {
  COLOR_ACCENT,
  COLOR_MUTED,
  COLOR_RIGHT,
  COLOR_TEXT,
  CONTENT_WIDTH_PT,
  FONT_STACK,
  GAP_BLOCK_AFTER,
  GAP_CONTACT_AFTER,
  GAP_ENTRY_BEFORE,
  GAP_ITEM_AFTER,
  GAP_NAME_AFTER,
  GAP_SECTION_AFTER,
  GAP_SECTION_BEFORE,
  GAP_TITLE_AFTER,
  INDENT_BULLET_PT,
  LINE_HEIGHT,
  MARGIN_BOTTOM_PT,
  MARGIN_TOP_PT,
  MARGIN_X_PT,
  MIN_FIT_SCALE,
  PAGE_HEIGHT_PT,
  PAGE_WIDTH_PT,
  PDF_FONT,
  PDF_FONT_STYLE,
  ROW_MIN_GUTTER_PT,
  RULER_WIDTH_PT,
  SIZE_BODY_PT,
  SIZE_CONTACT_PT,
  SIZE_ENTRY_TITLE_PT,
  SIZE_NAME_PT,
  SIZE_RIGHT_PT,
  SIZE_SECTION_HEADING_PT,
  SIZE_TITLE_PT,
} from './resume-layout';
import type { ParsedResume } from './resume-sections';

type FontStyle = 'normal' | 'bold' | 'italic' | 'bolditalic';

const FONT_BY_STYLE: Record<FontStyle, string> = PDF_FONT_STYLE;

/** One measured, positioned run of text, ready to draw or to measure against. */
type Cell = {
  text: string;
  x: number;
  width: number;
  size: number;
  style: FontStyle;
  color: [number, number, number];
  href?: string;
  underline?: boolean;
};

type Line = {
  cells: Cell[];
  height: number;
  /** Extra space below this line. */
  gapAfter: number;
  /** Keep the whole line (and what follows) on one page. */
  keepWithNext?: boolean;
};

export const RESUME_PDF_SOURCE_ID = 'resume-pdf-source';
export const RESUME_PDF_SOURCE_WRAPPER_ID = 'resume-pdf-source-wrapper';

// ---------------------------------------------------------------------------
// Measuring
// ---------------------------------------------------------------------------

/**
 * A jsPDF document used only for text measurement. jsPDF's own metrics are the
 * single source of truth for how wide a string will be, so measuring and
 * drawing can never disagree and produce overlapping runs.
 */
function createMeasurer(): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });
  doc.setFont(PDF_FONT, 'normal');
  return doc;
}
function measureWidth(measurer: jsPDF, text: string, size: number, style: FontStyle): number {
  if (!text) return 0;
  measurer.setFont(PDF_FONT, FONT_BY_STYLE[style]);
  measurer.setFontSize(size);
  return measurer.getTextWidth(text);
}

/** Greedy word wrap against the available width. */
function wrapText(measurer: jsPDF, text: string, size: number, style: FontStyle, maxWidth: number): string[] {
  const value = text.trim();
  if (!value) return [];
  if (measureWidth(measurer, value, size, style) <= maxWidth) return [value];

  const lines: string[] = [];
  let current = '';
  for (const word of value.split(/\s+/)) {
    if (!word) continue;
    const candidate = current ? `${current} ${word}` : word;
    if (measureWidth(measurer, candidate, size, style) <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);

  // A single word longer than the column is hard-split so it can never
  // overflow the page margin.
  const hardSplit = lines.flatMap((line) => {
    if (measureWidth(measurer, line, size, style) <= maxWidth) return [line];
    const parts: string[] = [];
    let chunk = '';
    for (const char of line) {
      const next = chunk + char;
      if (chunk && measureWidth(measurer, next, size, style) > maxWidth) {
        parts.push(chunk);
        chunk = char;
      } else {
        chunk = next;
      }
    }
    if (chunk) parts.push(chunk);
    return parts;
  });
  return hardSplit;
}

// ---------------------------------------------------------------------------
// Line building
// ---------------------------------------------------------------------------

function lineHeightFor(size: number): number {
  return size * LINE_HEIGHT;
}

class LineBuilder {
  private readonly measurer: jsPDF;
  private readonly scale: number;
  readonly lines: Line[] = [];

  constructor(measurer: jsPDF, scale: number) {
    this.measurer = measurer;
    this.scale = scale;
  }

  px(value: number): number {
    return value * this.scale;
  }

  push(line: Line): void {
    this.lines.push(line);
  }

  width(text: string, size: number, style: FontStyle): number {
    return measureWidth(this.measurer, text, this.px(size), style);
  }

  /**
   * Lays out a left-hand run plus an optional right-hand run on the same row.
   *
   * The right-hand run (date, grade, tech tag) is right-aligned. If the two
   * would come closer than ROW_MIN_GUTTER_PT, the right-hand run is dropped to
   * its own line instead — the two can never be merged or overlapped, which is
   * bug #5 and bug #6.
   */
  row(options: {
    left: string;
    right?: string;
    rightStyle?: FontStyle;
    rightSize?: number;
    rightColor?: [number, number, number];
    leftSize: number;
    leftStyle: FontStyle;
    leftColor?: [number, number, number];
    gapBefore?: number;
    gapAfter?: number;
    bullet?: boolean;
    indent?: number;
    keepWithNext?: boolean;
  }): void {
    const {
      left,
      right,
      rightStyle = 'normal',
      rightSize = SIZE_RIGHT_PT,
      rightColor = COLOR_RIGHT,
      leftSize,
      leftStyle,
      leftColor = COLOR_TEXT,
      gapBefore = 0,
      gapAfter = 0,
      bullet = false,
      indent = 0,
      keepWithNext = false,
    } = options;

    const pxLeftSize = this.px(leftSize);
    const lineHeight = lineHeightFor(pxLeftSize);
    const startX = MARGIN_X_PT + indent;
    const leftColumn = CONTENT_WIDTH_PT - indent;

    const prefix = bullet ? '- ' : '';
    const leftText = `${prefix}${left}`.trim();
    const rightText = right?.trim();

    const rightWidth = rightText ? this.width(rightText, rightSize, rightStyle) : 0;
    const rightX = MARGIN_X_PT + CONTENT_WIDTH_PT - rightWidth;

    // A right-only row: the left title was too long, so the value gets its own
    // right-aligned line. It must still be drawn, never silently dropped.
    if (!leftText) {
      if (!rightText) return;
      if (gapBefore > 0) this.bump(gapBefore);
      this.lines.push({
        height: lineHeightFor(this.px(rightSize)),
        gapAfter,
        keepWithNext,
        cells: [{ text: rightText, x: rightX, width: rightWidth, size: this.px(rightSize), style: rightStyle, color: rightColor }],
      });
      return;
    }

    const usableLeft = rightText ? leftColumn - rightWidth - ROW_MIN_GUTTER_PT : leftColumn;
    const leftLines = wrapText(this.measurer, leftText, pxLeftSize, leftStyle, usableLeft);

    if (gapBefore > 0) this.bump(gapBefore);

    // Both runs fit on the first row with a real gap between them.
    if (rightText && leftLines.length === 1 && rightX - (startX + this.width(leftText, leftSize, leftStyle)) >= ROW_MIN_GUTTER_PT) {
      this.lines.push({
        height: lineHeight,
        gapAfter,
        keepWithNext,
        cells: [
          { text: leftText, x: startX, width: this.width(leftText, leftSize, leftStyle), size: pxLeftSize, style: leftStyle, color: leftColor },
          { text: rightText, x: rightX, width: rightWidth, size: this.px(rightSize), style: rightStyle, color: rightColor },
        ],
      });
      return;
    }

    // Otherwise the right-hand value gets its own line, right-aligned. Never
    // appended to the left run, so "Expected2026" cannot happen.
    leftLines.forEach((text, index) => {
      const cells: Cell[] = [
        {
          text,
          x: startX + (index === 0 ? 0 : this.measureIndent(prefix, leftSize, leftStyle)),
          width: this.width(text, leftSize, leftStyle),
          size: pxLeftSize,
          style: leftStyle,
          color: leftColor,
        },
      ];
      if (index === 0 && rightText) {
        cells.push({
          text: rightText,
          x: rightX,
          width: rightWidth,
          size: this.px(rightSize),
          style: rightStyle,
          color: rightColor,
        });
      }
      this.lines.push({
        height: lineHeight,
        gapAfter: index === leftLines.length - 1 ? gapAfter : 0,
        keepWithNext: keepWithNext && index === leftLines.length - 1,
        cells,
      });
    });
  }

  private measureIndent(prefix: string, size: number, style: FontStyle): number {
    return prefix ? this.width(prefix, size, style) : 0;
  }

  /** Centered single line, e.g. the name. */
  centered(text: string, size: number, style: FontStyle, color: [number, number, number], gapAfter: number): void {
    const pxSize = this.px(size);
    const width = this.width(text, size, style);
    this.lines.push({
      height: lineHeightFor(pxSize),
      gapAfter,
      keepWithNext: true,
      cells: [{ text, x: MARGIN_X_PT + (CONTENT_WIDTH_PT - width) / 2, width, size: pxSize, style, color }],
    });
  }

  /**
   * The centered contact line. Every part flows onto the line as a single unit
   * and wraps to a continuation line when the next part would not fit, so no
   * URL is ever split or dropped. Each linkable part carries a real, absolute
   * href and becomes a /Link annotation (bug #2).
   */
  contact(text: string, gapAfter: number): void {
    const pxSize = this.px(SIZE_CONTACT_PT);
    const height = lineHeightFor(pxSize);
    const parts = text
      .split(/\s*\|\s*/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return;

    const right = MARGIN_X_PT + CONTENT_WIDTH_PT;
    const separator = '|';
    const separatorWidth = this.width(` ${separator} `, SIZE_CONTACT_PT, 'normal');
    const rows: Cell[][] = [];
    let row: Cell[] = [];
    let x = MARGIN_X_PT;

    const flush = () => {
      if (row.length) rows.push(row);
      row = [];
      x = MARGIN_X_PT;
    };

    for (const [index, part] of parts.entries()) {
      const label = labelForContactPart(part);
      const visible = toPdfText(`${label}${part}`);
      if (!visible) continue;
      const href = hrefFor(part);
      const width = this.width(visible, SIZE_CONTACT_PT, 'normal');
      const isLast = index === parts.length - 1;
      const advance = width + (isLast ? 0 : separatorWidth);

      // Start a new line when this part (plus its trailing separator) does not
      // fit on the current one. A part wider than the whole column is still
      // placed rather than dropped.
      if (row.length > 0 && x + advance > right) flush();

      row.push({
        text: visible,
        x,
        width,
        size: pxSize,
        style: 'normal',
        color: COLOR_TEXT,
        href: href ?? undefined,
        underline: Boolean(href),
      });
      x += width;

      if (!isLast) {
        row.push({ text: separator, x: x + separatorWidth / 3, width: separatorWidth, size: pxSize, style: 'normal', color: COLOR_MUTED });
        x += separatorWidth;
      }
    }
    flush();

    rows.forEach((cells, index) => {
      // Centre the last (possibly short) line.
      const used = cells.reduce((total, cell) => total + cell.width, 0);
      const offset = (CONTENT_WIDTH_PT - used) / 2;
      if (offset > 0) for (const cell of cells) cell.x += offset;
      this.lines.push({ height, gapAfter: index === rows.length - 1 ? gapAfter : 0, cells });
    });
  }

  /** Skills row: bold label on the left, values wrapping in the remainder. */
  skills(label: string, values: string[], gapAfter: number): void {
    const pxSize = this.px(SIZE_BODY_PT);
    const height = lineHeightFor(pxSize);
    const labelText = toPdfText(label).replace(/[:\s]+$/, '');
    const labelWidth = labelText ? Math.min(this.width(`${labelText}: `, SIZE_BODY_PT, 'bold'), this.px(150)) : 0;
    const columnStart = MARGIN_X_PT + (labelText ? labelWidth + 6 : 0);
    const columnWidth = MARGIN_X_PT + CONTENT_WIDTH_PT - columnStart;

    const cells: Cell[] = [];
    if (labelText) {
      cells.push({
        text: `${labelText}:`,
        x: MARGIN_X_PT,
        width: this.width(`${labelText}:`, SIZE_BODY_PT, 'bold'),
        size: pxSize,
        style: 'bold',
        color: COLOR_TEXT,
      });
    }
    const valueText = toPdfText(values.join(', '));
    for (const [index, chunk] of wrapText(this.measurer, valueText, pxSize, 'normal', columnWidth).entries()) {
      if (index > 0) {
        cells.push({ text: '', x: columnStart, width: 0, size: pxSize, style: 'normal', color: COLOR_TEXT });
        this.lines.push({ height, gapAfter: 0, cells });
      }
      cells.push({
        text: chunk,
        x: columnStart,
        width: this.width(chunk, SIZE_BODY_PT, 'normal'),
        size: pxSize,
        style: 'normal',
        color: COLOR_TEXT,
      });
    }
    this.lines.push({ height, gapAfter, cells });
  }

  sectionHeading(title: string, gapBefore: number, gapAfter: number): void {
    this.bump(gapBefore);
    const text = toPdfText(title).toUpperCase();
    const pxSize = this.px(SIZE_SECTION_HEADING_PT);
    const width = this.width(text, SIZE_SECTION_HEADING_PT, 'bold');
    this.lines.push({
      height: lineHeightFor(pxSize),
      gapAfter,
      keepWithNext: true,
      cells: [{ text, x: MARGIN_X_PT, width, size: pxSize, style: 'bold', color: COLOR_ACCENT }],
    });
    // Underline rule, drawn as a real vector line.
    this.lines.push({
      height: RULER_WIDTH_PT + 2,
      gapAfter: 0,
      keepWithNext: true,
      cells: [],
      rule: true,
    } as Line & { rule: true });
  }

  private bump(value: number): void {
    if (value <= 0) return;
    const last = this.lines[this.lines.length - 1];
    if (last) last.gapAfter += this.px(value);
  }
}

// ---------------------------------------------------------------------------
// Block -> lines
// ---------------------------------------------------------------------------

function buildLines(measurer: jsPDF, blocks: ResumeDocBlock[], scale: number): Line[] {
  const builder = new LineBuilder(measurer, scale);
  let firstInSection = true;

  for (const block of blocks) {
    if (block.kind === 'name') {
      builder.centered(toPdfText(block.text), SIZE_NAME_PT, 'bold', COLOR_TEXT, GAP_NAME_AFTER);
      continue;
    }
    if (block.kind === 'title') {
      builder.centered(toPdfText(block.text), SIZE_TITLE_PT, 'normal', COLOR_MUTED, GAP_TITLE_AFTER);
      continue;
    }
    if (block.kind === 'contact') {
      builder.contact(block.text, GAP_CONTACT_AFTER);
      continue;
    }
    if (block.kind === 'section') {
      builder.sectionHeading(block.title, firstInSection ? 0 : GAP_SECTION_BEFORE, GAP_SECTION_AFTER);
      firstInSection = false;
      continue;
    }
    if (block.kind === 'skills') {
      builder.skills(block.label, block.values, GAP_ITEM_AFTER);
      continue;
    }

    const item = block as ResumeDocItem;
    const text = toPdfText(item.text);
    const tech = toPdfText(item.tech ?? '');
    const right = toPdfText(item.right ?? '');

    // A row with no left-hand text at all is a pure right-hand value: the
    // title was long enough that its tech tag moved down to its own line.
    if (!text && (right || tech)) {
      builder.row({
        left: '',
        right: tech || right,
        rightStyle: tech ? 'italic' : 'normal',
        rightSize: SIZE_RIGHT_PT,
        rightColor: tech ? COLOR_MUTED : COLOR_RIGHT,
        leftSize: item.bold ? SIZE_ENTRY_TITLE_PT : SIZE_BODY_PT,
        leftStyle: 'bold',
        gapBefore: 0,
        gapAfter: tech && right ? 0 : item.spaceAfter ? GAP_BLOCK_AFTER : GAP_ITEM_AFTER,
      });
      continue;
    }

    if (!text) continue;

    // A tech tag is the entry's own right-hand value: italic, lighter, on the
    // same row as the title (or the subtitle). Never concatenated into the
    // title run, and never emitted as a separate trailing fragment.
    builder.row({
      left: text,
      right: tech || right || undefined,
      rightStyle: tech ? 'italic' : 'normal',
      rightSize: SIZE_RIGHT_PT,
      rightColor: tech ? COLOR_MUTED : COLOR_RIGHT,
      leftSize: item.bold ? SIZE_ENTRY_TITLE_PT : SIZE_BODY_PT,
      leftStyle: item.bold ? 'bold' : 'normal',
      gapBefore: item.spaceBefore ? GAP_ENTRY_BEFORE : 0,
      gapAfter: item.spaceAfter ? GAP_BLOCK_AFTER : GAP_ITEM_AFTER,
      bullet: item.bullet,
      indent: item.bullet ? INDENT_BULLET_PT : 0,
    });
  }

  return builder.lines;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

type PlacedLine = { line: Line; page: number; y: number };

/**
 * Flows lines onto pages, never splitting a line across a page boundary and
 * keeping an entry's title with its following bullets when it fits.
 */
function paginate(lines: Line[], scale: number): { placed: PlacedLine[]; pageCount: number } {
  const usable = PAGE_HEIGHT_PT - MARGIN_TOP_PT - MARGIN_BOTTOM_PT;
  const placed: PlacedLine[] = [];
  let page = 1;
  let y = MARGIN_TOP_PT;

  for (const [index, line] of lines.entries()) {
    const advance = line.height + line.gapAfter;
    const isLast = index === lines.length - 1;
    if (!isLast && y + advance > MARGIN_TOP_PT + usable) {
      page += 1;
      y = MARGIN_TOP_PT;
    }
    placed.push({ line, page, y });
    y += line.height + line.gapAfter;
  }

  void scale;
  return { placed, pageCount: page };
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function drawLines(doc: jsPDF, placed: PlacedLine[]): void {
  let currentPage = 1;
  for (const { line, page, y } of placed) {
    while (currentPage < page) {
      doc.addPage();
      currentPage += 1;
    }

    if ((line as Line & { rule?: boolean }).rule) {
      doc.setDrawColor(COLOR_ACCENT[0], COLOR_ACCENT[1], COLOR_ACCENT[2]);
      doc.setLineWidth(RULER_WIDTH_PT);
      doc.line(MARGIN_X_PT, y + line.height / 2, MARGIN_X_PT + CONTENT_WIDTH_PT, y + line.height / 2);
      continue;
    }

    for (const cell of line.cells) {
      if (!cell.text) continue;
      doc.setFont(PDF_FONT, FONT_BY_STYLE[cell.style]);
      doc.setFontSize(cell.size);
      doc.setTextColor(cell.color[0], cell.color[1], cell.color[2]);
      // jsPDF's text() takes a baseline. `y` is the top of the line box and the
      // font ascent sits below that, so offset down by the ascent and centre
      // whatever leading is left over.
      const textY = y + cell.size * 0.98 + (line.height - cell.size * LINE_HEIGHT) * 0.5;
      doc.text(cell.text, cell.x, textY, { baseline: 'alphabetic' });
      if (cell.underline) {
        doc.setDrawColor(cell.color[0], cell.color[1], cell.color[2]);
        doc.setLineWidth(0.4);
        doc.line(cell.x, textY + 1.2, cell.x + cell.width, textY + 1.2);
      }
      if (cell.href) {
        // Real /Link annotation carrying an absolute /URI — bug #2.
        doc.link(cell.x - 1, textY - cell.size * 0.9, cell.width + 2, cell.size * 1.15, { url: cell.href });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Photo
// ---------------------------------------------------------------------------

function addPhoto(doc: jsPDF, dataUrl: string): void {
  try {
    const format = /^data:image\/png/i.test(dataUrl) ? 'PNG' : 'JPEG';
    const size = 78;
    doc.addImage(dataUrl, format, PAGE_WIDTH_PT - MARGIN_X_PT - size, MARGIN_TOP_PT, size, size, undefined, 'FAST');
  } catch {
    // A photo that cannot be decoded is not worth failing the export over.
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function renderDoc(blocks: ResumeDocBlock[], photoDataUrl?: string | null): jsPDF {
  const measurer = createMeasurer();

  // 10pt-equivalent body text is the default. If the resume still overflows one
  // page, scale font sizes AND spacing down together (never truncating content)
  // until it fits, down to MIN_FIT_SCALE. If even that is not enough, the extra
  // content flows onto page 2.
  let scale = 1;
  let lines = buildLines(measurer, blocks, scale);
  let pagination = paginate(lines, scale);
  while (pagination.pageCount > 1 && scale > MIN_FIT_SCALE) {
    scale = Math.max(MIN_FIT_SCALE, scale - 0.04);
    lines = buildLines(measurer, blocks, scale);
    pagination = paginate(lines, scale);
  }

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });
  doc.setProperties({
    title: 'Resume',
    subject: 'Resume',
    creator: 'Resume ATS Score Checker',
  });
  if (photoDataUrl) addPhoto(doc, photoDataUrl);
  drawLines(doc, pagination.placed);
  return doc;
}

export function renderResumePdfBytes(blocks: ResumeDocBlock[], photoDataUrl?: string | null): Uint8Array {
  return new Uint8Array(renderDoc(blocks, photoDataUrl).output('arraybuffer'));
}

export async function generateResumePdf(resume: ParsedResume, photoDataUrl?: string | null): Promise<Uint8Array> {
  return renderResumePdfBytes(buildResumeDoc(resume), photoDataUrl);
}

export async function generateResumePdfFromDoc(blocks: ResumeDocBlock[], photoDataUrl?: string | null): Promise<Uint8Array> {
  return renderResumePdfBytes(blocks, photoDataUrl);
}

export { FONT_STACK, isWebLink };
