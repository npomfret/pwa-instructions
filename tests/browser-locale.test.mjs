import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGuideLocales, getIllustration, guides, selectGuide } from 'pwa-instructions';
import { InstallGuideView, InstallInstructions } from 'pwa-instructions/react';
import { composeGuides } from '../scripts/compose-guides.mjs';
import { localizedGuides } from '../scripts/emit-locales.mjs';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { fillText, loadLabels, localeUI } from '../scripts/i18n.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8'));
// The pseudo-locale and the English module, composed in memory exactly as the build would emit them.
const xa = { guides: localizedGuides('en-XA', catalog, await composeGuides(root, catalog, 'en-XA')), ui: localeUI(await loadLabels(root), 'en-XA') };
const en = { guides: localizedGuides('en', catalog, await composeGuides(root, catalog)) };
const localeData = { 'en-XA': xa, en };
const id = 'ios-safari-iphone-layout-1';
const guide = guides.find(item => item.id === id);
const svgOf = illustration => decodeURIComponent(illustration.src.slice(illustration.src.indexOf(',') + 1));
/** The drawn text of each label node, by label id (wrapped lines joined). */
const drawn = svg => Object.fromEntries(Array.from(new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document.querySelectorAll('text[data-i18n^="label:"]'))
  .map(node => [node.getAttribute('data-i18n').slice('label:'.length), node.textContent.replace(/\s+/g, ' ').trim()]));
const { 'en-XA': pseudoLabels, en: englishLabels } = xa.guides[id].labels;
/** Every label node drawn says what `table` says, and there are some. */
const assertDrawn = (svg, table) => {
  const labels = drawn(svg);
  assert.ok(Object.keys(labels).length > 5);
  assert.deepEqual(labels, Object.fromEntries(Object.keys(labels).map(key => [key, table[key]])));
};

test('a page in en-XA with an English browser has pseudo prose and English controls', () => {
  const plain = selectGuide(null, { guideId: id, locale: 'en-XA', localeData });
  const selection = selectGuide(null, { guideId: id, locale: 'en-XA', browserLocale: 'en', localeData });
  assert.deepEqual(selection.locale, { requested: 'en-XA', resolved: 'en-XA', fallback: false, browser: { requested: 'en', resolved: 'en', fallback: false } });
  const result = selection.guide;
  assert.equal(result.language, 'en-XA');
  assert.equal(result.browserLanguage, 'en');
  assert.ok(result.title.startsWith('[') && result.completion.startsWith('[') && result.text.includes('[') && result.steps.every(step => step.title.startsWith('[')));
  assert.deepEqual(result.steps.map(step => step.uiLabel), guide.steps.map(step => step.uiLabel));
  for (const [index, step] of result.steps.entries()) {
    if (!step.uiLabel) { assert.equal(step.title, plain.guide.steps[index].title); continue; }
    assert.ok(step.title.includes(step.uiLabel), step.id);
    assert.ok(!step.title.includes(plain.guide.steps[index].uiLabel), step.id);
  }
  assert.ok(result.text.includes(`*${guide.steps.find(step => step.uiLabel).uiLabel}*`));
  // The artwork's label nodes say what English browsers show; the rest of it is still en-XA.
  const svg = svgOf(result.illustration);
  assert.ok(svg.includes('lang="en-XA"'));
  const labels = drawn(svg);
  assertDrawn(svg, englishLabels);
  assert.notDeepEqual(labels, drawn(svgOf(plain.guide.illustration)));
  assert.equal(result.illustration.alt, plain.guide.illustration.alt);
});

test('an English page with an en-XA browser has English prose and pseudo controls, from the locales/en data', () => {
  for (const locale of [{ locale: 'en' }, {}]) {
    const selection = selectGuide(null, { guideId: id, ...locale, browserLocale: 'en-XA', localeData });
    assert.deepEqual(selection.locale, { requested: locale.locale ?? null, resolved: 'en', fallback: false, browser: { requested: 'en-XA', resolved: 'en-XA', fallback: false } });
    const result = selection.guide;
    assert.equal(result.language, 'en');
    assert.equal(result.browserLanguage, 'en-XA');
    assert.equal(result.title, guide.title);
    assert.equal(result.completion, guide.completion);
    assert.equal(result.illustration.alt, guide.illustration.alt);
    for (const [index, step] of result.steps.entries()) {
      const english = guide.steps[index];
      if (!english.uiLabel) { assert.deepEqual(step, english); continue; }
      assert.equal(step.uiLabel, xa.guides[id].steps[index].uiLabel);
      assert.equal(step.title, english.title.replace(english.uiLabel, step.uiLabel));
    }
    assert.ok(result.steps.some(step => step.uiLabel?.startsWith('[')));
    assert.equal(result.text.split('\n')[0], `# ${guide.title}`);
    assertDrawn(svgOf(result.illustration), pseudoLabels);
    assert.ok(!svgOf(result.illustration).includes('lang="en-XA"'));
  }
  // Without the locales/en module an English page has no templates or tagged artwork, so it keeps its own controls.
  const missing = selectGuide(null, { guideId: id, browserLocale: 'en-XA', localeData: { 'en-XA': xa } });
  assert.deepEqual(missing.locale.browser, { requested: 'en-XA', resolved: 'en', fallback: true });
  assert.equal(missing.guide.browserLocaleFallback, true);
  assert.deepEqual(missing.guide.steps, guide.steps);
});

test('uiLabel and the React <em> follow the browser locale', () => {
  const section = options => new JSDOM(renderToStaticMarkup(h(InstallInstructions, { guideId: id, localeData, presentation: 'text', ...options }))).window.document.querySelector('section');
  const english = guide.steps.find(step => step.uiLabel).uiLabel;
  const pseudo = xa.guides[id].steps.find(step => step.uiLabel).uiLabel;
  const a = section({ locale: 'en-XA', browserLocale: 'en' });
  assert.equal(a.getAttribute('data-pwa-browser-locale'), 'en');
  assert.equal(a.getAttribute('data-pwa-locale'), 'en-XA');
  assert.equal(a.querySelector('em').textContent, english);
  assert.ok(a.querySelector('strong').textContent.startsWith('['));
  const b = section({ locale: 'en', browserLocale: 'en-XA' });
  assert.equal(b.getAttribute('data-pwa-browser-locale'), 'en-XA');
  assert.equal(b.querySelector('em').textContent, pseudo);
  assert.ok(!b.querySelector('strong').textContent.startsWith('['));
  // InstallGuideView localizes an English guide itself, with the same result.
  const view = new JSDOM(renderToStaticMarkup(h(InstallGuideView, { guide, localeData, browserLocale: 'en-XA', presentation: 'text' }))).window.document.querySelector('section');
  assert.equal(view.querySelector('em').textContent, pseudo);
  assert.equal(view.getAttribute('data-pwa-browser-locale'), 'en-XA');
  // The attribute appears only when the controls are in another locale than the text.
  for (const options of [{}, { locale: 'en-XA' }, { locale: 'en-XA', browserLocale: 'en-XA' }, { locale: 'en-XA', browserLocale: 'fr' }]) {
    assert.equal(section(options).hasAttribute('data-pwa-browser-locale'), false, JSON.stringify(options));
  }
});

test('a browser locale with no labels falls back to the page labels and says so', () => {
  const plain = selectGuide(null, { guideId: id, locale: 'en-XA', localeData });
  const selection = selectGuide(null, { guideId: id, locale: 'en-XA', browserLocale: 'fr-CA', localeData });
  assert.deepEqual(selection.locale.browser, { requested: 'fr-CA', resolved: 'en-XA', fallback: true });
  assert.equal(selection.guide.browserLocaleFallback, true);
  assert.equal(selection.guide.requestedBrowserLocale, 'fr-CA');
  assert.ok(!('browserLanguage' in selection.guide));
  assert.deepEqual({ ...selection.guide, browserLocaleFallback: undefined, requestedBrowserLocale: undefined }, { ...plain.guide, browserLocaleFallback: undefined, requestedBrowserLocale: undefined });
  const page = selectGuide(null, { guideId: id, locale: 'fr', browserLocale: 'fr', localeData });
  assert.deepEqual(page.locale, { requested: 'fr', resolved: 'en', fallback: true });
});

test('without browserLocale, or with the page locale, the output is unchanged', () => {
  for (const locale of [undefined, 'en', 'en-XA', ['fr', 'en-XA'], 'fr']) {
    const before = selectGuide(null, { guideId: id, locale, localeData });
    for (const browserLocale of [undefined, '', ' ']) assert.deepEqual(selectGuide(null, { guideId: id, locale, browserLocale, localeData }), before);
    const first = Array.isArray(locale) ? locale[0] : locale;
    assert.deepEqual(selectGuide(null, { guideId: id, locale, browserLocale: first, localeData }), before);
    assert.ok(!('browser' in (before.locale ?? {})));
  }
  assert.deepEqual(selectGuide(null, { guideId: id, browserLocale: 'en_xa'.replace('_xa', '') }), selectGuide(null, { guideId: id }));
  assert.deepEqual(selectGuide(null, { guideId: id, locale: 'en-XA', browserLocale: ' en_xa ', localeData }), selectGuide(null, { guideId: id, locale: 'en-XA', localeData }));
  assert.deepEqual(getIllustration(guide, { siteUrl: 'a.example', locale: 'en-XA', browserLocale: 'en-XA', localeData }), getIllustration(guide, { siteUrl: 'a.example', locale: 'en-XA', localeData }));
  assert.equal(getIllustration(guide, { browserLocale: 'en' }), guide.illustration);
  assert.deepEqual(getGuideLocales(guide, localeData), ['en', 'en-XA']);
});

test('getIllustration substitutes labels together with the site URL, without mutating the guide', () => {
  const before = JSON.stringify(guide);
  const a = getIllustration(guide, { siteUrl: 'https://crosswithyou.app/play', locale: 'en-XA', browserLocale: 'en', localeData });
  assert.equal(JSON.stringify(guide), before);
  const svgA = svgOf(a);
  assert.ok(svgA.includes('>crosswithyou.app<') && !svgA.includes('>example.com<') && svgA.includes('lang="en-XA"'));
  assertDrawn(svgA, englishLabels);
  assert.ok(a.alt.endsWith(xa.ui.website.replace('{host}', 'crosswithyou.app')));
  const b = getIllustration(guide, { siteUrl: 'crosswithyou.app', browserLocale: 'en-XA', localeData });
  assert.equal(JSON.stringify(guide), before);
  assertDrawn(svgOf(b), pseudoLabels);
  assert.ok(svgOf(b).includes('>crosswithyou.app<'));
  assert.equal(b.alt, `${guide.illustration.alt} Website: crosswithyou.app.`);
  // Without a site URL the substituted artwork is returned as is.
  assertDrawn(svgOf(getIllustration(guide, { browserLocale: 'en-XA', localeData })), pseudoLabels);
  // An already localized guide keeps its page language when only a browser locale is given.
  const localized = selectGuide(null, { guideId: id, locale: 'en-XA', localeData }).guide;
  const c = getIllustration(localized, { browserLocale: 'en', localeData });
  assertDrawn(svgOf(c), englishLabels);
  assert.equal(c.alt, localized.illustration.alt);
});

test('a long substituted label is fitted the way the build fits it', () => {
  const tagged = svg => Array.from(new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document.querySelectorAll('text[data-i18n^="label:"]'));
  // A guide whose artwork has both a one-line label with a width and a label that may take two lines.
  const fitId = Object.keys(en.guides).find(key => tagged(svgOf(en.guides[key].illustration)).some(node => node.getAttribute('data-lines') === '2'));
  const nodes = tagged(svgOf(en.guides[fitId].illustration));
  // A label id may be drawn more than once; take the first node of an id so the comparison below is with the node found by id.
  const firsts = new Set(nodes.map(node => node.getAttribute('data-i18n')).map(key => nodes.find(item => item.getAttribute('data-i18n') === key)));
  const single = nodes.find(node => firsts.has(node) && node.hasAttribute('data-max-width') && !node.hasAttribute('data-lines'));
  const double = nodes.find(node => node.getAttribute('data-lines') === '2');
  const [singleId, doubleId] = [single, double].map(node => node.getAttribute('data-i18n').slice('label:'.length));
  const labels = xa.guides[fitId].labels;
  const withLabels = table => ({ ...localeData, 'en-XA': { ...xa, guides: { ...xa.guides, [fitId]: { ...xa.guides[fitId], labels: { ...labels, 'en-XA': { ...labels['en-XA'], ...table } } } } } });
  const substituted = table => svgOf(selectGuide(null, { guideId: fitId, browserLocale: 'en-XA', localeData: withLabels(table) }).guide.illustration);
  const nodeOf = (svg, key) => tagged(svg).find(node => node.getAttribute('data-i18n') === `label:${key}`);
  const long = 'Un nombre de control extraordinariamente largo para este botón';
  const medium = 'Instalar y crear un acceso directo';
  const svg = substituted({ [singleId]: long, [doubleId]: medium });
  const squeezed = nodeOf(svg, singleId);
  assert.equal(squeezed.textContent, long);
  assert.equal(squeezed.getAttribute('textLength'), single.getAttribute('data-max-width'));
  assert.equal(squeezed.getAttribute('lengthAdjust'), 'spacingAndGlyphs');
  const wrapped = nodeOf(svg, doubleId);
  const lines = Array.from(wrapped.querySelectorAll('tspan'));
  assert.equal(lines.length, 2);
  assert.equal(lines.map(line => line.textContent).join(''), medium);
  assert.deepEqual(lines.map(line => line.getAttribute('dy')), ['0', double.getAttribute('data-line-height')]);
  assert.equal(lines[0].getAttribute('x'), double.getAttribute('x'));
  assert.equal(wrapped.hasAttribute('textLength'), false);
  // A short label needs no fitting, and substituting again clears the earlier fitting.
  const short = nodeOf(substituted({}), singleId);
  assert.equal(short.hasAttribute('textLength'), false);
  const squeezedGuide = selectGuide(null, { guideId: fitId, browserLocale: 'en-XA', localeData: withLabels({ [singleId]: long }) }).guide;
  assert.ok(nodeOf(svgOf(squeezedGuide.illustration), singleId).hasAttribute('textLength'));
  const redone = nodeOf(svgOf(getIllustration(squeezedGuide, { browserLocale: 'en-XA', localeData: withLabels({}) })), singleId);
  assert.equal(redone.hasAttribute('textLength'), false);
  assert.equal(redone.textContent, labels['en-XA'][singleId]);
  // Markup characters in a label are escaped.
  assert.equal(nodeOf(substituted({ [singleId]: 'A & <B>' }), singleId).textContent, 'A & <B>');
});

test('reused Brave artwork and steps follow the browser locale too', () => {
  const brave = 'ios-brave-iphone-layout-1';
  const result = selectGuide(null, { guideId: brave, locale: 'en-XA', browserLocale: 'en', localeData }).guide;
  const english = guides.find(item => item.id === brave);
  assert.deepEqual(result.steps.map(step => step.uiLabel), english.steps.map(step => step.uiLabel));
  assertDrawn(svgOf(result.illustration), xa.guides[brave].labels.en);
});

test('runtime substitution fits every label exactly as the build does', () => {
  const shape = svg => Array.from(new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document.querySelectorAll('text[data-i18n^="label:"]')).map(node => ({
    key: node.getAttribute('data-i18n'), text: node.textContent, textLength: node.getAttribute('textLength'), lengthAdjust: node.getAttribute('lengthAdjust'),
    lines: Array.from(node.querySelectorAll('tspan')).map(line => [line.getAttribute('x'), line.getAttribute('dy'), line.textContent]) }));
  for (const { id: guideId } of catalog.guides) {
    const built = shape(svgOf(xa.guides[guideId].illustration));
    const runtime = shape(svgOf(selectGuide(null, { guideId, browserLocale: 'en-XA', localeData }).guide.illustration));
    assert.ok(built.length > 0, guideId);
    assert.deepEqual(runtime, built, guideId);
  }
});

const words = text => text.replace(/\s+/g, ' ').trim();
/** Each step title that names a control, by step number: the drawn text, and the text of its italic control spans. */
const titles = svg => Object.fromEntries(Array.from(new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document.querySelectorAll('text[data-i18n="step"][data-max-width]'))
  .map(node => [Number(/step-(\d+)-title/.exec(node.id)[1]), { text: words(node.textContent),
    italic: words(Array.from(node.querySelectorAll('tspan[font-style="italic"]')).map(span => span.textContent).join('')),
    ids: [...new Set(Array.from(node.querySelectorAll('tspan[data-i18n]')).map(span => span.getAttribute('data-i18n')))] }]));

test('step titles in the artwork follow the browser locale, and the words around the control stay in the page language', () => {
  const english = xa.guides[id].labels.en;
  const pseudo = xa.guides[id].labels['en-XA'];
  const steps = guide.steps.map((step, index) => [index + 1, step]).filter(([, step]) => step.uiLabel);
  assert.ok(steps.length > 0);
  // The page is en-XA and the browser English: [Åböút...] words with the English control in the italic span.
  const a = selectGuide(null, { guideId: id, locale: 'en-XA', browserLocale: 'en', localeData }).guide;
  const plain = titles(svgOf(selectGuide(null, { guideId: id, locale: 'en-XA', localeData }).guide.illustration));
  const drawnA = titles(svgOf(a.illustration));
  assert.deepEqual(Object.keys(drawnA), Object.keys(plain));
  for (const [number, step] of steps) {
    assert.equal(drawnA[number].italic, step.uiLabel, `step ${number}`);
    assert.equal(drawnA[number].text, words(a.steps[number - 1].title), `step ${number}`);
    assert.ok(drawnA[number].text.startsWith('[') || drawnA[number].text.includes('['), `step ${number}`);
    assert.equal(drawnA[number].ids.length, 1);
    assert.ok(Object.values(english).includes(drawnA[number].italic));
    assert.notEqual(drawnA[number].italic, plain[number].italic);
  }
  // The page is English and the browser en-XA: English words around a pseudo-localized control.
  const b = selectGuide(null, { guideId: id, browserLocale: 'en-XA', localeData }).guide;
  const drawnB = titles(svgOf(b.illustration));
  for (const [number, step] of steps) {
    assert.equal(drawnB[number].italic, b.steps[number - 1].uiLabel, `step ${number}`);
    assert.ok(drawnB[number].italic.startsWith('['));
    assert.equal(drawnB[number].text, words(step.title.replace(step.uiLabel, b.steps[number - 1].uiLabel)), `step ${number}`);
    assert.ok(Object.values(pseudo).includes(drawnB[number].italic));
  }
  // Substituting again, or with the page's own locale, changes nothing.
  assert.equal(svgOf(getIllustration(a, { browserLocale: 'en', localeData })), svgOf(a.illustration));
  assert.equal(svgOf(getIllustration(b, { browserLocale: 'en-XA', localeData })), svgOf(b.illustration));
});

test('a long control name in a step title wraps or squeezes the way the build does', () => {
  const [stepId, template] = Object.entries(xa.guides[id].templates.steps).find(([, item]) => /\{label:/.test(item.title));
  const labelId = /\{label:([a-z0-9-]+)\}/.exec(template.title)[1];
  const number = xa.guides[id].steps.findIndex(item => item.id === stepId) + 1;
  // The English labels come from the locales/en module first.
  const withLabel = text => ({ ...localeData, en: { guides: { ...en.guides, [id]: { ...en.guides[id], labels: { en: { ...en.guides[id].labels.en, [labelId]: text } } } } } });
  const [before, after] = template.title.split(/\{label:[a-z0-9-]+\}/);
  const shape = svg => Array.from(new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document.querySelectorAll('text[data-i18n="step"][data-max-width]'))
    .filter(node => node.id === `step-${number}-title`).map(node => ({ textLength: node.getAttribute('textLength'), lengthAdjust: node.getAttribute('lengthAdjust'),
      lines: Array.from(node.querySelectorAll('tspan:not([font-style])')).map(line => [line.getAttribute('x'), line.getAttribute('dy')]),
      parts: Array.from(node.querySelectorAll('tspan[font-style]')).map(span => [span.getAttribute('data-i18n'), span.textContent]), text: node.textContent }));
  // What the build draws for the same title: fillText over a node with the title's own attributes.
  const built = (svg, label) => {
    const node = new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document.getElementById(`step-${number}-title`);
    const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg"><text id="t" class="${node.getAttribute('class')}" x="${node.getAttribute('x')}"/></svg>`, 'image/svg+xml');
    fillText(doc, doc.getElementById('t'), [{ text: before }, { text: label, italic: true, label: labelId }, { text: after }].filter(item => item.text),
      { max: Number(node.getAttribute('data-max-width')), lines: 2, lineHeight: Number(node.getAttribute('data-line-height')) });
    return new XMLSerializer().serializeToString(doc.documentElement);
  };
  const base = svgOf(selectGuide(null, { guideId: id, locale: 'en-XA', localeData }).guide.illustration);
  for (const label of ['Short', 'Abrir el menú de la página', 'Un nombre de control extraordinariamente largo para este botón', 'x'.repeat(80)]) {
    const runtime = svgOf(selectGuide(null, { guideId: id, locale: 'en-XA', browserLocale: 'en', localeData: withLabel(label) }).guide.illustration);
    const [drawnTitle] = shape(runtime);
    const [expected] = shape(built(base, label).replace('<svg ', '<svg id="s" ').replace('id="t"', `id="step-${number}-title" data-i18n="step" data-max-width="324"`));
    assert.equal(drawnTitle.text, expected.text, label);
    assert.deepEqual({ ...drawnTitle, parts: drawnTitle.parts.map(part => part[1]) }, { ...expected, parts: expected.parts.map(part => part[1]) }, label);
    assert.ok(drawnTitle.parts.every(part => part[0] === `label:${labelId}`));
  }
  // The long ones really did wrap or squeeze.
  const wrapped = shape(svgOf(selectGuide(null, { guideId: id, locale: 'en-XA', browserLocale: 'en', localeData: withLabel('Abrir el menú de la página') }).guide.illustration))[0];
  assert.equal(wrapped.lines.length, 2);
  const long = shape(svgOf(selectGuide(null, { guideId: id, locale: 'en-XA', browserLocale: 'en', localeData: withLabel('x'.repeat(80)) }).guide.illustration))[0];
  assert.equal(long.textLength, '324');
});
