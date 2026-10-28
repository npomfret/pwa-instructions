import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { localeUI } from './i18n.mjs';

const dataUrl = svg => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** A locale's `Record<guideId, LocalizedGuide>`, built from composed guides. */
export function localizedGuides(tag, catalog, composed) {
  return Object.fromEntries(catalog.guides.map(({ id }) => {
    const { steps, svg, text, localized } = composed.get(id);
    return [id, { title: localized.title, label: localized.label, language: tag,
      steps: steps.map(({ id: stepId, title, description, uiLabel }) => ({ id: stepId, title, description, ...(uiLabel ? { uiLabel } : {}) })),
      completion: localized.completion, text, illustration: { src: dataUrl(svg), alt: localized.alt } }];
  }));
}

/**
 * Source of the `pwa-instructions/locales/<tag>` module. The default export is the LocaleData that registerLocale takes;
 * `guides` and `ui` are also named exports.
 */
export function localeModuleSource(tag, catalog, composed, ui) {
  return '/* Generated from guides/ and labels/. Do not edit. */\nimport type { LocaleData, LocaleUI, LocalizedGuide } from "../../types.js";\n' +
    `export const guides: Readonly<Record<string, LocalizedGuide>> = ${JSON.stringify(localizedGuides(tag, catalog, composed), null, 2)};\n` +
    `export const ui: LocaleUI = ${JSON.stringify(ui, null, 2)};\n` +
    'const data: LocaleData = { guides, ui };\nexport default data;\n';
}

/**
 * Write the generated module for each `{tag: composed}` locale and its per-guide assets. Only the tags passed in are
 * written, so the caller decides what is published; draft locales are never passed.
 */
export async function writeLocaleOutputs({ catalog, locales, generated, assets, labels }) {
  await rm(path.join(generated, 'locales'), { recursive: true, force: true });
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
}
