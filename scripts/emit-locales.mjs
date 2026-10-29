import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { localeUI } from './i18n.mjs';

const dataUrl = svg => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/**
 * A locale's `Record<guideId, LocalizedGuide>`, built from composed guides. Besides the resolved text each guide carries
 * the prose templates and label tables that browserLocale needs, and its artwork keeps the `label:*` tags the runtime
 * swaps; the SVG written to dist/assets stays untagged.
 */
export function localizedGuides(tag, catalog, composed) {
  return Object.fromEntries(catalog.guides.map(({ id }) => {
    const { steps, taggedSvg, header, text, localized, templates, labels } = composed.get(id);
    return [id, { title: localized.title, label: localized.label, language: tag,
      steps: steps.map(({ id: stepId, title, description, uiLabel }) => ({ id: stepId, title, description, ...(uiLabel ? { uiLabel } : {}) })),
      completion: localized.completion, text, illustration: { src: dataUrl(taggedSvg), alt: localized.alt, ...(header ? { header } : {}) },
      ...(Object.keys(templates).length ? { templates } : {}), labels }];
  }));
}

/**
 * Source of the `pwa-instructions/locales/<tag>` module. The default export is the LocaleData that registerLocale takes;
 * `guides` and `ui` are also named exports. English has no `ui`: the built-in strings are already English.
 */
export function localeModuleSource(tag, catalog, composed, ui, types = '../../types.js') {
  return `/* Generated from guides/ and labels/. Do not edit. */\nimport type { LocaleData, LocaleUI, LocalizedGuide } from "${types}";\n` +
    `export const guides: Readonly<Record<string, LocalizedGuide>> = ${JSON.stringify(localizedGuides(tag, catalog, composed), null, 2)};\n` +
    (ui ? `export const ui: LocaleUI = ${JSON.stringify(ui, null, 2)};\n` : '') +
    `const data: LocaleData = { guides${ui ? ', ui' : ''} };\nexport default data;\n`;
}

/**
 * Write the generated module for each `{tag: composed}` locale and its per-guide assets. Only the tags passed in are
 * written, so the caller decides what is published; draft locales are never passed. `english` is the composed English
 * guides, written as the opt-in `locales/en` module (tagged artwork and templates for an English page with another
 * browser language); it has no assets, because install.svg and instructions.md already are the English ones.
 * `demo` is `{ folder, locales }`: modules for the example app only (draft locales and en-XA), written without assets.
 */
export async function writeLocaleOutputs({ catalog, locales, english, generated, assets, labels, demo }) {
  await rm(path.join(generated, 'locales'), { recursive: true, force: true });
  await mkdir(path.join(generated, 'locales'), { recursive: true });
  if (english) await writeFile(path.join(generated, 'locales', 'en.ts'), localeModuleSource('en', catalog, english));
  for (const [tag, composed] of locales) {
    await mkdir(path.join(generated, 'locales'), { recursive: true });
    await writeFile(path.join(generated, 'locales', `${tag}.ts`), localeModuleSource(tag, catalog, composed, localeUI(labels, tag)));
    for (const { id } of catalog.guides) {
      const target = path.join(assets, id, tag);
      await mkdir(target, { recursive: true });
      await writeFile(path.join(target, 'install.svg'), composed.get(id).svg);
      await writeFile(path.join(target, 'instructions.md'), composed.get(id).text);
    }
  }
  // The demo may also show draft locales. They go to its own folder, never to the package or its assets.
  if (demo) {
    await rm(demo.folder, { recursive: true, force: true });
    await mkdir(demo.folder, { recursive: true });
    for (const [tag, composed] of demo.locales) {
      await writeFile(path.join(demo.folder, `${tag}.ts`), localeModuleSource(tag, catalog, composed, localeUI(labels, tag), 'pwa-instructions'));
    }
  }
}
