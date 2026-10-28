import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser } from '@xmldom/xmldom';
import { readFile } from 'node:fs/promises';
import { guides } from 'pwa-instructions';

const safari = guides.find(guide => guide.id === 'ios-safari-iphone-layout-1');
const brave = guides.find(guide => guide.id === 'ios-brave-iphone-layout-1');
const chrome = guides.find(guide => guide.id === 'ios-chrome-iphone-layout-1');
const decode = guide => decodeURIComponent(guide.illustration.src.slice(guide.illustration.src.indexOf(',') + 1));

test('Brave combines its handoff with the Safari sequence and renumbers cross-references', () => {
  assert.equal(brave.steps.length, 7);
  assert.equal(brave.steps[2].title, 'Open in Safari');
  assert.deepEqual(brave.steps.slice(3).map(step => step.title), safari.steps.map(step => step.title));
  assert.ok(brave.steps[5].description.includes('step 7'));
  assert.ok(decode(brave).includes('Continue in Safari'));
});

test('Chrome reuses common instructions without inheriting the Safari entry menu', () => {
  assert.equal(chrome.steps.length, 3);
  assert.ok(chrome.steps[0].description.includes('top of the screen'));
  assert.equal(chrome.steps[2].description, safari.steps[3].description);
  assert.ok(chrome.steps[1].description.includes('step 3'));
  assert.ok(!chrome.steps.some(step => step.title.includes('Page Menu')));
});

test('each SVG is standalone, with unique IDs and working internal references', () => {
  for (const guide of guides) {
    const doc = new DOMParser().parseFromString(decode(guide), 'image/svg+xml');
    const elements = Array.from(doc.getElementsByTagName('*'));
    const ids = elements.filter(node => node.hasAttribute('id')).map(node => node.getAttribute('id'));
    assert.equal(new Set(ids).size, ids.length, guide.id);
    for (const node of elements) {
      const href = node.getAttribute('href');
      if (href) { assert.ok(href.startsWith('#')); assert.ok(ids.includes(href.slice(1))); }
      for (const id of (node.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean)) assert.ok(ids.includes(id));
    }
    assert.ok(!decode(guide).includes('marker-end='));
    assert.equal((guide.text.match(/^\d+\. /gm) ?? []).length, guide.steps.length);
  }
});

test('shared Safari artwork is preserved in the composed Brave continuation', async () => {
  const metadata = JSON.parse(await readFile(new URL('../guides/ios/brave/iphone/layout-1/metadata.json', import.meta.url), 'utf8'));
  assert.ok(metadata.steps.slice(3).every(step => step.reuse.guideId === safari.id && step.reuse.artwork));
  const svg = decode(brave);
  assert.ok(svg.includes('shared-ios-safari-iphone-layout-1-phone'));
  assert.ok(!svg.includes('bbc.co.uk'));
});

test('Windows Chrome reuses common text while keeping its own confirmation and artwork', () => {
  const mac = guides.find(guide => guide.id === 'macos-chrome-desktop-layout-1');
  const windows = guides.find(guide => guide.id === 'windows-chrome-desktop-layout-1');
  assert.deepEqual(windows.steps.slice(0, 3).map(step => step.description), mac.steps.slice(0, 3).map(step => step.description));
  assert.equal(windows.steps.length, 4);
  assert.ok(!decode(windows).includes('Show in Finder'));
  assert.ok(!decode(windows).includes('Chrome Apps'));
});
