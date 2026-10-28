import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

/*
 * Locale data lives next to the English source:
 *   guides/.../layout-1/locales/<tag>.json   one guide's own prose
 *   labels/<surface>.json                    browser and OS strings, keyed by label id, then locale
 *
 * A label belongs to the surface that shows it (ios-share-sheet, chrome-desktop, ...), so every guide naming that
 * control shares one translation. A guide lists the surfaces whose controls appear in its own artwork as
 * `labelSurfaces` in catalog.json, and `{label:id}` and `data-i18n="label:id"` resolve against that list only.
 * A reused step resolves in its source guide's surfaces, because its text and panel were authored there.
 * The `document` surface holds the Markdown template strings and is available to every guide.
 */

export const DEFAULT_LOCALE = 'en';
/** Pseudo-locale for tests: accented, about 35% longer, bracketed, and generated from English. Never published. */
export const PSEUDO_LOCALE = 'en-XA';
const DATA_ATTRIBUTES = ['data-i18n', 'data-max-width', 'data-lines', 'data-line-height'];
const PLACEHOLDER = /\{label:([a-z0-9-]+)\}/g;
const ns = 'http://www.w3.org/2000/svg';

const escapePattern = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exists = async file => readFile(file, 'utf8').then(text => text, error => { if (error.code === 'ENOENT') return null; throw error; });

/** Locales the build publishes: complete ones only. Draft locales exist for tests and translators. */
export function publishedLocales(catalog) {
  return Object.entries(catalog.locales ?? {}).filter(([tag, status]) => tag !== DEFAULT_LOCALE && status === 'complete').map(([tag]) => tag);
}

export async function loadLabels(root) {
  const folder = path.join(root, 'labels');
  const labels = new Map();
  for (const name of (await readdir(folder)).filter(item => item.endsWith('.json')).sort()) {
    labels.set(name.slice(0, -'.json'.length), JSON.parse(await readFile(path.join(folder, name), 'utf8')));
  }
  return labels;
}

// --- Pseudo-localization ---------------------------------------------------------------------------------------

const ACCENTS = Object.fromEntries([...'abcdefghijklmnopqrstuvwxyz'].map((letter, index) => [letter, [...'åƀçðéƒĝĥîĵķļɱñöƥǫŕšţûṽŵẋýž'][index]])
  .flatMap(([letter, accented]) => [[letter, accented], [letter.toUpperCase(), accented.toUpperCase()]]));

function pseudoSegment(text) {
  const chars = [...text];
  const accented = chars.map(char => ACCENTS[char] ?? char);
  const vowels = chars.flatMap((char, index) => (/[aeiouAEIOU]/.test(char) ? [index] : []));
  const extra = Math.ceil(accented.filter(char => /\p{L}/u.test(char)).length * 0.35);
  if (!vowels.length) return accented.join('') + '~'.repeat(extra);
  // Stretch vowels: the extra letters are spread over the vowels, earlier ones taking the remainder.
  return accented.map((char, index) => {
    const slot = vowels.indexOf(index);
    return slot < 0 ? char : char + char.toLowerCase().repeat(Math.floor(extra / vowels.length) + (slot < extra % vowels.length ? 1 : 0));
  }).join('');
}

/** Accent, lengthen and bracket `text`, leaving `{label:x}` and `{step:n}` placeholders intact. */
export function pseudoLocalize(text) {
  return '[' + text.split(/(\{[^}]*\})/).map(part => (part.startsWith('{') ? part : pseudoSegment(part))).join('') + ']';
}

// --- Labels ----------------------------------------------------------------------------------------------------

/** Resolve label ids for one guide: `surfaces` are searched together, and an id found twice is an error. */
export function labelResolver(labels, surfaces, tag) {
  const index = new Map();
  for (const surface of surfaces) {
    const entries = labels.get(surface);
    if (!entries) throw new Error(`Unknown label surface: ${surface}`);
    for (const [id, entry] of Object.entries(entries)) {
      if (index.has(id)) throw new Error(`Label id ${id} is in both ${index.get(id).surface} and ${surface}`);
      index.set(id, { surface, entry });
    }
  }
  const get = id => {
    const found = index.get(id);
    if (!found) throw new Error(`Unknown label ${id} (surfaces: ${surfaces.join(', ')})`);
    if (tag === DEFAULT_LOCALE || found.entry[tag] !== undefined) return found.entry[tag];
    if (tag === PSEUDO_LOCALE) return pseudoLocalize(found.entry.en);
    throw new Error(`Label ${id} (${found.surface}) has no ${tag} text`);
  };
  const fill = text => text.replace(PLACEHOLDER, (_, id) => get(id));
  /** The substituted text of the first `{label:id}` in `text`: the control the sentence names. */
  const firstLabel = text => { const match = /\{label:([a-z0-9-]+)\}/.exec(text); return match ? get(match[1]) : undefined; };
  /** The id of the label whose English text is `english`, for building pseudo-locale files. */
  const idForEnglish = english => [...index].find(([, { entry }]) => entry.en === english)?.[0];
  return { get, fill, firstLabel, idForEnglish, has: id => index.has(id) };
}

// --- Interface strings -----------------------------------------------------------------------------------------

/**
 * The strings the React view and getIllustration draw around a guide, from the `ui` surface: headings, the alt-text
 * "Website:" sentence, and device, platform and browser names. Shaped as the `LocaleUI` type in src/core/types.ts.
 */
export function localeUI(labels, tag) {
  const { get } = labelResolver(labels, ['ui'], tag);
  const group = (prefix, names) => Object.fromEntries(names.map(name => [name, get(`${prefix}-${name}`)]));
  return {
    textInstructions: get('text-instructions'), illustratedGuide: get('illustrated-guide'), documentationDraft: get('documentation-draft'),
    heading: get('heading'), website: get('website'),
    devices: group('device', ['iphone', 'ipad', 'android', 'desktop-mac', 'desktop', 'unknown']),
    platforms: group('platform', ['ios', 'macos', 'android', 'windows', 'unknown']),
    browsers: group('browser', ['safari', 'chrome', 'brave', 'firefox', 'edge', 'opera', 'samsung', 'unknown']),
  };
}

// --- Guide prose -----------------------------------------------------------------------------------------------

const labelled = (english, uiLabel, resolver) => {
  const id = uiLabel && resolver.idForEnglish(uiLabel);
  if (uiLabel && !id) throw new Error(`No label for "${uiLabel}"`);
  return id ? english.replace(new RegExp(`(?<!\\w)${escapePattern(uiLabel)}(?!\\w)`), `{label:${id}}`) : english;
};

/** Derive an en-XA locale file from a guide's English source, naming labels by placeholder as a translator would. */
function pseudoLocale(data, resolver, document) {
  const locale = {
    title: pseudoLocalize(data.title), label: pseudoLocalize(data.label ?? data.title),
    steps: {}, completion: pseudoLocalize(data.completion.description), alt: pseudoLocalize(data.illustration.alt), transitions: {},
  };
  if (data.intro) locale.intro = pseudoLocalize(data.intro);
  for (const step of data.steps) {
    if (step.id) locale.steps[step.id] = { title: pseudoLocalize(labelled(step.title, step.uiLabel, resolver)),
      description: pseudoLocalize(labelled(step.description, step.uiLabel, resolver)) };
    if (step.transitionId) locale.transitions[step.transitionId] = pseudoLocalize(step.transitionBefore);
  }
  for (const node of Array.from(document.getElementsByTagName('*'))) {
    const key = (node.getAttribute('data-i18n') ?? '').match(/^guide:(\w+)$/)?.[1];
    if (key) locale[key] = pseudoLocalize(node.textContent);
  }
  return locale;
}

/** Load a guide's prose for `tag`. The caller resolves `{label:*}` and `{step:*}`; this checks the file is complete. */
export async function loadGuideLocale({ folder, data, tag, resolver, document }) {
  const text = await exists(path.join(folder, 'locales', `${tag}.json`));
  if (text === null && tag !== PSEUDO_LOCALE) throw new Error(`${data.id} has no ${tag} translation`);
  const locale = text === null ? pseudoLocale(data, resolver, document) : JSON.parse(text);
  const need = (value, name) => { if (typeof value !== 'string' || !value) throw new Error(`${data.id} ${tag}: missing ${name}`); };
  for (const name of ['title', 'label', 'completion', 'alt']) need(locale[name], name);
  if (data.intro) need(locale.intro, 'intro');
  for (const step of data.steps) {
    if (step.id) { need(locale.steps?.[step.id]?.title, `steps.${step.id}.title`); need(locale.steps[step.id].description, `steps.${step.id}.description`); }
    if (step.transitionBefore) need(locale.transitions?.[step.transitionId], `transitions.${step.transitionId}`);
  }
  return locale;
}

// --- Text fitting ----------------------------------------------------------------------------------------------

const CLASS_SIZES = { heading: 28, 'step-title': 23, label: 16, subtitle: 16, small: 14 };
const BOLD_CLASSES = ['heading', 'step-title'];
const fontOf = node => {
  const classes = (node.getAttribute('class') ?? '').split(/\s+/);
  const name = Object.keys(CLASS_SIZES).find(item => classes.includes(item));
  return { size: CLASS_SIZES[name] ?? 16, bold: BOLD_CLASSES.includes(name) };
};

/** Rough rendered width in user units: wide scripts take one em, narrow Latin glyphs about half. No font metrics here. */
export function estimateWidth(text, size, bold = false) {
  let em = 0;
  for (const char of text) {
    const code = char.codePointAt(0);
    em += code >= 0x2e80 ? 1 : char === ' ' ? 0.28 : /[il.,:;'|!]/.test(char) ? 0.27 : /\p{Lu}/u.test(char) ? 0.66 : 0.54;
  }
  return em * size * (bold ? 1.06 : 1);
}

/** Break at spaces, and between wide characters, which have none. Returns null when more than `lines` lines are needed. */
function wrap(tokens, size, bold, max, lines) {
  const result = [[]];
  let used = 0;
  for (const token of tokens) {
    const width = estimateWidth(token.text.trimEnd(), size, bold);
    if (used + width > max && result[result.length - 1].length) { result.push([]); used = 0; }
    result[result.length - 1].push(token);
    used += estimateWidth(token.text, size, bold);
  }
  return result.length <= lines && result.every(line => estimateWidth(line.map(item => item.text).join('').trimEnd(), size, bold) <= max) ? result : null;
}
const tokenize = segments => segments.flatMap(({ text, italic }) => text.split(/(?<=\s)|(?<=[⺀-￿])/).filter(Boolean).map(part => ({ text: part, italic })));

/**
 * Fill `node` with `segments` ([{text, italic}]). A line that would overflow `max` wraps onto up to `lines` lines, one
 * `<tspan>` per line; failing that it is squeezed with `textLength`, which is the fallback for any single line.
 */
export function fillText(doc, node, segments, { max, lines = 1, lineHeight = 0 } = {}) {
  const { size, bold } = fontOf(node);
  const plain = segments.map(item => item.text).join('');
  node.textContent = '';
  const append = (parent, items) => items.forEach(({ text, italic }) => {
    if (!italic) { parent.appendChild(doc.createTextNode(text)); return; }
    const span = doc.createElementNS(ns, 'tspan');
    span.setAttribute('font-style', 'italic');
    span.textContent = text;
    parent.appendChild(span);
  });
  if (!max || estimateWidth(plain, size, bold) <= max) { append(node, segments); return; }
  const wrapped = lines > 1 ? wrap(tokenize(segments), size, bold, max, lines) : null;
  if (wrapped) {
    wrapped.forEach((line, index) => {
      const span = doc.createElementNS(ns, 'tspan');
      span.setAttribute('x', node.getAttribute('x') ?? '0');
      span.setAttribute('dy', index ? String(lineHeight) : '0');
      append(span, line);
      node.appendChild(span);
    });
    return;
  }
  append(node, segments);
  node.setAttribute('textLength', String(max));
  node.setAttribute('lengthAdjust', 'spacingAndGlyphs');
}

// --- Document localization -------------------------------------------------------------------------------------

const CJK_FONTS = "'PingFang SC', 'Hiragino Sans', 'Yu Gothic UI', 'Microsoft YaHei UI', 'Malgun Gothic', 'Noto Sans CJK SC', 'Noto Sans', ";

/** Replace every `data-i18n` text in `doc` for `tag`, and mark the language and a CJK-capable font stack. */
export function localizeDocument(doc, { tag, resolver, locale, guideId }) {
  const svg = doc.documentElement;
  svg.setAttribute('lang', tag);
  svg.setAttribute('xml:lang', tag);
  for (const style of Array.from(doc.getElementsByTagName('style'))) {
    style.textContent = style.textContent.replace(/(font-family:\s*-apple-system[^;]*?)(sans-serif)/g, `$1${CJK_FONTS}$2`);
  }
  for (const node of Array.from(doc.getElementsByTagName('*'))) {
    const key = node.getAttribute('data-i18n');
    if (!key || key === 'step') continue;
    if (key === 'follow') { node.parentNode.removeChild(node); continue; }
    const [kind, name] = key.split(':');
    const text = kind === 'label' ? resolver.get(name) : locale[name];
    if (typeof text !== 'string') throw new Error(`${guideId} ${tag}: no text for ${key}`);
    fillText(doc, node, [{ text }], { max: Number(node.getAttribute('data-max-width')) || 0,
      lines: Number(node.getAttribute('data-lines')) || 1, lineHeight: Number(node.getAttribute('data-line-height')) || 0 });
  }
}

/** Check each tagged label's English text equals its dictionary entry, so the English build and the dictionary cannot drift. */
export function checkLabelTags(doc, resolver, guideId) {
  for (const node of Array.from(doc.getElementsByTagName('*'))) {
    const key = node.getAttribute('data-i18n') ?? '';
    if (!key.startsWith('label:') || node.hasAttribute('data-lines')) continue;
    if (resolver.get(key.slice('label:'.length)) !== node.textContent) throw new Error(`${guideId}: ${key} text "${node.textContent}" differs from the English label`);
  }
}

/** Remove the build-only attributes so the published SVG carries no localization markup. */
export function stripLocalization(doc) {
  for (const node of Array.from(doc.getElementsByTagName('*'))) for (const name of DATA_ATTRIBUTES) node.removeAttribute(name);
}
