import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser } from '@xmldom/xmldom';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { OVERFLOW_FAIL, OVERFLOW_WARN, checkLocales } from '../scripts/check-locales.mjs';
import { staleLabels } from '../scripts/check-labels.mjs';
import { labelResolver, loadLabels, pseudoLocale } from '../scripts/i18n.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const SAFARI = 'guides/ios/safari/iphone/layout-1';
const BRAVE = 'guides/ios/brave/iphone/layout-1';
const SOURCE = { method: 'device', source: 'capture:fixture-1', verified: '2026-10-01', version: 'iOS 27' };
// A stand-in translation that keeps placeholders and length: "e" becomes "é".
const translate = text => text.split(/(\{[^}]*\})/).map(part => (part.startsWith('{') ? part : part.replace(/e/g, 'é'))).join('');

const readJSON = async file => JSON.parse(await readFile(file, 'utf8'));
const writeJSON = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n');

/**
 * A temporary copy of the real sources plus a valid "es" fixture locale built from the English. Each test
 * breaks one thing in the copy; the repository's own data is never touched.
 */
async function withFixture(t, { mutate } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'pwa-instructions-check-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await cp(path.join(root, 'catalog.json'), path.join(dir, 'catalog.json'));
  await cp(path.join(root, 'labels'), path.join(dir, 'labels'), { recursive: true });
  await cp(path.join(root, 'guides'), path.join(dir, 'guides'), { recursive: true });
  const catalog = await readJSON(path.join(dir, 'catalog.json'));
  const labels = await loadLabels(dir);
  for (const [surface, entries] of labels) {
    for (const entry of Object.values(entries)) {
      entry.es = translate(entry.en);
      if (surface !== 'ui') entry._src = { ...entry._src, es: SOURCE };
    }
    await writeJSON(path.join(dir, 'labels', `${surface}.json`), entries);
  }
  for (const entry of catalog.guides) {
    const folder = path.dirname(path.join(dir, entry.path));
    const data = await readJSON(path.join(dir, entry.path));
    const document = new DOMParser().parseFromString(await readFile(path.join(folder, data.artworkSource ?? 'install.source.svg'), 'utf8'), 'image/svg+xml');
    const locale = pseudoLocale(data, labelResolver(labels, entry.labelSurfaces, 'en'), document, translate);
    await mkdir(path.join(folder, 'locales'), { recursive: true });
    await writeJSON(path.join(folder, 'locales', 'es.json'), locale);
  }
  if (mutate) await mutate(dir);
  return dir;
}
const edit = async (file, change) => { const value = await readJSON(file); await change(value); await writeJSON(file, value); };
const texts = list => list.map(item => item.text);
const has = (list, ...parts) => texts(list).some(text => parts.every(part => text.includes(part)));

test('the repository passes every error rule, and en-XA only warns about overflow', async () => {
  const { errors, warnings } = await checkLocales(root);
  assert.deepEqual(texts(errors), []);
  const pseudo = warnings.filter(item => item.text.includes('[en-XA]'));
  assert.ok(pseudo.length > 0 && pseudo.every(item => item.rule === 7));
});

test('a fixture locale passes with no errors; English labels need no source', async t => {
  const dir = await withFixture(t);
  const { errors } = await checkLocales(dir);
  assert.deepEqual(texts(errors), []);
});

test('a missing step fails, and a missing Safari step also fails the Brave guide that reuses it', async t => {
  const dir = await withFixture(t, { mutate: dir => edit(path.join(dir, SAFARI, 'locales/es.json'), locale => { delete locale.steps['tap-share']; }) });
  const { errors } = await checkLocales(dir);
  assert.ok(has(errors, `${SAFARI}/locales/es.json`, 'steps.tap-share.title', '[es]', 'is missing'));
  assert.ok(has(errors, `${BRAVE}/locales/es.json`, 'steps.tap-share', 'reuses ios-safari-iphone-layout-1 step tap-share'));
});

test('a missing top-level string, transition or ui string fails a locale', async t => {
  const dir = await withFixture(t, { mutate: async dir => {
    await edit(path.join(dir, BRAVE, 'locales/es.json'), locale => { delete locale.completion; delete locale.transitions['continue-in-safari']; });
    await edit(path.join(dir, 'labels/ui.json'), ui => { delete ui.website.es; });
  } });
  const { errors } = await checkLocales(dir);
  assert.ok(has(errors, `${BRAVE}/locales/es.json`, 'completion', 'is missing'));
  assert.ok(has(errors, 'transitions.continue-in-safari', 'is missing'));
  assert.ok(has(errors, 'labels/ui.json', 'website', '[es]', 'has no ui string'));
});

test('a label drawn in artwork reused from another guide must resolve for a locale', async t => {
  const dir = await withFixture(t, { mutate: dir => edit(path.join(dir, 'labels/ios-safari.json'), entries => { delete entries['show-reader'].es; delete entries['show-reader']._src.es; }) });
  const { errors } = await checkLocales(dir);
  assert.ok(has(errors, `${SAFARI}/locales/es.json`, '{label:show-reader}', 'fall back to English'));
  assert.ok(has(errors, `${BRAVE}/locales/es.json`, '{label:show-reader}', 'artwork reused from ios-safari-iphone-layout-1'));
});

test('a placeholder mismatch fails: a lost label, a changed step number and an unknown label id', async t => {
  const dir = await withFixture(t, { mutate: async dir => {
    await edit(path.join(dir, SAFARI, 'locales/es.json'), locale => {
      locale.steps['tap-share'].title = 'Toca el botón';
      locale.steps['open-page-menu'].description = 'Pulsa {label:no-such-label}.';
      locale.steps['view-more'].description = locale.steps['view-more'].description.replace('{step:4}', '{step:2}');
    });
  } });
  const { errors } = await checkLocales(dir);
  assert.ok(has(errors, `${SAFARI}/locales/es.json`, 'steps.tap-share.title', 'lacks {label:share}'));
  assert.ok(has(errors, 'steps.open-page-menu.description', 'uses {label:no-such-label}', 'not in surfaces ios-safari'));
  assert.ok(has(errors, 'steps.view-more.description', 'lacks {step:4}'));
  assert.ok(has(errors, 'steps.view-more.description', 'has {step:2}, which the English does not'));
});

test('a label value whose placeholders differ from English fails', async t => {
  const dir = await withFixture(t, { mutate: dir => edit(path.join(dir, 'labels/ui.json'), ui => { ui.website.es = 'Sitio web.'; }) });
  assert.ok(has((await checkLocales(dir)).errors, 'labels/ui.json', 'website.es', 'has placeholders none, English has {host}'));
});

test('an orphan locale file fails, as does a label locale the catalog does not list', async t => {
  const dir = await withFixture(t, { mutate: async dir => {
    await writeJSON(path.join(dir, SAFARI, 'locales/nl.json'), {});
    await edit(path.join(dir, 'labels/ios-safari.json'), entries => { entries['page-menu'].sv = 'Sidmeny'; });
  } });
  const { errors } = await checkLocales(dir);
  assert.ok(has(errors, `${SAFARI}/locales/nl.json`, '[nl]', 'orphan'));
  assert.ok(has(errors, 'labels/ios-safari.json', 'page-menu', '[sv]', 'orphan'));
});

test('a listed locale with no files fails', async t => {
  const dir = await withFixture(t, { mutate: async dir => edit(path.join(dir, 'catalog.json'), catalog => { catalog.locales.push('nl'); }) });
  assert.ok(has((await checkLocales(dir)).errors, 'catalog.json', 'locales.nl', 'no locale file or label exists'));
});

test('tags must be canonical and file names must be the tag', async t => {
  const dir = await withFixture(t, { mutate: async dir => {
    await writeJSON(path.join(dir, SAFARI, 'locales/pt_br.json'), {});
    await edit(path.join(dir, 'catalog.json'), catalog => { catalog.locales.push('pt_br'); });
    await edit(path.join(dir, BRAVE, 'locales/es.json'), locale => { locale.locale = 'fr'; });
  } });
  const { errors } = await checkLocales(dir);
  assert.ok(has(errors, 'catalog.json', 'locales.pt_br', 'not a canonical locale tag'));
  assert.ok(has(errors, `${SAFARI}/locales/pt_br.json`, 'file name', 'not a canonical locale tag'));
  assert.ok(has(errors, `${BRAVE}/locales/es.json`, 'locale', 'says "fr" but the file is es.json'));
});

test('a label with no source fails, and so does an incomplete or future-dated one', async t => {
  const dir = await withFixture(t, { mutate: dir => edit(path.join(dir, 'labels/ios-safari.json'), entries => {
    delete entries['page-menu']._src.es;
    entries['show-reader']._src.es = { method: 'device', verified: '2026-10-01', version: 'iOS 27' };
    entries.summarise._src.es = { ...SOURCE, verified: '2999-01-01' };
  }) });
  const { errors } = await checkLocales(dir);
  assert.ok(has(errors, 'labels/ios-safari.json', 'page-menu._src.es', '[es]', 'has no source record'));
  assert.ok(has(errors, 'show-reader._src.es', 'lacks source'));
  assert.ok(has(errors, 'summarise._src.es', 'expected a past YYYY-MM-DD'));
});

test('a label used by a locale but missing from it is a silent-fallback error', async t => {
  const dir = await withFixture(t, { mutate: dir => edit(path.join(dir, 'labels/ios-share-sheet.json'), entries => { delete entries.share.es; }) });
  const { errors } = await checkLocales(dir);
  assert.ok(has(errors, `${SAFARI}/locales/es.json`, '{label:share}', '[es]', 'fall back to English'));
});

test('an untagged SVG text node fails, and tagged, allow-listed and domain text does not', async t => {
  const dir = await withFixture(t, { mutate: async dir => {
    const file = path.join(dir, SAFARI, 'install.source.svg');
    await writeFile(file, (await readFile(file, 'utf8')).replace('</svg>', '<text x="1" y="1">Hello there</text></svg>'));
  } });
  const { errors } = await checkLocales(dir);
  assert.ok(has(errors, `${SAFARI}/install.source.svg`, '<text> "Hello there"', 'no data-i18n tag'));
  assert.equal(texts(errors).filter(text => text.includes('no data-i18n tag')).length, 1);
});

test('a data-i18n key with no English entry fails, and so does a missing guide: key translation', async t => {
  const dir = await withFixture(t, { mutate: async dir => {
    const file = path.join(dir, SAFARI, 'install.source.svg');
    await writeFile(file, (await readFile(file, 'utf8')).replace('</svg>', '<text x="1" y="1" data-i18n="label:nope">Nope</text></svg>'));
    await edit(path.join(dir, SAFARI, 'locales/es.json'), locale => { delete locale.subtitle; });
  } });
  const { errors } = await checkLocales(dir);
  assert.ok(has(errors, 'install.source.svg', 'label:nope', 'no English label'));
  assert.ok(has(errors, `${SAFARI}/locales/es.json`, 'subtitle', 'is missing'));
});

test('empty strings and TODO markers fail; a string identical to English only warns', async t => {
  const dir = await withFixture(t, { mutate: async dir => {
    await edit(path.join(dir, SAFARI, 'locales/es.json'), locale => { locale.steps['tap-share'].description = ''; locale.completion = 'TODO translate'; locale.alt = 'Four steps: tap Page Menu beside the address, tap Share, tap View More if needed, then tap Add to Home Screen.'; });
    await edit(path.join(dir, 'labels/ios-safari.json'), entries => { entries['show-reader'].es = 'TODO'; entries.summarise.es = 'Summarise'; });
  } });
  const { errors, warnings } = await checkLocales(dir);
  assert.ok(has(errors, `${SAFARI}/locales/es.json`, 'steps.tap-share.description', 'is an empty string'));
  assert.ok(has(errors, 'completion', 'contains a TODO marker'));
  assert.ok(has(errors, 'labels/ios-safari.json', 'show-reader.es', 'contains a TODO marker'));
  assert.ok(has(warnings, `${SAFARI}/locales/es.json`, 'alt', 'identical to the English'));
  assert.ok(has(warnings, 'labels/ios-safari.json', 'summarise.es', 'identical to the English'));
  assert.ok(!has(errors, 'summarise.es'));
});

test('brand names identical to English do not warn', async t => {
  const dir = await withFixture(t, { mutate: dir => edit(path.join(dir, 'labels/ui.json'), ui => { ui['browser-safari'] = Object.fromEntries(Object.keys(ui.website).map(tag => [tag, 'Safari'])); }) });
  assert.ok(!has((await checkLocales(dir)).warnings, 'browser-safari'));
});

test('an overflowing label warns at 100% and fails at 130% of its data-max-width', async t => {
  assert.equal(OVERFLOW_WARN, 1);
  assert.equal(OVERFLOW_FAIL, 1.3);
  // "View More" sits in a 100-unit node: a few extra letters land between the limits, a long phrase beyond them.
  const warn = await withFixture(t, { mutate: dir => edit(path.join(dir, 'labels/ios-share-sheet.json'), entries => { entries['view-more'].es = 'Ver más opciones'; }) });
  const fail = await withFixture(t, { mutate: dir => edit(path.join(dir, 'labels/ios-share-sheet.json'), entries => { entries['view-more'].es = 'Ver muchas más opciones disponibles'; }) });
  const warned = await checkLocales(warn);
  assert.ok(has(warned.warnings, 'install.source.svg', 'label:view-more', '[es]', 'of its 100-unit width', 'warn threshold 100%'));
  assert.ok(!has(warned.errors, 'label:view-more'));
  assert.ok(has((await checkLocales(fail)).errors, 'install.source.svg', 'label:view-more', '[es]', 'fails at 130%'));
});

test('staleLabels lists labels verified more than a year ago, oldest first', async () => {
  const labels = new Map([['s', {
    old: { en: 'Old', _src: { es: { ...SOURCE, verified: '2024-01-01' }, fr: { ...SOURCE, verified: '2023-06-01' } } },
    fresh: { en: 'Fresh', _src: { es: { ...SOURCE, verified: '2026-09-01' } } },
  }]]);
  const stale = staleLabels(labels, new Date('2026-10-28'));
  assert.deepEqual(stale.map(item => `${item.id}/${item.tag}`), ['old/fr', 'old/es']);
  assert.deepEqual(staleLabels(await loadLabels(root), new Date('2026-10-28')), []);
});

test('en-US is a label-only variant: no prose or catalog entry is needed, and it is never an orphan', async () => {
  const { errors, warnings } = await checkLocales(root);
  const labels = await loadLabels(root);
  assert.equal(labels.get('ios-safari').summarise['en-US'], 'Summarize');
  assert.ok(!(await readJSON(path.join(root, 'catalog.json'))).locales.includes('en-US'));
  assert.ok(!has(errors, 'en-US') && !has(warnings, 'en-US'));
});

test('an en-US label value must have a complete source record, as an error', async t => {
  const dir = await withFixture(t, { mutate: dir => edit(path.join(dir, 'labels/ios-safari.json'), entries => {
    entries['show-reader']['en-US'] = 'Show Reader View';
    delete entries.summarise._src['en-US'];
    entries['page-menu']['en-US'] = 'Page menu';
    entries['page-menu']._src = { 'en-US': { method: 'support-page', verified: '2026-10-29', version: 'iOS 27' } };
  }) });
  const { errors } = await checkLocales(dir);
  assert.ok(has(errors, 'labels/ios-safari.json', 'show-reader._src.en-US', '[en-US]', 'has no source record'));
  assert.ok(has(errors, 'summarise._src.en-US', '[en-US]', 'has no source record'));
  assert.ok(has(errors, 'page-menu._src.en-US', 'lacks source'));
});

test('en-US values are checked for empty text and TODO markers, and one equal to the en text only warns', async t => {
  const dir = await withFixture(t, { mutate: dir => edit(path.join(dir, 'labels/ios-safari.json'), entries => {
    entries['show-reader']['en-US'] = '  ';
    entries['page-menu']['en-US'] = 'TODO Page Menu';
    entries.summarise['en-US'] = 'Summarise';
  }) });
  const { errors, warnings } = await checkLocales(dir);
  assert.ok(has(errors, 'show-reader.en-US', 'is an empty string'));
  assert.ok(has(errors, 'page-menu.en-US', 'contains a TODO marker'));
  assert.ok(has(warnings, 'summarise.en-US', 'identical to the en text'));
  assert.ok(!has(errors, 'summarise.en-US'));
});
