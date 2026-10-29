import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { estimateWidth, fitText, fontOf as fontClass } from '../packages/pwa-instructions/src/core/fit.js';

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
/**
 * Label-only variants: a tag that overrides the labels whose text differs and inherits every other label (and all prose)
 * from its base. `en` is the British capture, so `en-US` lists only what a US browser shows differently. A variant is not
 * a catalog locale: it has no prose files, no status, and is never composed; the English build emits its label table.
 */
export const LABEL_VARIANTS = { 'en-US': DEFAULT_LOCALE };
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
    if (LABEL_VARIANTS[tag]) return found.entry[LABEL_VARIANTS[tag]];
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

export const labelled = (english, uiLabel, resolver) => {
  const id = uiLabel && resolver.idForEnglish(uiLabel);
  if (uiLabel && !id) throw new Error(`No label for "${uiLabel}"`);
  return id ? english.replace(new RegExp(`(?<!\\w)${escapePattern(uiLabel)}(?!\\w)`), `{label:${id}}`) : english;
};

/**
 * Derive a locale file from a guide's English source, naming labels by placeholder as a translator would. `transform`
 * maps each English string; the default builds en-XA, and tests pass another to make a fixture locale.
 */
export function pseudoLocale(data, resolver, document, transform = pseudoLocalize) {
  const locale = {
    title: transform(data.title), label: transform(data.label ?? data.title),
    steps: {}, completion: transform(data.completion.description), alt: transform(data.illustration.alt), transitions: {},
  };
  if (data.intro) locale.intro = transform(data.intro);
  for (const step of data.steps) {
    if (step.id) locale.steps[step.id] = { title: transform(labelled(step.title, step.uiLabel, resolver)),
      description: transform(labelled(step.description, step.uiLabel, resolver)) };
    if (step.transitionId) locale.transitions[step.transitionId] = transform(step.transitionBefore);
  }
  for (const node of Array.from(document.getElementsByTagName('*'))) {
    const key = (node.getAttribute('data-i18n') ?? '').match(/^guide:(\w+)$/)?.[1];
    if (key) locale[key] = transform(node.textContent);
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

// The measuring and wrapping decisions live in the package (src/core/fit.js), so the runtime label substitution makes the same ones.
export { estimateWidth };
export const fontOf = node => fontClass(node.getAttribute('class') ?? '');

/**
 * Fill `node` with `segments` ([{text, italic}]). A line that would overflow `max` wraps onto up to `lines` lines, one
 * `<tspan>` per line; failing that it is squeezed with `textLength`, which is the fallback for any single line.
 */
export function fillText(doc, node, segments, { max, lines = 1, lineHeight = 0 } = {}) {
  const fit = fitText(segments, { ...fontOf(node), max, lines });
  node.textContent = '';
  const append = (parent, items) => items.forEach(({ text, italic, label }) => {
    if (!italic) { parent.appendChild(doc.createTextNode(text)); return; }
    const span = doc.createElementNS(ns, 'tspan');
    span.setAttribute('font-style', 'italic');
    if (label) span.setAttribute('data-i18n', `label:${label}`);
    span.textContent = text;
    parent.appendChild(span);
  });
  if (fit.lines.length > 1) {
    fit.lines.forEach((line, index) => {
      const span = doc.createElementNS(ns, 'tspan');
      span.setAttribute('x', node.getAttribute('x') ?? '0');
      span.setAttribute('dy', index ? String(lineHeight) : '0');
      append(span, line);
      node.appendChild(span);
    });
    return;
  }
  append(node, fit.lines[0]);
  if (fit.squeeze) {
    node.setAttribute('textLength', String(max));
    node.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }
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

/**
 * Remove the build-only attributes so the published SVG carries no localization markup. `keepLabels` leaves them on the
 * `label:*` nodes and on the step titles that name a control, which is what the runtime needs to swap in the browser's control names (src/core/artwork.ts).
 */
export function stripLocalization(doc, { keepLabels = false } = {}) {
  for (const node of Array.from(doc.getElementsByTagName('*'))) {
    const key = node.getAttribute('data-i18n') ?? '';
    // A step title that names a control is kept whole: the runtime redraws it with the browser's label (artwork.ts).
    if (keepLabels && (key.startsWith('label:') || (key === 'step' && node.hasAttribute('data-max-width')))) continue;
    for (const name of DATA_ATTRIBUTES) node.removeAttribute(name);
  }
}

/** The label ids named by `{label:id}` placeholders in `texts` and by `label:*` tags in `doc`. */
export function usedLabelIds(texts, doc) {
  const ids = new Set();
  for (const text of texts) for (const [, id] of text.matchAll(PLACEHOLDER)) ids.add(id);
  for (const node of Array.from(doc.getElementsByTagName('*'))) {
    const key = node.getAttribute('data-i18n') ?? '';
    if (key.startsWith('label:')) ids.add(key.slice('label:'.length));
  }
  return [...ids].sort();
}
