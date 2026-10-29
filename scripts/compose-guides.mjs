import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { DEFAULT_LOCALE, loadLabels, labelResolver, labelled, loadGuideLocale, localizeDocument, checkLabelTags,
  stripLocalization, fillText, usedLabelIds } from './i18n.mjs';

const ns = 'http://www.w3.org/2000/svg';
const children = node => Array.from(node.childNodes).filter(child => child.nodeType === 1);
const elements = node => [node, ...Array.from(node.getElementsByTagName('*'))];
const byId = (doc, id) => Array.from(doc.getElementsByTagName('*')).find(node => node.getAttribute('id') === id);
const parse = text => new DOMParser().parseFromString(text, 'image/svg+xml');

/** Replace `{step:n}` placeholders with step numbers shifted by `offset`. */
const renumber = (text, offset, render) => text.replace(/\{step:(\d+)\}/g, (_, n) => render(Number(n) + offset));
const keepPlaceholder = n => `{step:${n}}`;
const plainNumber = n => String(n);

function markdownTitle(step) {
  return step.uiLabel ? step.title.replace(step.uiLabel, `*${step.uiLabel}*`) : step.title;
}
/** The same emphasis on a template title, where the control is still its first `{label:id}` placeholder. */
const markdownTemplateTitle = step => step.title.replace(/\{label:[a-z0-9-]+\}/, placeholder => `*${placeholder}*`);

function styleTitle(doc, node, step, fit, width) {
  const offset = step.uiLabel ? step.title.indexOf(step.uiLabel) : -1;
  // The control inside the title is tagged with its label id, and the title keeps how it is fitted, so the runtime can
  // redraw it with the browser's label (artwork.ts). Both are removed from the published SVGs.
  const label = offset < 0 ? undefined : /\{label:([a-z0-9-]+)\}/.exec(step.template?.title ?? '')?.[1];
  if (label) {
    node.setAttribute('data-max-width', String(width));
    node.setAttribute('data-lines', '2');
    node.setAttribute('data-line-height', '26');
  }
  if (fit) {
    // Localized titles may be longer than the artwork: wrap to two lines, else squeeze.
    const segments = offset < 0 ? [{ text: step.title }] : [{ text: step.title.slice(0, offset) },
      { text: step.uiLabel, italic: true, label }, { text: step.title.slice(offset + step.uiLabel.length) }];
    fillText(doc, node, segments.filter(item => item.text), { max: fit, lines: 2, lineHeight: 26 });
    return;
  }
  node.textContent = "";
  if (offset < 0) { node.textContent = step.title; return; }
  node.appendChild(doc.createTextNode(step.title.slice(0, offset)));
  const span = doc.createElementNS(ns, 'tspan');
  span.setAttribute('font-style', 'italic');
  if (label) span.setAttribute('data-i18n', `label:${label}`);
  span.textContent = step.uiLabel;
  node.appendChild(span);
  node.appendChild(doc.createTextNode(step.title.slice(offset + step.uiLabel.length)));
}

function scope(node, prefix) {
  for (const item of elements(node)) {
    if (item.hasAttribute('id')) item.setAttribute('id', prefix + item.getAttribute('id'));
    if (item.hasAttribute('class')) item.setAttribute('class', item.getAttribute('class').split(/\s+/).map(name => prefix + name).join(' '));
    if (item.hasAttribute('href') && item.getAttribute('href').startsWith('#')) item.setAttribute('href', '#' + prefix + item.getAttribute('href').slice(1));
    if (item.hasAttribute('aria-labelledby')) item.setAttribute('aria-labelledby', item.getAttribute('aria-labelledby').split(/\s+/).map(id => prefix + id).join(' '));
  }
  return node;
}

/**
 * Reuse source panels and text, then return each guide's complete, standalone SVG and Markdown in `locale`.
 * Writes nothing. A guide's artwork is `artworkSource`, or `install.source.svg` when it is not composed from panels;
 * `install.svg` is always generated output. Each result also carries what the runtime needs to swap in another locale's
 * control names: `templates` (the prose strings that name a label, with `{label:id}` kept), `labels` (the text of every
 * label the templates and artwork use, by locale tag, this one and English) and `taggedSvg` (the artwork with its
 * `label:*` tags kept).
 */
export async function composeGuides(root, catalog, locale = DEFAULT_LOCALE) {
  const english = locale === DEFAULT_LOCALE;
  const labels = await loadLabels(root);
  const records = new Map();
  for (const entry of catalog.guides) {
    const file = path.join(root, entry.path);
    records.set(entry.id, { data: JSON.parse(await readFile(file, 'utf8')), folder: path.dirname(file), surfaces: entry.labelSurfaces ?? [] });
  }
  const documentLabels = labelResolver(labels, ['document'], locale);
  const resolved = new Map();
  const visiting = new Set();
  async function resolve(id) {
    if (resolved.has(id)) return resolved.get(id);
    if (visiting.has(id)) throw new Error(`Circular guide reuse: ${id}`);
    const record = records.get(id);
    if (!record) throw new Error(`Unknown referenced guide: ${id}`);
    visiting.add(id);
    const { data, folder, surfaces } = record;
    const doc = parse(await readFile(path.join(folder, data.artworkSource ?? 'install.source.svg'), 'utf8'));
    const svg = doc.documentElement;
    // Labels, tagged text and prose all resolve here, in this guide's own surfaces, before any panel is imported elsewhere.
    const resolver = labelResolver(labels, surfaces, locale);
    const lookups = [{ locale: resolver, english: labelResolver(labels, surfaces, DEFAULT_LOCALE) }];
    checkLabelTags(doc, labelResolver(labels, surfaces, DEFAULT_LOCALE), id);
    const strings = english ? null : await loadGuideLocale({ folder, data, tag: locale, resolver: labelResolver(labels, surfaces, DEFAULT_LOCALE), document: doc });
    if (strings) localizeDocument(doc, { tag: locale, resolver, locale: strings, guideId: id });
    const viewBoxWidth = Number(svg.getAttribute('viewBox').split(/\s+/)[2]);
    /** A step's text in this locale: label placeholders filled, `{step:n}` kept, and the named control as `uiLabel`. */
    const localize = (base, entry) => {
      const { uiLabel, ...rest } = base;
      const control = resolver.firstLabel(entry.title);
      return { ...rest, ...(control === undefined ? {} : { uiLabel: control }),
        title: resolver.fill(entry.title), description: resolver.fill(entry.description),
        template: { title: entry.title, description: entry.description } };
    };
    /** English steps get the template a translator would see: only the named control becomes a placeholder. */
    const annotate = base => ({ ...base, template: { title: labelled(base.title, base.uiLabel, resolver), description: labelled(base.description, base.uiLabel, resolver) } });
    const imported = new Set();
    const steps = [];
    const templates = [];
    const rawSteps = [];
    let transitionSpace = 0;
    for (let index = 0; index < data.steps.length; index++) {
      const raw = data.steps[index];
      let step = !raw.id ? raw : english ? annotate(raw) : localize(raw, strings.steps[raw.id]);
      let panel = byId(doc, `step-${index + 1}`);
      if (raw.reuse) {
        const source = await resolve(raw.reuse.guideId);
        const sourceIndex = source.rawSteps.findIndex(item => item.id === raw.reuse.stepId);
        if (sourceIndex < 0) throw new Error(`Missing reusable step ${raw.reuse.stepId}`);
        const offset = index - sourceIndex;
        const sourceStep = source.rawSteps[sourceIndex];
        // The source's rawSteps are already in this locale, so a reused step takes the source guide's translation.
        const override = strings?.overrides?.[raw.reuse.stepId];
        const base = override ? localize(sourceStep, override) : sourceStep;
        step = { ...base, id: `${raw.reuse.guideId}-${sourceStep.id}`, description: renumber(base.description, offset, keepPlaceholder),
          template: { title: base.template.title, description: renumber(base.template.description, offset, keepPlaceholder) } };
        lookups.push(...source.lookups);
        if (raw.reuse.artwork) {
          const prefix = `shared-${raw.reuse.guideId}-`;
          if (!imported.has(raw.reuse.guideId)) {
            const targetDefs = svg.getElementsByTagName('defs')[0];
            for (const definition of children(source.document.getElementsByTagName('defs')[0])) {
              targetDefs.appendChild(scope(doc.importNode(definition, true), prefix));
            }
            for (const style of Array.from(source.document.getElementsByTagName('style'))) {
              const scopedStyle = doc.createElementNS(ns, 'style');
              scopedStyle.textContent = style.textContent.replace(/\.([a-zA-Z_][\w-]*)/g, (_, name) => '.' + prefix + name);
              svg.appendChild(scopedStyle);
            }
            imported.add(raw.reuse.guideId);
          }
          const sourcePanel = byId(source.document, sourceStep.illustrationFragment);
          if (!sourcePanel) throw new Error(`Missing source panel ${sourceStep.illustrationFragment}`);
          if (panel) panel.parentNode.removeChild(panel);
          panel = scope(doc.importNode(sourcePanel, true), prefix);
          svg.appendChild(panel);
        }
      }
      if (!panel) throw new Error(`Missing panel ${index + 1} in ${id}`);
      if (raw.transitionBefore) {
        transitionSpace += 70;
        const heading = doc.createElementNS(ns, 'text');
        heading.setAttribute('x', '28');
        heading.setAttribute('y', String(100 + index * 490 + transitionSpace - 35));
        heading.setAttribute('class', 'step-title');
        svg.appendChild(heading);
        if (english) heading.textContent = raw.transitionBefore;
        else fillText(doc, heading, [{ text: resolver.fill(strings.transitions[raw.transitionId]) }], { max: viewBoxWidth - 56 });
      }
      if (data.artworkSource) panel.setAttribute('transform', `translate(28 ${100 + index * 490 + transitionSpace})`);
      panel.setAttribute('id', `step-${index + 1}`);
      panel.setAttribute('aria-labelledby', `step-${index + 1}-title`);
      const title = children(panel).find(item => item.tagName === 'text' && (item.getAttribute('id') ?? '').endsWith('-title'));
      const number = children(panel).find(item => item.tagName === 'text' && item.getAttribute('text-anchor') === 'middle');
      if (title) { title.setAttribute('id', `step-${index + 1}-title`); styleTitle(doc, title, step, english ? 0 : viewBoxWidth - 76, viewBoxWidth - 76); }
      if (number) number.textContent = String(index + 1);
      const { reuse, transitionBefore, transitionId, ...plainStep } = step;
      rawSteps.push({ ...plainStep, illustrationFragment: `step-${index + 1}` });
      const { template, ...visible } = rawSteps[index];
      steps.push({ ...visible, description: renumber(plainStep.description, 0, plainNumber) });
      templates.push({ title: renumber(template.title, 0, plainNumber), description: renumber(template.description, 0, plainNumber) });
    }
    if (steps.length !== data.illustration.stepCount) throw new Error(`Step count mismatch: ${id}`);
    if (data.artworkSource) {
      const height = 100 + steps.length * 490 + transitionSpace;
      svg.setAttribute('height', String(height));
      svg.setAttribute('viewBox', `0 0 400 ${height}`);
      for (const child of children(svg)) if (child.tagName === 'rect' && child.getAttribute('width') === '400') child.setAttribute('height', String(height));
      byId(doc, 'title').textContent = english ? data.title : strings.title;
      byId(doc, 'description').textContent = english ? data.illustration.alt : strings.alt;
    }
    // The tagged document stays intact for guides that import its panels; the output copies have the markup removed, or
    // for `taggedSvg` only the `label:*` tags kept.
    const serialized = new XMLSerializer().serializeToString(doc);
    const output = parse(serialized);
    stripLocalization(output);
    const svgText = new XMLSerializer().serializeToString(output).trimEnd() + '\n';
    const tagged = parse(serialized);
    stripLocalization(tagged, { keepLabels: true });
    const taggedSvg = new XMLSerializer().serializeToString(tagged).trimEnd() + '\n';
    const localized = english ? { title: data.title, label: data.label ?? data.title, alt: data.illustration.alt, completion: data.completion.description }
      : { title: strings.title, label: strings.label, alt: strings.alt, completion: resolver.fill(strings.completion) };
    const introSource = english ? data.intro : strings.intro && resolver.fill(strings.intro);
    const intro = introSource ? renumber(introSource, 0, plainNumber) : '';
    const templateCompletion = english ? data.completion.description : strings.completion;
    const templateIntro = (english ? data.intro : strings.intro) ?? '';
    const markdown = (items, titleOf, completion, introText) => `# ${localized.title}\n\n` + (introText ? introText + '\n\n' : '') +
      items.map((step, index) => `${index + 1}. **${titleOf(step)}.** ${step.description}`).join('\n') +
      `\n\n${completion}\n\n${documentLabels.get('illustration')} [${data.illustration.file}](${data.illustration.file}). ${documentLabels.get('steps-match')}\n\n${documentLabels.get('evidence')} [metadata.json](metadata.json).\n`;
    const text = markdown(steps, markdownTitle, localized.completion, intro);
    const templateText = markdown(templates, markdownTemplateTitle, templateCompletion, renumber(templateIntro, 0, plainNumber));
    // Only strings that name a label differ from their template, so only those are kept.
    const named = Object.fromEntries(steps.flatMap((step, index) =>
      templates[index].title !== step.title || templates[index].description !== step.description ? [[step.id, templates[index]]] : []));
    const sparse = { ...(Object.keys(named).length ? { steps: named } : {}),
      ...(templateCompletion !== localized.completion ? { completion: templateCompletion } : {}),
      ...(templateText !== text ? { text: templateText } : {}) };
    const ids = usedLabelIds([...templates.flatMap(item => [item.title, item.description]), templateCompletion, templateText], tagged);
    const table = pick => Object.fromEntries(ids.map(id => {
      const found = lookups.map(pick).find(item => item.has(id));
      if (!found) throw new Error(`${data.id}: no label surface defines ${id}`);
      return [id, found.get(id)];
    }));
    const labelTable = { ...(english ? {} : { [locale]: table(item => item.locale) }), [DEFAULT_LOCALE]: table(item => item.english) };
    const result = { ...record, steps, rawSteps, lookups, document: doc, svg: svgText, taggedSvg, text, locale, localized, templates: sparse, labels: labelTable };
    visiting.delete(id);
    resolved.set(id, result);
    return result;
  }
  for (const entry of catalog.guides) await resolve(entry.id);
  return resolved;
}
