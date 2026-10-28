import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { detectEnvironment, detectBrowserEnvironment, selectGuide, guides } from '@pwa-instructions/core';

const safari = (version = 27, device = 'iPhone') => `Mozilla/5.0 (${device}; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version}.0 Mobile/15E148 Safari/604.1`;
const detected = () => detectEnvironment({ userAgent: safari() });

test('server imports and detection work without window', () => {
  assert.equal(detectBrowserEnvironment(), null);
  assert.equal(selectGuide(null).status, 'needs-selection');
});

test('frozen Safari OS token does not become a false iOS version', () => {
  const env = detected();
  assert.equal(env.browserMajor, 27);
  assert.equal(env.osMajor, null);
  assert.equal(env.device, 'iphone');
  const result = selectGuide(env);
  assert.equal(result.guide.id, 'ios-safari-iphone-layout-1');
  assert.equal(result.match, 'browser-version');
});

test('explicit major versions match the observed reference', () => {
  assert.equal(selectGuide({ ...detected(), osMajor: 27 }).match, 'observed');
  assert.equal(selectGuide({ ...detected(), osMajor: 26 }).status, 'unsupported');
});

test('Safari compatibility tokens do not override other browser identities', () => {
  for (const [token, browser] of [['CriOS/150.0', 'chrome'], ['FxiOS/150.0', 'firefox'], ['EdgiOS/150.0', 'edge'], ['Brave/2.0', 'brave'], ['OPT/3.0', 'opera']]) {
    const env = detectEnvironment({ userAgent: safari().replace('Version/27.0', token) });
    assert.equal(env.browser, browser);
    assert.equal(selectGuide(env).status, 'unsupported');
  }
});

test('embedded webviews and known app browser markers do not select Safari', () => {
  assert.equal(detectEnvironment({ userAgent: safari().replace('Version/27.0 ', '') }).browser, 'unknown');
  assert.equal(detectEnvironment({ userAgent: safari() + ' Instagram/300.0' }).browser, 'unknown');
});

test('iPad desktop mode and desktop Safari do not select an iPhone guide', () => {
  const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/27.0 Safari/605.1.15';
  assert.equal(detectEnvironment({ userAgent: ua, maxTouchPoints: 5 }).device, 'ipad');
  assert.equal(selectGuide(detectEnvironment({ userAgent: ua, maxTouchPoints: 5 })).status, 'unsupported');
  assert.equal(selectGuide(detectEnvironment({ userAgent: ua })).status, 'unsupported');
});

test('unrecorded older layouts are not silently substituted', () => {
  assert.equal(selectGuide(detectEnvironment({ userAgent: safari(26) })).status, 'unsupported');
  assert.equal(selectGuide(detectEnvironment({ userAgent: safari(17) })).status, 'unsupported');
  assert.equal(selectGuide({ ...detected(), browserMajor: null }).status, 'needs-selection');
});

test('newer releases reuse a layout until a newer layout supersedes it', () => {
  const env = detectEnvironment({ userAgent: safari(28) });
  assert.equal(selectGuide(env).match, 'newer-version');
  const replacement = { ...guides[0], id: 'future-layout', versions: {
    os: { min: 28, max: null }, browser: { min: 28, max: null }, observedOS: 28, observedBrowser: 28,
  }};
  assert.equal(selectGuide(env, { guides: [guides[0], replacement] }).guide.id, 'future-layout');
  assert.equal(selectGuide(detected(), { guides: [guides[0], replacement] }).guide.id, guides[0].id);
});

test('ambiguous OS-specific layouts request manual selection when OS is hidden', () => {
  const other = { ...guides[0], id: 'alternate-os-layout', versions: {
    ...guides[0].versions, os: { min: 28, max: null },
  }};
  assert.equal(selectGuide(detected(), { guides: [guides[0], other] }).status, 'needs-selection');
});

test('manual choice is available even on desktop or in standalone mode', () => {
  const env = { ...detected(), standalone: true };
  assert.equal(selectGuide(env).status, 'installed');
  assert.equal(selectGuide(env, { guideId: guides[0].id }).match, 'manual');
  assert.equal(selectGuide(null, { guideId: guides[0].id }).guide.id, guides[0].id);
  assert.equal(selectGuide(null, { guideId: 'missing' }).status, 'unsupported');
});

test('packaged artwork and text match the canonical source and have four anchors', async () => {
  const guide = guides[0];
  const svg = decodeURIComponent(guide.illustration.src.split(',').slice(1).join(','));
  const source = await readFile(new URL('../guides/ios/safari/iphone/layout-1/install.svg', import.meta.url), 'utf8');
  assert.equal(svg, source);
  assert.equal(guide.illustration.width, 400);
  assert.equal(guide.illustration.height, 2060);
  assert.equal(guide.steps.length, 4);
  for (const step of guide.steps) assert.ok(svg.includes(`id="${step.illustrationFragment}"`));
  assert.equal(guide.text, await readFile(new URL('../guides/ios/safari/iphone/layout-1/instructions.md', import.meta.url), 'utf8'));
  assert.equal((guide.text.match(/^\d\. /gm) ?? []).length, guide.steps.length);
});
