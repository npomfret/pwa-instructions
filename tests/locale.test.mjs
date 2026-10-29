import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectEnvironment, detectUILocale, getGuideLocales, getIllustration, getLocaleUI, guides, registerLocale, resolveLocale, selectGuide } from 'pwa-instructions';
import { InstallGuideView, InstallInstructions } from 'pwa-instructions/react';
import { composeGuides } from '../scripts/compose-guides.mjs';
import { localizedGuides } from '../scripts/emit-locales.mjs';
import { loadLabels, localeUI } from '../scripts/i18n.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8'));
const pseudo = await composeGuides(root, catalog, 'en-XA');
// The test locale, composed in memory exactly as the build would emit it. It is never registered by the package.
const xa = { guides: localizedGuides('en-XA', catalog, pseudo), ui: localeUI(await loadLabels(root), 'en-XA') };
const localeData = { 'en-XA': xa };
const id = 'ios-safari-iphone-layout-1';
const guide = guides.find(item => item.id === id);
const iphone = detectEnvironment({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Version/27.0 Mobile/15E148 Safari/604.1' });

test('no-locale selection is exactly the 0.1.0 result: same keys, same guide object', () => {
  for (const item of guides) {
    for (const options of [{ guideId: item.id }, { guideId: item.id, locale: undefined, browserLocale: undefined, localeData: undefined }]) {
      const selection = selectGuide(null, options);
      assert.deepEqual(Object.keys(selection).sort(), ['environment', 'guide', 'match', 'reason', 'status']);
      assert.deepEqual(selection, { status: 'matched', reason: 'Guide chosen explicitly.', guide: item, match: 'manual', environment: null });
      assert.equal(selection.guide, item);
    }
  }
  const detected = selectGuide(iphone);
  assert.deepEqual(Object.keys(detected).sort(), ['environment', 'guide', 'match', 'reason', 'status']);
  assert.equal(detected.guide, guide);
  assert.deepEqual(Object.keys(selectGuide(null)).sort(), ['environment', 'guide', 'match', 'reason', 'status']);
  assert.ok(!('localeFallback' in guide) && !('requestedLocale' in guide));
});

test('no-locale getIllustration matches 0.1.0', () => {
  assert.equal(getIllustration(guide), guide.illustration);
  const customized = getIllustration(guide, { siteUrl: 'https://crosswithyou.app/play' });
  assert.equal(customized.alt, `${guide.illustration.alt} Website: crosswithyou.app.`);
  assert.deepEqual(Object.keys(customized), Object.keys(guide.illustration));
  // Naming English explicitly changes nothing either.
  assert.deepEqual(getIllustration(guide, { siteUrl: 'crosswithyou.app', locale: 'en' }), getIllustration(guide, { siteUrl: 'crosswithyou.app' }));
});

test('the English interface strings in labels/ui.json match the built-in defaults', async () => {
  const english = localeUI(await loadLabels(root), 'en');
  assert.deepEqual(english, getLocaleUI('en'));
  assert.deepEqual(english, getLocaleUI());
});

test('resolveLocale canonicalizes, trims and falls back from region to language to en', () => {
  const available = ['pt', 'es', 'zh-Hans', 'zh-Hant', 'en-XA'];
  assert.deepEqual(resolveLocale('pt-BR', available), { requested: 'pt-BR', resolved: 'pt', fallback: false });
  assert.deepEqual(resolveLocale(' ES_es ', available), { requested: 'es-ES', resolved: 'es', fallback: false });
  assert.deepEqual(resolveLocale('pt-br', ['pt-BR']), { requested: 'pt-BR', resolved: 'pt-BR', fallback: false });
  assert.deepEqual(resolveLocale('fr-CA', available), { requested: 'fr-CA', resolved: 'en', fallback: true });
  assert.deepEqual(resolveLocale('en-GB', available), { requested: 'en-GB', resolved: 'en', fallback: false });
  assert.deepEqual(resolveLocale('en-XA', available), { requested: 'en-XA', resolved: 'en-XA', fallback: false });
  // Norwegian reported as the macrolanguage `no` gets the Bokmål data.
  assert.deepEqual(resolveLocale('no', ['nb']), { requested: 'no', resolved: 'nb', fallback: false });
  assert.deepEqual(resolveLocale('no-NO', ['nb']), { requested: 'no-NO', resolved: 'nb', fallback: false });
  assert.deepEqual(resolveLocale('nb-NO', ['nb']), { requested: 'nb-NO', resolved: 'nb', fallback: false });
  assert.deepEqual(resolveLocale('nn', ['nb']), { requested: 'nn', resolved: 'en', fallback: true });
  assert.deepEqual(resolveLocale('not a tag!', available), { requested: 'not a tag!', resolved: 'en', fallback: true });
  for (const none of [undefined, null, '', '  ', []]) assert.deepEqual(resolveLocale(none, available), { requested: null, resolved: 'en', fallback: false });
});

test('resolveLocale tries an array in order and reports when it left the first choice', () => {
  assert.deepEqual(resolveLocale(['fr', 'es', 'pt'], ['pt', 'es']), { requested: 'fr', resolved: 'es', fallback: true });
  assert.deepEqual(resolveLocale(['es', 'fr'], ['pt', 'es']), { requested: 'es', resolved: 'es', fallback: false });
  assert.deepEqual(resolveLocale(['fr', 'de'], ['es']), { requested: 'fr', resolved: 'en', fallback: true });
});

test('resolveLocale never crosses a script', () => {
  assert.equal(resolveLocale('zh-Hans', ['zh-Hant']).resolved, 'en');
  assert.equal(resolveLocale('zh-Hant', ['zh-Hans']).resolved, 'en');
  assert.equal(resolveLocale('zh-Hant-TW', ['zh-Hans', 'zh-Hant']).resolved, 'zh-Hant');
  assert.equal(resolveLocale('zh-TW', ['zh-Hans', 'zh-Hant']).resolved, 'zh-Hant');
  assert.equal(resolveLocale('zh-CN', ['zh-Hans', 'zh-Hant']).resolved, 'zh-Hans');
  assert.equal(resolveLocale('zh-TW', ['zh']).resolved, 'en');
  assert.equal(resolveLocale('zh-Hans-CN', ['zh-Hans']).resolved, 'zh-Hans');
  assert.equal(resolveLocale('sr-Latn', ['sr-Cyrl']).resolved, 'en');
});

test('selectGuide localizes the matched and the explicitly chosen guide, and reports it', () => {
  const matched = selectGuide(iphone, { locale: 'en-XA', localeData });
  const explicit = selectGuide(null, { guideId: id, locale: 'en-XA', localeData });
  for (const selection of [matched, explicit]) {
    assert.equal(selection.status, 'matched');
    assert.deepEqual(selection.locale, { requested: 'en-XA', resolved: 'en-XA', fallback: false });
    assert.equal(selection.guide.language, 'en-XA');
    assert.equal(selection.guide.id, id);
    assert.ok(selection.guide.title.startsWith('[') && selection.guide.completion.startsWith('['));
    assert.ok(selection.guide.steps.every(step => step.title.startsWith('[')));
    assert.equal(selection.guide.steps.length, guide.steps.length);
    assert.ok(selection.guide.steps.every((step, index) => step.id === guide.steps[index].id && step.illustrationFragment === guide.steps[index].illustrationFragment));
    assert.ok(decodeURIComponent(selection.guide.illustration.src).includes('lang="en-XA"'));
    assert.equal(selection.guide.versions, guide.versions);
    assert.ok(!('localeFallback' in selection.guide));
  }
  assert.equal(matched.match, 'browser-version');
  assert.equal(matched.reasonCode, 'browser-version');
  assert.equal(matched.reason, 'Selected by browser version; the OS version is hidden.');
  assert.equal(explicit.reasonCode, 'guide-chosen');
  // Matching does not depend on the language.
  assert.equal(selectGuide(iphone, { locale: 'fr' }).guide.id, selectGuide(iphone).guide.id);
  assert.equal(guide.language, 'en');
});

test('an unavailable locale falls back to whole-guide English and says so', () => {
  const selection = selectGuide(null, { guideId: id, locale: 'fr-CA', localeData });
  assert.deepEqual(selection.locale, { requested: 'fr-CA', resolved: 'en', fallback: true });
  assert.equal(selection.guide.language, 'en');
  assert.equal(selection.guide.localeFallback, true);
  assert.equal(selection.guide.requestedLocale, 'fr-CA');
  assert.deepEqual({ ...selection.guide, localeFallback: undefined, requestedLocale: undefined }, { ...guide, localeFallback: undefined, requestedLocale: undefined });
  assert.ok(!('localeFallback' in guide));
  // A guide is English or localized, never mixed: a locale missing one guide serves that guide in English.
  const partial = { 'en-XA': { guides: { [id]: xa.guides[id] } } };
  assert.equal(selectGuide(null, { guideId: 'ios-brave-iphone-layout-1', locale: 'en-XA', localeData: partial }).guide.language, 'en');
  assert.deepEqual(getGuideLocales(guide, partial), ['en', 'en-XA']);
  assert.deepEqual(getGuideLocales(guides.find(item => item.id === 'ios-brave-iphone-layout-1'), partial), ['en']);
  const missingStep = { 'en-XA': { guides: { [id]: { ...xa.guides[id], steps: xa.guides[id].steps.slice(1) } } } };
  assert.equal(selectGuide(null, { guideId: id, locale: 'en-XA', localeData: missingStep }).locale.fallback, true);
  // Unsupported selections still report the resolution.
  const missing = selectGuide(null, { guideId: 'nope', locale: 'en-XA', localeData });
  assert.equal(missing.guide, null);
  assert.equal(missing.reasonCode, 'guide-not-found');
  assert.equal(missing.locale.resolved, 'en-XA');
});

test('registerLocale makes a locale available without localeData, and localeData wins over it', () => {
  assert.deepEqual(selectGuide(null, { guideId: id, locale: 'en-XA' }).locale, { requested: 'en-XA', resolved: 'en', fallback: true });
  assert.deepEqual(getGuideLocales(guide), ['en']);
  assert.throws(() => registerLocale('not a tag!', xa), RangeError);
  registerLocale('en_xa', xa);
  assert.deepEqual(getGuideLocales(guide), ['en', 'en-XA']);
  assert.equal(selectGuide(null, { guideId: id, locale: 'en-XA' }).guide.language, 'en-XA');
  const other = { 'en-XA': { guides: { [id]: { ...xa.guides[id], title: 'Override' } } } };
  assert.equal(selectGuide(null, { guideId: id, locale: 'en-XA', localeData: other }).guide.title, 'Override');
  assert.equal(selectGuide(null, { guideId: id, locale: ['fr', 'en-XA'] }).locale.fallback, true);
  registerLocale('en-XA', { guides: {} });
  assert.deepEqual(getGuideLocales(guide), ['en']);
});

test('getIllustration with a locale and siteUrl localizes the artwork and the Website sentence without mutating the guide', () => {
  const before = JSON.stringify(guide);
  const result = getIllustration(guide, { siteUrl: 'https://crosswithyou.app/play', locale: 'en-XA', localeData });
  assert.equal(JSON.stringify(guide), before);
  assert.ok(result.alt.startsWith(xa.guides[id].illustration.alt));
  assert.ok(result.alt.endsWith(xa.ui.website.replace('{host}', 'crosswithyou.app')));
  assert.ok(!result.alt.includes('Website:'));
  const svg = decodeURIComponent(result.src.slice(result.src.indexOf(',') + 1));
  assert.ok(svg.includes('lang="en-XA"') && svg.includes('>crosswithyou.app<') && !svg.includes('>example.com<'));
  // A localized guide gets its own wording without being asked for the locale again.
  const localized = selectGuide(null, { guideId: id, locale: 'en-XA', localeData }).guide;
  assert.equal(getIllustration(localized, { siteUrl: 'crosswithyou.app', localeData }).alt, result.alt);
  // An unavailable locale stays English throughout.
  const english = getIllustration(guide, { siteUrl: 'crosswithyou.app', locale: 'fr', localeData });
  assert.equal(english.alt, `${guide.illustration.alt} Website: crosswithyou.app.`);
  // Without a site URL the localized illustration is returned as is.
  assert.deepEqual(getIllustration(guide, { locale: 'en-XA', localeData }), localized.illustration);
});

test('detectUILocale is safe on the server and reads navigator.languages[0] in a browser', () => {
  assert.equal(detectUILocale(), undefined);
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { languages: ['pt-BR', 'en'], language: 'en' }, configurable: true });
  globalThis.window = globalThis;
  try {
    assert.equal(detectUILocale(), 'pt-BR');
  } finally {
    delete globalThis.window;
    if (previous) Object.defineProperty(globalThis, 'navigator', previous); else delete globalThis.navigator;
  }
});

test('React without a locale renders as 0.1.0 did, apart from the heading and completion: no language markup', () => {
  const html = renderToStaticMarkup(h(InstallInstructions, { guideId: id }));
  assert.ok(!/lang=|data-pwa-locale/.test(html.replace(/<img[^>]*>/, '')));
});

test('React renders localized steps, lang, data-pwa-locale and an italic localized label', () => {
  const html = renderToStaticMarkup(h(InstallInstructions, { guideId: id, locale: 'en-XA', localeData, siteUrl: 'my-app.example', presentation: 'text' }));
  const section = new JSDOM(html).window.document.querySelector('section');
  assert.equal(section.getAttribute('lang'), 'en-XA');
  assert.equal(section.getAttribute('data-pwa-locale'), 'en-XA');
  assert.equal(section.hasAttribute('data-pwa-locale-fallback'), false);
  assert.equal(section.querySelector('h2'), null);
  const steps = Array.from(section.querySelectorAll('li'));
  assert.equal(steps.length, guide.steps.length);
  const labelled = xa.guides[id].steps.filter(step => step.uiLabel);
  assert.ok(labelled.length > 0);
  for (const step of labelled) {
    const strong = steps[xa.guides[id].steps.indexOf(step)].querySelector('strong');
    assert.equal(strong.querySelector('em')?.textContent, step.uiLabel);
    assert.equal(strong.textContent, step.title);
  }
  const illustrated = renderToStaticMarkup(h(InstallInstructions, { guideId: id, locale: 'en-XA', localeData, siteUrl: 'my-app.example' }));
  assert.ok(illustrated.includes(xa.ui.website.replace('{host}', 'my-app.example')));
});

test('React marks a fallback guide as English, and InstallGuideView localizes an English guide itself', () => {
  const fallback = renderToStaticMarkup(h(InstallInstructions, { guideId: id, locale: 'fr', localeData, presentation: 'text' }));
  const section = new JSDOM(fallback).window.document.querySelector('section');
  assert.equal(section.getAttribute('lang'), 'en');
  assert.equal(section.getAttribute('data-pwa-locale'), 'en');
  assert.equal(section.getAttribute('data-pwa-locale-fallback'), 'true');
  const view = renderToStaticMarkup(h(InstallGuideView, { guide, locale: 'en-XA', localeData, presentation: 'text' }));
  assert.ok(view.includes('data-pwa-locale="en-XA"') && !view.includes(xa.guides[id].completion));
  // A guide that is already localized is shown as it is.
  const localized = selectGuide(null, { guideId: id, locale: 'en-XA', localeData }).guide;
  assert.ok(renderToStaticMarkup(h(InstallGuideView, { guide: localized, localeData })).includes('data-pwa-locale="en-XA"'));
  // On the server nothing is detected, and the fallback still receives the selection with its locale.
  assert.ok(renderToString(h(InstallInstructions, { locale: 'en-XA', localeData, fallback: selection => h('p', null, selection.locale.resolved) })).includes('<p>en-XA</p>'));
});
