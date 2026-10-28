import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser } from '@xmldom/xmldom';
import { getIllustration, guides } from 'pwa-instructions';
const decode = illustration => decodeURIComponent(illustration.src.slice(illustration.src.indexOf(',') + 1));
const domainTexts = illustration => Array.from(new DOMParser().parseFromString(decode(illustration), 'image/svg+xml').getElementsByTagName('text'))
  .filter(node => node.getAttribute('data-pwa-domain') === 'true');

test('the default and invalid URLs keep the generic illustration', () => {
  for (const guide of guides) {
    for (const siteUrl of [undefined, '', '  ', 'https://', 'javascript:alert(1)', '<script>']) {
      assert.equal(getIllustration(guide, { siteUrl }), guide.illustration);
    }
  }
});

test('only the domain is displayed, with credentials, paths and query strings omitted', () => {
  for (const guide of guides) {
    const original = guide.illustration.src;
    const illustration = getIllustration(guide, { siteUrl: 'https://alice:private-password@crosswithyou.app/game?private-token=123#secret' });
    const texts = domainTexts(illustration);
    assert.ok(texts.length > 0, guide.id);
    assert.ok(texts.every(node => node.textContent === 'crosswithyou.app'));
    assert.ok(illustration.alt.includes('crosswithyou.app'));
    assert.ok(!decode(illustration).includes('private-password'));
    assert.ok(!decode(illustration).includes('private-token'));
    assert.equal(guide.illustration.src, original);
  }
});

test('bare domains and local host ports are accepted without fetching anything', () => {
  assert.ok(domainTexts(getIllustration(guides[0], { siteUrl: 'crosswithyou.app' })).every(node => node.textContent === 'crosswithyou.app'));
  assert.ok(domainTexts(getIllustration(guides[0], { siteUrl: 'http://localhost:4173/test' })).every(node => node.textContent === 'localhost:4173'));
});

test('long domains fit inside address bars and customization does not carry to another render', () => {
  const siteUrl = 'a'.repeat(45) + '.example.org';
  const customized = getIllustration(guides[0], { siteUrl });
  assert.ok(domainTexts(customized).every(node => node.getAttribute('textLength') !== null));
  assert.ok(domainTexts(getIllustration(guides[0])).every(node => node.textContent === 'example.com'));
});

test('externally hosted illustrations are left intact', () => {
  const external = { ...guides[0], illustration: { ...guides[0].illustration, src: '/my-guide.svg' } };
  assert.equal(getIllustration(external, { siteUrl: 'crosswithyou.app' }).src, '/my-guide.svg');
});
