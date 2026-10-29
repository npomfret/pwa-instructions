import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { DOMParser } from '@xmldom/xmldom';
import { composeGuides } from '../scripts/compose-guides.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(await readFile(new URL('../catalog.json', import.meta.url), 'utf8'));
const english = await composeGuides(root, catalog);

/** Names and loanwords that are the same in every language ("app", "web", "menu"). Lower case. */
const BRANDS = new Set(['safari', 'chrome', 'edge', 'brave', 'mac', 'iphone', 'android', 'windows', 'dock', 'finder', 'macos', 'ios', 'sonoma',
  'pwa', 'microsoft', 'google', 'apple', 'apps', 'example', 'com', 'app', 'web', 'menu', 'qr']);
/**
 * Words that are English spellings and also ordinary words, or Apple's own terms, in that language. Each was read in context:
 * they are the product's wording ("Home-Bildschirm", "schermata Home", "File") or plain cognates ("visible", "confirmation").
 */
const SHARED = {
  es: ['visible', 'all', 'zoom'],
  fr: ['site', 'sites', 'plus', 'chevron', 'actions', 'action', 'visible', 'confirmation', 'page', 'installation', 'install', 'version', 'versions',
    'illustrations', 'applications', 'six', 'guide', 'double', 'documentation', 'article', 'option', 'installable', 'place', 'apps', 'zoom', 'note', 'code', 'instructions', 'capture'],
  de: ['home', 'website', 'websites', 'chevron', 'screenshots', 'domain', 'version', 'installation', 'option', 'link', 'launcher', 'browser', 'tools', 'details', 'app', 'apps', 'reader', 'code', 'tab', 'downloads'],
  'pt-BR': ['site', 'sites', 'continue', 'use', 'submenu', 'for', 'return', 'layout', 'layouts', 'link', 'card', 'zoom', 'code', 'downloads'],
  it: ['home', 'all', 'chevron', 'complete', 'file', 'layout', 'launcher', 'link', 'start', 'desktop', 'browser', 'zoom'],
  ja: [], ko: [], 'zh-Hans': [],
};

/** Labels whose product string really is the English word in that language: Apple's Italian "File", the German "Website" and "Downloads". */
const SAME_LABEL = new Set(['de:website', 'de:downloads', 'pt-BR:downloads', 'it:file']);

const words = text => (text.replace(/\{[^}]*\}/g, ' ').replace(/\b[a-z]+:\/\/\S*/gi, ' ').match(/\p{L}[\p{L}'’]+/gu) ?? []).filter(word => word.length >= 3);
const parse = svg => new DOMParser().parseFromString(svg, 'image/svg+xml');
const vocabulary = new Set();
const guideTexts = guide => {
  const doc = parse(guide.svg);
  const drawn = Array.from(doc.getElementsByTagName('*')).filter(node => ['text', 'title', 'desc'].includes(node.tagName)).map(node => node.textContent);
  return [guide.localized.title, guide.localized.label, guide.localized.alt, guide.localized.completion, guide.header.replace(/<[^>]*>/g, ' '),
    ...guide.steps.flatMap(step => [step.title, step.description, step.uiLabel ?? '']), guide.text, ...drawn];
};
for (const guide of english.values()) for (const text of guideTexts(guide)) for (const word of words(text)) vocabulary.add(word.toLowerCase());

for (const tag of catalog.locales) {
  test(`${tag}: no English label text or prose word remains in any guide`, async () => {
    const composed = await composeGuides(root, catalog, tag);
    const allowed = new Set([...BRANDS, ...SHARED[tag]]);
    const found = [];
    for (const [id, guide] of composed) {
      assert.equal(guide.locale, tag);
      for (const text of guideTexts(guide)) {
        assert.ok(!/\{(label|step):/.test(text), `${id}: unresolved placeholder in "${text.slice(0, 120)}"`);
        for (const word of words(text)) {
        if (vocabulary.has(word.toLowerCase()) && !allowed.has(word.toLowerCase())) found.push(`${id}: "${word}" in "${text.slice(0, 80)}"`);
        }
      }
      // The control names the guide draws are this locale's, not the English capture's.
      for (const [label, text] of Object.entries(guide.labels[tag])) {
        const base = guide.labels.en[label];
        assert.ok(text !== base || BRANDS.has(base.toLowerCase()) || SAME_LABEL.has(`${tag}:${label}`), `${id} ${label} is still "${base}"`);
      }
    }
    assert.deepEqual(found, []);
  });
}

test('every guide in every locale fills the same steps as English, with the locale named as the guide language', async () => {
  for (const tag of catalog.locales) {
    const composed = await composeGuides(root, catalog, tag);
    for (const [id, guide] of composed) {
      assert.equal(guide.steps.length, english.get(id).steps.length, `${id} ${tag}`);
      assert.ok(guide.svg.includes(`lang="${tag}"`), `${id} ${tag}`);
    }
  }
});
