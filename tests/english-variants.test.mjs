import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getIllustration, guides, selectGuide } from 'pwa-instructions';
import { InstallInstructions } from 'pwa-instructions/react';
import { composeGuides } from '../scripts/compose-guides.mjs';
import { localizedGuides } from '../scripts/emit-locales.mjs';
import { loadLabels, localeUI } from '../scripts/i18n.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8'));
// The locales/en module (which carries the en-US labels) and the en-XA test locale, composed in memory as the build would emit them.
const en = { guides: localizedGuides('en', catalog, await composeGuides(root, catalog)) };
const xa = { guides: localizedGuides('en-XA', catalog, await composeGuides(root, catalog, 'en-XA')), ui: localeUI(await loadLabels(root), 'en-XA') };
const localeData = { en, 'en-XA': xa };
const mac = 'macos-chrome-desktop-layout-1';
const GB = 'Cast, save and share';
const US = 'Cast, save, and share';
const bundled = id => guides.find(item => item.id === id);
const svgOf = illustration => decodeURIComponent(illustration.src.slice(illustration.src.indexOf(',') + 1));
const words = text => text.replace(/\s+/g, ' ').trim();
const nodes = (svg, selector) => Array.from(new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document.querySelectorAll(selector));
/** What the guide's artwork says: the label node's text and the step title that names the control. */
const drawn = (guide, label) => ({
  // A label can be drawn more than once (a menu and its dialog), always with the same text.
  label: [...new Set(nodes(svgOf(guide.illustration), `text[data-i18n="label:${label}"]`).map(node => words(node.textContent)))].join(' | '),
  titles: nodes(svgOf(guide.illustration), 'text[data-i18n="step"]').map(node => words(node.textContent)).filter(text => /Cast, save/.test(text)),
});

test('the US labels ship in the locales/en module, only for guides where they differ', () => {
  assert.equal(en.guides[mac].labels['en-US']['cast-save-and-share'], US);
  assert.equal(en.guides[mac].labels.en['cast-save-and-share'], GB);
  // The variant table is complete, so it can stand in for the page's labels.
  assert.deepEqual(Object.keys(en.guides[mac].labels['en-US']), Object.keys(en.guides[mac].labels.en));
  assert.equal(en.guides['macos-safari-desktop-layout-1'].labels['en-US'], undefined);
  assert.equal(en.guides['ios-safari-iphone-layout-1'].labels['en-US'].summarise, 'Summarize');
  assert.equal(en.guides['ios-chrome-iphone-layout-1'].labels['en-US']['add-to-bookmarks'], 'Add to Bookmarks');
});

for (const browserLocale of ['en-US', 'en_US', ' en-us ', ['en-US'], ['en-US', 'fr']]) {
  test(`browserLocale ${JSON.stringify(browserLocale)} shows the US label in the prose, uiLabel and artwork`, () => {
    const selection = selectGuide(null, { guideId: mac, browserLocale, localeData });
    assert.deepEqual(selection.locale, { requested: null, resolved: 'en', fallback: false, browser: { requested: 'en-US', resolved: 'en-US', fallback: false } });
    const guide = selection.guide;
    assert.equal(guide.language, 'en');
    assert.equal(guide.browserLanguage, 'en-US');
    const step = guide.steps.find(item => item.id === 'cast-save-and-share');
    assert.equal(step.uiLabel, US);
    assert.ok(step.title.includes(US) && step.description.includes(US));
    assert.ok(guide.text.includes(`**Choose *${US}*.**`) && !guide.text.includes(GB));
    const art = drawn(guide, 'cast-save-and-share');
    assert.equal(art.label, US);
    assert.equal(art.titles.length, 1);
    assert.ok(art.titles[0].includes(US) && !art.titles[0].includes(GB));
    // Everything that is not a US label is unchanged.
    assert.deepEqual(guide.steps.filter(item => item.id !== 'cast-save-and-share'), bundled(mac).steps.filter(item => item.id !== 'cast-save-and-share'));
    assert.equal(guide.title, bundled(mac).title);
  });
}

test('en-GB, en and no locale keep the British labels', () => {
  const english = bundled(mac);
  for (const options of [{ browserLocale: 'en-GB' }, { browserLocale: 'en' }, { browserLocale: 'en_GB' }, { locale: 'en-GB' }, { locale: 'en' }, {}]) {
    const { guide } = selectGuide(null, { guideId: mac, ...options, localeData });
    assert.deepEqual(guide, english, JSON.stringify(options));
    assert.ok(guide.steps.some(step => step.uiLabel === GB));
    assert.ok(svgOf(guide.illustration).includes(`>${GB}<`) && !svgOf(guide.illustration).includes(US));
  }
  assert.deepEqual(selectGuide(null, { guideId: mac, browserLocale: 'en-GB', localeData }).locale.browser, { requested: 'en-GB', resolved: 'en', fallback: false });
  // The call that never mentions a locale has no locale fields at all.
  assert.deepEqual(Object.keys(selectGuide(null, { guideId: mac })).sort(), ['environment', 'guide', 'match', 'reason', 'status']);
});

test('a page locale of en-US with no browserLocale gets the US labels, and en-GB does not', () => {
  const us = selectGuide(null, { guideId: mac, locale: 'en-US', localeData });
  assert.deepEqual(us.locale, { requested: 'en-US', resolved: 'en', fallback: false, browser: { requested: 'en-US', resolved: 'en-US', fallback: false } });
  assert.equal(us.guide.steps.find(item => item.id === 'cast-save-and-share').uiLabel, US);
  assert.equal(drawn(us.guide, 'cast-save-and-share').label, US);
  assert.ok(us.guide.text.includes(US));
  // A browserLocale still wins over the page's locale.
  const gb = selectGuide(null, { guideId: mac, locale: 'en-US', browserLocale: 'en-GB', localeData });
  assert.deepEqual(gb.guide, bundled(mac));
  assert.equal(selectGuide(null, { guideId: mac, locale: 'en-GB', localeData }).guide, bundled(mac));
  // Without the module the page is as it always was for a caller that passes en-US: no extra fields.
  const bare = selectGuide(null, { guideId: mac, locale: 'en-US' });
  assert.equal(bare.guide, bundled(mac));
  assert.deepEqual(bare.locale, { requested: 'en-US', resolved: 'en', fallback: false });
});

test('asking for en-US labels without the locales/en module is reported as a browser locale fallback', () => {
  const selection = selectGuide(null, { guideId: mac, browserLocale: 'en-US', localeData: { 'en-XA': xa } });
  assert.deepEqual(selection.locale.browser, { requested: 'en-US', resolved: 'en', fallback: true });
  assert.equal(selection.guide.browserLocaleFallback, true);
  assert.equal(selection.guide.steps.find(item => item.id === 'cast-save-and-share').uiLabel, GB);
});

test('a guide where nothing differs resolves en-US to the British labels without a fallback', () => {
  const id = 'macos-safari-desktop-layout-1';
  const selection = selectGuide(null, { guideId: id, browserLocale: 'en-US', localeData });
  assert.deepEqual(selection.guide, bundled(id));
  assert.deepEqual(selection.locale.browser, { requested: 'en-US', resolved: 'en', fallback: false });
});

test('other surfaces: Safari says Summarize and Chrome on iOS says Add to Bookmarks', () => {
  const safari = selectGuide(null, { guideId: 'ios-safari-iphone-layout-1', browserLocale: 'en-US', localeData }).guide;
  assert.equal(drawn(safari, 'summarise').label, 'Summarize');
  assert.ok(!svgOf(safari.illustration).includes('Summarise'));
  const chrome = selectGuide(null, { guideId: 'ios-chrome-iphone-layout-1', browserLocale: 'en-US', localeData }).guide;
  assert.equal(drawn(chrome, 'add-to-bookmarks').label, 'Add to Bookmarks');
  assert.equal(drawn(chrome, 'create-a-qr-code').label, 'Create a QR Code');
  assert.equal(drawn(chrome, 'request-desktop-site').label, 'Request Desktop Site');
  // Find in Page is the same in both, and the British artwork has the lower-case forms.
  assert.equal(drawn(chrome, 'find-in-page').label, 'Find in Page');
  assert.ok(svgOf(bundled('ios-chrome-iphone-layout-1').illustration).includes('>Add to bookmarks<'));
});

test('an en-XA page with an en-US browser has pseudo prose and US control names', () => {
  const selection = selectGuide(null, { guideId: mac, locale: 'en-XA', browserLocale: 'en-US', localeData });
  assert.deepEqual(selection.locale, { requested: 'en-XA', resolved: 'en-XA', fallback: false, browser: { requested: 'en-US', resolved: 'en-US', fallback: false } });
  const guide = selection.guide;
  assert.equal(guide.language, 'en-XA');
  assert.equal(guide.browserLanguage, 'en-US');
  assert.ok(guide.title.startsWith('[') && guide.completion.startsWith('['));
  const step = guide.steps.find(item => item.id === 'cast-save-and-share');
  assert.equal(step.uiLabel, US);
  assert.ok(step.title.startsWith('[') && step.title.includes(US));
  assert.equal(drawn(guide, 'cast-save-and-share').label, US);
  assert.ok(drawn(guide, 'cast-save-and-share').titles[0].includes(US));
  // A guide with no en-US table of its own gets the US labels from the en module just the same.
  assert.equal(drawn(selectGuide(null, { guideId: 'ios-safari-iphone-layout-1', locale: 'en-XA', browserLocale: 'en-US', localeData }).guide, 'summarise').label, 'Summarize');
});

test('getIllustration and React follow en-US too', () => {
  const art = getIllustration(bundled(mac), { siteUrl: 'https://crosswithyou.app/play', browserLocale: 'en-US', localeData });
  assert.equal(drawn({ illustration: art }, 'cast-save-and-share').label, US);
  assert.ok(svgOf(art).includes('>crosswithyou.app<'));
  assert.equal(getIllustration(bundled(mac), { browserLocale: 'en-GB', localeData }), bundled(mac).illustration);
  const section = options => new JSDOM(renderToStaticMarkup(h(InstallInstructions, { guideId: mac, localeData, presentation: 'text', ...options }))).window.document.querySelector('section');
  const controls = options => Array.from(section(options).querySelectorAll('em')).map(node => node.textContent);
  assert.ok(controls({ browserLocale: 'en-US' }).includes(US) && !controls({ browserLocale: 'en-US' }).includes(GB));
  assert.ok(controls({ locale: 'en-US' }).includes(US));
  assert.ok(controls({ locale: 'en-GB' }).includes(GB) && !controls({ locale: 'en-GB' }).includes(US));
  assert.ok(controls({}).includes(GB));
});
