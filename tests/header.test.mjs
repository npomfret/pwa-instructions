import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getIllustration, guides, selectGuide } from 'pwa-instructions';
import { InstallGuideView, InstallInstructions } from 'pwa-instructions/react';
import { composeGuides } from '../scripts/compose-guides.mjs';
import { localizedGuides } from '../scripts/emit-locales.mjs';
import { loadLabels, localeUI } from '../scripts/i18n.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8'));
const en = { guides: localizedGuides('en', catalog, await composeGuides(root, catalog)) };
const xa = { guides: localizedGuides('en-XA', catalog, await composeGuides(root, catalog, 'en-XA')), ui: localeUI(await loadLabels(root), 'en-XA') };
const localeData = { en, 'en-XA': xa };
const svgOf = illustration => decodeURIComponent(illustration.src.slice(illustration.src.indexOf(',') + 1));
const doc = svg => new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document;
const words = text => text.replace(/\s+/g, ' ').trim();
const header = svg => Array.from(doc(svg).querySelectorAll('.heading, .subtitle')).map(node => words(node.textContent));
const box = svg => /viewBox="([^"]+)"/.exec(svg)[1].split(' ').map(Number);
// What 0.1.0 drew: the viewBox size, and the heading and subtitle at its top.
const ORIGINAL = {
  'android-chrome-android-layout-1': [400, 1570, 'Install app', 'Android · Chrome'],
  'ios-brave-iphone-layout-1': [400, 3600, 'Add to Home Screen', 'iPhone · Brave → Safari'],
  'ios-chrome-iphone-layout-1': [400, 1570, 'Add to Home Screen', 'iPhone · Chrome'],
  'ios-safari-iphone-layout-1': [400, 2060, 'Add to Home Screen', 'iPhone · Safari'],
  'macos-chrome-desktop-layout-1': [600, 2740, 'Install app', 'Mac · Chrome'],
  'macos-safari-desktop-layout-1': [600, 1320, 'Add to Dock', 'Mac · Safari'],
  'windows-chrome-desktop-layout-1': [600, 1860, 'Install app', 'Windows · Chrome'],
  'windows-edge-desktop-layout-1': [600, 2300, 'Install app', 'Windows · Edge'],
};

test('the default SVG has no heading or subtitle and its viewBox is closed up', () => {
  for (const guide of guides) {
    const svg = svgOf(guide.illustration);
    assert.deepEqual(header(svg), [], guide.id);
    assert.ok(!svg.includes('class="heading"') && !svg.includes('class="subtitle"'));
    const [x, y, width, height] = box(svg);
    assert.deepEqual([x, y], [0, 72]);
    // Step 1 starts at y=100, so 28 units of margin remain above it, as at the sides.
    assert.match(svg, /<g id="step-1" transform="translate\(28 100\)"/);
    assert.equal(guide.illustration.width, width);
    assert.equal(guide.illustration.height, height);
    assert.equal(Number(/<svg[^>]* height="(\d+)"/.exec(svg)[1]), height);
    // The header band was the top 72 units of the original viewBox, which started at y=0.
    assert.deepEqual([width, height + 72], ORIGINAL[guide.id].slice(0, 2));
  }
});

test('the English publication has no header either: install.svg and instructions.md', async () => {
  for (const entry of catalog.guides) {
    const folder = path.dirname(path.join(root, entry.path));
    assert.deepEqual(header(await readFile(path.join(folder, 'install.svg'), 'utf8')), []);
    const md = await readFile(path.join(folder, 'instructions.md'), 'utf8');
    assert.ok(md.endsWith('\n') && !md.endsWith('\n\n'));
    const last = md.trimEnd().split('\n').pop();
    assert.match(last, /^\d+\. \*\*/);
    assert.ok(!md.includes('Illustration:') && !md.includes('metadata.json'));
    const data = JSON.parse(await readFile(path.join(root, entry.path), 'utf8'));
    assert.ok(!md.includes(data.completion.description));
  }
});

test('getIllustration with header: true restores the localized header and the original viewBox', () => {
  for (const guide of guides) {
    const plain = getIllustration(guide);
    assert.equal(plain, guide.illustration);
    const shown = getIllustration(guide, { header: true });
    const [width, height, heading, subtitle] = ORIGINAL[guide.id];
    assert.deepEqual(box(svgOf(shown)), [0, 0, width, height]);
    assert.equal(shown.height, height);
    assert.equal(shown.width, guide.illustration.width);
    assert.equal(Number(/<svg[^>]* height="(\d+)"/.exec(svgOf(shown))[1]), shown.height);
    assert.deepEqual(header(svgOf(shown)), [heading, subtitle]);
    assert.equal(guide.illustration.src, plain.src, 'the shared guide is not changed');
  }
});

test('the header follows the guide language, with a site URL and with a browser locale', () => {
  const id = 'ios-safari-iphone-layout-1';
  const guide = guides.find(item => item.id === id);
  const shown = getIllustration(guide, { header: true, locale: 'en-XA', localeData });
  const texts = header(svgOf(shown));
  assert.equal(texts.length, 2);
  assert.ok(texts.every(text => text.startsWith('[')));
  assert.equal(box(svgOf(shown))[1], 0);
  assert.deepEqual(header(svgOf(getIllustration(guide, { locale: 'en-XA', localeData }))), []);
  // An English page with pseudo browser labels keeps the English header, and the labels still swap.
  const browser = getIllustration(guide, { header: true, browserLocale: 'en-XA', localeData });
  assert.deepEqual(header(svgOf(browser)), header(svgOf(getIllustration(guide, { header: true }))));
  assert.ok(doc(svgOf(browser)).querySelector('text[data-i18n^="label:"]').textContent.startsWith('['));
  const without = getIllustration(guide, { browserLocale: 'en-XA', localeData });
  assert.ok(doc(svgOf(without)).querySelector('text[data-i18n^="label:"]').textContent.startsWith('['));
  assert.deepEqual(header(svgOf(without)), []);
  // Both options together.
  const both = getIllustration(guide, { header: true, siteUrl: 'crosswithyou.app' });
  assert.ok(svgOf(both).includes('>crosswithyou.app<') && header(svgOf(both)).length === 2);
  assert.ok(both.alt.endsWith('Website: crosswithyou.app.'));
});

test('a guide with no header markup, or an external image, is left as it is', () => {
  const guide = guides[0];
  const { header: _header, ...bare } = guide.illustration;
  assert.equal(getIllustration({ ...guide, illustration: bare }, { header: true }), bare);
  const external = { ...guide, illustration: { ...guide.illustration, src: '/my-guide.svg' } };
  assert.equal(getIllustration(external, { header: true }), external.illustration);
});

test('selectGuide data identifies documentation-only guides without a heading', () => {
  const drafts = guides.filter(guide => guide.versions.documentationOnly);
  assert.ok(drafts.length >= 2);
  for (const guide of drafts) assert.equal(selectGuide({ platform: guide.platform, browser: guide.browser, device: guide.device, osMajor: null, browserMajor: null, standalone: false }).match, 'documentation');
});

test('React: illustrationHeader defaults to false and restores the header with the original size', async () => {
  for (const Component of [InstallGuideView, InstallInstructions]) {
    const id = 'macos-safari-desktop-layout-1';
    const props = Component === InstallGuideView ? { guide: guides.find(item => item.id === id) } : { guideId: id };
    const image = html => new JSDOM(html).window.document.querySelector('img');
    const decoded = img => decodeURIComponent(img.getAttribute('src').slice(img.getAttribute('src').indexOf(',') + 1));
    const off = image(renderToStaticMarkup(h(Component, props)));
    assert.deepEqual(header(decoded(off)), []);
    assert.equal(off.getAttribute('height'), '1248');
    const on = image(renderToStaticMarkup(h(Component, { ...props, illustrationHeader: true })));
    assert.deepEqual(header(decoded(on)), ['Add to Dock', 'Mac · Safari']);
    assert.equal(on.getAttribute('height'), '1320');
    assert.deepEqual(box(decoded(on)), [0, 0, 600, 1320]);
    const localized = image(renderToStaticMarkup(h(Component, { ...props, illustrationHeader: true, locale: 'en-XA', localeData })));
    assert.ok(header(decoded(localized)).every(text => text.startsWith('[')));
    const browser = image(renderToStaticMarkup(h(Component, { ...props, illustrationHeader: true, browserLocale: 'en-XA', localeData })));
    assert.deepEqual(header(decoded(browser)), ['Add to Dock', 'Mac · Safari']);
  }
});
