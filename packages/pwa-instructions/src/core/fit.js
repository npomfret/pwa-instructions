// Text fitting for SVG labels, shared by the build (scripts/i18n.mjs fills nodes through a DOM) and the runtime
// (artwork.ts fills tagged nodes in an SVG string). Both call fitText, so they cannot disagree about when a line wraps
// or is squeezed. Pure functions with no DOM and no font metrics.

/** @typedef {{ text: string, italic?: boolean }} Segment */

const CLASS_SIZES = { heading: 28, "step-title": 23, label: 16, subtitle: 16, small: 14 };
const BOLD_CLASSES = ["heading", "step-title"];

/**
 * Font size and weight for a `class` attribute. A panel reused in another guide has its classes prefixed
 * `shared-<guide>-`, so the base name is also matched at the end of a prefixed class.
 * @param {string} className
 * @returns {{ size: number, bold: boolean }}
 */
export function fontOf(className) {
  const classes = className.split(/\s+/);
  const name = Object.keys(CLASS_SIZES).find(item => classes.some(value => value === item || (value.startsWith("shared-") && value.endsWith(`-${item}`))));
  return { size: name ? CLASS_SIZES[name] : 16, bold: name !== undefined && BOLD_CLASSES.includes(name) };
}

/**
 * Rough rendered width in user units: wide scripts take one em, narrow Latin glyphs about half.
 * @param {string} text
 * @param {number} size
 * @param {boolean} [bold]
 */
export function estimateWidth(text, size, bold = false) {
  let em = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    em += code >= 0x2e80 ? 1 : char === " " ? 0.28 : /[il.,:;'|!]/.test(char) ? 0.27 : /\p{Lu}/u.test(char) ? 0.66 : 0.54;
  }
  return em * size * (bold ? 1.06 : 1);
}

/**
 * Break at spaces, and between wide characters, which have none. Returns null when more than `lines` lines are needed.
 * @param {Segment[]} tokens
 * @param {number} size
 * @param {boolean} bold
 * @param {number} max
 * @param {number} lines
 * @returns {Segment[][] | null}
 */
function wrap(tokens, size, bold, max, lines) {
  /** @type {Segment[][]} */
  const result = [[]];
  let used = 0;
  for (const token of tokens) {
    const width = estimateWidth(token.text.trimEnd(), size, bold);
    if (used + width > max && result[result.length - 1].length) { result.push([]); used = 0; }
    result[result.length - 1].push(token);
    used += estimateWidth(token.text, size, bold);
  }
  return result.length <= lines && result.every(line => estimateWidth(line.map(item => item.text).join("").trimEnd(), size, bold) <= max) ? result : null;
}

/** @param {Segment[]} segments */
const tokenize = segments => segments.flatMap(({ text, italic }) => text.split(/(?<=\s)|(?<=[⺀-￿])/).filter(Boolean).map(part => ({ text: part, italic })));

/**
 * Decide how `segments` sit in `max` user units: unchanged when they fit, wrapped onto up to `lines` lines when they do
 * not, else on one line to be squeezed with `textLength`, which is the fallback for any single line.
 * @param {Segment[]} segments
 * @param {{ size: number, bold: boolean, max?: number, lines?: number }} options
 * @returns {{ lines: Segment[][], squeeze: boolean }}
 */
export function fitText(segments, { size, bold, max = 0, lines = 1 }) {
  if (!max || estimateWidth(segments.map(item => item.text).join(""), size, bold) <= max) return { lines: [segments], squeeze: false };
  const wrapped = lines > 1 ? wrap(tokenize(segments), size, bold, max, lines) : null;
  return wrapped ? { lines: wrapped, squeeze: false } : { lines: [segments], squeeze: true };
}
