import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { InstallInstructions, InstallGuideView, guides } from '@pwa-instructions/react';

const id = guides[0].id;

test('React renders the illustration and all numbered text steps', () => {
  const html = renderToStaticMarkup(h(InstallInstructions, { guideId: id }));
  assert.equal((html.match(/<li>/g) ?? []).length, 4);
  assert.ok(html.includes('<img'));
  assert.ok(html.includes('aria-labelledby='));
  assert.ok(html.includes('alt="Four steps:'));
  assert.ok(html.includes('width="400" height="2060"'));
});

test('text and image presentations work independently', () => {
  const text = renderToStaticMarkup(h(InstallGuideView, { guide: guides[0], presentation: 'text' }));
  assert.ok(!text.includes('<img'));
  assert.ok(text.includes('<ol>'));
  const image = renderToStaticMarkup(h(InstallInstructions, { guideId: id, presentation: 'image' }));
  assert.ok(image.includes('<img'));
  assert.ok(!image.includes('<ol>'));
  assert.ok(image.includes('confirmation screen'));
});

test('the host can override the image URL and style the wrapper', () => {
  const html = renderToStaticMarkup(h(InstallInstructions, { guideId: id, illustrationSrc: '/guides/install.svg', className: 'my-guide' }));
  assert.ok(html.includes('src="/guides/install.svg"'));
  assert.ok(html.includes('class="my-guide"'));
});

test('SSR emits a fallback without accessing browser globals', () => {
  const html = renderToString(h(InstallInstructions, { fallback: result => h('p', null, result.status) }));
  assert.ok(html.includes('needs-selection'));
  assert.ok(!html.includes('<img'));
});

test('client hydration detects Safari and reveals the guide without mismatches', async () => {
  const element = h(InstallInstructions, { fallback: h('p', null, 'Choose a guide') });
  const dom = new JSDOM(`<div id="root">${renderToString(element)}</div>`, { url: 'https://example.test/' });
  Object.defineProperty(dom.window.navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Version/27.0 Mobile/15E148 Safari/604.1' });
  const previous = { window: globalThis.window, document: globalThis.document, act: globalThis.IS_REACT_ACT_ENVIRONMENT };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let root;
  try {
    const { hydrateRoot } = await import('react-dom/client');
    const errors = [];
    await act(async () => { root = hydrateRoot(dom.window.document.getElementById('root'), element, { onRecoverableError: error => errors.push(error) }); });
    assert.equal(errors.length, 0);
    assert.equal(dom.window.document.querySelectorAll('li').length, 4);
    assert.ok(dom.window.document.querySelector('img'));
    await act(async () => { root.render(h(InstallInstructions, { environment: null, fallback: h('p', null, 'Manual selection') })); });
    assert.equal(dom.window.document.querySelectorAll('li').length, 0);
    assert.ok(dom.window.document.body.textContent.includes('Manual selection'));
  } finally {
    if (root) await act(async () => root.unmount());
    dom.window.close();
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act;
  }
});


test('the illustration has a separate semantic container and caption', () => {
  const html = renderToStaticMarkup(h(InstallInstructions, { guideId: id }));
  assert.ok(html.includes('<figure'));
  assert.ok(html.includes('<figcaption>Illustrated guide</figcaption>'));
  assert.ok(html.indexOf('</figure>') < html.indexOf('<ol>'));
});

test('Brave and Mac guides render all their own steps', () => {
  for (const [guideId, count] of [['ios-brave-iphone-layout-1', 7], ['macos-safari-desktop-layout-1', 3]]) {
    const html = renderToStaticMarkup(h(InstallInstructions, { guideId, presentation: 'text' }));
    assert.equal((html.match(/<li>/g) ?? []).length, count);
  }
});


test('the optional siteUrl prop personalizes the bundled image without requiring a custom component', () => {
  const html = renderToStaticMarkup(h(InstallInstructions, { guideId: id, siteUrl: 'https://crosswithyou.app/play' }));
  assert.ok(html.includes('crosswithyou.app'));
  assert.ok(html.includes('Website: crosswithyou.app.'));
  assert.ok(!html.includes('crosswithyou.app/play'));
  const other = renderToStaticMarkup(h(InstallGuideView, { guide: guides[0], siteUrl: 'another.example' }));
  assert.ok(other.includes('another.example'));
  assert.ok(!other.includes('crosswithyou.app'));
});
