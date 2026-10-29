import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser } from '@xmldom/xmldom';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { composeGuides } from '../scripts/compose-guides.mjs';
import { loadLabels, pseudoLocalize } from '../scripts/i18n.mjs';
import { writeLocaleOutputs } from '../scripts/emit-locales.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8'));
const english = await composeGuides(root, catalog);
const pseudo = await composeGuides(root, catalog, 'en-XA');
const labels = await loadLabels(root);
const parse = svg => new DOMParser().parseFromString(svg, 'image/svg+xml');
// Text that is deliberately never translated: step numbers, the placeholder domain and clock, and the Safari app-menu name.
const untranslated = /^(\d+|example\.com|9:41|Safari)$/;

test('en-XA is a test-only pseudo-locale, not a catalog locale, and composes every guide', () => {
  assert.ok(Array.isArray(catalog.locales) && !catalog.locales.includes('en-XA'));
  assert.equal(pseudo.size, catalog.guides.length);
  for (const { id } of catalog.guides) {
    const guide = pseudo.get(id);
    assert.equal(guide.steps.length, english.get(id).steps.length, id);
    assert.ok(guide.localized.title.startsWith('['), id);
    assert.ok(guide.steps.every(step => step.title.startsWith('[') && step.description.startsWith('[')), id);
    assert.ok(guide.steps.every(step => !step.uiLabel || step.title.includes(step.uiLabel)), `${id} uiLabel is in the title`);
    assert.equal((guide.text.match(/^\d+\. /gm) ?? []).length, guide.steps.length, id);
  }
});

test('pseudo-localization lengthens text by about 35% and keeps placeholders', () => {
  const text = 'Tap {label:share} in the bottom toolbar, then go to step {step:3}.';
  const result = pseudoLocalize(text);
  assert.ok(result.includes('{label:share}') && result.includes('{step:3}'));
  const ratio = result.replace(/\{[^}]*\}/g, '').length / text.replace(/\{[^}]*\}/g, '').length;
  assert.ok(ratio > 1.3 && ratio < 1.6, String(ratio));
});

test('a locale with no translation files is rejected', async () => {
  await assert.rejects(composeGuides(root, catalog, 'af'), /no af translation/);
});

test('reused Brave steps take Safari\'s en-XA text, renumbered', () => {
  const safari = pseudo.get('ios-safari-iphone-layout-1').steps;
  const brave = pseudo.get('ios-brave-iphone-layout-1').steps;
  assert.deepEqual(brave.slice(3).map(step => step.title), safari.map(step => step.title));
  assert.deepEqual(brave.slice(3).map(step => step.uiLabel), safari.map(step => step.uiLabel));
  // Safari's step 3 points at step 4; four steps later in Brave it points at step 7.
  assert.equal(brave[5].description, safari[2].description.replace(/\b4\b/, '7'));
  assert.ok(!brave.some(step => /\{step:\d+\}/.test(step.description)));
  assert.match(pseudo.get('ios-brave-iphone-layout-1').text, /Šţ[ée]+ƥ 3 .*4–7/);
});

test('the Brave en-XA SVG has the localized transition heading and no English one', () => {
  const svg = pseudo.get('ios-brave-iphone-layout-1').svg;
  assert.ok(svg.includes(pseudoLocalize('Continue in Safari')));
  assert.ok(!svg.includes('Continue in Safari'));
  assert.ok(english.get('ios-brave-iphone-layout-1').svg.includes('Continue in Safari'));
});

test('localized SVGs parse, keep unique ids and declare their language', () => {
  for (const { id } of catalog.guides) {
    const doc = parse(pseudo.get(id).svg);
    assert.equal(doc.documentElement.getAttribute('lang'), 'en-XA', id);
    assert.equal(doc.documentElement.getAttribute('xml:lang'), 'en-XA', id);
    const ids = Array.from(doc.getElementsByTagName('*')).filter(node => node.hasAttribute('id')).map(node => node.getAttribute('id'));
    assert.equal(new Set(ids).size, ids.length, id);
    assert.equal(doc.getElementsByTagName('parsererror').length, 0, id);
    assert.ok(/'Noto Sans CJK SC'/.test(pseudo.get(id).svg), `${id} has CJK font fallbacks`);
    assert.ok(!/lang=/.test(english.get(id).svg), `${id} English has no lang attribute`);
  }
});

test('no untagged English text remains in a localized SVG', () => {
  for (const { id } of catalog.guides) {
    const doc = parse(pseudo.get(id).svg);
    const nodes = ['text', 'title', 'desc'].flatMap(name => Array.from(doc.getElementsByTagName(name)));
    assert.ok(nodes.length > 10, id);
    for (const node of nodes) {
      const text = node.textContent.trim();
      assert.ok(text.startsWith('[') || untranslated.test(text), `${id}: untranslated "${text}"`);
    }
  }
});

test('long text wraps, squeezes or wraps onto two lines instead of overflowing', () => {
  const android = parse(pseudo.get('android-chrome-android-layout-1').svg);
  const texts = Array.from(android.getElementsByTagName('text'));
  const squeezed = node => node.getAttribute('textLength') && node.getAttribute('lengthAdjust') === 'spacingAndGlyphs';
  assert.ok([...pseudo.values()].some(guide => Array.from(parse(guide.svg).getElementsByTagName('text')).some(squeezed)));
  const wrapped = texts.find(node => node.getElementsByTagName('tspan').length && node.getAttribute('class') === 'label');
  assert.equal(Array.from(wrapped.childNodes).filter(node => node.nodeType === 1).length, 2);
  assert.ok(texts.some(node => node.getAttribute('class') === 'step-title' && Array.from(node.getElementsByTagName('tspan')).some(span => span.getAttribute('dy') === '26')));
});

test('English output carries no localization markup, which stays in the working document', () => {
  for (const { id } of catalog.guides) assert.ok(!/data-(i18n|max-width|lines|line-height)/.test(english.get(id).svg), id);
  // Panels imported into Brave keep their tags through id and class scoping, so they could still be localized there.
  const imported = Array.from(english.get('ios-brave-iphone-layout-1').document.getElementsByTagName('*'))
    .filter(node => node.hasAttribute('data-i18n') && /shared-ios-safari-iphone-layout-1-/.test(node.getAttribute('class') ?? ''));
  assert.ok(imported.length > 5);
});

test('the catalog locales are published and the pseudo-locale is not', async () => {
  assert.deepEqual(catalog.locales, ['es', 'fr', 'de', 'pt-BR', 'it', 'ja', 'ko', 'zh-Hans', 'nl', 'pl', 'sv', 'da', 'nb', 'fi', 'ru', 'uk', 'tr', 'cs', 'sk', 'hu', 'ro', 'hr', 'el', 'pt-PT', 'es-419', 'fr-CA', 'zh-Hant', 'zh-HK', 'id', 'ms', 'th', 'vi', 'hi', 'ca', 'he', 'ar', 'bg', 'sl']);
  const temporary = await mkdtemp(path.join(tmpdir(), 'pwa-instructions-locales-'));
  try {
    // Only what the build passes in is written; with no locale passed, nothing is.
    await writeLocaleOutputs({ catalog, locales: new Map(), generated: path.join(temporary, 'generated'), assets: path.join(temporary, 'assets'), labels });
    await assert.rejects(readdir(path.join(temporary, 'assets')), { code: 'ENOENT' });
    // A locale passed in gets a module and per-guide assets.
    await writeLocaleOutputs({ catalog, locales: new Map([['en-XA', pseudo]]), generated: path.join(temporary, 'generated'), assets: path.join(temporary, 'assets'), labels });
    const source = await readFile(path.join(temporary, 'generated/locales/en-XA.ts'), 'utf8');
    assert.ok(source.includes('"ios-brave-iphone-layout-1"') && source.includes('data:image/svg+xml'));
    assert.ok((await readdir(path.join(temporary, 'assets/ios-brave-iphone-layout-1/en-XA'))).includes('install.svg'));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  // The built package has no trace of the pseudo-locale.
  const dist = path.join(root, 'packages/pwa-instructions/dist');
  for (const { id } of catalog.guides) assert.deepEqual((await readdir(path.join(dist, 'assets', id))).filter(name => /^en-XA$/i.test(name)), [], id);
  // The opt-in English module and one module per catalog locale ship; English has no per-guide assets.
  assert.deepEqual((await readdir(path.join(dist, 'core/generated/locales'))).sort(),
    ['en', ...catalog.locales].sort().flatMap(tag => [`${tag}.d.ts`, `${tag}.js`]).sort());
  for (const tag of catalog.locales) for (const { id } of catalog.guides) assert.deepEqual((await readdir(path.join(dist, 'assets', id, tag))).sort(), ['install.svg', 'instructions.md'], `${id} ${tag}`);
});

test('Hebrew and Arabic text runs right to left in artwork that is not mirrored', async () => {
  const { fitMarkup, rtlAnchor } = await import('../packages/pwa-instructions/src/core/fit.js');
  assert.deepEqual(['start', 'end', 'middle', undefined].map(rtlAnchor), ['end', 'start', 'middle', 'end']);
  for (const tag of ['he', 'ar']) {
    const composed = await composeGuides(root, catalog, tag);
    for (const [id, guide] of composed) {
      const all = Array.from(parse(guide.svg).getElementsByTagName('text'));
      const texts = all.filter(node => /[֐-ۿ]/.test(node.textContent));
      assert.ok(texts.length > 5, `${tag} ${id}`);
      for (const node of texts) {
        assert.equal(node.getAttribute('direction'), 'rtl', `${tag} ${id}: ${node.textContent}`);
        // Left-aligned text keeps its x with `end`; centered text stays centered. Nothing is mirrored.
        assert.ok(['end', 'middle'].includes(node.getAttribute('text-anchor')), `${tag} ${id}: ${node.textContent}`);
      }
      // Digits, the domain and the clock stay as drawn.
      for (const node of all.filter(item => untranslated.test(item.textContent.trim()))) assert.equal(node.getAttribute('direction'), null);
    }
  }
  for (const guide of english.values()) assert.ok(!/direction=/.test(guide.svg));
  // A wrapped label with data-center-lines is lifted by half its extra height, so it stays centered on the one-line baseline.
  const fit = { lines: [[{ text: 'a' }], [{ text: 'b' }]] };
  const options = { x: '10', lineHeight: 12, escape: text => text };
  assert.ok(fitMarkup(fit, { ...options, center: true }).startsWith('<tspan x="10" dy="-6">'));
  assert.ok(fitMarkup(fit, options).startsWith('<tspan x="10" dy="0">'));
});
