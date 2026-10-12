/**
 * Text sanitization for the PDF text layer.
 *
 * jsPDF's built-in fonts use WinAnsi encoding, so characters outside that
 * repertoire (emoji, icons, curly quotes, CJK, Devanagari) are emitted as
 * garbage — exactly the "Q", "MB", "&," junk that used to show up in
 * extracted text. Mapping the common typographic characters to their
 * WinAnsi equivalents and dropping everything unrepresentable keeps the
 * text layer clean for ATS parsers.
 */

// Emoji, pictographs, flags, private-use and zero-width characters.
const NON_TEXT_RE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200D\u2060\uFEFF\u{E000}-\u{F8FF}]|[\u2600-\u27BF]|[\u{1F000}-\u{1FAFF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]/gu;

const TYPOGRAPHIC_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\u2018|\u2019|\u201B|\u2032/g, "'"],
  [/\u201C|\u201D|\u201E|\u201F|\u2033/g, '"'],
  [/\u2013|\u2012|\u2212/g, '-'],
  [/\u2014|\u2015/g, '--'],
  [/\u2026/g, '...'],
  [/\u00A0|\u2007|\u202F|\u2009|\u200A|\u2002|\u2003/g, ' '],
  [/\u2022|\u25CF|\u25AA|\u25E6|\u2043|\u2219/g, '-'],
  [/\u00B7|\u2027|\u0387/g, '-'],
  [/\u2192|\u27F6|\u21A6/g, '->'],
  [/\u2264|\u2265|\u2260/g, '<='],
  [/\u2264/g, '<='],
  [/\u00D7/g, 'x'],
  [/\uFB01/g, 'fi'],
  [/\uFB02/g, 'fl'],
  [/\u00AD/g, ''],
  [/\u200C|\u200D/g, ''],
];

// Characters jsPDF can actually encode in a standard font.
const WINANSI_EXTRA = new Set([
  '\u0085', '\u008C', '\u0091', '\u0092', '\u0093', '\u0094', '\u0095', '\u0096', '\u0097',
  '\u0098', '\u0099', '\u009A', '\u009B', '\u009C', '\u009D', '\u009E', '\u009F',
]);

/**
 * Normalizes one string so jsPDF can encode it. Never returns an empty string
 * for input that had printable characters — unrepresentable characters are
 * dropped rather than substituted, and a final whitespace collapse guarantees
 * the caller never sees a double space where a dropped character used to be.
 */
export function toPdfText(value: string): string {
  let text = value.replace(NON_TEXT_RE, '');
  for (const [pattern, replacement] of TYPOGRAPHIC_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  let out = '';
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x20 && code <= 0x7e) {
      out += char;
    } else if (code >= 0xa0 && code <= 0xff) {
      out += char;
    } else if (WINANSI_EXTRA.has(char)) {
      out += char;
    }
  }
  return out.replace(/[ \t]{2,}/g, ' ').trim();
}
