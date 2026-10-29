import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DOMParser } from '@xmldom/xmldom';
import { DEFAULT_LOCALE, LABEL_VARIANTS, PSEUDO_LOCALE, estimateWidth, fontOf, labelResolver, labelled, loadGuideLocale, loadLabels } from './i18n.mjs';

/*
 * Completeness checks for locale data, run by the build (so `npm run check` fails on any error) and on their own:
 *   node scripts/check-locales.mjs [--help]
 *
 * Every catalog locale is checked, draft or complete. Rules marked "complete only" report as errors for a `complete`
 * locale and as warnings for a `draft`; every other rule is an error either way. The build's own loaders (loadGuideLocale,
 * labelResolver, checkLabelTags) still throw on the first problem they meet when composing; this reports all of them at once.
 *
 *  1. Complete only: every guide has a title and description for each step (reuse resolved), plus title, label, intro,
 *     completion, alt, transitions, and the locale's `ui` strings.
 *  2. Translated strings carry the same {step:n} placeholders as English, any label the English names as a control, and
 *     only label ids the guide's labelSurfaces define.
 *  3. Complete only: every label a guide uses resolves for the locale, with no silent English fallback. This is also
 *     what makes a locale module's label table complete: the table holds each label the guide's templates and artwork
 *     tags name, including those of panels reused from another guide, which browserLocale substitutes at runtime.
 *  4. Source SVG data-i18n keys have English text and, in a complete locale, a translation; no visible text is untagged.
 *  5. Complete only: every non-English label value has a source record (_src).
 *  6. No empty strings or TODO markers; a string identical to English is a warning.
 *  7. Estimated width against data-max-width: warn at OVERFLOW_WARN, fail at OVERFLOW_FAIL.
 *  8. The catalog `locales` list and the locale files present agree; an unlisted file is an orphan.
 *  9. Tags are canonical and each file name is its tag.
 *
 * Label-only variants (LABEL_VARIANTS, `en-US`) are not catalog locales: no prose, status or completeness rules apply, and
 * they are never orphans. Their label values still get rules 2 and 6, and rule 5 as an error: a value that differs from
 * its base is a claim about what another browser shows, so it needs a source. Labels without a value inherit the base.
 */

export const OVERFLOW_WARN = 1.0;
export const OVERFLOW_FAIL = 1.3;

/**
 * Rule 5 applies to labels a browser or OS shows. English labels are exempt: they are the source strings, captured once
 * from the screenshots under source-images/ and checked against the artwork by checkLabelTags, so no per-label record
 * exists to demand. The `ui` and `document` surfaces are this package's own interface and template text, not browser
 * strings, so they have no browser to source them from either.
 */
const UNSOURCED_SURFACES = new Set(['ui', 'document']);
/** The fields a `_src` record needs: how the text was obtained, where (URL or capture reference), when, and on what. */
const SOURCE_FIELDS = ['method', 'source', 'verified', 'version'];
/** Product names that are never translated, so being identical to English is expected (rule 6). */
const BRAND_NAMES = new Set(['Safari', 'Chrome', 'Brave', 'Edge', 'Firefox', 'Opera', 'Samsung Internet', 'Windows', 'macOS', 'iOS', 'Android', 'iPhone', 'iPad', 'Mac']);
/** Source SVG text that is deliberately untagged (rule 4): step and badge numbers, the status-bar clock, the placeholder domain, and the macOS app-menu name. */
const UNTAGGED_TEXT = [/^\d+$/, /^\d{1,2}:\d{2}$/, /^example\.com$/, /^Safari$/];

const TOKEN = /\{[^}]*\}/g;
const tokens = text => text.match(TOKEN) ?? [];
const parse = text => new DOMParser().parseFromString(text, 'image/svg+xml');
const readText = file => readFile(file, 'utf8').then(text => text, error => { if (error.code === 'ENOENT') return null; throw error; });
const canonical = tag => { try { return Intl.getCanonicalLocales(tag)[0] === tag; } catch { return false; } };
/** True when the resolver has text for `id` in its own locale; the resolver never falls back to English. */
const resolves = (resolver, id) => { try { resolver.get(id); return true; } catch { return false; } };
const pct = ratio => `${Math.round(ratio * 100)}%`;
const strings = value => (typeof value === 'string' ? [['', value]] : value && typeof value === 'object'
  ? Object.entries(value).flatMap(([key, item]) => strings(item).map(([sub, text]) => [sub ? `${key}.${sub}` : key, text])) : []);

export async function checkLocales(root) {
  const errors = [];
  const warnings = [];
  const rel = file => path.relative(root, file);
  /** Record a problem; `soft` ones (complete-only rules) are warnings on a draft locale. */
  const report = (list, rule, file, key, tag, message) => list.push({ rule, text: `${rel(file)}: ${key} [${tag}] ${message} (rule ${rule})` });
  const completeOnly = (statuses, tag) => (statuses[tag] === 'complete' ? errors : warnings);

  const catalogFile = path.join(root, 'catalog.json');
  const catalog = JSON.parse(await readFile(catalogFile, 'utf8'));
  const statuses = catalog.locales ?? {};
  const tags = Object.keys(statuses).filter(tag => tag !== DEFAULT_LOCALE);
  const labels = await loadLabels(root);

  // --- Rules 8 and 9: tags, statuses and the files that exist ---------------------------------------------------
  for (const tag of tags) {
    if (!canonical(tag)) report(errors, 9, catalogFile, `locales.${tag}`, tag, 'is not a canonical locale tag');
    if (!['draft', 'complete'].includes(statuses[tag])) report(errors, 8, catalogFile, `locales.${tag}`, tag, `has status "${statuses[tag]}", expected draft or complete`);
  }
  const records = [];
  for (const entry of catalog.guides) {
    const file = path.join(root, entry.path);
    const data = JSON.parse(await readFile(file, 'utf8'));
    const folder = path.dirname(file);
    const source = path.join(folder, data.artworkSource ?? 'install.source.svg');
    records.push({ entry, data, folder, file, source, document: parse(await readFile(source, 'utf8')), surfaces: entry.labelSurfaces ?? [], files: new Map() });
  }
  const byId = new Map(records.map(record => [record.data.id, record]));
  const guideFolders = new Set(records.map(record => record.folder));
  const listed = new Set();
  for (const item of await readdir(path.join(root, 'guides'), { recursive: true, withFileTypes: true })) {
    if (!item.isFile() || !item.name.endsWith('.json') || path.basename(item.parentPath) !== 'locales') continue;
    const file = path.join(item.parentPath, item.name);
    const tag = item.name.slice(0, -'.json'.length);
    if (!canonical(tag)) report(errors, 9, file, 'file name', tag, 'is not a canonical locale tag');
    if (!guideFolders.has(path.dirname(item.parentPath))) report(errors, 8, file, 'file', tag, 'belongs to no guide in catalog.json');
    else if (!(tag in statuses)) report(errors, 8, file, 'file', tag, 'is an orphan: catalog.json "locales" does not list it');
    else records.find(record => record.folder === path.dirname(item.parentPath)).files.set(tag, file);
    listed.add(tag);
  }
  for (const [surface, entries] of labels) {
    const file = path.join(root, 'labels', `${surface}.json`);
    for (const [id, entry] of Object.entries(entries)) {
      for (const tag of new Set([...Object.keys(entry), ...Object.keys(entry._src ?? {})].filter(key => key !== DEFAULT_LOCALE && key !== '_src'))) {
        if (!canonical(tag)) report(errors, 9, file, id, tag, 'is not a canonical locale tag');
        else if (tag in LABEL_VARIANTS) continue;
        else if (!(tag in statuses)) report(errors, 8, file, id, tag, 'is an orphan: catalog.json "locales" does not list it');
        listed.add(tag);
      }
    }
  }
  for (const tag of tags.filter(item => item !== PSEUDO_LOCALE && !listed.has(item))) {
    report(completeOnly(statuses, tag), 8, catalogFile, `locales.${tag}`, tag, 'is listed but no locale file or label exists for it');
  }

  // --- Rule 4, per guide: the source SVG's keys and untagged text ----------------------------------------------
  for (const record of records) {
    const { document, source, surfaces } = record;
    const english = labelResolver(labels, surfaces, DEFAULT_LOCALE);
    record.english = english;
    record.guideKeys = new Map();
    record.labelIds = new Set();
    const elements = Array.from(document.getElementsByTagName('*'));
    for (const node of elements) {
      const key = node.getAttribute('data-i18n');
      if (!key) continue;
      const [kind, name] = key.split(':');
      if (kind === 'label') {
        record.labelIds.add(name);
        if (!english.has(name)) report(errors, 4, source, key, DEFAULT_LOCALE, `has no English label in surfaces ${surfaces.join(', ')}`);
        else if (english.get(name) !== node.textContent && !node.hasAttribute('data-lines')) report(errors, 4, source, key, DEFAULT_LOCALE, `text "${node.textContent}" differs from the English label "${english.get(name)}"`);
      } else if (kind === 'guide') {
        record.guideKeys.set(name, node.textContent);
        if (!node.textContent.trim()) report(errors, 4, source, key, DEFAULT_LOCALE, 'has no English text');
      } else if (key !== 'step' && key !== 'follow') report(errors, 4, source, key, DEFAULT_LOCALE, 'is not label:*, guide:*, step or follow');
      if (node.hasAttribute('data-max-width') && !(Number(node.getAttribute('data-max-width')) > 0)) report(errors, 7, source, key, DEFAULT_LOCALE, 'has a data-max-width that is not a positive number');
    }
    const tagged = node => { for (let item = node; item && item.nodeType === 1; item = item.parentNode) if (item.hasAttribute('data-i18n') || item.hasAttribute('data-pwa-domain')) return true; return false; };
    // A composed guide's root <title> and <desc> are written by the composer from the guide data, so they carry no tag.
    const generated = node => record.data.artworkSource && node.parentNode === document.documentElement && ['title', 'description'].includes(node.getAttribute('id'));
    for (const node of elements.filter(item => ['text', 'title', 'desc'].includes(item.tagName) && !generated(item))) {
      const text = node.textContent.trim();
      if (text && !tagged(node) && !UNTAGGED_TEXT.some(pattern => pattern.test(text))) report(errors, 4, source, `<${node.tagName}> "${text}"`, DEFAULT_LOCALE, 'is visible text with no data-i18n tag');
    }
    record.viewBoxWidth = Number(document.documentElement.getAttribute('viewBox')?.split(/\s+/)[2]) || 400;
  }

  // --- Label-only variants: rules 2, 5 and 6 on the values they override ---------------------------------------------
  for (const [tag, base] of Object.entries(LABEL_VARIANTS)) {
    for (const [surface, entries] of labels) {
      const file = path.join(root, 'labels', `${surface}.json`);
      for (const [id, entry] of Object.entries(entries)) {
        const text = entry[tag];
        if (text === undefined) continue;
        if (typeof text !== 'string' || !text.trim()) { report(errors, 6, file, `${id}.${tag}`, tag, 'is an empty string'); continue; }
        if (/TODO/.test(text)) report(errors, 6, file, `${id}.${tag}`, tag, 'contains a TODO marker');
        if (tokens(entry[base]).sort().join() !== tokens(text).sort().join()) report(errors, 2, file, `${id}.${tag}`, tag, `has placeholders ${tokens(text).join(' ') || 'none'}, ${base} has ${tokens(entry[base]).join(' ') || 'none'}`);
        if (text === entry[base]) report(warnings, 6, file, `${id}.${tag}`, tag, `is identical to the ${base} text, so it should be omitted`);
        const source = entry._src?.[tag];
        const missing = source ? SOURCE_FIELDS.filter(field => typeof source[field] !== 'string' || !source[field].trim()) : SOURCE_FIELDS;
        if (!source) report(errors, 5, file, `${id}._src.${tag}`, tag, `has no source record (needs ${SOURCE_FIELDS.join(', ')})`);
        else if (missing.length) report(errors, 5, file, `${id}._src.${tag}`, tag, `source record lacks ${missing.join(', ')}`);
        else if (!(Date.parse(source.verified) <= Date.now()) || !/^\d{4}-\d{2}-\d{2}$/.test(source.verified)) report(errors, 5, file, `${id}._src.${tag}`, tag, `has verified date "${source.verified}", expected a past YYYY-MM-DD`);
      }
    }
  }

  // --- Per locale ------------------------------------------------------------------------------------------------
  for (const tag of tags) {
    const soft = completeOnly(statuses, tag);
    const pseudo = tag === PSEUDO_LOCALE;

    // Labels (rules 2, 5, 6): every non-English value in this locale.
    for (const [surface, entries] of labels) {
      const file = path.join(root, 'labels', `${surface}.json`);
      for (const [id, entry] of Object.entries(entries)) {
        for (const [key, text] of [[`${id}.${DEFAULT_LOCALE}`, entry[DEFAULT_LOCALE]], [`${id}.${tag}`, entry[tag]]]) {
          if (typeof text === 'string' && !text.trim()) report(errors, 6, file, key, tag, 'is an empty string');
          else if (typeof text === 'string' && /TODO/.test(text)) report(errors, 6, file, key, tag, 'contains a TODO marker');
        }
        if (typeof entry[tag] !== 'string' || !entry[tag].trim()) continue;
        if (tokens(entry.en).sort().join() !== tokens(entry[tag]).sort().join()) report(errors, 2, file, `${id}.${tag}`, tag, `has placeholders ${tokens(entry[tag]).join(' ') || 'none'}, English has ${tokens(entry.en).join(' ') || 'none'}`);
        if (entry[tag] === entry.en && !BRAND_NAMES.has(entry.en)) report(warnings, 6, file, `${id}.${tag}`, tag, 'is identical to the English text');
        if (!UNSOURCED_SURFACES.has(surface)) {
          const source = entry._src?.[tag];
          const missing = source ? SOURCE_FIELDS.filter(field => typeof source[field] !== 'string' || !source[field].trim()) : SOURCE_FIELDS;
          if (!source) report(soft, 5, file, `${id}._src.${tag}`, tag, `has no source record (needs ${SOURCE_FIELDS.join(', ')})`);
          else if (missing.length) report(soft, 5, file, `${id}._src.${tag}`, tag, `source record lacks ${missing.join(', ')}`);
          else if (!(Date.parse(source.verified) <= Date.now()) || !/^\d{4}-\d{2}-\d{2}$/.test(source.verified)) report(soft, 5, file, `${id}._src.${tag}`, tag, `has verified date "${source.verified}", expected a past YYYY-MM-DD`);
        }
      }
    }
    // Rule 1: the interface strings.
    if (!pseudo) {
      for (const id of Object.keys(labels.get('ui') ?? {})) {
        if (labels.get('ui')[id][tag] === undefined) report(soft, 1, path.join(root, 'labels/ui.json'), id, tag, 'has no ui string');
      }
    }

    for (const record of records) {
      const { data, folder, document, source, surfaces, english, files } = record;
      const file = files.get(tag) ?? path.join(folder, 'locales', `${tag}.json`);
      let locale;
      if (pseudo) {
        try { locale = await loadGuideLocale({ folder, data, tag, resolver: english, document }); } catch (error) { report(errors, 1, file, 'en-XA', tag, error.message); continue; }
      } else {
        const text = await readText(file);
        if (text === null) { report(soft, 1, file, 'file', tag, `is missing for ${data.id}`); continue; }
        try { locale = JSON.parse(text); } catch (error) { report(errors, 1, file, 'JSON', tag, `does not parse: ${error.message}`); continue; }
        if (locale.locale !== undefined && locale.locale !== tag) report(errors, 9, file, 'locale', tag, `says "${locale.locale}" but the file is ${tag}.json`);
        for (const [key, text] of strings(locale)) {
          if (!text.trim()) report(errors, 6, file, key, tag, 'is an empty string');
          else if (/TODO/.test(text)) report(errors, 6, file, key, tag, 'contains a TODO marker');
        }
      }
      const resolver = labelResolver(labels, surfaces, tag);
      const used = new Set(record.labelIds);

      /** Rules 1, 2 and 6 for one string: present, placeholders agree with English, and it is not just English. */
      const checkString = (key, englishText, value, { uiLabel, required = true } = {}) => {
        if (typeof value !== 'string' || !value.trim()) { if (required) report(soft, 1, file, key, tag, 'is missing'); return; }
        let want;
        try { want = tokens(uiLabel ? labelled(englishText, uiLabel, english) : englishText); } catch (error) { report(errors, 2, file, key, tag, error.message); return; }
        const have = tokens(value);
        for (const token of want) if (!have.includes(token)) report(errors, 2, file, key, tag, `lacks ${token}, which the English has`);
        for (const token of have) {
          const id = /^\{label:([a-z0-9-]+)\}$/.exec(token)?.[1];
          if (id) { if (!english.has(id)) report(errors, 2, file, key, tag, `uses ${token}, not in surfaces ${surfaces.join(', ')}`); else used.add(id); }
          else if (!want.includes(token)) report(errors, 2, file, key, tag, `has ${token}, which the English does not`);
        }
        if (!pseudo && value === englishText && !BRAND_NAMES.has(value) && /\p{L}/u.test(value.replace(TOKEN, ''))) report(warnings, 6, file, key, tag, 'is identical to the English text');
      };
      checkString('title', data.title, locale.title);
      checkString('label', data.label ?? data.title, locale.label);
      checkString('completion', data.completion.description, locale.completion);
      checkString('alt', data.illustration.alt, locale.alt);
      checkString('intro', data.intro ?? '', locale.intro, { required: Boolean(data.intro) });
      for (const [key, englishText] of record.guideKeys) checkString(key, englishText, locale[key]);
      const authored = new Set();
      for (const step of data.steps) {
        if (step.id && !step.reuse) {
          authored.add(step.id);
          const own = locale.steps?.[step.id];
          checkString(`steps.${step.id}.title`, step.title, own?.title, { uiLabel: step.uiLabel });
          checkString(`steps.${step.id}.description`, step.description, own?.description, { uiLabel: step.uiLabel });
        }
        if (step.reuse) {
          // Follow reuse to the guide that authors the step, which must have this locale's text for it.
          let from = step.reuse;
          for (let hop = 0; hop < 20; hop++) {
            const target = byId.get(from.guideId)?.data.steps.find(item => item.id === from.stepId);
            if (target?.reuse) from = target.reuse; else break;
          }
          const origin = byId.get(from.guideId);
          const text = origin && !pseudo ? await readText(origin.files.get(tag) ?? path.join(origin.folder, 'locales', `${tag}.json`)) : '{}';
          const own = text === null ? undefined : JSON.parse(text).steps?.[from.stepId];
          if (!pseudo && (!own?.title?.trim() || !own?.description?.trim())) report(soft, 1, file, `steps.${step.reuse.stepId}`, tag, `reuses ${from.guideId} step ${from.stepId}, which has no ${tag} title and description`);
          if (step.reuse.artwork && origin && !pseudo) {
            const originResolver = labelResolver(labels, origin.surfaces, tag);
            for (const id of origin.labelIds) {
              if (origin.english.has(id) && !resolves(originResolver, id)) report(soft, 3, file, `{label:${id}}`, tag, `in the artwork reused from ${origin.data.id} has no text in this locale and would fall back to English`);
            }
          }
          const override = locale.overrides?.[step.reuse.stepId];
          if (override) {
            const base = byId.get(step.reuse.guideId)?.data.steps.find(item => item.id === step.reuse.stepId);
            if (base) { checkString(`overrides.${step.reuse.stepId}.title`, base.title, override.title, { uiLabel: base.uiLabel }); checkString(`overrides.${step.reuse.stepId}.description`, base.description, override.description, { uiLabel: base.uiLabel }); }
          }
        }
        if (step.transitionBefore) checkString(`transitions.${step.transitionId}`, step.transitionBefore, locale.transitions?.[step.transitionId]);
      }
      for (const key of Object.keys(locale.steps ?? {})) if (!authored.has(key)) report(warnings, 1, file, `steps.${key}`, tag, `names no step this guide authors`);
      for (const key of Object.keys(locale.overrides ?? {})) if (!data.steps.some(step => step.reuse?.stepId === key)) report(warnings, 1, file, `overrides.${key}`, tag, 'overrides no reused step');

      // Rule 3: every label used resolves in this locale itself.
      for (const id of used) {
        if (english.has(id) && !pseudo && !resolves(resolver, id)) {
          report(soft, 3, file, `{label:${id}}`, tag, 'has no text in this locale and would fall back to English');
        }
      }

      // Rule 7: estimated width of each tagged node against its data-max-width.
      for (const node of Array.from(document.getElementsByTagName('*'))) {
        const key = node.getAttribute('data-i18n');
        if (!key || key === 'follow') continue;
        const [kind, name] = key.split(':');
        const stepIndex = key === 'step' ? Number(/step-(\d+)-title/.exec(node.getAttribute('id') ?? '')?.[1]) - 1 : -1;
        const step = data.steps[stepIndex];
        let text;
        try {
          if (kind === 'label') text = resolver.get(name);
          else if (kind === 'guide') text = locale[name];
          else if (step?.id && !step.reuse) text = resolver.fill(locale.steps[step.id].title);
        } catch { continue; }
        const max = (Number(node.getAttribute('data-max-width')) || (key === 'step' ? record.viewBoxWidth - 76 : 0)) * (Number(node.getAttribute('data-lines')) || (key === 'step' ? 2 : 1));
        if (typeof text !== 'string' || !max) continue;
        const { size, bold } = fontOf(node);
        const ratio = estimateWidth(text, size, bold) / max;
        const detail = `"${text}" is about ${pct(ratio)} of its ${max}-unit width`;
        // en-XA is 35% longer by design to expose tight spots, so past the limit it can only warn.
        if (ratio >= OVERFLOW_FAIL && !pseudo) report(errors, 7, source, key, tag, `${detail} (fails at ${pct(OVERFLOW_FAIL)})`);
        else if (ratio >= OVERFLOW_WARN) report(warnings, 7, source, key, tag, `${detail} (${ratio >= OVERFLOW_FAIL ? 'fail' : 'warn'} threshold ${pct(ratio >= OVERFLOW_FAIL ? OVERFLOW_FAIL : OVERFLOW_WARN)})`);
      }
    }
  }
  const unique = list => [...new Map(list.map(item => [item.text, item])).values()];
  return { errors: unique(errors), warnings: unique(warnings) };
}

/** Print a result the way the build wants it: every error to stderr, one summary line for warnings, detail in a log. */
export async function reportLocaleChecks(root, { errors, warnings }) {
  const log = path.join(root, 'tmp/check-locales.log');
  await mkdir(path.dirname(log), { recursive: true });
  await writeFile(log, [...errors.map(item => `error   ${item.text}`), ...warnings.map(item => `warning ${item.text}`)].join('\n') + '\n');
  for (const item of errors) console.error(`error: ${item.text}`);
  if (warnings.length) {
    const rules = [...new Set(warnings.map(item => item.rule))].sort().map(rule => `${warnings.filter(item => item.rule === rule).length} rule ${rule}`);
    console.log(`Locale warnings: ${warnings.length} (${rules.join(', ')}); detail in ${path.relative(root, log)}`);
  }
  return errors.length === 0;
}

const HELP = `Check that locale data is complete and consistent.

Usage: node scripts/check-locales.mjs [--help]

Checks every locale in catalog.json (draft or complete) against the guides, labels and source SVGs. Errors go to
stderr and exit 1; warnings print one summary line, with detail in tmp/check-locales.log. Exit 0 means no errors,
2 means a bad argument. The build runs this before composing anything.

Example: node scripts/check-locales.mjs
`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) { process.stdout.write(HELP); process.exit(0); }
  if (args.length) { process.stderr.write(HELP); process.exit(2); }
  const root = fileURLToPath(new URL('../', import.meta.url));
  const result = await checkLocales(root);
  const ok = await reportLocaleChecks(root, result);
  console.log(ok ? 'Locale checks passed.' : `Locale checks failed: ${result.errors.length} error(s).`);
  process.exit(ok ? 0 : 1);
}
