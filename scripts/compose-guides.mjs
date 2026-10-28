import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const ns = 'http://www.w3.org/2000/svg';
const children = node => Array.from(node.childNodes).filter(child => child.nodeType === 1);
const elements = node => [node, ...Array.from(node.getElementsByTagName('*'))];
const byId = (doc, id) => Array.from(doc.getElementsByTagName('*')).find(node => node.getAttribute('id') === id);
const parse = text => new DOMParser().parseFromString(text, 'image/svg+xml');

async function writeChanged(file, value) {
  let old;
  try { old = await readFile(file, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (old !== value) await writeFile(file, value);
}

function markdownTitle(step) {
  return step.uiLabel ? step.title.replace(step.uiLabel, `*${step.uiLabel}*`) : step.title;
}

function styleTitle(doc, node, step) {
  const offset = step.uiLabel ? step.title.indexOf(step.uiLabel) : -1;
  node.textContent = "";
  if (offset < 0) { node.textContent = step.title; return; }
  node.appendChild(doc.createTextNode(step.title.slice(0, offset)));
  const label = doc.createElementNS(ns, 'tspan');
  label.setAttribute('font-style', 'italic');
  label.textContent = step.uiLabel;
  node.appendChild(label);
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

/** Reuse source panels and text, then emit a complete, standalone SVG and Markdown. */
export async function composeGuides(root, catalog) {
  const records = new Map();
  for (const entry of catalog.guides) {
    const file = path.join(root, entry.path);
    records.set(entry.id, { data: JSON.parse(await readFile(file, 'utf8')), folder: path.dirname(file) });
  }
  const resolved = new Map();
  const visiting = new Set();
  async function resolve(id) {
    if (resolved.has(id)) return resolved.get(id);
    if (visiting.has(id)) throw new Error(`Circular guide reuse: ${id}`);
    const record = records.get(id);
    if (!record) throw new Error(`Unknown referenced guide: ${id}`);
    visiting.add(id);
    const { data, folder } = record;
    const doc = parse(await readFile(path.join(folder, data.artworkSource ?? data.illustration.file), 'utf8'));
    const svg = doc.documentElement;
    const imported = new Set();
    const steps = [];
    let transitionSpace = 0;
    for (let index = 0; index < data.steps.length; index++) {
      const raw = data.steps[index];
      let step = raw;
      let panel = byId(doc, `step-${index + 1}`);
      if (raw.reuse) {
        const source = await resolve(raw.reuse.guideId);
        const sourceIndex = source.steps.findIndex(item => item.id === raw.reuse.stepId);
        if (sourceIndex < 0) throw new Error(`Missing reusable step ${raw.reuse.stepId}`);
        const offset = index - sourceIndex;
        const sourceStep = source.steps[sourceIndex];
        step = { ...sourceStep, id: `${raw.reuse.guideId}-${sourceStep.id}`,
          description: sourceStep.description.replace(/step (\d+)/gi, (_, n) => `step ${Number(n) + offset}`) };
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
        heading.textContent = raw.transitionBefore;
        svg.appendChild(heading);
      }
      if (data.artworkSource) panel.setAttribute('transform', `translate(28 ${100 + index * 490 + transitionSpace})`);
      panel.setAttribute('id', `step-${index + 1}`);
      panel.setAttribute('aria-labelledby', `step-${index + 1}-title`);
      const title = children(panel).find(item => item.tagName === 'text' && (item.getAttribute('id') ?? '').endsWith('-title'));
      const number = children(panel).find(item => item.tagName === 'text' && item.getAttribute('text-anchor') === 'middle');
      if (title) { title.setAttribute('id', `step-${index + 1}-title`); styleTitle(doc, title, step); }
      if (number) number.textContent = String(index + 1);
      const { reuse, transitionBefore, ...plainStep } = step;
      steps.push({ ...plainStep, illustrationFragment: `step-${index + 1}` });
    }
    if (steps.length !== data.illustration.stepCount) throw new Error(`Step count mismatch: ${id}`);
    let svgText;
    if (data.artworkSource) {
      const height = 100 + steps.length * 490 + transitionSpace;
      svg.setAttribute('height', String(height));
      svg.setAttribute('viewBox', `0 0 400 ${height}`);
      for (const child of children(svg)) if (child.tagName === 'rect' && child.getAttribute('width') === '400') child.setAttribute('height', String(height));
      byId(doc, 'title').textContent = data.title;
      byId(doc, 'description').textContent = data.illustration.alt;
    }
    svgText = new XMLSerializer().serializeToString(doc).trimEnd() + '\n';
    await writeChanged(path.join(folder, data.illustration.file), svgText);
    const text = `# ${data.title}\n\n` + (data.intro ? data.intro + '\n\n' : '') +
      steps.map((step, index) => `${index + 1}. **${markdownTitle(step)}.** ${step.description}`).join('\n') +
      `\n\n${data.completion.description}\n\nIllustration: [${data.illustration.file}](${data.illustration.file}). The numbered steps match this text.\n\nVersion observations and source evidence: [metadata.json](metadata.json).\n`;
    await writeChanged(path.join(folder, data.textInstructions), text);
    const result = { ...record, steps, document: doc, svg: svgText, text };
    visiting.delete(id);
    resolved.set(id, result);
    return result;
  }
  for (const entry of catalog.guides) await resolve(entry.id);
  return resolved;
}
