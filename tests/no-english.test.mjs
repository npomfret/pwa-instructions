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
  'pt-BR': ['site', 'sites', 'continue', 'use', 'submenu', 'for', 'return', 'layout', 'layouts', 'link', 'card', 'zoom', 'code', 'downloads', 'item'],
  it: ['home', 'all', 'chevron', 'complete', 'file', 'layout', 'launcher', 'link', 'start', 'desktop', 'browser', 'zoom'],
  ja: [], ko: [], 'zh-Hans': [],
  // The later locales. Each word was read in context, as above: a real word or established loanword in that language, or a product
  // string ("Edit" in macOS Indonesian and Malay, "Cast" in Chrome's Danish, Norwegian and Hebrew menus, "Reader" in Safari's Dutch).
  // "return" is the legend printed on the Mac key, which Apple's own documentation names in these languages; the locales
  // that translate the key (ca, es-419, fr-CA) do not need it.
  nl: ['open', 'website', 'websites', 'reader', 'bookmarks', 'code', 'route', 'later', 'return', 'submenu', 'item', 'downloads', 'link', 'details', 'start', 'browser', 'site'],
  pl: ['plus', 'zoom', 'return', 'link'],
  sv: ['version', 'start'],
  da: ['for', 'side', 'find', 'start', 'zoom', 'cast', 'installation', 'version', 'dialog', 'downloads', 'link'],
  nb: ['for', 'start', 'cast', 'side', 'link'],
  ru: ['return'], uk: ['return'], tr: ['return'], el: ['return'], bg: ['return'], th: ['return'], ar: ['return'], 'zh-HK': ['return'],
  cs: ['list', 'plus', 'dialog', 'return', 'start'],
  sk: ['plus', 'tab', 'return'],
  hu: ['return', 'link'],
  ro: ['site', 'are', 'chevron', 'plus', 'complete', 'text', 'zoom', 'dialog', 'return', 'link', 'start', 'desktop'],
  hr: ['list', 'return', 'start'],
  'pt-PT': ['site', 'continue', 'return', 'submenu', 'item', 'link'],
  'es-419': ['visible', 'zoom'],
  'fr-CA': ['page', 'plus', 'confirmation', 'site', 'chevron', 'actions', 'visible', 'instructions', 'zoom', 'note', 'code', 'applications', 'version', 'illustrations',
    'six', 'double', 'versions', 'installation', 'guide', 'documentation', 'option', 'article', 'capture', 'installable', 'place'],
  'zh-Hant': ['code', 'return'],
  id: ['edit', 'horizontal', 'plus', 'zoom', 'bookmark', 'desktop', 'file', 'bar', 'dialog', 'folder', 'tab', 'return', 'submenu', 'item', 'domain', 'link', 'vendor', 'browser'],
  ms: ['edit', 'bar', 'desktop', 'dialog', 'folder', 'tab', 'return', 'submenu', 'item', 'domain', 'vendor'],
  vi: ['tab', 'return'], hi: ['return'],
  ca: ['full', 'visible', 'controls', 'has', 'text', 'zoom', 'cancel', 'versions', 'article'],
  he: ['cast', 'return'],
  sl: ['list', 'plus', 'return', 'start'],
};

/** Labels whose product string really is the English word in that language: Apple's Italian "File", the German "Website" and "Downloads", macOS Indonesian "File" and "Edit". */
const SAME_LABEL = new Set(['de:website', 'de:downloads', 'pt-BR:downloads', 'it:file', 'id:edit', 'ms:edit', 'id:file', 'nl:website', 'nl:open-in-safari', 'nl:downloads', 'da:downloads']);

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
    const allowed = new Set([...BRANDS, ...(SHARED[tag] ?? [])]);
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
