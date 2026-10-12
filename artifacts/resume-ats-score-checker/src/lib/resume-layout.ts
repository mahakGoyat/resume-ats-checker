/**
 * Single source of truth for resume typography and page geometry.
 *
 * The PDF renderer draws from these numbers, and the on-screen preview /
 * print stylesheet are derived from them, so the downloaded PDF and the
 * preview always agree. All values are PDF points (1pt = 1/72in).
 *
 * Margins are deliberately generous: 36pt (0.5in) on every side. The previous
 * export used ~14pt side margins, which clipped in some viewers and printers.
 */

/** A4 in PDF points. */
export const PAGE_WIDTH_PT = 595.28;
export const PAGE_HEIGHT_PT = 841.89;

/** 0.5 inch on every side — the minimum safe printable area. */
export const MARGIN_X_PT = 36;
export const MARGIN_TOP_PT = 36;
export const MARGIN_BOTTOM_PT = 36;

export const CONTENT_WIDTH_PT = PAGE_WIDTH_PT - MARGIN_X_PT * 2;

export const FONT_STACK = 'Arial, Helvetica, sans-serif';

/** jsPDF standard font family; the four core faces are always available. */
export const PDF_FONT = 'helvetica';
export const PDF_FONT_STYLE: Record<'normal' | 'bold' | 'italic' | 'bolditalic', string> = {
  normal: 'normal',
  bold: 'bold',
  italic: 'italic',
  bolditalic: 'bolditalic',
};

/** Body copy: 10.5pt. Never below 10pt — the old default was 8.1pt. */
export const SIZE_NAME_PT = 20;
export const SIZE_TITLE_PT = 12;
export const SIZE_CONTACT_PT = 9.5;
export const SIZE_SECTION_HEADING_PT = 13.5;
export const SIZE_ENTRY_TITLE_PT = 10.5;
export const SIZE_BODY_PT = 10.5;
export const SIZE_RIGHT_PT = 9.5;

/** Vertical rhythm, as multiples of the current body size. */
export const LINE_HEIGHT = 1.32;
export const GAP_NAME_AFTER = 2;
export const GAP_TITLE_AFTER = 2;
export const GAP_CONTACT_AFTER = 9;
export const GAP_SECTION_BEFORE = 10;
export const GAP_SECTION_AFTER = 4;
export const GAP_ENTRY_BEFORE = 4;
export const GAP_ITEM_AFTER = 1.5;
export const GAP_BLOCK_AFTER = 5;
export const INDENT_BULLET_PT = 11;

export const COLOR_TEXT: [number, number, number] = [17, 24, 39];
export const COLOR_MUTED: [number, number, number] = [107, 114, 128];
export const COLOR_ACCENT: [number, number, number] = [26, 86, 219];
export const COLOR_RIGHT: [number, number, number] = [19, 101, 68];

/**
 * Two text runs on one row need a guaranteed gap so they can never touch.
 * The renderer drops the right-hand run to its own line when the two would
 * come closer than this.
 */
export const ROW_MIN_GUTTER_PT = 16;

export const RULER_WIDTH_PT = 1.4;

/** The lowest a one-page fit may scale down to before we allow a page break. */
export const MIN_FIT_SCALE = 0.78;
